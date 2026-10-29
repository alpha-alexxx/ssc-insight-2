"use client";
import Link from "next/link";
import { useId, memo, useState } from "react";
import { Lightbulb, Flag, Pencil } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";
import { PlainIcon } from "./icon";
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
  SUBJECTS,
  formatNumber as n,
  formatTime,
} from "@/lib/domain";
import {
  type Analytics,
  type WhereYouStandRow,
  targetPercentage,
} from "@/lib/analytics";
import { mockTypeLabel, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const dateLabel = shortDate;
const typeLabel = mockTypeLabel;
const scopeCopy: Record<
  DashboardScope,
  { trend: string; trendDescription: string }
> = {
  full: {
    trend: "Full mock performance",
    trendDescription:
      "Your trend based on percentage of the 390-mark paper across full mocks. Filters apply.",
  },
  subject: {
    trend: "Subject-wise performance trend",
    trendDescription:
      "Your average score in each subject across all mocks, shown together.",
  },
  sectional: {
    trend: "Sectional performance trend",
    trendDescription:
      "Section I and Section II from sectional mocks and full mocks, shown together.",
  },
  all: {
    trend: "Overall performance trend",
    trendDescription:
      "Your score and accuracy trend across all mocks (full, subject-wise, sectional), scored as a percentage.",
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
      <summary className="inline-flex cursor-pointer items-center gap-1 text-accent">
        View detailed data <PlainIcon name="arrowRight" size={12} />
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
  if (trend.points.length === 1) {
    const point = trend.points[0]!;
    return (
      <>
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-control border border-rule-soft bg-canvas px-5 py-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
            One result so far
          </p>
          <p className="mt-2 font-serif text-4xl font-medium tabular tracking-tight">
            {n(point.percentage)}%
          </p>
          <p className="mt-1 text-xs text-muted">
            {dateLabel(point.date)} · {point.name}
          </p>
          <p className="mt-3 max-w-sm text-[11px] leading-relaxed text-muted">
            Log one more result to turn this into a trend. This point is{" "}
            {n(point.score)} / {point.maxScore}
            {target != null ? `; your target is ${n(targetPercentage(target))}%` : ""}.
          </p>
        </div>
        <ViewData
          columns={["Date", "Result", "Score", "Maximum", "Percentage", "Source"]}
          rows={[
            [
              dateLabel(point.date),
              point.seriesLabel,
              n(point.score),
              point.maxScore,
              `${n(point.percentage)}%`,
              point.origin === "full-derived"
                ? "From full mock"
                : typeLabel(point.sourceType),
            ],
          ]}
        />
      </>
    );
  }
  const singleSeries = trend.series.length === 1;
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
              label={
                singleSeries
                  ? {
                      position: "top",
                      formatter: (value: unknown) => `${n(Number(value))}%`,
                      fontSize: 10,
                      fill: "var(--muted)",
                    }
                  : undefined
              }
            />
          ))}
          {trend.series.length > 1 && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
        </AreaChart>
      </ChartContainer>
      <p className="pb-1 text-right text-[10px] text-muted">
        Showing {trend.points.length} recent result
        {trend.points.length === 1 ? "" : "s"}
      </p>
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
function standInsight(rows: WhereYouStandRow[]): string | null {
  const populated = rows.filter(
    (row) => row.resultCount > 0 && row.averagePercentage != null,
  );
  if (populated.length < 2) return null;
  const sorted = [...populated].sort(
    (a, b) => (b.averagePercentage ?? 0) - (a.averagePercentage ?? 0),
  );
  const strongest = sorted[0]!;
  const weakest = sorted.at(-1)!;
  if (strongest.subjectId === weakest.subjectId) return null;
  return `You are strong in ${strongest.label}. Focus more on ${weakest.label} to balance your score.`;
}
function InsightCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-control border border-accent/25 bg-accent-soft px-3.5 py-3">
      <Lightbulb size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
      <p className="text-xs leading-relaxed text-ink">{children}</p>
    </div>
  );
}
function WhereYouStand({ rows }: { rows: WhereYouStandRow[] }) {
  const populated = rows.filter(
    (row) => row.resultCount > 0 && row.averagePercentage != null,
  );
  const missing = rows.filter((row) => row.resultCount === 0);
  const data = populated.map((row) => ({
    subject: row.label,
    // Radar ticks are radial: a long subject name ("General Awareness") is
    // clipped at the side vertices on narrow screens. Shorten only the axis
    // label — the tooltip and the View-data table keep the full name.
    axis: row.label.replace("General Awareness", "Gen. Awareness"),
    // Clamp only the polygon geometry; the tooltip and table keep the real
    // value, including a negative score percentage.
    percentage: Math.max(0, row.averagePercentage!),
    average: row.averagePercentage!,
    accuracy: row.weightedAccuracy,
    count: row.resultCount,
  }));
  const insight = standInsight(rows);
  return (
    <div className="px-4 pb-4">
      {data.length >= 3 ? (
        <>
          <ChartContainer
            config={{ percentage: { label: "Average score", color: "var(--chart-score)" } }}
            className="!aspect-auto mx-auto h-[255px] w-full"
          >
            <RadarChart
              data={data}
              outerRadius="62%"
              margin={{ top: 4, right: 12, bottom: 4, left: 12 }}
              accessibilityLayer
            >
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
                dataKey="axis"
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
      {insight && (
        <div className="mt-3">
          <InsightCallout>{insight}</InsightCallout>
        </div>
      )}
      {missing.length > 0 && (
        <p className="mt-3 text-[10px] muted">
          No data yet for {missing.map((row) => row.label).join(", ")}.
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
/* ---------- Performance metadata row ----------
 * Deliberately not a second headline stat strip: the dashboard overview owns
 * the headline metrics, so this reads as a quiet glossary of the numbers the
 * charts below are built from — labels, values, hairline dividers, no tiles.
 */
function PerformanceMeta({ analytics }: { analytics: Analytics }) {
  const { scope, summary, trend } = analytics;
  const points = trend.points;
  const isFull = scope === "full";
  const averageMarks = points.length
    ? points.reduce((total, point) => total + point.score, 0) / points.length
    : null;
  const bestMarks = points.length
    ? Math.max(...points.map((point) => point.score))
    : null;
  const delta =
    summary.latestSnapshotPercentage != null &&
    summary.previousSnapshotPercentage != null
      ? summary.latestSnapshotPercentage - summary.previousSnapshotPercentage
      : null;
  const items: { label: string; value: string; tone?: string }[] = [
    { label: "Mocks", value: n(analytics.sourceAttemptCount) },
    {
      label: "Average",
      value:
        isFull && averageMarks != null
          ? `${n(averageMarks)} / ${FULL_MOCK_MAX_SCORE}`
          : summary.averagePercentage != null
            ? `${n(summary.averagePercentage)}%`
            : "—",
    },
    {
      label: "Best",
      value:
        isFull && bestMarks != null
          ? `${n(bestMarks)} / ${FULL_MOCK_MAX_SCORE}`
          : summary.bestPercentage != null
            ? `${n(summary.bestPercentage)}%`
            : "—",
    },
    {
      label: "Accuracy",
      value:
        summary.weightedAccuracy != null
          ? `${n(summary.weightedAccuracy)}%`
          : "—",
    },
    {
      label: "Results",
      value: n(analytics.pointCount),
    },
    {
      label: "Versus previous",
      value:
        delta == null
          ? "—"
          : `${delta > 0 ? "+" : ""}${n(delta)} pts`,
      tone:
        delta == null
          ? undefined
          : delta > 0.05
            ? "text-positive"
            : delta < -0.05
              ? "text-danger"
              : "text-muted",
    },
  ];
  return (
    <dl className="performance-meta">
      {items.map(({ label, value, tone }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={cn("tabular", tone)}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
/* ---------- Attempt breakdown (donut + bars + chips + tip) ---------- */
function BreakdownDonut({ segments }: { segments: { value: number; color: string }[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 15.915;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg viewBox="0 0 40 40" className="size-32 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="5.5" style={{ stroke: "var(--soft)" }} />
      {total > 0 &&
        segments.map((segment, index) => {
          const fraction = segment.value / total;
          const dash = `${circumference * fraction} ${circumference * (1 - fraction)}`;
          const element = (
            <circle
              key={index}
              cx="20"
              cy="20"
              r={radius}
              fill="none"
              strokeWidth="5.5"
              strokeLinecap="butt"
              style={{
                stroke: segment.color,
                strokeDasharray: dash,
                strokeDashoffset: -offset * circumference,
              }}
            />
          );
          offset += fraction;
          return element;
        })}
    </svg>
  );
}
function AttemptBreakdown({ analytics }: { analytics: Analytics }) {
  const { summary, trend } = analytics;
  const points = trend.points;
  const bestMarks = points.length
    ? Math.max(...points.map((point) => point.score))
    : null;
  const bestPct = points.length
    ? Math.max(...points.map((point) => point.percentage))
    : null;
  const rows = [
    {
      label: "Correct",
      count: summary.correct,
      color: "var(--chart-correct)",
      bar: "bg-positive",
    },
    {
      label: "Incorrect",
      count: summary.incorrect,
      color: "var(--chart-incorrect)",
      bar: "bg-danger",
    },
    {
      label: "Unattempted",
      count: summary.unattempted,
      color: "var(--outcome-unattempted)",
      bar: "bg-soft",
    },
  ];
  const rate = summary.attemptRate;
  const tip =
    rate == null
      ? "Log a mock to see your attempt breakdown."
      : rate >= 85
        ? "Your attempt rate is excellent. Now push accuracy on every attempted question."
        : rate >= 60
          ? "Your attempt rate is good. Try to improve accuracy to cross 300+ consistently."
          : "Attempt more questions — every unattempted question is a guaranteed zero.";
  return (
    <Panel
      title="Make every attempt count"
      description={
        analytics.scope === "all"
          ? "Breakdown of your attempts across all mocks."
          : "Breakdown of your full mock attempts."
      }
      className="mb-4"
    >
      <div className="grid gap-5 px-5 pb-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-start">
          <div className="relative shrink-0">
            <BreakdownDonut
              segments={[
                { value: summary.correct, color: "var(--chart-correct)" },
                { value: summary.incorrect, color: "var(--chart-incorrect)" },
                { value: summary.unattempted, color: "var(--outcome-unattempted)" },
              ]}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-serif text-xl leading-none tabular text-ink">
                {rate == null ? "—" : `${n(rate)}%`}
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-muted">
                Overall
              </p>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            {rows.map((row) => (
              <div key={row.label} className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: row.color }}
                  aria-hidden="true"
                />
                <span className="w-[4.75rem] shrink-0 truncate text-[11px] text-muted sm:w-24 sm:text-xs">
                  {row.label}
                </span>
                <div className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-pill bg-soft">
                  <div
                    className={cn("h-full rounded-pill", row.bar)}
                    style={{
                      width: `${
                        summary.questions
                          ? (row.count / summary.questions) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-[11px] font-medium tabular text-ink sm:w-10 sm:text-xs">
                  {n(row.count)}
                </span>
                {/* The percentage is redundant with the bar at phone widths;
                    the count and the proportion rule already carry it. */}
                <span className="hidden w-12 shrink-0 text-right text-[10px] tabular text-muted sm:block">
                  {summary.questions
                    ? `${n((row.count / summary.questions) * 100)}%`
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="flex items-center gap-2.5 rounded-control border border-rule-soft px-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
                <PlainIcon name="target" size={14} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-serif text-base leading-none tabular text-ink">
                  {n(summary.questions)}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted">
                  Total questions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-control border border-rule-soft px-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-positive-soft text-positive" aria-hidden="true">
                <PlainIcon name="success" size={14} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-serif text-base leading-none tabular text-ink">
                  {summary.weightedAccuracy != null
                    ? `${n(summary.weightedAccuracy)}%`
                    : "—"}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted">Accuracy</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-control border border-rule-soft px-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning" aria-hidden="true">
                <PlainIcon name="award" size={14} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-serif text-base leading-none tabular text-ink">
                  {bestMarks != null ? `${n(bestMarks)} / 390` : bestPct != null ? `${n(bestPct)}%` : "—"}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted">
                  Highest score
                </p>
              </div>
            </div>
          </div>
          <InsightCallout>{tip}</InsightCallout>
        </div>
      </div>
    </Panel>
  );
}
/* ---------- Per-subject / per-section donut cards ---------- */
function AccuracyDonut({
  value,
  color,
  size = 72,
}: {
  value: number | null;
  color: string;
  size?: number;
}) {
  const radius = 15.915;
  const circumference = 2 * Math.PI * radius;
  const fraction = value == null ? 0 : Math.max(0, Math.min(1, value / 100));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="4" style={{ stroke: "var(--soft)" }} />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          style={{
            stroke: color,
            strokeDasharray: `${circumference * fraction} ${circumference}`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-serif text-base leading-none tabular text-ink">
          {value == null ? "—" : `${n(value)}%`}
        </p>
        <p className="mt-0.5 text-[8px] uppercase tracking-[0.08em] text-muted">
          Accuracy
        </p>
      </div>
    </div>
  );
}
function OverviewDonutCards({
  analytics,
}: {
  analytics: Analytics;
}) {
  const stacks = analytics.radial.filter((stack) => stack.total > 0);
  if (!stacks.length)
    return (
      <div className="mb-4">
        <EmptyChart>No results in this scope yet.</EmptyChart>
      </div>
    );
  const colorOf = (id: string) =>
    analytics.scope === "subject"
      ? subjectColors[id as SubjectId]
      : sectionColors[id as SectionId];
  return (
    <Panel
      title={
        analytics.scope === "subject"
          ? "Subject-wise overview"
          : "Section-wise performance"
      }
      description={
        analytics.scope === "subject"
          ? "Questions attempted, accuracy and score in each subject."
          : "Accuracy and score in each section."
      }
      className="mb-4"
    >
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
        {stacks.map((stack) => (
          <div
            key={stack.id}
            className="flex flex-col gap-3 rounded-panel border border-rule-soft p-4"
          >
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <span
                className="size-2 rounded-full"
                style={{ background: colorOf(stack.id) }}
                aria-hidden="true"
              />
              {stack.label}
            </p>
            <div className="flex items-center gap-4">
              <AccuracyDonut value={stack.accuracy} color={colorOf(stack.id)} />
              <div className="min-w-0 flex-1 space-y-1.5 text-[11px]">
                <p className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                    Attempted
                  </span>
                  <span className="font-medium tabular text-ink">
                    {n(stack.correct + stack.incorrect)} / {n(stack.total)}
                  </span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="size-1.5 rounded-full bg-positive" aria-hidden="true" />
                    Correct
                  </span>
                  <span className="font-medium tabular text-ink">
                    {n(stack.correct)}
                  </span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="size-1.5 rounded-full bg-danger" aria-hidden="true" />
                    Incorrect
                  </span>
                  <span className="font-medium tabular text-ink">
                    {n(stack.incorrect)}
                  </span>
                </p>
              </div>
            </div>
            <p className="flex items-center justify-between border-t border-rule-soft pt-2.5 text-[11px]">
              <span className="text-muted">Score</span>
              <span className="font-semibold tabular text-ink">
                {n(stack.score)} / {n(stack.maxScore)}
              </span>
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
/* ---------- Grouped score bars (subject / sectional) ---------- */
function GroupedScoreBars({ analytics }: { analytics: Analytics }) {
  const { scope, trend } = analytics;
  const rows = new Map<string, TrendRow & { label: string }>();
  for (const point of trend.points) {
    const row = rows.get(point.sourceAttemptId) ?? {
      key: point.sourceAttemptId,
      date: point.date,
      name: point.name,
      type: point.sourceType,
      label: point.name,
    };
    row[point.seriesId] = point.percentage;
    row[`${point.seriesId}__raw`] = `${n(point.score)} / ${point.maxScore}`;
    rows.set(point.sourceAttemptId, row);
  }
  const data = [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (!data.length) return null;
  const config: ChartConfig = Object.fromEntries(
    trend.series.map((series) => [
      series.id,
      { label: series.label, color: seriesColor(scope, series.id) },
    ]),
  );
  return (
    <Panel
      title={scope === "subject" ? "Subject-wise score trend" : "Section-wise score trend"}
      description={`Your score in each ${scope === "subject" ? "subject" : "section"} across recent mocks, as a percentage of that paper.`}
      className="mb-4"
    >
      <div className="px-5 pb-4">
        <ChartContainer
          config={config}
          className="!aspect-auto h-[260px] w-full"
        >
          <BarChart
            data={data}
            margin={{ left: 0, right: 8, top: 12, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
            <XAxis
              dataKey="date"
              tickFormatter={dateLabel}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
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
              cursor={{ fill: "var(--soft)" }}
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const row = item.payload as TrendRow;
                    const seriesId = String(item.dataKey);
                    return (
                      <div className="flex w-full justify-between gap-4">
                        <span className="text-muted">{name}</span>
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
              <Bar
                key={series.id}
                isAnimationActive={false}
                dataKey={series.id}
                name={series.label}
                fill={`var(--color-${series.id})`}
                radius={[3, 3, 0, 0]}
                maxBarSize={26}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
        <ViewData
          columns={["Mock", "Date", ...trend.series.map((s) => s.label)]}
          rows={data.map((row) => [
            row.name,
            dateLabel(row.date),
            ...trend.series.map((series) =>
              row[series.id] == null ? "—" : `${n(Number(row[series.id]))}% · ${String(row[`${series.id}__raw`] ?? "")}`,
            ),
          ])}
        />
      </div>
    </Panel>
  );
}
/* ---------- Score distribution histogram (all / full) ---------- */
function ScoreDistribution({ analytics }: { analytics: Analytics }) {
  const points = analytics.trend.points;
  if (points.length < 3) return null;
  const buckets = Array.from({ length: 10 }, (_, index) => ({
    label: index === 9 ? "90-100" : `${index * 10}-${index * 10 + 10}`,
    from: index * 10,
    to: index * 10 + 10,
    count: 0,
  }));
  for (const point of points) {
    const index = Math.min(9, Math.max(0, Math.floor(point.percentage / 10)));
    buckets[index]!.count += 1;
  }
  const average =
    points.reduce((total, point) => total + point.percentage, 0) / points.length;
  const avgBucket = Math.min(9, Math.max(0, Math.floor(average / 10)));
  return (
    <Panel
      title="Score distribution"
      description="Distribution of scores across all attempted mocks."
      className="mb-4"
    >
      <div className="px-5 pb-4">
        <ChartContainer
          config={{ count: { label: "Mocks", color: "var(--chart-score)" } }}
          className="!aspect-auto h-[220px] w-full"
        >
          <BarChart
            data={buckets}
            margin={{ left: 0, right: 8, top: 12, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              width={32}
            />
            <ChartTooltip
              cursor={{ fill: "var(--soft)" }}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value) => (
                    <div className="flex w-full justify-between gap-4">
                      <span className="text-muted">Mocks</span>
                      <span className="tabular font-medium text-ink">
                        {n(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ReferenceLine
              x={buckets[avgBucket]!.label}
              stroke="var(--muted)"
              strokeDasharray="4 4"
              label={{
                value: `Avg. ${n(average)}%`,
                position: "insideTop",
                fill: "var(--muted)",
                fontSize: 10,
              }}
            />
            <Bar
              isAnimationActive={false}
              dataKey="count"
              name="Mocks"
              fill="var(--chart-score)"
              radius={[3, 3, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </Panel>
  );
}
/* ---------- Subject lines (subject scope: accuracy + time per subject) ---------- */
function SubjectLines({ analytics }: { analytics: Analytics }) {
  const { trend } = analytics;
  const withAccuracy = trend.points.filter((point) => point.accuracy != null);
  const withTime = trend.points.filter((point) => point.timeSeconds != null);
  const group = (
    points: typeof trend.points,
    pick: (point: (typeof trend.points)[number]) => number,
  ) => {
    const rows = new Map<string, TrendRow>();
    for (const point of points) {
      const row = rows.get(point.sourceAttemptId) ?? {
        key: point.sourceAttemptId,
        date: point.date,
        name: point.name,
        type: point.sourceType,
      };
      row[point.seriesId] = pick(point);
      rows.set(point.sourceAttemptId, row);
    }
    return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
  };
  const accuracyRows = withAccuracy.length
    ? group(withAccuracy, (point) => point.accuracy!)
    : [];
  const timeRows = withTime.length
    ? group(withTime, (point) => Math.round(point.timeSeconds! / 60))
    : [];
  const config: ChartConfig = Object.fromEntries(
    trend.series.map((series) => [
      series.id,
      { label: series.label, color: subjectColors[series.id as SubjectId] },
    ]),
  );
  const renderLines = () =>
    trend.series.map((series) => (
      <Line
        key={series.id}
        isAnimationActive={false}
        type="monotone"
        dataKey={series.id}
        name={series.label}
        stroke={`var(--color-${series.id})`}
        strokeWidth={2}
        dot={{ r: 3, fill: `var(--color-${series.id})` }}
        connectNulls={false}
      />
    ));
  return (
    <div className="mb-4 grid gap-4 xl:grid-cols-2">
      <Panel
        title="Accuracy over attempts (Subject wise)"
        description="How accuracy changes with more attempts."
      >
        <div className="px-5 pb-4">
          {accuracyRows.length ? (
            <ChartContainer config={config} className="!aspect-auto h-[220px] w-full">
              <LineChart data={accuracyRows} margin={{ left: 0, right: 10, top: 8, bottom: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
                <XAxis dataKey="date" tickFormatter={dateLabel} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted)" }} minTickGap={24} />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted)" }} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {renderLines()}
                <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyChart>No accuracy data yet.</EmptyChart>
          )}
        </div>
      </Panel>
      <Panel
        title="Time per attempt (Subject wise)"
        description="Average minutes spent per attempt in each subject."
      >
        <div className="px-5 pb-4">
          {timeRows.length ? (
            <ChartContainer config={config} className="!aspect-auto h-[220px] w-full">
              <LineChart data={timeRows} margin={{ left: 0, right: 10, top: 8, bottom: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
                <XAxis dataKey="date" tickFormatter={dateLabel} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted)" }} minTickGap={24} />
                <YAxis tickFormatter={(value) => `${value}m`} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted)" }} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {renderLines()}
                <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyChart>No timing recorded yet.</EmptyChart>
          )}
        </div>
      </Panel>
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
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent" aria-hidden="true">
            <Flag size={14} />
          </span>
          <div>
            <p className="text-[11px] muted">Your target</p>
            <p className="font-semibold tabular mt-1">
              {target == null ? "Not set" : `${n(target)} / 390`}
            </p>
            <p className="text-[10px] muted mt-1">
              {targetPercent == null ? "Add a score or percentage" : `${n(targetPercent)}% of the paper`}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent" aria-hidden="true">
            <PlainIcon name="trend" size={14} />
          </span>
          <div>
            <p className="text-[11px] muted">Latest average</p>
            <p className="font-semibold tabular mt-1">
              {snapshots.length ? `${n(latest!.percentage)}%` : "—"}
            </p>
            <p className="text-[10px] muted mt-1">
              {latest ? `${latest.pointCount} result${latest.pointCount === 1 ? "" : "s"} that day` : "No results yet"}
            </p>
          </div>
        </div>
        <div className="col-span-2 flex items-start gap-3 sm:col-span-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-positive-soft text-positive" aria-hidden="true">
            <PlainIcon name="arrowUpRight" size={14} />
          </span>
          <div>
            <p className="text-[11px] muted">Against target</p>
            <p className="font-semibold tabular mt-1 flex items-center gap-1.5">
              {gap == null ? (
                "—"
              ) : (
                <>
                  {gap > 0 ? "+" : ""}
                  {n(gap)} pp
                  {gap >= 0 ? (
                    <PlainIcon name="arrowUpRight" size={14} />
                  ) : (
                    <PlainIcon name="arrowDownRight" size={14} />
                  )}
                </>
              )}
            </p>
            <p className="text-[10px] muted mt-1 flex items-center gap-1">
              {direction === "up" ? (
                <PlainIcon name="trend" size={12} />
              ) : direction === "down" ? (
                <PlainIcon name="arrowDownRight" size={12} />
              ) : (
                <PlainIcon name="minus" size={12} />
              )}
              {change == null
                ? "Need two dated snapshots"
                : direction === "flat"
                  ? "Flat since the previous snapshot"
                  : `${direction === "up" ? "Up" : "Down"} ${n(Math.abs(change))} pp since the previous snapshot`}
            </p>
          </div>
        </div>
      </div>
      {snapshots.length > 1 ? (
        <>
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
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <ViewData
              columns={["Date", "Average", "Results"]}
              rows={snapshots.map((snapshot) => [
                dateLabel(snapshot.date),
                `${n(snapshot.percentage)}%`,
                snapshot.pointCount,
              ])}
            />
            {snapshots.length > 1 && (
              <p className="pb-3 text-[10px] text-muted">
                Average (last {snapshots.length} snapshots):{" "}
                <span className="font-medium tabular text-accent">
                  {n(latest!.percentage)}%
                </span>
              </p>
            )}
          </div>
        </>
      ) : snapshots.length === 1 ? (
        <p className="mt-3 rounded-control border border-rule-soft bg-canvas px-3 py-3 text-[11px] leading-relaxed text-muted">
          One dated snapshot is saved. Log another result to see the target
          trend.
        </p>
      ) : (
        <EmptyChart>Your target trend appears after your first mock.</EmptyChart>
      )}
      {target == null && (
        <p className="text-[10px] muted mt-2">
          Set one target under Settings &amp; backup; it becomes a percentage
          reference on every dashboard tab.
        </p>
      )}
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
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
              <PlainIcon name="success" size={14} />
            </span>
            <div>
              <p className="font-semibold tabular text-sm text-ink">
                {n(current.accuracy)}%
              </p>
              <p className="text-[10px] muted">Average accuracy</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
              <PlainIcon name="clock" size={14} />
            </span>
            <div>
              <p className="font-semibold tabular text-sm text-ink">
                {formatTime(
                  current.averageTime == null
                    ? null
                    : Math.round(current.averageTime),
                )}
              </p>
              <p className="text-[10px] muted">Average time</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
              <PlainIcon name="file" size={14} />
            </span>
            <div>
              <p className="font-semibold tabular text-sm text-ink">
                {n(current.percentage)}%
              </p>
              <p className="text-[10px] muted">Average score</p>
            </div>
          </div>
        </div>
        <select
          className="w-auto py-1.5 px-2 text-xs"
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
      {current.trend.length > 1 ? (
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
      ) : (
        <p className="mt-2 rounded-control border border-rule-soft bg-canvas px-3 py-2.5 text-[11px] leading-relaxed text-muted">
          Only one {SUBJECTS[current.id].short} result is saved. Log another to
          draw accuracy and time trends.
        </p>
      )}
    </div>
  );
}
/**
 * Memoized at the top level: the shell re-renders on every chat-stream
 * token and filter keystroke, but analytics/target are stable between data
 * refreshes, so the charts and their derived rows are skipped.
 */
export const PerformanceOverview = memo(function PerformanceOverview({
  analytics,
  target,
}: {
  analytics: Analytics | null;
  target: number | null;
}) {
  if (!analytics) return <EmptyChart>Loading your preparation…</EmptyChart>;
  const { scope } = analytics;
  const copy = scopeCopy[scope];
  const standPanel = (
    <Panel
      title={scope === "all" ? "Where you stand" : scope === "subject" ? "Subject-wise strengths" : "Where you stand"}
      description="Your performance across different areas."
    >
      <WhereYouStand rows={analytics.whereYouStand} />
    </Panel>
  );
  return (
    <>
      <PerformanceMeta analytics={analytics} />
      <div className="grid xl:grid-cols-[1.65fr_1fr] gap-4 mb-4">
        <Panel title={copy.trend} description={copy.trendDescription}>
          <ScopeTrend analytics={analytics} targetScore={target} />
        </Panel>
        {standPanel}
      </div>
      {(scope === "subject" || scope === "sectional") && (
        <OverviewDonutCards analytics={analytics} />
      )}
      {(scope === "subject" || scope === "sectional") && (
        <GroupedScoreBars analytics={analytics} />
      )}
      {scope === "all" && <ScoreDistribution analytics={analytics} />}
      {(scope === "full" || scope === "all") && (
        <AttemptBreakdown analytics={analytics} />
      )}
      {(target != null || analytics.target.snapshots.length > 0) && (
        <Panel
          title="My target"
          description="Set a target and track your progress with time."
          action={
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 rounded-control border border-rule-soft px-2.5 py-1.5 text-[10px] font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent"
            >
              <Pencil size={11} /> Edit target
            </Link>
          }
          className="mb-4"
        >
          <TargetPanel analytics={analytics} target={target} />
        </Panel>
      )}
      {scope !== "subject" &&
        (analytics.deepDive ?? []).some((subject) => subject.count > 0) && (
          <Panel
            title="Subject deep dive"
            description="Analyze your strengths and weaknesses across subjects."
          >
            <DeepDive analytics={analytics} />
          </Panel>
        )}
      {scope === "subject" && <SubjectLines analytics={analytics} />}
    </>
  );
});
