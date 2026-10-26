import { analyze } from "@/lib/analytics";
import { dashboardScopeSchema } from "@/lib/domain";
import { filtersFrom, listAttempts } from "@/lib/repository";
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
  const attempts = await listAttempts(user.id, {
    ...filters,
    type: "all",
    subject: "all",
  });
  const analytics = analyze(attempts, scope);
  return { data: analytics, cache: { maxAgeSec: 0, swrSec: 5 } };
});
