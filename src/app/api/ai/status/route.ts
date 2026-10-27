import { apiError, ok } from "@/lib/api";
import { aiConfigOrNull } from "@/lib/ai/config";
import {
  credentialStorageAvailable,
  describeAiCredential,
} from "@/lib/ai/credentials";
import { aiLimits } from "@/lib/ai/server";
import { getAiUsageToday } from "@/lib/ai/usage";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { id: userId } = await requireUser();
    const credential = await describeAiCredential(userId).catch(() => null);
    const envConfig = aiConfigOrNull();
    const storageAvailable = credentialStorageAvailable();

    // A personal credential enables AI even when the deployment has no
    // server-side AI configuration.
    const source = credential ? "user" : envConfig ? "env" : null;
    if (!source) {
      return ok({
        enabled: false,
        model: null,
        usage: null,
        source: null,
        storageAvailable,
        credential: null,
      });
    }

    // Quota applies to the shared server key only. A user spending their own
    // key should not be throttled by the deployment's caps.
    const usage =
      source === "env" && envConfig
        ? await getAiUsageToday(userId, aiLimits(envConfig))
        : null;

    return ok({
      enabled: true,
      model: credential?.model ?? envConfig?.model ?? null,
      usage,
      source,
      storageAvailable,
      // Never includes the key: this summary exposes a 4-character hint only.
      credential,
    });
  } catch (error) {
    return apiError(error);
  }
}
