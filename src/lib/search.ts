import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { database } from "./db";
import { escapeLike } from "./attempt-persistence";
import { shortDate, mockTypeLabel } from "./format";
import { istTodayIso, effectiveStatus } from "./plan/view-model";
import { getStudyPlan } from "./plan/plan";
import {
  attemptPhaseWhere,
  matchTier,
  takeFrom,
  taskPhaseWhere,
  type SearchCursors,
  type SearchRequest,
  type SearchType,
} from "./search-core";

/**
 * The unified server-side search service behind GET /api/search. Every type
 * runs its own bounded, user-scoped, keyset-paginated query — nothing here
 * reads a table without `userId` in the where clause and a `take`. Relevance
 * is the phase ladder (exact → prefix → contains): each phase is a separate
 * keyset-paginated query, so an exact match always surfaces before a
 * substring hit no matter which page the reader is on. The plan's static
 * module is searched in memory — it is server-resident, not user data.
 */

export type SearchResultKind = "attempt" | "task" | "group" | "plan";

export type SearchResultItem = {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
  /** Plan results only: the day date for /plan/<date> deep links. */
  date?: string;
};

export type SearchTypeResult = {
  items: SearchResultItem[];
  /** Present when this type has more pages; opaque to the client. */
  cursor?: SearchCursors[SearchType];
};

export type SearchResponse = {
  results: Partial<Record<SearchType, SearchTypeResult>>;
  hasMore: boolean;
};

/** Phases per type: 0 exact, 1 prefix, 2 contains. Groups are a single
 *  contains pass (a user holds a handful of groups). */
const ATTEMPT_PHASES = [0, 1, 2] as const;
const TASK_PHASES = [0, 1, 2] as const;

const STATUS_LABELS: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  completed: "Done",
  skipped: "Skipped",
};

export async function runSearch(
  input: SearchRequest,
  cursors: SearchCursors,
  userId: string,
): Promise<SearchResponse> {
  const results: SearchResponse["results"] = {};
  const wants = (type: SearchType) => input.types.includes(type);

  const [attempts, tasksAndGroups, plan] = await Promise.all([
    wants("attempts")
      ? searchAttempts(input, cursors.attempts, userId)
      : Promise.resolve(null),
    wants("tasks") || wants("groups")
      ? searchTasksAndGroups(input, cursors, userId)
      : Promise.resolve(null),
    wants("plan")
      ? Promise.resolve(searchPlan(input, cursors.plan))
      : Promise.resolve(null),
  ]);

  if (attempts) results.attempts = attempts;
  if (tasksAndGroups?.tasks) results.tasks = tasksAndGroups.tasks;
  if (tasksAndGroups?.groups) results.groups = tasksAndGroups.groups;
  if (plan) results.plan = plan;

  const hasMore = Object.values(results).some((r) => r?.cursor);
  return { results, hasMore };
}

/* ----------------------------- mock attempts ----------------------------- */

/** Relevance phases over name (exact / prefix), then name+platform+notes
 *  contains. Keyset: (completedAt DESC, id DESC). */
async function searchAttempts(
  input: SearchRequest,
  cursor: SearchCursors["attempts"],
  userId: string,
): Promise<SearchTypeResult> {
  const db = database();
  const q = escapeLike(input.q);
  const items: SearchResultItem[] = [];
  let phase = cursor?.p ?? 0;
  let keyset: { at?: string; id?: string } | undefined = cursor;

  while (phase < ATTEMPT_PHASES.length) {
    const remaining = input.limit - items.length;
    const rows = await db.mockAttempt.findMany({
      where: {
        userId,
        ...(keysetAfter(keyset, "completedAt") as Prisma.MockAttemptWhereInput),
        ...attemptPhaseWhere(phase, q),
      },
      select: {
        id: true,
        name: true,
        platform: true,
        type: true,
        completedAt: true,
      },
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      take: remaining + 1,
    });
    if (rows.length > remaining) {
      const boundary = rows[remaining]!;
      for (const row of rows.slice(0, remaining)) items.push(attemptItem(row));
      return {
        items,
        cursor: { p: phase, at: boundary.completedAt.toISOString(), id: boundary.id },
      };
    }
    for (const row of rows) items.push(attemptItem(row));
    phase += 1;
    keyset = undefined;
  }
  return { items };
}

function attemptItem(row: {
  id: string;
  name: string;
  platform: string;
  type: string;
  completedAt: Date;
}): SearchResultItem {
  return {
    kind: "attempt",
    id: row.id,
    title: row.name,
    subtitle: `${row.platform} · ${mockTypeLabel(row.type)} · ${shortDate(row.completedAt.toISOString())}`,
  };
}

/* ------------------------- personal tasks & groups ------------------------ */

/** Tasks paginate in three title phases (contains also sweeps notes);
 *  groups are one contains pass. Keyset: (createdAt DESC, id DESC). */
async function searchTasksAndGroups(
  input: SearchRequest,
  cursors: SearchCursors,
  userId: string,
): Promise<{ tasks?: SearchTypeResult; groups?: SearchTypeResult } | null> {
  const wantsTasks = input.types.includes("tasks");
  const wantsGroups = input.types.includes("groups");
  if (!wantsTasks && !wantsGroups) return null;

  const [tasks, groups] = await Promise.all([
    wantsTasks
      ? searchTasksPhasewise(input, cursors.tasks, userId)
      : Promise.resolve(null),
    wantsGroups
      ? searchGroups(input, cursors.groups, userId)
      : Promise.resolve(null),
  ]);
  return { tasks: tasks ?? undefined, groups: groups ?? undefined };
}

async function searchTasksPhasewise(
  input: SearchRequest,
  cursor: SearchCursors["tasks"],
  userId: string,
): Promise<SearchTypeResult> {
  const db = database();
  const q = escapeLike(input.q);
  const today = istTodayIso();
  const items: SearchResultItem[] = [];
  let phase = cursor?.p ?? 0;
  let keyset: { at?: string; id?: string } | undefined = cursor;

  while (phase < TASK_PHASES.length) {
    const tier = TASK_PHASES[phase]!;
    const where: Prisma.PersonalTaskWhereInput = {
      userId,
      deletedAt: null,
      ...(keysetAfter(keyset, "createdAt") as Prisma.PersonalTaskWhereInput),
      ...taskPhaseWhere(tier, q),
    };
    const rows = await db.personalTask.findMany({
      where,
      select: { id: true, title: true, status: true, dueDate: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit - items.length + 1,
    });
    const remaining = input.limit - items.length;
    if (rows.length > remaining) {
      const boundary = rows[remaining]!;
      for (const row of rows.slice(0, remaining)) items.push(taskItem(row, today));
      keyset = { at: boundary.createdAt.toISOString(), id: boundary.id };
      return { items, cursor: { p: phase, at: keyset.at, id: keyset.id } };
    }
    for (const row of rows) items.push(taskItem(row, today));
    phase += 1;
    keyset = undefined;
  }
  return { items };
}

function taskItem(
  row: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    createdAt: Date;
  },
  today: string,
): SearchResultItem {
  const status = effectiveStatus(
    { dueDate: row.dueDate, status: row.status },
    today,
  );
  return {
    kind: "task",
    id: row.id,
    title: row.title,
    subtitle: row.dueDate
      ? `Due ${shortDate(row.dueDate)}`
      : (STATUS_LABELS[status] ?? "Task"),
  };
}

async function searchGroups(
  input: SearchRequest,
  cursor: SearchCursors["groups"],
  userId: string,
): Promise<SearchTypeResult | null> {
  const db = database();
  const rows = await db.todoGroup.findMany({
    where: {
      userId,
      name: { contains: escapeLike(input.q), mode: "insensitive" },
      ...(keysetAfter(cursor, "createdAt") as Prisma.TodoGroupWhereInput),
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { tasks: { where: { deletedAt: null } } } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
  });
  const hasMore = rows.length > input.limit;
  const page = rows.slice(0, input.limit);
  const items: SearchResultItem[] = page.map((row) => ({
    kind: "group",
    id: row.id,
    title: row.name,
    subtitle:
      row._count.tasks === 1 ? "1 task" : `${row._count.tasks} tasks`,
  }));
  if (!hasMore || page.length === 0) return { items };
  const boundary = page[page.length - 1]!;
  return {
    items,
    cursor: { p: 0, at: boundary.createdAt.toISOString(), id: boundary.id },
  };
}

/* ------------------------------ study plan ------------------------------- */

/** The plan is a server-resident static module: rank every task name and
 *  exact day number against the query, then paginate the flat ranked list.
 *  No progress merge — the palette row needs identity, not state. */
function searchPlan(
  input: SearchRequest,
  cursor: SearchCursors["plan"],
): SearchTypeResult {
  const plan = getStudyPlan();
  type Candidate = { tier: number; order: number; item: SearchResultItem };
  const candidates: Candidate[] = [];
  const q = input.q.toLowerCase();

  for (const day of plan.daily_targets) {
    const dayLabel = String(day.day);
    if (dayLabel === q) {
      candidates.push({
        tier: 0,
        order: candidates.length,
        item: {
          kind: "plan",
          id: `day-${day.day}`,
          title: `Day ${day.day} · ${day.weekday} ${shortDate(day.date)}`,
          subtitle: "Plan day",
          date: day.date,
        },
      });
    }
    day.tasks.forEach((task, taskIndex) => {
      const tier = matchTier(task.name, input.q);
      if (!tier) return;
      candidates.push({
        tier: tier === "exact" ? 0 : tier === "prefix" ? 1 : 2,
        order: candidates.length,
        item: {
          kind: "plan",
          id: `d${day.day}:${taskIndex}`,
          title: task.name,
          subtitle: `Day ${day.day} · ${shortDate(day.date)}`,
          date: day.date,
        },
      });
    });
  }

  candidates.sort((a, b) => a.tier - b.tier || a.order - b.order);
  const ranked = candidates.map((c) => c.item);
  const { page, next } = takeFrom(ranked, cursor?.i ?? 0, input.limit);
  return {
    items: page,
    ...(next != null ? { cursor: { p: 0, i: next } } : {}),
  };
}

/* ------------------------------- keyset util ------------------------------ */

/** Strictly-after predicate under (timestamp DESC, id DESC). The computed
 *  key keeps this structural — each searcher casts it to its own model's
 *  where type (the runtime shape is identical across the three tables). */
function keysetAfter(
  cursor: { at?: string; id?: string } | undefined,
  timestampField: "completedAt" | "createdAt",
): Record<string, unknown> {
  if (!cursor?.at || !cursor.id) return {};
  return {
    OR: [
      { [timestampField]: { lt: new Date(cursor.at) } },
      { [timestampField]: new Date(cursor.at), id: { lt: cursor.id } },
    ],
  };
}
