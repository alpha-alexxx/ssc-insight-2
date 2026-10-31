"use client";
import { memo, useMemo, useRef, useState } from "react";
import { PlainIcon } from "../../icon";
import { cn } from "@/lib/utils";
import { longDate, monthDate } from "@/lib/format";
import {
  addIsoDays,
  isoWeekdayName,
  monthGridDays,
  weekStartIso,
} from "@/lib/plan/view-model";
import {
  countEntries,
  entriesFor,
  type CalendarEntry,
  type CalendarIndex,
  type CalendarLayer,
  type EntryCounts,
} from "@/lib/plan/calendar-entries";
import { LAYER_META, TASK_LEGEND, planTickClass } from "./visuals";
import { categoryLabel } from "./entry-rows";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_ROWS = 3;

/**
 * The month surface. Cells come from `monthGridDays`, so the grid is always
 * whole Monday-led weeks — never a ragged last row.
 *
 * Cells switch on **container width**, not viewport width: 768px with the
 * 15rem sidebar leaves ~488px of content while a 767px phone leaves ~735px,
 * and a viewport query cannot see that. Above 560px of container three ruled
 * entry rows are legible; below, the cell falls back to one square tick per
 * occupied layer plus a count, which keeps the 7-column grid usable at 320px.
 *
 * Keyboard: a roving tabindex makes the grid one tab stop; arrows, Home/End
 * and PageUp/PageDown move focus without selecting. Enter or Space is the
 * native click, because every cell is a button.
 */
export const MonthGrid = memo(function MonthGrid({
  index,
  layers,
  selected,
  today,
  planStart,
  planEnd,
  onSelect,
  onMonthStep,
}: {
  index: CalendarIndex;
  layers: readonly CalendarLayer[];
  selected: string;
  today: string;
  planStart: string;
  planEnd: string;
  onSelect: (iso: string) => void;
  onMonthStep: (direction: 1 | -1) => void;
}) {
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
      const indexAt = cells.indexOf(activeFocus);
      const target = Math.min(
        Math.max((indexAt < 0 ? 0 : indexAt) + step, 0),
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
  for (let at = 0; at < cells.length; at += 7) {
    weeks.push(cells.slice(at, at + 7));
  }

  return (
    <div
      className="cal-month"
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
            {week.map((iso) => (
              <MonthCell
                key={iso}
                iso={iso}
                entries={entriesFor(index, iso, layers)}
                counts={countEntries(entriesFor(index, iso, layers))}
                inMonth={iso.slice(0, 7) === selected.slice(0, 7)}
                inPlan={iso >= planStart && iso <= planEnd}
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
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});

function MonthCell({
  iso,
  entries,
  counts,
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
  entries: readonly CalendarEntry[];
  counts: EntryCounts;
  inMonth: boolean;
  inPlan: boolean;
  isToday: boolean;
  isSelected: boolean;
  isTabStop: boolean;
  registerRef: (node: HTMLButtonElement | null) => void;
  onFocus: () => void;
  onSelect: () => void;
}) {
  const label = [
    `${isoWeekdayName(iso)} ${longDate(iso)}`,
    counts.plan.total
      ? `${counts.plan.done} of ${counts.plan.total} scheduled done`
      : null,
    counts.tasks.total
      ? `${counts.tasks.total} personal task${counts.tasks.total === 1 ? "" : "s"}${counts.tasks.overdue ? `, ${counts.tasks.overdue} overdue` : ""}`
      : null,
    counts.mocks ? `${counts.mocks} result${counts.mocks === 1 ? "" : "s"} logged` : null,
    !counts.plan.total && !counts.tasks.total && !counts.mocks
      ? "nothing scheduled"
      : null,
    isToday ? "today" : null,
    !inMonth ? "outside the month" : null,
    !inPlan ? "outside the plan" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const done =
    counts.plan.total > 0 && counts.plan.done === counts.plan.total;

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
        "cal-cell flex min-w-0 flex-col gap-1 rounded-control border p-1.5 text-left transition-colors",
        inPlan
          ? "border-rule-soft bg-paper hover:border-accent/50 hover:bg-soft"
          : "border-dashed border-rule-soft/70 bg-canvas text-muted",
        !inMonth && "opacity-60",
        isToday && !isSelected && "border-accent/60",
        isSelected &&
          "border-accent bg-accent-soft hover:border-accent hover:bg-accent-soft opacity-100 ring-1 ring-accent/40",
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "font-serif tabular leading-none",
            "text-[15px] sm:text-base",
            isSelected
              ? "font-semibold text-ink"
              : isToday
                ? "font-semibold text-accent"
                : inPlan
                  ? "text-ink"
                  : "text-muted",
          )}
        >
          {Number(iso.slice(8))}
        </span>
        {counts.plan.total > 0 && (
          <span className="text-[10px] tabular text-muted">
            {done ? (
              <PlainIcon name="check" size={10} className="text-positive" />
            ) : (
              `${counts.plan.done}/${counts.plan.total}`
            )}
          </span>
        )}
      </span>

      {/* Wide cell: three ruled rows, one per layer — the three-ink grammar. */}
      {entries.length > 0 && (
        <span className="cal-cell-rows mt-auto flex-col gap-0.5">
          {entries.slice(0, MAX_ROWS).map((entry) => (
            <CellRow key={entry.id} entry={entry} />
          ))}
          {entries.length > MAX_ROWS && (
            <span className="px-1 text-[10px] leading-tight text-muted">
              +{entries.length - MAX_ROWS} more
            </span>
          )}
        </span>
      )}

      {/* Narrow cell: one square tick per occupied layer plus a count. */}
      {entries.length > 0 && (
        <span className="cal-cell-ticks mt-auto items-center gap-1">
          {(["plan", "tasks", "mocks"] as const).map((layer) => {
            const present =
              layer === "mocks"
                ? counts.mocks > 0
                : counts[layer].total > 0;
            return present ? (
              <span
                key={layer}
                className={cn("h-1.5 w-1 rounded-[1px]", LAYER_META[layer].tick)}
                aria-hidden="true"
              />
            ) : null;
          })}
          <span className="ml-auto text-[10px] tabular leading-none text-muted">
            {entries.length}
          </span>
        </span>
      )}
    </button>
  );
}

/** A single ruled row inside a wide month cell. */
function CellRow({ entry }: { entry: CalendarEntry }) {
  if (entry.kind === "plan-task")
    return (
      <span
        className={cn(
          "flex items-center gap-1 truncate rounded-[2px] py-0.5 pl-1 pr-1 text-[10px] font-medium leading-tight",
          planTickClass(entry.task),
          entry.task.completed
            ? "text-muted line-through"
            : "text-ink",
        )}
      >
        <span
          className={cn("h-3 w-0.5 shrink-0 rounded-[1px]", planTickClass(entry.task))}
          aria-hidden="true"
        />
        <span className="truncate">{categoryLabel(entry.task)}</span>
      </span>
    );
  if (entry.kind === "revision")
    return (
      <span className="flex items-center gap-1 truncate rounded-[2px] py-0.5 pl-1 pr-1 text-[10px] leading-tight text-muted">
        <span className="h-3 w-0.5 shrink-0 rounded-[1px] bg-rule" aria-hidden="true" />
        <span className="truncate">{entry.label}</span>
      </span>
    );
  if (entry.kind === "personal")
    return (
      <span
        className={cn(
          "flex items-center gap-1 truncate rounded-[2px] border border-rule-soft bg-paper px-1 py-0.5 text-[10px] leading-tight",
          entry.status === "completed" ? "text-muted line-through" : "text-ink",
        )}
      >
        <span className="truncate">{entry.task.title}</span>
      </span>
    );
  return (
    <span className="flex items-center gap-1 truncate rounded-[2px] border-l-2 border-l-ink/60 bg-soft px-1 py-0.5 text-[10px] leading-tight text-ink">
      <span className="truncate">{entry.attempt.name}</span>
      <span className="ml-auto tabular text-muted">{entry.scorePct}</span>
    </span>
  );
}

/**
 * The grid's key: the three layer forms, then the plan category tints, then
 * the two date states. Layer identity is form (tint / outline / stamp); the
 * hues belong to plan categories only.
 */
export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pt-3 text-[10px] text-muted">
      {(["plan", "tasks", "mocks"] as const).map((layer) => (
        <span key={layer} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block h-2.5 w-3.5 rounded-[1px]",
              LAYER_META[layer].swatch,
            )}
            aria-hidden="true"
          />
          {LAYER_META[layer].label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block size-2.5 rounded-[1px] border border-accent"
          aria-hidden="true"
        />
        Selected
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="font-serif text-[11px] font-semibold text-accent" aria-hidden="true">
          1
        </span>
        Today
      </span>
    </div>
  );
}

/** Plan-category key, shown under the grid in the plan layer. */
export function PlanCategoryLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-1 text-[10px] text-muted">
      {TASK_LEGEND.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className={cn("inline-block h-2.5 w-3.5 rounded-[1px]", item.swatch)}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

