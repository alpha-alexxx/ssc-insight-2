import "server-only";
import { z } from "zod";
import { database } from "@/lib/db";
import { RequestError } from "@/lib/api";
import { getStudyPlan, getPlanDays } from "./plan";
import { planTaskKey, type PlanTaskType } from "./schema";
import type {
  PersonalTaskView,
  PlanDayView,
  PlanPayload,
  PlanTaskStatus,
  PlanTaskView,
} from "./view-model";

/**
 * User progress for the static 50-day plan. Plan rows are keyed by
 * deterministic identities (taskKey `d{day}:{taskIndex}`, plan day number);
 * every read merges plan × progress, and every mutation writes ONLY
 * progress rows — the schedule itself is never rewritten.
 */

export async function getPlanPayload(userId: string): Promise<PlanPayload> {
  const plan = getStudyPlan();
  const [taskRows, dayRows] = await Promise.all([
    database().planTaskProgress.findMany({ where: { userId } }),
    database().planDayProgress.findMany({ where: { userId } }),
  ]);
  const taskById = new Map(taskRows.map((row) => [row.taskKey, row]));
  const dayByNumber = new Map(dayRows.map((row) => [row.day, row]));

  const days: PlanDayView[] = getPlanDays().map((day) => {
    const progress = dayByNumber.get(day.day);
    const checklistDone = progress?.checklistDone ?? [];
    const revisionDone = progress?.revisionDone ?? [];
    const tasks: PlanTaskView[] = day.tasks.map((task, index) => {
      const row = taskById.get(planTaskKey(day.day, index));
      return {
        key: planTaskKey(day.day, index),
        day: day.day,
        date: day.date,
        type: task.type as PlanTaskType,
        name: task.name,
        questions: task.questions,
        marks: task.marks,
        url: task.url,
        linkLabel: task.link_label,
        completed: row?.completed ?? false,
        score: row?.score ?? null,
        percentile: row?.percentile ?? null,
        wrong: row?.wrong ?? null,
        unattempted: row?.unattempted ?? null,
        rev1: row?.rev1 ?? false,
        rev2: row?.rev2 ?? false,
        rev3: row?.rev3 ?? false,
        notes: row?.notes ?? "",
      };
    });
    const allTasksDone = tasks.length > 0 && tasks.every((t) => t.completed);
    return {
      day: day.day,
      date: day.date,
      weekday: day.weekday,
      phase: day.phase,
      dayType: day.day_type,
      tasks,
      revisionTasks: day.revision_tasks,
      revisionDone,
      checklist: day.daily_checklist.map((item) => ({
        id: item.id,
        label: item.label,
        done: checklistDone.includes(item.id),
      })),
      notes: progress?.dayNotes ?? "",
      dayCompleted:
        allTasksDone && day.daily_checklist.every((c) => checklistDone.includes(c.id)),
    };
  });

  return {
    title: plan.title,
    source: plan.source,
    startDate: plan.start_date,
    endDate: plan.end_date,
    testSeriesUrl: plan.test_series_url,
    phases: plan.phases.map((phase) => ({
      phase: phase.phase,
      name: phase.name,
      days: phase.days,
      dateRange: phase.date_range,
      focus: phase.focus,
    })),
    revisionMethod: plan.revision_method,
    days,
  };
}

export const TASK_PATCH = z.object({
  completed: z.boolean().optional(),
  score: z.number().int().min(0).max(390).nullable().optional(),
  percentile: z.number().min(0).max(100).nullable().optional(),
  wrong: z.number().int().min(0).max(390).nullable().optional(),
  unattempted: z.number().int().min(0).max(390).nullable().optional(),
  rev1: z.boolean().optional(),
  rev2: z.boolean().optional(),
  rev3: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export type TaskPatch = z.infer<typeof TASK_PATCH>;

export async function updateTaskProgress(
  userId: string,
  taskKey: string,
  patch: TaskPatch,
) {
  if (!/^d\d+:\d+$/.test(taskKey))
    throw new RequestError("Unknown plan task", 404);
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch))
    if (value !== undefined) data[key] = value;
  if (!Object.keys(data).length) throw new RequestError("Nothing to update");
  const row = await database().planTaskProgress.upsert({
    where: { userId_taskKey: { userId, taskKey } },
    create: { userId, taskKey, ...data },
    update: data,
  });
  return { key: taskKey, completed: row.completed };
}

export async function setChecklistItem(
  userId: string,
  day: number,
  itemId: string,
  done: boolean,
) {
  const planDay = getPlanDays().find((d) => d.day === day);
  if (!planDay?.daily_checklist.some((item) => item.id === itemId))
    throw new RequestError("Unknown checklist item", 404);
  const existing = await database().planDayProgress.findUnique({
    where: { userId_day: { userId, day } },
  });
  const current = new Set(existing?.checklistDone ?? []);
  if (done) current.add(itemId);
  else current.delete(itemId);
  const row = await database().planDayProgress.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, checklistDone: [...current] },
    update: { checklistDone: [...current] },
  });
  return { day, checklistDone: row.checklistDone };
}

export async function setDayRevision(
  userId: string,
  day: number,
  revisionIndex: number,
  done: boolean,
) {
  const planDay = getPlanDays().find((d) => d.day === day);
  if (!planDay || revisionIndex < 0 || revisionIndex >= planDay.revision_tasks.length)
    throw new RequestError("Unknown revision task", 404);
  const existing = await database().planDayProgress.findUnique({
    where: { userId_day: { userId, day } },
  });
  const current = new Set(existing?.revisionDone ?? []);
  if (done) current.add(String(revisionIndex));
  else current.delete(String(revisionIndex));
  const row = await database().planDayProgress.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, revisionDone: [...current] },
    update: { revisionDone: [...current] },
  });
  return { day, revisionDone: row.revisionDone };
}

export async function setDayNotes(userId: string, day: number, notes: string) {
  const row = await database().planDayProgress.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, checklistDone: [], revisionDone: [], dayNotes: notes },
    update: { dayNotes: notes },
  });
  return { day, dayNotes: row.dayNotes };
}

/* ---------------- personal tasks ---------------- */

export const personalTaskCategories = [
  "revision",
  "practice",
  "error_review",
  "notes",
  "formula",
  "other",
] as const;
export const personalTaskPriorities = ["low", "normal", "high"] as const;
export const personalTaskStatuses = [
  "todo",
  "in_progress",
  "completed",
] as const;

export const personalTaskCreate = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional(),
  dueDate: z.iso.date().nullable().optional(),
  category: z.enum(personalTaskCategories).default("other"),
  priority: z.enum(personalTaskPriorities).default("normal"),
  status: z.enum(personalTaskStatuses).default("todo"),
});

export const personalTaskUpdate = personalTaskCreate.partial();

export type PersonalTaskCreate = z.infer<typeof personalTaskCreate>;

function toView(row: {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
  category: string;
  priority: string;
  status: string;
  createdAt: Date;
}): PersonalTaskView {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? "",
    dueDate: row.dueDate,
    category: row.category,
    priority: (row.priority as PersonalTaskView["priority"]) ?? "normal",
    status: (row.status as PlanTaskStatus) ?? "todo",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listPersonalTasks(userId: string) {
  const rows = await database().personalTask.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }],
  });
  return rows.map(toView);
}

export async function createPersonalTask(
  userId: string,
  input: PersonalTaskCreate,
) {
  const row = await database().personalTask.create({
    data: {
      userId,
      title: input.title,
      notes: input.notes ?? null,
      dueDate: input.dueDate ?? null,
      category: input.category,
      priority: input.priority,
      status: input.status,
    },
  });
  return toView(row);
}

export async function updatePersonalTask(
  userId: string,
  id: string,
  input: Partial<PersonalTaskCreate>,
) {
  const existing = await database().personalTask.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new RequestError("Task not found", 404);
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input))
    if (value !== undefined) data[key] = value;
  if (!Object.keys(data).length) return toView(existing);
  const row = await database().personalTask.update({
    where: { id: existing.id },
    data,
  });
  return toView(row);
}

export async function deletePersonalTask(userId: string, id: string) {
  const existing = await database().personalTask.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new RequestError("Task not found", 404);
  await database().personalTask.delete({ where: { id: existing.id } });
  return { id };
}
