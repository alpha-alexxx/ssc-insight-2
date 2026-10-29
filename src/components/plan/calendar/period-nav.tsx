"use client";
import { PlainIcon } from "../../icon";
import type { CalendarMode } from "./visuals";

const UNIT: Record<CalendarMode, string> = {
  month: "month",
  week: "week",
  day: "day",
  agenda: "week",
};

/** Agenda steps a week at a time, like the week surface. */
export function stepSize(mode: CalendarMode): number {
  return mode === "week" || mode === "agenda" ? 7 : 1;
}

/**
 * Period stepping: two arrows, a return-to-today chip, and a date jump. The
 * arrows are disabled at the plan's edges so a student never scrolls into an
 * empty calendar.
 */
export function PeriodNav({
  mode,
  selected,
  planStart,
  planEnd,
  onStep,
  onToday,
  onSelect,
}: {
  mode: CalendarMode;
  selected: string;
  planStart: string;
  planEnd: string;
  onStep: (direction: 1 | -1) => void;
  onToday: () => void;
  onSelect: (iso: string) => void;
}) {
  const unit = UNIT[mode];
  return (
    <>
      <div className="day-nav">
        <button
          type="button"
          className="day-nav-step"
          aria-label={`Previous ${unit}`}
          disabled={selected <= planStart}
          onClick={() => onStep(-1)}
        >
          <PlainIcon name="arrowLeft" size={14} />
        </button>
        <button
          type="button"
          className="day-nav-step"
          aria-label={`Next ${unit}`}
          disabled={selected >= planEnd}
          onClick={() => onStep(1)}
        >
          <PlainIcon name="arrowRight" size={14} />
        </button>
      </div>
      <button type="button" className="day-nav-today" onClick={onToday}>
        Today
      </button>
      <label className="flex items-center gap-2 text-xs">
        <span className="sr-only">Jump to a plan date</span>
        {/* Base CSS sets `width: 100%` on form fields through a zero-specificity
            `:where(...)` rule, so the plain `w-auto` utility already wins — no
            `!important` needed. */}
        <input
          type="date"
          className="h-8 w-auto rounded-control border border-rule bg-paper px-2 py-0 text-xs tabular"
          min={planStart}
          max={planEnd}
          value={selected}
          onChange={(event) => {
            if (event.target.value) onSelect(event.target.value);
          }}
        />
      </label>
    </>
  );
}
