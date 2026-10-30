"use client";

import { CalendarPlus, CalendarClock, Copy, Pencil, RotateCcw, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { PlainIcon } from "../icon";
import { ProgressRule, STATUS_META, StatusDot, statusOf, type PersonalTaskDisplayStatus } from "../plan/plan-shared";
import { addIsoDays } from "@/lib/plan/view-model";
import { linkHost } from "@/lib/plan/view-model";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Task } from "./types";

/**
 * One task as an editorial row — hairline-separated, not a card. The row
 * answers everything at a glance: status (dot + text chip, never color
 * alone), due date, priority, group, subtask progress, and link. Actions
 * live behind hover reveals (desktop) and the ⋯ menu (always reachable,
 * which is what touch uses).
 */
export function TaskRow({
  task,
  today,
  groupName,
  selecting = false,
  selected = false,
  pending = false,
  onToggleSelected,
  onCycleStatus,
  onEdit,
  onReschedule,
  onPostpone,
  onDuplicate,
  onTrash,
  onRestore,
}: {
  task: Task;
  today: string;
  /** Resolved group name; omitted when Ungrouped. */
  groupName?: string;
  selecting?: boolean;
  selected?: boolean;
  /** A mutation is in flight for this row (optimistic window). */
  pending?: boolean;
  onToggleSelected?: () => void;
  onCycleStatus?: (next: "todo" | "in_progress" | "completed") => void;
  onEdit: () => void;
  onReschedule: () => void;
  onPostpone: () => void;
  onDuplicate: () => void;
  onTrash: () => void;
  onRestore?: () => void;
}) {
  const trashed = Boolean(task.deletedAt);
  const display = statusOf(task, today) as PersonalTaskDisplayStatus;
  const meta = STATUS_META[display];
  const done = display === "completed";
  const host = task.url ? linkHost(task.url) : null;
  const subtasksDone = task.subtasks.filter((sub) => sub.completed).length;

  const dueLabel = (() => {
    if (!task.dueDate) return null;
    if (task.dueDate === today && !done) return "Today";
    if (task.dueDate === addIsoDays(today, 1) && !done) return "Tomorrow";
    return shortDate(task.dueDate);
  })();

  return (
    <li
      className={cn(
        "group/row flex items-start gap-2.5 border-b border-rule-soft px-3 py-3 transition-colors last:border-b-0 hover:bg-canvas/60",
        pending && "opacity-60",
        trashed && "bg-canvas/40",
      )}
    >
      {selecting && onToggleSelected && (
        <input
          type="checkbox"
          className="mt-1.5"
          aria-label={`Select ${task.title}`}
          checked={selected}
          onChange={onToggleSelected}
        />
      )}
      {!trashed && onCycleStatus && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            onCycleStatus(
              display === "overdue" || display === "todo"
                ? "in_progress"
                : display === "in_progress"
                  ? "completed"
                  : "todo",
            )
          }
          aria-label={`Status: ${meta.label}. Activate to mark ${
            display === "todo" || display === "overdue"
              ? "in progress"
              : display === "in_progress"
                ? "done"
                : "to do"
          }.`}
          title={`Status: ${meta.label} — click to advance`}
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          <StatusDot status={display} size={16} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onEdit}
          className="block w-full text-left"
          aria-label={`${task.title} — open task`}
        >
          <span
            className={cn(
              "break-words text-sm font-medium leading-snug underline-offset-4 hover:underline",
              done && "text-muted line-through",
              trashed && "text-muted",
            )}
          >
            {task.title}
          </span>
        </button>
        {task.notes && !trashed && (
          <p className="mt-0.5 line-clamp-1 break-words text-xs text-muted">
            {task.notes}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          {!trashed && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-pill border border-rule-soft bg-soft px-2 py-0.5 font-medium",
                meta.textClass,
              )}
            >
              <StatusDot status={display} size={6} />
              {meta.label}
            </span>
          )}
          {trashed ? (
            task.deletedAt && (
              <span className="tabular">Deleted {shortDate(task.deletedAt)}</span>
            )
          ) : (
            <>
              {display === "overdue" && task.dueDate ? (
                <span className="font-medium tabular text-danger">
                  Overdue · {shortDate(task.dueDate)}
                </span>
              ) : dueLabel ? (
                <span
                  className={cn(
                    "tabular",
                    dueLabel === "Today" && !done && "font-medium text-accent",
                  )}
                >
                  {done && task.dueDate ? `Was due ${dueLabel}` : dueLabel}
                </span>
              ) : (
                <span>No date</span>
              )}
              {task.priority === "high" && !done && (
                <span className="rounded-pill bg-accent-soft px-2 py-0.5 font-medium text-accent">
                  High
                </span>
              )}
              {groupName && (
                <span className="max-w-40 truncate rounded-pill border border-rule-soft px-2 py-0.5">
                  {groupName}
                </span>
              )}
              {task.subtasks.length > 0 && (
                <span className="inline-flex items-center gap-1.5 tabular">
                  {subtasksDone}/{task.subtasks.length}
                  <ProgressRule
                    done={subtasksDone}
                    total={task.subtasks.length}
                    label={`${task.title} subtasks`}
                    className="w-10"
                  />
                </span>
              )}
              {host && (
                <a
                  href={task.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Open ${host} link for ${task.title} in a new tab`}
                  title={`Open ${host}`}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-rule-soft bg-paper px-2 py-0.5 transition-colors hover:border-accent/50 hover:text-accent"
                >
                  <span
                    className="flex size-3.5 items-center justify-center rounded-[3px] bg-soft text-[8px] font-semibold uppercase"
                    aria-hidden="true"
                  >
                    {host.replace(/^www\./, "").charAt(0)}
                  </span>
                  <span className="max-w-32 truncate">{host}</span>
                </a>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {trashed ? (
          onRestore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={onRestore}
            >
              <RotateCcw size={13} />
              Restore
            </Button>
          )
        ) : (
          <>
            {!selecting && (
              <div className="hidden opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100 sm:flex motion-reduce:opacity-100">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Edit ${task.title}`}
                  disabled={pending}
                  onClick={onEdit}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Reschedule ${task.title}`}
                  disabled={pending}
                  onClick={onReschedule}
                >
                  <CalendarClock size={14} />
                </Button>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`More actions for ${task.title}`}
                  disabled={pending}
                >
                  <PlainIcon name="more" size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil size={13} /> Edit task
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onReschedule}>
                  <CalendarClock size={13} /> Reschedule…
                </DropdownMenuItem>
                {!done && (
                  <DropdownMenuItem onSelect={onPostpone}>
                    <CalendarPlus size={13} /> Postpone 1 day
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={onDuplicate}>
                  <Copy size={13} /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem danger onSelect={onTrash}>
                  <Trash2 size={13} /> Move to Trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </li>
  );
}
