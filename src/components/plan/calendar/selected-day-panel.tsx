"use client";
import Link from "next/link";
import { PlainIcon } from "../../icon";
import { Button } from "../../ui/button";
import { cn } from "@/lib/utils";
import { AttemptRecordCard } from "../../attempt-outcome-card";
import {
  CategoryChip,
  CompleteToggle,
  ProgressRule,
  ResultLine,
} from "../plan-shared";
import { Panel } from "../../dashboard-panels";
import { longDate, shortDate } from "@/lib/format";
import type { Attempt } from "@/lib/domain";
import {
  dayAssignmentStats,
  dayTypeLabel,
  isMockType,
  type PlanDayView,
  type PlanTaskView,
} from "@/lib/plan/view-model";
import { taskIconName } from "./visuals";

/**
 * The selected day: the sticky rail beside the grid at `xl`, and the detail
 * block directly under the grid below it. Study-only — personal tasks live in
 * My Tasks and on the dashboard, never here.
 */
export function SelectedDayPanel({
  day,
  selected,
  planLength,
  planStart,
  planEnd,
  attempts,
  onOpenTask,
  onAddMock,
  onOpenAttempt,
  onMarkAllDone,
}: {
  day: PlanDayView | undefined;
  selected: string;
  planLength: number;
  planStart: string;
  planEnd: string;
  attempts: Attempt[];
  onOpenTask: (task: PlanTaskView, day: PlanDayView) => void;
  onAddMock: (date: string, task?: PlanTaskView) => void;
  onOpenAttempt: (attempt: Attempt) => void;
  onMarkAllDone?: () => void;
}) {
  if (!day) {
    return (
      <Panel
        dense
        title={shortDate(selected)}
        description={`No assignments. The plan runs ${shortDate(planStart)} – ${longDate(planEnd)}.`}
      >
        <div className="px-4 pb-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed"
            onClick={() => onAddMock(selected)}
          >
            <PlainIcon name="plus" size={13} /> Log a mock for this day
          </Button>
        </div>
      </Panel>
    );
  }

  const stats = dayAssignmentStats(day);
  return (
    <Panel
      dense
      title={shortDate(day.date)}
      description={`Day ${day.day} of ${planLength} · ${dayTypeLabel(day.dayType)} · ${day.tasks.length} task${day.tasks.length === 1 ? "" : "s"}`}
    >
      <div className="px-4 pb-3 pt-0">
        <div className="flex items-center gap-2">
          {/* `mt-0` cancels the rule's own 8px lead-in so it aligns with the
              count and the action in this compact row. */}
          <ProgressRule
            done={stats.completed}
            total={stats.total}
            label={`Day ${day.day}`}
            className="mt-0 flex-1"
          />
          <span className="shrink-0 text-[10px] tabular text-muted">
            {stats.completed}/{stats.total}
          </span>
          {onMarkAllDone && stats.completed < stats.total && (
            <button
              type="button"
              onClick={onMarkAllDone}
              className="shrink-0 text-[10px] font-medium text-accent hover:text-accent-hover"
            >
              Mark all done
            </button>
          )}
        </div>
      </div>

      <ul className="divide-y divide-rule-soft border-t border-rule-soft">
        {day.tasks.length ? (
          day.tasks.map((task) => (
            <PlanTaskRow
              key={task.key}
              task={task}
              onOpen={() => onOpenTask(task, day)}
              onLogResult={
                isMockType(task.type) && !task.completed
                  ? () => onAddMock(day.date, task)
                  : undefined
              }
            />
          ))
        ) : (
          <li className="px-4 py-3 text-xs text-muted">
            No assignments scheduled.
          </li>
        )}
      </ul>

      <div className="px-4 pb-3 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => onAddMock(day.date)}
        >
          <PlainIcon name="plus" size={13} /> Log a mock for this day
        </Button>
      </div>

      {attempts.length > 0 && (
        <div className="border-t border-rule-soft px-4 py-3">
          <p className="section-label mb-2">Logged attempts</p>
          <ul className="flex flex-col gap-2">
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                <AttemptRecordCard attempt={attempt} onOpen={onOpenAttempt} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-rule-soft px-4 py-2.5 text-xs">
        <Link
          href={`/plan/${day.date}`}
          className="font-medium text-accent transition-colors hover:text-accent-hover"
        >
          Open the full daily workspace →
        </Link>
      </div>
    </Panel>
  );
}

/** Task row: toggle, glyph, name, category, and the actions that exist. */
export function PlanTaskRow({
  task,
  onOpen,
  onLogResult,
}: {
  task: PlanTaskView;
  onOpen: () => void;
  onLogResult?: () => void;
}) {
  return (
    <li className="flex items-start gap-2.5 px-4 py-2.5">
      <CompleteToggle
        completed={task.completed}
        label={`Mark ${task.name} ${task.completed ? "incomplete" : "complete"}`}
        onToggle={onOpen}
      />
      <PlainIcon
        name={taskIconName(task.type)}
        size={15}
        className={cn(
          "mt-0.5 shrink-0",
          task.completed ? "text-muted" : "text-accent",
        )}
      />
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <span
          className={cn(
            "block text-[13px] font-medium leading-snug",
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
          className="mt-0.5 shrink-0 whitespace-nowrap text-[10px] font-medium text-accent hover:text-accent-hover"
        >
          Log result
        </button>
      )}
    </li>
  );
}
