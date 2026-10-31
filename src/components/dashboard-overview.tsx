"use client";
import { type IconName } from "./icon";
import { MetricCell, MetricStripSkeleton } from "./metric-strip";
import type { Analytics } from "@/lib/analytics";
import { formatNumber as n } from "@/lib/domain";
import { shortDate } from "@/lib/format";
import {
  dayAssignmentStats,
  planProgressStats,
  type PlanPayload,
} from "@/lib/plan/view-model";

/**
 * The dashboard overview: one divided metric strip, not four floating cards.
 * Each cell answers one question and is itself the link to the surface that
 * acts on it. Values come only from the merged plan, personal tasks, and the
 * current analytics scope; a missing plan/result renders as a placeholder
 * rather than a fabricated zero.
 */
export function DashboardOverview({
  plan,
  analytics,
  loading,
  personalOverdue,
  onOpenToday,
  onViewAll,
}: {
  plan: (PlanPayload & { today: string }) | null;
  analytics: Analytics | null;
  loading: boolean;
  /** Count of unfinished personal tasks past their due date; null when unknown. */
  personalOverdue: number | null;
  /** Opens today's plan day. */
  onOpenToday: () => void;
  /** Opens mock history. */
  onViewAll: () => void;
}) {
  if (loading && !plan) {
    return <MetricStripSkeleton label="Loading overview" />;
  }

  const today = plan?.today ?? "";
  const todayPlan = plan?.days.find((day) => day.date === today);
  const todayStats = todayPlan ? dayAssignmentStats(todayPlan) : null;
  const stats = plan ? planProgressStats(plan.days) : null;
  const trend = analytics?.trend.points ?? [];
  const latest = trend.at(-1) ?? null;
  const previous = trend.length >= 2 ? trend.at(-2) ?? null : null;
  /* Score movement between the two most recent mocks in scope: the delta is
     only shown when both points exist, never fabricated from a single result. */
  const deltaPts =
    latest && previous ? latest.percentage - previous.percentage : null;
  const latestDelta =
    deltaPts == null
      ? null
      : deltaPts > 0
        ? { tone: "is-up", label: `+${n(deltaPts)} pts` }
        : deltaPts < 0
          ? { tone: "is-down", label: `−${n(Math.abs(deltaPts))} pts` }
          : { tone: "is-flat", label: "±0 pts" };

  const metrics: {
    key: string;
    label: string;
    icon: IconName;
    value: string;
    hint: string;
    pct: number | null;
    tone?: "danger";
    delta?: { tone: string; label: string } | null;
    onClick?: () => void;
    href?: string;
  }[] = [
    {
      key: "today",
      label: "Today's plan",
      icon: "file",
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
      pct:
        todayStats && todayStats.total > 0
          ? todayStats.completed / todayStats.total
          : 0,
      onClick: onOpenToday,
    },
    {
      key: "plan",
      label: "Plan completed",
      icon: "success",
      value: stats ? `${stats.completionPct}%` : "—",
      hint: stats
        ? `${stats.completedAssignments} of ${stats.totalAssignments} assignments`
        : "Plan unavailable",
      pct: stats ? stats.completionPct / 100 : 0,
      href: "/calendar" as const,
    },
    {
      key: "overdue",
      label: "Personal overdue",
      icon: "clock",
      value: personalOverdue == null ? "—" : n(personalOverdue),
      hint:
        personalOverdue == null
          ? "Personal tasks unavailable"
          : personalOverdue
            ? "Personal tasks past due"
            : "Nothing overdue in My Tasks",
      pct: null,
      tone: personalOverdue ? "danger" : undefined,
      href: "/my-tasks" as const,
    },
    {
      key: "latest",
      label: "Latest result",
      icon: "trend",
      value: latest ? `${n(latest.percentage)}%` : "—",
      hint: latest
        ? `${shortDate(latest.date)} · ${n(latest.score)}/${latest.maxScore}`
        : analytics
          ? "No saved result in this scope"
          : "Results unavailable",
      pct: latest ? latest.percentage / 100 : 0,
      delta: latestDelta,
      onClick: onViewAll,
    },
  ];

  return (
    <div className="strip-frame">
      <div className="metric-strip">
        {metrics.map(({ key, ...metric }) => (
          <MetricCell key={key} {...metric} />
        ))}
      </div>
    </div>
  );
}
