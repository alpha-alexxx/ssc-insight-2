import { z } from "zod";

/**
 * Schema for the uploaded 50-day study plan (src/data/study-plan.json).
 * The plan is STATIC SOURCE DATA shared by every account — it is validated
 * once at import and never written back. User progress lives in Prisma and
 * references plan tasks by the deterministic key `d{day}:{taskIndex}`.
 */

export const planTaskTypes = [
  "live_mock",
  "paid_mock",
  "maths_sectional",
  "reasoning_sectional",
  "english_sectional",
  "gk_sectional",
  "maths_topic",
  "best_questions",
  "computer_mock",
  "computer_pyq",
] as const;
export type PlanTaskType = (typeof planTaskTypes)[number];

export const planRevisionSchema = z.object({
  rev1: z.boolean(),
  rev2: z.boolean(),
  rev3: z.boolean(),
});

export const planTaskSchema = z.object({
  type: z.enum(planTaskTypes),
  name: z.string().min(1),
  questions: z.number().int().nonnegative(),
  marks: z.number().int().nonnegative(),
  // Initial state from the source export; the app tracks real progress in
  // the database and never reads these fields as actual performance.
  completed: z.boolean(),
  score: z.number().nullable(),
  percentile: z.number().nullable(),
  wrong: z.number().nullable(),
  unattempted: z.number().nullable(),
  revision: planRevisionSchema,
  url: z.string().url(),
  link_label: z.string().min(1),
  link_source: z.string(),
});

export const planChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  done: z.boolean(),
});

export const planDaySchema = z.object({
  day: z.number().int().positive(),
  date: z.iso.date(),
  weekday: z.string(),
  phase: z.number().int().min(1).max(3),
  day_type: z.string(),
  tasks: z.array(planTaskSchema),
  revision_tasks: z.array(z.string()),
  weak_areas_notes: z.string(),
  day_completed: z.boolean(),
  daily_checklist: z.array(planChecklistItemSchema),
});

export const studyPlanSchema = z.object({
  title: z.string(),
  source: z.string(),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  planned_tests_total: z.number().int(),
  test_series_url: z.string().url(),
  phases: z.array(
    z.object({
      phase: z.number().int(),
      name: z.string(),
      days: z.string(),
      date_range: z.string(),
      focus: z.string(),
    }),
  ),
  revision_method: z.object({
    rev1: z.string(),
    rev2: z.string(),
    rev3: z.string(),
  }),
  daily_targets: z.array(planDaySchema),
});

export type StudyPlan = z.infer<typeof studyPlanSchema>;
export type PlanDay = z.infer<typeof planDaySchema>;
export type PlanTask = z.infer<typeof planTaskSchema>;

/** Deterministic identity for a plan task's progress row. */
export function planTaskKey(day: number, taskIndex: number): string {
  return `d${day}:${taskIndex}`;
}

export function parsePlanTaskKey(key: string): { day: number; taskIndex: number } | null {
  const match = /^d(\d+):(\d+)$/.exec(key);
  if (!match) return null;
  return { day: Number(match[1]), taskIndex: Number(match[2]) };
}
