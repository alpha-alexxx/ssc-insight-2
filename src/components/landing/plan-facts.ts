import { PLAN_CATEGORIES, dayTypeLabel } from "@/lib/plan/view-model";

/**
 * Pure derivation of the landing page's plan facts. Kept separate from
 * `plan-data.ts` (which is `server-only` and owns the JSON import) so the
 * counting rules are unit-testable without a Next.js runtime.
 *
 * The input is validated against the app's own `studyPlanSchema` at the
 * boundary, so the landing can never quietly read a field the workspace does
 * not have. Counts always come from the actual rows: the source export
 * declares 273 planned tests but contains 262, and the landing repeats the
 * real number.
 */

type RawTask = { type: string; name: string; questions: number; marks: number };
type RawDay = {
  day: number;
  date: string;
  weekday: string;
  phase: number;
  day_type: string;
  tasks: RawTask[];
  daily_checklist: { id: string; label: string }[];
};
type RawPhase = { phase: number; name: string; days: string };

export type LandingPlanDay = {
  day: number;
  date: string;
  weekday: string;
  phase: number;
  dayType: string;
  taskCount: number;
  hasMock: boolean;
};

export type LandingPlanTask = {
  name: string;
  category: string;
  short: string;
  questions: number;
  marks: number;
};

export type LandingPlanData = {
  /** Every plan day, in order — the 50-cell grid. */
  days: LandingPlanDay[];
  /** Task rows in the source, never the declared total. */
  taskCount: number;
  mockDayCount: number;
  phases: {
    phase: number;
    name: string;
    days: string;
    from: number;
    to: number;
  }[];
  /** Day 3 — the sample "today" the day-workspace card illustrates. */
  sampleDay: {
    day: number;
    date: string;
    dayType: string;
    phaseName: string;
    tasks: LandingPlanTask[];
    checklist: string[];
  };
};

const isMock = (type: string) =>
  type === "live_mock" || type === "paid_mock";

/** Category metadata for a task type, with a safe fallback. */
function category(type: string) {
  return (
    PLAN_CATEGORIES[type as keyof typeof PLAN_CATEGORIES] ?? {
      label: "Other",
      short: "Other",
    }
  );
}

export function buildLandingPlan(
  rawDays: RawDay[],
  rawPhases: RawPhase[],
): LandingPlanData {
  const days = [...rawDays].sort((a, b) => a.day - b.day);
  const sample = days.find((day) => day.day === 3) ?? days[0]!;
  return {
    days: days.map((day) => ({
      day: day.day,
      date: day.date,
      weekday: day.weekday,
      phase: day.phase,
      dayType: dayTypeLabel(day.day_type),
      taskCount: day.tasks.length,
      hasMock: day.tasks.some((task) => isMock(task.type)),
    })),
    taskCount: days.reduce((sum, day) => sum + day.tasks.length, 0),
    mockDayCount: days.filter((day) =>
      day.tasks.some((task) => isMock(task.type)),
    ).length,
    phases: rawPhases.map((phase) => {
      const [from, to] = phase.days.split("-").map(Number) as [number, number];
      return {
        phase: phase.phase,
        name: phase.name,
        days: phase.days,
        from,
        to,
      };
    }),
    sampleDay: {
      day: sample.day,
      date: sample.date,
      dayType: dayTypeLabel(sample.day_type),
      phaseName:
        rawPhases.find((phase) => phase.phase === sample.phase)?.name ?? "Build",
      tasks: sample.tasks.map((task) => ({
        name: task.name,
        category: category(task.type).label,
        short: category(task.type).short,
        questions: task.questions,
        marks: task.marks,
      })),
      checklist: sample.daily_checklist.map((item) => item.label),
    },
  };
}
