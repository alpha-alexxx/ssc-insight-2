import "server-only";
import { aiNotConfigured } from "./errors";
import { readAiConfig, type AiConfig } from "./config-core";

export type { AiConfig } from "./config-core";

export function aiConfigOrNull(): AiConfig | null {
  return readAiConfig(process.env);
}

export function aiConfig(): AiConfig {
  const config = aiConfigOrNull();
  if (!config) throw aiNotConfigured();
  return config;
}
