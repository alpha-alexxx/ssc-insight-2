import { istDateKey } from "@/lib/format";
import { totals, type Attempt } from "@/lib/domain";
import { isMockType, type PlanTaskView } from "@/lib/plan/view-model";

/**
 * Bridges the mock tracker and the plan's per-task results: when a logged
 * attempt plausibly IS a plan task's work (same date, matching name), the
 * result editor can offer one-click prefill. Pure functions — the caller
 * always shows the match and the user confirms before anything is written.
 */

function normalizeName(value: string): { flat: string; tokens: string[] } {
  const tokens = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return { flat: tokens.join(""), tokens };
}

/** Tolerant plan-task ↔ attempt name match: exact, containment (shorter name
 * at least 8 letters so lone generic words like "Mock" never match alone), or
 * half of the smaller name's tokens (min 2 tokens). */
export function namesMatch(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left.flat || !right.flat) return false;
  if (left.flat === right.flat) return true;
  const shorter = Math.min(left.flat.length, right.flat.length);
  if (
    shorter >= 8 &&
    (left.flat.includes(right.flat) || right.flat.includes(left.flat))
  )
    return true;
  const smaller =
    left.tokens.length <= right.tokens.length ? left.tokens : right.tokens;
  if (smaller.length < 2) return false;
  const larger = new Set(
    left.tokens.length <= right.tokens.length ? right.tokens : left.tokens,
  );
  const hits = smaller.filter((token) => larger.has(token)).length;
  return hits >= Math.ceil(smaller.length / 2);
}

function overlapScore(taskName: string, attemptName: string): number {
  const left = new Set(normalizeName(taskName).tokens);
  return normalizeName(attemptName).tokens.filter((t) => left.has(t)).length;
}

/** Plan tasks whose work is logged as a tracker attempt: full/paid mocks and
 * the sectional/computer tests (practice topics and best-questions sets are
 * not tracker material). */
function isLoggableType(type: PlanTaskView["type"]): boolean {
  return (
    isMockType(type) ||
    type.endsWith("_sectional") ||
    type.startsWith("computer_")
  );
}

/** The best tracker attempt matching this plan task (same IST date, loggable
 * task type, tolerant name match), or null. Ties resolve by token overlap,
 * then the most recent attempt. */
export function matchAttemptForTask(
  task: Pick<PlanTaskView, "type" | "name" | "date">,
  attempts: Attempt[],
): Attempt | null {
  if (!isLoggableType(task.type)) return null;
  const candidates = attempts
    .filter((attempt) => istDateKey(attempt.completedAt) === task.date)
    .filter((attempt) => namesMatch(attempt.name, task.name));
  if (!candidates.length) return null;
  return [...candidates].sort(
    (a, b) =>
      overlapScore(task.name, b.name) - overlapScore(task.name, a.name) ||
      b.completedAt.localeCompare(a.completedAt),
  )[0];
}

/** Draft values for the result editor, derived from the tracker attempt via
 * the same totals() the tracker cards display — score honours the attempt's
 * scoreOverride, wrong/unattempted come from the marked answers. */
export function fillFromAttempt(attempt: Attempt): {
  score: number;
  percentile: number | null;
  wrong: number;
  unattempted: number;
} {
  const sums = totals(attempt);
  return {
    score: sums.score,
    percentile: attempt.percentile ?? null,
    wrong: sums.incorrect,
    unattempted: sums.unattempted,
  };
}
