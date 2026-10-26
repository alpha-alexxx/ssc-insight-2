import {
  Brain,
  Calculator,
  ChartNoAxesColumnIncreasing,
  FileCheck2,
  Globe2,
  Layers3,
  Monitor,
  BookOpen,
} from "lucide-react";
import type { AnswerStack } from "@/lib/analytics";
import { type DashboardScope, formatNumber as n } from "@/lib/domain";
import styles from "./attempt-outcome-card.module.css";

const outcomes = [
  { key: "correct", label: "Correct", percentage: "correctPercentage" },
  { key: "incorrect", label: "Incorrect", percentage: "incorrectPercentage" },
  {
    key: "unattempted",
    label: "Unattempted",
    percentage: "unattemptedPercentage",
  },
] as const;

const subjectIcons = {
  reasoning: Brain,
  quant: Calculator,
  english: BookOpen,
  ga: Globe2,
  computer: Monitor,
};
const circumference = 2 * Math.PI * 78;

export function AttemptOutcomeCard({
  stack,
  scope,
}: {
  stack: AnswerStack;
  scope: DashboardScope;
}) {
  const label =
    scope === "all" && stack.id === "sectional"
      ? "Sectional mocks"
      : scope === "all" && stack.id === "subject"
        ? "Subject mocks"
        : stack.label;
  const Icon = subjectIcons[stack.id as keyof typeof subjectIcons] ?? Layers3;
  const missingPercentile =
    scope === "subject"
      ? "No standalone subject percentile recorded"
      : scope === "sectional"
        ? "No sectional percentile recorded"
        : "No percentile recorded";

  return (
    <article className={styles.card} aria-label={`${label} question breakdown`}>
      <header className={styles.header}>
        <div>
          <h3>{label}</h3>
          <p>
            {stack.count} attempt{stack.count === 1 ? "" : "s"} · {stack.total}{" "}
            questions
          </p>
        </div>
        <span className={styles.subjectIcon}>
          <Icon aria-hidden="true" />
        </span>
      </header>

      <div className={styles.breakdown}>
        <div className={styles.ring}>
          <svg viewBox="0 0 180 180" aria-hidden="true">
            <circle cx="90" cy="90" r="78" className={styles.ringTrack} />
            {outcomes.map(({ key, percentage }, index) => {
              const length =
                (Math.max(0, Math.min(100, stack[percentage])) / 100) *
                circumference;
              const start = outcomes
                .slice(0, index)
                .reduce(
                  (sum, outcome) =>
                    sum +
                    (Math.max(0, Math.min(100, stack[outcome.percentage])) /
                      100) *
                      circumference,
                  0,
                );
              return length > 0 ? (
                <circle
                  key={key}
                  cx="90"
                  cy="90"
                  r="78"
                  className={styles[key]}
                  strokeDasharray={`${Math.max(0, length - 1.8)} ${circumference - Math.max(0, length - 1.8)}`}
                  strokeDashoffset={-start}
                  transform="rotate(-90 90 90)"
                />
              ) : null;
            })}
          </svg>
          <div className={styles.ringLabel}>
            <strong>{n(stack.scorePercentage)}%</strong>
            <span>Score</span>
            <i aria-hidden="true" />
          </div>
        </div>

        <dl className={styles.outcomes}>
          {outcomes.map(({ key, label: outcomeLabel, percentage }) => (
            <div key={key} className={`${styles.outcome} ${styles[key]}`}>
              <dt>
                <span className={styles.dot} aria-hidden="true" />
                {outcomeLabel}
              </dt>
              <dd className={styles.count}>{stack[key]}</dd>
              <dd className={styles.share}>{n(stack[percentage])}%</dd>
              <dd className={styles.bar} aria-hidden="true">
                <span
                  style={{
                    width: `${Math.max(0, Math.min(100, stack[percentage]))}%`,
                  }}
                />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <dl className={styles.marksStrip}>
        <div>
          <FileCheck2 aria-hidden="true" />
          <dt>Marks obtained</dt>
          <dd>
            {n(stack.score)} <span>/ {n(stack.maxScore)}</span>
          </dd>
        </div>
        <div>
          <ChartNoAxesColumnIncreasing aria-hidden="true" />
          <dt>Score</dt>
          <dd>{n(stack.scorePercentage)}%</dd>
        </div>
      </dl>

      <footer className={styles.footer}>
        <div>
          <strong>
            {stack.accuracy == null ? "—" : `${n(stack.accuracy)}%`}
          </strong>
          <span>Accuracy</span>
        </div>
        <p>
          {stack.percentile == null ? (
            missingPercentile
          ) : (
            <>
              <strong>{n(stack.percentile)}%</strong>
              <span>
                {stack.percentileCount > 1
                  ? "Average reported percentile"
                  : "Reported percentile"}
              </span>
            </>
          )}
        </p>
        <p>
          Showing score %<br />
          (marks ÷ maximum)
        </p>
      </footer>
    </article>
  );
}
