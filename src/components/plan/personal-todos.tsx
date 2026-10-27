"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  CalendarClock,
  Plus,
  Search,
  Trash2,
  RotateCcw,
  Pencil,
  X,
} from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../ui/sheet";
import { api } from "@/lib/api-client";
import { istTodayIso, linkHost, safeHttpUrlCore } from "@/lib/plan/view-model";
import { cn } from "@/lib/utils";
import { shortDate as dateLabel } from "@/lib/format";
import { useOverlayViewport, useOverlayFocus } from "../use-overlay-viewport";
import { PersonalCalendar } from "./personal-calendar";
import { useTodoQuery, mutateTodoRequest } from "../use-todos-data";

type Subtask = { id: string; title: string; completed: boolean };
type Group = { id: string; name: string };
type Todo = {
  id: string;
  title: string;
  dueDate: string | null;
  notes: string | null;
  priority: string;
  status: string;
  groupId: string | null;
  subtasks: Subtask[];
  version: number;
  deletedAt: string | null;
  url?: string | null;
};
type Response = {
  items: Todo[];
  groups: Group[];
  total: number;
  page: number;
  limit: number;
  counts: Record<string, number>;
};
type View =
  | "day"
  | "today"
  | "overdue"
  | "upcoming"
  | "all"
  | "needsdate"
  | "trash"
  | "completed";
const VIEWS: { id: View; label: string }[] = [
  { id: "day", label: "Selected day" },
  { id: "today", label: "Today" },
  { id: "overdue", label: "Overdue" },
  { id: "upcoming", label: "Upcoming" },
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "needsdate", label: "Needs date" },
  { id: "trash", label: "Trash" },
];
export function PersonalTodos({
  initialDate,
  onChanged,
  aiAction,
  compact = false,
}: {
  initialDate?: string;
  compact?: boolean;
  onChanged?: () => void;
  aiAction?: React.ReactNode;
}) {
  const overlayFocus = useOverlayFocus();
  const [date, setDate] = useState(initialDate ?? istTodayIso());
  const [view, setView] = useState<View>("day");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState("");
  const [editing, setEditing] = useState<Todo | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [completion, setCompletion] = useState("all");
  const [priority, setPriority] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sort, setSort] = useState("priority");
  const [confirmTrash, setConfirmTrash] = useState<Todo | null>(null);
  const [rescheduling, setRescheduling] = useState<Todo | null>(null);
  const [newDate, setNewDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const query = new URLSearchParams({
    view,
    date,
    search,
    page: String(page),
    limit: compact ? "10" : "50",
    completion,
    priority,
    group: groupFilter,
    sort,
  });
  const {
    data,
    error: loadError,
    loading,
    refresh: load,
  } = useTodoQuery<Response>(`/api/todos?${query}`);
  useEffect(() => {
    if (data && page > Math.max(1, Math.ceil(data.total / data.limit))) {
      const timer = window.setTimeout(
        () => setPage(Math.max(1, Math.ceil(data.total / data.limit))),
        0,
      );
      return () => window.clearTimeout(timer);
    }
  }, [data, page]);
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      await mutateTodoRequest(path, method, body);
      onChanged?.();
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save. Try again.",
      );
      load();
      return false;
    } finally {
      setBusy(false);
    }
  }
  function selectView(next: View) {
    setView(next);
    setPage(1);
  }
  function selectDate(next: string) {
    if (!next) return;
    setDate(next);
    setView("day");
    setPage(1);
  }
  const visibleGroups = [
    ...(data?.groups ?? []).map((g) => ({ id: g.id, name: g.name })),
    { id: "", name: "Ungrouped" },
  ];
  const buckets = new Map<string, Todo[]>();
  for (const task of data?.items ?? []) {
    const key = `${task.dueDate ?? "undated"}|${task.groupId ?? ""}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(task);
    buckets.set(key, bucket);
  }
  return (
    <section
      aria-label="Personal todo planner"
      className="personal-workspace flex min-w-0 flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl">
            {compact ? "Personal Tasks" : "Your personal workspace"}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Choose a date, make a little progress. Your study schedule stays
            separate.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreating(true)}>
          <Plus size={14} /> Add task
        </Button>
      </div>
      {!compact && (
        <dl className="grid grid-cols-3 divide-x divide-rule-soft border-y border-rule-soft py-3">
          {[
            ["Pending", "pending"],
            ["Completed", "completed"],
            ["Overdue", "overdue"],
          ].map(([label, key]) => (
            <div key={key} className="px-3 first:pl-0">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 font-serif text-2xl tabular-nums">
                {data?.counts[key] ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <aside className="min-w-0 border-b border-rule-soft pb-4 lg:col-start-2 lg:row-start-1 lg:border-b-0 lg:border-l lg:pb-0 lg:pl-5">
          <PersonalCalendar
            selected={date}
            onSelect={selectDate}
            onAdd={() => setCreating(true)}
          />
          {compact && (
            <a
              href="/my-tasks"
              className="mt-4 block text-xs text-accent underline underline-offset-4"
            >
              Manage all personal tasks
            </a>
          )}
        </aside>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
          {compact && (
            <OverdueTodoPreview selectedDate={date} onEdit={setEditing} />
          )}
          {!compact && (
            <details className="border-b border-rule-soft pb-3">
              <summary className="cursor-pointer text-xs font-medium">
                Plan tasks with AI
              </summary>
              <div className="mt-3">
                {aiAction ?? <TodoAiComposer onChanged={onChanged} />}
              </div>
            </details>
          )}
          <div className="overflow-hidden">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-serif text-lg">{dateLabel(date)}</h3>
              {!compact && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setGroupsOpen(!groupsOpen)}
                  aria-expanded={groupsOpen}
                >
                  Manage groups
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <form
                className="flex flex-wrap gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!title.trim()) return;
                  if (
                    await mutate("/api/todos", "POST", {
                      title: title.trim(),
                      dueDate: date,
                      groupId: groupId || null,
                    })
                  ) {
                    setTitle("");
                    selectView("day");
                    input.current?.focus();
                  }
                }}
              >
                <label className="sr-only" htmlFor="quick-todo-title">
                  New todo title
                </label>
                <input
                  ref={input}
                  id="quick-todo-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  required
                  placeholder={`Add a todo for ${dateLabel(date)}…`}
                  className="min-w-0 flex-1 basis-48"
                  disabled={busy}
                />
                <label className="sr-only" htmlFor="quick-todo-group">
                  Todo group
                </label>
                <select
                  id="quick-todo-group"
                  className="w-auto! max-w-40"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  disabled={busy}
                >
                  {visibleGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <Button disabled={busy || !title.trim()}>
                  <Plus size={16} />
                  Add todo
                </Button>
              </form>
              <p className="text-xs text-muted">
                Press Enter to add another. Add notes, priority, or subtasks
                using Edit.
              </p>
            </div>
          </div>
          {groupsOpen && (
            <section
              className="panel space-y-4 p-4"
              aria-label="Manage todo groups"
            >
              <div>
                <h3 className="font-serif text-lg">Your groups</h3>
                <p className="mt-1 text-xs text-muted">
                  Groups are shared across dates. Removing a group keeps its
                  todos under Ungrouped.
                </p>
              </div>
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await mutate("/api/todos/groups", "POST", {
                      name: groupName.trim(),
                    })
                  )
                    setGroupName("");
                }}
              >
                <input
                  aria-label="New group name"
                  placeholder="e.g. Maths revision"
                  value={groupName}
                  maxLength={80}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
                <Button disabled={busy || !groupName.trim()}>
                  Create group
                </Button>
              </form>
              {data?.groups.map((g) => (
                <GroupRow
                  key={g.id}
                  group={g}
                  busy={busy}
                  mutate={mutate}
                  onDelete={() => {
                    if (groupId === g.id) setGroupId("");
                  }}
                />
              ))}
            </section>
          )}
          {!compact && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setFiltersOpen(true)}
            >
              Filters & sorting
            </Button>
          )}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent
              {...overlayFocus}
              className="w-full sm:max-w-sm overflow-y-auto"
            >
              <SheetHeader className="pr-12">
                <SheetTitle>Filters & sorting</SheetTitle>
                <SheetDescription>
                  Filter your task list. Calendar markers show every personal
                  task.
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-5">
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-xs">
                    Status
                    <select
                      aria-label="Status"
                      value={completion}
                      onChange={(e) => {
                        setCompletion(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="all">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    Priority
                    <select
                      aria-label="Priority"
                      value={priority}
                      onChange={(e) => {
                        setPriority(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="all">All priorities</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    Group
                    <select
                      aria-label="Group"
                      value={groupFilter}
                      onChange={(e) => {
                        setGroupFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="all">All groups</option>
                      <option value="ungrouped">Ungrouped</option>
                      {data?.groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    Sort
                    <select
                      aria-label="Sort"
                      value={sort}
                      onChange={(e) => {
                        setSort(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="priority">Priority</option>
                      <option value="date">Due date</option>
                      <option value="newest">Newest first</option>
                      <option value="title">Title</option>
                    </select>
                  </label>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Personal todo views"
              className="flex flex-wrap gap-1"
            >
              {(compact
                ? VIEWS.filter((item) => item.id === "day")
                : VIEWS
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={view === item.id}
                  onClick={() => selectView(item.id)}
                  className={cn(
                    "min-h-9 rounded-control px-3 text-xs",
                    view === item.id
                      ? "bg-ink text-paper"
                      : "text-muted hover:bg-soft hover:text-ink",
                  )}
                >
                  {item.label}
                  {data?.counts[item.id] != null && item.id !== "day" ? (
                    <span className="ml-1 tabular-nums">
                      {data.counts[item.id]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="relative ml-auto min-w-40">
              <Search size={14} className="absolute left-3 top-3 text-muted" />
              <input
                aria-label="Search personal todos"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search todos…"
                className="pl-9!"
              />
            </div>
          </div>
          {(error || loadError) && (
            <div
              role="alert"
              className="border border-danger bg-danger-soft p-3 text-sm text-danger"
            >
              {error || loadError}
              <button
                type="button"
                className="ml-3 underline underline-offset-4"
                onClick={() => void load()}
              >
                Retry
              </button>
            </div>
          )}
          {loading ? (
            <p role="status" className="py-10 text-center text-muted">
              Loading your todos…
            </p>
          ) : !data?.items.length ? (
            <div className="border-y border-rule-soft px-4 py-8 text-center">
              <h3 className="font-serif text-xl">
                {view === "trash"
                  ? "Trash is empty"
                  : view === "needsdate"
                    ? "Every todo has a date"
                    : search
                      ? "No matching todos"
                      : "A clear page for your work"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                {view === "trash"
                  ? "Deleted todos appear here and can be restored with their subtasks."
                  : view === "needsdate"
                    ? "Older tasks without a date will appear here. Assign a date to bring them into your planner."
                    : search
                      ? "Try another search or choose a different view."
                      : "Add a title above to begin your checklist, or ask AI to prepare a draft for review."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {[...buckets.entries()].map(([key, items]) => {
                const first = items[0];
                const group = visibleGroups.find(
                  (g) => g.id === (first.groupId ?? ""),
                );
                return (
                  <section
                    key={key}
                    className="overflow-hidden border-y border-rule-soft"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule-soft bg-canvas px-4 py-3">
                      <h3 className="font-serif text-lg">
                        {group?.name ?? "Ungrouped"}
                      </h3>
                      <p className="text-xs text-muted">
                        {first.dueDate
                          ? dateLabel(first.dueDate)
                          : "Needs date"}{" "}
                        · {items.length} {items.length === 1 ? "todo" : "todos"}
                      </p>
                    </div>
                    {items.map((todo) => (
                      <article
                        key={todo.id}
                        className="border-b border-rule-soft py-3 last:border-b-0"
                      >
                        <div className="flex items-start gap-3">
                          {!todo.deletedAt && (
                            <input
                              type="checkbox"
                              className="mt-1"
                              aria-label={`Complete ${todo.title}`}
                              checked={todo.status === "completed"}
                              disabled={busy}
                              onChange={(e) =>
                                void mutate(`/api/todos/${todo.id}`, "PATCH", {
                                  version: todo.version,
                                  completed: e.target.checked,
                                })
                              }
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <h4
                              className={cn(
                                "break-words text-sm font-medium",
                                todo.status === "completed" &&
                                  "text-muted line-through",
                              )}
                            >
                              {todo.title}
                            </h4>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                              <span>
                                {todo.priority === "high"
                                  ? "High priority"
                                  : todo.priority === "low"
                                    ? "Low priority"
                                    : "Normal priority"}
                              </span>
                              {todo.dueDate &&
                                todo.dueDate < istTodayIso() &&
                                todo.status !== "completed" &&
                                !todo.deletedAt && (
                                  <span className="text-danger">Overdue</span>
                                )}
                              {todo.subtasks.length > 0 && (
                                <span>
                                  {
                                    todo.subtasks.filter((s) => s.completed)
                                      .length
                                  }
                                  /{todo.subtasks.length} subtasks
                                </span>
                              )}
                            </div>
                            {todo.url && safeHttpUrlCore(todo.url) && (
                              <a
                                href={todo.url}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="mt-1 block break-all text-xs text-accent underline underline-offset-4"
                              >
                                {linkHost(todo.url)}
                              </a>
                            )}
                            {todo.notes && (
                              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted">
                                {todo.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                            {todo.deletedAt ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() =>
                                  void mutate(
                                    `/api/todos/${todo.id}`,
                                    "PATCH",
                                    {
                                      version: todo.version,
                                      restore: true,
                                    },
                                  )
                                }
                              >
                                <RotateCcw size={14} />
                                Restore
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Edit ${todo.title}`}
                                  disabled={busy}
                                  onClick={() => setEditing(todo)}
                                >
                                  <Pencil size={15} />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Reschedule ${todo.title}`}
                                  disabled={busy}
                                  onClick={() => {
                                    setRescheduling(todo);
                                    setNewDate(todo.dueDate ?? date);
                                  }}
                                >
                                  <CalendarClock size={15} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Move ${todo.title} to Trash`}
                                  disabled={busy}
                                  onClick={() => setConfirmTrash(todo)}
                                >
                                  <Trash2 size={15} />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        {todo.subtasks.length > 0 && (
                          <ul className="mt-3 space-y-2 pl-7">
                            {todo.subtasks.map((sub) => (
                              <li key={sub.id}>
                                <label className="check-row text-xs">
                                  <input
                                    type="checkbox"
                                    disabled={busy || Boolean(todo.deletedAt)}
                                    checked={sub.completed}
                                    onChange={(e) =>
                                      void mutate(
                                        `/api/todos/${todo.id}`,
                                        "PATCH",
                                        {
                                          version: todo.version,
                                          subtasks: todo.subtasks.map((s) =>
                                            s.id === sub.id
                                              ? {
                                                  ...s,
                                                  completed: e.target.checked,
                                                }
                                              : s,
                                          ),
                                        },
                                      )
                                    }
                                  />
                                  <span
                                    className={
                                      sub.completed
                                        ? "text-muted line-through"
                                        : "text-ink"
                                    }
                                  >
                                    {sub.title}
                                  </span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>
                    ))}
                  </section>
                );
              })}
            </div>
          )}
          {data && (data.total > data.limit || page > 1) && (
            <div className="flex items-center justify-between border-t border-rule-soft pt-4 text-xs text-muted">
              <span>
                {data.total} todos · Page {page} of{" "}
                {Math.ceil(data.total / data.limit)}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page * data.limit >= data.total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {creating && (
        <TodoEditor
          key="create"
          todo={{
            id: "",
            title: "",
            dueDate: date,
            notes: null,
            priority: "normal",
            status: "todo",
            groupId: groupId || null,
            subtasks: [],
            version: 1,
            deletedAt: null,
          }}
          groups={visibleGroups}
          busy={busy}
          error={error}
          onClose={() => setCreating(false)}
          onSave={async (body) => {
            if (await mutate("/api/todos", "POST", body)) setCreating(false);
          }}
        />
      )}
      {confirmTrash && (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open && !busy) setConfirmTrash(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25" />
            <Dialog.Content {...overlayFocus} className="task-confirm-dialog">
              <Dialog.Title className="font-serif text-xl">
                Move to Trash?
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted">
                {confirmTrash.title} and its subtasks can be restored later.
              </Dialog.Description>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirmTrash(null)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await mutate(`/api/todos/${confirmTrash.id}`, "DELETE", {
                        version: confirmTrash.version,
                      })
                    )
                      setConfirmTrash(null);
                  }}
                >
                  Move to Trash
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
      {rescheduling && (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open && !busy) setRescheduling(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25" />
            <Dialog.Content {...overlayFocus} className="task-confirm-dialog">
              <Dialog.Title className="font-serif text-xl">
                Reschedule task
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted">
                {rescheduling.title}. Subtasks move with this task.
              </Dialog.Description>
              <form
                className="mt-4 flex flex-col gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await mutate(`/api/todos/${rescheduling.id}`, "PATCH", {
                      version: rescheduling.version,
                      dueDate: newDate,
                    })
                  )
                    setRescheduling(null);
                }}
              >
                <label>
                  New date
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </label>
                {error && (
                  <p role="alert" className="text-xs text-danger">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setRescheduling(null)}
                  >
                    Cancel
                  </Button>
                  <Button disabled={busy}>Reschedule</Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
      {editing && (
        <TodoEditor
          key={editing.id}
          todo={editing}
          groups={visibleGroups}
          busy={busy}
          error={error}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            if (
              await mutate(`/api/todos/${editing.id}`, "PATCH", {
                version: editing.version,
                ...body,
              })
            )
              setEditing(null);
          }}
        />
      )}
    </section>
  );
}

function OverdueTodoPreview({
  selectedDate,
  onEdit,
}: {
  selectedDate: string;
  onEdit: (todo: Todo) => void;
}) {
  const { data, error, refresh } = useTodoQuery<Response>(
    `/api/todos?view=overdue&limit=3&excludeDate=${selectedDate}`,
  );
  if (error)
    return (
      <p role="alert" className="text-xs text-danger">
        {error}{" "}
        <button type="button" onClick={refresh} className="underline">
          Retry overdue tasks
        </button>
      </p>
    );
  if (!data?.total) return null;
  return (
    <section
      aria-label="Overdue personal tasks"
      className="border-b border-rule-soft pb-3"
    >
      <div className="flex justify-between gap-2">
        <h3 className="text-sm font-medium text-danger">
          Overdue · {data.total}
        </h3>
        <a href="/my-tasks" className="text-xs text-accent underline">
          Review tasks
        </a>
      </div>
      <ul className="mt-2 divide-y divide-rule-soft">
        {data.items.map((todo) => (
          <li key={todo.id}>
            <button
              type="button"
              onClick={() => onEdit(todo)}
              className="flex w-full items-start justify-between gap-3 py-2 text-left text-xs hover:text-accent"
            >
              <span className="min-w-0 break-words">{todo.title}</span>
              <span className="shrink-0 text-muted">
                {todo.dueDate && dateLabel(todo.dueDate)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GroupRow({
  group,
  busy,
  mutate,
  onDelete,
}: {
  group: Group;
  busy: boolean;
  mutate: (path: string, method: string, body?: unknown) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(group.name);
  return (
    <div className="flex flex-wrap gap-2 border-t border-rule-soft pt-3">
      <input
        aria-label={`Rename ${group.name}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        className="min-w-0 flex-1 basis-40"
      />
      <Button
        variant="outline"
        size="sm"
        disabled={busy || !name.trim() || name === group.name}
        onClick={() =>
          void mutate(`/api/todos/groups/${group.id}`, "PATCH", {
            name: name.trim(),
          })
        }
      >
        Rename
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={async () => {
          if (await mutate(`/api/todos/groups/${group.id}`, "DELETE"))
            onDelete();
        }}
      >
        Remove group
      </Button>
    </div>
  );
}

function TodoEditor({
  todo,
  groups,
  busy,
  onSave,
  onClose,
  error,
}: {
  todo: Todo;
  error: string;
  groups: Group[];
  busy: boolean;
  onSave: (body: TodoData) => Promise<void>;
  onClose: () => void;
}) {
  const viewport = useOverlayViewport(true);
  const overlayFocus = useOverlayFocus();
  const [title, setTitle] = useState(todo.title),
    [date, setDate] = useState(todo.dueDate ?? ""),
    [notes, setNotes] = useState(todo.notes ?? ""),
    [url, setUrl] = useState(todo.url ?? ""),
    [priority, setPriority] = useState(todo.priority),
    [groupId, setGroupId] = useState(todo.groupId ?? "");
  const [subtasks, setSubtasks] = useState(todo.subtasks);
  const [newSub, setNewSub] = useState("");

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content
          {...overlayFocus}
          style={
            viewport
              ? ({
                  "--task-viewport-height": `${viewport.height}px`,
                  "--task-viewport-top": `${viewport.top}px`,
                } as CSSProperties)
              : undefined
          }
          aria-describedby="todo-editor-description"
          className="task-editor-dialog"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-serif text-2xl">
              {todo.id ? "Edit task" : "Add task"}
            </Dialog.Title>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close editor"
              disabled={busy}
              onClick={onClose}
            >
              <X size={18} />
            </Button>
          </div>
          <Dialog.Description
            id="todo-editor-description"
            className="mt-2 text-xs text-muted"
          >
            Change your personal checklist without changing the mock plan.
          </Dialog.Description>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void onSave({
                title: title.trim(),
                dueDate: date,
                notes,
                url,
                priority,
                groupId: groupId || null,
                subtasks,
              });
            }}
          >
            <label>
              Title
              <input
                value={title}
                maxLength={200}
                required
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                Date
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Priority
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>
            <label>
              Group
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              External link
              <input
                type="url"
                value={url}
                maxLength={2048}
                placeholder="https://…"
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>
            <label>
              Notes
              <textarea
                value={notes}
                maxLength={2000}
                rows={3}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium">Subtasks</legend>
              <p className="text-xs text-muted">
                Subtasks share this date. Completing all of them completes the
                todo.
              </p>
              {subtasks.map((sub, i) => (
                <div key={sub.id} className="flex items-center gap-2">
                  <input
                    aria-label={`Complete subtask ${sub.title}`}
                    type="checkbox"
                    checked={sub.completed}
                    onChange={(e) =>
                      setSubtasks(
                        subtasks.map((s, n) =>
                          n === i ? { ...s, completed: e.target.checked } : s,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Subtask ${i + 1}`}
                    value={sub.title}
                    required
                    maxLength={200}
                    onChange={(e) =>
                      setSubtasks(
                        subtasks.map((s, n) =>
                          n === i ? { ...s, title: e.target.value } : s,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove subtask ${sub.title}`}
                    onClick={() =>
                      setSubtasks(subtasks.filter((_, n) => n !== i))
                    }
                  >
                    <X size={14} />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  aria-label="New subtask"
                  placeholder="Add a subtask…"
                  value={newSub}
                  maxLength={200}
                  onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newSub.trim()) {
                        setSubtasks([
                          ...subtasks,
                          {
                            id: crypto.randomUUID(),
                            title: newSub.trim(),
                            completed: false,
                          },
                        ]);
                        setNewSub("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!newSub.trim()}
                  onClick={() => {
                    setSubtasks([
                      ...subtasks,
                      {
                        id: crypto.randomUUID(),
                        title: newSub.trim(),
                        completed: false,
                      },
                    ]);
                    setNewSub("");
                  }}
                >
                  Add
                </Button>
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-rule-soft pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button disabled={busy || !date || !title.trim()}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type TodoData = {
  url?: string;
  title?: string;
  dueDate?: string;
  notes?: string;
  priority?: string;
  groupId?: string | null;
  subtasks?: Subtask[];
  completed?: boolean;
};
type Proposal = {
  type: "create" | "update" | "delete";
  id?: string;
  version?: number;
  data?: TodoData;
};
type DraftResponse = {
  needsDates: boolean;
  question?: string;
  operations: Proposal[];
  before?: Record<string, Todo>;
  contextTruncated?: boolean;
};

/** The same explicit-date, review-before-write workflow in planner and AI sheet. */
export function TodoAiComposer({
  onChanged,
  compact = false,
}: {
  onChanged?: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(compact),
    [prompt, setPrompt] = useState(""),
    [date, setDate] = useState(""),
    [endDate, setEndDate] = useState("");
  const [draft, setDraft] = useState<DraftResponse | null>(null),
    [selected, setSelected] = useState<number[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const token = useRef(crypto.randomUUID());
  const reference = useTodoQuery<Response>("/api/todos?limit=100&view=all");
  const groups = reference.data?.groups ?? [];
  const existingTodos = reference.data?.items ?? [];
  const duplicateLookupTruncated =
    (reference.data?.total ?? 0) > existingTodos.length;
  const loadTodoReference = reference.refresh;
  async function generate() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await api<DraftResponse>("/api/ai/todos", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          date: date || undefined,
          endDate: endDate || undefined,
        }),
      });
      setDraft(result);
      setSelected(result.operations.map((_, i) => i));
      token.current = crypto.randomUUID();
      void loadTodoReference();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not prepare todos. Your existing todos are unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }
  function changeOperation(index: number, patch: TodoData) {
    setDraft((current) =>
      current
        ? {
            ...current,
            operations: current.operations.map((op, i) =>
              i === index ? { ...op, data: { ...op.data, ...patch } } : op,
            ),
          }
        : null,
    );
    token.current = crypto.randomUUID();
  }
  function proposedValue(op: Proposal, before: Todo | null) {
    const rawSubtasks = op.data?.subtasks ?? before?.subtasks ?? [];
    const explicitCompletion = op.data?.completed;
    const completed =
      explicitCompletion !== undefined
        ? explicitCompletion
        : rawSubtasks.length
          ? rawSubtasks.every((subtask) => subtask.completed)
          : before?.status === "completed";
    const subtasks =
      explicitCompletion === undefined
        ? rawSubtasks
        : rawSubtasks.map((subtask) => ({
            ...subtask,
            completed: explicitCompletion,
          }));
    return {
      title: op.data?.title ?? before?.title ?? "",
      dueDate: op.data?.dueDate ?? before?.dueDate ?? "",
      subtasks,
      completed,
    };
  }
  function duplicateWarning(index: number, op: Proposal, before: Todo | null) {
    if (op.type === "delete") return "";
    const value = proposedValue(op, before);
    const title = value.title.trim().toLocaleLowerCase();
    if (!title || !value.dueDate) return "";
    const existing = existingTodos.some(
      (todo) =>
        todo.id !== op.id &&
        todo.dueDate === value.dueDate &&
        todo.title.trim().toLocaleLowerCase() === title,
    );
    const proposed = draft?.operations.some((other, otherIndex) => {
      if (otherIndex === index || other.type === "delete") return false;
      const otherBefore = other.id ? (draft.before?.[other.id] ?? null) : null;
      const otherValue = proposedValue(other, otherBefore);
      return (
        otherValue.dueDate === value.dueDate &&
        otherValue.title.trim().toLocaleLowerCase() === title
      );
    });
    return existing || proposed
      ? "Likely duplicate: another todo has the same title and date. You can still apply it."
      : "";
  }
  async function apply() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/todos/apply", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: token.current,
          operations: draft.operations.filter((_, i) => selected.includes(i)),
        }),
      });
      window.dispatchEvent(new Event("ssc:todos-changed"));
      onChanged?.();
      setDraft(null);
      setSelected([]);
      setSuccess("Your selected changes were applied.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not apply your changes. Your draft is still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={cn("space-y-4", !compact && "panel p-4")}
      aria-label="AI todo assistant"
    >
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-xl">Plan with AI</h3>
            <p className="mt-1 text-xs text-muted">
              Describe the work. Review every change before it is saved.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            {open ? "Close assistant" : "Create with AI"}
          </Button>
        </div>
      )}
      {open && (
        <>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void generate();
            }}
          >
            <label>
              What would you like to plan?
              <textarea
                required
                maxLength={4000}
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Create revision todos for my weaker subjects, or reschedule unfinished work…"
                disabled={busy}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label>
                Through date (optional)
                <input
                  type="date"
                  min={date || undefined}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              Choose the dates explicitly. AI can use your mock performance,
              study plan, and personal todo notes and subtasks. This context is
              sent to your configured provider; credentials and account identity
              are excluded.
            </p>
            <Button disabled={busy || !prompt.trim()}>
              {busy
                ? "Working…"
                : draft
                  ? "Generate new draft"
                  : "Prepare draft"}
            </Button>
            <p className="text-xs text-muted">
              Generating does not save anything. Manual todo entry works without
              AI.
            </p>
          </form>
          {draft?.needsDates && (
            <p
              role="status"
              className="border border-warning bg-warning-soft p-3 text-sm text-warning"
            >
              {draft.question ??
                "Which date or date range should these todos use?"}{" "}
              Choose the dates above, then prepare the draft again.
            </p>
          )}
          {draft && !draft.needsDates && (
            <div className="space-y-4 border-t border-rule-soft pt-4">
              <div>
                <h4 className="font-serif text-lg">Review proposed changes</h4>
                <p className="mt-1 text-xs text-muted">
                  Only selected changes will be applied. Deletions move todos to
                  Trash.
                </p>
                {draft.contextTruncated && (
                  <p className="mt-2 text-xs text-warning">
                    Only part of your task history fitted in the AI context.
                    Review suggestions against the rest of your planner.
                  </p>
                )}
              </div>
              {!draft.operations.length && (
                <p className="text-sm text-muted">
                  No changes proposed. Try a more specific instruction.
                </p>
              )}
              {draft.operations.map((op, index) => {
                const before = op.id ? draft.before?.[op.id] : null;
                const after = proposedValue(op, before ?? null);
                const duplicate = duplicateWarning(index, op, before ?? null);
                return (
                  <article
                    key={index}
                    className={cn(
                      "space-y-3 border p-3",
                      op.type === "delete"
                        ? "border-danger bg-danger-soft"
                        : "border-rule-soft bg-paper",
                    )}
                  >
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={selected.includes(index)}
                        disabled={busy}
                        onChange={(e) => {
                          setSelected(
                            e.target.checked
                              ? [...selected, index]
                              : selected.filter((i) => i !== index),
                          );
                          token.current = crypto.randomUUID();
                        }}
                      />
                      <span className="text-sm font-medium">
                        {op.type === "create"
                          ? "Add todo"
                          : op.type === "delete"
                            ? "Move to Trash"
                            : "Update todo"}
                      </span>
                    </label>
                    {before && (
                      <div className="space-y-1 text-xs text-muted">
                        <p className="font-medium text-ink">Before</p>
                        <p className="break-words">
                          {before.title} · {before.dueDate ?? "Needs date"} ·{" "}
                          {before.priority} priority · {before.status} ·{" "}
                          {groups.find((group) => group.id === before.groupId)
                            ?.name ?? "Ungrouped"}
                        </p>
                        {before.notes && (
                          <p className="whitespace-pre-wrap break-words">
                            {before.notes}
                          </p>
                        )}
                        {before.subtasks?.length > 0 && (
                          <p>
                            {before.subtasks
                              .map(
                                (s) =>
                                  `${s.completed ? "Done: " : ""}${s.title}`,
                              )
                              .join("; ")}
                          </p>
                        )}
                      </div>
                    )}
                    {op.type !== "delete" && (
                      <div className="space-y-3">
                        <p className="text-xs font-medium">
                          {before ? "After" : "New todo"}
                        </p>
                        <label>
                          Title
                          <input
                            required
                            maxLength={200}
                            value={op.data?.title ?? before?.title ?? ""}
                            onChange={(e) =>
                              changeOperation(index, { title: e.target.value })
                            }
                            disabled={busy}
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            Date
                            <input
                              type="date"
                              required
                              value={op.data?.dueDate ?? before?.dueDate ?? ""}
                              onChange={(e) =>
                                changeOperation(index, {
                                  dueDate: e.target.value,
                                })
                              }
                              disabled={busy}
                            />
                          </label>
                          <label>
                            Priority
                            <select
                              value={
                                op.data?.priority ??
                                before?.priority ??
                                "normal"
                              }
                              onChange={(e) =>
                                changeOperation(index, {
                                  priority: e.target.value,
                                })
                              }
                              disabled={busy}
                            >
                              <option value="high">High</option>
                              <option value="normal">Normal</option>
                              <option value="low">Low</option>
                            </select>
                          </label>
                        </div>
                        <label>
                          Group
                          <select
                            value={
                              op.data?.groupId !== undefined
                                ? (op.data.groupId ?? "")
                                : (before?.groupId ?? "")
                            }
                            disabled={busy}
                            onChange={(event) =>
                              changeOperation(index, {
                                groupId: event.target.value || null,
                              })
                            }
                          >
                            <option value="">Ungrouped</option>
                            {groups.map((group) => (
                              <option key={group.id} value={group.id}>
                                {group.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Notes
                          <textarea
                            rows={2}
                            maxLength={2000}
                            value={op.data?.notes ?? before?.notes ?? ""}
                            onChange={(e) =>
                              changeOperation(index, { notes: e.target.value })
                            }
                            disabled={busy}
                          />
                        </label>
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={after.completed}
                            disabled={busy}
                            onChange={(event) => {
                              const completed = event.target.checked;
                              changeOperation(index, {
                                completed,
                                subtasks: after.subtasks.map((subtask) => ({
                                  ...subtask,
                                  completed,
                                })),
                              });
                            }}
                          />
                          <span>Complete todo and all subtasks</span>
                        </label>
                        {after.subtasks.map((sub, i) => (
                          <div
                            key={sub.id ?? i}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              aria-label={`Complete proposed subtask ${i + 1}`}
                              checked={sub.completed}
                              disabled={busy}
                              onChange={(event) =>
                                changeOperation(index, {
                                  subtasks: after.subtasks.map((item, n) =>
                                    n === i
                                      ? {
                                          ...item,
                                          completed: event.target.checked,
                                        }
                                      : item,
                                  ),
                                  completed: undefined,
                                })
                              }
                            />
                            <label className="min-w-0 flex-1">
                              Subtask {i + 1}
                              <input
                                maxLength={200}
                                value={sub.title}
                                disabled={busy}
                                onChange={(event) =>
                                  changeOperation(index, {
                                    subtasks: after.subtasks.map((item, n) =>
                                      n === i
                                        ? {
                                            ...item,
                                            title: event.target.value,
                                          }
                                        : item,
                                    ),
                                    completed: undefined,
                                  })
                                }
                              />
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={busy}
                              aria-label={`Remove proposed subtask ${i + 1}`}
                              onClick={() =>
                                changeOperation(index, {
                                  subtasks: after.subtasks.filter(
                                    (_, n) => n !== i,
                                  ),
                                  completed: undefined,
                                })
                              }
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            changeOperation(index, {
                              subtasks: [
                                ...after.subtasks,
                                {
                                  id: crypto.randomUUID(),
                                  title: "",
                                  completed: false,
                                },
                              ],
                              completed: undefined,
                            })
                          }
                        >
                          Add subtask
                        </Button>
                        {duplicate && (
                          <p
                            role="status"
                            className="border border-warning bg-warning-soft p-2 text-xs text-warning"
                          >
                            {duplicate}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
              {duplicateLookupTruncated && (
                <p className="text-xs text-muted">
                  Duplicate hints compare this draft with the first 100 active
                  todos. Review older todos in All if needed.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={
                    busy ||
                    !selected.length ||
                    draft.operations.some(
                      (op, i) =>
                        selected.includes(i) &&
                        op.type !== "delete" &&
                        (!(
                          op.data?.title ?? draft.before?.[op.id ?? ""]?.title
                        )?.trim() ||
                          !(
                            op.data?.dueDate ??
                            draft.before?.[op.id ?? ""]?.dueDate
                          ) ||
                          (op.data?.subtasks ?? []).some(
                            (sub) => !sub.title.trim(),
                          )),
                    )
                  }
                  onClick={() => void apply()}
                >
                  Confirm {selected.length}{" "}
                  {selected.length === 1 ? "change" : "changes"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setDraft(null);
                    setSelected([]);
                  }}
                >
                  Discard draft
                </Button>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm leading-relaxed text-danger">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-sm text-positive">
              {success}
            </p>
          )}
        </>
      )}
    </section>
  );
}
