"use client";
import { PlainIcon } from "../../icon";
import { cn } from "@/lib/utils";
import type { CalendarLayer, EntryCounts } from "@/lib/plan/calendar-entries";
import type { CalendarMode } from "./visuals";
import { CALENDAR_MODES } from "./visuals";
import { LayerToggles } from "./layer-toggles";
import { PeriodNav } from "./period-nav";

/**
 * One control cluster per question: the period title says **what am I looking
 * at**, the arrows and date jump say **how do I move**, the mode segments say
 * **which shape**, and the layer toggles say **what is included**.
 *
 * The period title is the page's single live region. On phones the cluster
 * stacks into three rows (title, movement, mode + layers); from `sm` it folds
 * to two.
 */
export function CalendarToolbar({
  title,
  mode,
  selected,
  today,
  layers,
  totals,
  onStep,
  onToday,
  onSelectDate,
  onMode,
  onToggleLayer,
}: {
  title: string;
  mode: CalendarMode;
  selected: string;
  today: string;
  layers: readonly CalendarLayer[];
  totals: EntryCounts;
  onStep: (direction: 1 | -1) => void;
  onToday: () => void;
  onSelectDate: (iso: string) => void;
  onMode: (mode: CalendarMode) => void;
  onToggleLayer: (layer: CalendarLayer, next: boolean) => void;
}) {
  return (
    <div className="cal-toolbar mt-4 border-b border-rule-soft pb-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2
          className="font-serif text-[1.125rem] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-[1.25rem]"
          aria-live="polite"
        >
          {title}
        </h2>
        <div
          role="group"
          aria-label="Change period"
          className="flex flex-wrap items-center justify-between gap-2 sm:justify-end"
        >
          <PeriodNav
            mode={mode}
            selected={selected}
            today={today}
            onStep={onStep}
            onToday={onToday}
            onSelect={onSelectDate}
          />
        </div>
      </div>

      {/* Mode and layers share one row from sm, but the pair wraps as a unit:
          at 768 with the sidebar open a single row cannot hold both, and a
          half-wrapped control group reads as two broken controls. */}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Calendar view"
          className="segment-group grid w-full grid-cols-4 gap-0.5 sm:inline-flex sm:w-auto sm:flex-none"
        >
          {CALENDAR_MODES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={mode === entry.id}
              className="segment"
              onClick={() => onMode(entry.id)}
            >
              <PlainIcon
                name={entry.icon}
                size={14}
                className={cn(
                  "shrink-0 max-[359px]:hidden",
                  mode !== entry.id && "text-muted",
                )}
              />
              <span className="max-[359px]:hidden">{entry.label}</span>
              <span className="hidden max-[359px]:inline">{entry.short}</span>
            </button>
          ))}
        </div>
        <LayerToggles layers={layers} totals={totals} onToggle={onToggleLayer} />
      </div>
    </div>
  );
}
