"use client";
import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { shortDate } from "@/lib/format";
import {
  addIsoDays,
  isoWeekdayShort,
  weekRange,
} from "@/lib/plan/view-model";
import {
  countEntries,
  entriesFor,
  type CalendarEntry,
  type CalendarIndex,
  type CalendarLayer,
  type EntryCounts,
} from "@/lib/plan/calendar-entries";
import { LAYER_META, planTickClass } from "./visuals";
import { categoryLabel } from "./entry-rows";

const MAX_ROWS = 3;

/**
 * Seven days around the selection. Columns at `md+`, a single-column day list
 * below it — a two-column grid leaves a ragged 4+3 tail, while a row list
 * reads as the schedule it is.
 *
 * Each column shows up to three ruled rows per layer and, when the day is
 * busy, scrolls inside a capped column rather than compressing text. The head
 * is the day selector (one button); the rows are presentational, so a busy
 * week stays scannable without nesting controls inside controls.
 */
export const WeekView = memo(function WeekView({
  index,
  layers,
  selected,
  today,
  onSelect,
}: {
  index: CalendarIndex;
  layers: readonly CalendarLayer[];
  selected: string;
  today: string;
  onSelect: (iso: string) => void;
}) {
  const from = weekRange(selected).from;
  const week = useMemo(
    () => Array.from({ length: 7 }, (_, at) => addIsoDays(from, at)),
    [from],
  );

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
              entries={entriesFor(index, iso, layers)}
              counts={countEntries(entriesFor(index, iso, layers))}
              isToday={iso === today}
              isSelected={iso === selected}
              layout="column"
              onSelect={() => onSelect(iso)}
            />
          </li>
        ))}
      </ul>

      {/* <md — one row per day, still inside the week */}
      <ul
        className="flex flex-col md:hidden"
        aria-label={`Week of ${shortDate(from)}`}
      >
        {week.map((iso) => (
          <li key={iso} className="border-b border-rule-soft last:border-0">
            <WeekDayCell
              iso={iso}
              entries={entriesFor(index, iso, layers)}
              counts={countEntries(entriesFor(index, iso, layers))}
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
});

function WeekDayCell({
  iso,
  entries,
  counts,
  isToday,
  isSelected,
  layout,
  onSelect,
}: {
  iso: string;
  entries: readonly CalendarEntry[];
  counts: EntryCounts;
  isToday: boolean;
  isSelected: boolean;
  layout: "column" | "row";
  onSelect: () => void;
}) {
  const shown = layout === "column" ? MAX_ROWS : 2;
  const label = `${isoWeekdayShort(iso)} ${shortDate(iso)}${
    isToday ? ", today" : ""
  }${
    counts.plan.total
      ? `, ${counts.plan.done} of ${counts.plan.total} scheduled done`
      : ""
  }${counts.tasks.total ? `, ${counts.tasks.total} personal` : ""}${
    counts.mocks ? `, ${counts.mocks} logged` : ""
  }${!entries.length ? ", nothing scheduled" : ""}`;

  const numeral = (
    <span
      className={cn(
        "font-serif leading-none tabular",
        layout === "column" ? "text-[17px]" : "text-base",
        isSelected
          ? "text-ink"
          : isToday
            ? "text-accent"
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
          {entries.length ? (
            <>
              {entries.slice(0, shown).map((entry) => (
                <CompactRow key={entry.id} entry={entry} layout={layout} />
              ))}
              {entries.length > shown && (
                <span className="px-1.5 text-[10px] text-muted">
                  +{entries.length - shown} more
                </span>
              )}
            </>
          ) : (
            <span className="py-0.5 text-[11px] text-muted">No assignments</span>
          )}
        </span>
        <DayTicks counts={counts} className="shrink-0 pt-1" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-current={isToday ? "date" : undefined}
      aria-label={label}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-control border text-left transition-colors",
        isSelected
          ? "border-accent bg-accent-soft"
          : isToday
            ? "border-accent/50 bg-paper hover:bg-soft"
            : "border-rule-soft bg-paper hover:border-accent/50 hover:bg-soft",
      )}
    >
      <span className="flex flex-col items-center gap-0.5 border-b border-rule-soft px-1.5 py-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
          {isoWeekdayShort(iso)}
        </span>
        {numeral}
        {counts.plan.total > 0 && (
          <span className="text-[10px] tabular text-muted">
            {counts.plan.done}/{counts.plan.total}
          </span>
        )}
      </span>
      <span className="cal-week-body flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-1.5">
        {entries.slice(0, shown).map((entry) => (
          <CompactRow key={entry.id} entry={entry} layout="column" />
        ))}
        {entries.length > shown && (
          <span className="px-1 text-[10px] text-muted">
            +{entries.length - shown} more
          </span>
        )}
        {!entries.length && (
          <span className="px-1 py-1 text-[10px] text-muted">Nothing</span>
        )}
      </span>
    </button>
  );
}

function CompactRow({ entry, layout }: { entry: CalendarEntry; layout: "column" | "row" }) {
  /* A 7-column week leaves ~90px per column: the full assignment name is
     unreadable there, so a column shows the category and its marks and the
     row layout (phones, where there is width) keeps the name. */
  if (entry.kind === "plan-task")
    return (
      <span
        className={cn(
          "flex items-center gap-1 overflow-hidden rounded-[2px] py-0.5 pl-1 text-[10px] leading-tight",
          entry.task.completed ? "text-muted line-through" : "text-ink",
        )}
      >
        <span
          className={cn("h-3 w-0.5 shrink-0 rounded-[1px]", planTickClass(entry.task))}
          aria-hidden="true"
        />
        <span className="truncate">
          {layout === "row" ? entry.task.name : categoryLabel(entry.task)}
        </span>
      </span>
    );
  if (entry.kind === "revision")
    return (
      <span className="flex items-center gap-1 truncate rounded-[2px] py-0.5 pl-1 text-[10px] leading-tight text-muted">
        <span className="h-3 w-0.5 shrink-0 rounded-[1px] bg-rule" aria-hidden="true" />
        <span className="truncate">Revision</span>
      </span>
    );
  if (entry.kind === "personal")
    return (
      <span
        className={cn(
          "flex items-center gap-1 truncate rounded-[2px] border border-rule-soft px-1 py-0.5 text-[10px] leading-tight",
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

function DayTicks({
  counts,
  className,
}: {
  counts: EntryCounts;
  className?: string;
}) {
  const layers = (["plan", "tasks", "mocks"] as const).filter((layer) =>
    layer === "mocks" ? counts.mocks > 0 : counts[layer].total > 0,
  );
  if (!layers.length) return null;
  return (
    <span className={cn("flex items-center gap-0.5", className)} aria-hidden="true">
      {layers.map((layer) => (
        <span
          key={layer}
          className={cn("h-1.5 w-1 rounded-[1px]", LAYER_META[layer].tick)}
        />
      ))}
    </span>
  );
}
