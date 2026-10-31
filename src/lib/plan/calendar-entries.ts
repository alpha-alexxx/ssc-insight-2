import { istDateKey } from "@/lib/format";
import { totals, type Attempt } from "@/lib/domain";
import {
  effectiveStatus,
  type PersonalTaskView,
  type PlanDayView,
  type PlanTaskView,
  type PlanTaskStatus,
} from "./view-model";
import { matchAttemptForTask } from "./attempt-match";

/**
 * The calendar's one derived model: plan assignments, personal tasks and
 * logged attempts flattened into date-keyed entries.
 *
 * Pure and client-safe — no React, no JSX, no database. Every surface
 * (month, week, day, agenda, the metric strip, the layer toggles) reads this
 * index instead of re-deriving per surface, so "what is on this day" has one
 * answer and one cost. Covered by tests/calendar-entries.test.ts.
 *
 * Two deliberate rules:
 *
 * 1. **Revision is a kind inside the plan layer, not its own layer.** It is
 *    scheduled work, and a fourth toggle would put five controls in one phone
 *    row for 13 rows across the whole plan.
 * 2. **Revision comes from the day's own `revisionTasks`, never
 *    `revisionQueue()`.** The queue is today-relative, so entries would move
 *    under the user as the clock rolls over and a shared `?date=` link would
 *    show different work tomorrow. The queue stays a dashboard concept.
 */

export const CALENDAR_LAYERS = ["plan", "tasks", "mocks"] as const;
export type CalendarLayer = (typeof CALENDAR_LAYERS)[number];
export const DEFAULT_LAYERS: readonly CalendarLayer[] = CALENDAR_LAYERS;

/** Canonical order, so two equal layer sets always produce the same string. */
export function sortLayers(layers: Iterable<CalendarLayer>): CalendarLayer[] {
  const set = new Set(layers);
  return CALENDAR_LAYERS.filter((layer) => set.has(layer));
}

export function layersToMask(layers: readonly CalendarLayer[]): string {
  const set = new Set(layers);
  return CALENDAR_LAYERS.map((layer) => (set.has(layer) ? "1" : "0")).join("");
}

export function maskToLayers(mask: string): CalendarLayer[] {
  return CALENDAR_LAYERS.filter((_, index) => mask[index] === "1");
}

type EntryBase = {
  /** Stable across refetches — the React key and the lookup identity. */
  id: string;
  /** IST calendar date, YYYY-MM-DD. */
  date: string;
};

export type PlanTaskEntry = EntryBase & {
  kind: "plan-task";
  layer: "plan";
  task: PlanTaskView;
  day: PlanDayView;
};

export type RevisionEntry = EntryBase & {
  kind: "revision";
  layer: "plan";
  day: PlanDayView;
  /** Index into `day.revisionTasks` (the deterministic completion key). */
  dayRevisionIndex: number;
  label: string;
  done: boolean;
};

export type PersonalEntry = EntryBase & {
  kind: "personal";
  layer: "tasks";
  task: PersonalTaskView;
  status: PlanTaskStatus | "overdue";
  overdue: boolean;
};

export type AttemptEntry = EntryBase & {
  kind: "attempt";
  layer: "mocks";
  attempt: Attempt;
  /** Score percentage, clamped to 0–100. */
  scorePct: number;
  /** The plan task this attempt plausibly completes, when one matches. */
  matchedPlanTaskKey: string | null;
};

export type CalendarEntry =
  | PlanTaskEntry
  | RevisionEntry
  | PersonalEntry
  | AttemptEntry;

export type EntryCounts = {
  plan: { total: number; done: number };
  rev: { total: number; done: number };
  tasks: { total: number; done: number; overdue: number };
  mocks: number;
};

export const EMPTY_COUNTS: EntryCounts = {
  plan: { total: 0, done: 0 },
  rev: { total: 0, done: 0 },
  tasks: { total: 0, done: 0, overdue: 0 },
  mocks: 0,
};

export type CalendarIndex = {
  /** Every entry on every date, unfiltered and pre-sorted. */
  byDate: ReadonlyMap<string, readonly CalendarEntry[]>;
  /** Dates that have at least one entry, ascending. */
  dates: readonly string[];
  planDayByDate: ReadonlyMap<string, PlanDayView>;
  totals: EntryCounts;
  /** Unique personal tasks without a date — they belong to My Tasks. */
  unmatchedTodos: number;
  /** Attempts whose completedAt could not be read as a date. */
  invalidAttempts: number;
  /** Union of entry dates, or null when there are no entries at all. */
  range: { min: string; max: string } | null;
};

const PRIORITY_RANK: Record<string, number> = { high: 0, normal: 1, low: 2 };

function personalStatusRank(status: PlanTaskStatus | "overdue"): number {
  switch (status) {
    case "overdue":
      return 0;
    case "in_progress":
      return 1;
    case "todo":
      return 2;
    default:
      return 3; // completed — sinks
  }
}

/** The documented in-day order: scheduled → owed → evidence. */
function compareEntries(a: CalendarEntry, b: CalendarEntry): number {
  const kindRank = (entry: CalendarEntry): number => {
    switch (entry.kind) {
      case "plan-task":
        return 0;
      case "revision":
        return 1;
      case "personal":
        return 2;
      case "attempt":
        return 3;
    }
  };
  const rank = kindRank(a) - kindRank(b);
  if (rank !== 0) return rank;

  if (a.kind === "plan-task" && b.kind === "plan-task")
    return a.day.day - b.day.day; // plan order, preserved

  if (a.kind === "revision" && b.kind === "revision")
    return a.dayRevisionIndex - b.dayRevisionIndex;

  if (a.kind === "personal" && b.kind === "personal") {
    const status =
      personalStatusRank(a.status) - personalStatusRank(b.status);
    if (status !== 0) return status;
    const priority =
      (PRIORITY_RANK[a.task.priority] ?? 1) -
      (PRIORITY_RANK[b.task.priority] ?? 1);
    if (priority !== 0) return priority;
    return a.task.createdAt.localeCompare(b.task.createdAt);
  }

  if (a.kind === "attempt" && b.kind === "attempt")
    return a.attempt.completedAt.localeCompare(b.attempt.completedAt);

  return 0;
}

function attemptScorePct(attempt: Attempt): number {
  const sums = totals(attempt);
  if (!sums.maxScore) return 0;
  const pct = (sums.score / sums.maxScore) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function pushDate(map: Map<string, CalendarEntry[]>, date: string, entry: CalendarEntry) {
  const bucket = map.get(date);
  if (bucket) bucket.push(entry);
  else map.set(date, [entry]);
}

export function buildCalendarIndex(input: {
  days: readonly PlanDayView[];
  personalTasks: readonly PersonalTaskView[];
  attempts: readonly Attempt[];
  todayIso: string;
}): CalendarIndex {
  const { days, personalTasks, attempts, todayIso } = input;
  const byDate = new Map<string, CalendarEntry[]>();
  const planDayByDate = new Map<string, PlanDayView>();
  const planTaskNamesByDate = new Map<string, PlanTaskView[]>();
  let unmatchedTodos = 0;
  let invalidAttempts = 0;

  for (const day of days) {
    planDayByDate.set(day.date, day);
    const tasks = planTaskNamesByDate.get(day.date);
    if (tasks) tasks.push(...day.tasks);
    else planTaskNamesByDate.set(day.date, [...day.tasks]);

    day.tasks.forEach((task) => {
      pushDate(byDate, day.date, {
        kind: "plan-task",
        layer: "plan",
        id: `plan:${task.key}`,
        date: day.date,
        task,
        day,
      });
    });

    day.revisionTasks.forEach((label, dayRevisionIndex) => {
      pushDate(byDate, day.date, {
        kind: "revision",
        layer: "plan",
        id: `rev:${day.date}:${dayRevisionIndex}`,
        date: day.date,
        day,
        dayRevisionIndex,
        label,
        done: day.revisionDone.includes(String(dayRevisionIndex)),
      });
    });
  }

  for (const task of personalTasks) {
    if (!task.dueDate) {
      unmatchedTodos += 1;
      continue;
    }
    const status = effectiveStatus(task, todayIso);
    pushDate(byDate, task.dueDate, {
      kind: "personal",
      layer: "tasks",
      id: `todo:${task.id}`,
      date: task.dueDate,
      task,
      status,
      overdue: status === "overdue",
    });
  }

  /* Per-bucket name matching only: a date holds a handful of tasks and a
   * handful of attempts, so this never scans the whole attempt history. */
  const attemptsByDate = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const date = istDateKey(attempt.completedAt);
    if (!date) {
      invalidAttempts += 1;
      continue;
    }
    const bucket = attemptsByDate.get(date);
    if (bucket) bucket.push(attempt);
    else attemptsByDate.set(date, [attempt]);

    const candidates = planTaskNamesByDate.get(date) ?? [];
    const matched = candidates.find((task) =>
      matchAttemptForTask(task, [attempt]),
    );
    pushDate(byDate, date, {
      kind: "attempt",
      layer: "mocks",
      id: `attempt:${attempt.id}`,
      date,
      attempt,
      scorePct: attemptScorePct(attempt),
      matchedPlanTaskKey: matched?.key ?? null,
    });
  }

  for (const bucket of byDate.values()) bucket.sort(compareEntries);

  const dates = [...byDate.keys()].sort();
  return {
    byDate,
    dates,
    planDayByDate,
    totals: countAll(byDate.values()),
    unmatchedTodos,
    invalidAttempts,
    range: dates.length
      ? { min: dates[0]!, max: dates[dates.length - 1]! }
      : null,
  };
}

function emptyCounts(): EntryCounts {
  return {
    plan: { total: 0, done: 0 },
    rev: { total: 0, done: 0 },
    tasks: { total: 0, done: 0, overdue: 0 },
    mocks: 0,
  };
}

/** Count every bucket without flattening them into one array. */
function countAll(
  buckets: Iterable<readonly CalendarEntry[]>,
): EntryCounts {
  const counts = emptyCounts();
  for (const bucket of buckets) addToCounts(counts, bucket);
  return counts;
}

function addToCounts(counts: EntryCounts, entries: readonly CalendarEntry[]) {
  for (const entry of entries) {
    switch (entry.kind) {
      case "plan-task":
        counts.plan.total += 1;
        if (entry.task.completed) counts.plan.done += 1;
        break;
      case "revision":
        counts.rev.total += 1;
        if (entry.done) counts.rev.done += 1;
        break;
      case "personal":
        counts.tasks.total += 1;
        if (entry.status === "completed") counts.tasks.done += 1;
        if (entry.overdue) counts.tasks.overdue += 1;
        break;
      case "attempt":
        counts.mocks += 1;
        break;
      default:
        /* Exhaustiveness: a new entry kind must be counted above. */
        entry satisfies never;
    }
  }
}

export function countEntries(entries: readonly CalendarEntry[]): EntryCounts {
  const counts = emptyCounts();
  addToCounts(counts, entries);
  return counts;
}

export { emptyCounts };

export function isEmptyCounts(counts: EntryCounts): boolean {
  return (
    counts.plan.total === 0 &&
    counts.rev.total === 0 &&
    counts.tasks.total === 0 &&
    counts.mocks === 0
  );
}

/** Entries on one date, filtered to the visible layers. */
export function entriesFor(
  index: CalendarIndex,
  date: string,
  layers: readonly CalendarLayer[],
): CalendarEntry[] {
  const bucket = index.byDate.get(date);
  if (!bucket) return [];
  if (layers.length === CALENDAR_LAYERS.length) return [...bucket];
  const visible = new Set(layers);
  return bucket.filter((entry) => visible.has(entry.layer));
}

export function countOn(
  index: CalendarIndex,
  date: string,
  layers: readonly CalendarLayer[],
): EntryCounts {
  return countEntries(entriesFor(index, date, layers));
}

/** Entry-bearing dates inside an inclusive range, ascending. */
export function datesBetween(
  index: CalendarIndex,
  from: string,
  to: string,
  layers: readonly CalendarLayer[],
): string[] {
  return index.dates.filter(
    (date) =>
      date >= from && date <= to && entriesFor(index, date, layers).length > 0,
  );
}

/** The nearest entry-bearing date strictly after/before `date`, if any. */
export function adjacentEntryDate(
  index: CalendarIndex,
  date: string,
  direction: 1 | -1,
  layers: readonly CalendarLayer[] = DEFAULT_LAYERS,
): string | null {
  const candidates = direction === 1 ? index.dates : [...index.dates].reverse();
  for (const candidate of candidates) {
    if (direction === 1 ? candidate <= date : candidate >= date) continue;
    if (entriesFor(index, candidate, layers).length > 0) return candidate;
  }
  return null;
}

/** True when a date falls outside the plan's own window. */
export function outOfPlan(
  date: string,
  startDate: string,
  endDate: string,
): boolean {
  return date < startDate || date > endDate;
}
