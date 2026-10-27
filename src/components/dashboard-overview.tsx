"use client";
import { Skeleton } from "./ui/skeleton";
import type { Analytics } from "@/lib/analytics";
import { formatNumber as n } from "@/lib/domain";
import { shortDate } from "@/lib/format";
import {
  dayAssignmentStats,
  isMockType,
  planProgressStats,
  upcomingMocks,
  type PlanPayload,
} from "@/lib/plan/view-model";

/**
 * Four real-data overview metrics. Values come only from the merged plan and
 * the current analytics scope; a missing plan/result is rendered as a
 * placeholder rather than a fabricated zero.
 */
export function DashboardOverview({
  plan,
  analytics,
  target,
  loading,
}: {
  plan: (PlanPayload & { today: string }) | null;
  analytics: Analytics | null;
  target: number | null;
  loading: boolean;
}) {
  if (loading && !plan) {
    return (
      <div className="metric-strip" aria-busy="true" aria-label="Loading overview">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="metric-cell">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-2.5 h-7 w-24" />
            <Skeleton className="mt-2 h-2.5 w-28" />
          </div>
        ))}
      </div>
    );
  }

  const today = plan?.today ?? "";
  const todayPlan = plan?.days.find((day) => day.date === today);
  const todayStats = todayPlan ? dayAssignmentStats(todayPlan) : null;
  const stats = plan ? planProgressStats(plan.days) : null;
  const upcoming = plan
    ? upcomingMocks(plan.days, today, 1_000).filter(({ task }) =>
        isMockType(task.type),
      ).length
    : 0;
  const latest = analytics?.trend.points.at(-1) ?? null;

  const metrics = [
    {
      key: "today",
      label: "Today's assignments",
      value: todayPlan
        ? `${todayStats?.completed ?? 0}/${todayStats?.total ?? 0}`
        : "—",
      hint: todayPlan
        ? todayPlan.tasks.length
          ? `${todayStats?.outstanding ?? 0} left on day ${todayPlan.day}`
          : "Nothing scheduled today"
        : plan
          ? "Outside the 50-day window"
          : "Plan unavailable",
    },
    {
      key: "plan",
      label: "Plan completed",
      value: stats ? `${stats.completionPct}%` : "—",
      hint: stats
        ? `${stats.completedAssignments} of ${stats.totalAssignments} assignments`
        : "Plan unavailable",
    },
    {
      key: "upcoming",
      label: "Upcoming mocks",
      value: plan ? n(upcoming) : "—",
      hint: plan
        ? upcoming
          ? "Full-length live/paid mocks remaining"
          : "No outstanding mock tests"
        : "Plan unavailable",
    },
    {
      key: "latest",
      label: "Latest result",
      value: latest ? `${n(latest.percentage)}%` : "—",
      hint: latest
        ? `${shortDate(latest.date)} · ${n(latest.score)}/${latest.maxScore}${
            target != null ? ` · target ${n(target)}/390` : ""
          }`
        : analytics
          ? "No saved result in this scope"
          : "Results unavailable",
    },
  ];

  return (
    <dl className="metric-strip" aria-label="Preparation overview">
      {metrics.map((metric) => (
        <div key={metric.key} className="metric-cell">
          <dt className="metric-label">{metric.label}</dt>
          <dd className="metric-value">{metric.value}</dd>
          <p className="metric-hint">{metric.hint}</p>
        </div>
      ))}
    </dl>
  );
}
