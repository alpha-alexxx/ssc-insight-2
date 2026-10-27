import "server-only";
import { studyPlanSchema, type PlanDay, type StudyPlan } from "./schema";
import planJson from "@/data/study-plan.json";

/**
 * Static, validated access to the 50-day study plan. The JSON is source
 * data exported from the RBE PDF; it is parsed against the schema exactly
 * once at module load, so any structural drift fails fast. Nothing here
 * ever writes back — user progress lives in Prisma (plan/progress.ts).
 */

const parsed = studyPlanSchema.parse(planJson) as StudyPlan;

export function getStudyPlan(): StudyPlan {
  return parsed;
}

export function getPlanDays(): PlanDay[] {
  return parsed.daily_targets;
}

export function getPlanDayByDate(date: string): PlanDay | undefined {
  return parsed.daily_targets.find((day) => day.date === date);
}

export function getPlanDayByNumber(dayNumber: number): PlanDay | undefined {
  return parsed.daily_targets.find((day) => day.day === dayNumber);
}

/**
 * The plan day a given ISO date belongs to: the matching day inside the
 * plan window, day 1 before it starts, the last day after it ends, and
 * undefined for dates outside the JSON's own span (never expected).
 */
export function getPlanDayForDate(date: string): PlanDay | undefined {
  const days = parsed.daily_targets;
  if (date <= days[0]!.date) return days[0];
  if (date >= days.at(-1)!.date) return days.at(-1);
  return days.find((day) => day.date === date);
}

/**
 * The plan day to open for "today": the matching day in-window, or the
 * nearest edge (the most recent day before today, else day 1).
 */
export function getTodayPlanDay(todayIso: string): PlanDay {
  const days = parsed.daily_targets;
  if (todayIso <= days[0]!.date) return days[0];
  const current = [...days].reverse().find((day) => day.date <= todayIso);
  return current ?? days[0];
}

export function getPhase(phaseNumber: number) {
  return parsed.phases.find((phase) => phase.phase === phaseNumber);
}
