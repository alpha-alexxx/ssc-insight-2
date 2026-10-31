import { analyze } from "@/lib/analytics";
import { dashboardScopeSchema } from "@/lib/domain";
import { filtersFrom, listAttempts } from "@/lib/repository";
import { loadExamContext, resolvePrimary } from "@/lib/exam-settings";
import { resolvePattern } from "@/lib/exams";
import { patternMaxScore } from "@/lib/exams";
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
  // The per-exam target's % is drawn against the ACTIVE tier's maximum
  // (primary-tier anchor when the combined view is active).
  const primary = resolvePrimary(ctx, ctx.activeExamId);
  const targetMax =
    ctx.activeTierId !== "all"
      ? (resolvePattern(ctx.activeExamId, ctx.activeTierId, ctx.customExams)?.tier ??
          primary?.tier)
      : primary?.tier;
  const analytics = analyze(
    attempts,
    scope,
    targetMax ? patternMaxScore(targetMax) : undefined,
  );
  return { data: analytics, cache: { maxAgeSec: 0, swrSec: 5 } };
});
