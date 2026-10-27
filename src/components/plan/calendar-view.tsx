"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel } from "../dashboard-panels";
import { PlainIcon } from "../icon";
import { CategoryChip, CompleteToggle, PlanErrorCard, ResultLine } from "./plan-shared";
import { EventDialog } from "./event-dialog";
import { usePlanData } from "../use-plan-data";
import { shortDate } from "@/lib/format";
import {
  addIsoDays,
  dayAssignmentStats,
  findDayByDate,
  isoMonthEnd,
  isoMonthStart,
  istTodayIso,
  isMockType,
  weekRange,
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

export function CalendarView({ planApi }: { planApi: ReturnType<typeof usePlanData> }) {
  const { plan, loading, error, refresh, updateTask } = planApi;
  const router = useRouter();
  const today = istTodayIso();
  const [mode, setMode] = useState<CalendarMode>("month");
  const [selected, setSelected] = useState(() => today);
  const [event, setEvent] = useState<{ task: PlanTaskView; day: PlanDayView } | undefined>();

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

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
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
        <div className="ml-auto flex flex-wrap items-center gap-2">
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
        </div>
      </div>
      <p className="mb-4 font-serif text-xl" aria-live="polite">
        {periodLabel}
      </p>

      {mode === "month" && (
        <MonthView
          plan={plan}
          selected={selected}
          today={today}
          onSelect={setSelected}
        />
      )}
      {mode === "week" && (
        <WeekView
          plan={plan}
          selected={selected}
          today={today}
          onSelect={setSelected}
        />
      )}
      {mode === "agenda" && (
        <AgendaList
          plan={plan}
          today={today}
          onOpenTask={(task, day) => setEvent({ task, day })}
        />
      )}
      {(mode === "day" || mode === "month" || mode === "week") && (
        <div className="mt-5">
          <SelectedDayAgenda
            day={selectedDay}
            today={today}
            compact={mode !== "day"}
            onOpenTask={(task, day) => setEvent({ task, day })}
          />
        </div>
      )}

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

/** Monday-led month grid covering the displayed month. */
function MonthView({
  plan,
  selected,
  today,
  onSelect,
}: {
  plan: NonNullable<ReturnType<typeof usePlanData>["plan"]>;
  selected: string;
  today: string;
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
          const isSelected = iso === selected;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${iso}${day ? ` · ${stats?.completed}/${stats?.total} done` : " · outside the plan"}${isToday ? " · today" : ""}`}
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
                {stats && stats.completed === stats.total && (
                  <PlainIcon name="check" size={10} className="text-positive" />
                )}
              </span>
              {day && (
                <span className="hidden sm:flex flex-col gap-0.5 mt-1">
                  {day.tasks.slice(0, 3).map((task) => (
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
                  {day.tasks.length > 3 && (
                    <span className="text-[10px] muted px-1">
                      +{day.tasks.length - 3} more
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
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] muted">
        Days outside 26 Oct – 14 Dec are inactive. Dots mark tasks; green means done.
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
  onSelect,
}: {
  plan: NonNullable<ReturnType<typeof usePlanData>["plan"]>;
  selected: string;
  today: string;
  onSelect: (iso: string) => void;
}) {
  const from = weekStartIsoLocal(weekRange(selected).from);
  const days = Array.from({ length: 7 }, (_, i) => addIsoDays(from, i));
  const byDate = new Map(plan.days.map((day) => [day.date, day]));
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((iso) => {
        const day = byDate.get(iso);
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

/** The selected day's full schedule — compact in month/week, full in day view. */
function SelectedDayAgenda({
  day,
  today,
  compact,
  onOpenTask,
}: {
  day: PlanDayView | undefined;
  today: string;
  compact: boolean;
  onOpenTask: (task: PlanTaskView, day: PlanDayView) => void;
}) {
  if (!day)
    return (
      <Panel title="No plan for this date" description="Pick a date inside 26 Oct – 14 Dec.">
        <div className="p-6 pt-2 text-sm muted">
          The 50-day plan does not schedule anything here.
        </div>
      </Panel>
    );
  const stats = dayAssignmentStats(day);
  return (
    <Panel
      title={`Day ${day.day} · ${shortDate(day.date)}`}
      description={`${day.weekday} · ${day.dayType}`}
      action={
        <span className="text-xs muted tabular whitespace-nowrap">
          {stats.completed}/{stats.total} done
        </span>
      }
    >
      <ul className="divide-y divide-rule-soft">
        {day.tasks.map((task) => (
          <TaskRow
            key={task.key}
            task={task}
            compact={compact}
            onOpen={() => onOpenTask(task, day)}
          />
        ))}
      </ul>
      {day.revisionTasks.length > 0 && (
        <div className="border-t border-rule-soft px-6 py-4">
          <p className="section-label mb-2">Revision</p>
          <ul className="space-y-1 text-xs muted">
            {day.revisionTasks.map((rt, i) => (
              <li key={i}>{rt}</li>
            ))}
          </ul>
        </div>
      )}
      {day.date === today && (
        <div className="border-t border-rule-soft px-6 py-3 text-xs">
          <Link
            href={`/plan/${day.date}`}
            className="text-accent font-medium hover:text-accent-hover transition-colors"
          >
            Open the full daily workspace →
          </Link>
        </div>
      )}
    </Panel>
  );
}

export function TaskRow({
  task,
  compact,
  onOpen,
  onToggle,
}: {
  task: PlanTaskView;
  compact?: boolean;
  onOpen: () => void;
  onToggle?: (task: PlanTaskView) => void;
}) {
  return (
    <li className="flex items-start gap-3 px-4 sm:px-6 py-3">
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
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] muted">
          <CategoryChip type={task.type} />
          <span className="tabular">
            {task.questions} Q · {task.marks} marks
          </span>
          {!compact && <ResultLine task={task} />}
        </span>
      </button>
      <a
        href={task.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${task.name} on RBE`}
        className="muted hover:text-accent transition-colors mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <PlainIcon name="arrowUpRight" size={15} />
      </a>
    </li>
  );
}

/** Chronological list of remaining plan days from today (or plan start). */
function AgendaList({
  plan,
  today,
  onOpenTask,
}: {
  plan: NonNullable<ReturnType<typeof usePlanData>["plan"]>;
  today: string;
  onOpenTask: (task: PlanTaskView, day: PlanDayView) => void;
}) {
  const upcoming = plan.days.filter((day) => day.date >= today);
  const past = plan.days.filter((day) => day.date < today).reverse();
  return (
    <div className="space-y-4">
      {upcoming.map((day) => (
        <Panel
          key={day.day}
          title={`Day ${day.day} · ${shortDate(day.date)}`}
          description={`${day.weekday} · ${day.dayType}`}
          action={
            <span className="text-xs muted tabular">
              {dayAssignmentStats(day).completed}/{day.tasks.length}
            </span>
          }
        >
          <ul className="divide-y divide-rule-soft">
            {day.tasks.map((task) => (
              <TaskRow key={task.key} task={task} compact onOpen={() => onOpenTask(task, day)} />
            ))}
          </ul>
        </Panel>
      ))}
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
