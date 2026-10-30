"use client";
import type { ComponentProps } from "react";
import { PlainIcon } from "../../icon";
import { Button } from "../../ui/button";
import {
  findDayByDate,
  isMockType,
  type PlanDayView,
  type PlanTaskView,
} from "@/lib/plan/view-model";
import { CalendarSurface } from "./calendar-surface";
import { PlanTaskRow } from "../plan-task-row";
import { longDate, shortDate } from "@/lib/format";

/**
 * One day in full: every assignment and the day's revision list. The schedule
 * carries no clock times, so this is an ordered list, not an hour grid. Rows
 * are the shared PlanTaskRow — the checkbox really completes the task here,
 * exactly as in the selected-day panel and the agenda, and the row body opens
 * the detail dialog. The list is full-bleed (`flush` surface) because the rows
 * carry their own gutters.
 */
export function DayView({
  days,
  selected,
  planLength,
  planStart,
  planEnd,
  onSelect,
  onOpenTask,
  onToggleTask,
  onAddMock,
  touchHandlers,
}: {
  days: PlanDayView[];
  selected: string;
  planLength: number;
  planStart: string;
  planEnd: string;
  onSelect: (iso: string) => void;
  onOpenTask: (task: PlanTaskView, day: PlanDayView) => void;
  /** Real completion toggle for the checkbox (optimistic via the caller). */
  onToggleTask?: (task: PlanTaskView, next: boolean) => void;
  onAddMock: (date: string, task?: PlanTaskView) => void;
  touchHandlers?: Pick<
    ComponentProps<"div">,
    "onTouchStart" | "onTouchEnd"
  >;
}) {
  const day = findDayByDate(days, selected);
  const hasTasks = !!day && day.tasks.length > 0;

  return (
    <CalendarSurface
      live
      flush
      title={day ? `${day.weekday}, ${longDate(day.date)}` : longDate(selected)}
      meta={
        day
          ? `Day ${day.day} of ${planLength} · ${day.tasks.length} task${day.tasks.length === 1 ? "" : "s"}`
          : `Outside the plan window · ${shortDate(planStart)} – ${shortDate(planEnd)}`
      }
      touchHandlers={touchHandlers}
    >
      {hasTasks && day ? (
        <ul className="divide-y divide-rule-soft border-t border-rule-soft">
          {day.tasks.map((task) => (
            <PlanTaskRow
              key={task.key}
              task={task}
              onOpen={() => onOpenTask(task, day)}
              onToggleCompleted={
                onToggleTask
                  ? (completed) => onToggleTask(task, completed)
                  : undefined
              }
              onLogAttempt={
                isMockType(task.type) && !task.completed
                  ? () => onAddMock(day.date, task)
                  : undefined
              }
            />
          ))}
        </ul>
      ) : (
        <EmptyDay
          day={day}
          selected={selected}
          planStart={planStart}
          planEnd={planEnd}
          onSelect={onSelect}
          onAddMock={onAddMock}
        />
      )}

      {day && day.revisionTasks.length > 0 && (
        <div className="mt-4 border-t border-rule-soft px-4 pt-3 sm:px-5">
          <p className="section-label mb-2">Revision</p>
          <ul className="flex flex-col gap-1 text-[11px] text-muted">
            {day.revisionTasks.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>
      )}
    </CalendarSurface>
  );
}

/** Empty is an invitation, not a dead end: a rest day offers the one action
    that exists, and a date outside the plan offers the way back in. */
function EmptyDay({
  day,
  selected,
  planStart,
  planEnd,
  onSelect,
  onAddMock,
}: {
  day: PlanDayView | undefined;
  selected: string;
  planStart: string;
  planEnd: string;
  onSelect: (iso: string) => void;
  onAddMock: (date: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 border-t border-rule-soft px-4 py-8 text-center">
      {day ? (
        <>
          <p className="text-sm text-muted">
            Nothing is scheduled for this day.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-dashed"
            onClick={() => onAddMock(day.date)}
          >
            <PlainIcon name="plus" size={13} /> Log a mock for this day
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            The plan runs {shortDate(planStart)} – {longDate(planEnd)}, so this
            date has no schedule.
          </p>
          {selected !== planStart && (
            <Button variant="outline" size="sm" onClick={() => onSelect(planStart)}>
              Go to Day 1 · {shortDate(planStart)}
            </Button>
          )}
        </>
      )}
    </div>
  );
}


