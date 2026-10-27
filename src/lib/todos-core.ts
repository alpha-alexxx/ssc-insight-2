import { z } from "zod";
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
