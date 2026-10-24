import { z } from "zod";
import { getSettings, saveSettings } from "@/lib/repository";
import { apiError, ok, readBody } from "@/lib/api";
const settingsSchema = z.object({
  targetScore: z.number().min(0).max(390).nullable(),
});
export const runtime = "nodejs";
export async function GET() {
  try {
    return ok(await getSettings());
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request) {
  try {
    const input = settingsSchema.parse(await readBody(request));
    return ok(await saveSettings(input.targetScore));
  } catch (error) {
    return apiError(error);
  }
}
