import { z } from "zod";
import {
  loadExamContext,
  resolvePrimary,
  saveTrackerSettings,
} from "@/lib/exam-settings";
import { patternMaxScore } from "@/lib/exams";
import { readBody, RequestError } from "@/lib/api";
import { defineRoute } from "@/lib/route-handler";
import { audit } from "@/lib/audit";

const examTargetsSchema = z.record(
  z.string().min(1).max(40),
  z.number().min(0).max(100_000).nullable(),
);

const settingsSchema = z.object({
  activeExamId: z.string().min(1).max(40),
  enabledExams: z.array(z.string().min(1).max(40)).max(10),
  examTargets: examTargetsSchema,
});

export const runtime = "nodejs";

export const GET = defineRoute({ kind: "read" }, async ({ user }) => {
  const ctx = await loadExamContext(user.id);
  return {
    data: {
      activeExamId: ctx.activeExamId,
      enabledExams: ctx.enabledExams,
      examTargets: ctx.examTargets,
    },
    cache: { maxAgeSec: 5, swrSec: 30 },
  };
});

export const PUT = defineRoute(
  {
    kind: "write",
    onError: (error, userId, startedAt) => {
      audit("settings.save", userId, {
        outcome: "error",
        ms: Date.now() - startedAt,
      });
    },
  },
  async ({ request, user, startedAt }) => {
    const input = settingsSchema.parse(await readBody(request));
    const ctx = await loadExamContext(user.id);
    const customIds = new Set(ctx.customExams.map((exam) => exam.id));
    const enabledBuiltIns = input.enabledExams.filter(
      (id) => !customIds.has(id),
    );
    if (enabledBuiltIns.some((id) => !["cgl", "chsl", "cpo"].includes(id)))
      throw new RequestError("Unknown exam in enabled list", 400);
    // Custom exams are always enabled once created.
    const enabledExams = [
      ...new Set([...enabledBuiltIns, ...ctx.customExams.map((e) => e.id)]),
    ];
    if (!enabledExams.includes(input.activeExamId))
      throw new RequestError(
        "The active exam must be one of the enabled exams",
        400,
      );
    // A target is a score against that exam's primary tier maximum.
    for (const [examId, target] of Object.entries(input.examTargets)) {
      if (target == null) continue;
      const primary = resolvePrimary(ctx, examId);
      if (!primary)
        throw new RequestError(`Unknown exam in targets: ${examId}`, 400);
      const max = patternMaxScore(primary.tier);
      if (target > max)
        throw new RequestError(
          `Target for ${primary.examName} exceeds the maximum of ${max}`,
          400,
        );
    }
    const result = await saveTrackerSettings(user.id, {
      activeExamId: input.activeExamId,
      enabledExams,
      examTargets: input.examTargets,
    });
    audit("settings.save", user.id, {
      ms: Date.now() - startedAt,
      meta: { activeExamId: result.activeExamId },
    });
    return { data: result };
  },
);
