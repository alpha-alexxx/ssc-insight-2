"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { CategoryChip, CompleteToggle, PlanErrorCard } from "./plan-shared";
import { usePlanData, type PersonalTaskInput } from "../use-plan-data";
import { shortDate } from "@/lib/format";
import {
  istTodayIso,
  type PersonalTaskView,
  type PlanDayView,
  type PlanTaskView,
} from "@/lib/plan/view-model";

/**
 * My Tasks — one actionable list from two sources: tasks derived from the
 * 50-day plan (by stable plan identity, never duplicated) and the user's
 * own personal tasks. Plan completion writes progress; personal tasks are
 * independent records that never touch the schedule.
 */

type TaskFilter = "today" | "overdue" | "upcoming" | "completed" | "all";

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "overdue", label: "Overdue" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "All" },
];

const CATEGORIES = [
  { id: "revision", label: "Revision" },
  { id: "practice", label: "Practice" },
  { id: "error_review", label: "Error review" },
  { id: "notes", label: "Notes" },
  { id: "formula", label: "Formula sheet" },
  { id: "other", label: "Other" },
];

export function TasksView({ planApi }: { planApi: ReturnType<typeof usePlanData> }) {
  const {
    plan,
    personalTasks,
    loading,
    error,
    refresh,
    updateTask,
    createPersonalTask,
    updatePersonalTask,
    deletePersonalTask,
  } = planApi;
  const today = istTodayIso();
  const [filter, setFilter] = useState<TaskFilter>("today");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalTaskView | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PersonalTaskView | null>(null);

  const planTasks = useMemo(() => {
    if (!plan) return [] as { task: PlanTaskView; day: PlanDayView }[];
    return plan.days.flatMap((day) => day.tasks.map((task) => ({ task, day })));
  }, [plan]);

  const matches = (title: string) =>
    !search.trim() || title.toLowerCase().includes(search.trim().toLowerCase());

  const planFiltered = planTasks.filter(({ task }) => {
    if (!matches(task.name)) return false;
    if (filter === "completed") return task.completed;
    if (task.completed) return false;
    if (filter === "today") return task.date === today;
    if (filter === "overdue") return task.date < today;
    if (filter === "upcoming") return task.date > today;
    return true;
  });

  const personalFiltered = personalTasks.filter((task) => {
    if (!matches(task.title)) return false;
    const done = task.status === "completed";
    if (filter === "completed") return done;
    if (done) return false;
    if (filter === "today") return task.dueDate === today;
    if (filter === "overdue") return !!task.dueDate && task.dueDate < today;
    if (filter === "upcoming") return !task.dueDate || task.dueDate > today;
    return true;
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Task filter" className="segment-group">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              className="segment"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <PlainIcon
            name="search"
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 muted pointer-events-none"
          />
          <input
            aria-label="Search tasks"
            placeholder="Search tasks…"
            className="!w-44 sm:!w-56 py-2 pl-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <PlainIcon name="plus" size={14} /> New task
        </Button>
      </div>

      {loading && !plan ? (
        <div className="panel p-6 animate-pulse" aria-busy="true">
          <div className="h-24 w-full bg-rule-soft rounded" />
        </div>
      ) : !plan ? (
        <PlanErrorCard message={error || "Could not load tasks."} onRetry={() => void refresh()} />
      ) : (
        <>
          <TaskList
            heading="From the study plan"
            emptyText={
              filter === "today"
                ? "Nothing scheduled for today in the plan. Check Upcoming."
                : "No plan tasks match this filter."
            }
            count={planFiltered.length}
          >
            {planFiltered.map(({ task }) => (
              <li key={task.key} className="flex items-start gap-3 px-4 sm:px-6 py-3">
                <CompleteToggle
                  completed={task.completed}
                  label={`Mark ${task.name} ${task.completed ? "incomplete" : "complete"}`}
                  onToggle={() => updateTask(task.key, { completed: !task.completed })}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-medium ${task.completed ? "muted line-through" : ""}`}>
                    {task.name}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] muted">
                    <CategoryChip type={task.type} />
                    <Link href={`/plan/${task.date}`} className="hover:text-accent transition-colors">
                      {shortDate(task.date)} · Day {task.day}
                    </Link>
                    <span className="tabular">
                      {task.questions} Q · {task.marks} marks
                    </span>
                  </p>
                </div>
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${task.name} on RBE`}
                  className="muted hover:text-accent transition-colors mt-0.5"
                >
                  <PlainIcon name="arrowUpRight" size={15} />
                </a>
              </li>
            ))}
          </TaskList>

          <div className="mt-6">
            <TaskList
              heading="My personal tasks"
              emptyText="No personal tasks here yet — create one with New task."
              count={personalFiltered.length}
              action={
                personalFiltered.length > 0 ? (
                  <span className="text-[11px] muted">Edit or complete from the row</span>
                ) : undefined
              }
            >
              {personalFiltered.map((task) => (
                <li key={task.id} className="flex items-start gap-3 px-4 sm:px-6 py-3">
                  <CompleteToggle
                    completed={task.status === "completed"}
                    label={`Mark ${task.title} ${task.status === "completed" ? "not done" : "done"}`}
                    onToggle={() =>
                      void updatePersonalTask(task.id, {
                        status: task.status === "completed" ? "todo" : "completed",
                      })
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[13px] font-medium ${task.status === "completed" ? "muted line-through" : ""}`}
                    >
                      {task.title}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] muted">
                      <span className="rounded-pill border border-rule-soft bg-soft px-2 py-0.5">
                        {CATEGORIES.find((c) => c.id === task.category)?.label ?? task.category}
                      </span>
                      {task.dueDate && (
                        <span className={overdue(task, today) ? "text-danger font-medium" : ""}>
                          {overdue(task, today) ? "Overdue · " : "Due "}
                          {shortDate(task.dueDate)}
                        </span>
                      )}
                      {task.priority !== "normal" && (
                        <span
                          className={
                            task.priority === "high" ? "text-accent font-medium" : "muted"
                          }
                        >
                          {task.priority} priority
                        </span>
                      )}
                      {task.notes && <span className="truncate max-w-48">{task.notes}</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Edit ${task.title}`}
                    onClick={() => setEditing(task)}
                    className="muted hover:text-accent transition-colors mt-0.5"
                  >
                    <PlainIcon name="settings" size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${task.title}`}
                    onClick={() => setConfirmDelete(task)}
                    className="muted hover:text-danger transition-colors mt-0.5"
                  >
                    <PlainIcon name="close" size={14} />
                  </button>
                </li>
              ))}
            </TaskList>
          </div>
        </>
      )}

      <PersonalTaskForm
        open={formOpen || !!editing}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={async (input) => {
          if (editing) await updatePersonalTask(editing.id, input);
          else await createPersonalTask(input);
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <Dialog.Root
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay fixed inset-0 bg-ink/40 z-40" />
          <Dialog.Content className="dialog-content fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-paper border border-rule rounded-panel w-[calc(100%-32px)] max-w-md p-6 shadow-pop">
            <Dialog.Title className="font-serif text-2xl leading-tight">
              Delete “{confirmDelete?.title}”?
            </Dialog.Title>
            <Dialog.Description className="muted text-sm mt-2">
              This removes your personal task. The study plan is not affected.
            </Dialog.Description>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
                Keep task
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirmDelete) void deletePersonalTask(confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                Delete task
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function overdue(task: PersonalTaskView, today: string) {
  return (
    task.status !== "completed" && !!task.dueDate && task.dueDate < today
  );
}

function TaskList({
  heading,
  emptyText,
  count,
  action,
  children,
}: {
  heading: string;
  emptyText: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={heading} className="panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule-soft px-4 sm:px-6 py-4">
        <h2 className="panel-title text-lg">
          {heading}{" "}
          <span className="text-sm font-normal muted">· {count}</span>
        </h2>
        {action}
      </div>
      {count === 0 ? (
        <p className="px-4 sm:px-6 py-6 text-sm muted">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-rule-soft">{children}</ul>
      )}
    </section>
  );
}

/** Compact create/edit form in a Radix dialog (bottom-sheet feel on mobile). */
function PersonalTaskForm({
  open,
  editing,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: PersonalTaskView | null;
  onClose: () => void;
  onSubmit: (input: PersonalTaskInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = editing?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setTitle(editing?.title ?? "");
    setDueDate(editing?.dueDate ?? "");
    setCategory(editing?.category ?? "other");
    setPriority(editing?.priority ?? "normal");
    setNotes(editing?.notes ?? "");
    setError("");
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 bg-ink/40 z-40" />
        <Dialog.Content className="dialog-content fixed z-50 bottom-0 left-1/2 -translate-x-1/2 translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 bg-paper border border-rule rounded-panel w-[calc(100%-16px)] sm:max-w-md p-6 shadow-pop">
          <Dialog.Title className="font-serif text-2xl leading-tight">
            {editing ? "Edit task" : "New personal task"}
          </Dialog.Title>
          <Dialog.Description className="muted text-xs mt-1">
            Personal tasks are yours alone — the 50-day plan never changes.
          </Dialog.Description>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) {
                setError("Give the task a title.");
                return;
              }
              setBusy(true);
              setError("");
              void onSubmit({
                title: title.trim(),
                notes: notes.trim() || undefined,
                dueDate: dueDate || null,
                category,
                priority,
                status: editing?.status ?? "todo",
              })
                .catch((cause: unknown) =>
                  setError(cause instanceof Error ? cause.message : "Could not save the task"),
                )
                .finally(() => setBusy(false));
            }}
          >
            <label>
              Title <span className="req" aria-hidden="true">*</span>
              <input
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Reattempt profit & loss errors"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                Due date
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </label>
              <label>
                Priority
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Notes
              <textarea
                rows={2}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional details"
              />
            </label>
            {error && (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Saving…" : editing ? "Save changes" : "Create task"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
