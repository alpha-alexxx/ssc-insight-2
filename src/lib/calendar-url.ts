import { isIsoDate } from "./format";

/**
 * URL ⇄ calendar-state mapping for /calendar, following the same pattern as
 * filters-url.ts: the URL is a shareable mirror of view state, not the source
 * of truth. Changes are written with history.replaceState — no Next.js
 * navigation, no RSC round-trip, and no history entry per period step. A hard
 * load of a shared URL restores the state once on mount, and malformed params
 * degrade to defaults instead of erroring (a bad value drops only itself).
 * Only non-default values are serialized, so the default landing — month view
 * on today — keeps a clean /calendar address.
 */

export type CalendarViewMode = "month" | "week" | "day" | "agenda";

const VIEWS: ReadonlySet<string> = new Set([
  "month",
  "week",
  "day",
  "agenda",
]);

export type CalendarUrlState = {
  mode: CalendarViewMode | null;
  date: string | null;
};

/** Lenient parse: unknown view names and non-ISO dates read as absent. */
export function parseCalendarState(search: string): CalendarUrlState {
  const params = new URLSearchParams(search);
  const view = params.get("view");
  const date = params.get("date");
  return {
    mode: view && VIEWS.has(view) ? (view as CalendarViewMode) : null,
    date: date && isIsoDate(date) ? date : null,
  };
}

/**
 * Serialize only values that differ from the defaults, so the default landing
 * keeps a clean URL. Defaults are supplied by the caller once the plan payload
 * is known (default mode "month", default date the plan's "today").
 */
export function serializeCalendarState(
  mode: CalendarViewMode,
  date: string,
  defaults: { mode: CalendarViewMode; date: string },
): string {
  const params = new URLSearchParams();
  if (mode !== defaults.mode) params.set("view", mode);
  if (date !== defaults.date) params.set("date", date);
  const query = params.toString();
  return query ? `/calendar?${query}` : "/calendar";
}
