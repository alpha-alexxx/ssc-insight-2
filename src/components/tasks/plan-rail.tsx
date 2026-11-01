"use client";

import Link from "next/link";
import { PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { ProgressRule } from "../plan/plan-shared";
import {
  addIsoDays,
  dayAssignmentStats,
  isMockType,
  nextRecommendedAction,
  type PlanDayView,
} from "@/lib/plan/view-model";
import { longDate, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The study plan's expectations, inside My Tasks.
 *
 * My Tasks used to be a sealed todo app: it imported no plan or attempt
 * module at all, so a user planning tomorrow's revision had no idea the plan
 * already scheduled a sectional that day. This rail is read-only — it shows
 * what the schedule expects and links to the day; completing plan work stays
 * on the plan surfaces, because a personal task and a plan assignment are
 * deliberately different records.
 */
export function PlanRail({
  plan,
  today,
}: {
  plan: {
    today: string;
    days: PlanDayView[];
  } | null;
  today: string;
}) {
  if (!plan) {
    return (
      <section className="panel p-4" aria-label="Study plan">
        <h3 className="font-serif text-lg">Study plan</h3>
        <p className="mt-1 text-xs text-muted">Loading today&apos;s plan…</p>
        <div className="mt-3 h-16 animate-pulse rounded-control bg-soft" />
      </section>
    );
  }

  const byDate = new Map(plan.days.map((day) => [day.date, day]));
  const todayDay = byDate.get(today) ?? null;
  const tomorrowDay = byDate.get(addIsoDays(today, 1)) ?? null;
  const recommended = nextRecommendedAction(plan.days, today);
  const todayStats = todayDay ? dayAssignmentStats(todayDay) : null;

  return (
    <section className="panel p-4" aria-label="Study plan">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg">Study plan</h3>
        <Link
          href={`/plan/week/${today}`}
          className="text-[0.6875rem] font-medium text-accent hover:underline"
        >
          This week →
        </Link>
      </div>
      <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-muted">
        What the schedule expects. Completing plan work happens on the plan.
      </p>

      {todayDay ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted">
              Today · Day {todayDay.day}
            </p>
            {todayStats && (
              <span className="text-[0.625rem] tabular text-muted">
                {todayStats.completed}/{todayStats.total}
              </span>
            )}
          </div>
          {todayStats && (
            <ProgressRule
              done={todayStats.completed}
              total={todayStats.total}
              label="Today's plan assignments"
              className="mt-1.5"
            />
          )}
          <ul className="mt-2 space-y-1">
            {todayDay.tasks.length === 0 && (
              <li className="text-xs text-muted">No assignments scheduled.</li>
            )}
            {todayDay.tasks.slice(0, 4).map((task) => (
              <li
                key={task.key}
                className="flex items-baseline gap-2 text-xs"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 size-1.5 shrink-0",
                    task.completed ? "bg-positive" : "bg-rule",
                  )}
                />
                <span
                  className={cn(
                    "min-w-0 truncate",
                    task.completed ? "text-muted line-through" : "text-ink",
                  )}
                >
                  {task.name}
                </span>
                {isMockType(task.type) && (
                  <span className="shrink-0 text-[0.5625rem] uppercase tracking-wide text-accent">
                    Mock
                  </span>
                )}
              </li>
            ))}
            {todayDay.tasks.length > 4 && (
              <li className="text-[0.625rem] text-muted">
                +{todayDay.tasks.length - 4} more assignment
                {todayDay.tasks.length - 4 === 1 ? "" : "s"}
              </li>
            )}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">
          Today is outside the 50-day plan window.
        </p>
      )}

      {tomorrowDay && (
        <div className="mt-3 border-t border-rule-soft pt-2.5">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted">
            Tomorrow · Day {tomorrowDay.day}
          </p>
          <p className="mt-0.5 text-xs text-ink">
            {tomorrowDay.tasks.length
              ? `${tomorrowDay.tasks.length} assignment${tomorrowDay.tasks.length === 1 ? "" : "s"} — ${tomorrowDay.tasks[0]!.name}${tomorrowDay.tasks.length > 1 ? "…" : ""}`
              : "Nothing scheduled."}
          </p>
        </div>
      )}

      {recommended && (
        <div className="mt-3 rounded-control bg-canvas p-2.5">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted">
            {recommended.overdue ? "Carried over" : "Next up"}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-ink">
            {recommended.task.name}
          </p>
          <p className="text-[0.625rem] text-muted">
            Day {recommended.day.day} · {shortDate(recommended.day.date)}
          </p>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="mt-2 h-7 w-full text-[0.6875rem]"
          >
            <Link href={`/plan/${recommended.day.date}`}>
              Open day <PlainIcon name="arrowRight" size={12} />
            </Link>
          </Button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-rule-soft pt-2.5">
        <Link
          href={`/plan/${today}`}
          className="text-[0.6875rem] font-medium text-accent hover:underline"
        >
          Today&apos;s workspace
        </Link>
        <span aria-hidden="true" className="text-muted">
          ·
        </span>
        <Link
          href="/calendar"
          className="text-[0.6875rem] font-medium text-accent hover:underline"
        >
          Calendar
        </Link>
        <span aria-hidden="true" className="text-muted">
          ·
        </span>
        <span className="text-[0.6875rem] text-muted">
          {longDate(today)}
        </span>
      </div>
    </section>
  );
}
