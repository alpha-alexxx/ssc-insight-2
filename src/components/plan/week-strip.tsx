"use client";
import Link from "next/link";
import { Panel } from "../dashboard-panels";
import { PlainIcon } from "../icon";
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
 * The dashboard's compact week card: header with legend + full-calendar
 * action, then a "3 before + today + 3 after" row of day cells. Every cell
 * derives from the same merged plan payload as the rest of the dashboard;
 * dates outside the 50-day window render muted.
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
  return (
    <Panel
      icon="calendar"
      title="This week"
      description="Three days around today. Pick a day to open its plan."
      action={
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
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
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 rounded-pill border border-rule-soft px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:border-accent/40 hover:bg-accent-soft"
          >
            <PlainIcon name="calendar" size={13} />
            Full calendar
            <PlainIcon name="arrowRight" size={12} />
          </Link>
        </div>
      }
    >
      <div className="dashboard-week-scroll px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="dashboard-week-grid" aria-label="Week around today">
          {dates.map((date) => {
            const day = byDate.get(date);
            return day ? (
              <WeekCell
                key={date}
                day={day}
                today={today}
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
      className={`dashboard-week-cell flex min-w-0 flex-col items-center gap-1.5 rounded-card border px-2 py-3 transition-colors sm:px-3 ${
        isToday
          ? "border-accent bg-accent-soft"
          : "border-rule-soft bg-paper hover:border-accent/60 hover:bg-soft"
      }`}
    >
      <span
        className={`text-[11px] uppercase tracking-[0.12em] ${isToday ? "text-accent" : "text-muted"}`}
      >
        {shortWeekday(day.date)}
      </span>
      <span className="font-serif text-[28px] leading-none tabular text-ink">
        {Number(day.date.slice(-2))}
      </span>
      <span
        className={`text-sm tabular ${isToday ? "text-ink" : "text-muted"}`}
      >
        {stats.total ? `${stats.completed}/${stats.total}` : "—"}
      </span>
      <span className="flex h-2.5 items-center gap-2" aria-hidden="true">
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
    </button>
  );
}

function EmptyCell({ date }: { date: string }) {
  return (
    <div
      aria-hidden="true"
      className="dashboard-week-cell flex min-w-0 flex-col items-center gap-1.5 rounded-card border border-rule-soft/60 bg-canvas px-2 py-3 text-muted sm:px-3"
    >
      <span className="text-[11px] uppercase tracking-[0.12em]">
        {shortWeekday(date)}
      </span>
      <span className="font-serif text-[28px] leading-none tabular">
        {Number(date.slice(-2))}
      </span>
      <span className="text-sm tabular">—</span>
      <span className="h-2.5" />
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
    <div
      className="dashboard-week-scroll"
      aria-busy="true"
      aria-label="Loading the week"
    >
      <div className="dashboard-week-grid">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-[112px] w-full" />
        ))}
      </div>
    </div>
  );
}
