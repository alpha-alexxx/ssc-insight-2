"use client";
import Link from "next/link";
import { Panel } from "../dashboard-panels";
import { PlainIcon } from "../icon";
import { Skeleton } from "../ui/skeleton";
import {
  addIsoDays,
  dayAssignmentStats,
  isoWeekdayShort,
  isMockType,
  type PlanDayView,
} from "@/lib/plan/view-model";
import { longDate, shortDate } from "@/lib/format";
import type { PlanWithToday } from "./dashboard-plan-sections";
import { cn } from "@/lib/utils";

const SIDE_DAYS = 3;

/**
 * The dashboard's week card: a rolling "3 before + today + 3 after" window
 * titled by its date range, with a row of left-aligned day cells (weekday ·
 * big date · dot cluster · count). Every cell derives from the same merged
 * plan payload as the rest of the dashboard; dates outside the 50-day window
 * render muted. This is a rolling window around today, not a calendar week,
 * so the description says so. Week-stepping was removed: with only a 50-day
 * plan the arrows could only ever show out-of-window days; /calendar covers
 * browsing beyond this week.
 */
export function WeekStripPanel({
  plan,
  today,
  onOpenDay,
}: {
  plan: PlanWithToday;
  today: string;
  onOpenDay: (date: string) => void;
}) {
  const byDate = new Map(plan.days.map((day) => [day.date, day]));
  const dates = Array.from({ length: SIDE_DAYS * 2 + 1 }, (_, index) =>
    addIsoDays(today, index - SIDE_DAYS),
  );
  const first = dates[0];
  const last = dates[dates.length - 1];
  const rangeLabel = `${shortDate(first)} – ${shortDate(last)}`;
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  return (
    <Panel
      icon="calendar"
      eyebrow="This week"
      title={sameMonth ? rangeLabel : `${longDate(first)} – ${longDate(last)}`}
      description="Three days around today. Pick a day to open its plan."
      /* The description repeats the eyebrow at phone widths, where the
         header needs every pixel for the date range and calendar link. */
      descriptionClassName="max-sm:hidden"
      action={
        <Link
          href="/calendar"
          aria-label="Open the full calendar"
          className="group inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control border border-rule-soft px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:border-accent/40 hover:bg-accent-soft sm:px-3"
        >
          <PlainIcon name="calendar" size={13} />
          <span className="hidden sm:inline">Full calendar</span>
          <PlainIcon
            name="arrowRight"
            size={12}
            className="transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:transform-none sm:hidden"
            aria-hidden="true"
          />
        </Link>
      }
    >
      <div className="px-3 pb-3 sm:px-6 sm:pb-6">
        <div
          className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3"
          aria-label="Days around the current week"
        >
          {dates.map((date) => {
            const day = byDate.get(date);
            return day ? (
              <WeekCell
                key={date}
                day={day}
                today={today}
                isToday={date === today}
                onOpenDay={onOpenDay}
              />
            ) : (
              <EmptyCell key={date} date={date} />
            );
          })}
        </div>
      </div>
      {/* The legend reads as a caption row under the strip on every width:
          it never competes with the title again. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-rule-soft px-3 py-2.5 text-[10px] text-muted sm:px-6 sm:py-3">
        <span className="inline-flex items-center gap-1.5">
          <DoneDot className="border-positive bg-positive" /> done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <DoneDot className="border-accent bg-accent" /> in progress
        </span>
        <span className="inline-flex items-center gap-1.5">
          <DoneDot className="border-rule bg-paper" /> pending
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-accent" /> mock day
        </span>
      </div>
    </Panel>
  );
}

function WeekCell({
  day,
  today,
  isToday,
  onOpenDay,
}: {
  day: PlanDayView;
  today: string;
  isToday: boolean;
  onOpenDay: (date: string) => void;
}) {
  const stats = dayAssignmentStats(day);
  const hasMock = day.tasks.some((task) => isMockType(task.type));
  const past = day.date < today && !isToday;
  return (
    <button
      type="button"
      onClick={() => onOpenDay(day.date)}
      aria-current={isToday ? "date" : undefined}
      aria-label={`${day.weekday} ${day.date}: ${stats.completed} of ${stats.total} assignments done${hasMock ? ", includes a mock test" : ""}`}
      className={cn(
        /* Phones: a borderless centered type rail — no card chrome, so seven
           columns breathe at 390px; today is carried by the accent wash.
           sm+: the original left-aligned bordered day card. */
        "flex min-w-0 flex-col items-center gap-1 rounded-panel px-0.5 py-2 text-center transition-colors duration-150 active:translate-y-px motion-reduce:active:translate-y-0 sm:items-start sm:gap-2 sm:px-3 sm:py-3.5 sm:text-left",
        isToday
          ? "bg-accent-soft sm:border sm:border-accent"
          : past
            ? "sm:border sm:border-rule-soft/60 sm:bg-canvas sm:hover:border-accent/60"
            : "sm:border sm:border-rule-soft sm:bg-paper sm:hover:border-accent/60 sm:hover:bg-soft",
      )}
    >
      <span
        className={cn(
          "text-[9px] uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.12em]",
          isToday ? "font-semibold text-accent" : "text-muted",
        )}
      >
        {isoWeekdayShort(day.date)}
      </span>
      <span
        className={cn(
          "font-serif text-[17px] leading-none tabular text-ink sm:text-[24px]",
          isToday && "underline decoration-accent decoration-2 underline-offset-4",
        )}
      >
        {Number(day.date.slice(-2))}
      </span>
      <span
        className="flex h-2.5 items-center justify-center gap-1 sm:w-full sm:justify-between"
        aria-hidden="true"
      >
        <span className="flex items-center gap-1">
          {stats.total > 0 && (
            <DoneDot
              className={
                stats.allTasksDone
                  ? "border-positive bg-positive"
                  : stats.completed > 0
                    ? "border-accent bg-accent"
                    : "border-rule bg-paper"
              }
            />
          )}
          {hasMock && <span className="size-2.5 rounded-full bg-accent" />}
        </span>
        <span className="hidden text-[11px] tabular text-muted sm:block">
          {stats.total ? `${stats.completed}/${stats.total}` : "—"}
        </span>
      </span>
    </button>
  );
}

function EmptyCell({ date }: { date: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex min-w-0 flex-col items-center gap-1 rounded-panel px-0.5 py-2 text-center text-muted sm:items-start sm:gap-2 sm:px-3 sm:py-3.5 sm:text-left sm:border sm:border-rule-soft/60 sm:bg-canvas"
    >
      <span className="text-[9px] uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.12em]">
        {isoWeekdayShort(date)}
      </span>
      <span className="font-serif text-[17px] leading-none tabular sm:text-[24px]">
        {Number(date.slice(-2))}
      </span>
      <span className="flex h-2.5 items-center justify-center gap-1 sm:w-full sm:justify-between">
        <span className="flex items-center gap-1">
          <DoneDot className="border-rule/50 bg-canvas" />
        </span>
        <span className="hidden text-[11px] tabular sm:block">—</span>
      </span>
    </div>
  );
}

function DoneDot({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`size-2.5 shrink-0 rounded-full border ${className}`}
    />
  );
}

export function WeekStripSkeleton() {
  return (
    <div className="panel px-3 pb-5 pt-4 sm:px-6 sm:pb-6">
      <div
        className="grid grid-cols-7 gap-1 sm:gap-3"
        aria-busy="true"
        aria-label="Loading the days around today"
      >
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-[72px] w-full sm:h-[112px]" />
        ))}
      </div>
    </div>
  );
}
