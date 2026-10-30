import type { IconName } from "../../icon";
import type { CalendarViewMode } from "@/lib/calendar-url";
import type { PlanTaskType } from "@/lib/plan/schema";
import { isMockType } from "@/lib/plan/view-model";

/**
 * Calendar presentation helpers. Pure class/data functions with no JSX, so the
 * month, week, day and agenda surfaces agree on one category grammar: a tinted
 * chip where there is room for words, a filled dot where there is not.
 */

/** The mode union lives with the URL mirror (lib/calendar-url.ts). */
export type CalendarMode = CalendarViewMode;

/** Days rendered per agenda window — one bounded fortnight, not the whole
    remaining plan. "Show remaining plan days" lifts the cap in place. */
export const AGENDA_WINDOW = 14;

export const CALENDAR_MODES: {
  id: CalendarMode;
  label: string;
  icon: IconName;
}[] = [
  { id: "month", label: "Month", icon: "calendar" },
  { id: "week", label: "Week", icon: "layers" },
  { id: "day", label: "Day", icon: "file" },
  { id: "agenda", label: "Agenda", icon: "check" },
];

/** Category → chip tint, so a day's mix of work is readable at a glance. */
export function taskChipClass(task: {
  type: PlanTaskType;
  completed: boolean;
}): string {
  if (task.completed) return "bg-positive-soft text-positive line-through";
  if (isMockType(task.type)) return "bg-accent-soft text-accent";
  if (task.type.endsWith("_sectional")) return "bg-positive-soft text-positive";
  if (task.type === "maths_topic") return "bg-warning-soft text-warning";
  return "bg-soft text-muted";
}

/** Category → a solid dot fill for the compact (<sm) month cell. */
export function taskDotClass(task: {
  type: PlanTaskType;
  completed: boolean;
}): string {
  if (task.completed) return "bg-positive";
  if (isMockType(task.type)) return "bg-accent";
  if (task.type.endsWith("_sectional")) return "bg-positive";
  if (task.type === "maths_topic") return "bg-warning";
  return "bg-rule";
}

/** Per-category glyph, shared by the day list and the selected-day panel. */
export function taskIconName(type: PlanTaskType): IconName {
  if (isMockType(type)) return "file";
  if (type.endsWith("_sectional")) return "book";
  if (type === "maths_topic") return "target";
  return "layers";
}

/** Legend entries, in the same order as the tint scale above. */
export const TASK_LEGEND: { label: string; swatch: string }[] = [
  { label: "Mock test", swatch: "bg-accent-soft text-accent" },
  { label: "Sectional test", swatch: "bg-positive-soft text-positive" },
  { label: "Topic test", swatch: "bg-warning-soft text-warning" },
  { label: "Other", swatch: "bg-soft text-muted" },
];
