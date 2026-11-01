import { analyze, type TargetReference } from "@/lib/analytics";
import { dashboardScopeSchema, type AnalyticsAttempt } from "@/lib/domain";
import { filtersFrom, listAttempts } from "@/lib/repository";
import {
  activeResolved,
  loadExamContext,
  targetForTier,
} from "@/lib/exam-settings";
import { ALL_TIERS_ID, resolvePattern } from "@/lib/exams";
import { defineRoute } from "@/lib/route-handler";

export const runtime = "nodejs";

export const GET = defineRoute({ kind: "read" }, async ({ request, user }) => {
  const url = new URL(request.url);
  const scope = dashboardScopeSchema.catch("all").parse(
    url.searchParams.get("view") ?? "all",
  );
  const filters = filtersFrom(request.url);
  // Every dashboard scope is projected from the same platform/date/search
  // constrained universe. Parent type and subject filters are not applied
  // before projection so a full mock can still contribute its subjects and
  // derived sections when another tab asks for that analytical grain.
  const ctx = await loadExamContext(user.id);
  const attempts = await listAttempts(user.id, {
    ...filters,
    examId: ctx.activeExamId,
    type: "all",
    subject: "all",
    // The combined "all" view leaves the tier open; a concrete active tier
    // scopes the projection (attemptWhere skips the literal "all").
    tier: filters.tier ?? ctx.activeTierId,
  });

  // The target line has to be measured against the paper on screen, never
  // against a different tier's maximum. An explicit tier filter wins;
  // otherwise the active tier anchors it. The combined all-tiers view spans
  // papers with different maxima, so its reference is explicitly marked
  // incomparable instead of drawing one misleading line.
  const explicitTier =
    filters.tier && filters.tier !== ALL_TIERS_ID ? filters.tier : null;
  const anchor = explicitTier
    ? (resolvePattern(ctx.activeExamId, explicitTier, ctx.customExams)?.tier ??
      null)
    : (activeResolved(ctx)?.tier ?? null);
  const effective = explicitTier
    ? targetForTier(ctx, ctx.activeExamId, explicitTier)
    : activeResolved(ctx)
      ? targetForTier(ctx, ctx.activeExamId, activeResolved(ctx)!.tier.id)
      : null;

  const target: TargetReference | undefined =
    anchor && effective
      ? {
          marks: effective.marks,
          maxScore: effective.maxScore,
          percentage:
            effective.marks == null
              ? null
              : (effective.marks / effective.maxScore) * 100,
          tierLabel: anchor.label,
          comparable: explicitTier != null || ctx.activeTierId !== ALL_TIERS_ID,
        }
      : undefined;

  const analytics = analyze(attempts as AnalyticsAttempt[], scope, target);
  return { data: analytics, cache: { maxAgeSec: 0, swrSec: 5 } };
});
