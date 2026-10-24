import { requireUser } from "@/lib/auth/require-user";
import { attemptSchema } from "@/lib/domain";
import { apiError, ok, readBody } from "@/lib/api";
import { createAttempt, filtersFrom, listAttempts } from "@/lib/repository";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { id: userId } = await requireUser();
    return ok(await listAttempts(userId, filtersFrom(request.url)));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const { id: userId } = await requireUser();
    return ok(
      await createAttempt(userId, attemptSchema.parse(await readBody(request))),
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
