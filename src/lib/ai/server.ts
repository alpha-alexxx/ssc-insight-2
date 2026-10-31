import "server-only";
import { listAttemptsForAi } from "../repository";
import { buildAiContext } from "./context";
import {
  activePrimaryShape,
  loadExamContext,
  resolvePrimary,
  targetForExam,
} from "../exam-settings";
import type { PatternShape } from "../domain";
import type { AiConfig } from "./config-core";

export type AiBundle = {
  context: ReturnType<typeof buildAiContext>;
  shape: PatternShape;
  examName: string;
};

/**
 * AI context is scoped to the active exam (the workspace scope). Target math
 * anchors on the primary tier; per-attempt scoring uses each attempt's own
 * marking snapshot.
 */
export async function loadAiBundle(userId: string): Promise<AiBundle> {
  const ctx = await loadExamContext(userId);
  const attempts = await listAttemptsForAi(userId, ctx.activeExamId);
  const primary = resolvePrimary(ctx, ctx.activeExamId);
  const examName = primary?.examName ?? "SSC CGL";
  return {
    context: buildAiContext(
      attempts,
      targetForExam(ctx, ctx.activeExamId),
      activePrimaryShape(ctx),
      examName,
    ),
    shape: activePrimaryShape(ctx),
    examName,
  };
}

/** Context-only variant for consumers that never build prompts. */
export async function loadAiContext(userId: string) {
  return (await loadAiBundle(userId)).context;
}

export function aiLimits(config: AiConfig) {
  return {
    requests: config.dailyRequestLimit,
    tokens: config.dailyTokenLimit,
  };
}
