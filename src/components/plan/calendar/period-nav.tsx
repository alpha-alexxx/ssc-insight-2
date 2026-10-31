"use client";
import { PlainIcon } from "../../icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../ui/tooltip";
import { AGENDA_WINDOW, type CalendarMode } from "./visuals";

const UNIT: Record<CalendarMode, string> = {
  month: "month",
  week: "week",
  day: "day",
  agenda: `${AGENDA_WINDOW / 7} weeks`,
};

/** Agenda steps its window at a time, like the week surface steps a week. */
export function stepSize(mode: CalendarMode): number {
  if (mode === "agenda") return AGENDA_WINDOW;
  return mode === "week" ? 7 : 1;
}

/**
 * Period stepping: two arrows, a return-to-today chip, and a date jump. The
 * arrows are disabled at the plan's edges so a student never scrolls into an
 * empty calendar, and the Today chip is only shown while it can do something —
 * a control that reads "Today" but does nothing on press reads as broken.
 */
export function PeriodNav({
  mode,
  selected,
  today,
  planStart,
  planEnd,
  onStep,
  onToday,
  onSelect,
}: {
  mode: CalendarMode;
  selected: string;
  today: string;
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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="day-nav-step"
              aria-label={`Previous ${unit}`}
              disabled={selected <= planStart}
              onClick={() => onStep(-1)}
            >
              <PlainIcon name="arrowLeft" size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Previous {unit}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="day-nav-step"
              aria-label={`Next ${unit}`}
              disabled={selected >= planEnd}
              onClick={() => onStep(1)}
            >
              <PlainIcon name="arrowRight" size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Next {unit}</TooltipContent>
        </Tooltip>
      </div>
      {/* Today + the date jump stay one glued cluster so the phone row reads
          as two ends — arrows here, jump-to-date there — never three
          scattered controls. */}
      <span className="flex items-center gap-2">
        {selected !== today && (
          <button type="button" className="day-nav-today" onClick={onToday}>
            Today
          </button>
        )}
        <label className="flex items-center gap-2 text-xs">
          <span className="sr-only">Jump to a plan date</span>
          {/* Base CSS sets `width: 100%` on form fields through a zero-specificity
              `:where(...)` rule, so the plain `w-auto` utility already wins — no
              `!important` needed. */}
          <input
            type="date"
            className="h-8 w-auto rounded-control border border-rule bg-paper px-2 py-0 text-xs tabular"
            title="Jump to a date"
            aria-label="Jump to a plan date"
            min={planStart}
            max={planEnd}
            value={selected}
            onChange={(event) => {
              if (event.target.value) onSelect(event.target.value);
            }}
          />
        </label>
      </span>
    </>
  );
}
