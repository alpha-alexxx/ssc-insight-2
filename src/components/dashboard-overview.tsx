"use client";
import Link from "next/link";
import { Skeleton } from "./ui/skeleton";
import { PlainIcon, type IconName } from "./icon";
import { cn } from "@/lib/utils";
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
    return (
      <div
        className="metric-strip"
        aria-busy="true"
        aria-label="Loading overview"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="metric-cell">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-2.5 h-8 w-20" />
            <Skeleton className="mt-2 h-2.5 w-24" />
            <Skeleton className="mt-3 h-0.5 w-full" />
          </div>
        ))}
      </div>
    );
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
    href?: "/calendar" | "/my-tasks";
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
    <div className="metric-strip">
      {metrics.map(({ key, ...metric }) => (
        <MetricCell key={key} {...metric} />
      ))}
    </div>
  );
}

function MetricCell({
  label,
  icon,
  value,
  hint,
  pct,
  tone,
  delta,
  onClick,
  href,
}: {
  label: string;
  icon: IconName;
  value: string;
  hint: string;
  pct: number | null;
  /** Semantic tone for the figure itself (danger when work is overdue). */
  tone?: "danger";
  delta?: { tone: string; label: string } | null;
  onClick?: () => void;
  href?: "/calendar" | "/my-tasks";
}) {
  const inner = (
    <>
      <span className="metric-head">
        <PlainIcon name={icon} size={13} className="shrink-0 text-accent" />
        <span className="metric-label truncate">{label}</span>
        <PlainIcon
          name="chevronRight"
          size={13}
          className="metric-go ml-auto shrink-0 text-muted"
        />
      </span>
      <span className="metric-figure">
        <span className={cn("metric-value", tone === "danger" && "text-danger")}>
          {value}
        </span>
        {delta && (
          <span className={cn("metric-delta", delta.tone)}>{delta.label}</span>
        )}
      </span>
      <span className="metric-hint block truncate">{hint}</span>
      <span
        className="metric-rule block"
        role={pct != null ? "progressbar" : undefined}
        aria-label={pct != null ? `${label} progress` : undefined}
        aria-valuemin={pct != null ? 0 : undefined}
        aria-valuemax={pct != null ? 100 : undefined}
        aria-valuenow={pct != null ? Math.round(pct * 100) : undefined}
        aria-hidden={pct == null ? true : undefined}
      >
        <span style={{ width: `${Math.round((pct ?? 0) * 100)}%` }} />
      </span>
    </>
  );
  const className = cn("metric-cell", !href && !onClick && "cursor-default");
  if (href) {
    return (
      <Link
        href={href}
        className={className}
        aria-label={`${label}: ${value}. ${hint}`}
      >
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        aria-label={`${label}: ${value}. ${hint}`}
      >
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}
