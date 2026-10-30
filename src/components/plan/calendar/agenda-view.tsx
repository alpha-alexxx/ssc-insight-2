"use client";
import { useState, type ComponentProps } from "react";
import { AttemptRecordCard } from "../../attempt-outcome-card";
import { Button } from "../../ui/button";
import { ProgressRule } from "../plan-shared";
import { istDateKey, longDate, shortDate } from "@/lib/format";
import type { Attempt } from "@/lib/domain";
import {
  addIsoDays,
  dayAssignmentStats,
  dayTypeLabel,
  isoWeekdayShort,
  isMockType,
  type PlanDayView,
  type PlanTaskView,
} from "@/lib/plan/view-model";
import { CalendarSurface } from "./calendar-surface";
import { AGENDA_WINDOW } from "./visuals";
import { PlanTaskRow } from "../plan-task-row";

/**
 * The agenda as a bounded window: `AGENDA_WINDOW` days from the selected date
 * (the toolbar's arrows step the window), so the surface stays scannable and
 * stepping backwards shows earlier work instead of hitting an invisible
 * "today" floor. "Show remaining plan days" lifts the cap in place; days
 * before the window collapse into one disclosure — they are reference, not
 * work.
 */
export function AgendaView({
  days,
  selected,
  today,
  planLength,
  planStart,
  planEnd,
  attempts,
  onOpenTask,
  onToggleTask,
  onLogResult,
  onOpenAttempt,
  touchHandlers,
}: {
  days: PlanDayView[];
  selected: string;
  today: string;
  planLength: number;
  planStart: string;
  planEnd: string;
  attempts: Attempt[];
  onOpenTask: (task: PlanTaskView, day: PlanDayView) => void;
  /** Real completion toggle for the checkbox (optimistic via the caller). */
  onToggleTask?: (task: PlanTaskView, next: boolean) => void;
  onLogResult: (task: PlanTaskView) => void;
  onOpenAttempt: (attempt: Attempt) => void;
  touchHandlers?: Pick<
    ComponentProps<"div">,
    "onTouchStart" | "onTouchEnd"
  >;
}) {
  /* Expansion belongs to the window being viewed; a period step (a new
     `selected`) opens a fresh window. Derived from the window identity, so no
     state-sync effect is needed. */
  const [windowState, setWindowState] = useState({
    start: selected,
    expanded: false,
  });
  const expanded =
    windowState.start === selected ? windowState.expanded : false;

  const hardEnd = expanded
    ? addIsoDays(selected, 3700)
    : addIsoDays(selected, AGENDA_WINDOW - 1);
  const shown = days.filter(
    (day) => day.date >= selected && day.date <= hardEnd,
  );
  const hiddenCount = days.length - (shown.length + daysBefore(days, selected));
  const windowEnd = shown.length ? shown[shown.length - 1]!.date : selected;
  const first = shown[0];
  const last = shown[shown.length - 1];
  const attemptsOn = (iso: string) =>
    attempts.filter((attempt) => istDateKey(attempt.completedAt) === iso);

  return (
    <CalendarSurface
      live
      title={
        shown.length
          ? `${shortDate(selected)} – ${shortDate(windowEnd)}`
          : longDate(selected)
      }
      meta={
        first && last
          ? `Day ${first.day}–${last.day} of ${planLength} · ${shown.length} plan day${shown.length === 1 ? "" : "s"}`
          : `The plan runs ${shortDate(planStart)} – ${shortDate(planEnd)}`
      }
      touchHandlers={touchHandlers}
    >
      {shown.length ? (
        <ul aria-label={`Agenda from ${shortDate(selected)}`}>
          {shown.map((day) => {
            const stats = dayAssignmentStats(day);
            const dayAttempts = attemptsOn(day.date);
            return (
              <li
                key={day.day}
                className="border-t border-rule-soft py-3 first:border-t-0 first:pt-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="section-label flex flex-wrap items-center gap-1.5">
                    <span>
                      Day {day.day} · {isoWeekdayShort(day.date)}{" "}
                      {shortDate(day.date)}
                    </span>
                    {day.date === today && (
                      <span className="rounded-pill bg-ink px-1.5 py-px text-[0.5625rem] font-medium uppercase tracking-wide text-paper">
                        Today
                      </span>
                    )}
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
                        density="compact"
                        onOpen={() => onOpenTask(task, day)}
                        onToggleCompleted={
                          onToggleTask
                            ? (completed) => onToggleTask(task, completed)
                            : undefined
                        }
                        onLogAttempt={
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
          Nothing scheduled from {shortDate(selected)}. The plan window closes
          on {longDate(planEnd)}.
        </p>
      )}

      {hiddenCount > 0 && (
        <div className="mt-4 border-t border-rule-soft pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed"
            onClick={() => setWindowState({ start: selected, expanded: true })}
          >
            Show remaining plan days ({hiddenCount})
          </Button>
        </div>
      )}

      {daysBefore(days, selected) > 0 && (
        <details className="mt-4 border-t border-rule-soft pt-3">
          <summary className="cursor-pointer text-[11px] font-medium text-muted hover:text-ink">
            Earlier plan days ({daysBefore(days, selected)})
          </summary>
          <ul className="mt-2">
            {days
              .filter((day) => day.date < selected)
              .reverse()
              .map((day) => {
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

function daysBefore(days: PlanDayView[], selected: string): number {
  return days.filter((day) => day.date < selected).length;
}
