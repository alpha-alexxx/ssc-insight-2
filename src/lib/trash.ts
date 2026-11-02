import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { database } from "./db";
import { RequestError } from "./api";
import { SUBJECTS, totals } from "./domain";
import { istDateKey, longDate, mockTypeLabel } from "./format";
import { normalizeSubtasks } from "./todos-core";
import { toAttempt } from "./attempt-persistence";
import { toCustomExamDef, invalidateSettings, loadExamContext, saveTrackerSettings } from "./exam-settings";
import { BUILT_IN_EXAMS, type CustomExamDef } from "./exams";
import {
  parseTierKey,
  structureSignature,
  type StructureSignature,
} from "./exam-pattern";
import { pruneTargetsForExam } from "./target-settings";
import {
  TRASH_DAY_MS,
  TRASH_EXPIRING_DAYS,
  TRASH_KINDS,
  TRASH_RETENTION_DAYS,
  TRASH_RETENTION_MS,
  isTrashExpired,
  trashDaysLeft,
  trashExpiresAt,
  uniqueSelection,
  type TrashDetail,
  type TrashItem,
  type TrashKind,
  type TrashOutcome,
  type TrashPage,
  type TrashQuery,
  type TrashSelection,
} from "./trash-core";

/**
 * The centralized Trash service. Every read here is owner-scoped, every
 * mutation carries `deletedAt: { not: null }` so a crafted id can never touch
 * a live row, and expiry is checked against the SAME constant the client
 * renders — a record is never restorable in the UI while the API rejects it.
 *
 * This is the only module besides repository.ts and search.ts allowed to touch
 * `mockAttempt` directly (see the ESLint boundary rule).
 */

type RawTrashRow = {
  kind: TrashKind;
  id: string;
  title: string;
  subtitle: string | null;
  context: string | null;
  deleted_at: Date;
  affected: bigint | number | null;
};

const EMPTY_COUNTS: Record<TrashKind | "all", number> = {
  all: 0,
  attempt: 0,
  task: 0,
  exam: 0,
  group: 0,
};

function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

function toItem(row: RawTrashRow, now: number): TrashItem {
  return {
    kind: row.kind,
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    context: row.context,
    deletedAt: row.deleted_at.toISOString(),
    expiresAt: trashExpiresAt(row.deleted_at).toISOString(),
    daysLeft: trashDaysLeft(row.deleted_at, now),
    affected: row.affected == null ? null : Number(row.affected),
  };
}

/**
 * One UNION branch per kind. Keeping the projection identical is what makes
 * pagination, search and sort a single server-side query instead of four
 * fetches merged in JS.
 */
function branch(
  kind: TrashKind,
  userId: string,
  cutoff: Date,
  expiringBefore: Date,
  search: string | null,
  expiringOnly: boolean,
): Prisma.Sql {
  const scope = (title: Prisma.Sql) => Prisma.sql`
    "userId" = ${userId}
    AND "deletedAt" IS NOT NULL
    AND "deletedAt" > ${cutoff}
    ${search ? Prisma.sql`AND ${title} ILIKE ${search}` : Prisma.empty}
    ${expiringOnly ? Prisma.sql`AND "deletedAt" <= ${expiringBefore}` : Prisma.empty}
  `;
  switch (kind) {
    case "attempt":
      return Prisma.sql`
        SELECT 'attempt'::text AS kind, "id", "name" AS title,
               "platform" AS subtitle,
               to_char("completedAt" AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS context,
               "deletedAt" AS deleted_at, NULL::bigint AS affected
        FROM "ssc_insight"."MockAttempt"
        WHERE ${scope(Prisma.sql`"name"`)}`;
    case "task":
      return Prisma.sql`
        SELECT 'task'::text AS kind, "id", "title",
               COALESCE("category", '') AS subtitle,
               "dueDate" AS context,
               "deletedAt" AS deleted_at, NULL::bigint AS affected
        FROM "ssc_insight"."PersonalTask"
        WHERE ${scope(Prisma.sql`"title"`)}`;
    case "exam":
      // `"id"::text` is load-bearing: CustomExam was created with a real UUID
      // column while every other kind's id is TEXT, and PostgreSQL refuses to
      // unify the two (`42804 UNION types text and uuid cannot be matched`).
      // The cast also matches RawTrashRow, which declares `id: string`.
      return Prisma.sql`
        SELECT 'exam'::text AS kind, "id"::text AS id, "name" AS title,
               COALESCE("tiers"->0->>'label', '') AS subtitle,
               NULL::text AS context,
               "deletedAt" AS deleted_at, NULL::bigint AS affected
        FROM "ssc_insight"."CustomExam"
        WHERE ${scope(Prisma.sql`"name"`)}`;
    case "group":
      // `affected` is the number of LIVE tasks that lose their grouping when
      // this group is purged — the count the confirmation dialog quotes. A
      // trashed task is already invisible, so it is not affected.
      return Prisma.sql`
        SELECT 'group'::text AS kind, "id", "name" AS title, ''::text AS subtitle,
               NULL::text AS context, "deletedAt" AS deleted_at,
               (SELECT count(*) FROM "ssc_insight"."PersonalTask" t
                 WHERE t."groupId" = "TodoGroup"."id"
                   AND t."deletedAt" IS NULL) AS affected
        FROM "ssc_insight"."TodoGroup"
        WHERE ${scope(Prisma.sql`"name"`)}`;
  }
}

export async function listTrash(
  userId: string,
  query: TrashQuery,
): Promise<TrashPage> {
  const now = Date.now();
  const cutoff = new Date(now - TRASH_RETENTION_MS);
  // "Expiring" means inside the final TRASH_EXPIRING_DAYS of the window.
  const expiringBefore = new Date(
    now - TRASH_RETENTION_MS + TRASH_EXPIRING_DAYS * TRASH_DAY_MS,
  );
  const search = query.q ? likePattern(query.q) : null;
  const expiringOnly = query.status === "expiring";
  const unionFor = (kinds: readonly TrashKind[]) =>
    Prisma.join(
      kinds.map((kind) =>
        branch(kind, userId, cutoff, expiringBefore, search, expiringOnly),
      ),
      " UNION ALL ",
    );
  // Two unions on purpose. The counts feed the type-filter pills, so they must
  // describe EVERY kind even while one kind is selected — narrowing both would
  // report zeros for the pills the user is about to click. `total` follows the
  // filter (pagination math depends on it); `counts.all` stays unfiltered so
  // Empty Trash can name the number it actually removes.
  const union = unionFor(query.kind === "all" ? TRASH_KINDS : [query.kind]);
  const fullUnion = query.kind === "all" ? union : unionFor(TRASH_KINDS);
  const db = database();
  const [rows, countRows, filteredCount] = await Promise.all([
    db.$queryRaw<RawTrashRow[]>(Prisma.sql`
      WITH trash AS (${union})
      SELECT * FROM trash
      ORDER BY ${
        query.sort === "expiring"
          ? Prisma.raw('"deleted_at" ASC')
          : Prisma.raw('"deleted_at" DESC')
      }, "id" ASC
      LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}
    `),
    db.$queryRaw<{ kind: TrashKind; n: bigint }[]>(Prisma.sql`
      WITH trash AS (${fullUnion})
      SELECT kind, count(*) AS n FROM trash GROUP BY kind
    `),
    query.kind === "all"
      ? Promise.resolve(null)
      : db.$queryRaw<{ n: bigint }[]>(Prisma.sql`
          WITH trash AS (${union}) SELECT count(*) AS n FROM trash
        `),
  ]);
  const counts = { ...EMPTY_COUNTS };
  for (const row of countRows) {
    counts[row.kind] = Number(row.n);
    counts.all += Number(row.n);
  }
  return {
    items: rows.map((row) => toItem(row, now)),
    // With no kind filter the filtered total IS the all-kinds total.
    total: filteredCount ? Number(filteredCount[0]?.n ?? 0) : counts.all,
    page: query.page,
    limit: query.limit,
    counts,
    retentionDays: TRASH_RETENTION_DAYS,
  };
}

/** Load one trashed record and reject it once its window has closed. */
async function trashedRecord(
  kind: TrashKind,
  userId: string,
  id: string,
): Promise<Date> {
  const db = database();
  const row =
    kind === "attempt"
      ? await db.mockAttempt.findFirst({
          where: { id, userId, deletedAt: { not: null } },
          select: { deletedAt: true },
        })
      : kind === "task"
        ? await db.personalTask.findFirst({
            where: { id, userId, deletedAt: { not: null } },
            select: { deletedAt: true },
          })
        : kind === "exam"
          ? await db.customExam.findFirst({
              where: { id, userId, deletedAt: { not: null } },
              select: { deletedAt: true },
            })
          : await db.todoGroup.findFirst({
              where: { id, userId, deletedAt: { not: null } },
              select: { deletedAt: true },
            });
  if (!row?.deletedAt) throw new RequestError("Item not found in Trash", 404);
  if (isTrashExpired(row.deletedAt))
    throw new RequestError(
      "This item has passed its 15-day recovery window and can no longer be restored.",
      409,
    );
  return row.deletedAt;
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function itemFields(deletedAt: Date): { label: string; value: string }[] {
  return [
    { label: "Deleted", value: longDate(istDateKey(deletedAt)) },
    { label: "Expires", value: longDate(istDateKey(trashExpiresAt(deletedAt))) },
    { label: "Days left", value: String(trashDaysLeft(deletedAt)) },
  ];
}

function attemptMaxScore(attempt: ReturnType<typeof toAttempt>): number {
  return attempt.subjects.reduce(
    (sum, subject) =>
      sum +
      (attempt.type === "full" && subject.qualifying
        ? 0
        : subject.questions * attempt.marking.correct),
    0,
  );
}

export async function getTrashDetail(
  userId: string,
  kind: TrashKind,
  id: string,
): Promise<TrashDetail> {
  const now = Date.now();
  const db = database();
  const deletedAt = await trashedRecord(kind, userId, id);
  const head = itemFields(deletedAt);

  if (kind === "attempt") {
    const row = await db.mockAttempt.findFirst({
      where: { id, userId, deletedAt: { not: null } },
      include: { subjects: { orderBy: { position: "asc" } } },
    });
    if (!row) throw new RequestError("Item not found in Trash", 404);
    const attempt = toAttempt(row);
    const summary = totals(attempt);
    const maxScore = attemptMaxScore(attempt);
    const fields = [
      { label: "Platform", value: attempt.platform },
      { label: "Type", value: mockTypeLabel(attempt.type) },
      {
        label: "Mock date",
        value: longDate(istDateKey(attempt.completedAt)),
      },
      {
        label: "Score",
        value: `${Math.round(summary.score * 100) / 100} / ${maxScore}`,
      },
      {
        label: "Accuracy",
        value:
          summary.accuracy == null
            ? "—"
            : `${Math.round(summary.accuracy * 1000) / 10}%`,
      },
      ...(attempt.percentile == null
        ? []
        : [{ label: "Reported percentile", value: String(attempt.percentile) }]),
      ...(attempt.rank == null
        ? []
        : [
            {
              label: "Rank",
              value:
                attempt.participants == null
                  ? String(attempt.rank)
                  : `${attempt.rank} of ${attempt.participants}`,
            },
          ]),
      ...(attempt.notes.trim()
        ? [{ label: "Notes", value: attempt.notes.trim() }]
        : []),
      ...head,
    ];
    return {
      item: toItem(
        {
          kind,
          id,
          title: attempt.name,
          subtitle: attempt.platform,
          context: istDateKey(attempt.completedAt),
          deleted_at: deletedAt,
          affected: null,
        },
        now,
      ),
      fields,
      subjects: attempt.subjects.map((subject) => ({
        subject: SUBJECTS[subject.subjectId].short,
        questions: subject.questions,
        correct: subject.correct,
        incorrect: subject.incorrect,
        score: Math.round(
          (subject.scoreOverride ??
            subject.correct * attempt.marking.correct -
              subject.incorrect * attempt.marking.incorrect) * 100,
        ) / 100,
      })),
    };
  }

  if (kind === "task") {
    const row = await db.personalTask.findFirst({
      where: { id, userId, deletedAt: { not: null } },
      include: { group: { select: { name: true } } },
    });
    if (!row) throw new RequestError("Item not found in Trash", 404);
    const subtasks = normalizeSubtasks(row.subtasks);
    const done = subtasks.filter((task) => task.completed).length;
    const fields = [
      { label: "Due", value: row.dueDate ? longDate(row.dueDate) : "No date" },
      { label: "Category", value: row.category },
      { label: "Priority", value: row.priority },
      { label: "Status", value: row.status },
      { label: "Group", value: row.group?.name ?? "Ungrouped" },
      ...(subtasks.length
        ? [{ label: "Checklist", value: `${done} of ${subtasks.length} done` }]
        : []),
      ...(row.url
        ? [{ label: "Link", value: safeHost(row.url) }]
        : []),
      ...(row.notes?.trim() ? [{ label: "Notes", value: row.notes.trim() }] : []),
      ...head,
    ];
    return {
      item: toItem(
        {
          kind,
          id,
          title: row.title,
          subtitle: row.category,
          context: row.dueDate,
          deleted_at: deletedAt,
          affected: null,
        },
        now,
      ),
      fields,
    };
  }

  if (kind === "exam") {
    const row = await db.customExam.findFirst({
      where: { id, userId, deletedAt: { not: null } },
      select: { id: true, name: true, tiers: true, createdAt: true },
    });
    if (!row) throw new RequestError("Item not found in Trash", 404);
    const exam = toCustomExamDef(row);
    if (!exam) throw new RequestError("Item not found in Trash", 404);
    const papers = exam.tiers.map((tier) => tier.label).join(" · ");
    const fields = [
      { label: "Papers", value: papers },
      {
        label: "Questions",
        value: exam.tiers
          .map(
            (tier) =>
              `${tier.label}: ${tier.subjects.reduce((sum, subject) => sum + subject.questions, 0)}`,
          )
          .join(" · "),
      },
      {
        label: "Marking",
        value: exam.tiers
          .map((tier) => `+${tier.marking.correct} / −${tier.marking.incorrect}`)
          .join(" · "),
      },
      { label: "Created", value: longDate(istDateKey(row.createdAt)) },
      ...head,
    ];
    return {
      item: toItem(
        {
          kind,
          id,
          title: exam.name,
          subtitle: exam.tiers[0]?.label ?? "",
          context: null,
          deleted_at: deletedAt,
          affected: null,
        },
        now,
      ),
      fields,
    };
  }

  const row = await db.todoGroup.findFirst({
    where: { id, userId, deletedAt: { not: null } },
    select: { id: true, name: true, createdAt: true },
  });
  if (!row) throw new RequestError("Item not found in Trash", 404);
  const affected = await db.personalTask.count({
    where: { userId, groupId: id, deletedAt: null },
  });
  return {
    item: toItem(
      {
        kind,
        id,
        title: row.name,
        subtitle: "",
        context: null,
        deleted_at: deletedAt,
        affected,
      },
      now,
    ),
    fields: [
      {
        label: "Tasks in group",
        value: `${affected} task${affected === 1 ? "" : "s"}`,
      },
      { label: "Created", value: longDate(istDateKey(row.createdAt)) },
      ...head,
    ],
  };
}

function failure(
  kind: TrashKind,
  id: string,
  error: unknown,
): TrashOutcome["failed"][number] {
  if (error instanceof RequestError)
    return {
      kind,
      id,
      code:
        error.status === 404
          ? "NOT_FOUND"
          : error.status === 409
            ? "CONFLICT"
            : "INVALID",
      message: error.message,
    };
  return {
    kind,
    id,
    code: "FAILED",
    message: "This item could not be changed. Try again.",
  };
}

type Tx = Prisma.TransactionClient;

async function restoreOne(tx: Tx, userId: string, kind: TrashKind, id: string) {
  if (kind === "attempt") {
    const row = await tx.mockAttempt.findFirst({
      where: { id, userId, deletedAt: { not: null } },
      select: { deletedAt: true },
    });
    if (!row?.deletedAt) throw new RequestError("Item not found in Trash", 404);
    if (isTrashExpired(row.deletedAt))
      throw new RequestError(
        "This item has passed its 15-day recovery window and can no longer be restored.",
        409,
      );
    const result = await tx.mockAttempt.updateMany({
      where: { id, userId, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    if (!result.count) throw new RequestError("Item not found in Trash", 404);
    return;
  }
  if (kind === "task") {
    const row = await tx.personalTask.findFirst({
      where: { id, userId, deletedAt: { not: null } },
      select: { deletedAt: true },
    });
    if (!row?.deletedAt) throw new RequestError("Item not found in Trash", 404);
    if (isTrashExpired(row.deletedAt))
      throw new RequestError(
        "This item has passed its 15-day recovery window and can no longer be restored.",
        409,
      );
    // Bump the version so an editor holding a stale draft cannot overwrite
    // the restored row.
    const result = await tx.personalTask.updateMany({
      where: { id, userId, deletedAt: { not: null } },
      data: { deletedAt: null, version: { increment: 1 } },
    });
    if (!result.count) throw new RequestError("Item not found in Trash", 404);
    return;
  }
  if (kind === "exam") {
    const row = await tx.customExam.findFirst({
      where: { id, userId, deletedAt: { not: null } },
      select: { name: true, deletedAt: true },
    });
    if (!row?.deletedAt) throw new RequestError("Item not found in Trash", 404);
    if (isTrashExpired(row.deletedAt))
      throw new RequestError(
        "This item has passed its 15-day recovery window and can no longer be restored.",
        409,
      );
    // A trashed exam holds its name, but a LIVE exam created before this
    // feature shipped could still collide. Never overwrite it silently.
    const clash = await tx.customExam.findFirst({
      where: {
        userId,
        deletedAt: null,
        name: { equals: row.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (clash)
      throw new RequestError(
        `An exam named “${row.name}” already exists. Rename it before restoring this one.`,
        409,
      );
    await tx.customExam.updateMany({
      where: { id, userId, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    return;
  }
  const row = await tx.todoGroup.findFirst({
    where: { id, userId, deletedAt: { not: null } },
    select: { deletedAt: true },
  });
  if (!row?.deletedAt) throw new RequestError("Item not found in Trash", 404);
  if (isTrashExpired(row.deletedAt))
    throw new RequestError(
      "This item has passed its 15-day recovery window and can no longer be restored.",
      409,
    );
  const result = await tx.todoGroup.updateMany({
    where: { id, userId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  if (!result.count) throw new RequestError("Item not found in Trash", 404);
}

export async function restoreTrash(
  userId: string,
  items: TrashSelection["items"],
): Promise<TrashOutcome> {
  const outcome: TrashOutcome = { done: 0, failed: [] };
  for (const item of uniqueSelection(items)) {
    try {
      await database().$transaction((tx) =>
        restoreOne(tx, userId, item.kind, item.id),
      );
      outcome.done += 1;
    } catch (error) {
      outcome.failed.push(failure(item.kind, item.id, error));
    }
  }
  return outcome;
}

/** Drop every trace of purged exams from the owner's scope and targets. */
async function pruneExamSettings(userId: string, examIds: string[]) {
  if (!examIds.length) return;
  const ids = new Set(examIds);
  const ctx = await loadExamContext(userId);
  const enabledTiers = ctx.enabledTiers.filter(
    (key) => !ids.has(parseTierKey(key)?.examId ?? ""),
  );
  // Resolve the SURVIVING papers once: a structure default stays as long as
  // any remaining tier — built-in or the user's own — still scores the same.
  const surviving = survivingSignatures(ctx.customExams);
  let targets = ctx.targets;
  for (const id of ids)
    targets = pruneTargetsForExam(targets, id, surviving);
  await saveTrackerSettings(userId, { ...ctx, enabledTiers, targets });
  invalidateSettings(userId);
}

/** Every structure signature still reachable for this account. */
function survivingSignatures(
  customExams: readonly CustomExamDef[],
): Set<StructureSignature> {
  return new Set([
    ...BUILT_IN_EXAMS.flatMap((exam) =>
      exam.tiers.map((tier) => structureSignature(tier)),
    ),
    ...customExams.flatMap((exam) =>
      exam.tiers.map((tier) => structureSignature(tier)),
    ),
  ]);
}

async function purgeOne(tx: Tx, userId: string, kind: TrashKind, id: string) {
  if (kind === "attempt") {
    // SubjectResult cascades with the attempt row.
    const result = await tx.mockAttempt.deleteMany({
      where: { id, userId, deletedAt: { not: null } },
    });
    if (!result.count) throw new RequestError("Item not found in Trash", 404);
    return;
  }
  if (kind === "task") {
    const result = await tx.personalTask.deleteMany({
      where: { id, userId, deletedAt: { not: null } },
    });
    if (!result.count) throw new RequestError("Item not found in Trash", 404);
    return;
  }
  if (kind === "exam") {
    const result = await tx.customExam.deleteMany({
      where: { id, userId, deletedAt: { not: null } },
    });
    if (!result.count) throw new RequestError("Item not found in Trash", 404);
    return;
  }
  const result = await tx.todoGroup.deleteMany({
    where: { id, userId, deletedAt: { not: null } },
  });
  if (!result.count) throw new RequestError("Item not found in Trash", 404);
}

export async function purgeTrash(
  userId: string,
  items: TrashSelection["items"],
): Promise<TrashOutcome> {
  const outcome: TrashOutcome = { done: 0, failed: [] };
  const purgedExams: string[] = [];
  for (const item of uniqueSelection(items)) {
    try {
      await database().$transaction((tx) =>
        purgeOne(tx, userId, item.kind, item.id),
      );
      if (item.kind === "exam") purgedExams.push(item.id);
      outcome.done += 1;
    } catch (error) {
      outcome.failed.push(failure(item.kind, item.id, error));
    }
  }
  if (purgedExams.length) await pruneExamSettings(userId, purgedExams);
  return outcome;
}

export type EmptyTrashResult = {
  attempts: number;
  tasks: number;
  exams: number;
  groups: number;
  total: number;
};

export async function emptyTrash(userId: string): Promise<EmptyTrashResult> {
  const db = database();
  const examIds = (
    await db.customExam.findMany({
      where: { userId, deletedAt: { not: null } },
      select: { id: true },
    })
  ).map((row) => row.id);
  const [attempts, tasks, exams, groups] = await db.$transaction([
    db.mockAttempt.deleteMany({ where: { userId, deletedAt: { not: null } } }),
    db.personalTask.deleteMany({ where: { userId, deletedAt: { not: null } } }),
    db.customExam.deleteMany({ where: { userId, deletedAt: { not: null } } }),
    db.todoGroup.deleteMany({ where: { userId, deletedAt: { not: null } } }),
  ]);
  if (examIds.length) await pruneExamSettings(userId, examIds);
  return {
    attempts: attempts.count,
    tasks: tasks.count,
    exams: exams.count,
    groups: groups.count,
    total: attempts.count + tasks.count + exams.count + groups.count,
  };
}

export type CleanupResult = {
  attempts: number;
  tasks: number;
  exams: number;
  groups: number;
  total: number;
  /** Expired rows still present after this pass (0 when fully drained). */
  backlog: number;
};

/**
 * Physical deletion of expired rows, across every account. The API already
 * refuses to restore or list an expired row, so a failed or delayed run can
 * never expose one — it only delays disk reclamation.
 */
export async function purgeExpiredTrash(
  batchSize = 500,
  now: number = Date.now(),
): Promise<CleanupResult> {
  const db = database();
  const cutoff = new Date(now - TRASH_RETENTION_MS);
  const expired = { deletedAt: { not: null, lte: cutoff } } as const;

  const [attemptIds, taskIds, groupIds, examRows] = await Promise.all([
    db.mockAttempt.findMany({
      where: expired,
      select: { id: true },
      take: batchSize,
    }),
    db.personalTask.findMany({
      where: expired,
      select: { id: true },
      take: batchSize,
    }),
    db.todoGroup.findMany({
      where: expired,
      select: { id: true },
      take: batchSize,
    }),
    db.customExam.findMany({
      where: expired,
      select: { id: true, userId: true },
      take: batchSize,
    }),
  ]);

  // Per-kind isolation: one failing kind must not stop the others.
  const removed = { attempts: 0, tasks: 0, exams: 0, groups: 0 };
  const run = async (label: keyof typeof removed, work: () => Promise<number>) => {
    try {
      removed[label] = await work();
    } catch (error) {
      console.error(
        JSON.stringify({
          op: "trash.cleanup",
          kind: label,
          outcome: "error",
          message: error instanceof Error ? error.message : "unknown",
        }),
      );
    }
  };

  /**
   * The select above and the delete below are two statements, so a user can
   * restore a row between them. Re-stating the expiry predicate on every
   * delete makes that race harmless: the restored row no longer matches, and
   * only still-expired rows are physically removed.
   */
  const expiredAmong = (ids: string[]) =>
    ids.length ? { id: { in: ids }, ...expired } : null;

  await run("attempts", async () => {
    const where = expiredAmong(attemptIds.map((row) => row.id));
    if (!where) return 0;
    const result = await db.mockAttempt.deleteMany({ where });
    return result.count;
  });
  await run("tasks", async () => {
    const where = expiredAmong(taskIds.map((row) => row.id));
    if (!where) return 0;
    const result = await db.personalTask.deleteMany({ where });
    return result.count;
  });
  await run("groups", async () => {
    const where = expiredAmong(groupIds.map((row) => row.id));
    if (!where) return 0;
    const result = await db.todoGroup.deleteMany({ where });
    return result.count;
  });
  await run("exams", async () => {
    const where = expiredAmong(examRows.map((row) => row.id));
    if (!where) return 0;
    const result = await db.customExam.deleteMany({ where });
    // Which of these rows actually died — not which were selected. A row the
    // user restored mid-run survived the delete and is live again, so pruning
    // its settings would strip targets from an exam that still exists. The
    // survivors are whatever the delete left behind for the same id set.
    const survivors = await db.customExam.findMany({
      where: { id: { in: examRows.map((row) => row.id) } },
      select: { id: true },
    });
    const alive = new Set(survivors.map((row) => row.id));
    const dead = examRows.filter((row) => !alive.has(row.id));
    if (!dead.length) return result.count;
    const byUser = new Map<string, string[]>();
    for (const row of dead) {
      const list = byUser.get(row.userId) ?? [];
      list.push(row.id);
      byUser.set(row.userId, list);
    }
    for (const [userId, ids] of byUser) {
      try {
        await pruneExamSettings(userId, ids);
      } catch (error) {
        console.error(
          JSON.stringify({
            op: "trash.cleanup.settings",
            outcome: "error",
            message: error instanceof Error ? error.message : "unknown",
          }),
        );
      }
    }
    return result.count;
  });

  const [attemptBacklog, taskBacklog, examBacklog, groupBacklog] =
    await Promise.all([
      db.mockAttempt.count({ where: expired }),
      db.personalTask.count({ where: expired }),
      db.customExam.count({ where: expired }),
      db.todoGroup.count({ where: expired }),
    ]);

  return {
    ...removed,
    total:
      removed.attempts + removed.tasks + removed.exams + removed.groups,
    backlog:
      attemptBacklog + taskBacklog + examBacklog + groupBacklog,
  };
}
