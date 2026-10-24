import { requireUser } from "@/lib/auth/require-user";
import { z } from "zod";
import { attemptSchema } from "@/lib/domain";
import { apiError, ok, readBody } from "@/lib/api";
import { deleteAttempt, getAttempt, updateAttempt } from "@/lib/repository";
type Context = { params: Promise<{ id: string }> };
const idSchema = z.uuid();
export const runtime = "nodejs";
export async function GET(_request: Request, context: Context) {
  try {
    const { id: userId } = await requireUser();
    return ok(
      await getAttempt(userId, idSchema.parse((await context.params).id)),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    const { id: userId } = await requireUser();
    const id = idSchema.parse((await context.params).id);
    const input = attemptSchema.parse(await readBody(request));
    return ok(await updateAttempt(userId, id, input));
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const { id: userId } = await requireUser();
    const id = idSchema.parse((await context.params).id);
    await readBody(request);
    return ok(await deleteAttempt(userId, id));
  } catch (error) {
    return apiError(error);
  }
}
