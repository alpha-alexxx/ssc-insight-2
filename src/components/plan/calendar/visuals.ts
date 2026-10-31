import type { IconName } from "../../icon";
import type { CalendarViewMode } from "@/lib/calendar-url";
import type { PlanTaskType } from "@/lib/plan/schema";
import type { CalendarLayer } from "@/lib/plan/calendar-entries";
import { isMockType } from "@/lib/plan/view-model";

/**
 * Calendar presentation helpers. Pure class/data functions with no JSX, so the
 * month, week, day and agenda surfaces agree on one grammar.
 *
 * The calendar uses **three kinds of ink** rather than three chip colors:
 * scheduled work is printed (a tinted row with a 2px category rule), personal
 * work is a margin note (an outlined row with a status dot), and logged work
 * is a stamp (a neutral row with a serif score). Form carries the layer, so the
 * category palette can stay reserved for plan work.
 */

/** The mode union lives with the URL mirror. */
export type CalendarMode = CalendarViewMode;

/** Days rendered per agenda window — one bounded fortnight. */
export const AGENDA_WINDOW = 14;

export const CALENDAR_MODES: {
  id: CalendarMode;
  label: string;
  short: string;
  icon: IconName;
}[] = [
  { id: "month", label: "Month", short: "M", icon: "calendar" },
  { id: "week", label: "Week", short: "W", icon: "layers" },
  { id: "day", label: "Day", short: "D", icon: "file" },
  { id: "agenda", label: "Agenda", short: "A", icon: "check" },
];

/* ---------- layer toggles and legend ---------- */

export const LAYER_META: Record<
  CalendarLayer,
  { label: string; icon: IconName; swatch: string; tick: string }
> = {
  plan: {
    label: "Plan",
    icon: "calendar",
    /* Printed: a tinted bar with a solid category rule. */
    swatch: "bg-accent-soft border-l-2 border-l-accent",
    tick: "bg-accent",
  },
  tasks: {
    label: "Personal",
    icon: "check",
    /* A margin note: outline only, no tint. */
    swatch: "bg-paper border border-rule",
    tick: "bg-positive",
  },
  mocks: {
    label: "Logged",
    icon: "report",
    /* A stamp: neutral with an ink figure. */
    swatch: "bg-soft border-l-2 border-l-ink",
    tick: "bg-ink",
  },
};

/* ---------- plan category grammar (unchanged meanings) ---------- */

/** Category → row tint plus the 2px left rule that carries the hue. */
export function planRowClass(task: {
  type: PlanTaskType;
  completed: boolean;
}): string {
  if (task.completed)
    return "border-l-2 border-l-positive bg-positive-soft/50 text-muted";
  if (isMockType(task.type))
    return "border-l-2 border-l-accent bg-accent-soft text-ink";
  if (task.type.endsWith("_sectional"))
    return "border-l-2 border-l-positive bg-positive-soft text-ink";
  if (task.type === "maths_topic")
    return "border-l-2 border-l-warning bg-warning-soft text-ink";
  return "border-l-2 border-l-rule bg-soft text-ink";
}

/** The solid fill for the <sm compact marker. */
export function planTickClass(task: {
  type: PlanTaskType;
  completed: boolean;
}): string {
  if (task.completed) return "bg-positive";
  if (isMockType(task.type)) return "bg-accent";
  if (task.type.endsWith("_sectional")) return "bg-positive";
  if (task.type === "maths_topic") return "bg-warning";
  return "bg-rule";
}

/** Per-category glyph, shared by every surface. */
export function taskIconName(type: PlanTaskType): IconName {
  if (isMockType(type)) return "file";
  if (type.endsWith("_sectional")) return "book";
  if (type === "maths_topic") return "target";
  return "layers";
}

/** Plan-category legend. Layer identity is stated separately by the toggles. */
export const TASK_LEGEND: { label: string; swatch: string }[] = [
  { label: "Mock test", swatch: "bg-accent-soft border-l-2 border-l-accent" },
  {
    label: "Sectional",
    swatch: "bg-positive-soft border-l-2 border-l-positive",
  },
  { label: "Topic test", swatch: "bg-warning-soft border-l-2 border-l-warning" },
  { label: "Other", swatch: "bg-soft border-l-2 border-l-rule" },
];
