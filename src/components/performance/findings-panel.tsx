"use client";
import { Panel } from "../dashboard-panels";
import { PlainIcon } from "../icon";
import type { Finding } from "@/lib/performance-metrics";

/**
 * The findings panel: what the numbers say, in the app's own voice.
 *
 * `findings()` returns measurements, never sentences. Wording lives here so
 * DESIGN.md's voice rules govern it in one place, and so every rendered
 * sentence interpolates a figure the charts beside it also use — a claim that
 * cannot be traced to a number never reaches the page.
 *
 * A finding is labelled "Observation": these are measured, not advice, and not
 * AI output. The AI coach lives in its own panel and says so.
 */

const TONE_TEXT: Record<Finding["tone"], string> = {
  positive: "text-positive",
  warning: "text-warning",
  neutral: "text-muted",
};

const TONE_ICON: Record<Finding["tone"], "success" | "warning" | "info"> = {
  positive: "success",
  warning: "warning",
  neutral: "info",
};

const points = (value: number) => `${Math.abs(value).toFixed(1)} pts`;

function sentence(finding: Finding): string {
  switch (finding.id) {
    case "subject-spread":
      return `${finding.strongest.label} (${finding.strongest.percentage.toFixed(1)}%) leads ${finding.weakest.label} (${finding.weakest.percentage.toFixed(1)}%) by ${points(finding.gapPoints)}.`;
    case "accuracy-move":
      return finding.movePoints >= 0
        ? `Mean accuracy rose ${points(finding.movePoints)} across the ${finding.resultsCompared} results in view.`
        : `Mean accuracy fell ${points(finding.movePoints)} across the ${finding.resultsCompared} results in view.`;
    case "target-gap":
      return finding.gapPoints >= 0
        ? `The latest result is ${points(finding.gapPoints)} above the ${finding.targetPercentage.toFixed(1)}% target.`
        : `The latest result is ${points(finding.gapPoints)} below the ${finding.targetPercentage.toFixed(1)}% target.`;
    case "unattempted-share":
      return `${finding.unattempted} of ${finding.questions} questions in view were left blank (${finding.sharePercentage.toFixed(0)}%).`;
  }
}

export function FindingsPanel({
  findings,
  className,
}: {
  findings: Finding[];
  className?: string;
}) {
  if (!findings.length) return null;
  return (
    <Panel
      icon="activity"
      title="What the numbers say"
      description="Measured from the results in view — observations, not advice."
      className={className}
    >
      <ul className="divide-y divide-rule-soft border-t border-rule-soft">
        {findings.map((finding) => (
          <li
            key={finding.id}
            className="flex items-start gap-2.5 px-4 py-2.5 sm:px-5"
          >
            <PlainIcon
              name={TONE_ICON[finding.tone]}
              size={13}
              className={`mt-[3px] shrink-0 ${TONE_TEXT[finding.tone]}`}
            />
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-ink">
              {sentence(finding)}
            </p>
            <span className="shrink-0 text-[0.625rem] uppercase tracking-[0.1em] text-muted">
              Observation
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
