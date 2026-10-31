import { z } from "zod";
import { readBody, RequestError } from "@/lib/api";
import {
  invalidateSettings,
  loadExamContext,
  saveTrackerSettings,
} from "@/lib/exam-settings";
import {
  BUILT_IN_EXAMS,
  CUSTOM_FIRST_TIER_ID,
  patternMaxScore,
} from "@/lib/exams";
import { markingSchema } from "@/lib/domain";
import { database } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { defineRoute } from "@/lib/route-handler";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const customSubjectSchema = z.object({
  subjectId: z.enum(["quant", "reasoning", "english", "ga", "computer"]),
  questions: z.number().int().min(1).max(500),
  qualifying: z.boolean().default(false),
});

const customTierSchema = z
  .object({
    id: z.string().max(40).optional(),
    label: z.string().trim().min(1).max(40),
    subjects: z.array(customSubjectSchema).min(1).max(5),
    marking: markingSchema,
  })
  .superRefine((tier, ctx) => {
    const ids = tier.subjects.map((s) => s.subjectId);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "Each subject can be used only once",
        path: ["subjects"],
      });
    const meritQuestions = tier.subjects
      .filter((s) => !s.qualifying)
      .reduce((sum, s) => sum + s.questions, 0);
    if (meritQuestions * tier.marking.correct > 100_000)
      ctx.addIssue({
        code: "custom",
        message: "Maximum score is too large",
        path: ["marking"],
      });
  });

const customExamInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  tiers: z.array(customTierSchema).min(1).max(4),
});

/** Stable tier ids: the first tier keeps the legacy "main" id so attempts
 * recorded before multi-tier customs stay valid; later tiers count up. */
function assignTierIds(
  tiers: z.infer<typeof customExamInputSchema>["tiers"],
  existing?: { id: string; label: string }[],
) {
  const used = new Set<string>();
  const out: {
    id: string;
    label: string;
    subjects: Prisma.InputJsonValue;
    marking: Prisma.InputJsonValue;
  }[] = [];
  tiers.forEach((tier, index) => {
    let id: string;
    const existingMatch = existing?.find(
      (t) => t.label.trim().toLowerCase() === tier.label.trim().toLowerCase(),
    );
    if (tier.id) {
      id = tier.id;
    } else if (existingMatch) {
      id = existingMatch.id;
    } else if (index === 0 && (!existing || existing.length === 0)) {
      id = CUSTOM_FIRST_TIER_ID;
    } else {
      let n = index + 1;
      while (used.has(`t${n}`) || existing?.some((t) => t.id === `t${n}`))
        n += 1;
      id = `t${n}`;
    }
    if (used.has(id))
      throw new RequestError(`Duplicate tier id: ${id}`, 400);
    used.add(id);
    out.push({
      id,
      label: tier.label,
      subjects: tier.subjects as unknown as Prisma.InputJsonValue,
      marking: tier.marking as unknown as Prisma.InputJsonValue,
    });
  });
  return out;
}

/** The full exam surface for the workspace: built-in catalog, this user's
 * custom exams (with their tiers), and the tier-level scope settings. */
export const GET = defineRoute({ kind: "read" }, async ({ user }) => {
  const ctx = await loadExamContext(user.id);
  return {
    data: {
      builtIn: BUILT_IN_EXAMS,
      customExams: ctx.customExams.map((exam) => ({
        id: exam.id,
        name: exam.name,
        tiers: exam.tiers.map((tier) => ({
          ...tier,
          maxScore: patternMaxScore(tier),
        })),
      })),
      activeExamId: ctx.activeExamId,
      activeTierId: ctx.activeTierId,
      enabledTiers: ctx.enabledTiers,
      examTargets: ctx.examTargets,
    },
    cache: { maxAgeSec: 5, swrSec: 30 },
  };
});

export const POST = defineRoute(
  { kind: "write" },
  async ({ request, user }) => {
    const input = customExamInputSchema.parse(await readBody(request));
    const ctx = await loadExamContext(user.id);
    if (ctx.customExams.length >= 20)
      throw new RequestError(
        "You already have 20 custom exams. Remove one first.",
        400,
      );
    if (
      ctx.customExams.some(
        (exam) =>
          exam.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
      )
    )
      throw new RequestError("An exam with this name already exists", 400);
    const tiers = assignTierIds(input.tiers);
    const row = await database().customExam.create({
      data: {
        userId: user.id,
        name: input.name,
        tiers,
      },
      select: { id: true },
    });
    invalidateSettings(user.id);
    audit("exam.create", user.id, { sid: row.id });
    return { data: { id: row.id }, status: 201 };
  },
);

export const PUT = defineRoute(
  { kind: "write" },
  async ({ request, user }) => {
    const input = customExamInputSchema.parse(await readBody(request));
    if (!input.id) throw new RequestError("Custom exam id is required", 400);
    const existing = await database().customExam.findFirst({
      where: { id: input.id, userId: user.id },
      select: { id: true },
    });
    if (!existing) throw new RequestError("Custom exam not found", 404);
    const ctx = await loadExamContext(user.id);
    if (
      ctx.customExams.some(
        (exam) =>
          exam.id !== input.id &&
          exam.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
      )
    )
      throw new RequestError("An exam with this name already exists", 400);
    // Renames keep a tier's id stable when the label still matches, so
    // attempts recorded under the old label keep resolving.
    const previous = ctx.customExams.find((exam) => exam.id === input.id);
    const tiers = assignTierIds(
      input.tiers,
      previous?.tiers.map((t) => ({ id: t.id, label: t.label })),
    );
    await database().customExam.update({
      where: { id: input.id },
      data: { name: input.name, tiers },
    });
    invalidateSettings(user.id);
    audit("exam.update", user.id, { sid: input.id });
    return { data: { id: input.id } };
  },
);

export const DELETE = defineRoute(
  { kind: "write" },
  async ({ request, user }) => {
    const body = (await readBody(request)) as { id?: unknown };
    const id =
      typeof body.id === "string" ? z.string().uuid().parse(body.id) : null;
    if (!id) throw new RequestError("Custom exam id is required", 400);
    const existing = await database().customExam.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) throw new RequestError("Custom exam not found", 404);
    // Attempts reference the exam id; deleting it would orphan their scope.
    const attemptCount = await database().mockAttempt.count({
      where: { userId: user.id, examId: id },
    });
    if (attemptCount > 0)
      throw new RequestError(
        `This exam still has ${attemptCount} logged mock${attemptCount === 1 ? "" : "s"}. Delete or reassign them first.`,
        409,
      );
    await database().customExam.delete({ where: { id } });
    const ctx = await loadExamContext(user.id);
    if (ctx.activeExamId === id) {
      // Scope fell back to a deleted exam — move to CGL Tier 2.
      await saveTrackerSettings(user.id, {
        activeExamId: "cgl",
        activeTierId: "tier2",
        enabledTiers: ctx.enabledTiers.filter(
          (key) => !key.startsWith(`${id}:`),
        ),
        examTargets: Object.fromEntries(
          Object.entries(ctx.examTargets).filter(([examId]) => examId !== id),
        ),
      });
    }
    invalidateSettings(user.id);
    audit("exam.delete", user.id, { sid: id });
    return { data: { id } };
  },
);
