import "server-only";
import { createHash } from "node:crypto";
import { database } from "./db";
import { RequestError } from "./api";
import { Prisma } from "@/generated/prisma/client";
import {
  completionState,
  normalizeSubtasks,
  todoCreateSchema,
  todoPatchSchema,
  todoApplySchema,
  todoListOptions,
  todoCalendarRange,
  todoCalendarWhere,
  calendarCounts,
} from "./todos-core";
import { istTodayIso } from "./plan/view-model";
type Tx = Prisma.TransactionClient;
export const todoView = (r: Record<string, unknown>) => ({
  ...r,
  subtasks: normalizeSubtasks(r.subtasks),
});
async function groupCheck(
  tx: Tx,
  userId: string,
  id: string | null | undefined,
) {
  if (id && !(await tx.todoGroup.findFirst({ where: { id, userId } })))
    throw new RequestError("Group not found.", 404);
}
export async function createTodo(tx: Tx, userId: string, input: unknown) {
  const d = todoCreateSchema.parse(input);
  const { completed, ...fields } = d;
  await groupCheck(tx, userId, d.groupId);
  return tx.personalTask.create({
    data: {
      ...fields,
      userId,
      category: "other",
      ...completionState(d.subtasks, "todo", completed),
    },
  });
}
export async function mutateTodo(
  tx: Tx,
  userId: string,
  id: string,
  input: unknown,
  trash = false,
) {
  const d = todoPatchSchema.parse(input);
  const old = await tx.personalTask.findFirst({ where: { id, userId } });
  if (!old) throw new RequestError("Todo not found.", 404);
  if (old.version !== d.version)
    throw new RequestError(
      "This todo changed. Refresh and review your changes again.",
      409,
    );
  if (old.deletedAt && !d.restore && !trash)
    throw new RequestError("Restore this todo before editing.", 409);
  await groupCheck(tx, userId, d.groupId);
  const { version, completed, status, restore, ...patch } = d;
  const subtasks = d.subtasks ?? normalizeSubtasks(old.subtasks);
  // An explicit status wins over the completed flag. "in_progress" is a
  // working state, so subtask progress is preserved as-is; "completed" /
  // "todo" reuse the same cascade as the completed flag (complete cascades
  // to all subtasks, reopening clears them — the long-standing behavior).
  const state =
    status === "in_progress"
      ? { subtasks, status }
      : completionState(
          subtasks,
          old.status,
          status ? status === "completed" : completed,
        );
  const updated = await tx.personalTask.updateMany({
    where: { id, userId, version },
    data: {
      ...patch,
      ...state,
      ...(trash
        ? { deletedAt: new Date() }
        : restore
          ? { deletedAt: null }
          : {}),
      version: { increment: 1 },
    },
  });
  if (!updated.count)
    throw new RequestError("This todo changed. Refresh and review again.", 409);
  return tx.personalTask.findUniqueOrThrow({ where: { id } });
}
/** Shared /api/todos list-query parsing: validates view/date/search and
 * builds the raw SQL where-clauses used by both listing and bulk trash. */
function parseTodoScope(userId: string, params: URLSearchParams) {
  const today = istTodayIso();
  const options = todoListOptions.parse(
    Object.fromEntries(
      ["completion", "priority", "group", "sort", "excludeDate"].flatMap(
        (key) => (params.has(key) ? [[key, params.get(key)]] : []),
      ),
    ),
  );
  const date = params.get("date") || today;
  if (!todoCreateSchema.shape.dueDate.safeParse(date).success)
    throw new RequestError("Choose a valid date.", 400);
  const view = params.get("view") || "day";
  const search = (params.get("search") || "").slice(0, 200);
  if (
    ![
      "day",
      "today",
      "overdue",
      "upcoming",
      "all",
      "trash",
      "needsdate",
      "completed",
    ].includes(view)
  )
    throw new RequestError("Unknown todo view.", 400);
  const clauses = [
    Prisma.sql`"userId" = ${userId}`,
    view === "trash"
      ? Prisma.sql`"deletedAt" IS NOT NULL`
      : Prisma.sql`"deletedAt" IS NULL`,
  ];
  if (search)
    clauses.push(Prisma.sql`position(lower(${search}) in lower("title")) > 0`);
  if (view === "day" || view === "today")
    clauses.push(Prisma.sql`"dueDate" = ${view === "today" ? today : date}`);
  if (view === "overdue")
    clauses.push(Prisma.sql`"dueDate" < ${today} AND "status" <> 'completed'`);
  if (view === "upcoming")
    clauses.push(Prisma.sql`"dueDate" > ${today} AND "status" <> 'completed'`);
  if (view === "needsdate") clauses.push(Prisma.sql`"dueDate" IS NULL`);
  if (view === "completed" || options.completion === "completed")
    clauses.push(Prisma.sql`"status" = 'completed'`);
  if (options.completion === "in_progress")
    clauses.push(Prisma.sql`"status" = 'in_progress'`);
  if (options.completion === "pending")
    clauses.push(Prisma.sql`"status" <> 'completed'`);
  if (options.priority !== "all")
    clauses.push(Prisma.sql`"priority" = ${options.priority}`);
  if (options.excludeDate)
    clauses.push(
      Prisma.sql`("dueDate" IS NULL OR "dueDate" <> ${options.excludeDate})`,
    );
  if (options.group === "ungrouped")
    clauses.push(Prisma.sql`"groupId" IS NULL`);
  else if (options.group !== "all")
    clauses.push(Prisma.sql`"groupId" = ${options.group}`);
  return { today, options, view, clauses };
}
export async function listTodos(userId: string, params: URLSearchParams) {
  const { today, options, clauses } = parseTodoScope(userId, params);
  const page = Math.max(
    1,
    Math.min(100000, Math.floor(Number(params.get("page"))) || 1),
  );
  const limit = Math.max(
    1,
    Math.min(100, Math.floor(Number(params.get("limit"))) || 50),
  );
  const active: Prisma.PersonalTaskWhereInput = { userId, deletedAt: null };
  const sort = {
    priority: Prisma.sql`CASE WHEN "status"='completed' THEN 1 ELSE 0 END, CASE "priority" WHEN 'high' THEN 0 WHEN 'low' THEN 2 ELSE 1 END,"createdAt","id"`,
    date: Prisma.sql`"dueDate" ASC NULLS LAST, CASE WHEN "status"='completed' THEN 1 ELSE 0 END,"createdAt","id"`,
    newest: Prisma.sql`"createdAt" DESC,"id"`,
    title: Prisma.sql`lower("title"),"id"`,
  }[options.sort];
  const db = database();
  const [ids, total, groups, counts] = await Promise.all([
    db.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT "id" FROM "ssc_insight"."PersonalTask" WHERE ${Prisma.join(clauses, " AND ")} ORDER BY ${sort} LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
    ),
    db.$queryRaw<{ total: bigint }[]>(
      Prisma.sql`SELECT count(*) AS total FROM "ssc_insight"."PersonalTask" WHERE ${Prisma.join(clauses, " AND ")}`,
    ),
    db.todoGroup.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    Promise.all([
      db.personalTask.count({ where: { ...active, dueDate: today } }),
      db.personalTask.count({
        where: {
          ...active,
          dueDate: { lt: today },
          status: { not: "completed" },
        },
      }),
      db.personalTask.count({
        where: {
          ...active,
          dueDate: { gt: today },
          status: { not: "completed" },
        },
      }),
      db.personalTask.count({ where: active }),
      db.personalTask.count({ where: { ...active, dueDate: null } }),
      db.personalTask.count({ where: { userId, deletedAt: { not: null } } }),
      db.personalTask.count({ where: { ...active, status: "completed" } }),
      db.personalTask.count({
        where: { ...active, status: { not: "completed" } },
      }),
      db.personalTask.count({ where: { ...active, status: "in_progress" } }),
    ]),
  ]);
  const records = await db.personalTask.findMany({
    where: { userId, id: { in: ids.map((r) => r.id) } },
  });
  const rows = ids.flatMap(({ id }) => {
    const r = records.find((r) => r.id === id);
    return r ? [r] : [];
  });
  return {
    items: rows.map((r) => todoView(r)),
    groups,
    total: Number(total[0]?.total ?? 0),
    page,
    limit,
    counts: {
      today: counts[0],
      overdue: counts[1],
      upcoming: counts[2],
      all: counts[3],
      needsdate: counts[4],
      trash: counts[5],
      completed: counts[6],
      pending: counts[7],
      inProgress: counts[8],
    },
  };
}
/** Bulk soft-delete by explicit ids. Like mutateTodo's trash path, version
 * bumps so stale editors get 409s, but bulk ops skip per-item version
 * checks — the confirm dialog is the safety gate. */
export async function trashTodosById(userId: string, ids: string[]) {
  const { count } = await database().personalTask.updateMany({
    where: { userId, id: { in: ids }, deletedAt: null },
    data: { deletedAt: new Date(), version: { increment: 1 } },
  });
  return { count };
}
/** Bulk soft-delete of everything matching the list query (view + search +
 * filters). Reuses listTodos' clause builder so the confirm count and the
 * deleted set always agree; trash view is rejected (restore instead). */
export async function trashTodosByScope(
  userId: string,
  params: URLSearchParams,
) {
  const { view, clauses } = parseTodoScope(userId, params);
  if (view === "trash")
    throw new RequestError("Use restore in Trash instead.", 400);
  const rows = await database().$executeRaw(
    Prisma.sql`UPDATE "ssc_insight"."PersonalTask"
      SET "deletedAt" = now(), "version" = "version" + 1, "updatedAt" = now()
      WHERE ${Prisma.join(clauses, " AND ")}`,
  );
  return { count: rows };
}
export async function personalCalendar(
  userId: string,
  params: URLSearchParams,
) {
  const range = todoCalendarRange.parse({
    from: params.get("from"),
    to: params.get("to"),
  });
  const rows = await database().personalTask.groupBy({
    by: ["dueDate", "status"],
    where: todoCalendarWhere(userId, range),
    _count: { _all: true },
  });
  return { ...range, days: calendarCounts(rows) };
}
export async function applyTodos(userId: string, input: unknown) {
  const parsed = todoApplySchema.parse(input);
  const hash = createHash("sha256")
    .update(JSON.stringify(parsed.operations))
    .digest("hex");
  return database().$transaction(
    async (tx) => {
      const existing = await tx.todoMutation.findUnique({
        where: { userId_key: { userId, key: parsed.idempotencyKey } },
      });
      if (existing) {
        if (existing.payloadHash !== hash)
          throw new RequestError(
            "This submission key was already used for different changes.",
            409,
          );
        return existing.result;
      }
      const items = [];
      for (const op of parsed.operations) {
        if (op.type === "create")
          items.push(await createTodo(tx, userId, op.data));
        else
          items.push(
            await mutateTodo(
              tx,
              userId,
              op.id,
              {
                ...op.data,
                version: op.version,
                ...(op.type === "restore" ? { restore: true } : {}),
              },
              op.type === "delete",
            ),
          );
      }
      const result = JSON.parse(
        JSON.stringify({ items: items.map((r) => todoView(r)) }),
      ) as Prisma.InputJsonValue;
      await tx.todoMutation.create({
        data: { userId, key: parsed.idempotencyKey, payloadHash: hash, result },
      });
      return result;
    },
    { isolationLevel: "Serializable" },
  );
}
