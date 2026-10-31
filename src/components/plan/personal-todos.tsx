"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  Columns3,
  List,
  ListChecks,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  RotateCcw,
  Pencil,
  Zap,
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
import {
  istTodayIso,
  linkHost,
  safeHttpUrlCore,
} from "@/lib/plan/view-model";
import { cn } from "@/lib/utils";
import { shortDate as dateLabel, longDate } from "@/lib/format";
import { useOverlayFocus } from "../use-overlay-viewport";
import { DuotoneTile, PlainIcon } from "../icon";
import { PersonalCalendar } from "./personal-calendar";
import { TaskEditor } from "../tasks/task-editor";
import { TodoAiComposer } from "../tasks/ai-composer";
import { useTodoList, useTodoMutations } from "../use-todos-data";

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
  /** Personal-task category (todos backend always stores a value). */
  category?: string;
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

/** Personal task categories — mirrors personalTaskCategories in
 * lib/plan/progress.ts (the /api/tasks enum) and the todos backend default. */
const TASK_CATEGORIES: { id: string; label: string; icon: string; tile: string }[] = [
  { id: "practice", label: "Practice", icon: "file", tile: "bg-accent-soft text-accent" },
  { id: "revision", label: "Revision", icon: "refresh", tile: "bg-warning-soft text-warning" },
  { id: "error_review", label: "Error review", icon: "warning", tile: "bg-danger-soft text-danger" },
  { id: "notes", label: "Notes", icon: "fileCheck", tile: "bg-positive-soft text-positive" },
  { id: "formula", label: "Formula sheet", icon: "quant", tile: "bg-accent-soft text-accent" },
  { id: "other", label: "Custom", icon: "layers", tile: "bg-soft text-muted" },
];

function categoryMeta(id: string) {
  return TASK_CATEGORIES.find((c) => c.id === id) ?? TASK_CATEGORIES[5];
}

/** Page-level layout (reference): List = day/filtered list, Calendar =
 * month grid + selected-day list, Kanban = pending/completed columns. */
type PageLayout = "list" | "calendar" | "kanban";
export function PersonalTodos({
  initialDate,
  onChanged,
  aiAction,
  compact = false,
  dashboardColumn = false,
  focusDate,
  onOpenAi,
}: {
  initialDate?: string;
  compact?: boolean;
  /** Renders as a single self-contained Panel for the dashboard column. */
  dashboardColumn?: boolean;
  /** When provided (dashboard), the selected date follows the section's day stepper. */
  focusDate?: string;
  /** Opens the shell AI chat sheet on its Plan-todos tab (no local AI UI). */
  onOpenAi?: () => void;
  onChanged?: () => void;
  aiAction?: React.ReactNode;
}) {
  const overlayFocus = useOverlayFocus();
  const [internalDate, setInternalDate] = useState(
    initialDate ?? istTodayIso(),
  );
  /** Controlled when the dashboard's day stepper drives this panel. */
  const date = focusDate ?? internalDate;
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
  /** Select mode for bulk delete (list layout, full page only). */
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /** Pending bulk confirm: "selected" ids or "all" matching the query. */
  const [bulkConfirm, setBulkConfirm] = useState<null | "selected" | "all">(
    null,
  );
  const [rescheduling, setRescheduling] = useState<Todo | null>(null);
  const [newDate, setNewDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  /** Page layout (reference): list / calendar / kanban. */
  const [layout, setLayout] = useState<PageLayout>("list");
  /** Kanban board data: all open todos (both columns derive from it). */
  const query = new URLSearchParams({
    view,
    date,
    search,
    page: String(page),
    limit: compact ? (dashboardColumn ? "20" : "10") : "50",
    completion,
    priority,
    group: groupFilter,
    sort,
  });
  const { mutateTodoRequest } = useTodoMutations();
  const {
    data,
    error: loadError,
    loading,
    refresh: load,
  } = useTodoList<Response>(query.toString());
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
  function clearSelection() {
    setSelectedIds(new Set());
  }
  function toggleSelectMode(next?: boolean) {
    const on = next ?? !selectMode;
    setSelectMode(on);
    clearSelection();
  }
  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectView(next: View) {
    setView(next);
    setPage(1);
    clearSelection();
  }
  function selectDate(next: string) {
    if (!next) return;
    setInternalDate(next);
    setView("day");
    setPage(1);
    clearSelection();
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
  const dashboardCompleted =
    data?.items.filter((task) => task.status === "completed").length ?? 0;
  const dashboardProgress = data?.total
    ? Math.round((dashboardCompleted / data.total) * 100)
    : 0;
  /** Selection honored only for ids on the current page — stale ids from
   * filters/search changes drop off without needing an effect. */
  const pageIds = new Set((data?.items ?? []).map((task) => task.id));
  const visibleSelected = [...selectedIds].filter((id) => pageIds.has(id));
  async function runBulkDelete() {
    if (!bulkConfirm) return;
    const ok =
      bulkConfirm === "selected"
        ? await mutate("/api/todos", "DELETE", {
            ids: visibleSelected,
          })
        : await mutate(`/api/todos?${query}`, "DELETE", { scope: true });
    if (ok) {
      setBulkConfirm(null);
      clearSelection();
    }
  }
  const body = (
    <>
      {!dashboardColumn && (
        <>
          {/* ---- Reference header: tile + title, layout switch, Add task ---- */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <DuotoneTile name="check" tile="accent" className="size-12" />
              <div className="min-w-0">
                <h2 className="page-title">My tasks</h2>
                <p className="mt-1 text-sm text-muted">
                  Plan assignments and manage your study tasks in one place.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div
                role="group"
                aria-label="Task layout"
                className="segment-group"
              >
                {(
                  [
                    { id: "list", label: "List", icon: List },
                    { id: "calendar", label: "Calendar", icon: CalendarDays },
                    { id: "kanban", label: "Kanban", icon: Columns3 },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={layout === item.id}
                    className="segment"
                    onClick={() => {
                      setLayout(item.id);
                      clearSelection();
                    }}
                  >
                    <item.icon size={14} className="shrink-0" />
                    {item.label}
                  </button>
                ))}
              </div>
              <Button type="button" size="sm" onClick={() => setCreating(true)}>
                <Plus size={14} /> Add task
              </Button>
            </div>
          </div>

          {/* ---- Clickable KPI cards (reference) ---- */}
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {(
              [
                {
                  id: "all" as View,
                  icon: "clock" as const,
                  tile: "bg-accent-soft text-accent",
                  label: "Pending",
                  value: data?.counts.pending,
                },
                {
                  id: "completed" as View,
                  icon: "success" as const,
                  tile: "bg-positive-soft text-positive",
                  label: "Completed",
                  value: data?.counts.completed,
                },
                {
                  id: "overdue" as View,
                  icon: "warning" as const,
                  tile: "bg-danger-soft text-danger",
                  label: "Overdue",
                  value: data?.counts.overdue,
                },
                {
                  id: "today" as View,
                  icon: "target" as const,
                  tile: "bg-accent-soft text-accent",
                  label: "Focus today",
                  value: data?.counts.today,
                },
              ] as const
            ).map((kpi) => (
              <button
                key={kpi.label}
                type="button"
                onClick={() => {
                  selectView(kpi.id);
                  setLayout("list");
                }}
                aria-pressed={view === kpi.id}
                className={cn(
                  "group flex items-center gap-3 rounded-panel border bg-paper px-3.5 py-3 text-left transition-colors",
                  view === kpi.id
                    ? "border-accent"
                    : "border-rule-soft hover:border-accent/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-control",
                    kpi.tile,
                  )}
                  aria-hidden="true"
                >
                  <PlainIcon name={kpi.icon} size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.625rem] font-medium text-muted">
                    {kpi.label}
                  </span>
                  <span className="block font-serif text-xl leading-tight tabular text-ink">
                    {kpi.value ?? "—"}
                  </span>
                </span>
                <PlainIcon
                  name="chevronRight"
                  size={14}
                  className="shrink-0 text-muted transition-colors group-hover:text-accent"
                />
              </button>
            ))}
          </div>
        </>
      )}
      <div
        className={cn(
          "grid min-w-0 items-start gap-5",
          !dashboardColumn &&
            "lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]",
        )}
      >
        {!dashboardColumn && (
          <aside className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-1">
            <section
              className="rounded-panel border border-rule-soft bg-paper p-4"
              aria-label="Task calendar"
            >
              <PersonalCalendar
                selected={date}
                onSelect={selectDate}
                onAdd={() => setCreating(true)}
              />
            </section>
            {data && (
              <section
                className="rounded-panel border border-rule-soft bg-paper p-4"
                aria-label="Tasks summary"
              >
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <PlainIcon name="report" size={14} className="text-accent" />
                  Tasks summary{" "}
                  <span className="text-xs font-normal text-muted">
                    ({new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })})
                  </span>
                </p>
                <ul className="mt-3 divide-y divide-rule-soft text-xs">
                  {(
                    [
                      ["Pending", data.counts.pending, "bg-warning"],
                      ["Completed", data.counts.completed, "bg-positive"],
                      ["Overdue", data.counts.overdue, "bg-danger"],
                      ["Total tasks", data.counts.all, "bg-accent"],
                    ] as const
                  ).map(([label, count, dot]) => (
                    <li
                      key={label}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <span className="flex items-center gap-2 text-muted">
                        <span
                          className={cn("size-2 rounded-full", dot)}
                          aria-hidden="true"
                        />
                        {label}
                      </span>
                      <span className="font-medium tabular text-ink">
                        {count ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section
              className="rounded-panel border border-rule-soft bg-paper p-4"
              aria-label="Quick add"
            >
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <Zap size={14} className="text-accent" /> Quick add
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(
                  [
                    ["file", "bg-accent-soft text-accent", "Add mock", "mock"],
                    ["book", "bg-positive-soft text-positive", "Add sectional", "sectional"],
                    ["target", "bg-warning-soft text-warning", "Add topic", "topic"],
                    ["refresh", "bg-danger-soft text-danger", "Add revision", "revision"],
                  ] as const
                ).map(([icon, tile, label, kind]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setCreating(true);
                    }}
                    title={`Open the task editor${label === "Add mock" ? "" : ` (file the result under ${kind})`}`}
                    className="flex items-center gap-2 rounded-control border border-rule-soft bg-paper px-2.5 py-2 text-xs font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-[4px]",
                        tile,
                      )}
                      aria-hidden="true"
                    >
                      <PlainIcon name={icon} size={12} />
                    </span>
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </section>
            <section
              className="rounded-panel border border-rule-soft bg-paper p-4"
              aria-label="Focus tools"
            >
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <PlainIcon name="target" size={14} className="text-accent" />{" "}
                Focus tools
              </p>
              <div className="mt-3 grid gap-2">
                <a
                  href="/calendar"
                  className="inline-flex items-center gap-2 rounded-control border border-rule-soft px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent"
                >
                  <PlainIcon name="calendar" size={13} /> View study plan
                </a>
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-control border border-rule-soft px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent"
                >
                  <PlainIcon name="dashboard" size={13} /> Open dashboard
                </a>
              </div>
            </section>
          </aside>
        )}
        <div
          className={cn(
            "flex min-w-0 flex-col gap-4",
            !dashboardColumn && "lg:col-start-1 lg:row-start-1",
          )}
        >
          {compact && (
            <OverdueTodoPreview selectedDate={date} onEdit={setEditing} />
          )}
          {!compact && !dashboardColumn && (
            <details
              data-ai-planner
              className="border-b border-rule-soft pb-3"
            >
              <summary className="cursor-pointer text-xs font-medium">
                Plan tasks with AI
              </summary>
              <div className="mt-3">
                {aiAction ?? <TodoAiComposer onChanged={onChanged} />}
              </div>
            </details>
          )}
          {!dashboardColumn && layout === "kanban" ? (
            <KanbanBoard
              date={date}
              busy={busy}
              onEdit={setEditing}
              groupsOpen={groupsOpen}
              onToggleGroups={() => setGroupsOpen(!groupsOpen)}
            />
          ) : (
          <>
          <div className="overflow-hidden">
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-2",
                dashboardColumn ? "mb-4" : "mb-3",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <h3
                  id={dashboardColumn ? "dashboard-personal-date" : undefined}
                  className={cn(
                    "font-serif",
                    dashboardColumn ? "text-[1.1875rem]" : "text-xl",
                  )}
                >
                  {dashboardColumn
                    ? dateLabel(date)
                    : `Tasks for ${longDate(date)}`}
                </h3>
                {!dashboardColumn && (
                  <span className="rounded-pill bg-soft px-2 py-0.5 text-[0.625rem] font-medium text-muted">
                    {new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                )}
              </div>
              {dashboardColumn ? (
                <p className="text-xs tabular text-muted">
                  {data
                    ? `${data.total} ${data.total === 1 ? "task" : "tasks"}`
                    : "…"}
                </p>
              ) : (
                !compact && (
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="flex items-center gap-2 text-[0.625rem] tabular text-muted">
                      <span>
                        {data?.items.filter((t) => t.status === "completed")
                          .length ?? 0}
                        /{data?.total ?? 0} completed
                      </span>
                      <span className="h-1.5 w-16 overflow-hidden rounded-pill bg-soft">
                        <span
                          className="block h-full rounded-pill bg-accent transition-[width] duration-200"
                          style={{
                            width: `${
                              data?.total
                                ? (data.items.filter(
                                    (t) => t.status === "completed",
                                  ).length /
                                    data.total) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </span>
                    </div>
                    {date !== istTodayIso() && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => selectDate(istTodayIso())}
                      >
                        Today
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setGroupsOpen(!groupsOpen)}
                      aria-expanded={groupsOpen}
                    >
                      Manage groups
                    </Button>
                  </div>
                )
              )}
            </div>
            <div className="flex flex-col gap-2">
              <form
                className={cn(
                  dashboardColumn
                    ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,9rem)_auto]"
                    : "flex flex-wrap items-center gap-2",
                )}
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
                <div
                  className={cn(
                    "relative min-w-0 flex-1",
                    dashboardColumn && "col-span-2 sm:col-span-1",
                    !dashboardColumn && "basis-48",
                  )}
                >
                  {dashboardColumn && (
                    <List
                      size={14}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    />
                  )}
                  <input
                    ref={input}
                    id="quick-todo-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    required
                    placeholder={`Add a todo for ${dateLabel(date)}…`}
                    className={cn(
                      "min-w-0 w-full",
                      dashboardColumn &&
                        "h-[var(--control-height-sm)] py-0! pl-9!",
                    )}
                    disabled={busy}
                  />
                </div>
                <label className="sr-only" htmlFor="quick-todo-group">
                  Todo group
                </label>
                <select
                  id="quick-todo-group"
                  className={cn(
                    dashboardColumn
                      ? "h-[var(--control-height-sm)] w-full! min-w-0 py-0! text-xs"
                      : "w-auto! max-w-40",
                  )}
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
                {dashboardColumn ? (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={busy || !title.trim()}
                    className="shrink-0 px-3"
                  >
                    <Plus size={14} /> Add
                  </Button>
                ) : (
                  <Button disabled={busy || !title.trim()}>
                    <Plus size={16} />
                    Add todo
                  </Button>
                )}
              </form>
              {dashboardColumn && (
                <p className="text-[0.625rem] leading-relaxed text-muted">
                  Press Enter to add. Open a task to add notes, priority, or
                  subtasks.
                </p>
              )}
              {!dashboardColumn && (
                <p className="text-xs text-muted">
                  Press Enter to add another. Add notes, priority, or subtasks
                  using Edit.
                </p>
              )}
            </div>
            {!dashboardColumn && !compact && (
              <div
                className="mt-3 flex flex-wrap items-center gap-1.5"
                aria-label="Personal task categories"
              >
                {TASK_CATEGORIES.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1.5 rounded-pill border border-rule-soft bg-paper px-2.5 py-1 text-[0.6875rem] font-medium text-muted"
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[3px]",
                        cat.tile,
                      )}
                      aria-hidden="true"
                    >
                      <PlainIcon name={cat.icon as "file"} size={10} />
                    </span>
                    {cat.label}
                  </span>
                ))}
              </div>
            )}
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
                        clearSelection();
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
                        clearSelection();
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
                        clearSelection();
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
                        clearSelection();
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
          {!dashboardColumn && (
            <div className="flex flex-wrap items-center gap-2 border-b border-rule-soft pb-2">
              <div
                role="group"
                aria-label="Personal todo views"
                className="flex flex-wrap items-center gap-1"
              >
              {(compact
                ? VIEWS.filter((item) => item.id === "day")
                : VIEWS.filter((item) => item.id !== "needsdate")
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={view === item.id}
                  onClick={() => selectView(item.id)}
                  className={cn(
                    "min-h-9 border-b-2 px-3 text-[0.8125rem] font-medium transition-colors",
                    view === item.id
                      ? "border-accent text-ink"
                      : "border-transparent text-muted hover:text-ink",
                  )}
                >
                  {item.label === "Selected day" ? "All tasks" : item.label}
                  {data?.counts[item.id] != null && item.id !== "day" ? (
                    <span className="ml-1 tabular-nums">
                      {data.counts[item.id]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
              {view !== "trash" && (
                <Button
                  type="button"
                  variant={selectMode ? "default" : "outline"}
                  size="sm"
                  aria-pressed={selectMode}
                  onClick={() => toggleSelectMode()}
                >
                  <ListChecks size={13} /> Select
                </Button>
              )}
              {view !== "trash" && (data?.total ?? 0) > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-danger/40 text-danger hover:bg-danger-soft"
                  onClick={() => setBulkConfirm("all")}
                >
                  <Trash2 size={13} /> Delete all
                  {data?.total != null ? (
                    <span className="tabular-nums">({data.total})</span>
                  ) : null}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={13} /> Filter &amp; sort
              </Button>
              <div className="relative min-w-44">
                <Search size={14} className="absolute left-3 top-3 text-muted" />
                <input
                  aria-label="Search personal todos"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                    clearSelection();
                  }}
                  placeholder="Search tasks…"
                  className="pl-9!"
                />
              </div>
            </div>
            </div>
          )}
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
            <div
              className={cn(
                "border-y border-rule-soft text-center",
                dashboardColumn ? "px-4 py-7" : "px-4 py-8",
              )}
            >
              <h3 className="font-serif text-lg">
                {view === "trash"
                  ? "Trash is empty"
                  : view === "needsdate"
                    ? "Every todo has a date"
                    : search
                      ? "No matching todos"
                      : dashboardColumn
                        ? "No personal tasks for this day"
                        : "A clear page for your work"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted">
                {view === "trash"
                  ? "Deleted todos appear here and can be restored with their subtasks."
                  : view === "needsdate"
                    ? "Older tasks without a date will appear here. Assign a date to bring them into your planner."
                    : search
                      ? "Try another search or choose a different view."
                      : dashboardColumn
                        ? "Use the quick-add field above, or open the full task workspace for more options."
                        : "Add a title above to begin your checklist, or ask AI to prepare a draft for review."}
              </p>
              {!search && view !== "trash" && view !== "needsdate" && !compact && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button size="sm" onClick={() => setCreating(true)}>
                    <Plus size={14} /> Add your first task
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const details = document.querySelector<HTMLDetailsElement>("details[data-ai-planner]");
                      if (details) {
                        details.open = true;
                        details.scrollIntoView({ block: "nearest" });
                      }
                    }}
                  >
                    <Sparkles size={14} /> Plan with AI
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {selectMode && view !== "trash" && (
                <div className="flex flex-wrap items-center gap-2 border border-rule-soft bg-canvas px-3 py-2">
                  <span className="text-xs font-medium tabular-nums text-ink">
                    {visibleSelected.length} selected
                  </span>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || visibleSelected.length === data?.items.length}
                      onClick={() =>
                        setSelectedIds(
                          new Set((data?.items ?? []).map((task) => task.id)),
                        )
                      }
                    >
                      <ListChecks size={13} /> Select all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy || !visibleSelected.length}
                      onClick={clearSelection}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={busy || !visibleSelected.length}
                      onClick={() => setBulkConfirm("selected")}
                    >
                      <Trash2 size={13} /> Delete selected
                      {visibleSelected.length > 0 && (
                        <span className="tabular-nums">
                          ({visibleSelected.length})
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              {[...buckets.entries()].map(([key, items]) => {
                const first = items[0];
                const group = visibleGroups.find(
                  (g) => g.id === (first.groupId ?? ""),
                );
                return (
                  <section
                    key={key}
                    className={cn(
                      "overflow-hidden border-y border-rule-soft",
                      dashboardColumn && "first:border-t-0",
                    )}
                  >
                    <div
                      className={cn(
                        "flex flex-wrap items-baseline justify-between gap-2 border-b border-rule-soft bg-canvas",
                        dashboardColumn ? "px-3 py-2.5" : "px-4 py-3",
                      )}
                    >
                      <h3
                        className={cn(
                          "font-serif",
                          dashboardColumn ? "text-[0.9375rem]" : "text-lg",
                        )}
                      >
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
                        className={cn(
                          "group/task border-b border-rule-soft last:border-b-0",
                          dashboardColumn ? "px-3 py-3" : "py-3",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {selectMode && !todo.deletedAt && (
                            <input
                              type="checkbox"
                              className="mt-1"
                              aria-label={`Select ${todo.title}`}
                              checked={selectedIds.has(todo.id)}
                              disabled={busy}
                              onChange={() => toggleSelected(todo.id)}
                            />
                          )}
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
                            {dashboardColumn ? (
                              <button
                                type="button"
                                onClick={() => setEditing(todo)}
                                className={cn(
                                  "block w-full break-words text-left text-sm font-medium leading-snug underline-offset-4 hover:text-accent hover:underline",
                                  todo.status === "completed" &&
                                    "text-muted line-through",
                                )}
                              >
                                {todo.title}
                                <span className="sr-only">
                                  {" "}— open task details
                                </span>
                              </button>
                            ) : (
                              <h4
                                className={cn(
                                  "break-words text-sm font-medium",
                                  todo.status === "completed" &&
                                    "text-muted line-through",
                                )}
                              >
                                {todo.title}
                              </h4>
                            )}
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
                          {!dashboardColumn && (
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
                          )}
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
          {data && !dashboardColumn && (data.total > data.limit || page > 1) && (
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
                  onClick={() => {
                    setPage(page - 1);
                    clearSelection();
                  }}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page * data.limit >= data.total}
                  onClick={() => {
                    setPage(page + 1);
                    clearSelection();
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </>
  );
  return (
    <section
      aria-label="Personal todo planner"
      className={cn(
        "personal-workspace",
        dashboardColumn ? "min-w-0" : "flex min-w-0 flex-col gap-4",
      )}
    >
      {dashboardColumn ? (
        <section
          className="panel overflow-hidden"
          aria-labelledby="dashboard-personal-tasks-heading"
        >
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-rule-soft px-4 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <DuotoneTile
                name="check"
                size={16}
                tile="accent"
                className="size-9"
              />
              <div className="min-w-0">
                <h2
                  id="dashboard-personal-tasks-heading"
                  className="font-serif text-[1.1875rem] font-medium leading-tight tracking-[-0.02em]"
                >
                  Personal tasks
                </h2>
                <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted">
                  Your own work for the selected day.
                </p>
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {onOpenAi && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Plan personal tasks with AI"
                  title="Plan personal tasks with AI"
                  onClick={onOpenAi}
                >
                  <Sparkles size={14} />
                </Button>
              )}
              <Button asChild variant="outline" size="sm" className="h-8">
                <a href="/my-tasks">
                  <List size={13} />
                  All tasks
                </a>
              </Button>
            </div>
          </header>

          <div className="border-b border-rule-soft bg-canvas/60 px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <p className="font-medium text-ink" aria-live="polite">
                {data
                  ? `${dashboardCompleted} of ${data.total} complete`
                  : "Loading task progress…"}
              </p>
              <p className="tabular text-muted">{dashboardProgress}%</p>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden bg-soft"
              role="progressbar"
              aria-label="Selected day task completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={dashboardProgress}
            >
              <span
                className="block h-full bg-accent transition-[width] duration-[var(--dur-enter)] motion-reduce:transition-none"
                style={{ width: `${dashboardProgress}%` }}
              />
            </div>
          </div>

          <div
            className="px-4 py-4"
            aria-labelledby="dashboard-personal-date"
          >
            {body}
          </div>
        </section>
      ) : (
        body
      )}
      {creating && (
        <TaskEditor
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
            const ok = await mutate("/api/todos", "POST", body);
            if (ok) setCreating(false);
            return ok;
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
      {bulkConfirm && (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open && !busy) setBulkConfirm(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25" />
            <Dialog.Content {...overlayFocus} className="task-confirm-dialog">
              <Dialog.Title className="font-serif text-xl">
                {bulkConfirm === "selected"
                  ? `Move ${visibleSelected.length} selected ${
                      visibleSelected.length === 1 ? "todo" : "todos"
                    } to Trash?`
                  : `Move all ${data?.total ?? 0} ${
                      (data?.total ?? 0) === 1 ? "todo" : "todos"
                    } to Trash?`}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted">
                {bulkConfirm === "selected"
                  ? "Selected todos and their subtasks can be restored later."
                  : "Applies to everything matching the current view, search, and filters. You can restore them from Trash."}
              </Dialog.Description>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setBulkConfirm(null)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" disabled={busy} onClick={() => void runBulkDelete()}>
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
        <TaskEditor
          key={editing.id}
          todo={editing}
          groups={visibleGroups}
          busy={busy}
          error={error}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            const ok = await mutate(
              `/api/todos/${editing.id}`,
              "PATCH",
              {
                version: editing.version,
                ...body,
              },
            );
            if (ok) setEditing(null);
            return ok;
          }}
        />
      )}
    </section>
  );
}

/** Kanban board (reference): Pending → Completed columns. Cards move via the
 * row checkbox toggle; the query loads every open todo so both columns fill
 * from one fetch. Drag-and-drop is deliberately not built — the checkbox is
 * the same mutation the list uses, so state stays single-source. */
function KanbanBoard({
  date,
  busy,
  onEdit,
  groupsOpen,
  onToggleGroups,
}: {
  date: string;
  busy: boolean;
  onEdit: (todo: Todo) => void;
  groupsOpen: boolean;
  onToggleGroups: () => void;
}) {
  const { data, error, loading, refresh } = useTodoList<Response>(
    `view=day&date=${date}&limit=100`,
  );
  const { mutateTodoRequest } = useTodoMutations();
  const open = (data?.items ?? []).filter((t) => t.status !== "completed");
  const done = (data?.items ?? []).filter((t) => t.status === "completed");
  const columns: { label: string; count: number; items: Todo[]; tint: string }[] = [
    { label: "Pending", count: open.length, items: open, tint: "bg-accent" },
    { label: "Completed", count: done.length, items: done, tint: "bg-positive" },
  ];
  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Drag-free board: toggle a card&apos;s checkbox to move it across.
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={onToggleGroups} aria-expanded={groupsOpen}>
          Manage groups
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-xs text-danger">
          {error}{" "}
          <button type="button" className="underline" onClick={refresh}>
            Retry
          </button>
        </p>
      )}
      {loading ? (
        <p role="status" className="py-10 text-center text-muted">
          Loading your board…
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {columns.map((column) => (
            <section
              key={column.label}
              aria-label={`${column.label} tasks`}
              className="rounded-panel border border-rule-soft bg-canvas/60 p-2.5"
            >
              <p className="mb-2.5 flex items-center gap-2 px-1 text-xs font-medium text-ink">
                <span className={cn("size-2 rounded-full", column.tint)} aria-hidden="true" />
                {column.label}
                <span className="text-muted tabular">{column.count}</span>
              </p>
              <ul className="flex min-h-24 flex-col gap-2">
                {column.items.length === 0 && (
                  <li className="rounded-control border border-dashed border-rule px-3 py-4 text-center text-[0.6875rem] text-muted">
                    Nothing here yet.
                  </li>
                )}
                {column.items.map((todo) => (
                  <li
                    key={todo.id}
                    className="rounded-control border border-rule-soft bg-paper px-3 py-2.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        aria-label={`Move ${todo.title} to ${todo.status === "completed" ? "Pending" : "Completed"}`}
                        checked={todo.status === "completed"}
                        disabled={busy}
                        onChange={async (e) => {
                          await mutateTodoRequest(`/api/todos/${todo.id}`, "PATCH", {
                            version: todo.version,
                            completed: e.target.checked,
                          });
                          refresh();
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => onEdit(todo)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span
                          className={cn(
                            "block break-words text-[0.8125rem] font-medium",
                            todo.status === "completed" && "text-muted line-through",
                          )}
                        >
                          {todo.title}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.625rem] text-muted">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-pill border border-rule-soft px-1.5 py-0.5",
                            )}
                          >
                            <span
                              className={cn(
                                "size-2.5 rounded-[3px]",
                                categoryMeta(todo.category ?? "other").tile,
                              )}
                              aria-hidden="true"
                            />
                            {categoryMeta(todo.category ?? "other").label}
                          </span>
                          {todo.dueDate && <span className="tabular">{dateLabel(todo.dueDate)}</span>}
                          {todo.priority === "high" && (
                            <span className="font-medium text-accent">High</span>
                          )}
                        </span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function OverdueTodoPreview({
  selectedDate,
  onEdit,
}: {
  selectedDate: string;
  onEdit: (todo: Todo) => void;
}) {
  const { data, error, refresh } = useTodoList<Response>(
    `view=overdue&limit=3&excludeDate=${selectedDate}`,
  );
  if (error)
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-2 border-y border-danger/30 bg-danger-soft px-3 py-2.5 text-xs text-danger"
      >
        <p>{error}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-danger hover:bg-danger/10 hover:text-danger"
          onClick={refresh}
        >
          Retry
        </Button>
      </div>
    );
  if (!data?.total) return null;
  return (
    <section
      aria-label="Overdue personal tasks"
      className="border-y border-danger/30 bg-danger-soft/50 px-3 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-danger">
          <PlainIcon name="warning" size={13} />
          {data.total} overdue {data.total === 1 ? "task" : "tasks"}
        </h3>
        <a
          href="/my-tasks"
          className="text-xs font-medium text-danger underline underline-offset-4"
        >
          Review all
        </a>
      </div>
      <ul className="mt-2 divide-y divide-danger/20">
        {data.items.map((todo) => (
          <li key={todo.id}>
            <button
              type="button"
              onClick={() => onEdit(todo)}
              className="flex min-h-10 w-full items-center justify-between gap-3 py-2 text-left text-xs text-ink hover:text-danger"
            >
              <span className="min-w-0 break-words">{todo.title}</span>
              <span className="shrink-0 tabular text-danger">
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


/** The AI todo planner lives in components/tasks/ai-composer.tsx; this
 * re-export keeps the AI sheet import stable. */
export { TodoAiComposer };
