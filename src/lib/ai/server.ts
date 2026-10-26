import "server-only";
import { getSettings, listAttemptsForAi } from "../repository";
import { buildAiContext } from "./context";
import type { AiConfig } from "./config-core";

export async function loadAiContext(userId: string) {
  const [attempts, settings] = await Promise.all([
    listAttemptsForAi(userId),
    getSettings(userId),
  ]);
  return buildAiContext(attempts, settings.targetScore);
}

export function aiLimits(config: AiConfig) {
  return {
    requests: config.dailyRequestLimit,
    tokens: config.dailyTokenLimit,
  };
}
