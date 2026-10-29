"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
 * titled by its date range, with week-stepping arrows and a row of left-
 * aligned day cells (weekday · big date · dot cluster · count). Every cell
 * derives from the same merged plan payload as the rest of the dashboard;
 * dates outside the 50-day window render muted. This is a rolling window
 * around a focus day, not a calendar week, so the description says so.
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
  const [offset, setOffset] = useState(0);
  // The window steps in whole weeks; offset counts weeks from "around today".
  const anchor = addIsoDays(today, offset * 7);
  const dates = Array.from({ length: SIDE_DAYS * 2 + 1 }, (_, index) =>
    addIsoDays(anchor, index - SIDE_DAYS),
  );
  const first = dates[0];
  const last = dates[dates.length - 1];
  const rangeLabel = `${shortDate(first)} – ${shortDate(last)}`;
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  const todayInRange = offset === 0;
  return (
    <Panel
      icon="calendar"
      eyebrow="This week"
      title={sameMonth ? rangeLabel : `${longDate(first)} – ${longDate(last)}`}
      description="Three days around the marked date. Pick a day to open its plan."
      action={
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-4">
          <div className="order-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted sm:order-1">
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
          <div className="order-3 flex items-center gap-2">
            <div className="day-nav">
              <button
                type="button"
                className="day-nav-step"
                aria-label="Previous week"
                onClick={() => setOffset((value) => value - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="day-nav-step"
                aria-label="Next week"
                onClick={() => setOffset((value) => value + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {!todayInRange && (
              <button
                type="button"
                className="day-nav-today"
                onClick={() => setOffset(0)}
              >
                This week
              </button>
            )}
          </div>
          <Link
            href="/calendar"
            className="group order-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control border border-rule-soft px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:border-accent/40 hover:bg-accent-soft sm:order-2"
          >
            <PlainIcon name="calendar" size={13} />
            Full calendar
            <PlainIcon
              name="arrowRight"
              size={12}
              className="transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:transform-none"
            />
          </Link>
        </div>
      }
    >
      <div className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div
          className="grid grid-cols-7 gap-2 sm:gap-3"
          aria-label="Days around the current week"
        >
          {dates.map((date) => {
            const day = byDate.get(date);
            return day ? (
              <WeekCell
                key={date}
                day={day}
                today={today}
                isToday={todayInRange && date === today}
                onOpenDay={onOpenDay}
              />
            ) : (
              <EmptyCell key={date} date={date} />
            );
          })}
        </div>
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
        "flex min-w-0 flex-col items-start gap-2 rounded-panel border px-3 py-3.5 text-left transition-colors duration-150 active:translate-y-px motion-reduce:active:translate-y-0",
        isToday
          ? "border-accent bg-accent-soft"
          : past
            ? "border-rule-soft/60 bg-canvas hover:border-accent/60"
            : "border-rule-soft bg-paper hover:border-accent/60 hover:bg-soft",
      )}
    >
      <span className="flex w-full items-center justify-between gap-1">
        <span
          className={cn(
            "text-[10px] uppercase tracking-[0.12em]",
            isToday ? "text-accent" : "text-muted",
          )}
        >
          {isoWeekdayShort(day.date)}
        </span>
        {isToday && (
          <span className="rounded-pill bg-ink px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-paper">
            Today
          </span>
        )}
      </span>
      <span className="font-serif text-[24px] leading-none tabular text-ink">
        {Number(day.date.slice(-2))}
      </span>
      <span className="flex w-full items-center justify-between gap-1.5">
        <span className="flex h-2.5 items-center gap-1" aria-hidden="true">
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
        <span className="text-[11px] tabular text-muted">
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
      className="flex min-w-0 flex-col items-start gap-2 rounded-panel border border-rule-soft/60 bg-canvas px-3 py-3.5 text-muted"
    >
      <span className="text-[10px] uppercase tracking-[0.12em]">
        {isoWeekdayShort(date)}
      </span>
      <span className="font-serif text-[24px] leading-none tabular">
        {Number(date.slice(-2))}
      </span>
      <span className="flex h-2.5 w-full items-center justify-between">
        <span className="flex items-center gap-1">
          <DoneDot className="border-rule/50 bg-canvas" />
        </span>
        <span className="text-[11px] tabular">—</span>
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
    <div className="panel px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
      <div
        className="grid grid-cols-7 gap-2 sm:gap-3"
        aria-busy="true"
        aria-label="Loading the days around today"
      >
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px] w-full sm:h-[112px]" />
        ))}
      </div>
    </div>
  );
}
