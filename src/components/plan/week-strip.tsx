"use client";
import { Skeleton } from "../ui/skeleton";
import {
  addIsoDays,
  dayAssignmentStats,
  isMockType,
  type PlanDayView,
} from "@/lib/plan/view-model";
import type { PlanWithToday } from "./dashboard-plan-sections";

const SIDE_DAYS = 3;

function shortWeekday(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

/**
 * Compact "3 before + today + 3 after" strip that replaces the full calendar
 * on the dashboard. Every cell derives from the same merged plan payload as
 * the rest of the dashboard; dates outside the 50-day window render muted.
 */
export function WeekStrip({
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
  return (
    <div>
      <div
        className="grid grid-cols-7 gap-1 sm:gap-1.5"
        aria-label="Week around today"
      >
        {dates.map((date) => {
          const day = byDate.get(date);
          return day ? (
            <WeekCell key={date} day={day} today={today} onOpenDay={onOpenDay} />
          ) : (
            <div
              key={date}
              aria-hidden="true"
              className="flex min-w-0 flex-col items-center gap-1 rounded-control border border-rule-soft/60 bg-canvas px-1 py-2 text-muted"
            >
              <span className="text-[9px] uppercase tracking-[0.08em]">
                {shortWeekday(date)}
              </span>
              <span className="font-serif text-sm leading-none tabular">
                {Number(date.slice(-2))}
              </span>
              <span className="text-[10px] tabular">—</span>
              <span className="h-1.5" />
            </div>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-muted">
        <span className="inline-flex items-center gap-1">
          <DoneDot className="border-positive bg-positive" /> done
        </span>
        <span className="inline-flex items-center gap-1">
          <DoneDot className="border-accent bg-accent" /> in progress
        </span>
        <span className="inline-flex items-center gap-1">
          <DoneDot className="border-rule bg-paper" /> pending
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-[2px] bg-accent" /> mock day
        </span>
      </p>
    </div>
  );
}

function WeekCell({
  day,
  today,
  onOpenDay,
}: {
  day: PlanDayView;
  today: string;
  onOpenDay: (date: string) => void;
}) {
  const stats = dayAssignmentStats(day);
  const hasMock = day.tasks.some((task) => isMockType(task.type));
  const isToday = day.date === today;
  return (
    <button
      type="button"
      onClick={() => onOpenDay(day.date)}
      aria-current={isToday ? "date" : undefined}
      aria-label={`${day.weekday} ${day.date}: ${stats.completed} of ${stats.total} assignments done${hasMock ? ", includes a mock test" : ""}`}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-control border px-1 py-2 transition-colors ${
        isToday
          ? "border-accent bg-accent-soft"
          : "border-rule-soft bg-paper hover:border-accent/60 hover:bg-soft"
      }`}
    >
      <span
        className={`text-[9px] uppercase tracking-[0.08em] ${isToday ? "text-accent" : "text-muted"}`}
      >
        {shortWeekday(day.date)}
      </span>
      <span className="font-serif text-sm leading-none tabular">
        {Number(day.date.slice(-2))}
      </span>
      <span
        className={`text-[10px] tabular ${isToday ? "text-ink" : "text-muted"}`}
      >
        {stats.total ? `${stats.completed}/${stats.total}` : "—"}
      </span>
      <span className="flex h-1.5 items-center gap-1" aria-hidden="true">
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
        {hasMock && <span className="size-1.5 rounded-[2px] bg-accent" />}
      </span>
    </button>
  );
}

function DoneDot({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`size-1.5 shrink-0 rounded-full border ${className}`}
    />
  );
}

export function WeekStripSkeleton() {
  return (
    <div
      className="grid grid-cols-7 gap-1 sm:gap-1.5"
      aria-busy="true"
      aria-label="Loading the week"
    >
      {Array.from({ length: 7 }).map((_, index) => (
        <Skeleton key={index} className="h-[74px] w-full" />
      ))}
    </div>
  );
}
