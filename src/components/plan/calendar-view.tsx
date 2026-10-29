"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CalendarRange, CalendarCog, ListChecks, Lightbulb } from "lucide-react";
import { Panel } from "../dashboard-panels";
import { DuotoneTile, PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { AttemptRecordCard } from "../attempt-outcome-card";
import {
  CategoryChip,
  CompleteToggle,
  PlanErrorCard,
  PersonalTaskRow,
  ResultLine,
  StatusDot,
  nextStatus,
  statusOf,
} from "./plan-shared";
import { EventDialog } from "./event-dialog";
import { usePlanData } from "../use-plan-data";
import { istDateKey, longDate, shortDate } from "@/lib/format";
import type { Attempt } from "@/lib/domain";
import {
  addIsoDays,
  dayAssignmentStats,
  findDayByDate,
  isoMonthEnd,
  isoMonthStart,
  istTodayIso,
  isMockType,
  personalTasksByDate,
  upcomingMocks,
  weekRange,
  type PersonalTaskView,
  type PlanDayView,
  type PlanTaskView,
} from "@/lib/plan/view-model";

/**
 * Study Planner — four views (month/week/day/agenda) over the merged
 * plan+progress payload, laid out like the reference: tile + title header,
 * icon view tabs, KPI cards, a tinted-chip calendar with a day panel, and a
 * per-day focus strip. The plan carries no clock times, so blocks are
 * ordered lists (chronological by plan day), not hour grids. Selecting an
 * event opens the shared detail dialog; the deep link for a date is
 * /plan/<date>, reachable from every item.
 */

type CalendarMode = "month" | "week" | "day" | "agenda";

const MODES: { id: CalendarMode; label: string; icon: typeof CalendarDays }[] = [
  { id: "month", label: "Month", icon: CalendarDays },
  { id: "week", label: "Week", icon: CalendarRange },
  { id: "day", label: "Day", icon: CalendarCog },
  { id: "agenda", label: "Agenda", icon: ListChecks },
];

/** Category → chip tint, so a day's mix of work is readable at a glance. */
export function taskChipClass(task: PlanTaskView): string {
  if (task.completed) return "bg-positive-soft text-positive line-through";
  if (isMockType(task.type)) return "bg-accent-soft text-accent";
  if (task.type.endsWith("_sectional")) return "bg-positive-soft text-positive";
  if (task.type === "maths_topic") return "bg-warning-soft text-warning";
  return "bg-soft text-muted";
}

const CHIP_LEGEND: { label: string; cls: string }[] = [
  { label: "Mock test", cls: "bg-accent-soft text-accent" },
  { label: "Sectional test", cls: "bg-positive-soft text-positive" },
  { label: "Topic test", cls: "bg-warning-soft text-warning" },
  { label: "Other", cls: "bg-soft text-muted" },
];

function barColor(type: PlanTaskView["type"], completed: boolean): string {
  if (completed) return "bg-positive";
  if (isMockType(type)) return "bg-accent";
  if (type.endsWith("_sectional")) return "bg-positive";
  if (type === "maths_topic") return "bg-warning";
  return "bg-rule-soft";
}

/** Per-category icon for event tiles (mock/sectional/topic/other). */
function taskIcon(type: PlanTaskView["type"]): "file" | "book" | "target" | "layers" {
  if (isMockType(type)) return "file";
  if (type.endsWith("_sectional")) return "book";
  if (type === "maths_topic") return "target";
  return "layers";
}

function taskTileTint(type: PlanTaskView["type"]): string {
  if (isMockType(type)) return "bg-accent-soft text-accent";
  if (type.endsWith("_sectional")) return "bg-positive-soft text-positive";
  if (type === "maths_topic") return "bg-warning-soft text-warning";
  return "bg-soft text-muted";
}

/** Thin progress ring (the day/week completion donut). */
function MiniRing({
  value,
  total,
  size = 44,
}: {
  value: number;
  total: number;
  size?: number;
}) {
  const ratio = total > 0 ? value / total : 0;
  const radius = size / 2 - 4;
  const c = 2 * Math.PI * radius;
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${value} of ${total} done`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="4" style={{ stroke: "var(--soft)" }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          style={{ stroke: "var(--accent)", strokeDasharray: `${c * ratio} ${c}` }}
        />
      </svg>
      <span className="absolute font-serif text-[11px] font-medium tabular text-ink">
        {Math.round(ratio * 100)}%
      </span>
    </span>
  );
}

function clampToPlan(
  plan: { startDate: string; endDate: string },
  iso: string,
) {
  if (iso < plan.startDate) return plan.startDate;
  if (iso > plan.endDate) return plan.endDate;
  return iso;
}

export function CalendarView({
  planApi,
  attempts,
  onAddMock,
  onOpenAttempt,
  onSelectedDateChange,
}: {
  planApi: ReturnType<typeof usePlanData>;
  attempts: Attempt[];
  onAddMock: (date: string, task?: PlanTaskView) => void;
  onOpenAttempt: (attempt: Attempt) => void;
  onSelectedDateChange?: (date: string) => void;
}) {
  const { plan, loading, error, refresh, updateTask, updatePersonalTask } =
    planApi;
  const router = useRouter();
  const today = istTodayIso();
  const [mode, setMode] = useState<CalendarMode>("month");
  const [selected, setSelected] = useState(() => today);
  const [event, setEvent] = useState<
    { task: PlanTaskView; day: PlanDayView } | undefined
  >();

  /** Personal tasks indexed by due date; due-date-less tasks stay in My Tasks. */
  const personalByDate = useMemo(() => personalTasksByDate([]), []);
  const cyclePersonalStatus = (task: PersonalTaskView) => {
    const status = statusOf(task, today);
    void updatePersonalTask(task.id, { status: nextStatus(status) });
  };
  const openMyTasks = () => router.push("/my-tasks");
  const markAllDone = (day: PlanDayView) => {
    day.tasks
      .filter((task) => !task.completed)
      .forEach((task) => updateTask(task.key, { completed: true }));
  };

  useEffect(() => {
    onSelectedDateChange?.(selected);
  }, [selected, onSelectedDateChange]);

  if (loading && !plan)
    return (
      <div className="panel p-6 animate-pulse" aria-busy="true">
        <div className="h-5 w-40 bg-rule-soft rounded mb-4" />
        <div className="h-64 w-full bg-rule-soft rounded" />
      </div>
    );
  if (!plan)
    return (
      <PlanErrorCard
        message={error || "The study plan could not load."}
        onRetry={() => void refresh()}
      />
    );

  const selectedDay = findDayByDate(plan.days, selected);

  /* Planner KPIs: planned days, completed days, this week's load, next mock. */
  const plannedDays = plan.days.filter((day) => day.tasks.length > 0);
  const completedDays = plannedDays.filter((day) =>
    dayAssignmentStats(day).dayCompleted,
  ).length;
  const week = weekRange(today);
  const weekDays = plan.days.filter(
    (day) =>
      day.date >= week.from && day.date <= week.to && day.tasks.length > 0,
  );
  const weekTotal = weekDays.reduce((sum, day) => sum + day.tasks.length, 0);
  const weekDone = weekDays.reduce(
    (sum, day) => sum + dayAssignmentStats(day).completed,
    0,
  );
  const nextMock = upcomingMocks(plan.days, today, 1_000).find(({ task }) =>
    isMockType(task.type),
  );
  const kpis = [
    {
      icon: "history" as const,
      tile: "bg-accent-soft text-accent",
      label: "Total mocks",
      value: `${plannedDays.length}`,
    },
    {
      icon: "success" as const,
      tile: "bg-positive-soft text-positive",
      label: "Completed",
      value: `${completedDays} (${Math.round((completedDays / Math.max(1, plannedDays.length)) * 100)}%)`,
    },
    {
      icon: "clock" as const,
      tile: "bg-accent-soft text-accent",
      label: "This week",
      value: `${weekDone}/${weekTotal}`,
    },
    {
      icon: "calendar" as const,
      tile: "bg-warning-soft text-warning",
      label: "Next mock",
      value: nextMock ? shortDate(nextMock.task.date) : "—",
    },
  ];

  const step = (direction: 1 | -1) => {
    const next =
      mode === "month"
        ? shiftMonth(selected, direction)
        : addIsoDays(selected, direction * (mode === "week" ? 7 : 1));
    setSelected(clampToPlan(plan, next));
  };

  const dayAttempts = attempts.filter(
    (attempt) => istDateKey(attempt.completedAt) === selected,
  );
  const asideAgenda = mode === "month" || mode === "week";

  const dayPanel = (compact: boolean) => (
    <SelectedDayAgenda
      day={selectedDay}
      today={today}
      compact={compact}
      attempts={dayAttempts}
      onAddMock={onAddMock}
      onOpenAttempt={onOpenAttempt}
      onOpenTask={(task, day) => setEvent({ task, day })}
      personalTasks={personalByDate.get(selected) ?? []}
      onCyclePersonal={cyclePersonalStatus}
      onEditPersonal={openMyTasks}
      onMarkAllDone={selectedDay ? () => markAllDone(selectedDay) : undefined}
    />
  );

  return (
    <div>
      {/* ---- Header: tile + title, KPI row (reference layout) ---- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <DuotoneTile name="calendar" tile="accent" className="size-12" />
          <div className="min-w-0">
            <h1 className="page-title">Study Planner</h1>
            <p className="mt-1 text-sm text-muted">
              Plan, track and complete your mock tests, revision and important
              deadlines.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search plan tasks</span>
            <PlainIcon
              name="search"
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              data-plan-search
              placeholder="Search mocks, topics…"
              className="w-52 py-2 pl-9 pr-3 text-xs"
            />
          </label>
          <Button size="sm" onClick={() => onAddMock(selected)}>
            <PlainIcon name="plus" size={13} /> Add mock
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-[auto_1fr]">
        <div
          role="group"
          aria-label="Calendar view"
          className="segment-group self-start"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              className="segment"
              onClick={() => setMode(m.id)}
            >
              <m.icon size={14} className="shrink-0" />
              {m.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="flex items-center gap-2.5 rounded-panel border border-rule-soft bg-paper px-3 py-2.5"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-control ${kpi.tile}`}
                aria-hidden="true"
              >
                <PlainIcon name={kpi.icon} size={15} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                  {kpi.label}
                </p>
                <p className="mt-0.5 truncate font-serif text-lg leading-none tabular text-ink">
                  {kpi.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Calendar card: period header + grid (reference layout) ---- */}
      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(330px,1fr)]">
        <div className="min-w-0">
          {mode !== "day" && mode !== "agenda" ? (
            <Panel
              title={periodTitle(mode, selected)}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="day-nav">
                    <button
                      type="button"
                      className="day-nav-step"
                      aria-label="Previous period"
                      onClick={() => step(-1)}
                    >
                      <PlainIcon name="arrowLeft" size={14} />
                    </button>
                    <button
                      type="button"
                      className="day-nav-step"
                      aria-label="Next period"
                      onClick={() => step(1)}
                    >
                      <PlainIcon name="arrowRight" size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(clampToPlan(plan, today))}
                    className="nav-button !w-auto px-3 py-2 text-xs"
                  >
                    Today
                  </button>
                  <label className="flex items-center gap-2 text-xs">
                    <span className="sr-only">Jump to date</span>
                    <input
                      type="date"
                      className="!w-auto py-2 text-xs"
                      min={plan.startDate}
                      max={plan.endDate}
                      value={selected}
                      onChange={(e) => e.target.value && setSelected(e.target.value)}
                    />
                  </label>
                </div>
              }
            >
              <div className="px-4 pb-5 pt-1 sm:px-6">
                {mode === "month" && (
                  <MonthView
                    plan={plan}
                    selected={selected}
                    today={today}
                    personalByDate={personalByDate}
                    onSelect={setSelected}
                  />
                )}
                {mode === "week" && (
                  <WeekView
                    plan={plan}
                    selected={selected}
                    today={today}
                    personalByDate={personalByDate}
                    onSelect={setSelected}
                  />
                )}
              </div>
            </Panel>
          ) : mode === "day" ? (
            <DayView
              plan={plan}
              selected={selected}
              onStep={(delta) => step(delta)}
              onToday={() => setSelected(clampToPlan(plan, today))}
              onOpenTask={(task, day) => setEvent({ task, day })}
            />
          ) : (
            <AgendaList
              plan={plan}
              today={today}
              onOpenTask={(task, day) => setEvent({ task, day })}
              onLogResult={(task) => onAddMock(task.date, task)}
              attempts={attempts}
              onOpenAttempt={onOpenAttempt}
              personalByDate={personalByDate}
              onCyclePersonal={cyclePersonalStatus}
              onEditPersonal={openMyTasks}
            />
          )}
        </div>
        {asideAgenda && (
          <aside className="min-w-0 xl:sticky xl:top-[72px] xl:self-start">
            {dayPanel(true)}
          </aside>
        )}
      </div>

      <EventDialog
        task={event?.task ?? null}
        day={event?.day}
        onClose={() => setEvent(undefined)}
        onToggleComplete={(task) => {
          updateTask(task.key, { completed: !task.completed });
          setEvent((prev) =>
            prev
              ? {
                  ...prev,
                  task: { ...prev.task, completed: !prev.task.completed },
                }
              : prev,
          );
        }}
        onOpenPlanDay={(date) => {
          setEvent(undefined);
          router.push(`/plan/${date}`);
        }}
      />
    </div>
  );
}

function periodTitle(mode: CalendarMode, selected: string) {
  if (mode === "month")
    return new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  if (mode === "week") {
    const range = weekRange(selected);
    return `${shortDate(range.from)} – ${shortDate(range.to)}`;
  }
  return longDate(selected);
}

function shiftMonth(iso: string, direction: 1 | -1) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + direction);
  return date.toISOString().slice(0, 10);
}

/** Monday-led month grid covering the displayed month. Plan tasks render as
 * tinted chips, personal tasks as dashed chips — plan vs personal ownership
 * stays readable. Matches the reference: rounded card cells, selected ring,
 * "+N more" overflow. */
function MonthView({
  plan,
  selected,
  today,
  personalByDate,
  onSelect,
}: {
  plan: NonNullable<ReturnType<typeof usePlanData>["plan"]>;
  selected: string;
  today: string;
  personalByDate: Map<string, PersonalTaskView[]>;
  onSelect: (iso: string) => void;
}) {
  const byDate = useMemo(
    () => new Map(plan.days.map((day) => [day.date, day])),
    [plan],
  );
  const start = weekStartIsoLocal(isoMonthStart(selected));
  const end = isoMonthEnd(selected);
  const cells: string[] = [];
  for (let iso = start; iso <= addIsoDays(end, 6); iso = addIsoDays(iso, 1))
    cells.push(iso);
  return (
    <div>
      <div
        className="grid grid-cols-7 gap-1.5"
        role="grid"
        aria-label="Month calendar"
      >
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => (
          <div
            key={name}
            role="columnheader"
            className="px-1 pb-1 text-center text-[11px] font-medium text-muted"
          >
            <span className="hidden sm:inline">{name}</span>
            <span className="sm:hidden">{name[0]}</span>
          </div>
        ))}
        {cells.map((iso) => {
          const day = byDate.get(iso);
          const stats = day ? dayAssignmentStats(day) : null;
          const personal = personalByDate.get(iso) ?? [];
          const personalOutstanding = personal.filter(
            (task) => statusOf(task, today) !== "completed",
          ).length;
          const isSelected = iso === selected;
          const isToday = iso === today;
          const inMonth = iso.slice(0, 7) === selected.slice(0, 7);
          return (
            <button
              key={iso}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${iso}${day ? ` · ${stats?.completed}/${stats?.total} plan done` : " · outside the plan"}${personal.length ? ` · ${personalOutstanding} personal outstanding` : ""}${isToday ? " · today" : ""}`}
              onClick={() => onSelect(iso)}
              className={cn(
                "flex min-h-16 flex-col rounded-panel border p-1.5 text-left align-top transition-colors sm:min-h-24",
                day
                  ? "border-rule-soft bg-paper hover:border-accent/50"
                  : "border-rule-soft/60 bg-canvas opacity-60",
                !inMonth && "opacity-45",
                isSelected
                  ? "border-accent ring-1 ring-accent"
                  : "",
              )}
            >
              <span className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[11px] tabular",
                    isToday
                      ? "bg-accent font-semibold text-paper"
                      : isSelected
                        ? "font-semibold text-accent"
                        : "text-muted",
                  )}
                >
                  {Number(iso.slice(8))}
                </span>
                <span className="flex items-center gap-1">
                  {stats && stats.completed === stats.total && (
                    <PlainIcon name="check" size={10} className="text-positive" />
                  )}
                  {personal.length > 0 && (
                    <span className="flex -space-x-0.5" aria-hidden="true">
                      {personal.slice(0, 3).map((task) => (
                        <StatusDot
                          key={task.id}
                          status={statusOf(task, today)}
                          size={7}
                        />
                      ))}
                    </span>
                  )}
                </span>
              </span>
              {(day || personal.length > 0) && (
                <span className="mt-1 hidden flex-col gap-0.5 sm:flex">
                  {day?.tasks.slice(0, 2).map((task) => (
                    <span
                      key={task.key}
                      className={`flex items-center gap-1 truncate rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium leading-tight ${taskChipClass(task)}`}
                    >
                      <span
                        className={cn("size-1 shrink-0 rounded-full", barColor(task.type, task.completed))}
                        aria-hidden="true"
                      />
                      <span className="truncate">{task.name}</span>
                    </span>
                  ))}
                  {day && day.tasks.length > 2 && (
                    <span className="text-[10px] text-muted px-1">
                      +{day.tasks.length - 2} more
                    </span>
                  )}
                  {personal.slice(0, 2).map((task) => (
                    <span
                      key={task.id}
                      className={`flex items-center gap-1 truncate text-[10px] leading-tight rounded-[4px] border border-dashed px-1 py-0.5 ${
                        task.status === "completed"
                          ? "border-positive/40 bg-transparent text-positive line-through"
                          : statusOf(task, today) === "overdue"
                            ? "border-danger/50 bg-transparent text-danger"
                            : "border-rule bg-transparent text-muted"
                      }`}
                    >
                      <StatusDot status={statusOf(task, today)} size={6} />
                      <span className="truncate">{task.title}</span>
                    </span>
                  ))}
                  {personal.length > 2 && (
                    <span className="text-[10px] text-muted px-1">
                      +{personal.length - 2} personal
                    </span>
                  )}
                </span>
              )}
              {day && (
                <span
                  className="mt-1 flex gap-0.5 sm:hidden"
                  aria-hidden="true"
                >
                  {day.tasks.slice(0, 4).map((task) => (
                    <span
                      key={task.key}
                      className={`h-1 flex-1 rounded-pill ${barColor(task.type, task.completed)}`}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted">
        {CHIP_LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span
              className={cn("inline-block size-2 rounded-full", item.cls)}
              aria-hidden="true"
            />
            {item.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-[3px] border border-dashed border-rule"
            aria-hidden="true"
          />
          Personal task
        </span>
      </div>
      <div className="mt-3 flex items-start gap-2.5 rounded-control border border-accent/25 bg-accent-soft px-3.5 py-3">
        <Lightbulb size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-ink">
          Click on any date to view or add mock tests, sectional tests, topic
          tests or revision tasks.
        </p>
      </div>
    </div>
  );
}

function weekStartIsoLocal(iso: string) {
  const date = new Date(`${iso}T12:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7;
  const result = new Date(date);
  result.setUTCDate(date.getUTCDate() - weekday);
  return result.toISOString().slice(0, 10);
}

/** Week view: seven day columns, each listing its tasks as tinted blocks
 * (reference: columns of colored events; no clock times in the plan, so
 * blocks are ordered, not hour-placed). Clicking a day selects it; clicking
 * a block opens the event dialog. */
function WeekView({
  plan,
  selected,
  today,
  personalByDate,
  onSelect,
}: {
  plan: NonNullable<ReturnType<typeof usePlanData>["plan"]>;
  selected: string;
  today: string;
  personalByDate: Map<string, PersonalTaskView[]>;
  onSelect: (iso: string) => void;
}) {
  const from = weekStartIsoLocal(weekRange(selected).from);
  const days = Array.from({ length: 7 }, (_, i) => addIsoDays(from, i));
  const byDate = new Map(plan.days.map((day) => [day.date, day]));
  return (
    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-7" role="list" aria-label="Week schedule">
      {days.map((iso) => {
        const day = byDate.get(iso);
        const personal = personalByDate.get(iso) ?? [];
        const isToday = iso === today;
        const isSelected = iso === selected;
        return (
          <div
            key={iso}
            role="listitem"
            className={cn(
              "flex min-w-0 flex-col rounded-panel border",
              isToday
                ? "border-accent bg-accent-soft/40"
                : "border-rule-soft bg-paper",
              day || personal.length ? "" : "opacity-55",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(iso)}
              aria-label={`Select ${iso}`}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-t-[calc(var(--radius-panel)+0px)] border-b px-2 py-2 text-center transition-colors",
                isToday
                  ? "border-accent/40 text-accent"
                  : "border-rule-soft text-ink hover:bg-soft",
              )}
            >
              <span className="text-[11px] font-medium">
                {new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
                  weekday: "short",
                  timeZone: "UTC",
                })}
              </span>
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-[11px] tabular",
                  isToday && "bg-accent font-semibold text-paper",
                )}
              >
                {Number(iso.slice(8))}
              </span>
              {day && day.tasks.length > 0 && (
                <span className="text-[10px] tabular text-muted">
                  {dayAssignmentStats(day).completed}/{day.tasks.length}
                </span>
              )}
            </button>
            <div className="flex flex-1 flex-col gap-1 p-1.5">
              {day?.tasks.slice(0, 6).map((task) => (
                <span
                  key={task.key}
                  className={`truncate rounded-[4px] px-1.5 py-1 text-[10px] font-medium leading-tight ${taskChipClass(task)}`}
                >
                  {task.name}
                </span>
              ))}
              {day && day.tasks.length > 6 && (
                <span className="px-1 text-[10px] text-muted">
                  +{day.tasks.length - 6} more
                </span>
              )}
              {personal.length > 0 && (
                <span className="mt-auto flex items-center gap-1 px-1 pt-1 text-[10px] text-muted">
                  <StatusDot
                    status={
                      personal.some((t) => statusOf(t, today) === "overdue")
                        ? "overdue"
                        : "in_progress"
                    }
                    size={6}
                  />
                  {personal.length} personal
                </span>
              )}
            </div>
            {isSelected && (
              <span className="sr-only">Selected</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Day view: the selected date with a ring, stepping, and the full task list
 * with icon tiles + meta chips + Start actions (reference center panel). */
function DayView({
  plan,
  selected,
  onStep,
  onToday,
  onOpenTask,
}: {
  plan: NonNullable<ReturnType<typeof usePlanData>["plan"]>;
  selected: string;
  onStep: (delta: 1 | -1) => void;
  onToday: () => void;
  onOpenTask: (task: PlanTaskView, day: PlanDayView) => void;
}) {
  const day = findDayByDate(plan.days, selected);
  const stats = day ? dayAssignmentStats(day) : null;
  return (
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft px-4 pb-3 pt-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <h2 className="panel-title" aria-live="polite">
              {day ? `${day.weekday}, ${longDate(day.date)}` : longDate(selected)}
            </h2>
            {day && (
              <p className="mt-0.5 text-xs text-muted">
                {day.tasks.length} task{day.tasks.length === 1 ? "" : "s"}
                {stats && stats.total > 0
                  ? ` · ${stats.completed}/${stats.total} done`
                  : ""}
                {` · Day ${day.day} of 50`}
              </p>
            )}
          </div>
          <div className="day-nav">
            <button
              type="button"
              className="day-nav-step"
              aria-label="Previous day"
              onClick={() => onStep(-1)}
            >
              <PlainIcon name="arrowLeft" size={14} />
            </button>
            <button
              type="button"
              className="day-nav-step"
              aria-label="Next day"
              onClick={() => onStep(1)}
            >
              <PlainIcon name="arrowRight" size={14} />
            </button>
          </div>
          <button type="button" onClick={onToday} className="nav-button !w-auto px-3 py-2 text-xs">
            Today
          </button>
        </div>
        {stats && stats.total > 0 && <MiniRing value={stats.completed} total={stats.total} />}
      </div>
      <div className="px-4 py-4 sm:px-6">
        {day && day.tasks.length > 0 ? (
          <ul className="flex flex-col divide-y divide-rule-soft">
            {day.tasks.map((task) => (
              <DayTaskRow
                key={task.key}
                task={task}
                onOpen={() => onOpenTask(task, day)}
              />
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            {day
              ? "Nothing is scheduled for this day."
              : "The 50-day plan does not schedule anything here."}
          </p>
        )}
        {day && day.revisionTasks.length > 0 && (
          <div className="mt-4 rounded-control border border-rule-soft bg-canvas px-4 py-3">
            <p className="section-label mb-2">Revision</p>
            <ul className="flex flex-col gap-1 text-[11px] text-muted">
              {day.revisionTasks.map((rt, i) => (
                <li key={i}>{rt}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function DayTaskRow({
  task,
  onOpen,
}: {
  task: PlanTaskView;
  onOpen: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <CompleteToggle
        completed={task.completed}
        label={`Mark ${task.name} ${task.completed ? "incomplete" : "complete"}`}
        onToggle={onOpen}
      />
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-control border",
          taskTileTint(task.type),
        )}
        aria-hidden="true"
      >
        <PlainIcon name={taskIcon(task.type)} size={17} />
      </span>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
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
          <span className="inline-flex items-center rounded-pill bg-soft px-2 py-0.5 text-[10px] font-medium text-muted tabular">
            {task.marks} marks
          </span>
          <span className="inline-flex items-center rounded-pill bg-soft px-2 py-0.5 text-[10px] font-medium text-muted tabular">
            {task.questions} Q
          </span>
        </span>
      </button>
      <Button
        size="sm"
        variant="outline"
        onClick={onOpen}
        className="shrink-0"
      >
        Start <PlainIcon name="chevronRight" size={12} />
      </Button>
    </li>
  );
}

/** The selected day's schedule — compact side panel (month/week) or full
 * (embedded in older flows). Icon tiles + meta chips, matching the reference
 * day panel. */
function SelectedDayAgenda({
  day,
  today,
  compact,
  attempts,
  onOpenTask,
  onAddMock,
  onOpenAttempt,
  personalTasks = [],
  onCyclePersonal,
  onEditPersonal,
  onMarkAllDone,
}: {
  day: PlanDayView | undefined;
  today: string;
  compact: boolean;
  attempts: Attempt[];
  onOpenTask: (task: PlanTaskView, day: PlanDayView) => void;
  onAddMock: (date: string, task?: PlanTaskView) => void;
  onOpenAttempt: (attempt: Attempt) => void;
  personalTasks?: PersonalTaskView[];
  onCyclePersonal?: (task: PersonalTaskView) => void;
  onEditPersonal?: () => void;
  onMarkAllDone?: () => void;
}) {
  if (!day)
    return (
      <Panel
        title="No plan for this date"
        description="Pick a date inside 26 Oct – 14 Dec."
      >
        <div className="px-4 pb-4 text-xs text-muted">
          {personalTasks.length
            ? `${personalTasks.length} personal task${personalTasks.length === 1 ? "" : "s"} due here — open My Tasks to work on them.`
            : "The 50-day plan does not schedule anything here."}
        </div>
      </Panel>
    );
  const stats = dayAssignmentStats(day);
  return (
    <Panel
      dense
      title={day.weekday === "x" ? shortDate(day.date) : `${shortDate(day.date)}`}
      description={`Day ${day.day} of 50 · ${day.tasks.length} task${day.tasks.length === 1 ? "" : "s"}`}
      action={
        <div className="flex shrink-0 items-center gap-2">
          {stats.total > 0 && (
            <MiniRing value={stats.completed} total={stats.total} size={40} />
          )}
          {onMarkAllDone && stats.completed < stats.total && (
            <Button
              size="sm"
              variant="outline"
              onClick={onMarkAllDone}
              title="Mark every assignment for this day complete"
            >
              Mark all done
            </Button>
          )}
        </div>
      }
    >
      <ul className="divide-y divide-rule-soft">
        {day.tasks.length ? (
          day.tasks.map((task) => (
            <PanelTaskRow
              key={task.key}
              task={task}
              compact={compact}
              onOpen={() => onOpenTask(task, day)}
              onLogResult={
                isMockType(task.type)
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

      <div className="px-4 pb-2 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => onAddMock(day.date)}
        >
          <PlainIcon name="plus" size={13} /> Add a task for this day
        </Button>
      </div>

      {personalTasks.length > 0 && (
        <div className="border-t border-rule-soft px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
              Personal tasks
            </p>
            {onEditPersonal && (
              <button
                type="button"
                onClick={onEditPersonal}
                className="text-[10px] font-medium text-accent hover:text-accent-hover"
              >
                Manage in My Tasks
              </button>
            )}
          </div>
          {personalTasks.length ? (
            <ul className="divide-y divide-rule-soft border-t border-rule-soft">
              {personalTasks.map((task) => (
                <PersonalTaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  compact={compact}
                  onCycleStatus={onCyclePersonal}
                />
              ))}
            </ul>
          ) : (
            <p className="py-1.5 text-[10px] leading-relaxed text-muted">
              No personal tasks due this day. Create one from My Tasks with a
              due date to see it here.
            </p>
          )}
        </div>
      )}

      {attempts.length > 0 && (
        <div className="border-t border-rule-soft px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
            Logged attempts
          </p>
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

/** Side-panel task row: icon tile + name + meta chips + Log result. */
function PanelTaskRow({
  task,
  compact,
  onOpen,
  onLogResult,
}: {
  task: PlanTaskView;
  compact?: boolean;
  onOpen: () => void;
  onLogResult?: (task: PlanTaskView) => void;
}) {
  return (
    <li className="flex items-start gap-2.5 px-4 py-2.5">
      <CompleteToggle
        completed={task.completed}
        label={`Mark ${task.name} ${task.completed ? "incomplete" : "complete"}`}
        onToggle={onOpen}
      />
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-control border",
          taskTileTint(task.type),
        )}
        aria-hidden="true"
      >
        <PlainIcon name={taskIcon(task.type)} size={15} />
      </span>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
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
          {!compact && (
            <span className="inline-flex items-center rounded-pill bg-soft px-2 py-0.5 text-[10px] font-medium text-muted tabular">
              {task.marks} marks
            </span>
          )}
          {!compact && <ResultLine task={task} />}
        </span>
      </button>
      {onLogResult && !task.completed && (
        <button
          type="button"
          onClick={() => onLogResult(task)}
          className="mt-0.5 shrink-0 whitespace-nowrap text-[10px] font-medium text-accent hover:text-accent-hover"
        >
          Log result
        </button>
      )}
    </li>
  );
}

/** Chronological list of remaining plan days from today (or plan start). */
function AgendaList({
  plan,
  today,
  onOpenTask,
  onLogResult,
  attempts,
  onOpenAttempt,
  personalByDate,
  onCyclePersonal,
  onEditPersonal,
}: {
  plan: NonNullable<ReturnType<typeof usePlanData>["plan"]>;
  today: string;
  onOpenTask: (task: PlanTaskView, day: PlanDayView) => void;
  onLogResult: (task: PlanTaskView) => void;
  attempts: Attempt[];
  onOpenAttempt: (attempt: Attempt) => void;
  personalByDate: Map<string, PersonalTaskView[]>;
  onCyclePersonal: (task: PersonalTaskView) => void;
  onEditPersonal: () => void;
}) {
  const upcoming = plan.days.filter((day) => day.date >= today);
  const past = plan.days.filter((day) => day.date < today).reverse();
  return (
    <div className="space-y-4">
      {upcoming.map((day) => {
        const dayAttempts = attempts.filter(
          (attempt) => istDateKey(attempt.completedAt) === day.date,
        );
        const dayPersonal = personalByDate.get(day.date) ?? [];
        const stats = dayAssignmentStats(day);
        return (
          <Panel
            key={day.day}
            dense
            title={`${day.weekday}, ${longDate(day.date)}`}
            description={`Day ${day.day} of 50 · ${day.dayType}`}
            action={
              <div className="flex shrink-0 items-center gap-2">
                {stats.total > 0 && (
                  <MiniRing value={stats.completed} total={stats.total} size={40} />
                )}
                {dayPersonal.length > 0 && (
                  <span className="text-[10px] text-muted tabular whitespace-nowrap">
                    {dayPersonal.filter((t) => statusOf(t, today) !== "completed").length} personal
                  </span>
                )}
              </div>
            }
          >
            <ul className="divide-y divide-rule-soft">
              {day.tasks.map((task) => (
                <PanelTaskRow
                  key={task.key}
                  task={task}
                  compact
                  onOpen={() => onOpenTask(task, day)}
                  onLogResult={
                    isMockType(task.type) && !task.completed
                      ? () => onLogResult(task)
                      : undefined
                  }
                />
              ))}
            </ul>
            {dayPersonal.length > 0 && (
              <div className="border-t border-rule-soft px-4 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                    Personal tasks
                  </p>
                  <button
                    type="button"
                    onClick={onEditPersonal}
                    className="text-[10px] font-medium text-accent hover:text-accent-hover"
                  >
                    Manage in My Tasks
                  </button>
                </div>
                <ul className="divide-y divide-rule-soft border-t border-rule-soft">
                  {dayPersonal.map((task) => (
                    <PersonalTaskRow
                      key={task.id}
                      task={task}
                      today={today}
                      compact
                      onCycleStatus={onCyclePersonal}
                    />
                  ))}
                </ul>
              </div>
            )}
            {dayAttempts.length > 0 && (
              <div className="border-t border-rule-soft px-4 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Logged attempts
                </p>
                <ul className="flex flex-col gap-2">
                  {dayAttempts.map((attempt) => (
                    <li key={attempt.id}>
                      <AttemptRecordCard
                        attempt={attempt}
                        onOpen={onOpenAttempt}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        );
      })}
      {past.length > 0 && (
        <details className="panel">
          <summary className="cursor-pointer px-6 py-4 text-sm font-medium">
            Earlier plan days ({past.length})
          </summary>
          <div className="border-t border-rule-soft">
            {past.map((day) => (
              <div
                key={day.day}
                className="px-6 py-3 flex justify-between gap-3 text-xs border-b border-rule-soft last:border-0"
              >
                <span>
                  Day {day.day} · {shortDate(day.date)}
                </span>
                <span className="muted tabular">
                  {dayAssignmentStats(day).completed}/{day.tasks.length} done
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
