"use client";

import { useState } from "react";
import { ProgressRule, StatusDot, statusOf, type PersonalTaskDisplayStatus } from "../plan/plan-shared";
import { linkHost } from "@/lib/plan/view-model";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TaskStatusButton } from "./task-status-button";
import type { Task, TaskStatus } from "./types";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Done" },
];

function columnFor(task: Task, today: string): TaskStatus {
  const display = statusOf(task, today) as PersonalTaskDisplayStatus;
  if (display === "overdue") return "todo";
  return (task.status as TaskStatus) ?? "todo";
}

/**
 * Three-column board with drag-and-drop between columns. Dropping a card
 * PATCHes its status; the status button on every card does the same thing
 * by keyboard or touch, so dragging is a convenience, never the only path.
 */
export function BoardView({
  tasks,
  today,
  groupNameOf,
  pendingIds,
  onCycleStatus,
  onEdit,
}: {
  tasks: Task[];
  today: string;
  groupNameOf: (task: Task) => string | undefined;
  pendingIds: Set<string>;
  onCycleStatus: (task: Task, next: TaskStatus) => void;
  onEdit: (task: Task) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  const byColumn = new Map<TaskStatus, Task[]>(
    COLUMNS.map((column) => [column.id, []]),
  );
  for (const task of tasks) byColumn.get(columnFor(task, today))!.push(task);

  function handleDrop(column: TaskStatus) {
    const id = dragId;
    setDragId(null);
    setOverColumn(null);
    if (!id) return;
    const task = tasks.find((item) => item.id === id);
    if (!task || columnFor(task, today) === column) return;
    onCycleStatus(task, column);
  }

  return (
    <div className="grid items-start gap-3 md:grid-cols-3">
      {COLUMNS.map((column) => {
        const items = byColumn.get(column.id)!;
        const highlighted = overColumn === column.id;
        return (
          <section
            key={column.id}
            aria-label={`${column.label} tasks`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverColumn(column.id);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setOverColumn((prev) => (prev === column.id ? null : prev));
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(column.id);
            }}
            className={cn(
              "flex min-w-0 flex-col rounded-panel border bg-canvas/50 p-2.5 transition-colors",
              highlighted
                ? "border-accent bg-accent-soft/40"
                : "border-rule-soft",
            )}
          >
            <header className="flex items-center gap-2 px-1.5 pb-2.5 pt-1">
              <StatusDot status={column.id} size={9} />
              <h3 className="text-xs font-semibold text-ink">{column.label}</h3>
              <span className="text-xs tabular text-muted">{items.length}</span>
            </header>
            <ul className="flex min-h-20 flex-col gap-2">
              {items.length === 0 && (
                <li
                  className={cn(
                    "rounded-control border border-dashed border-rule px-3 py-5 text-center text-[0.6875rem] text-muted",
                    highlighted && "border-accent text-accent",
                  )}
                >
                  {highlighted ? "Drop to move here" : "Nothing here yet"}
                </li>
              )}
              {items.map((task) => {
                const pending = pendingIds.has(task.id);
                const done = task.status === "completed";
                const host = task.url ? linkHost(task.url) : null;
                const subtasksDone = task.subtasks.filter((s) => s.completed).length;
                const overdue =
                  !done && task.dueDate !== null && task.dueDate < today;
                return (
                  <li
                    key={task.id}
                    draggable={!pending}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", task.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(task.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverColumn(null);
                    }}
                    className={cn(
                      "rounded-control border border-rule-soft bg-paper px-3 py-2.5",
                      dragId === task.id && "opacity-50",
                      pending && "opacity-60",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <TaskStatusButton
                        task={task}
                        today={today}
                        pending={pending}
                        onCycle={(next) => onCycleStatus(task, next)}
                        className="mt-0.5"
                      />
                      <button
                        type="button"
                        onClick={() => onEdit(task)}
                        className="min-w-0 flex-1 text-left"
                        aria-label={`${task.title} — open task`}
                      >
                        <span
                          className={cn(
                            "line-clamp-2 break-words text-[0.8125rem] font-medium leading-snug",
                            done && "text-muted line-through",
                          )}
                        >
                          {task.title}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.625rem] text-muted">
                          {overdue && task.dueDate && (
                            <span className="font-medium tabular text-danger">
                              Overdue · {shortDate(task.dueDate)}
                            </span>
                          )}
                          {!overdue && task.dueDate && (
                            <span className="tabular">
                              {task.dueDate === today && !done
                                ? "Today"
                                : shortDate(task.dueDate)}
                            </span>
                          )}
                          {task.priority === "high" && !done && (
                            <span className="font-medium text-accent">High</span>
                          )}
                          {groupNameOf(task) && (
                            <span className="max-w-28 truncate rounded-pill border border-rule-soft px-1.5 py-0.5">
                              {groupNameOf(task)}
                            </span>
                          )}
                          {task.subtasks.length > 0 && (
                            <span className="inline-flex items-center gap-1 tabular">
                              {subtasksDone}/{task.subtasks.length}
                              <ProgressRule
                                done={subtasksDone}
                                total={task.subtasks.length}
                                label={`${task.title} subtasks`}
                                className="w-8"
                              />
                            </span>
                          )}
                          {host && (
                            <span className="inline-flex max-w-24 items-center gap-1 truncate rounded-pill border border-rule-soft px-1.5 py-0.5">
                              <span
                                className="flex size-3 items-center justify-center rounded-[2px] bg-soft text-[7px] font-semibold uppercase"
                                aria-hidden="true"
                              >
                                {host.charAt(0)}
                              </span>
                              <span className="truncate">{host}</span>
                            </span>
                          )}
                        </span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
