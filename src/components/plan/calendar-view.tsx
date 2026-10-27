"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel } from "../dashboard-panels";
import { PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { AttemptRecordCard } from "../attempt-outcome-card";
import { CategoryChip, CompleteToggle, PlanErrorCard, PersonalTaskRow, ResultLine, StatusDot, nextStatus, statusOf } from "./plan-shared";
import { EventDialog } from "./event-dialog";
import { usePlanData } from "../use-plan-data";
import { istDateKey, shortDate } from "@/lib/format";
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
  weekRange,
  type PersonalTaskView,
  type PlanDayView,
  type PlanTaskView,
} from "@/lib/plan/view-model";

/**
 * Study calendar — a functional planner over the full 50-day plan window
 * (26 Oct – 14 Dec 2026), not a decorative month grid. Four views
 * (month/week/day/agenda) over the same merged plan+progress payload;
 * selecting an event opens the shared detail dialog, and selecting a date
 * reveals that day's schedule. The shareable deep link for a date is
 * /plan/<date> (the daily workspace), reachable from every agenda item.
 */

type CalendarMode = "month" | "week" | "day" | "agenda";

const MODES: { id: CalendarMode; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
  { id: "agenda", label: "Agenda" },
];

function clampToPlan(plan: { startDate: string; endDate: string }, iso: string) {
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
  const { plan, loading, error, refresh, updateTask, personalTasks, updatePersonalTask } = planApi;
  const router = useRouter();
  const today = istTodayIso();
  const [mode, setMode] = useState<CalendarMode>("month");
  const [selected, setSelected] = useState(() => today);
  const [event, setEvent] = useState<{ task: PlanTaskView; day: PlanDayView } | undefined>();

  /** Personal tasks indexed by due date; due-date-less tasks stay in My Tasks. */
  const personalByDate = useMemo(
    () => personalTasksByDate(personalTasks),
    [personalTasks],
  );
  const cyclePersonalStatus = (task: PersonalTaskView) => {
    const status = statusOf(task, today);
    void updatePersonalTask(task.id, { status: nextStatus(status) });
  };
  const openMyTasks = () => router.push("/my-tasks");

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
  const periodLabel =
    mode === "month"
      ? new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : mode === "week"
        ? `${shortDate(weekRange(selected).from)} – ${shortDate(weekRange(selected).to)}`
        : shortDate(selected);

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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Calendar view" className="segment-group">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              className="segment"
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous period"
            onClick={() => step(-1)}
            className="nav-button !w-auto px-2.5 py-2"
          >
            <PlainIcon name="arrowLeft" size={14} />
          </button>
          <button
            type="button"
            onClick={() => setSelected(clampToPlan(plan, today))}
            className="nav-button !w-auto px-3 py-2 text-xs"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next period"
            onClick={() => step(1)}
            className="nav-button !w-auto px-2.5 py-2"
          >
            <PlainIcon name="arrowRight" size={14} />
          </button>
          <label className="!flex flex-row items-center gap-2 text-xs">
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
          <Button size="sm" onClick={() => onAddMock(selected)}>
            <PlainIcon name="plus" size={13} /> Add mock
          </Button>
        </div>
      </div>

      <div
        className={
          asideAgenda
            ? "grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(310px,1fr)]"
            : ""
        }
      >
        <div className="min-w-0">
          <p className="mb-3 font-serif text-lg" aria-live="polite">
            {periodLabel}
          </p>
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
          {mode === "agenda" && (
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
          {mode === "day" && (
            <SelectedDayAgenda
              day={selectedDay}
              today={today}
              compact={false}
              attempts={dayAttempts}
              onAddMock={onAddMock}
              onOpenAttempt={onOpenAttempt}
              onOpenTask={(task, day) => setEvent({ task, day })}
              personalTasks={personalByDate.get(selected) ?? []}
              onCyclePersonal={cyclePersonalStatus}
              onEditPersonal={openMyTasks}
            />
          )}
          {mode !== "day" && mode !== "agenda" && (
            <p className="mt-2 text-[10px] text-muted">
              Select any day to open its schedule, or use{" "}
              <span className="font-medium text-ink">Add mock</span> for the
              selected date. Personal tasks show with status dots.
            </p>
          )}
        </div>
        {asideAgenda && (
          <aside className="min-w-0 xl:sticky xl:top-[72px] xl:self-start">
            <SelectedDayAgenda
              day={selectedDay}
              today={today}
              compact
              attempts={dayAttempts}
              onAddMock={onAddMock}
              onOpenAttempt={onOpenAttempt}
              onOpenTask={(task, day) => setEvent({ task, day })}
              personalTasks={personalByDate.get(selected) ?? []}
              onCyclePersonal={cyclePersonalStatus}
              onEditPersonal={openMyTasks}
            />
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

function shiftMonth(iso: string, direction: 1 | -1) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + direction);
  return date.toISOString().slice(0, 10);
}

/** Monday-led month grid covering the displayed month. Personal tasks with a
 * due date appear as dashed-border chips with status dots — visually distinct
 * from solid plan chips so plan vs personal ownership stays readable. */
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
      <div className="grid grid-cols-7 gap-px bg-rule-soft border border-rule-soft rounded-control overflow-hidden" role="grid" aria-label="Month calendar">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => (
          <div
            key={name}
            role="columnheader"
            className="bg-canvas px-1 py-2 text-center text-[10px] font-medium muted"
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
          return (
            <button
              key={iso}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${iso}${day ? ` · ${stats?.completed}/${stats?.total} plan done` : " · outside the plan"}${personal.length ? ` · ${personalOutstanding} personal outstanding` : ""}${isToday ? " · today" : ""}`}
              onClick={() => onSelect(iso)}
              className={`min-h-11 sm:min-h-24 p-1 sm:p-1.5 text-left align-top transition-colors ${
                day ? "bg-paper hover:bg-soft" : "bg-canvas opacity-50"
              } ${isSelected ? "outline-2 -outline-offset-2 outline-accent" : ""}`}
            >
              <span className="flex items-center justify-between gap-1">
                <span
                  className={`text-[11px] tabular ${isToday ? "font-bold text-accent" : "muted"}`}
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
                <span className="hidden sm:flex flex-col gap-0.5 mt-1">
                  {day?.tasks.slice(0, 3).map((task) => (
                    <span
                      key={task.key}
                      className={`truncate text-[10px] leading-tight rounded-[3px] px-1 py-0.5 ${
                        task.completed
                          ? "bg-positive-soft text-positive line-through"
                          : isMockType(task.type)
                            ? "bg-accent-soft text-accent"
                            : "bg-soft text-muted"
                      }`}
                    >
                      {task.name}
                    </span>
                  ))}
                  {day && day.tasks.length > 3 && (
                    <span className="text-[10px] muted px-1">
                      +{day.tasks.length - 3} more
                    </span>
                  )}
                  {personal.slice(0, 2).map((task) => (
                    <span
                      key={task.id}
                      className={`flex items-center gap-1 truncate text-[10px] leading-tight rounded-[3px] border border-dashed px-1 py-0.5 ${
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
                    <span className="text-[10px] muted px-1">
                      +{personal.length - 2} personal
                    </span>
                  )}
                </span>
              )}
              {day && (
                <span className="sm:hidden flex gap-0.5 mt-1" aria-hidden="true">
                  {day.tasks.slice(0, 4).map((task) => (
                    <span
                      key={task.key}
                      className={`h-1 flex-1 rounded-pill ${
                        task.completed
                          ? "bg-positive"
                          : isMockType(task.type)
                            ? "bg-accent"
                            : "bg-rule-soft"
                      }`}
                    />
                  ))}
                </span>
              )}
              {personal.length > 0 && (
                <span className="sm:hidden flex gap-0.5 mt-1" aria-hidden="true">
                  {personal.slice(0, 4).map((task) => (
                    <StatusDot
                      key={task.id}
                      status={statusOf(task, today)}
                      size={5}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] muted">
        Solid chips are plan assignments; dashed chips are your personal tasks
        with status dots (grey to do · accent in progress · green done · red
        overdue). Days outside 26 Oct – 14 Dec are inactive.
      </p>
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
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((iso) => {
        const day = byDate.get(iso);
        const personal = personalByDate.get(iso) ?? [];
        const overdueCount = personal.filter(
          (task) => statusOf(task, today) === "overdue",
        ).length;
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            className={`text-left panel p-3 transition-colors ${
              iso === selected ? "outline-2 -outline-offset-2 outline-accent" : ""
            } ${day ? "" : "opacity-50"}`}
          >
            <p className="text-[11px] muted">
              {new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
                weekday: "short",
                timeZone: "UTC",
              })}
              {iso === today && <span className="text-accent font-semibold"> · today</span>}
            </p>
            <p className="font-serif text-lg">{Number(iso.slice(8))}</p>
            {day && (
              <p className="text-[11px] muted mt-1">
                {dayAssignmentStats(day).completed}/{day.tasks.length} done
              </p>
            )}
            {personal.length > 0 && (
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                <StatusDot
                  status={overdueCount > 0 ? "overdue" : "in_progress"}
                  size={7}
                />
                <span className={overdueCount > 0 ? "text-danger" : "muted"}>
                  {personal.length} personal
                  {overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
                </span>
              </p>
            )}
            {day && (
              <div className="mt-2 space-y-1" aria-hidden="true">
                {day.tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.key}
                    className={`h-1.5 rounded-pill ${
                      task.completed
                        ? "bg-positive"
                        : isMockType(task.type)
                          ? "bg-accent"
                          : "bg-rule-soft"
                    }`}
                  />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The selected day's full schedule — compact in month/week, full in day view.
 * Personal tasks due this date get their own section below the plan tasks,
 * separated by a rule so plan vs personal ownership stays obvious. */
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
}) {
  if (!day)
    return (
      <Panel
        title="No plan for this date"
        description="Pick a date inside 26 Oct – 14 Dec."
      >
        <div className="px-4 pb-4 text-xs text-muted">
          {personalTasks.length ? (
            `${personalTasks.length} personal task${personalTasks.length === 1 ? "" : "s"} due here — open My Tasks to work on them.`
          ) : (
            "The 50-day plan does not schedule anything here."
          )}
        </div>
      </Panel>
    );
  const stats = dayAssignmentStats(day);
  return (
    <Panel
      dense
      title={`Day ${day.day} · ${shortDate(day.date)}`}
      description={`${day.weekday} · ${day.dayType}`}
      action={
        <span className="text-[10px] text-muted tabular whitespace-nowrap">
          {stats.completed}/{stats.total} done
        </span>
      }
    >
      <ul className="divide-y divide-rule-soft">
        {day.tasks.length ? (
          day.tasks.map((task) => (
            <TaskRow
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
            No personal tasks due this day. Create one from My Tasks with a due
            date to see it here.
          </p>
        )}
      </div>

      <div className="border-t border-rule-soft px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
            Logged attempts
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddMock(day.date)}
          >
            <PlainIcon name="plus" size={12} /> Add mock record
          </Button>
        </div>
        {attempts.length ? (
          <ul className="mt-2 flex flex-col gap-2">
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                <AttemptRecordCard attempt={attempt} onOpen={onOpenAttempt} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[10px] leading-relaxed text-muted">
            No tracker attempt on this date yet. Scheduled plan tests stay in
            the plan until you record their result.
          </p>
        )}
      </div>

      {day.revisionTasks.length > 0 && (
        <div className="border-t border-rule-soft px-4 py-3">
          <p className="section-label mb-2">Revision</p>
          <ul className="flex flex-col gap-1 text-[11px] text-muted">
            {day.revisionTasks.map((rt, i) => (
              <li key={i}>{rt}</li>
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
        {day.date === today && (
          <span className="ml-2 text-[10px] text-muted">Today</span>
        )}
      </div>
    </Panel>
  );
}

export function TaskRow({
  task,
  compact,
  onOpen,
  onToggle,
  onLogResult,
}: {
  task: PlanTaskView;
  compact?: boolean;
  onOpen: () => void;
  onToggle?: (task: PlanTaskView) => void;
  onLogResult?: (task: PlanTaskView) => void;
}) {
  return (
    <li className="flex items-start gap-2.5 px-4 py-2.5">
      <CompleteToggle
        completed={task.completed}
        label={`Mark ${task.name} ${task.completed ? "incomplete" : "complete"}`}
        onToggle={() => (onToggle ? onToggle(task) : onOpen())}
      />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span
          className={`block text-[13px] font-medium truncate ${task.completed ? "muted line-through" : "text-ink"}`}
        >
          {task.name}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] muted">
          <CategoryChip type={task.type} />
          <span className="tabular">
            {task.questions} Q · {task.marks} marks
          </span>
          {!compact && <ResultLine task={task} />}
        </span>
      </button>
      {onLogResult && !task.completed && (
        <button
          type="button"
          onClick={() => onLogResult(task)}
          className="mt-0.5 whitespace-nowrap text-[10px] font-medium text-accent hover:text-accent-hover"
        >
          Log result
        </button>
      )}
      <a
        href={task.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${task.name} on RBE`}
        className="muted hover:text-accent transition-colors mt-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <PlainIcon name="arrowUpRight" size={14} />
      </a>
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
        return (
          <Panel
            key={day.day}
            dense
            title={`Day ${day.day} · ${shortDate(day.date)}`}
            description={`${day.weekday} · ${day.dayType}`}
            action={
              <span className="text-[10px] text-muted tabular">
                {dayAssignmentStats(day).completed}/{day.tasks.length}
                {dayPersonal.length > 0
                  ? ` · ${dayPersonal.filter((t) => statusOf(t, today) !== "completed").length} personal`
                  : ""}
              </span>
            }
          >
            <ul className="divide-y divide-rule-soft">
              {day.tasks.map((task) => (
                <TaskRow
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
              <div key={day.day} className="px-6 py-3 flex justify-between gap-3 text-xs border-b border-rule-soft last:border-0">
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
