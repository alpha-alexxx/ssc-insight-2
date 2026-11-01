import "server-only";
import { listAttemptsForAi } from "../repository";
import { buildAiContext } from "./context";
import {
  activeResolved,
  loadExamContext,
  targetForTier,
} from "../exam-settings";
import { patternShape } from "../exam-pattern";
import type { PatternShape } from "../domain";
import { RequestError } from "../api";
import type { AiConfig } from "./config-core";

export type AiBundle = {
  context: ReturnType<typeof buildAiContext>;
  shape: PatternShape;
  examName: string;
};

/**
 * AI context is scoped to the active exam AND tier. Target math anchors on
 * whatever tier the workspace is actually showing, so a CPO workspace is
 * described as CPO Paper I — never as the CGL Tier 2 paper the old fallback
 * silently substituted.
 */
export async function loadAiBundle(userId: string): Promise<AiBundle> {
  const ctx = await loadExamContext(userId);
  const resolved = activeResolved(ctx);
  // The combined "all" view leaves the tier open; concrete tiers scope both
  // the attempt list and the prompt's pattern.
  const tierId = resolved ? resolved.tier.id : undefined;
  const attempts = await listAttemptsForAi(
    userId,
    ctx.activeExamId,
    ctx.activeTierId === "all" ? undefined : tierId,
  );

  if (!resolved) {
    // Nothing enabled yet: the AI surface fails closed with an actionable
    // message rather than inventing a paper to reason about.
    throw new RequestError(
      "Enable at least one exam tier in Settings before using the coach.",
      400,
    );
  }

  const target = targetForTier(ctx, resolved.examId, resolved.tier.id);
  return {
    context: buildAiContext(
      attempts,
      target?.marks ?? null,
      patternShape(resolved),
      resolved.examName,
    ),
    shape: patternShape(resolved),
    examName: resolved.examName,
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
