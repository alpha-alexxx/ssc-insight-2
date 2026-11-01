"use client";

import { totals, type Attempt } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * Shared presentation helpers for the persisted-record surfaces (/history and
 * /compare). These existed three times — once in history, once in compare,
 * once in the landing mockups — with subtly different breakpoints, so the same
 * accuracy could be tinted differently on two screens.
 *
 * Everything here is presentation only: the numbers come from `totals()` and
 * `subjectStats()`, the single scoring source of truth.
 */

/** Mock-type chip tones. One mapping for both routes. */
export function typeChip(type: string): string {
  if (type === "full") return "bg-accent-soft text-accent";
  if (type === "subject") return "bg-positive-soft text-positive";
  if (type === "sectional") return "bg-warning-soft text-warning";
  return "bg-soft text-muted";
}

/** Score-bar tone. Thresholds are the documented ones: ≥70 positive, ≥50
 * neutral-accent, below warning. Color never carries the value alone — the
 * number is always printed beside it. */
export function scoreBarTone(pct: number): string {
  if (pct >= 70) return "bg-positive";
  if (pct >= 50) return "bg-accent";
  return "bg-warning";
}

/** Accuracy chip tone: null reads as "not recorded", never as zero. */
export function accuracyTone(accuracy: number | null): string {
  if (accuracy == null) return "bg-soft text-muted";
  if (accuracy >= 70) return "bg-positive-soft text-positive";
  if (accuracy >= 50) return "bg-soft text-muted";
  return "bg-warning-soft text-warning";
}

/**
 * A signed delta with exactly ONE sign.
 *
 * The old implementation printed the arrow and the number's own minus
 * ("↓ -3.3 pp") because it formatted the negative value after prefixing an
 * arrow, and rendered a zero change as a green "+0". Here the magnitude is
 * always absolute, the direction is carried by the arrow and the word, and a
 * value inside the noise floor reads as "no change".
 */
export function Delta({
  value,
  unit = "pp",
  better = "up",
  className,
}: {
  value: number;
  unit?: string;
  /** Which direction is an improvement. Lower is better for time. */
  better?: "up" | "down";
  className?: string;
}) {
  const flat = Math.abs(value) < 0.05;
  const rising = value > 0;
  const improved = flat ? null : better === "up" ? rising : !rising;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular",
        flat
          ? "text-muted"
          : improved
            ? "text-positive"
            : "text-danger",
        className,
      )}
    >
      {flat ? (
        <span aria-hidden="true">=</span>
      ) : (
        <span aria-hidden="true">{rising ? "↑" : "↓"}</span>
      )}
      <span>
        {flat
          ? "No change"
          : `${Math.round(Math.abs(value) * 10) / 10} ${unit}`}
      </span>
      <span className="sr-only">
        {flat
          ? ""
          : improved
            ? " (improved)"
            : " (worse)"}
      </span>
    </span>
  );
}

export type AttemptTotals = ReturnType<typeof totals>;

/** One memo-friendly totals lookup for a list of attempts. */
export function totalsFor(attempts: Attempt[]): Map<string, AttemptTotals> {
  return new Map(attempts.map((attempt) => [attempt.id, totals(attempt)]));
}

/**
 * A per-attempt series that can be compared across different papers: the
 * score percentage. Raw marks are never compared across maxima — compare
 * falls back to percentages and says so.
 */
export function comparablePercentage(t: AttemptTotals): number {
  return t.maxScore ? (t.score / t.maxScore) * 100 : 0;
}
