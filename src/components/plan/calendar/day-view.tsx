"use client";
import { PlainIcon } from "../../icon";
import { Button } from "../../ui/button";
import { cn } from "@/lib/utils";
import { CompleteToggle, CategoryChip, ResultLine } from "../plan-shared";
import { longDate, shortDate } from "@/lib/format";
import {
  findDayByDate,
  isMockType,
  type PlanDayView,
  type PlanTaskView,
} from "@/lib/plan/view-model";
import { CalendarSurface } from "./calendar-surface";
import { PeriodNav } from "./period-nav";
import { taskIconName } from "./visuals";

/**
 * One day in full: every assignment, its category and marks, and the two
 * actions that exist (open the detail dialog, or log a saved result). The
 * schedule carries no clock times, so this is an ordered list, not an hour
 * grid.
 */
export function DayView({
  days,
  selected,
  planLength,
  planStart,
  planEnd,
  onStep,
  onToday,
  onSelect,
  onOpenTask,
  onAddMock,
}: {
  days: PlanDayView[];
  selected: string;
  planLength: number;
  planStart: string;
  planEnd: string;
  onStep: (direction: 1 | -1) => void;
  onToday: () => void;
  onSelect: (iso: string) => void;
  onOpenTask: (task: PlanTaskView, day: PlanDayView) => void;
  onAddMock: (date: string, task?: PlanTaskView) => void;
}) {
  const day = findDayByDate(days, selected);
  return (
    <CalendarSurface
      live
      title={day ? `${day.weekday}, ${longDate(day.date)}` : longDate(selected)}
      meta={
        day
          ? `Day ${day.day} of ${planLength} · ${day.tasks.length} task${day.tasks.length === 1 ? "" : "s"}`
          : `Outside the plan window · ${shortDate(planStart)} – ${shortDate(planEnd)}`
      }
      nav={
        <PeriodNav
          mode="day"
          selected={selected}
          planStart={planStart}
          planEnd={planEnd}
          onStep={onStep}
          onToday={onToday}
          onSelect={onSelect}
        />
      }
    >
      {day && day.tasks.length > 0 ? (
        <ul className="flex flex-col divide-y divide-rule-soft">
          {day.tasks.map((task) => (
            <DayTaskRow
              key={task.key}
              task={task}
              onOpen={() => onOpenTask(task, day)}
              onLogResult={
                isMockType(task.type) && !task.completed
                  ? () => onAddMock(day.date, task)
                  : undefined
              }
            />
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-muted">
          {day
            ? "Nothing is scheduled for this day."
            : `The plan does not schedule anything between ${shortDate(planStart)} and ${shortDate(planEnd)}.`}
        </p>
      )}

      {day && day.revisionTasks.length > 0 && (
        <div className="mt-4 border-t border-rule-soft pt-3">
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

function DayTaskRow({
  task,
  onOpen,
  onLogResult,
}: {
  task: PlanTaskView;
  onOpen: () => void;
  onLogResult?: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <CompleteToggle
        completed={task.completed}
        label={`Mark ${task.name} ${task.completed ? "incomplete" : "complete"}`}
        onToggle={onOpen}
      />
      <PlainIcon
        name={taskIconName(task.type)}
        size={16}
        className={cn("shrink-0", task.completed ? "text-muted" : "text-accent")}
      />
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <span
          className={cn(
            "block truncate text-[13px] font-medium",
            task.completed ? "text-muted line-through" : "text-ink",
          )}
        >
          {task.name}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1">
          <CategoryChip type={task.type} />
          <span className="text-[10px] tabular text-muted">
            {task.marks} marks · {task.questions} Q
          </span>
          <ResultLine task={task} />
        </span>
      </button>
      {onLogResult && (
        <button
          type="button"
          onClick={onLogResult}
          className="shrink-0 whitespace-nowrap text-[10px] font-medium text-accent hover:text-accent-hover"
        >
          Log result
        </button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={onOpen}
        className="shrink-0"
      >
        Open <PlainIcon name="chevronRight" size={12} />
      </Button>
    </li>
  );
}
