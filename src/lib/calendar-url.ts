import { isIsoDate } from "./format";
import {
  CALENDAR_LAYERS,
  DEFAULT_LAYERS,
  sortLayers,
  type CalendarLayer,
} from "./plan/calendar-entries";

/**
 * URL ⇄ calendar-state mapping for /calendar, following the same pattern as
 * filters-url.ts: the URL is a shareable mirror of view state, not the source
 * of truth. Changes are written with history.replaceState — no Next.js
 * navigation, no RSC round-trip, and no history entry per period step. A hard
 * load of a shared URL restores the state once on mount, and malformed params
 * degrade to defaults (a bad value drops only itself).
 *
 * Only non-default values are serialized, so the default landing keeps a
 * clean /calendar address. The view is **absent** by default: the calendar
 * picks agenda on phones and month everywhere else, and that automatic choice
 * must never be written to the address — otherwise every phone landing would
 * rewrite itself to ?view=agenda and bake the default into shared links.
 * Only a view the user explicitly picked is serialized.
 */

export type CalendarViewMode = "month" | "week" | "day" | "agenda";

const VIEWS: ReadonlySet<string> = new Set([
  "month",
  "week",
  "day",
  "agenda",
]);

export type CalendarUrlState = {
  /** null = automatic (agenda under 768px, month above). */
  mode: CalendarViewMode | null;
  date: string | null;
  /** null = every layer visible. */
  layers: CalendarLayer[] | null;
};

const LAYER_NAMES: ReadonlySet<string> = new Set(CALENDAR_LAYERS);

/** Lenient parse: unknown view names, non-ISO dates and unknown layer names
 * read as absent, one value at a time. */
export function parseCalendarState(search: string): CalendarUrlState {
  const params = new URLSearchParams(search);
  const view = params.get("view");
  const date = params.get("date");
  const layers = params.get("layers");

  let parsedLayers: CalendarLayer[] | null = null;
  if (layers) {
    const named = layers
      .split(",")
      .map((name) => name.trim())
      .filter((name): name is CalendarLayer => LAYER_NAMES.has(name));
    // A list that names every layer is the default, and an empty list (all
    // names unknown) cannot mean "hide everything" — the UI forbids it.
    if (named.length && named.length < CALENDAR_LAYERS.length)
      parsedLayers = sortLayers(named);
  }

  return {
    mode: view && VIEWS.has(view) ? (view as CalendarViewMode) : null,
    date: date && isIsoDate(date) ? date : null,
    layers: parsedLayers,
  };
}

/**
 * Serialize only values that differ from the defaults. `mode: null` omits the
 * parameter entirely — see the module note above.
 */
export function serializeCalendarState(
  state: {
    mode: CalendarViewMode | null;
    date: string;
    layers: readonly CalendarLayer[];
  },
  defaults: { date: string },
): string {
  const params = new URLSearchParams();
  if (state.mode) params.set("view", state.mode);
  if (state.date !== defaults.date) params.set("date", state.date);
  if (state.layers.length !== CALENDAR_LAYERS.length)
    params.set(
      "layers",
      sortLayers(state.layers).join(","),
    );
  const query = params.toString();
  return query ? `/calendar?${query}` : "/calendar";
}

/** The layers a surface should render, resolving the "absent" default. */
export function resolveLayers(state: CalendarUrlState): readonly CalendarLayer[] {
  return state.layers ?? DEFAULT_LAYERS;
}
