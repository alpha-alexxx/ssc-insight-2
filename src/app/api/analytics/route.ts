import { requireUser } from "@/lib/auth/require-user";
import { analyze } from "@/lib/analytics";
import { dashboardScopeSchema } from "@/lib/domain";
import { filtersFrom, listAttempts } from "@/lib/repository";
import { apiError, ok } from "@/lib/api";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { id: userId } = await requireUser();
    const url = new URL(request.url);
    const scope = dashboardScopeSchema.catch("all").parse(
      url.searchParams.get("view") ?? "all",
    );
    const filters = filtersFrom(request.url);
    // Every dashboard scope is projected from the same platform/date/search
    // constrained universe. Parent type and subject filters are not applied
    // before projection so a full mock can still contribute its subjects and
    // derived sections when another tab asks for that analytical grain.
    const attempts = await listAttempts(userId, {
      ...filters,
      type: "all",
      subject: "all",
    });
    return ok(analyze(attempts, scope));
  } catch (e) {
    return apiError(e);
  }
}
