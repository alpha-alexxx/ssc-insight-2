"use client";
import Link from "next/link";
import { Skeleton } from "./ui/skeleton";
import { PlainIcon } from "./icon";
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
 * Four KPI cards, each answering one question and clicking through to the
 * surface that acts on it. Values come only from the merged plan, personal
 * tasks, and the current analytics scope; a missing plan/result renders as a
 * placeholder rather than a fabricated zero.
 */
export function DashboardOverview({
  plan,
  analytics,
  target,
  loading,
  personalOverdue,
  onOpenToday,
  onViewAll,
}: {
  plan: (PlanPayload & { today: string }) | null;
  analytics: Analytics | null;
  target: number | null;
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
        className="dashboard-overview"
        role="region"
        aria-busy="true"
        aria-label="Loading overview"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="dashboard-kpi min-h-28">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-3 h-1.5 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const today = plan?.today ?? "";
  const todayPlan = plan?.days.find((day) => day.date === today);
  const todayStats = todayPlan ? dayAssignmentStats(todayPlan) : null;
  const stats = plan ? planProgressStats(plan.days) : null;
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
      icon: "file" as const,
      tile: "bg-accent-soft text-accent",
      pct:
        todayStats && todayStats.total > 0
          ? todayStats.completed / todayStats.total
          : 0,
      onClick: onOpenToday,
    },
    {
      key: "plan",
      label: "Plan completed",
      value: stats ? `${stats.completionPct}%` : "—",
      hint: stats
        ? `${stats.completedAssignments} of ${stats.totalAssignments} assignments`
        : "Plan unavailable",
      icon: "success" as const,
      tile: "bg-positive-soft text-positive",
      pct: stats ? stats.completionPct / 100 : 0,
      href: "/calendar" as const,
    },
    {
      key: "overdue",
      label: "Personal overdue",
      value: personalOverdue == null ? "—" : n(personalOverdue),
      hint:
        personalOverdue == null
          ? "Personal tasks unavailable"
          : personalOverdue
            ? "Personal tasks past due"
            : "Nothing overdue in My Tasks",
      icon: "clock" as const,
      tile: "bg-warning-soft text-warning",
      pct: null,
      href: "/my-tasks" as const,
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
      icon: "trend" as const,
      tile: "bg-accent-soft text-accent",
      pct: latest ? latest.percentage / 100 : 0,
      onClick: onViewAll,
    },
  ];

  return (
    <section className="dashboard-overview" aria-label="Dashboard overview">
      {metrics.map(({ key, ...metric }) => (
        <KpiCard key={key} {...metric} />
      ))}
    </section>
  );
}

type KpiMetric = {
  label: string;
  value: string;
  hint: string;
  icon: "file" | "success" | "clock" | "trend";
  tile: string;
  pct: number | null;
  onClick?: () => void;
  href?: "/calendar" | "/my-tasks";
};

function KpiCard({
  label,
  value,
  hint,
  icon,
  tile,
  pct,
  onClick,
  href,
}: KpiMetric) {
  const inner = (
    <>
      <div className="dashboard-kpi-main">
        <span className={cn("dashboard-kpi-icon", tile)} aria-hidden="true">
          <PlainIcon name={icon} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
            {label}
          </p>
          <p className="dashboard-kpi-value tabular">{value}</p>
          <p className="dashboard-kpi-hint">{hint}</p>
        </div>
        <PlainIcon
          name="chevronRight"
          size={14}
          className="mt-1 shrink-0 text-muted"
        />
      </div>
      {pct != null && (
        <div className="dashboard-kpi-progress">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-pill bg-soft"
            role="progressbar"
            aria-label={`${label} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct * 100)}
          >
            <div
              className="h-full rounded-pill bg-accent"
              style={{ width: `${Math.round(pct * 100)}%` }}
            />
          </div>
          <span className="text-[10px] tabular text-muted">
            {Math.round(pct * 100)}%
          </span>
        </div>
      )}
    </>
  );
  const className = "dashboard-kpi block w-full text-left";
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
