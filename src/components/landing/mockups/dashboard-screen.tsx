import { totals } from "@/lib/domain";
import { shortDate } from "@/lib/format";
import {
  LANDING_FULL_MOCKS,
  LANDING_SUMMARY,
  LANDING_TARGET,
} from "../fixtures";
import {
  MockMetricStrip,
  MockRadar,
  MockRing,
  MockTrend,
  MockLedger,
} from "./data-parts";
import { MockPageHead, MockPanel, WorkspaceFrame } from "./workspace-frame";

/**
 * The dashboard mockup: the divided overview strip, the score band, the trend
 * and radar pair, then the answer breakdown and the latest saved attempts.
 *
 * Numbers come from `fixtures.ts`, which derives them through `analyze()` and
 * `totals()`; nothing here is typed by hand.
 */
export function DashboardScreen() {
  const s = LANDING_SUMMARY;
  const points = s.trend.map((point) => ({ percentage: point.percentage }));
  const radarRows = s.whereYouStand
    .filter((row) => row.subjectId !== "computer")
    .map((row) => ({ label: row.label, value: row.averagePercentage }));
  const ring = s.radar;
  const averageMarks = Math.round(((s.averagePercentage ?? 0) / 100) * s.latestMax);
  const bestMarks = Math.round(((s.bestPercentage ?? 0) / 100) * s.latestMax);
  const recent = [...LANDING_FULL_MOCKS].reverse().slice(0, 3);

  return (
    <WorkspaceFrame
      view="Dashboard"
      active="Dashboard"
      actions={
        <span className="rounded-control bg-accent px-[0.6em] py-[0.2em] text-[0.8em] font-medium text-paper">
          + Add mock
        </span>
      }
    >
      <MockPageHead
        title="Dashboard"
        subtitle="Today's work, plan progress, and the performance that matters."
        meta="Tue, 27 Oct 2026 · SSC CGL Tier 2 · Plan day 2 of 50"
      />

      <div className="px-[1.1em] py-[0.9em]">
        <MockMetricStrip
          cells={[
            { label: "Today's plan", value: "0/4", hint: "4 left on day 2", pct: 0 },
            {
              label: "Plan completed",
              value: "0%",
              hint: `${s.questions} questions tracked`,
              pct: 0,
            },
            {
              label: "Latest result",
              value: `${s.latestPercentage.toFixed(1)}%`,
              hint: `26 Oct · ${s.latestScore}/${s.latestMax}`,
              pct: s.latestPercentage,
            },
            {
              label: "Full mocks",
              value: String(s.mockCount),
              hint: "Saved attempts",
              pct: 100,
            },
          ]}
        />

        {/* The score band: the same ruled strip, five cells because a target is set. */}
        <div className="mt-[0.8em]">
          <MockMetricStrip
            five
            cells={[
              {
                label: "Latest",
                value: String(s.latestScore),
                unit: `/ ${s.latestMax}`,
                hint: `${s.latestPercentage.toFixed(1)}% of the paper`,
              },
              {
                label: "Average",
                value: String(averageMarks),
                unit: `/ ${s.latestMax}`,
                hint: `${(s.averagePercentage ?? 0).toFixed(1)}% across ${s.mockCount}`,
              },
              {
                label: "Best",
                value: String(bestMarks),
                unit: `/ ${s.latestMax}`,
                hint: "Your benchmark",
              },
              {
                label: "Accuracy",
                value: `${(s.weightedAccuracy ?? 0).toFixed(1)}%`,
                hint: "Correct ÷ attempted",
              },
              {
                label: "Target",
                value: String(LANDING_TARGET),
                unit: "/ 390",
                hint: `${s.gapToTarget.toFixed(1)} pts to go`,
              },
            ]}
          />
        </div>

        <div className="mt-[0.8em] grid gap-[0.8em] @[720px]:grid-cols-[1.6fr_1fr]">
          <MockPanel
            title="Full mock performance"
            description="Your trend based on percentages across full mocks."
          >
            <div className="h-[7.5em]">
              <MockTrend points={points} target={s.targetPercentage} />
            </div>
            <div className="mt-[0.5em] flex items-center justify-between text-[0.75em] text-muted">
              <span>Dashed line: your target, {LANDING_TARGET} / 390 marks</span>
              <span>{s.mockCount} results</span>
            </div>
          </MockPanel>

          <MockPanel
            title="Where you stand"
            description="Average subject score across all mock types."
          >
            <MockRadar rows={radarRows} />
          </MockPanel>
        </div>

        <div className="mt-[0.8em] grid gap-[0.8em] @[720px]:grid-cols-[1fr_1fr]">
          <MockPanel
            title="Make every attempt count"
            description="Your answer breakdown across full mocks."
          >
            <div className="flex items-center gap-[0.9em]">
              {ring ? (
                <MockRing
                  size={92}
                  stroke={11}
                  correct={ring.correct}
                  incorrect={ring.incorrect}
                  unattempted={ring.unattempted}
                  centre={`${ring.scorePercentage.toFixed(1)}%`}
                />
              ) : null}
              {ring ? (
                <MockLedger
                  rows={[
                    {
                      label: "Correct",
                      count: ring.correct,
                      share: ring.correctPercentage,
                      color: "var(--chart-average)",
                    },
                    {
                      label: "Incorrect",
                      count: ring.incorrect,
                      share: ring.incorrectPercentage,
                      color: "var(--accent)",
                    },
                    {
                      label: "Unattempted",
                      count: ring.unattempted,
                      share: ring.unattemptedPercentage,
                      color: "var(--outcome-unattempted)",
                    },
                  ]}
                />
              ) : null}
            </div>
          </MockPanel>

          <MockPanel
            title="Recent mocks"
            description="Actual result data from your latest attempts."
            action={<span className="text-accent">View all →</span>}
          >
            <ul className="flex flex-col">
              {recent.map((attempt) => {
                const t = totals(attempt);
                return (
                  <li
                    key={attempt.id}
                    className="flex items-center gap-[0.55em] border-b border-rule-soft py-[0.42em] last:border-b-0 last:pb-0 first:pt-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9em] font-medium">
                        {attempt.name}
                      </p>
                      <p className="truncate text-[0.75em] text-muted">
                        {attempt.platform} · {shortDate(attempt.completedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular text-[0.86em] font-medium">
                        {t.score} / {t.maxScore}
                      </p>
                      <p className="text-[0.72em] text-muted tabular">
                        {t.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </MockPanel>
        </div>

        <p className="mt-[0.6em] text-[0.76em] text-muted">
          Attempt date drives every chart and filter — recorded separately from
          the day a plan task was scheduled.
        </p>
      </div>
    </WorkspaceFrame>
  );
}
