"use client";
import { AttemptRecordCard } from "../../attempt-outcome-card";
import { ProgressRule } from "../plan-shared";
import { istDateKey, longDate, shortDate } from "@/lib/format";
import type { Attempt } from "@/lib/domain";
import {
  dayAssignmentStats,
  dayTypeLabel,
  isoWeekdayShort,
  isMockType,
  type PlanDayView,
  type PlanTaskView,
} from "@/lib/plan/view-model";
import { CalendarSurface } from "./calendar-surface";
import { PeriodNav } from "./period-nav";
import { PlanTaskRow } from "./selected-day-panel";

/**
 * Every remaining plan day, as one continuous schedule of hairline-separated
 * groups rather than fifty stacked panels. Days already behind the student
 * collapse into one disclosure — they are reference, not work.
 */
export function AgendaView({
  days,
  today,
  planLength,
  planStart,
  planEnd,
  attempts,
  onStep,
  onToday,
  onSelect,
  onOpenTask,
  onLogResult,
  onOpenAttempt,
}: {
  days: PlanDayView[];
  today: string;
  planLength: number;
  planStart: string;
  planEnd: string;
  attempts: Attempt[];
  onStep: (direction: 1 | -1) => void;
  onToday: () => void;
  onSelect: (iso: string) => void;
  onOpenTask: (task: PlanTaskView, day: PlanDayView) => void;
  onLogResult: (task: PlanTaskView) => void;
  onOpenAttempt: (attempt: Attempt) => void;
}) {
  const upcoming = days.filter((day) => day.date >= today);
  const past = days.filter((day) => day.date < today).reverse();
  const attemptsOn = (iso: string) =>
    attempts.filter((attempt) => istDateKey(attempt.completedAt) === iso);

  return (
    <CalendarSurface
      live
      title="Agenda"
      meta={`${upcoming.length} of ${planLength} plan days remaining`}
      nav={
        <PeriodNav
          mode="agenda"
          selected={today < planStart ? planStart : today > planEnd ? planEnd : today}
          planStart={planStart}
          planEnd={planEnd}
          onStep={onStep}
          onToday={onToday}
          onSelect={onSelect}
        />
      }
    >
      {upcoming.length ? (
        <ul aria-label="Agenda from today">
          {upcoming.map((day) => {
            const stats = dayAssignmentStats(day);
            const dayAttempts = attemptsOn(day.date);
            return (
              <li
                key={day.day}
                className="border-t border-rule-soft py-3 first:border-t-0 first:pt-1"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="section-label">
                    Day {day.day} · {isoWeekdayShort(day.date)}{" "}
                    {shortDate(day.date)}
                  </p>
                  <p className="text-[11px] tabular text-muted">
                    {stats.completed}/{stats.total}
                  </p>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {dayTypeLabel(day.dayType)}
                </p>
                <ProgressRule
                  done={stats.completed}
                  total={stats.total}
                  label={`Day ${day.day}`}
                  className="mt-2"
                />
                {day.tasks.length ? (
                  <ul className="mt-1">
                    {day.tasks.map((task) => (
                      <PlanTaskRow
                        key={task.key}
                        task={task}
                        onOpen={() => onOpenTask(task, day)}
                        onLogResult={
                          isMockType(task.type) && !task.completed
                            ? () => onLogResult(task)
                            : undefined
                        }
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="py-2 text-[11px] text-muted">
                    No assignments scheduled.
                  </p>
                )}
                {dayAttempts.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-2">
                    {dayAttempts.map((attempt) => (
                      <li key={attempt.id}>
                        <AttemptRecordCard
                          attempt={attempt}
                          onOpen={onOpenAttempt}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-muted">
          No plan days left from today. The window closed on{" "}
          {longDate(planEnd)}.
        </p>
      )}

      {past.length > 0 && (
        <details className="mt-4 border-t border-rule-soft pt-3">
          <summary className="cursor-pointer text-[11px] font-medium text-muted hover:text-ink">
            Earlier plan days ({past.length})
          </summary>
          <ul className="mt-2">
            {past.map((day) => {
              const stats = dayAssignmentStats(day);
              return (
                <li
                  key={day.day}
                  className="flex justify-between gap-3 border-b border-rule-soft py-1.5 text-[11px] last:border-0"
                >
                  <span className="text-muted">
                    Day {day.day} · {shortDate(day.date)}
                  </span>
                  <span className="tabular text-muted">
                    {stats.completed}/{day.tasks.length} done
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </CalendarSurface>
  );
}
