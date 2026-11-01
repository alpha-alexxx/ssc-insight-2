import { z } from "zod";
import {
  loadExamContext,
  saveTrackerSettings,
  tierKeyResolves,
  type ReminderPreferences,
} from "@/lib/exam-settings";
import {
  ALL_TIERS_ID,
  BUILT_IN_EXAMS,
  isValidExamId,
  parseTierKey,
  resolvePattern,
} from "@/lib/exams";
import {
  buildSignatureIndex,
  resolveWorkspaceTargets,
  applyTargetEdits,
  type TargetEdit,
} from "@/lib/target-settings";
import { readBody, RequestError } from "@/lib/api";
import { defineRoute } from "@/lib/route-handler";
import { audit } from "@/lib/audit";

/**
 * Workspace settings.
 *
 * PUT owns SCOPE only (active exam/tier, enabled tiers, in-app preferences).
 * Targets moved to PATCH: the header switcher writes scope at high frequency
 * and must never overwrite a target edited elsewhere, and a target edit must
 * not depend on a full scope snapshot.
 *
 * Every target is validated against the maximum of the tier it belongs to,
 * through the versioned envelope (override → structure default → none), so a
 * default can only ever resolve on a tier with the same paper.
 */

const TIME = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time like 22:00");

const preferencesSchema = z
  .object({
    overdueEmphasis: z.boolean(),
    mockDueToday: z.boolean(),
    targetGap: z.boolean(),
    quietHours: z.object({
      enabled: z.boolean(),
      start: TIME,
      end: TIME,
    }),
  })
  .strict();

const settingsSchema = z
  .object({
    activeExamId: z.string().min(1).max(40),
    activeTierId: z.string().min(1).max(40),
    // Raised from 20: seven built-in exams plus 20 custom exams of up to four
    // tiers each can exceed the old cap, which failed with an opaque Zod
    // error and no way for the UI to explain it.
    enabledTiers: z.array(z.string().min(3).max(81)).max(120),
    preferences: preferencesSchema.optional(),
  })
  .strict();

const targetEditSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("inherit"), tierKey: z.string().min(3).max(81) }),
  z.object({
    kind: z.literal("override"),
    tierKey: z.string().min(3).max(81),
    marks: z.number().finite().min(0).max(100_000).nullable(),
  }),
  z.object({
    kind: z.literal("default"),
    signature: z.string().min(8).max(400),
    marks: z.number().finite().min(0).max(100_000).nullable(),
  }),
  z.object({
    kind: z.literal("percentile"),
    examId: z.string().min(1).max(40),
    percentile: z.number().finite().min(0).max(100).nullable(),
  }),
]);

const targetPatchSchema = z
  .object({ edits: z.array(targetEditSchema).min(1).max(50) })
  .strict();

export const runtime = "nodejs";

function scopePayload(ctx: Awaited<ReturnType<typeof loadExamContext>>) {
  const resolved = resolveWorkspaceTargets(
    ctx.targets,
    BUILT_IN_EXAMS,
    ctx.customExams,
  );
  return {
    activeExamId: ctx.activeExamId,
    activeTierId: ctx.activeTierId,
    enabledTiers: ctx.enabledTiers,
    targets: ctx.targets,
    preferences: ctx.preferences,
    resolvedTargets: resolved.byTier,
    percentiles: resolved.byExamPercentile,
    targetPeers: resolved.peers,
  };
}

export const GET = defineRoute({ kind: "read" }, async ({ user }) => {
  const ctx = await loadExamContext(user.id);
  return {
    data: scopePayload(ctx),
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

    // The active exam must exist for this user — previously never checked.
    const activeExamExists =
      BUILT_IN_EXAMS.some((exam) => exam.id === input.activeExamId) ||
      ctx.customExams.some((exam) => exam.id === input.activeExamId);
    if (!activeExamExists)
      throw new RequestError(
        `Unknown exam: ${input.activeExamId}`,
        400,
      );

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
      if (!resolvePattern(input.activeExamId, input.activeTierId, ctx.customExams))
        throw new RequestError(`Unknown exam tier: ${key}`, 400);
    }

    const result = await saveTrackerSettings(user.id, {
      activeExamId: input.activeExamId,
      activeTierId: input.activeTierId,
      enabledTiers: enabled,
      targets: ctx.targets,
      preferences:
        (input.preferences as ReminderPreferences | undefined) ??
        ctx.preferences,
    });
    audit("settings.save", user.id, {
      ms: Date.now() - startedAt,
      meta: {
        activeExamId: result.activeExamId,
        activeTierId: result.activeTierId,
        enabledCount: String(result.enabledTiers.length),
      },
    });
    return { data: scopePayload({ ...ctx, ...result }) };
  },
);

/**
 * PATCH applies one or more target edits atomically. The client never needs
 * to know a maximum: the server resolves each tier against the live catalog
 * and rejects an over-maximum value with the ceiling in the message.
 */
export const PATCH = defineRoute(
  {
    kind: "write",
    onError: (error, userId, startedAt) => {
      audit("settings.target", userId, {
        outcome: "error",
        ms: Date.now() - startedAt,
      });
    },
  },
  async ({ request, user, startedAt }) => {
    const input = targetPatchSchema.parse(await readBody(request));
    const ctx = await loadExamContext(user.id);
    const index = buildSignatureIndex(BUILT_IN_EXAMS, ctx.customExams);

    // Resolve a tier against the live catalog — built-ins and this user's
    // custom exams. A malformed or truncated key is rejected by the schema.
    const resolve = (tierKey: string) => {
      const parsed = parseTierKey(tierKey);
      if (!parsed) return null;
      return resolvePattern(parsed.examId, parsed.tierId, ctx.customExams)?.tier ?? null;
    };

    // Percentile edits name an EXAM; it must exist for this user.
    const edits = input.edits as TargetEdit[];
    for (const edit of edits) {
      if (edit.kind !== "percentile") continue;
      const known =
        isValidExamId(edit.examId) &&
        (BUILT_IN_EXAMS.some((exam) => exam.id === edit.examId) ||
          ctx.customExams.some((exam) => exam.id === edit.examId));
      if (!known)
        throw new RequestError(`Unknown exam: ${edit.examId}`, 400);
    }

    const applied = applyTargetEdits(ctx.targets, edits, resolve, index);
    if ("error" in applied)
      throw new RequestError(applied.error.message, 400);

    const result = await saveTrackerSettings(user.id, {
      ...ctx,
      targets: applied.next,
    });
    audit("settings.target", user.id, {
      ms: Date.now() - startedAt,
      meta: {
        edits: String(edits.length),
        kinds: [...new Set(edits.map((edit) => edit.kind))].sort().join(","),
      },
    });
    return { data: scopePayload({ ...ctx, ...result }) };
  },
);
