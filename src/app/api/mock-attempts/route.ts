import { randomUUID } from "crypto";
import { database, type StoredAttempt } from "@/lib/db";
import { attemptSchema } from "@/lib/domain";
import { apiError, ok, readBody } from "@/lib/api";
import { filtersFrom, listAttempts } from "@/lib/repository";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return ok(await listAttempts(filtersFrom(request.url)));
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const input = attemptSchema.parse(await readBody(request));
    const now = new Date().toISOString();
    const id = randomUUID();
    const attempt = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1 as const,
    };
    await (
      await database()
    )
      .collection<StoredAttempt>("sscMockAttempts")
      .insertOne({ ...attempt, _id: id });
    return ok(attempt, 201);
  } catch (e) {
    return apiError(e);
  }
}
