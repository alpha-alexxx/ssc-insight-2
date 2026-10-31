"use client";
import { PlainIcon } from "../../icon";
import { cn } from "@/lib/utils";
import {
  CALENDAR_LAYERS,
  type CalendarLayer,
  type EntryCounts,
} from "@/lib/plan/calendar-entries";
import { LAYER_META } from "./visuals";

/**
 * The three layer toggles.
 *
 * Deliberately **inline**, not a popover or dropdown: every overlay in this app
 * portals at z-50, so a popover opened beside a drawer would fight the drawer's
 * focus trap. The toggles sit in the toolbar and are always reachable.
 *
 * The last visible layer cannot be turned off — an empty calendar reads as a
 * broken calendar, and there is no "show all" recovery gesture that a
 * first-time user would find.
 */
export function LayerToggles({
  layers,
  totals,
  onToggle,
}: {
  layers: readonly CalendarLayer[];
  /** Counts across the visible window, so each toggle says what it hides. */
  totals: EntryCounts;
  onToggle: (layer: CalendarLayer, next: boolean) => void;
}) {
  const on = new Set(layers);

  const countFor = (layer: CalendarLayer): number =>
    layer === "plan"
      ? totals.plan.total
      : layer === "tasks"
        ? totals.tasks.total
        : totals.mocks;

  return (
    <div
      role="group"
      aria-label="Calendar layers"
      className="segment-group grid w-full grid-cols-3 gap-0.5 sm:inline-flex sm:w-auto [&_.segment]:min-w-0 [&_.segment]:flex-1 sm:[&_.segment]:flex-none"
    >
      {CALENDAR_LAYERS.map((layer) => {
        const active = on.has(layer);
        const last = active && layers.length === 1;
        const count = countFor(layer);
        return (
          <button
            key={layer}
            type="button"
            aria-pressed={active}
            disabled={last}
            title={last ? "Keep at least one layer visible" : undefined}
            onClick={() => onToggle(layer, !active)}
            className={cn("segment", last && "cursor-not-allowed opacity-70")}
          >
            <PlainIcon
              name={LAYER_META[layer].icon}
              size={13}
              className={cn("shrink-0", !active && "text-muted")}
            />
            <span className="truncate">{LAYER_META[layer].label}</span>
            {count > 0 && (
              <span className="tabular text-[10px] text-muted">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
