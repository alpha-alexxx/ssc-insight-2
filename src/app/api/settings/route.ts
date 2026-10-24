import { z } from "zod";
import { database, type StoredSettings } from "@/lib/db";
import { apiError, ok, readBody } from "@/lib/api";
const settingsSchema = z.object({
  targetScore: z.number().min(0).max(390).nullable(),
});
export const runtime = "nodejs";
export async function GET() {
  try {
    const row = await (
      await database()
    )
      .collection<StoredSettings>("sscTrackerSettings")
      .findOne({ _id: "default" });
    return ok({ targetScore: row?.targetScore ?? null });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    const input = settingsSchema.parse(await readBody(request));
    await (
      await database()
    )
      .collection<StoredSettings>("sscTrackerSettings")
      .updateOne({ _id: "default" }, { $set: input }, { upsert: true });
    return ok(input);
  } catch (e) {
    return apiError(e);
  }
}
