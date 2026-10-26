export const DEFAULT_AI_BASE_URL = "https://api.openai.com/v1";

export type AiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  jsonMode: boolean;
  dailyRequestLimit: number;
  dailyTokenLimit: number;
  maxOutputTokens: number;
  timeoutMs: number;
};

type Env = Record<string, string | undefined>;

function integerEnv(
  env: Env,
  name: string,
  fallback: number,
  min: number,
  max: number,
) {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normaliseBaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  const local =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]" ||
    url.hostname === "::1";
  // Credentials must not cross plaintext connections. Local providers are the
  // one exception for development.
  if (url.protocol !== "https:" && !local) return null;
  return url.toString().replace(/\/+$/, "");
}

/**
 * Pure environment parsing so tests do not need Next's `server-only` shim.
 * Returns null when the integration is not usable; the rest of the app keeps
 * working in that state.
 */
export function readAiConfig(env: Env): AiConfig | null {
  const apiKey = env.AI_API_KEY?.trim() ?? "";
  const model = env.AI_MODEL?.trim() ?? "";
  if (!apiKey || !model || model.length > 120) return null;
  const baseUrl = normaliseBaseUrl(
    env.AI_BASE_URL?.trim() || DEFAULT_AI_BASE_URL,
  );
  if (!baseUrl) return null;
  return {
    baseUrl,
    apiKey,
    model,
    jsonMode: env.AI_JSON_MODE?.trim().toLowerCase() !== "false",
    dailyRequestLimit: integerEnv(env, "AI_DAILY_REQUEST_LIMIT", 30, 1, 10_000),
    dailyTokenLimit: integerEnv(
      env,
      "AI_DAILY_TOKEN_LIMIT",
      300_000,
      1_000,
      100_000_000,
    ),
    maxOutputTokens: integerEnv(env, "AI_MAX_OUTPUT_TOKENS", 1_200, 64, 16_000),
    timeoutMs: integerEnv(env, "AI_TIMEOUT_MS", 45_000, 5_000, 55_000),
  };
}
