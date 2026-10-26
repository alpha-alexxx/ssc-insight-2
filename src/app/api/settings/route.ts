import { z } from "zod";
import { getSettings, saveSettings } from "@/lib/repository";
import { readBody } from "@/lib/api";
import { FULL_MOCK_MAX_SCORE } from "@/lib/domain";
import { defineRoute } from "@/lib/route-handler";
import { audit } from "@/lib/audit";

const settingsSchema = z.object({
  targetScore: z.number().min(0).max(FULL_MOCK_MAX_SCORE).nullable(),
});

export const runtime = "nodejs";

export const GET = defineRoute({ kind: "read" }, async ({ user }) => {
  const settings = await getSettings(user.id);
  return { data: settings, cache: { maxAgeSec: 5, swrSec: 30 } };
});

export const PUT = defineRoute(
  {
    kind: "write",
    onError: (error, userId, startedAt) => {
      audit("settings.save", userId, {
        outcome: "error",
        ms: Date.now() - startedAt,
      });
    },
  },
  async ({ request, user, startedAt }) => {
    const input = settingsSchema.parse(await readBody(request));
    const result = await saveSettings(user.id, input.targetScore);
    audit("settings.save", user.id, { ms: Date.now() - startedAt });
    return { data: result };
  },
);
