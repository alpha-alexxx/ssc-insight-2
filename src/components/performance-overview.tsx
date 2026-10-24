"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { subjectColors } from "@/lib/chart-theme";
import { Panel, EmptyChart } from "./dashboard-panels";
import {
  type SubjectId,
  SUBJECTS,
  subjectIds,
  formatNumber as n,
  formatTime,
} from "@/lib/domain";
import type { Analytics } from "@/lib/analytics";
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
export function PerformanceOverview({
  analytics,
  target,
  subject,
  onSubjectChange,
}: {
  analytics: Analytics | null;
  target: number | null;
  subject: SubjectId;
  onSubjectChange: (subject: SubjectId) => void;
}) {
  const currentSubject = analytics?.subjects.find((s) => s.id === subject);
  return (
    <>
      <div className="stat-strip">
        {[
          {
            label: "Mocks completed",
            value: analytics ? n(analytics.count) : "—",
            suffix: "",
            hint: "Every attempt counts",
          },
          {
            label: "Average full-mock score",
            value: n(analytics?.averageFullScore),
            suffix: "/ 390",
            hint: "Four main subjects only",
          },
          {
            label: "Personal best · full mock",
            value: n(analytics?.bestFullScore),
            suffix: "/ 390",
            hint:
              target != null
                ? `Your target: ${n(target)} / 390`
                : "Your next benchmark",
          },
          {
            label: "Overall accuracy",
            value: n(analytics?.accuracy),
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
        <Panel
          title={`${SUBJECTS[subject].short} performance`}
          description={`${currentSubject?.count ?? 0} results across full, sectional and subject mocks. Date and platform filters apply.`}
          action={
            <select
              aria-label="Performance subject"
              className="!w-auto !py-1.5 !px-2 text-xs"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value as SubjectId)}
            >
              {subjectIds.map((id) => (
                <option key={id} value={id}>
                  {SUBJECTS[id].short}
                </option>
              ))}
            </select>
          }
        >
          <div className="px-3 pb-3">
            {currentSubject?.trend.length ? (
              <>
                <div className="h-[265px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={currentSubject.trend}
                      margin={{
                        left: 0,
                        right: 20,
                        top: 10,
                        bottom: 5,
                      }}
                      accessibilityLayer
                    >
                      <defs>
                        <linearGradient
                          id="scoreFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--chart-score)"
                            stopOpacity={0.15}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--chart-score)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--rule-soft)"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={dateLabel}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 11,
                          fill: "var(--muted)",
                        }}
                        minTickGap={24}
                      />
                      <YAxis
                        domain={[(minimum: number) => Math.min(0, minimum), 100]}
                        allowDataOverflow
                        tickFormatter={(v) => `${v}%`}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 11,
                          fill: "var(--muted)",
                        }}
                        width={45}
                      />
                      <Tooltip
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload
                            ? `${payload[0].payload.name} · ${{ full: "Full mock", sectional: "Sectional mock", subject: "Subject mock" }[payload[0].payload.mockType as "full" | "sectional" | "subject"]}`
                            : ""
                        }
                        formatter={(value) => `${n(Number(value))}%`}
                      />
                      <Area
                        isAnimationActive={false}
                        type="monotone"
                        dataKey="percentage"
                        name="Score"
                        stroke="var(--chart-score)"
                        strokeWidth={2.5}
                        fill="url(#scoreFill)"
                        dot={{ r: 3, fill: "var(--chart-score)" }}
                      />
                      <Area
                        isAnimationActive={false}
                        type="monotone"
                        dataKey="rollingAverage"
                        name="Last 5 average"
                        stroke="var(--chart-average)"
                        strokeDasharray="4 4"
                        fill="transparent"
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 pb-2 text-[11px] muted">
                  <span className="flex gap-2 items-center">
                    <i className="w-4 h-0.5 bg-accent" />
                    Subject score %
                  </span>
                  <span className="flex gap-2 items-center">
                    <i className="w-4 border-t border-dashed border-muted" />
                    Last 5 average
                  </span>
                </div>
                <p className="sr-only">
                  {currentSubject.trend
                    .map(
                      (t) =>
                        `${t.name} (${t.mockType}): ${n(t.score)} out of ${t.maxScore}, ${n(t.percentage)} percent`,
                    )
                    .join("; ")}
                </p>
              </>
            ) : (
              <EmptyChart>
                No {SUBJECTS[subject].short} results yet. Full, sectional and
                subject mocks all contribute here.
              </EmptyChart>
            )}
          </div>
        </Panel>
        <Panel
          title="Where you stand"
          description="Average subject score across all mock types."
        >
          <div className="px-6 pt-5 pb-3 space-y-5">
            {analytics?.subjects.filter((s) => s.count).length ? (
              analytics.subjects
                .filter((s) => s.count)
                .map((s) => (
                  <div key={s.id}>
                    <div className="flex justify-between text-xs mb-2">
                      <span>
                        {s.name}
                        {s.id === "computer" && (
                          <span className="muted"> · qualifying</span>
                        )}
                      </span>
                      <strong className="tabular font-medium">
                        {n(s.percentage)}%
                      </strong>
                    </div>
                    <div className="h-1.5 rounded-none bg-soft overflow-hidden">
                      <div
                        className="h-full rounded-none"
                        style={{
                          width: `${Math.max(0, s.percentage ?? 0)}%`,
                          background: subjectColors[s.id],
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] muted">
                      {s.count} result
                      {s.count !== 1 ? "s" : ""} · {n(s.accuracy)}% accuracy
                    </p>
                  </div>
                ))
            ) : (
              <EmptyChart>
                Log subject results to discover your strengths.
              </EmptyChart>
            )}
          </div>
          {analytics?.weakest && (
            <div className="m-5 mt-3 p-3 rounded-none bg-accent-soft flex items-start gap-2.5">
              <TrendingUp size={16} className="text-accent mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed text-ink">
                <strong className="font-medium">
                  Room to grow: {analytics.weakest.name}.
                </strong>{" "}
                Start here for your next focused practice.
              </p>
            </div>
          )}
        </Panel>
      </div>
      <div className="grid xl:grid-cols-[1fr_1.65fr] gap-6 mb-6">
        <Panel
          title="Make every attempt count"
          description="Your question breakdown across filtered mocks."
        >
          {analytics && analytics.count > 0 ? (
            <div className="px-6 pb-5">
              <div className="h-[170px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart accessibilityLayer>
                    <Pie
                      isAnimationActive={false}
                      data={[
                        {
                          name: "Correct",
                          value: analytics.correct,
                        },
                        {
                          name: "Incorrect",
                          value: analytics.incorrect,
                        },
                        {
                          name: "Unattempted",
                          value: analytics.unattempted,
                        },
                      ]}
                      dataKey="value"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {[
                        "var(--chart-correct)",
                        "var(--chart-incorrect)",
                        "var(--chart-skipped)",
                      ].map((c) => (
                        <Cell fill={c} key={c} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
                  <strong className="text-xl tabular">
                    {n(analytics.accuracy)}%
                  </strong>
                  <span className="text-[10px] muted">accuracy</span>
                </div>
              </div>
              <div className="grid grid-cols-3 text-center">
                {[
                  {
                    label: "Correct",
                    value: analytics.correct,
                    color: "bg-chart-correct",
                  },
                  {
                    label: "Incorrect",
                    value: analytics.incorrect,
                    color: "bg-chart-incorrect",
                  },
                  {
                    label: "Skipped",
                    value: analytics.unattempted,
                    color: "bg-chart-skipped",
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="font-semibold tabular">{s.value}</p>
                    <p className="text-[11px] muted mt-1 flex items-center justify-center gap-1.5">
                      <span className={`size-1.5 rounded-none ${s.color}`} />
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart />
          )}
        </Panel>
        <Panel
          title="Subject deep dive"
          description="Subject accuracy and time across all mock types."
          action={
            <select
              className="!w-auto !py-1.5 !px-2 text-xs"
              aria-label="Subject deep dive"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value as SubjectId)}
            >
              {subjectIds.map((id) => (
                <option key={id} value={id}>
                  {SUBJECTS[id].short}
                </option>
              ))}
            </select>
          }
        >
          {currentSubject?.count ? (
            <>
              <div className="flex gap-8 px-6 pt-2">
                <div>
                  <p className="text-[11px] muted">Average accuracy</p>
                  <p className="font-semibold tabular mt-1">
                    {n(currentSubject.accuracy)}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] muted">Average time</p>
                  <p className="font-semibold tabular mt-1">
                    {formatTime(
                      currentSubject.averageTime == null
                        ? null
                        : Math.round(currentSubject.averageTime),
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] muted">Average score</p>
                  <p className="font-semibold tabular mt-1">
                    {n(currentSubject.percentage)}%
                  </p>
                </div>
              </div>
              <div className="h-[180px] px-3 mt-3 pb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentSubject.trend} accessibilityLayer>
                    <CartesianGrid vertical={false} stroke="var(--rule-soft)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={dateLabel}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="accuracy"
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <YAxis
                      yAxisId="minutes"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${v}m`}
                      axisLine={false}
                      tickLine={false}
                      width={35}
                    />
                    <Tooltip
                      labelFormatter={(value) => dateLabel(String(value))}
                      formatter={(value, name) =>
                        name === "Accuracy"
                          ? `${n(Number(value))}%`
                          : `${n(Number(value))} min`
                      }
                    />
                    <Line
                      isAnimationActive={false}
                      yAxisId="accuracy"
                      dataKey="accuracy"
                      name="Accuracy"
                      stroke="var(--chart-score)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      isAnimationActive={false}
                      yAxisId="minutes"
                      dataKey="minutes"
                      name="Time"
                      stroke="var(--chart-time)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-[10px] muted pb-4">
                Terracotta: accuracy · Teal: time in minutes
              </p>
            </>
          ) : (
            <EmptyChart>
              No {SUBJECTS[subject].short} results in this view yet.
            </EmptyChart>
          )}
        </Panel>
      </div>
      <div className="flex flex-wrap gap-2 items-center mb-6 px-1 text-xs muted">
        <TrendingUp size={16} className="text-accent" />
        {analytics?.improvement != null ? (
          <span>
            Recent progress:{" "}
            <strong
              className={
                analytics.improvement >= 0 ? "text-positive" : "text-warning"
              }
            >
              {analytics.improvement > 0 ? "+" : ""}
              {n(analytics.improvement)} percentage points
            </strong>{" "}
            in your latest 5 vs previous 5 comparable mocks.
          </span>
        ) : (
          <span>
            Log 10 mocks with the same subjects and question counts to see your
            recent improvement.
          </span>
        )}
      </div>
    </>
  );
}
