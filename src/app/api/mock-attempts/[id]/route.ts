import { database, type StoredAttempt } from "@/lib/db";
import { attemptSchema } from "@/lib/domain";
import { apiError, ok, readBody, RequestError } from "@/lib/api";
type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const row = await (
      await database()
    )
      .collection<StoredAttempt>("sscMockAttempts")
      .findOne({ _id: id });
    if (!row) throw new RequestError("Mock not found", 404);
    const { _id, ...attempt } = row;
    return ok({ ...attempt, id: _id });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    const input = attemptSchema.parse(await readBody(request));
    const { id } = await context.params;
    const row = await (
      await database()
    )
      .collection<StoredAttempt>("sscMockAttempts")
      .findOneAndUpdate(
        { _id: id },
        { $set: { ...input, updatedAt: new Date().toISOString() } },
        { returnDocument: "after" },
      );
    if (!row) throw new RequestError("Mock not found", 404);
    const { _id, ...a } = row;
    return ok({ ...a, id: _id });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    await readBody(request);
    const { id } = await context.params;
    const result = await (
      await database()
    )
      .collection<StoredAttempt>("sscMockAttempts")
      .deleteOne({ _id: id });
    if (!result.deletedCount) throw new RequestError("Mock not found", 404);
    return ok({ id });
  } catch (e) {
    return apiError(e);
  }
}
