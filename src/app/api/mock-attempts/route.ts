import { attemptSchema } from "@/lib/domain";
import { apiError, ok, readBody } from "@/lib/api";
import { createAttempt, filtersFrom, listAttempts } from "@/lib/repository";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return ok(await listAttempts(filtersFrom(request.url)));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    return ok(
      await createAttempt(attemptSchema.parse(await readBody(request))),
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
