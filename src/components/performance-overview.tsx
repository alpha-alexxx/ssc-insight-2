"use client";
import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  TrendingUp,
} from "lucide-react";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";
import {
  sectionColors,
  subjectColors,
  targetColor,
} from "@/lib/chart-theme";
import { Panel, EmptyChart } from "./dashboard-panels";
import {
  type DashboardScope,
  type SectionId,
  type SubjectId,
  FULL_MOCK_MAX_SCORE,
  SECTIONS,
  SUBJECTS,
  formatNumber as n,
  formatTime,
} from "@/lib/domain";
import {
  type Analytics,
  type AnswerStack,
  type WhereYouStandRow,
  targetPercentage,
} from "@/lib/analytics";
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
const typeLabel = (type: string) =>
  type === "full"
    ? "Full mock"
    : type === "sectional"
      ? "Sectional"
      : type === "subject"
        ? "Subject"
        : "Mock";
const scopeCopy: Record<
  DashboardScope,
  { trend: string; trendDescription: string; radial: string }
> = {
  full: {
    trend: "Full mock performance",
    trendDescription:
      "Every full mock, as a percentage of the 390-mark paper. Dates and platform filters apply.",
    radial: "What every full mock contained",
  },
  subject: {
    trend: "Subject performance",
    trendDescription:
      "Every subject result from full, sectional and subject mocks, shown together.",
    radial: "Correct, incorrect and unattempted by subject",
  },
  sectional: {
    trend: "Sectional performance",
    trendDescription:
      "Section I and Section II from sectional mocks and full mocks, shown together.",
    radial: "Correct, incorrect and unattempted by section",
  },
  all: {
    trend: "All mock performance",
    trendDescription:
      "Every saved mock exactly once, scored as a percentage so different papers stay comparable.",
    radial: "Correct, incorrect and unattempted by mock type",
  },
};
const seriesColor = (scope: DashboardScope, id: string) =>
  scope === "subject"
    ? subjectColors[id as SubjectId]
    : scope === "sectional"
      ? sectionColors[id as SectionId]
      : "var(--chart-score)";
type TrendRow = {
  key: string;
  date: string;
  name: string;
  type: string;
  [key: string]: string | number | null;
};
function trendRows(analytics: Analytics) {
  const rows = new Map<string, TrendRow>();
  for (const point of analytics.trend.points) {
    const key = `${point.date}|${point.sourceAttemptId}`;
    const row = rows.get(key) ?? {
      key,
      date: point.date,
      name: point.name,
      type: point.sourceType,
    };
    row[point.seriesId] = point.percentage;
    row[`${point.seriesId}__raw`] = `${n(point.score)} / ${point.maxScore}`;
    row[`${point.seriesId}__origin`] = point.origin;
    row[`${point.seriesId}__series`] = point.seriesLabel;
    rows.set(key, row);
  }
  return [...rows.values()];
}
function ViewData({
  columns,
  rows,
}: {
  columns: string[];
  rows: React.ReactNode[][];
}) {
  if (!rows.length) return null;
  return (
    <details className="px-3 pb-3 text-[11px]">
      <summary className="inline-flex cursor-pointer text-muted">
        View data
      </summary>
      <div className="mt-2 overflow-auto">
        <table className="w-full tabular">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, index) => (
              <tr key={index}>
                {cells.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
function ScopeTrend({
  analytics,
  targetScore,
}: {
  analytics: Analytics;
  targetScore: number | null;
}) {
  const uid = useId().replace(/:/g, "");
  const { scope, trend } = analytics;
  const rows = trendRows(analytics);
  const config: ChartConfig = Object.fromEntries(
    trend.series.map((series) => [
      series.id,
      { label: series.label, color: seriesColor(scope, series.id) },
    ]),
  );
  const target = targetPercentage(targetScore);
  const lowerBound = rows.length
    ? Math.min(
        0,
        Math.floor(
          Math.min(...trend.points.map((point) => point.percentage)) / 10,
        ) * 10,
      )
    : 0;
  if (!trend.points.length)
    return (
      <EmptyChart>
        No {scope === "subject" ? "subject" : scope === "sectional"
          ? "sectional"
          : "full-mock"} results yet.{" "}
        {scope === "subject"
          ? "Full, sectional and subject mocks all contribute here."
          : ""}
      </EmptyChart>
    );
  return (
    <>
      <ChartContainer
        config={config}
        className="!aspect-auto h-[290px] w-full px-2"
      >
        <AreaChart
          data={rows}
          margin={{ left: 0, right: 18, top: 18, bottom: 4 }}
          accessibilityLayer
        >
          <defs>
            {trend.series.map((series) => (
              <linearGradient
                key={series.id}
                id={`${uid}-${series.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={`var(--color-${series.id})`}
                  stopOpacity={trend.series.length > 1 ? 0.07 : 0.14}
                />
                <stop
                  offset="100%"
                  stopColor={`var(--color-${series.id})`}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
          <XAxis
            dataKey="date"
            tickFormatter={dateLabel}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            minTickGap={28}
          />
          <YAxis
            domain={[lowerBound, 100]}
            allowDataOverflow
            tickFormatter={(value) => `${value}%`}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            width={44}
          />
          {target != null && (
            <ReferenceLine
              y={target}
              stroke={targetColor}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
          )}
          <ChartTooltip
            cursor={{ stroke: "var(--rule-soft)" }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as TrendRow | undefined;
                  return row
                    ? `${row.name} · ${typeLabel(row.type)} · ${dateLabel(row.date)}`
                    : "";
                }}
                formatter={(value, name, item) => {
                  const row = item.payload as TrendRow;
                  const seriesId = String(item.dataKey);
                  const origin = row[`${seriesId}__origin`];
                  return (
                    <div className="flex w-full justify-between gap-4">
                      <span className="text-muted">
                        {name}
                        {origin === "full-derived" ? " · from full mock" : ""}
                      </span>
                      <span className="tabular font-medium text-ink">
                        {n(Number(value))}% ·{" "}
                        {String(row[`${seriesId}__raw`] ?? "")}
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          {trend.series.map((series) => (
            <Area
              key={series.id}
              isAnimationActive={false}
              type="monotone"
              dataKey={series.id}
              name={series.label}
              stroke={`var(--color-${series.id})`}
              strokeWidth={2}
              fill={`url(#${uid}-${series.id})`}
              dot={{ r: 3, fill: `var(--color-${series.id})` }}
              connectNulls={false}
            />
          ))}
          {trend.series.length > 1 && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
        </AreaChart>
      </ChartContainer>
      {target != null && (
        <p className="pb-1 text-center text-[10px] muted">
          Dashed line marks your target at {n(target)}% ·{" "}
          {n((target / 100) * FULL_MOCK_MAX_SCORE)} / {FULL_MOCK_MAX_SCORE}
        </p>
      )}
      <p className="sr-only">
        {trend.points
          .map(
            (point) =>
              `${dateLabel(point.date)} ${point.seriesLabel}: ${n(point.score)} out of ${point.maxScore}, ${n(point.percentage)} percent`,
          )
          .join("; ")}
      </p>
      <ViewData
        columns={["Date", "Result", "Score", "Maximum", "Percentage", "Source"]}
        rows={trend.points.map((point) => [
          dateLabel(point.date),
          point.seriesLabel,
          n(point.score),
          point.maxScore,
          `${n(point.percentage)}%`,
          point.origin === "full-derived"
            ? "From full mock"
            : typeLabel(point.sourceType),
        ])}
      />
    </>
  );
}
function WhereYouStand({ rows }: { rows: WhereYouStandRow[] }) {
  const populated = rows.filter(
    (row) => row.resultCount > 0 && row.averagePercentage != null,
  );
  const missing = rows.filter((row) => row.resultCount === 0);
  const data = populated.map((row) => ({
    subject: row.label,
    // Clamp only the polygon geometry; the tooltip and table keep the real
    // value, including a negative score percentage.
    percentage: Math.max(0, row.averagePercentage!),
    average: row.averagePercentage!,
    accuracy: row.weightedAccuracy,
    count: row.resultCount,
  }));
  return (
    <div className="px-4 pb-4">
      {data.length >= 3 ? (
        <>
          <ChartContainer
            config={{ percentage: { label: "Average score", color: "var(--chart-score)" } }}
            className="!aspect-auto mx-auto h-[255px] w-full"
          >
            <RadarChart data={data} outerRadius="72%" accessibilityLayer>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, _name, item) => {
                      const row = item.payload as (typeof data)[number];
                      return (
                        <div className="grid gap-1">
                          <span className="font-medium text-ink">
                            {row.subject}
                          </span>
                          <span className="text-muted">
                            {n(row.average)}% average score ·{" "}
                            {n(row.accuracy)}% accuracy · {row.count} result
                            {row.count === 1 ? "" : "s"}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <PolarGrid stroke="var(--rule-soft)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 10, fill: "var(--muted)" }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={false}
                tickLine={false}
                axisLine={false}
                angle={90}
              />
              <Radar
                dataKey="percentage"
                name="Average score"
                stroke="var(--chart-score)"
                strokeWidth={2}
                fill="var(--chart-score)"
                fillOpacity={0.18}
                isAnimationActive={false}
              />
            </RadarChart>
          </ChartContainer>
          <p className="text-center text-[10px] muted">
            Average subject score, 0–100% scale, across full, sectional and
            subject mocks.
          </p>
        </>
      ) : (
        <div className="space-y-3 py-2">
          <EmptyChart>
            {data.length
              ? "Log at least three subjects to see the full profile."
              : "Log subject results to discover your strengths."}
          </EmptyChart>
          {populated.map((row) => (
            <div key={row.subjectId}>
              <div className="flex justify-between text-xs mb-1.5">
                <span>{row.label}</span>
                <strong className="tabular font-medium">
                  {n(row.averagePercentage)}%
                </strong>
              </div>
              <div className="h-1.5 bg-soft overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.max(0, row.averagePercentage ?? 0)}%`,
                    background: subjectColors[row.subjectId],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <p className="mt-3 text-[10px] muted">
          No data yet: {missing.map((row) => row.label).join(", ")}.
        </p>
      )}
      <ViewData
        columns={["Subject", "Average", "Accuracy", "Results"]}
        rows={rows.map((row) => [
          row.label,
          row.averagePercentage == null
            ? "No data"
            : `${n(row.averagePercentage)}%`,
          row.weightedAccuracy == null ? "No data" : `${n(row.weightedAccuracy)}%`,
          row.resultCount,
        ])}
      />
    </div>
  );
}
const outcomeConfig: ChartConfig = {
  correct: { label: "Correct", color: "var(--chart-correct)" },
  incorrect: { label: "Incorrect", color: "var(--chart-incorrect)" },
  unattempted: { label: "Unattempted", color: "var(--chart-skipped)" },
};
const outcomeKeys = ["correct", "incorrect", "unattempted"] as const;
function centerValue(stack: AnswerStack) {
  return stack.centerMetric === "percentile"
    ? stack.percentile
    : stack.scorePercentage;
}
function centerLabel(stack: AnswerStack) {
  if (stack.centerMetric === "percentile")
    return stack.percentileCount > 1 ? "avg percentile" : "percentile";
  return "score";
}
function AttemptRing({
  stack,
  large,
  showCaption = true,
}: {
  stack: AnswerStack;
  large?: boolean;
  showCaption?: boolean;
}) {
  const data = [
    {
      name: stack.label,
      correct: stack.correctPercentage,
      incorrect: stack.incorrectPercentage,
      unattempted: stack.unattemptedPercentage,
    },
  ];
  const raw: Record<string, number> = {
    correct: stack.correct,
    incorrect: stack.incorrect,
    unattempted: stack.unattempted,
  };
  const value = centerValue(stack);
  const label = centerLabel(stack);
  return (
    <figure
      className={large ? "mx-auto w-full max-w-[220px]" : "min-w-0"}
      aria-label={`${stack.label}: ${stack.correct} correct, ${stack.incorrect} incorrect, ${stack.unattempted} unattempted. Center: ${label} ${value == null ? "not available" : `${n(value)} percent`}.`}
    >
      <div className="relative">
        <ChartContainer
          config={outcomeConfig}
          className={large ? "!aspect-square h-[180px] w-full" : "!aspect-square h-[112px] w-full"}
        >
          <RadialBarChart
            data={data}
            startAngle={90}
            endAngle={-270}
            innerRadius={large ? 58 : 34}
            outerRadius={large ? 82 : 52}
            accessibilityLayer
          >
            <RadialBar
              dataKey="correct"
              stackId="a"
              fill="var(--color-correct)"
              stroke="var(--paper)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <RadialBar
              dataKey="incorrect"
              stackId="a"
              fill="var(--color-incorrect)"
              stroke="var(--paper)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <RadialBar
              dataKey="unattempted"
              stackId="a"
              fill="var(--color-unattempted)"
              stroke="var(--paper)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => (
                    <div className="flex w-full justify-between gap-5 whitespace-nowrap">
                      <span className="text-muted">
                        {outcomeConfig[String(item.dataKey)]?.label}
                      </span>
                      <span className="tabular font-medium text-ink">
                        {n(Number(value))}% ·{" "}
                        {raw[String(item.dataKey)] ?? 0} Q
                      </span>
                    </div>
                  )}
                />
              }
            />
          </RadialBarChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <strong className={large ? "text-2xl" : "text-sm"}>
            {n(value)}
            {value == null ? "" : "%"}
          </strong>
          <span className="text-[9px] muted">{label}</span>
        </div>
      </div>
      {showCaption && (
        <figcaption className="mt-1 text-center text-[10px] muted">
          <span className="block truncate text-ink">{stack.label}</span>
          {stack.count} attempt{stack.count === 1 ? "" : "s"} · {stack.total}{" "}
          questions
        </figcaption>
      )}
    </figure>
  );
}
const attemptColumns = [
  "Group",
  "Correct",
  "Incorrect",
  "Unattempted",
  "Accuracy",
  "Exam percentile",
  "Score %",
];
function attemptRow(stack: AnswerStack): React.ReactNode[] {
  return [
    stack.label,
    `${stack.correct} (${n(stack.correctPercentage)}%)`,
    `${stack.incorrect} (${n(stack.incorrectPercentage)}%)`,
    `${stack.unattempted} (${n(stack.unattemptedPercentage)}%)`,
    stack.accuracy == null ? "—" : `${n(stack.accuracy)}%`,
    stack.percentile == null
      ? "—"
      : `${n(stack.percentile, 2)}% (${stack.percentileCount})`,
    `${n(stack.scorePercentage)}%`,
  ];
}
function percentileNote(
  stack: AnswerStack,
  scope: "subject" | "sectional" | "full" | "all",
) {
  const noun =
    scope === "subject"
      ? "standalone subject result"
      : scope === "sectional"
        ? "explicit sectional result"
        : "saved result";
  if (stack.percentile != null) {
    const plural = stack.percentileCount === 1 ? "" : "s";
    const remainder =
      stack.percentileCount < stack.count
        ? ` (${stack.count} results in this card)`
        : "";
    return `Avg percentile from ${stack.percentileCount} ${noun}${plural}${remainder}.`;
  }
  if (scope === "subject")
    return "No standalone subject percentile recorded · showing score % (marks ÷ maximum).";
  if (scope === "sectional")
    return "No explicit sectional percentile recorded · showing score % (marks ÷ maximum).";
  return "No exam percentile recorded · showing score % (marks ÷ maximum).";
}
function OutcomeBreakdown({ stack }: { stack: AnswerStack }) {
  const values = {
    correct: stack.correct,
    incorrect: stack.incorrect,
    unattempted: stack.unattempted,
  };
  const percentages = {
    correct: stack.correctPercentage,
    incorrect: stack.incorrectPercentage,
    unattempted: stack.unattemptedPercentage,
  };
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
      {outcomeKeys.map((key) => (
        <div key={key}>
          <p className="text-sm font-semibold tabular">{values[key]}</p>
          <p className="mt-1 flex items-center justify-center gap-1 text-[10px] muted">
            <i
              className="size-2"
              style={{ background: outcomeConfig[key].color as string }}
              aria-hidden="true"
            />
            {outcomeConfig[key].label}
          </p>
          <p className="mt-0.5 text-[9px] muted tabular">
            {n(percentages[key])}%
          </p>
        </div>
      ))}
    </div>
  );
}
function AttemptCard({
  stack,
  scope,
}: {
  stack: AnswerStack;
  scope: "subject" | "sectional";
}) {
  const section =
    scope === "sectional" ? SECTIONS[stack.id as SectionId] : undefined;
  return (
    <Panel
      title={stack.label}
      description={`${section ? `${section.description} · ` : ""}${stack.count} attempt${stack.count === 1 ? "" : "s"} · ${stack.total} questions`}
    >
      <div className="px-5 pb-5 pt-1">
        <AttemptRing stack={stack} large showCaption={false} />
        <OutcomeBreakdown stack={stack} />
        <p className="mt-3 text-[11px] muted">
          <strong className="tabular text-ink">
            {n(stack.score)} / {stack.maxScore}
          </strong>{" "}
          marks <span className="mx-1">·</span>{" "}
          <strong className="tabular text-ink">
            {n(stack.scorePercentage)}%
          </strong>{" "}
          score
        </p>
        <p className="mt-1.5 text-[10px] muted leading-relaxed">
          {n(stack.accuracy)}% accuracy · {percentileNote(stack, scope)}
        </p>
      </div>
    </Panel>
  );
}
function AttemptCards({ analytics }: { analytics: Analytics }) {
  const scope = analytics.scope;
  if (scope !== "subject" && scope !== "sectional") return null;
  const stacks = analytics.radial;
  if (!stacks.length)
    return (
      <Panel
        title="Make every attempt count"
        description={scopeCopy[scope].radial}
        className="mb-6"
      >
        <EmptyChart>
          {scope === "subject"
            ? "No subject results in this view yet."
            : "No sectional results in this view yet."}
        </EmptyChart>
      </Panel>
    );
  return (
    <section aria-labelledby="attempt-count-heading" className="mb-6">
      <div className="mb-3">
        <h2 id="attempt-count-heading" className="panel-title">
          Make every attempt count
        </h2>
        <p className="muted text-xs mt-1.5">{scopeCopy[scope].radial}.</p>
        <p className="text-[10px] muted mt-1.5 leading-relaxed">
          Center shows the average saved exam percentile where one was
          reported; otherwise score % (marks ÷ maximum). Percentiles count only
          saved results that reported one; a full mock’s percentile is never
          reused for its subjects or sections.
        </p>
      </div>
      <div
        className={
          scope === "subject"
            ? "grid gap-6 md:grid-cols-2 xl:grid-cols-3"
            : "grid gap-6 md:grid-cols-2"
        }
      >
        {stacks.map((stack) => (
          <AttemptCard key={stack.id} stack={stack} scope={scope} />
        ))}
      </div>
      <div className="mt-3 border-t border-rule-soft pt-1">
        <ViewData columns={attemptColumns} rows={stacks.map(attemptRow)} />
      </div>
    </section>
  );
}
function AttemptBreakdown({
  analytics,
}: {
  analytics: Analytics;
}) {
  const stacks = analytics.radial;
  if (!stacks.length) return <EmptyChart />;
  const single = stacks.length === 1;
  return (
    <div className="px-4 pb-4">
      <div
        className={
          single
            ? "py-2"
            : "grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3"
        }
      >
        {stacks.map((stack) => (
          <AttemptRing
            key={stack.id}
            stack={stack}
            large={single}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-4 text-[10px] muted">
        {outcomeKeys.map((key) => (
          <span key={key} className="flex items-center gap-1.5">
            <i
              className="size-2"
              style={{ background: outcomeConfig[key].color as string }}
              aria-hidden="true"
            />
            {outcomeConfig[key].label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] muted">
        Center shows the average saved exam percentile where reported;
        otherwise score % (marks ÷ maximum).
      </p>
      <ViewData columns={attemptColumns} rows={stacks.map(attemptRow)} />
    </div>
  );
}
function TargetPanel({
  analytics,
  target,
}: {
  analytics: Analytics;
  target: number | null;
}) {
  const uid = useId().replace(/:/g, "");
  const snapshots = analytics.target.snapshots;
  const latest = snapshots.at(-1);
  const previous = snapshots.at(-2);
  const targetPercent = targetPercentage(target);
  const gap =
    latest && targetPercent != null ? latest.percentage - targetPercent : null;
  const change =
    latest && previous ? latest.percentage - previous.percentage : null;
  const direction =
    change == null ? "flat" : change > 0.05 ? "up" : change < -0.05 ? "down" : "flat";
  const config: ChartConfig = {
    percentage: { label: "Average score", color: "var(--chart-score)" },
  };
  const rows = snapshots.map((snapshot) => ({
    ...snapshot,
    label: dateLabel(snapshot.date),
  }));
  return (
    <div className="px-5 pb-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 py-2">
        <div>
          <p className="text-[11px] muted">Your target</p>
          <p className="font-semibold tabular mt-1">
            {target == null ? "Not set" : `${n(target)} / 390`}
          </p>
          <p className="text-[10px] muted mt-1">
            {targetPercent == null ? "Add one in Settings" : `${n(targetPercent)}% of the paper`}
          </p>
        </div>
        <div>
          <p className="text-[11px] muted">Latest average</p>
          <p className="font-semibold tabular mt-1">
            {snapshots.length ? `${n(latest!.percentage)}%` : "—"}
          </p>
          <p className="text-[10px] muted mt-1">
            {latest ? `${latest.pointCount} result${latest.pointCount === 1 ? "" : "s"} that day` : "No results yet"}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[11px] muted">Against target</p>
          <p className="font-semibold tabular mt-1 flex items-center gap-1.5">
            {gap == null ? (
              "—"
            ) : (
              <>
                {gap > 0 ? "+" : ""}
                {n(gap)} pp
                {gap >= 0 ? (
                  <ArrowUpRight size={14} aria-hidden />
                ) : (
                  <ArrowDownRight size={14} aria-hidden />
                )}
              </>
            )}
          </p>
          <p className="text-[10px] muted mt-1 flex items-center gap-1">
            {direction === "up" ? (
              <TrendingUp size={12} aria-hidden />
            ) : direction === "down" ? (
              <ArrowDownRight size={12} aria-hidden />
            ) : (
              <Minus size={12} aria-hidden />
            )}
            {change == null
              ? "Need two dated snapshots"
              : direction === "flat"
                ? "Flat since the previous snapshot"
                : `${direction === "up" ? "Up" : "Down"} ${n(Math.abs(change))} pp since the previous snapshot`}
          </p>
        </div>
      </div>
      {snapshots.length ? (
        <ChartContainer
          config={config}
          className="!aspect-auto mt-2 h-[150px] w-full px-1"
        >
          <AreaChart
            data={rows}
            margin={{ left: 0, right: 14, top: 14, bottom: 0 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id={`${uid}-target`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-percentage)"
                  stopOpacity={0.16}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-percentage)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
            <XAxis
              dataKey="date"
              tickFormatter={dateLabel}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              minTickGap={24}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              width={40}
            />
            {targetPercent != null && (
              <ReferenceLine
                y={targetPercent}
                stroke={targetColor}
                strokeDasharray="4 4"
                label={{
                  value: "Target",
                  position: "insideTopRight",
                  fill: "var(--muted)",
                  fontSize: 10,
                }}
              />
            )}
            <ChartTooltip
              cursor={{ stroke: "var(--rule-soft)" }}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => {
                    const row = item.payload as (typeof rows)[number];
                    return (
                      <div className="flex w-full justify-between gap-4">
                        <span className="text-muted">
                          {dateLabel(row.date)}
                        </span>
                        <span className="tabular font-medium text-ink">
                          {n(Number(value))}%
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="percentage"
              name="Average score"
              stroke="var(--chart-score)"
              strokeWidth={2}
              fill={`url(#${uid}-target)`}
              dot={{ r: 3, fill: "var(--chart-score)" }}
            />
          </AreaChart>
        </ChartContainer>
      ) : (
        <EmptyChart>Your target trend appears after your first mock.</EmptyChart>
      )}
      {target == null && (
        <p className="text-[10px] muted mt-2">
          Set one target under Settings &amp; backup; it becomes a percentage
          reference on every dashboard tab.
        </p>
      )}
      <ViewData
        columns={["Date", "Average", "Results"]}
        rows={snapshots.map((snapshot) => [
          dateLabel(snapshot.date),
          `${n(snapshot.percentage)}%`,
          snapshot.pointCount,
        ])}
      />
    </div>
  );
}
function DeepDive({ analytics }: { analytics: Analytics }) {
  const subjects = analytics.deepDive ?? [];
  const [requested, setRequested] = useState<SubjectId>("quant");
  const current =
    subjects.find((subject) => subject.id === requested) ?? subjects[0];
  if (!subjects.length)
    return <EmptyChart>No subject results in this view yet.</EmptyChart>;
  if (!current) return <EmptyChart />;
  const accuracyRows = current.trend.map((point) => ({
    ...point,
    label: dateLabel(point.date),
  }));
  return (
    <div className="px-5 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-6 pt-1">
          <div>
            <p className="text-[11px] muted">Average accuracy</p>
            <p className="font-semibold tabular mt-1">
              {n(current.accuracy)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] muted">Average time</p>
            <p className="font-semibold tabular mt-1">
              {formatTime(
                current.averageTime == null
                  ? null
                  : Math.round(current.averageTime),
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] muted">Average score</p>
            <p className="font-semibold tabular mt-1">
              {n(current.percentage)}%
            </p>
          </div>
        </div>
        <select
          className="!w-auto !py-1.5 !px-2 text-xs"
          aria-label="Subject deep dive"
          value={current.id}
          onChange={(event) => setRequested(event.target.value as SubjectId)}
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {SUBJECTS[subject.id].short}
              {subject.qualifying ? " · qualifying" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] muted mb-1">
            Accuracy over attempts ·{" "}
            <span
              className="inline-block size-1.5 align-middle"
              style={{ background: subjectColors[current.id] }}
            />{" "}
            {SUBJECTS[current.id].short}
          </p>
          <ChartContainer
            config={{
              accuracy: { label: "Accuracy", color: subjectColors[current.id] },
            }}
            className="!aspect-auto h-[160px] w-full"
          >
            <LineChart
              data={accuracyRows}
              margin={{ left: 0, right: 10, top: 8, bottom: 0 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
              <XAxis
                dataKey="date"
                tickFormatter={dateLabel}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                minTickGap={24}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                width={40}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--rule-soft)" }}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, _name, item) => {
                      const row = item.payload as (typeof accuracyRows)[number];
                      return (
                        <div className="flex w-full justify-between gap-4">
                          <span className="text-muted">{row.name}</span>
                          <span className="tabular font-medium text-ink">
                            {n(Number(value))}% accuracy · {n(row.score)} /{" "}
                            {row.maxScore}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="accuracy"
                name="Accuracy"
                stroke={subjectColors[current.id]}
                strokeWidth={2}
                dot={{ r: 3, fill: subjectColors[current.id] }}
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
        <div>
          <p className="text-[11px] muted mb-1">Time per attempt (minutes)</p>
          {current.trend.some((point) => point.minutes != null) ? (
            <ChartContainer
              config={{ minutes: { label: "Minutes", color: "var(--chart-time)" } }}
              className="!aspect-auto h-[160px] w-full"
            >
              <LineChart
                data={accuracyRows}
                margin={{ left: 0, right: 10, top: 8, bottom: 0 }}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={dateLabel}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(value) => `${value}m`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  width={40}
                />
                <ChartTooltip
                  cursor={{ stroke: "var(--rule-soft)" }}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => {
                        const row = item.payload as (typeof accuracyRows)[number];
                        return (
                          <div className="flex w-full justify-between gap-4">
                            <span className="text-muted">{row.name}</span>
                            <span className="tabular font-medium text-ink">
                              {formatTime(row.timeSeconds)}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="minutes"
                  name="Time"
                  stroke="var(--chart-time)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--chart-time)" }}
                  connectNulls={false}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyChart>No timing recorded for this subject yet.</EmptyChart>
          )}
        </div>
      </div>
      <ViewData
        columns={["Date", "Score", "Maximum", "Accuracy", "Time"]}
        rows={current.trend.map((point) => [
          dateLabel(point.date),
          n(point.score),
          point.maxScore,
          point.accuracy == null ? "—" : `${n(point.accuracy)}%`,
          formatTime(point.timeSeconds),
        ])}
      />
    </div>
  );
}
export function PerformanceOverview({
  analytics,
  target,
}: {
  analytics: Analytics | null;
  target: number | null;
}) {
  if (!analytics) return <EmptyChart>Loading your preparation…</EmptyChart>;
  const { scope, summary } = analytics;
  const points = analytics.trend.points;
  const isFull = scope === "full";
  const averageMarks = points.length
    ? points.reduce((total, point) => total + point.score, 0) / points.length
    : null;
  const bestMarks = points.length
    ? Math.max(...points.map((point) => point.score))
    : null;
  const copy = scopeCopy[scope];
  return (
    <>
      <div className="stat-strip">
        {[
          {
            label: isFull ? "Full mocks counted" : "Mocks counted",
            value: n(analytics.sourceAttemptCount),
            suffix: "",
            hint: "Real saved attempts",
          },
          {
            label: isFull ? "Average full-mock score" : "Average score",
            value: isFull
              ? n(averageMarks)
              : n(summary.averagePercentage),
            suffix: isFull ? "/ 390" : "%",
            hint: `${analytics.pointCount} analysed result${analytics.pointCount === 1 ? "" : "s"}`,
          },
          {
            label: isFull ? "Personal best · full mock" : "Personal best",
            value: isFull ? n(bestMarks) : n(summary.bestPercentage),
            suffix: isFull ? "/ 390" : "%",
            hint:
              target != null
                ? `Your target: ${n(target)} / 390`
                : "Your next benchmark",
          },
          {
            label: "Overall accuracy",
            value: n(summary.weightedAccuracy),
            suffix: "%",
            hint: "Correct ÷ attempted",
          },
        ].map((stat) => (
          <div key={stat.label} className="stat-cell">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs muted">{stat.label}</p>
            </div>
            <p className="stat-value tabular mt-3">
              {stat.value}
              <span className="text-sm font-normal text-muted tracking-normal ml-1.5">
                {stat.suffix}
              </span>
            </p>
            <p className="text-[11px] muted mt-2">{stat.hint}</p>
          </div>
        ))}
      </div>
      <div className="grid xl:grid-cols-[1.65fr_1fr] gap-6 mb-6">
        <Panel title={copy.trend} description={copy.trendDescription}>
          <ScopeTrend analytics={analytics} targetScore={target} />
        </Panel>
        <Panel
          title="Where you stand"
          description="Average subject score across all mock types."
        >
          <WhereYouStand rows={analytics.whereYouStand} />
        </Panel>
      </div>
      {scope === "subject" || scope === "sectional" ? (
        <>
          <AttemptCards analytics={analytics} />
          <Panel
            title="My target"
            description="One target, the same reference on every dashboard tab."
            className="mb-6"
          >
            <TargetPanel analytics={analytics} target={target} />
          </Panel>
        </>
      ) : (
        <div className="grid xl:grid-cols-[1fr_1.65fr] gap-6 mb-6">
          <Panel title="Make every attempt count" description={copy.radial}>
            <AttemptBreakdown analytics={analytics} />
          </Panel>
          <Panel
            title="My target"
            description="One target, the same reference on every dashboard tab."
          >
            <TargetPanel analytics={analytics} target={target} />
          </Panel>
        </div>
      )}
      {scope !== "subject" && (
        <Panel
          title="Subject deep dive"
          description="Accuracy and time per attempt, with one axis per chart."
        >
          <DeepDive analytics={analytics} />
        </Panel>
      )}
    </>
  );
}
