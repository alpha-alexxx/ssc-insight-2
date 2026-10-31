import { PlainIcon, type IconName } from "./icon";
import type { AnswerStack } from "@/lib/analytics";
import {
  totals,
  type Attempt,
  type DashboardScope,
  formatNumber as n,
} from "@/lib/domain";
import { longDate, mockTypeLabel, shortDate } from "@/lib/format";
import { tierLabelFor } from "@/lib/exams";
import styles from "./attempt-outcome-card.module.css";

/** Short tier annotation ("Tier 1") — empty for single-tier custom exams. */
function tierSuffix(examId: string, tierId: string): string {
  const label = tierLabelFor(examId, tierId);
  return label === "Main" ? "" : label;
}

const outcomes = [
  { key: "correct", label: "Correct", percentage: "correctPercentage" },
  { key: "incorrect", label: "Incorrect", percentage: "incorrectPercentage" },
  {
    key: "unattempted",
    label: "Unattempted",
    percentage: "unattemptedPercentage",
  },
] as const;

const subjectIcons: Record<string, IconName> = {
  reasoning: "reasoning",
  quant: "quant",
  english: "english",
  ga: "ga",
  computer: "computer",
};
const radius = 40;
const circumference = 2 * Math.PI * radius;

function percent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function ScoreRing({
  percentage,
  label,
  value,
  compact = false,
}: {
  percentage: number;
  label: string;
  value?: string;
  compact?: boolean;
}) {
  const length = (percent(percentage) / 100) * circumference;
  return (
    <div className={compact ? styles.ringSmall : styles.ring}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} className={styles.ringTrack} />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className={styles.ringValue}
          strokeDasharray={`${Math.max(0, length - 1.5)} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className={styles.ringLabel}>
        <strong>{n(percentage)}%</strong>
        <span>{label}</span>
        {value && <i>{value}</i>}
      </div>
    </div>
  );
}

/** Aggregate answer-distribution card (one per subject/section or mock type). */
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
  const iconName = subjectIcons[stack.id] ?? "layers";
  const missingPercentile =
    scope === "subject"
      ? "No standalone subject percentile"
      : scope === "sectional"
        ? "No sectional percentile"
        : "No percentile recorded";

  return (
    <article className={styles.card} aria-label={`${label} question breakdown`}>
      <header className={styles.header}>
        <span className={styles.subjectIcon}>
          <PlainIcon name={iconName} size={19} tone="mono" />
        </span>
        <div className={styles.headerText}>
          <h3 title={label}>{label}</h3>
          <p>
            {stack.count} attempt{stack.count === 1 ? "" : "s"} ·{" "}
            {n(stack.total)} questions
          </p>
        </div>
        <span className={styles.marksValue}>
          {n(stack.score)}
          <span> / {n(stack.maxScore)}</span>
        </span>
      </header>

      <div className={styles.breakdown}>
        <div className={styles.ringWrap}>
          <div className={styles.ring}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r={radius} className={styles.ringTrack} />
              {outcomes.map(({ key, percentage }, index) => {
                const value = percent(stack[percentage]);
                const length = (value / 100) * circumference;
                const start = outcomes
                  .slice(0, index)
                  .reduce(
                    (sum, item) =>
                      sum + (percent(stack[item.percentage]) / 100) * circumference,
                    0,
                  );
                return length > 0 ? (
                  <circle
                    key={key}
                    cx="50"
                    cy="50"
                    r={radius}
                    className={styles[key]}
                    strokeDasharray={`${Math.max(0, length - 1.2)} ${circumference}`}
                    strokeDashoffset={-start}
                    transform="rotate(-90 50 50)"
                  />
                ) : null;
              })}
            </svg>
            <div className={styles.ringLabel}>
              <strong>{n(stack.scorePercentage)}%</strong>
              <span>Score</span>
            </div>
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
              <div className={styles.bar} aria-hidden="true">
                <span
                  style={{ width: `${percent(stack[percentage])}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      </div>

      <dl className={styles.metaRow}>
        <div>
          <dt>Accuracy</dt>
          <dd>{stack.accuracy == null ? "—" : `${n(stack.accuracy)}%`}</dd>
        </div>
        <div>
          <dt>Percentile</dt>
          <dd>
            {stack.percentile == null ? (
              <span className={styles.metaEmpty}>{missingPercentile}</span>
            ) : (
              `${n(stack.percentile)}%`
            )}
          </dd>
        </div>
        <div>
          <dt>Score</dt>
          <dd>marks ÷ maximum</dd>
        </div>
      </dl>
    </article>
  );
}

/**
 * Dated saved-attempt card for recent history and planner logs. The aggregate
 * card above has no single attempt date; this companion is the truthful place
 * to show `completedAt`, "Attempted" state, and a result action.
 */
export function AttemptRecordCard({
  attempt,
  onOpen,
}: {
  attempt: Attempt;
  onOpen: (attempt: Attempt) => void;
}) {
  const result = totals(attempt);
  const scorePercentage = result.maxScore
    ? (result.score / result.maxScore) * 100
    : 0;
  const attemptedDate = longDate(attempt.completedAt);

  return (
    <article
      className={`${styles.card} ${styles.recordCard}`}
      aria-label={`${attempt.name}, attempted ${attemptedDate}`}
    >
      <div className={styles.recordLayout}>
        <ScoreRing
          compact
          percentage={scorePercentage}
          label="Score"
        />
        <div className={styles.recordMain}>
          <div className={styles.recordMeta}>
            <span className={styles.attemptedBadge}>
              <PlainIcon name="check" size={10} /> Attempted
            </span>
            <time dateTime={attempt.completedAt}>
              {longDate(attempt.completedAt)}
            </time>
          </div>
          <h3 title={attempt.name}>{attempt.name}</h3>
          <p>
            {attempt.platform} <span aria-hidden="true">·</span>{" "}
            {mockTypeLabel(attempt.type)}
            {tierSuffix(attempt.examId, attempt.tierId) && (
              <>
                {" "}
                <span className="text-[0.625rem] uppercase tracking-wide text-muted">
                  {tierSuffix(attempt.examId, attempt.tierId)}
                </span>
              </>
            )}
            {attempt.createdAt && attempt.createdAt !== attempt.completedAt && (
              <>
                <span aria-hidden="true"> · </span>
                Logged {shortDate(attempt.createdAt)}
              </>
            )}
          </p>
        </div>
        <dl className={styles.recordStats}>
          <div>
            <dt>Score</dt>
            <dd>
              {n(result.score)}
              <span> / {n(result.maxScore)}</span>
            </dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{result.accuracy == null ? "—" : `${n(result.accuracy)}%`}</dd>
          </div>
        </dl>
        <button
          type="button"
          className={styles.recordAction}
          aria-label={`View result for ${attempt.name}`}
          onClick={() => onOpen(attempt)}
        >
          <PlainIcon name="arrowRight" size={16} />
        </button>
      </div>
    </article>
  );
}
