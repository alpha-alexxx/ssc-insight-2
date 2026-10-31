"use client";
import { PlainIcon } from "../../icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover";
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
 * Period stepping: two arrows, a return-to-today chip, and a date jump.
 *
 * The arrows are **never disabled**. The calendar now shows personal tasks and
 * logged results, so every date in the addressable range is legitimate — the
 * old plan-edge lock made personal work outside 26 Oct – 14 Dec unreachable.
 *
 * The date jump is a Popover rather than an inline field: the native date
 * input is awkward inside a toolbar row on phones, and the popover gives it a
 * full-width row plus Radix focus management. It must stay outside any drawer
 * (overlays share z-50), which is why it lives in the toolbar.
 */
export function PeriodNav({
  mode,
  selected,
  today,
  onStep,
  onToday,
  onSelect,
}: {
  mode: CalendarMode;
  selected: string;
  today: string;
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
              className="day-nav-step tap-target"
              aria-label={`Previous ${unit}`}
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
              className="day-nav-step tap-target"
              aria-label={`Next ${unit}`}
              onClick={() => onStep(1)}
            >
              <PlainIcon name="arrowRight" size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Next {unit}</TooltipContent>
        </Tooltip>
      </div>

      <span className="flex items-center gap-2">
        {selected !== today && (
          <button type="button" className="day-nav-today" onClick={onToday}>
            Today
          </button>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="day-nav-today tap-target inline-flex items-center gap-1.5"
              aria-label="Jump to a date"
            >
              <PlainIcon name="calendar" size={13} />
              <span className="hidden sm:inline">Jump</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <label className="block text-[10px] font-medium text-muted">
              Jump to a date
              <input
                type="date"
                className="mt-1 h-9 w-full rounded-control border border-rule bg-paper px-2 py-0 text-sm tabular"
                value={selected}
                onChange={(event) => {
                  if (event.target.value) onSelect(event.target.value);
                }}
              />
            </label>
            <p className="mt-2 text-[10px] text-muted">
              Any date works, including outside the study plan.
            </p>
          </PopoverContent>
        </Popover>
      </span>
    </>
  );
}
