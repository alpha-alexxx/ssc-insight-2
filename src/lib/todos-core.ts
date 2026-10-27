import { z } from "zod";

export const todoListOptions = z.object({
  completion: z.enum(["all", "pending", "completed"]).default("all"),
  priority: z.enum(["all", "high", "normal", "low"]).default("all"),
  group: z.string().max(100).default("all"),
  sort: z.enum(["priority", "date", "newest", "title"]).default("priority"),
  excludeDate: z.iso.date().optional(),
});

export const todoCalendarRange = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
  })
  .refine(({ from, to }) => {
    const days = (Date.parse(to) - Date.parse(from)) / 86400000;
    return days >= 0 && days < 42;
  }, "Choose an inclusive range of at most 42 days.");

export function todoCalendarWhere(
  userId: string,
  range: z.infer<typeof todoCalendarRange>,
) {
  return {
    userId,
    deletedAt: null,
    dueDate: { gte: range.from, lte: range.to },
  };
}

export function calendarCounts(
  rows: { dueDate: string | null; status: string; _count: { _all: number } }[],
) {
  const days: Record<string, { pending: number; completed: number }> = {};
  for (const row of rows) {
    if (!row.dueDate) continue;
    const day = (days[row.dueDate] ??= { pending: 0, completed: 0 });
    day[row.status === "completed" ? "completed" : "pending"] +=
      row._count._all;
  }
  return days;
}

/**
 * Strict external-link policy for personal todos, shared by the API
 * validation and the AI proposal schemas: only http(s) URLs are stored, so a
 * todo link can always render as a plain anchor that opens a new tab.
 * javascript:, data:, and scheme-less text fail. An empty string passes and
 * normalizes to null before persisting. The length cap matches the
 * PersonalTask.url column (VARCHAR(2048)).
 */
export const safeTodoUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
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
  }, "Use a full link starting with https:// or http://");

export const subtaskSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  completed: z.boolean().default(false),
});
export type TodoSubtask = z.infer<typeof subtaskSchema>;
export const todoCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  dueDate: z.iso.date(),
  notes: z.string().max(2000).nullable().optional(),
  url: safeTodoUrl.nullable().optional(),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
  groupId: z.string().nullable().optional(),
  completed: z.boolean().optional(),
  subtasks: z
    .array(subtaskSchema)
    .max(100)
    .refine(
      (items) => new Set(items.map((s) => s.id)).size === items.length,
      "Subtask IDs must be unique.",
    )
    .default([]),
});
export const todoPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  dueDate: z.iso.date().optional(),
  notes: z.string().max(2000).nullable().optional(),
  url: safeTodoUrl.nullable().optional(),
  priority: z.enum(["high", "normal", "low"]).optional(),
  groupId: z.string().nullable().optional(),
  subtasks: z
    .array(subtaskSchema)
    .max(100)
    .refine(
      (items) => new Set(items.map((s) => s.id)).size === items.length,
      "Subtask IDs must be unique.",
    )
    .optional(),
  version: z.number().int().min(1),
  completed: z.boolean().optional(),
  restore: z.boolean().optional(),
});
export const todoOperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create"), data: todoCreateSchema }),
  z.object({
    type: z.enum(["update", "delete", "restore"]),
    id: z.string().min(1),
    version: z.number().int().min(1),
    data: todoPatchSchema.omit({ version: true, restore: true }).optional(),
  }),
]);
export const todoApplySchema = z.object({
  idempotencyKey: z.string().min(8).max(100),
  operations: z.array(todoOperationSchema).min(1).max(25),
});
export function normalizeSubtasks(value: unknown): TodoSubtask[] {
  const r = z.array(subtaskSchema).safeParse(value);
  return r.success ? r.data : [];
}
export function completionState(
  subtasks: TodoSubtask[],
  prior: string,
  completed?: boolean,
) {
  const next =
    completed === undefined
      ? subtasks
      : subtasks.map((s) => ({ ...s, completed }));
  const status =
    completed !== undefined
      ? completed
        ? "completed"
        : "todo"
      : next.length
        ? next.every((s) => s.completed)
          ? "completed"
          : "todo"
        : prior;
  return { subtasks: next, status };
}
