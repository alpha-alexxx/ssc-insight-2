import { z } from "zod";
import { attemptSchema } from "@/lib/domain";
import { apiError, ok, readBody } from "@/lib/api";
import { deleteAttempt, getAttempt, updateAttempt } from "@/lib/repository";
type Context = { params: Promise<{ id: string }> };
const idSchema = z.uuid();
export const runtime = "nodejs";
export async function GET(_request: Request, context: Context) {
  try {
    return ok(await getAttempt(idSchema.parse((await context.params).id)));
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    const id = idSchema.parse((await context.params).id);
    const input = attemptSchema.parse(await readBody(request));
    return ok(await updateAttempt(id, input));
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const id = idSchema.parse((await context.params).id);
    await readBody(request);
    return ok(await deleteAttempt(id));
  } catch (error) {
    return apiError(error);
  }
}
