"use client";
import { useMemo, useRef, useState } from "react";
import { PlainIcon } from "../../icon";
import { cn } from "@/lib/utils";
import { longDate, monthDate } from "@/lib/format";
import {
  addIsoDays,
  dayAssignmentStats,
  isoWeekdayName,
  monthGridDays,
  weekStartIso,
  type PlanDayView,
} from "@/lib/plan/view-model";
import { TASK_LEGEND, taskChipClass, taskDotClass } from "./visuals";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The month surface. Cells come from `monthGridDays`, so the grid is always
 * whole Monday-led weeks — never a ragged last row. One border treatment per
 * state (in plan / outside the plan window / outside the displayed month /
 * today / selected), and the compact cell swaps chips for category dots rather
 * than stacking four colour-only bars.
 *
 * Keyboard: a roving tabindex makes the grid one tab stop; arrows, Home/End and
 * PageUp/PageDown move focus without selecting. Enter or Space is the native
 * click, because every cell is a button.
 */
export function MonthGrid({
  days,
  selected,
  today,
  planStart,
  planEnd,
  onSelect,
  onMonthStep,
}: {
  days: PlanDayView[];
  selected: string;
  today: string;
  planStart: string;
  planEnd: string;
  onSelect: (iso: string) => void;
  onMonthStep: (direction: 1 | -1) => void;
}) {
  const byDate = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  );
  const cells = useMemo(() => monthGridDays(selected), [selected]);
  const [focusIso, setFocusIso] = useState(selected);
  const refs = useRef(new Map<string, HTMLButtonElement>());

  /* Keep the roving stop on the selected day when it changes from outside
     (a metric cell, the date input, "Today"). */
  const activeFocus = cells.includes(focusIso) ? focusIso : selected;

  const focusCell = (iso: string) => {
    if (!cells.includes(iso)) return;
    setFocusIso(iso);
    refs.current.get(iso)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const step = steps[event.key];
    if (step != null) {
      event.preventDefault();
      const index = cells.indexOf(activeFocus);
      const target = Math.min(
        Math.max((index < 0 ? 0 : index) + step, 0),
        cells.length - 1,
      );
      focusCell(cells[target]!);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusCell(weekStartIso(activeFocus));
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusCell(addIsoDays(weekStartIso(activeFocus), 6));
      return;
    }
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      onMonthStep(event.key === "PageUp" ? -1 : 1);
    }
  };

  const weeks: string[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return (
    <div
      role="group"
      aria-label={`${monthDate(selected)} schedule`}
      onKeyDown={onKeyDown}
    >
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((name) => (
          <div
            key={name}
            aria-hidden="true"
            className="px-1 pb-1 text-center text-[11px] font-medium text-muted"
          >
            <span className="hidden sm:inline">{name}</span>
            <span className="sm:hidden">{name[0]}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {weeks.map((week) => (
          <div key={week[0]} className="grid grid-cols-7 gap-1.5">
            {week.map((iso) => {
              const day = byDate.get(iso);
              const stats = day ? dayAssignmentStats(day) : null;
              const inMonth = iso.slice(0, 7) === selected.slice(0, 7);
              const inPlan = iso >= planStart && iso <= planEnd;
              return (
                <MonthCell
                  key={iso}
                  iso={iso}
                  day={day}
                  completed={stats?.completed ?? 0}
                  total={stats?.total ?? 0}
                  allDone={
                    !!stats && stats.total > 0 && stats.completed === stats.total
                  }
                  inMonth={inMonth}
                  inPlan={inPlan}
                  isToday={iso === today}
                  isSelected={iso === selected}
                  isTabStop={iso === activeFocus}
                  registerRef={(node) => {
                    if (node) refs.current.set(iso, node);
                    else refs.current.delete(iso);
                  }}
                  onFocus={() => setFocusIso(iso)}
                  onSelect={() => onSelect(iso)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthCell({
  iso,
  day,
  completed,
  total,
  allDone,
  inMonth,
  inPlan,
  isToday,
  isSelected,
  isTabStop,
  registerRef,
  onFocus,
  onSelect,
}: {
  iso: string;
  day: PlanDayView | undefined;
  completed: number;
  total: number;
  allDone: boolean;
  inMonth: boolean;
  inPlan: boolean;
  isToday: boolean;
  isSelected: boolean;
  isTabStop: boolean;
  registerRef: (node: HTMLButtonElement | null) => void;
  onFocus: () => void;
  onSelect: () => void;
}) {
  const tasks = day?.tasks ?? [];
  const label = [
    `${isoWeekdayName(iso)} ${longDate(iso)}`,
    total > 0 ? `${completed} of ${total} done` : "nothing scheduled",
    isToday ? "today" : null,
    !inMonth ? "outside the month" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      ref={registerRef}
      tabIndex={isTabStop ? 0 : -1}
      aria-pressed={isSelected}
      aria-current={isToday ? "date" : undefined}
      aria-label={label}
      onFocus={onFocus}
      onClick={onSelect}
      className={cn(
        "flex min-h-14 flex-col gap-1 rounded-control border p-1.5 text-left transition-colors sm:min-h-24",
        inPlan
          ? "border-rule-soft bg-paper hover:border-accent/50 hover:bg-soft"
          : "border-rule-soft/60 bg-canvas text-muted",
        !inMonth && "text-muted",
        isSelected && "border-accent bg-accent-soft hover:border-accent hover:bg-accent-soft",
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "grid size-5 place-items-center rounded-control text-[11px] tabular",
            isSelected
              ? "bg-ink font-semibold text-paper"
              : isToday
                ? "font-semibold text-accent"
                : "text-muted",
          )}
        >
          {Number(iso.slice(8))}
        </span>
        {total > 0 && (
          <span className="text-[9px] tabular text-muted">
            {allDone ? (
              <PlainIcon name="check" size={10} className="text-positive" />
            ) : (
              `${completed}/${total}`
            )}
          </span>
        )}
      </span>

      {/* ≥sm: up to two chips plus an overflow count. `+N more` is a span,
          never a nested button — the full count is in the cell's label. */}
      {tasks.length > 0 && (
        <span className="mt-auto hidden flex-col gap-0.5 sm:flex">
          {tasks.slice(0, 2).map((task) => (
            <span
              key={task.key}
              className={cn(
                "truncate rounded-control px-1 py-0.5 text-[10px] font-medium leading-tight",
                taskChipClass(task),
              )}
            >
              {task.name}
            </span>
          ))}
          {tasks.length > 2 && (
            <span className="px-1 text-[10px] text-muted">
              +{tasks.length - 2} more
            </span>
          )}
        </span>
      )}

      {/* <sm: one dot per task category. The cell's aria-label carries the
          counts, so nothing here is colour-only for a screen reader. */}
      {tasks.length > 0 && (
        <span className="mt-auto flex items-center gap-0.5 sm:hidden" aria-hidden="true">
          {tasks.slice(0, 3).map((task) => (
            <span
              key={task.key}
              className={cn("size-1.5 rounded-full", taskDotClass(task))}
            />
          ))}
          {tasks.length > 3 && (
            <span className="text-[9px] leading-none text-muted">
              +{tasks.length - 3}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

/** The grid's own key: category tints plus the three state symbols. */
export function MonthLegend() {
  return (
    <div
      className={cn(
        "mt-3 flex items-center gap-x-4 gap-y-1.5 text-[10px] text-muted sm:flex-wrap",
        "max-sm:whitespace-nowrap max-sm:overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden",
      )}
    >
      {TASK_LEGEND.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className={cn("inline-block size-2 rounded-control", item.swatch)}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block size-2 rounded-control border border-accent"
          aria-hidden="true"
        />
        Selected
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-accent" aria-hidden="true">
          1
        </span>
        Today
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block size-2 rounded-control bg-positive-soft text-positive line-through"
          aria-hidden="true"
        />
        Done
      </span>
    </div>
  );
}