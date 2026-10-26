import { apiError, ok } from "@/lib/api";
import { aiConfigOrNull } from "@/lib/ai/config";
import { aiLimits } from "@/lib/ai/server";
import { getAiUsageToday } from "@/lib/ai/usage";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { id: userId } = await requireUser();
    const config = aiConfigOrNull();
    if (!config)
      return ok({ enabled: false, model: null, usage: null });
    return ok({
      enabled: true,
      model: config.model,
      usage: await getAiUsageToday(userId, aiLimits(config)),
    });
  } catch (error) {
    return apiError(error);
  }
}
