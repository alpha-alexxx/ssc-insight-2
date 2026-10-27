import type { PlanTaskType } from "./schema";

/**
 * Client-safe planner view models and derivation helpers, shared by the
 * API routes, the shell hook, and every planner view. Pure functions over
 * the merged plan+progress payload — covered by tests (tests/plan-derive).
 */

export type PlanTaskStatus = "todo" | "in_progress" | "completed" | "skipped";

export type PlanTaskView = {
  key: string;
  day: number;
  date: string;
  type: PlanTaskType;
  name: string;
  questions: number;
  marks: number;
  url: string;
  linkLabel: string;
  completed: boolean;
  score: number | null;
  percentile: number | null;
  wrong: number | null;
  unattempted: number | null;
  rev1: boolean;
  rev2: boolean;
  rev3: boolean;
  notes: string;
};

export type PlanDayView = {
  day: number;
  date: string;
  weekday: string;
  phase: number;
  dayType: string;
  tasks: PlanTaskView[];
  revisionTasks: string[];
  /** Indexes (as strings) of day-level revision tasks marked done. */
  revisionDone: string[];
  checklist: { id: string; label: string; done: boolean }[];
  notes: string;
  /** Derived: every task completed AND every checklist item done. */
  dayCompleted: boolean;
};

export type PlanPayload = {
  title: string;
  source: string;
  startDate: string;
  endDate: string;
  testSeriesUrl: string;
  phases: { phase: number; name: string; days: string; dateRange: string; focus: string }[];
  revisionMethod: { rev1: string; rev2: string; rev3: string };
  days: PlanDayView[];
};

export type PersonalTaskView = {
  id: string;
  title: string;
  notes: string;
  dueDate: string | null;
  /** Validated http(s) link, or "" when the task has none. */
  url: string;
  category: string;
  priority: "low" | "normal" | "high";
  status: PlanTaskStatus;
  createdAt: string;
};

export const PLAN_CATEGORIES: Record<
  PlanTaskType,
  { label: string; short: string }
> = {
  live_mock: { label: "Live mock", short: "Live" },
  paid_mock: { label: "Paid mock", short: "Paid" },
  maths_sectional: { label: "Maths sectional", short: "Maths sec." },
  reasoning_sectional: { label: "Reasoning sectional", short: "Reason. sec." },
  english_sectional: { label: "English sectional", short: "English sec." },
  gk_sectional: { label: "GK sectional", short: "GK sec." },
  maths_topic: { label: "Maths topic test", short: "Topic" },
  best_questions: { label: "Best questions", short: "Best Qs" },
  computer_mock: { label: "Computer mock", short: "Computer" },
  computer_pyq: { label: "Computer PYQ", short: "PYQ" },
};

/** Mock-like categories (full-length papers); the rest are practice sets. */
const MOCK_TYPES: ReadonlySet<PlanTaskType> = new Set([
  "live_mock",
  "paid_mock",
]);

export function isMockType(type: PlanTaskType): boolean {
  return MOCK_TYPES.has(type);
}

export function planCategoryLabel(type: PlanTaskType): string {
  return PLAN_CATEGORIES[type].label;
}

/* ---------- dates (Asia/Kolkata — the tracker's display zone) ---------- */

const IST_TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
});

/** Today's ISO date (YYYY-MM-DD) in Asia/Kolkata. */
export function istTodayIso(): string {
  return IST_TODAY.format(new Date());
}

export function addIsoDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday-based week start of the given ISO date. */
export function weekStartIso(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7;
  return addIsoDays(iso, -weekday);
}

/** ISO date range (inclusive) for the Monday-based week containing `iso`. */
export function weekRange(iso: string): { from: string; to: string } {
  const from = weekStartIso(iso);
  return { from, to: addIsoDays(from, 6) };
}

export function isoMonthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function isoMonthEnd(iso: string): string {
  const date = new Date(`${iso.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

export function isoWeekdayName(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

/* ---------- derivations (single source for dashboard + views) ---------- */

export function dayAssignmentStats(day: PlanDayView) {
  const total = day.tasks.length;
  const completed = day.tasks.filter((task) => task.completed).length;
  return {
    total,
    completed,
    outstanding: total - completed,
    allTasksDone: total > 0 && completed === total,
    dayCompleted:
      day.checklist.every((item) => item.done) &&
      total > 0 &&
      completed === total,
  };
}

export function planProgressStats(days: PlanDayView[]) {
  const totalAssignments = days.reduce(
    (sum, day) => sum + day.tasks.length,
    0,
  );
  const completedAssignments = days.reduce(
    (sum, day) => sum + dayAssignmentStats(day).completed,
    0,
  );
  return {
    totalDays: days.length,
    completedDays: days.filter((day) => dayAssignmentStats(day).dayCompleted)
      .length,
    totalAssignments,
    completedAssignments,
    completionPct:
      totalAssignments === 0
        ? 0
        : Math.round((completedAssignments / totalAssignments) * 100),
  };
}

/**
 * The next recommended action: today's first outstanding task, then any
 * past-due work (oldest first), then the nearest future assignment —
 * always derived from real progress, never invented.
 */
export function nextRecommendedAction(
  days: PlanDayView[],
  todayIso: string,
): { task: PlanTaskView; day: PlanDayView; overdue: boolean } | null {
  const byDate = [...days].sort((a, b) => a.date.localeCompare(b.date));
  for (const day of byDate) {
    if (day.date !== todayIso) continue;
    const task = day.tasks.find((t) => !t.completed);
    if (task) return { task, day, overdue: false };
  }
  for (const day of byDate) {
    if (day.date >= todayIso) continue;
    const task = day.tasks.find((t) => !t.completed);
    if (task) return { task, day, overdue: true };
  }
  for (const day of byDate) {
    const task = day.tasks.find((t) => !t.completed);
    if (task) return { task, day, overdue: false };
  }
  return null;
}

/** Scheduled mocks/tests from `todayIso` onward, oldest first. */
export function upcomingMocks(
  days: PlanDayView[],
  todayIso: string,
  limit = 5,
): { task: PlanTaskView; day: PlanDayView }[] {
  const out: { task: PlanTaskView; day: PlanDayView }[] = [];
  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    if (day.date < todayIso) continue;
    for (const task of day.tasks) {
      if (task.completed) continue;
      out.push({ task, day });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export type RevisionItem = {
  /** Actionable identity: a taskKey (task revisions) or "d{day}:rev{i}" (the
   * day-level revision_tasks strings from the plan). */
  id: string;
  kind: "rev1" | "rev2" | "rev3";
  label: string;
  date: string;
  day: number;
  dayRevisionIndex?: number;
};

/**
 * Revision queue from the plan's own rules — never inferred from elapsed
 * time: Rev-1 is outstanding for completed tasks with rev1 false, weekly
 * Rev-2 covers completed tasks of the running week, final Rev-3 covers
 * plan days 46–50 (task rev3 flags plus the day-level revision blocks).
 */
export function revisionQueue(days: PlanDayView[], todayIso: string) {
  const items: RevisionItem[] = [];
  const week = weekRange(todayIso);
  for (const day of days) {
    const inCurrentWeek =
      day.date >= week.from && day.date <= week.to && day.date <= todayIso;
    for (const task of day.tasks) {
      if (!task.completed) continue;
      if (!task.rev1)
        items.push({ id: task.key, kind: "rev1", label: task.name, date: day.date, day: day.day });
      if (inCurrentWeek && !task.rev2)
        items.push({ id: task.key, kind: "rev2", label: task.name, date: day.date, day: day.day });
      if (day.phase === 3 && !task.rev3)
        items.push({ id: task.key, kind: "rev3", label: task.name, date: day.date, day: day.day });
    }
    day.revisionTasks.forEach((label, index) => {
      const done = day.revisionDone.includes(String(index));
      if (done) return;
      if (day.phase === 3)
        items.push({ id: `d${day.day}:rev${index}`, kind: "rev3", label, date: day.date, day: day.day, dayRevisionIndex: index });
      else if (day.date <= todayIso)
        items.push({ id: `d${day.day}:rev${index}`, kind: "rev2", label, date: day.date, day: day.day, dayRevisionIndex: index });
    });
  }
  const byKind = (kind: RevisionItem["kind"]) =>
    items.filter((item) => item.kind === kind);
  return { items, rev1: byKind("rev1"), rev2: byKind("rev2"), rev3: byKind("rev3"), total: items.length };
}

/** Full plan view of one date plus its neighbouring plan days. */
export function dayNeighbours(days: PlanDayView[], date: string) {
  const index = days.findIndex((day) => day.date === date);
  const clamped = index === -1 ? 0 : index;
  return {
    current: days[clamped]!,
    previous: clamped > 0 ? days[clamped - 1] : undefined,
    next: clamped < days.length - 1 ? days[clamped + 1] : undefined,
  };
}

export function findDayByDate(days: PlanDayView[], date: string) {
  return days.find((day) => day.date === date);
}

/* ---------- personal tasks (shared by calendar, My Tasks, dashboard) ----- */

/**
 * Strict external-link policy for personal tasks, shared by the API
 * validation (progress.ts re-exports this) and the client form: only http(s)
 * URLs are stored, so a task link can always render as a plain anchor that
 * opens a new tab. javascript:, data:, and scheme-less text fail. An empty
 * string passes here and normalizes to null before persisting.
 */
export const safeHttpUrlCore = (value: string): boolean => {
  if (!value) return true; // empty -> normalized to null before persist
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
};

/**
 * The display status of a personal task: the stored status with "overdue"
 * derived from the due date. A completed task is never overdue, and tasks
 * without a due date are never overdue. The dot system renders these four.
 */
export function effectiveStatus(
  task: Pick<PersonalTaskView, "status" | "dueDate">,
  todayIso: string,
): PlanTaskStatus | "overdue" {
  if (task.status === "completed") return "completed";
  if (task.dueDate && task.dueDate < todayIso) return "overdue";
  return task.status;
}

/** Host of a stored task URL, or null when the URL is missing/invalid. Used
 * for aria-labels and hint chips so raw URLs never flood the UI. */
export function linkHost(url: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/** Personal tasks grouped by their due date ("" bucket = no due date). */
export function personalTasksByDate(
  tasks: PersonalTaskView[],
): Map<string, PersonalTaskView[]> {
  const byDate = new Map<string, PersonalTaskView[]>();
  for (const task of tasks) {
    const key = task.dueDate ?? "";
    const bucket = byDate.get(key);
    if (bucket) bucket.push(task);
    else byDate.set(key, [task]);
  }
  return byDate;
}
