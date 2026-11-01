"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "../page-header";
import { Panel } from "../dashboard-panels";
import { PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { PlanErrorCard, ProgressRule } from "./plan-shared";
import {
  addIsoDays,
  dayAssignmentStats,
  isoWeekdayName,
  isMockType,
  monthGridDays,
  planProgressStats,
  revisionQueue,
  weekRange,
  type PlanDayView,
} from "@/lib/plan/view-model";
import { longDate, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { usePlanData } from "../use-plan-data";

/**
 * Weekly planner — the "when do I study it" surface the day page could not
 * answer alone.
 *
 * Seven days from the week containing the selected date, each with its
 * scheduled work, its completion rule and the outstanding revision. It is a
 * reading of the SAME merged plan payload the dashboard, calendar and day
 * view use, so nothing here is derived a second time. The week is a real
 * address (`/plan/week/<date>`) that can be linked and stepped.
 */
export function PlanWeekView({
  date,
  planApi,
  onOpenDay,
}: {
  date: string;
  planApi: ReturnType<typeof usePlanData>;
  onOpenDay: (date: string) => void;
}) {
  const { plan, loading, error, refresh } = planApi;
  const range = useMemo(() => weekRange(date), [date]);

  const days = useMemo(() => {
    if (!plan) return [];
    const byDate = new Map(plan.days.map((day) => [day.date, day]));
    return Array.from({ length: 7 }, (_, index) => {
      const iso = addIsoDays(range.from, index);
      return { date: iso, planDay: byDate.get(iso) ?? null };
    });
  }, [plan, range.from]);

  const stats = useMemo(
    () => (plan ? planProgressStats(plan.days) : null),
    [plan],
  );
  const revisions = useMemo(
    () => (plan ? revisionQueue(plan.days, date).items.slice(0, 6) : []),
    [date, plan],
  );

  if (loading && !plan)
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (!plan || error)
    return (
      <PlanErrorCard
        message={error ?? "Check your connection, then try again."}
        onRetry={() => void refresh()}
      />
    );

  const prevWeek = addIsoDays(range.from, -7);
  const nextWeek = addIsoDays(range.from, 7);
  const sameMonth = range.from.slice(0, 7) === range.to.slice(0, 7);
  const weekNumber = plan.days.find((day) => day.date === range.from)?.day;

  return (
    <div>
      <PageHeader
        title="This week"
        description={
          sameMonth
            ? `${shortDate(range.from)} – ${shortDate(range.to)}`
            : `${longDate(range.from)} – ${longDate(range.to)}`
        }
        meta={
          <>
            {weekNumber ? (
              <span>Plan week starting day {weekNumber}</span>
            ) : (
              <span>Outside the 50-day plan window</span>
            )}
            {stats && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {stats.completedAssignments} of {stats.totalAssignments}{" "}
                  assignments done ({stats.completionPct}%)
                </span>
              </>
            )}
          </>
        }
        actions={
          <div className="flex items-center gap-1.5">
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/plan/week/${prevWeek}`}
                aria-label="Previous week"
                className="inline-flex items-center gap-1"
              >
                <PlainIcon name="arrowLeft" size={13} /> Prev
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/plan/week/${addIsoDays(date, 0)}`}>This day</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/plan/week/${nextWeek}`}
                aria-label="Next week"
                className="inline-flex items-center gap-1"
              >
                Next <PlainIcon name="arrowRight" size={13} />
              </Link>
            </Button>
          </div>
        }
      />

      <Panel
        icon="calendar"
        title="The week's schedule"
        description="Open any day for its full workspace, checklist and results."
      >
        <ol className="divide-y divide-rule-soft">
          {days.map(({ date: iso, planDay }) => (
            <WeekRow
              key={iso}
              date={iso}
              day={planDay}
              isToday={iso === plan.today}
              onOpenDay={onOpenDay}
            />
          ))}
        </ol>
      </Panel>

      {revisions.length > 0 && (
        <Panel
          className="mt-4"
          icon="refresh"
          title="Outstanding revision"
          description="Revision completes only when you tick it — never automatically."
        >
          <ul className="divide-y divide-rule-soft">
            {revisions.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">
                    {item.label}
                  </span>
                  <span className="block text-[0.6875rem] text-muted">
                    Day {item.day} · {shortDate(item.date)} ·{" "}
                    {item.kind.toUpperCase()}
                  </span>
                </span>
                <Link
                  href={`/plan/${item.date}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  Open day <PlainIcon name="arrowRight" size={12} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function WeekRow({
  date,
  day,
  isToday,
  onOpenDay,
}: {
  date: string;
  day: PlanDayView | null;
  isToday: boolean;
  onOpenDay: (date: string) => void;
}) {
  const assignment = day ? dayAssignmentStats(day) : null;
  const pct =
    assignment && assignment.total
      ? (assignment.completed / assignment.total) * 100
      : 0;
  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-3 sm:flex-nowrap">
      <div className="w-24 shrink-0">
        <p
          className={cn(
            "text-[0.625rem] font-semibold uppercase tracking-[0.1em]",
            isToday ? "text-accent" : "text-muted",
          )}
        >
          {isoWeekdayName(date)}
        </p>
        <p className="font-serif text-lg leading-tight tabular">
          {shortDate(date)}
        </p>
        {isToday && (
          <p className="text-[0.625rem] font-medium uppercase tracking-wide text-accent">
            Today
          </p>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {day ? (
          <>
            <p className="text-[0.6875rem] text-muted">
              Day {day.day} of 50 · Phase {day.phase}
            </p>
            <ul className="mt-1 space-y-0.5">
              {day.tasks.map((task) => (
                <li
                  key={task.key}
                  className="flex items-baseline gap-2 text-[0.8125rem]"
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
                    <span className="shrink-0 text-[0.625rem] uppercase tracking-wide text-accent">
                      Mock
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {assignment && (
              <div className="mt-1.5 flex items-center gap-2">
                <ProgressRule
                  done={assignment.completed}
                  total={assignment.total}
                  label={`Day ${day.day} assignments`}
                  className="max-w-40"
                />
                <span className="text-[0.625rem] tabular text-muted">
                  {assignment.completed}/{assignment.total}
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-[0.8125rem] text-muted">
            Outside the plan window — open the day for personal tasks and
            logged results.
          </p>
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={() => onOpenDay(date)}
      >
        Open day <PlainIcon name="arrowRight" size={12} />
      </Button>
      <span className="sr-only">
        {pct === 0 ? "Nothing complete" : `${Math.round(pct)} percent complete`}
      </span>
    </li>
  );
}
