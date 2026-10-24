import { requireUser } from "@/lib/auth/require-user";
import { analyze, filterAttempts } from "@/lib/analytics";
import { filtersFrom, listAttempts } from "@/lib/repository";
import { apiError, ok } from "@/lib/api";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { id: userId } = await requireUser();
    const filters = filtersFrom(request.url);
    // Subject performance spans all mock types and subjects. Date, platform,
    // and search constraints still apply; the summary retains its own filters.
    const subjectAttempts = await listAttempts(userId, {
      ...filters,
      type: "all",
      subject: "all",
    });
    return ok(
      analyze(filterAttempts(subjectAttempts, filters), subjectAttempts),
    );
  } catch (e) {
    return apiError(e);
  }
}
