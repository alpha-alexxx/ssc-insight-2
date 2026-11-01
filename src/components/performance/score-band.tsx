"use client";
import type { Analytics } from "@/lib/analytics";
import { headlineMetrics } from "@/lib/performance-metrics";
import { formatNumber as n } from "@/lib/domain";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const dateLabel = shortDate;

/**
 * The score band: one ink-ruled strip of serif figures re-reading with every
 * scope/filter change.
 *
 * Every figure comes from `headlineMetrics()` — the same derivation the
 * dashboard's preview uses. This component used to compute latest, average,
 * best, accuracy and the target gap itself, and the dashboard's metric strip
 * computed them again independently, so the same saved mock could appear as
 * two different averages. The arithmetic now lives in one place.
 *
 * Marks lead on the full-mock scope (the paper is the exam's own unit);
 * percentages lead everywhere else. `Average` is the mean of per-result
 * percentages, and its hint says so — it is not a marks-weighted aggregate,
 * and the two diverge as soon as papers of different length are mixed.
 */
export function ScoreBand({
  analytics,
  target,
  variant = "full",
}: {
  analytics: Analytics;
  target: number | null;
  /**
   * "full" is the /performance KPI band. "preview" is the dashboard's compact
   * read. Deliberately the SAME component — a second band is how "latest"
   * starts disagreeing with itself.
   */
  variant?: "full" | "preview";
}) {
  const metrics = headlineMetrics(analytics);
  const isFull = analytics.scope === "full";
  const { latest, average, best, accuracy, targetGap, delta } = metrics;

  /* On the full-mock scope the paper's own unit is marks, so the headline
   * shows marks and puts the percentage in the hint. Everywhere else the
   * percentage is the only comparable figure. */
  const figure = (percentage: number | null, score: number | null = null) =>
    percentage == null
      ? "—"
      : isFull && score != null
        ? n(score)
        : `${n(percentage)}%`;

  const deltaTone =
    delta == null
      ? "is-flat"
      : delta > 0.05
        ? "is-up"
        : delta < -0.05
          ? "is-down"
          : "is-flat";

  return (
    <div
      className={cn(
        "score-band",
        metrics.targetGap.value != null && "is-five",
      )}
      data-variant={variant}
    >
      <div>
        <p className="metric-label">Latest</p>
        <p className="metric-figure">
          <span className="metric-value tabular">
            {latest ? figure(latest.percentage, latest.score) : "—"}
          </span>
          {delta != null && Math.abs(delta) > 0.05 && (
            <span className={cn("metric-delta", deltaTone)}>
              {delta > 0 ? "+" : ""}
              {n(delta)} pts
            </span>
          )}
        </p>
        <p className="metric-hint truncate">
          {latest
            ? `${dateLabel(latest.date)} · ${n(latest.percentage)}%`
            : "Log a mock to begin"}
        </p>
      </div>

      <div>
        <p className="metric-label">Average</p>
        <p className="metric-figure">
          <span className="metric-value tabular">
            {figure(average.value, average.marks)}
          </span>
        </p>
        <p className="metric-hint truncate">
          {average.value != null ? average.hint : "no results yet"}
        </p>
      </div>

      {/* The preview carries four figures; the full band adds Best because
          the dashboard's jobs are "where am I" and "what needs attention",
          not "what was my peak". */}
      {variant === "full" && (
        <div>
          <p className="metric-label">Best</p>
          <p className="metric-figure">
            <span className="metric-value tabular">
              {figure(best.value, best.marks)}
            </span>
          </p>
          <p className="metric-hint truncate">{best.hint}</p>
        </div>
      )}

      <div>
        <p className="metric-label">Accuracy</p>
        <p className="metric-figure">
          <span className="metric-value tabular">
            {accuracy.value == null ? "—" : `${n(accuracy.value)}%`}
          </span>
        </p>
        <p className="metric-hint truncate">{accuracy.hint}</p>
      </div>

      {metrics.targetGap.value != null && (
        <div>
          <p className="metric-label">Target gap</p>
          <p className="metric-figure">
            <span
              className={cn(
                "metric-value tabular",
                metrics.targetGap.value >= 0 ? "text-positive" : "text-danger",
              )}
            >
              {metrics.targetGap.value > 0 ? "+" : ""}
              {n(metrics.targetGap.value)} pts
            </span>
          </p>
          <p className="metric-hint truncate">{metrics.targetGap.hint}</p>
        </div>
      )}
    </div>
  );
}
