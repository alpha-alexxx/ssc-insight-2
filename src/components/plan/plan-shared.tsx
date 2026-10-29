"use client";
import { PlainIcon } from "../icon";
import {
  PLAN_CATEGORIES,
  effectiveStatus,
  isMockType,
  linkHost,
  type PersonalTaskView,
  type PlanTaskView,
} from "@/lib/plan/view-model";
import type { PlanTaskType } from "@/lib/plan/schema";

/** Shared planner atoms — category chips, completion toggles, states. */

/* ---------- personal-task status dots ----------
   Colors come straight from the semantic tokens (--positive/--danger/
   --accent/--rule), which are defined once in :root/.dark and never
   overridden by [data-palette], so the dot semantics are identical across
   all palette × style combinations. Overdue derives from the due date —
   it is never stored. */
export type PersonalTaskDisplayStatus =
  | "todo"
  | "in_progress"
  | "completed"
  | "overdue";

export const STATUS_META: Record<
  PersonalTaskDisplayStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  todo: {
    label: "To do",
    dotClass: "bg-paper border-2 border-rule",
    textClass: "text-muted",
  },
  in_progress: {
    label: "In progress",
    dotClass: "bg-accent border-2 border-accent",
    textClass: "text-accent",
  },
  completed: {
    label: "Done",
    dotClass: "bg-positive border-2 border-positive",
    textClass: "text-positive",
  },
  overdue: {
    label: "Overdue",
    dotClass: "bg-danger border-2 border-danger ring-2 ring-danger-soft",
    textClass: "text-danger",
  },
};

export function statusOf(
  task: Pick<PersonalTaskView, "status" | "dueDate">,
  todayIso: string,
): PersonalTaskDisplayStatus {
  return effectiveStatus(task, todayIso) as PersonalTaskDisplayStatus;
}

/** The status cycle: clicking the dot advances a task through its states. */
export function nextStatus(
  status: PersonalTaskDisplayStatus,
): PersonalTaskView["status"] {
  if (status === "todo" || status === "overdue") return "in_progress";
  if (status === "in_progress") return "completed";
  return "todo";
}

export function StatusDot({
  status,
  size = 10,
}: {
  status: PersonalTaskDisplayStatus;
  size?: number;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`inline-block shrink-0 rounded-full ${meta.dotClass}`}
    />
  );
}

export function CategoryChip({ type }: { type: PlanTaskType }) {
  const mock = isMockType(type);
  return (
    <span
      className={`inline-flex items-center rounded-pill border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${
        mock
          ? "border-accent/40 bg-accent-soft text-accent"
          : "border-rule-soft bg-soft text-muted"
      }`}
    >
      {PLAN_CATEGORIES[type].short}
    </span>
  );
}

export function CompleteToggle({
  completed,
  onToggle,
  label,
}: {
  completed: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={completed}
      aria-label={label}
      onClick={onToggle}
      className={`mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
        completed
          ? "border-positive bg-positive-soft text-positive"
          : "border-rule bg-paper hover:border-ink"
      }`}
    >
      {completed && <PlainIcon name="check" size={12} />}
    </button>
  );
}

export function PlanStatusChip({ task }: { task: PlanTaskView }) {
  if (task.completed)
    return (
      <span className="inline-flex items-center gap-1 rounded-pill border border-positive/40 bg-positive-soft px-2 py-0.5 text-[10px] font-medium text-positive">
        <PlainIcon name="check" size={10} /> Done
      </span>
    );
  return null;
}

export function ResultLine({ task }: { task: PlanTaskView }) {
  const parts: string[] = [];
  if (task.score != null) parts.push(`${task.score} / ${task.marks}`);
  if (task.percentile != null) parts.push(`${task.percentile}%ile`);
  if (task.wrong != null) parts.push(`${task.wrong} wrong`);
  if (task.unattempted != null) parts.push(`${task.unattempted} skipped`);
  if (!parts.length) return null;
  return <span className="text-[11px] muted tabular">{parts.join(" · ")}</span>;
}

/**
 * The 2px square progress rule — the same gauge the metric strip uses. Round
 * shapes are reserved for status dots and the answer-distribution ring, so a
 * planner percentage is always a rule, never a ring.
 */
export function ProgressRule({
  done,
  total,
  label,
  className,
}: {
  done: number;
  total: number;
  label: string;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div
      className={`metric-rule block ${className ?? ""}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label} progress`}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PlanErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mb-5 flex flex-wrap gap-3 justify-between items-center bg-warning-soft text-warning border border-warning rounded-control px-5 py-4"
    >
      <div>
        <p className="font-medium text-sm">The study plan could not load</p>
        <p className="text-xs mt-1 max-w-2xl">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="border border-warning rounded-control px-3 py-2 text-xs font-medium hover:bg-warning/10 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * One personal task row with the status-dot system: dot (click cycles
 * todo → in progress → done), title, due chip, priority, optional http(s)
 * link (opens a new tab), and edit/delete actions. Shared by the calendar's
 * day panel, agenda, and the My Tasks list.
 */
export function PersonalTaskRow({
  task,
  today,
  onCycleStatus,
  onEdit,
  onDelete,
  compact = false,
}: {
  task: PersonalTaskView;
  today: string;
  onCycleStatus?: (task: PersonalTaskView) => void;
  onEdit?: (task: PersonalTaskView) => void;
  onDelete?: (task: PersonalTaskView) => void;
  compact?: boolean;
}) {
  const status = statusOf(task, today);
  const meta = STATUS_META[status];
  const host = linkHost(task.url);
  const done = status === "completed";
  return (
    <li className="flex items-start gap-2.5 px-4 py-2.5">
      {onCycleStatus ? (
        <button
          type="button"
          aria-label={`Status: ${meta.label}. Activate to change.`}
          title={`Status: ${meta.label} — click to change`}
          onClick={() => onCycleStatus(task)}
          className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          <StatusDot status={status} size={12} />
        </button>
      ) : (
        <span className="mt-1 flex size-5 shrink-0 items-center">
          <StatusDot status={status} size={12} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] font-medium leading-snug ${
            done ? "muted line-through" : "text-ink"
          }`}
        >
          {task.title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
          <span
            className={`inline-flex items-center gap-1 rounded-pill border border-rule-soft bg-soft px-2 py-0.5 font-medium ${meta.textClass}`}
          >
            <StatusDot status={status} size={6} />
            {meta.label}
          </span>
          <span className="rounded-pill border border-rule-soft bg-soft px-2 py-0.5 text-muted">
            {task.category === "other"
              ? "Personal"
              : task.category.replace(/_/g, " ")}
          </span>
          {task.dueDate && (
            <span
              className={`tabular ${
                status === "overdue" ? "text-danger font-medium" : "text-muted"
              }`}
            >
              {status === "overdue" ? "Overdue · " : "Due "}
              {task.dueDate}
            </span>
          )}
          {task.priority !== "normal" && (
            <span
              className={
                task.priority === "high"
                  ? "text-accent font-medium"
                  : "text-muted"
              }
            >
              {task.priority} priority
            </span>
          )}
          {!compact && task.notes && (
            <span className="max-w-48 truncate text-muted">{task.notes}</span>
          )}
        </p>
      </div>
      {task.url && (
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          aria-label={`Open ${host ? `${host} link` : "link"} for ${task.title} in a new tab`}
          title={host ? `Open ${host}` : "Open link"}
          className="muted hover:text-accent transition-colors mt-0.5"
        >
          <PlainIcon name="arrowUpRight" size={14} />
        </a>
      )}
      {onEdit && (
        <button
          type="button"
          aria-label={`Edit ${task.title}`}
          onClick={() => onEdit(task)}
          className="muted hover:text-accent transition-colors mt-0.5"
        >
          <PlainIcon name="settings" size={14} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          aria-label={`Delete ${task.title}`}
          onClick={() => onDelete(task)}
          className="muted hover:text-danger transition-colors mt-0.5"
        >
          <PlainIcon name="close" size={14} />
        </button>
      )}
    </li>
  );
}
