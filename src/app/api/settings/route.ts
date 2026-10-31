import { z } from "zod";
import {
  loadExamContext,
  resolvePrimary,
  saveTrackerSettings,
  tierKeyResolves,
} from "@/lib/exam-settings";
import { ALL_TIERS_ID, parseTierKey, patternMaxScore } from "@/lib/exams";
import { readBody, RequestError } from "@/lib/api";
import { defineRoute } from "@/lib/route-handler";
import { audit } from "@/lib/audit";

const examTargetsSchema = z.record(
  z.string().min(1).max(40),
  z.number().min(0).max(100_000).nullable(),
);

const settingsSchema = z.object({
  activeExamId: z.string().min(1).max(40),
  activeTierId: z.string().min(1).max(40),
  enabledTiers: z.array(z.string().min(3).max(81)).max(20),
  examTargets: examTargetsSchema,
});

export const runtime = "nodejs";

export const GET = defineRoute({ kind: "read" }, async ({ user }) => {
  const ctx = await loadExamContext(user.id);
  return {
    data: {
      activeExamId: ctx.activeExamId,
      activeTierId: ctx.activeTierId,
      enabledTiers: ctx.enabledTiers,
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

    // Every enabled key must resolve to a real exam+tier for this user.
    for (const key of input.enabledTiers) {
      if (!tierKeyResolves(ctx, key))
        throw new RequestError(`Unknown exam tier: ${key}`, 400);
    }
    const enabled = [...new Set(input.enabledTiers)];

    // The active context must be a real, enabled tier — or the combined
    // "all" view of an exam with enabled tiers. An EMPTY scope (fresh
    // account, nothing picked yet) skips the check: nothing is active.
    if (input.activeTierId === ALL_TIERS_ID) {
      const anyEnabled = enabled.some(
        (key) => parseTierKey(key)?.examId === input.activeExamId,
      );
      if (!anyEnabled)
        throw new RequestError(
          "The combined view needs at least one enabled tier of the exam",
          400,
        );
    } else if (enabled.length > 0) {
      const key = `${input.activeExamId}:${input.activeTierId}`;
      if (!enabled.includes(key))
        throw new RequestError(
          "The active tier must be one of the enabled tiers",
          400,
        );
    }

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
      activeTierId: input.activeTierId,
      enabledTiers: enabled,
      examTargets: input.examTargets,
    });
    audit("settings.save", user.id, {
      ms: Date.now() - startedAt,
      meta: {
        activeExamId: result.activeExamId,
        activeTierId: result.activeTierId,
      },
    });
    return { data: result };
  },
);
