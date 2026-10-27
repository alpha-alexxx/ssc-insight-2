import "server-only";
import { readAiConfig, type AiConfig } from "./config-core";
import { getAiCredential } from "./credentials";
import { assertSafeBaseUrl } from "./ssrf";

/**
 * Resolves the effective AI configuration for one request.
 *
 * Precedence: the signed-in user's stored credential wins; the server env is
 * the fallback so a deployment can still offer AI to everyone without setup.
 *
 * `source` matters for quota: the app-wide AI_DAILY_* caps protect a shared
 * server key, so they must not throttle a user who is spending their own key.
 */
export type ResolvedAiConfig = {
  config: AiConfig;
  source: "user" | "env";
};

const FALLBACK_LIMITS = {
  // Generous ceilings for a user-funded key: still bounded so a runaway loop
  // cannot exhaust someone's balance in one session.
  userDailyRequestLimit: 400,
  userDailyTokenLimit: 2_000_000,
};

export async function resolveAiConfig(
  userId: string,
): Promise<ResolvedAiConfig | null> {
  const envConfig = readAiConfig(process.env);

  let stored: Awaited<ReturnType<typeof getAiCredential>> = null;
  try {
    stored = await getAiCredential(userId);
  } catch {
    // A failure in credential storage must never break the tracker; fall back
    // to env-only behaviour.
    stored = null;
  }

  if (stored) {
    // Re-validate at use time: the stored URL was checked on save, but DNS can
    // change afterwards, and this is the last gate before an outbound fetch.
    const baseUrl = await assertSafeBaseUrl(stored.baseUrl, {
      allowHttp: stored.allowHttp,
      allowPrivate: stored.allowPrivate,
    }).catch(() => null);
    if (!baseUrl) return envConfig ? { config: envConfig, source: "env" } : null;

    return {
      source: "user",
      config: {
        baseUrl,
        apiKey: stored.apiKey,
        model: stored.model,
        jsonMode: stored.jsonMode,
        dailyRequestLimit:
          envConfig?.dailyRequestLimit ?? FALLBACK_LIMITS.userDailyRequestLimit,
        dailyTokenLimit:
          envConfig?.dailyTokenLimit ?? FALLBACK_LIMITS.userDailyTokenLimit,
        maxOutputTokens: envConfig?.maxOutputTokens ?? 1_200,
        timeoutMs: envConfig?.timeoutMs ?? 45_000,
      },
    };
  }

  if (!envConfig) return null;
  return { config: envConfig, source: "env" };
}
