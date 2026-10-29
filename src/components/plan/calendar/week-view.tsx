"use client";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { longDate, shortDate } from "@/lib/format";
import {
  addIsoDays,
  dayAssignmentStats,
  isoWeekdayShort,
  weekRange,
  type PlanDayView,
} from "@/lib/plan/view-model";
import { taskChipClass } from "./visuals";

/**
 * Seven days around the selection: columns at `md+`, a single-column day list
 * below it. The list is the point — a two-column grid leaves a ragged 4+3 tail
 * and nothing to discover, while a row list reads as the schedule it is.
 */
export function WeekView({
  days,
  selected,
  today,
  onSelect,
}: {
  days: PlanDayView[];
  selected: string;
  today: string;
  onSelect: (iso: string) => void;
}) {
  const byDate = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  );
  const from = weekRange(selected).from;
  const week = Array.from({ length: 7 }, (_, index) => addIsoDays(from, index));

  return (
    <>
      {/* md+ — columns */}
      <ul
        className="hidden grid-cols-7 gap-1.5 md:grid"
        aria-label={`Week of ${shortDate(from)}`}
      >
        {week.map((iso) => (
          <li key={iso} className="min-w-0">
            <WeekDayCell
              iso={iso}
              day={byDate.get(iso)}
              isToday={iso === today}
              isSelected={iso === selected}
              layout="column"
              onSelect={() => onSelect(iso)}
            />
          </li>
        ))}
      </ul>

      {/* <md — one row per day */}
      <ul
        className="flex flex-col md:hidden"
        aria-label={`Week of ${shortDate(from)}`}
      >
        {week.map((iso) => (
          <li key={iso} className="border-b border-rule-soft last:border-0">
            <WeekDayCell
              iso={iso}
              day={byDate.get(iso)}
              isToday={iso === today}
              isSelected={iso === selected}
              layout="row"
              onSelect={() => onSelect(iso)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function WeekDayCell({
  iso,
  day,
  isToday,
  isSelected,
  layout,
  onSelect,
}: {
  iso: string;
  day: PlanDayView | undefined;
  isToday: boolean;
  isSelected: boolean;
  layout: "column" | "row";
  onSelect: () => void;
}) {
  const stats = day ? dayAssignmentStats(day) : null;
  const tasks = day?.tasks ?? [];
  const label = `${isoWeekdayShort(iso)} ${longDate(iso)}${
    isToday ? ", today" : ""
  }${stats ? `, ${stats.completed} of ${stats.total} done` : ", nothing scheduled"}`;
  const shown = layout === "column" ? 5 : 3;

  const numeral = (
    <span
      className={cn(
        "grid size-5 place-items-center rounded-control text-[11px] tabular",
        isSelected
          ? "bg-ink font-semibold text-paper"
          : isToday
            ? "font-semibold text-accent"
            : "text-ink",
      )}
    >
      {Number(iso.slice(8))}
    </span>
  );

  if (layout === "row") {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-current={isToday ? "date" : undefined}
        aria-label={label}
        className={cn(
          "flex w-full items-start gap-3 px-1 py-2.5 text-left transition-colors hover:bg-soft",
          isSelected && "bg-accent-soft",
        )}
      >
        <span className="flex w-11 shrink-0 flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
            {isoWeekdayShort(iso)}
          </span>
          {numeral}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {tasks.length ? (
            <>
              {tasks.slice(0, shown).map((task) => (
                <span
                  key={task.key}
                  className={cn(
                    "truncate rounded-control px-1.5 py-0.5 text-[10px] font-medium leading-tight",
                    taskChipClass(task),
                  )}
                >
                  {task.name}
                </span>
              ))}
              {tasks.length > shown && (
                <span className="px-1.5 text-[10px] text-muted">
                  +{tasks.length - shown} more
                </span>
              )}
            </>
          ) : (
            <span className="py-0.5 text-[11px] text-muted">No assignments</span>
          )}
        </span>
        {stats && stats.total > 0 && (
          <span className="shrink-0 pt-0.5 text-[10px] tabular text-muted">
            {stats.completed}/{stats.total}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-control border",
        isSelected
          ? "border-accent bg-accent-soft"
          : isToday
            ? "border-accent/50 bg-paper"
            : "border-rule-soft bg-paper",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-current={isToday ? "date" : undefined}
        aria-label={label}
        className="flex flex-wrap items-center justify-center gap-1 border-b border-rule-soft px-1.5 py-2 text-center transition-colors hover:bg-soft"
      >
        <span className="text-[11px] font-medium text-muted">
          {isoWeekdayShort(iso)}
        </span>
        {numeral}
        {stats && stats.total > 0 && (
          <span className="text-[10px] tabular text-muted">
            {stats.completed}/{stats.total}
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-1 p-1.5">
        {tasks.slice(0, shown).map((task) => (
          <span
            key={task.key}
            className={cn(
              "truncate rounded-control px-1.5 py-1 text-[10px] font-medium leading-tight",
              taskChipClass(task),
            )}
          >
            {task.name}
          </span>
        ))}
        {tasks.length > shown && (
          <span className="px-1 text-[10px] text-muted">
            +{tasks.length - shown} more
          </span>
        )}
        {!tasks.length && (
          <span className="px-1 py-1 text-[10px] text-muted">—</span>
        )}
      </div>
    </div>
  );
}
