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
} from "./todos-core";
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
  const { version, completed, restore, ...patch } = d;
  const state = completionState(
    d.subtasks ?? normalizeSubtasks(old.subtasks),
    old.status,
    completed,
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
export async function listTodos(userId: string, params: URLSearchParams) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = params.get("date") || today;
  if (!todoCreateSchema.shape.dueDate.safeParse(date).success)
    throw new RequestError("Choose a valid date.", 400);
  const view = params.get("view") || "day";
  const search = (params.get("search") || "").slice(0, 200);
  const page = Math.max(
    1,
    Math.min(100000, Math.floor(Number(params.get("page"))) || 1),
  );
  const limit = Math.max(
    1,
    Math.min(100, Math.floor(Number(params.get("limit"))) || 50),
  );
  const active: Prisma.PersonalTaskWhereInput = { userId, deletedAt: null };
  const where: Prisma.PersonalTaskWhereInput = {
    userId,
    deletedAt: view === "trash" ? { not: null } : null,
    ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
  };
  if (view === "day" || view === "today")
    where.dueDate = view === "today" ? today : date;
  if (view === "overdue") {
    where.dueDate = { lt: today };
    where.status = { not: "completed" };
  }
  if (view === "upcoming") {
    where.dueDate = { gt: today };
    where.status = { not: "completed" };
  }
  if (view === "needsdate") where.dueDate = null;
  if (
    ![
      "day",
      "today",
      "overdue",
      "upcoming",
      "all",
      "trash",
      "needsdate",
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
  const db = database();
  const [ids, total, groups, counts] = await Promise.all([
    db.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT "id" FROM "ssc_insight"."PersonalTask" WHERE ${Prisma.join(clauses, " AND ")} ORDER BY CASE WHEN "status"='completed' THEN 1 ELSE 0 END, CASE "priority" WHEN 'high' THEN 0 WHEN 'low' THEN 2 ELSE 1 END,"createdAt","id" LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
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
    },
  };
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
