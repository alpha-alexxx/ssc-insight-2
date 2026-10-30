"use client";
import { PlainIcon } from "../icon";
import { cn } from "@/lib/utils";
import { CategoryChip, CompleteToggle, ResultLine } from "./plan-shared";
import { isMockType, type PlanTaskView } from "@/lib/plan/view-model";
import type { ReactNode } from "react";

/**
 * The one plan-task row, shared by the daily workspace (/plan/[date]) and the
 * calendar surfaces (selected-day panel, agenda). The checkbox is always a
 * real completion toggle when `onToggleCompleted` is given; the row body
 * opens `onOpen` when provided (the calendar's event dialog). The plan day
 * renders its record-result step through `children`.
 */

/** Subject-aware tile vocabulary (moved from plan-day-view): one glyph and
 * tint per task type across every surface. */
export function taskIcon(type: PlanTaskView["type"]) {
  if (isMockType(type)) return "file" as const;
  switch (type) {
    case "maths_sectional":
    case "maths_topic":
      return "quant" as const;
    case "reasoning_sectional":
      return "reasoning" as const;
    case "english_sectional":
      return "english" as const;
    case "gk_sectional":
      return "ga" as const;
    case "computer_mock":
    case "computer_pyq":
      return "computer" as const;
    default:
      return "fileCheck" as const;
  }
}

export function taskTile(type: PlanTaskView["type"]): string {
  if (isMockType(type)) return "bg-accent-soft text-accent";
  if (type.endsWith("_sectional")) return "bg-positive-soft text-positive";
  if (type === "maths_topic") return "bg-warning-soft text-warning";
  return "bg-soft text-muted";
}

export function PlanTaskRow({
  task,
  density = "row",
  onToggleCompleted,
  onOpen,
  onLogAttempt,
  children,
}: {
  task: PlanTaskView;
  /** "row": type tile + roomy padding (plan day, selected-day panel).
   * "compact": agenda density — small glyph, no tile. */
  density?: "row" | "compact";
  /** Real completion toggle. Omitted only for read-only surfaces. */
  onToggleCompleted?: (next: boolean) => void;
  /** Row-body click (calendar opens its event dialog). */
  onOpen?: () => void;
  /** Mock-type tasks: prefill the tracker form ("Log attempt"). */
  onLogAttempt?: () => void;
  /** Record-result step rendered below the row (plan day). */
  children?: ReactNode;
}) {
  const compact = density === "compact";
  const startLink = !task.completed && task.url ? task.url : null;
  const showActions = Boolean((onLogAttempt && !task.completed) || startLink);
  /** One chip row, rendered under the meta on phones and at the right edge
   * on sm+ — long task names keep the full row width on mobile. */
  const actions = showActions ? (
    <>
      {onLogAttempt && !task.completed && (
        <button
          type="button"
          onClick={onLogAttempt}
          className="inline-flex items-center gap-1 rounded-pill border border-accent/30 px-2 py-0.5 text-[10px] font-medium text-accent transition-colors hover:border-accent/60"
        >
          Log attempt
        </button>
      )}
      {startLink && (
        <a
          href={startLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${task.name} in a new tab`}
          title={`Open ${task.name}`}
          className="inline-flex items-center gap-1 rounded-pill border border-rule-soft px-2 py-0.5 text-[10px] font-medium text-accent transition-colors hover:border-accent/60"
        >
          Start <PlainIcon name="arrowUpRight" size={11} />
        </a>
      )}
    </>
  ) : null;
  const body = (
    <>
      {compact ? (
        <PlainIcon
          name={taskIcon(task.type)}
          size={15}
          className={cn(
            "mt-0.5 shrink-0",
            task.completed ? "text-muted" : "text-accent",
          )}
        />
      ) : (
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-control border border-transparent",
            taskTile(task.type),
          )}
          aria-hidden="true"
        >
          <PlainIcon name={taskIcon(task.type)} size={17} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block break-words font-medium leading-snug",
            compact ? "text-[13px]" : "text-[14px]",
            task.completed ? "text-muted line-through" : "text-ink",
          )}
        >
          {task.name}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted">
          <CategoryChip type={task.type} />
          <span className="tabular">
            {task.questions} Q · {task.marks} marks
          </span>
          <ResultLine task={task} />
        </span>
      </span>
    </>
  );

  return (
    <li className={cn(compact ? "px-4 py-2.5" : "px-4 py-3.5 sm:px-5")}>
      <div className="flex items-start gap-2.5">
        <CompleteToggle
          completed={task.completed}
          label={`Mark ${task.name} ${task.completed ? "incomplete" : "complete"}`}
          onToggle={
            onToggleCompleted
              ? () => onToggleCompleted(!task.completed)
              : (onOpen ?? undefined)
          }
        />
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
            aria-label={`${task.name} — open details`}
          >
            {body}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-start gap-2.5">{body}</div>
        )}
        {actions && (
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            {actions}
          </div>
        )}
      </div>
      {/* Mobile actions sit below the row body — inside the open-details
          button they would be a button in a button (invalid HTML, hydration
          error). The indent keeps them aligned under the text column. */}
      {actions && (
        <div
          className={cn(
            "mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden",
            compact ? "pl-[25px]" : "pl-[50px]",
          )}
        >
          {actions}
        </div>
      )}
      {children}
    </li>
  );
}
