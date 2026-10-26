import { estimateTokens } from "./tokens";

/** Bounded context builder target, used for conservative pre-call reserves. */
export const CONTEXT_TOKEN_ESTIMATE = 12_000;

export type AiQuotaUsage = { requests: number; tokens: number };
export type AiQuotaLimits = { requests: number; tokens: number };
export type ReservationPlan =
  { allowed: true } | { allowed: false; reason: "requests" | "tokens" };

export function planReservation(
  used: AiQuotaUsage,
  limits: AiQuotaLimits,
  reservation: number,
): ReservationPlan {
  if (used.requests >= limits.requests)
    return { allowed: false, reason: "requests" };
  if (used.tokens + Math.max(0, reservation) > limits.tokens)
    return { allowed: false, reason: "tokens" };
  return { allowed: true };
}

export function reservationTokens(input: {
  promptText: string;
  contextTokens?: number;
  maxOutputTokens: number;
  providerCalls: number;
}) {
  const calls = Math.min(2, Math.max(1, Math.floor(input.providerCalls)));
  return (
    estimateTokens(input.promptText) +
    (input.contextTokens ?? 0) +
    Math.max(0, Math.floor(input.maxOutputTokens)) * calls
  );
}

/** A failed call may already have been billed; never charge less than reserved. */
export function chargedOnFailure(knownTokens: number, reservedTokens: number) {
  return Math.max(Math.max(0, knownTokens), Math.max(0, reservedTokens));
}
