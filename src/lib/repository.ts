import { database } from "./db";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  type AttemptInput,
  type Filters,
  type PatternShape,
  filtersSchema,
  type PagedAttempts,
  type PageSize,
  type SortKey,
} from "./domain";
import type { CustomExamDef } from "./exams";
import {
  getTrackerSettings,
  invalidateSettings,
  toCustomExamDef,
  type TrackerSettingsShape,
} from "./exam-settings";
import {
  attemptComparator,
  buildAttemptStats,
  type AttemptSortRow,
} from "./attempt-sort";
import {
  attemptData,
  attemptInclude,
  attemptWhere,
  toAnalyticsAttempt,
  toAttempt,
} from "./attempt-persistence";
import {
  BACKUP_INSERT_CHUNK_SIZE,
  attemptFingerprint,
  buildBackup,
  planImport,
  plannerCounts,
  type BackupPreview,
  type ImportOptions,
  type ImportResult,
  type ParsedBackup,
  type BackupSettings,
} from "./backup";
import { normalizeSubtasks } from "./todos-core";
import { clampImportedDeletedAt } from "./trash-core";
import { RequestError } from "./api";

/**
 * Hard server-side cap on a single unpaged listAttempts response. Protects
 * the page from a user with hundreds of mocks; the dashboard, calendar, and
 * plan views still consume the full unpaged list, but the API must never
 * return unbounded payloads. The paged path (listAttemptsPaged) bounds its
 * payloads independently at pageSize ≤ 100. Raise the cap rather than
 * removing it; never remove it.
 */
export const LIST_ATTEMPTS_MAX = 500;



export async function listAttempts(userId: string, filters: Filters = {}) {
  const rows = await database().mockAttempt.findMany({
    where: { ...attemptWhere(filters), userId },
    include: attemptInclude,
    orderBy: [{ completedAt: "desc" }, { id: "asc" }],
    take: LIST_ATTEMPTS_MAX + 1,
  });
  if (rows.length > LIST_ATTEMPTS_MAX) {
    // Caller surfaces a 200 with a warning header; we never silently truncate
    // beyond the cap, and we never return more than the cap to the client.
    rows.length = LIST_ATTEMPTS_MAX;
  }
  return rows.map(toAttempt);
}

export type ListAttemptsPagedParams = {
  page: number;
  pageSize: PageSize;
  sort: SortKey;
  dir: "asc" | "desc";
  /** Include the whole-filtered-set KPI aggregates (/history needs them;
   * the compare picker does not). */
  withStats: boolean;
};

/** Minimal projection covering the totals()-derived sort keys — a fraction
 * of a full row (no notes, no rank/participants), so sorting the whole
 * filtered set in JS stays cheap. */
const sortRowSelect = {
  id: true,
  name: true,
  type: true,
  platform: true,
  completedAt: true,
  percentile: true,
  scoreOverride: true,
  overallTimeSeconds: true,
  examId: true,
  tierId: true,
  markingCorrect: true,
  markingIncorrect: true,
  subjects: {
    orderBy: { position: "asc" as const },
    select: {
      subjectId: true,
      questions: true,
      correct: true,
      incorrect: true,
      qualifying: true,
      scoreOverride: true,
      timeSeconds: true,
    },
  },
} satisfies Prisma.MockAttemptSelect;

type SortRowDb = Prisma.MockAttemptGetPayload<{ select: typeof sortRowSelect }>;

function toSortRow(row: SortRowDb): AttemptSortRow {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    platform: row.platform,
    completedAt: row.completedAt.toISOString(),
    percentile: row.percentile,
    scoreOverride: row.scoreOverride,
    overallTimeSeconds: row.overallTimeSeconds,
    marking: {
      correct: row.markingCorrect,
      incorrect: row.markingIncorrect,
    },
    subjects: row.subjects.map((s) => ({
      subjectId: s.subjectId,
      questions: s.questions,
      correct: s.correct,
      incorrect: s.incorrect,
      qualifying: s.qualifying,
      scoreOverride: s.scoreOverride,
      timeSeconds: s.timeSeconds,
    })),
  };
}

/**
 * Column-backed orderBy for the direct sort keys. Percentile follows the
 * historical client behavior, where null sorted as -1: nulls come first
 * ascending and last descending.
 */
function directOrderBy(
  sort: "name" | "type" | "platform" | "date" | "percentile",
  dir: "asc" | "desc",
): Prisma.MockAttemptOrderByWithRelationInput[] {
  switch (sort) {
    case "name":
      return [{ name: dir }, { id: "asc" }];
    case "type":
      return [{ type: dir }, { id: "asc" }];
    case "platform":
      return [{ platform: dir }, { id: "asc" }];
    case "date":
      return [{ completedAt: dir }, { id: "asc" }];
    case "percentile":
      return [
        { percentile: { sort: dir, nulls: dir === "asc" ? "first" : "last" } },
        { id: "asc" },
      ];
  }
}

/** Full rows for an explicit id order (the computed-sort path pages by
 * id); the given order is preserved. */
async function attemptsByIds(userId: string, ids: string[]) {
  if (!ids.length) return [];
  const rows = await database().mockAttempt.findMany({
    where: { userId, id: { in: ids }, deletedAt: null },
    include: attemptInclude,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => toAttempt(byId.get(id)!));
}

/**
 * One server-paged page of the filtered attempt list for /history and
 * /compare. Column-backed sorts (name/type/platform/date/percentile) sort
 * in Postgres; score, accuracy, and time derive from totals() — the same
 * comparators /history sorted with client-side — so those keys sort in JS
 * over the minimal projection and the page hydrates by id. `withStats`
 * additionally computes the KPI aggregates over the whole filtered set.
 */
export async function listAttemptsPaged(
  userId: string,
  filters: Filters,
  params: ListAttemptsPagedParams,
): Promise<PagedAttempts> {
  const where = { ...attemptWhere(filters), userId };
  const skip = (params.page - 1) * params.pageSize;
  const meta = (total: number) => ({
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  });

  if (
    params.sort === "score" ||
    params.sort === "accuracy" ||
    params.sort === "time"
  ) {
    const [all, total] = await Promise.all([
      database().mockAttempt.findMany({ where, select: sortRowSelect }),
      database().mockAttempt.count({ where }),
    ]);
    const sorted = all.map(toSortRow).sort(attemptComparator(params.sort));
    if (params.dir === "desc") sorted.reverse();
    const pageIds = sorted
      .slice(skip, skip + params.pageSize)
      .map((row) => row.id);
    return {
      items: await attemptsByIds(userId, pageIds),
      ...(params.withStats ? { stats: buildAttemptStats(sorted) } : {}),
      ...meta(total),
    };
  }

  const [rows, total, statRows] = await Promise.all([
    database().mockAttempt.findMany({
      where,
      include: attemptInclude,
      orderBy: directOrderBy(params.sort, params.dir),
      take: params.pageSize,
      skip,
    }),
    database().mockAttempt.count({ where }),
    params.withStats
      ? database().mockAttempt.findMany({ where, select: sortRowSelect })
      : Promise.resolve(null),
  ]);
  return {
    items: rows.map(toAttempt),
    ...(statRows
      ? { stats: buildAttemptStats(statRows.map(toSortRow)) }
      : {}),
    ...meta(total),
  };
}

/**
 * AI context data. Notes are omitted in SQL so private note text is never
 * loaded into server memory or placed in a prompt.
 */
export async function listAttemptsForAi(
  userId: string,
  examId?: string,
  tierId?: string,
) {
  const rows = await database().mockAttempt.findMany({
    where: {
      userId,
      // The coach must never reason about a deleted mock.
      deletedAt: null,
      ...(examId ? { examId } : {}),
      ...(tierId && tierId !== "all" ? { tierId } : {}),
    },
    include: attemptInclude,
    omit: { notes: true },
    orderBy: [{ completedAt: "desc" }, { id: "asc" }],
  });
  return rows.map(toAnalyticsAttempt);
}

export async function getAttempt(userId: string, id: string) {
  // findFirst, not findUnique: the trash boundary is a non-unique predicate
  // and a trashed attempt must 404 exactly like a missing one.
  const row = await database().mockAttempt.findFirst({
    where: { id, userId, deletedAt: null },
    include: attemptInclude,
  });
  if (!row) throw new RequestError("Mock not found", 404);
  return toAttempt(row);
}

export async function createAttempt(
  userId: string,
  input: AttemptInput,
  pattern?: PatternShape,
) {
  const attempt = toAttempt(
    await database().mockAttempt.create({
      data: { id: randomUUID(), ...attemptData(input, pattern), userId },
      include: attemptInclude,
    }),
  );
  // A new attempt does not change settings, but invalidating the cache keeps
  // the analytics path coherent if it ever consults settings indirectly.
  return attempt;
}

export async function updateAttempt(
  userId: string,
  id: string,
  input: AttemptInput,
  pattern?: PatternShape,
) {
  const data = attemptData(input, pattern);
  return toAttempt(
    await database().mockAttempt.update({
      // Extended-where-unique: a trashed attempt is not editable.
      where: { id, userId, deletedAt: null },
      data: {
        ...data,
        subjects: { deleteMany: {}, create: data.subjects.create },
      },
      include: attemptInclude,
    }),
  );
}

/**
 * Soft delete. The row keeps its id and its SubjectResult children, so a
 * restore is a single column write and no reference can dangle. `updateMany`
 * with `deletedAt: null` makes a repeat delete a 404 rather than a second
 * timestamp — the same "foreign and nonexistent ids look alike" rule the rest
 * of the API follows.
 */
export async function deleteAttempt(userId: string, id: string) {
  const result = await database().mockAttempt.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (!result.count) throw new RequestError("Mock not found", 404);
  return { id };
}

// Settings live in exam-settings.ts since the backup import path also
// re-exports invalidation from here for existing importers.
export {
  getTrackerSettings as getSettings,
  saveTrackerSettings as saveSettings,
  invalidateSettings,
  loadExamContext,
  type TrackerSettingsShape,
} from "./exam-settings";

export async function exportBackup(userId: string) {
  return database().$transaction(
    async (tx) => {
      const [rows, settings, customExamRows, planTasks, planDays, groups, tasks] =
        await Promise.all([
          tx.mockAttempt.findMany({
            where: { userId, deletedAt: null },
            include: attemptInclude,
            orderBy: [{ completedAt: "asc" }, { id: "asc" }],
          }),
          getTrackerSettings(userId),
          tx.customExam.findMany({
            where: { userId },
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, tiers: true },
          }),
          // Planner data is part of the account's study record: leaving it
          // out made the "portable backup" silently drop every completion,
          // note and personal task.
          tx.planTaskProgress.findMany({
            where: { userId },
            orderBy: { taskKey: "asc" },
          }),
          tx.planDayProgress.findMany({
            where: { userId },
            orderBy: { day: "asc" },
          }),
          tx.todoGroup.findMany({
            where: { userId, deletedAt: null },
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true },
          }),
          tx.personalTask.findMany({
            where: { userId, deletedAt: null },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          }),
        ]);

      const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
      return buildBackup(
        rows.map(toAttempt),
        {
          activeExamId: settings.activeExamId,
          activeTierId: settings.activeTierId,
          enabledTiers: settings.enabledTiers,
          targets: settings.targets,
          preferences: settings.preferences,
        },
        customExamRows
          .map(toCustomExamDef)
          .filter((exam): exam is CustomExamDef => exam != null),
        new Date(),
        {
          planTasks: planTasks.map((row) => ({
            taskKey: row.taskKey,
            completed: row.completed,
            score: row.score,
            percentile: row.percentile,
            wrong: row.wrong,
            unattempted: row.unattempted,
            rev1: row.rev1,
            rev2: row.rev2,
            rev3: row.rev3,
            notes: row.notes,
          })),
          planDays: planDays.map((row) => ({
            day: row.day,
            checklistDone: row.checklistDone,
            revisionDone: row.revisionDone,
            dayNotes: row.dayNotes,
          })),
          todoGroups: groups.map((group) => ({ name: group.name })),
          personalTasks: tasks.map((task) => ({
            title: task.title,
            notes: task.notes,
            dueDate: task.dueDate,
            url: task.url,
            category: task.category,
            priority: task.priority,
            status: task.status,
            groupName: task.groupId
              ? (groupNameById.get(task.groupId) ?? null)
              : null,
            subtasks: normalizeSubtasks(task.subtasks),
            deletedAt: task.deletedAt?.toISOString() ?? null,
            createdAt: task.createdAt.toISOString(),
          })),
        },
      );
    },
    { isolationLevel: "RepeatableRead" },
  );
}

function importFingerprint(input: {
  userId: string;
  existing: string[];
  currentSettings: string | null;
  incoming: string[];
  settings: string | null;
  /** Serialized planner content — preview invalidation must see it. */
  planner?: string;
  mode: ImportOptions["mode"];
  applyTarget: boolean;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        input.userId,
        [...input.existing].sort(),
        input.currentSettings,
        [...input.incoming].sort(),
        input.settings,
        input.planner ?? null,
        input.mode,
        input.applyTarget,
      ]),
    )
    .digest("hex");
}

function* chunks<T>(items: T[], size: number) {
  for (let index = 0; index < items.length; index += size)
    yield items.slice(index, index + size);
}

export async function importBackup(
  userId: string,
  backup: ParsedBackup,
  options: ImportOptions,
): Promise<BackupPreview | ImportResult> {
  return database().$transaction(
    async (tx) => {
      const [existingRows, currentSettings] = await Promise.all([
        tx.mockAttempt.findMany({
          // Dedupe against live rows only: a trashed twin must not block an
          // import, and a merge never resurrects deleted work.
          where: { userId, deletedAt: null },
          include: attemptInclude,
        }),
        getTrackerSettings(userId),
      ]);
      const existing = existingRows.map(toAttempt);
      const plan = planImport(existing, backup.attempts, options.mode);
      const incomingSettings = backup.hasSettings ? backup.settings : null;
      const settingsKey = (value: BackupSettings | TrackerSettingsShape | null) =>
        value == null
          ? null
          : JSON.stringify([
              value.activeExamId,
              value.activeTierId,
              [...value.enabledTiers].sort(),
              value.targets,
              value.preferences ?? null,
            ]);
      const [existingPlanTasks, existingPlanDays, existingPersonalTasks] =
        await Promise.all([
          tx.planTaskProgress.count({ where: { userId } }),
          tx.planDayProgress.count({ where: { userId } }),
          tx.personalTask.count({ where: { userId } }),
        ]);
      const incomingPlanner = plannerCounts(backup.planner);
      const existingPlanner = {
        existingPlanTasks,
        existingPlanDays,
        existingPersonalTasks,
      };
      const fingerprint = importFingerprint({
        userId,
        existing: existing.map((attempt) => attemptFingerprint(attempt)),
        currentSettings: settingsKey(currentSettings),
        incoming: backup.attempts.map((attempt) => attemptFingerprint(attempt)),
        settings: incomingSettings ? settingsKey(incomingSettings) : null,
        // Planner rows are part of what the import changes, so the preview
        // fingerprint has to cover them: a file whose only difference is a
        // completed task must still invalidate a stale preview.
        planner: JSON.stringify([backup.planner]),
        mode: options.mode,
        applyTarget: options.applyTarget,
      });
      const settingsAvailable = backup.hasSettings;
      const settingsApplied = settingsAvailable && options.applyTarget;
      const settingsChanged =
        settingsApplied &&
        settingsKey(currentSettings) !== settingsKey(incomingSettings);
      const settingsPreview = {
        available: settingsAvailable,
        applied: settingsApplied,
        changed: settingsChanged,
      };
      const plannerPreview = { ...incomingPlanner, ...existingPlanner };
      if (options.preview)
        return {
          mode: options.mode,
          formatVersion: backup.version,
          legacy: backup.legacy,
          exportedAt: backup.exportedAt,
          total: plan.total,
          subjectResults: backup.attempts.reduce(
            (total, attempt) => total + attempt.subjects.length,
            0,
          ),
          importable: plan.importable,
          skippedDuplicates: plan.skippedDuplicates,
          conflicts: plan.conflicts,
          existingTargetCount: existing.length,
          willDelete: options.mode === "replace" ? existing.length : 0,
          settings: settingsPreview,
          planner: plannerPreview,
          samples: {
            skippedDuplicates: plan.skippedSamples,
            conflicts: plan.conflictSamples,
          },
          warnings: backup.warnings,
          previewFingerprint: fingerprint,
        } satisfies BackupPreview;

      if (!options.legacyRequest) {
        if (!options.previewFingerprint)
          throw new RequestError(
            "Preview the backup before importing it.",
            400,
          );
        if (options.previewFingerprint !== fingerprint)
          throw new RequestError(
            "Your workspace or preview changed. Review the backup again.",
            409,
          );
      }
      if (options.mode === "replace" && !options.confirmReplace)
        throw new RequestError(
          "Confirm replacing this account's data before importing.",
          400,
        );

      let deleted = 0;
      if (options.mode === "replace") {
        // Replace mirrors the file onto LIVE mocks only. Trash is deliberately
        // untouched: trashing thousands of rows would flood /trash and let a
        // restore re-create records the imported file already replaced.
        const result = await tx.mockAttempt.deleteMany({
          where: { userId, deletedAt: null },
        });
        deleted = result.count;
      }

      const rows = plan.accepted.map((attempt) => {
        const { subjects, ...data } = attemptData(attempt);
        return { id: randomUUID(), data, subjects: subjects.create };
      });
      for (const chunk of chunks(rows, BACKUP_INSERT_CHUNK_SIZE)) {
        await tx.mockAttempt.createMany({
          data: chunk.map(({ id, data }) => ({ id, ...data, userId })),
        });
        await tx.subjectResult.createMany({
          data: chunk.flatMap(({ id, subjects }) =>
            subjects.map((subject) => ({
              ...subject,
              attemptId: id,
            })),
          ),
        });
      }

      // Custom exams ride along with v3 backups; rows the account already
      // has (same id) are left untouched so re-imports stay idempotent. A
      // trashed row is restored instead: importing attempts that reference it
      // would otherwise leave them scoped to an exam the catalog no longer
      // lists.
      if (backup.customExams.length) {
        const existingRows = await tx.customExam.findMany({
          where: { userId, id: { in: backup.customExams.map((e) => e.id) } },
          select: { id: true, deletedAt: true },
        });
        const have = new Set(existingRows.map((row) => row.id));
        const trashed = existingRows
          .filter((row) => row.deletedAt)
          .map((row) => row.id);
        if (trashed.length)
          await tx.customExam.updateMany({
            where: { userId, id: { in: trashed } },
            data: { deletedAt: null },
          });
        const missing = backup.customExams.filter((exam) => !have.has(exam.id));
        if (missing.length)
          await tx.customExam.createMany({
            data: missing.map((exam) => ({
              id: exam.id,
              userId,
              name: exam.name,
              tiers: exam.tiers,
            })),
          });
      }

      let appliedSettings = false;
      if (settingsApplied && incomingSettings) {
        await tx.trackerSettings.upsert({
          where: { userId },
          create: {
            userId,
            activeExamId: incomingSettings.activeExamId,
            activeTierId: incomingSettings.activeTierId,
            enabledTiers: incomingSettings.enabledTiers,
            targets: incomingSettings.targets,
            preferences: incomingSettings.preferences ?? {},
          },
          update: {
            activeExamId: incomingSettings.activeExamId,
            activeTierId: incomingSettings.activeTierId,
            enabledTiers: incomingSettings.enabledTiers,
            targets: incomingSettings.targets,
            preferences: incomingSettings.preferences ?? {},
          },
        });
        invalidateSettings(userId);
        appliedSettings = true;
      }

      const plannerResult = await importPlanner(tx, userId, backup.planner);

      return {
        mode: options.mode,
        imported: plan.accepted.length,
        skipped: plan.skippedDuplicates,
        conflicts: plan.conflicts,
        deleted,
        settings: { applied: appliedSettings },
        planner: plannerResult,
      } satisfies ImportResult;
    },
    {
      isolationLevel: "Serializable",
      maxWait: 10_000,
      timeout: 55_000,
    },
  );
}

/** Planner import. Always MERGE — replacing study progress is destructive in
 * a way replacing mock attempts is not (progress is derived from work the
 * user actually did, and there is no "safety copy" of it). Merge semantics:
 *
 *  - plan task progress: a completed flag never regresses to false; score/
 *    percentile/notes fill only when the account has none, so a re-import of
 *    an older file cannot erase newer work.
 *  - day progress: checklist/revision ids union; notes fill only if absent.
 *  - personal tasks: matched on (title, dueDate); existing rows keep their
 *    status, so a re-import never reopens or re-completes a task.
 *  - groups: created by NAME when missing, so restoring into another account
 *    re-creates the same grouping.
 */
async function importPlanner(
  tx: Prisma.TransactionClient,
  userId: string,
  planner: ParsedBackup["planner"],
) {
  const result = {
    planTasks: 0,
    planDays: 0,
    personalTasks: 0,
    todoGroups: 0,
  };
  if (
    !planner.planTasks.length &&
    !planner.planDays.length &&
    !planner.personalTasks.length
  )
    return result;

  const [existingTasks, existingDays, existingGroups, existingPersonal] =
    await Promise.all([
      tx.planTaskProgress.findMany({ where: { userId } }),
      tx.planDayProgress.findMany({ where: { userId } }),
      tx.todoGroup.findMany({
        where: { userId },
        select: { id: true, name: true, deletedAt: true },
      }),
      tx.personalTask.findMany({
        where: { userId },
        select: { id: true, title: true, dueDate: true },
      }),
    ]);

  const taskByKey = new Map(existingTasks.map((row) => [row.taskKey, row]));
  for (const incoming of planner.planTasks) {
    const current = taskByKey.get(incoming.taskKey);
    if (!current) {
      await tx.planTaskProgress.create({
        data: {
          userId,
          taskKey: incoming.taskKey,
          completed: incoming.completed,
          score: incoming.score,
          percentile: incoming.percentile,
          wrong: incoming.wrong,
          unattempted: incoming.unattempted,
          rev1: incoming.rev1,
          rev2: incoming.rev2,
          rev3: incoming.rev3,
          notes: incoming.notes,
        },
      });
      result.planTasks += 1;
      continue;
    }
    const merged = {
      completed: current.completed || incoming.completed,
      rev1: current.rev1 || incoming.rev1,
      rev2: current.rev2 || incoming.rev2,
      rev3: current.rev3 || incoming.rev3,
      score: current.score ?? incoming.score,
      percentile: current.percentile ?? incoming.percentile,
      wrong: current.wrong ?? incoming.wrong,
      unattempted: current.unattempted ?? incoming.unattempted,
      notes: current.notes ?? incoming.notes,
    };
    if (
      merged.completed !== current.completed ||
      merged.rev1 !== current.rev1 ||
      merged.rev2 !== current.rev2 ||
      merged.rev3 !== current.rev3 ||
      merged.score !== current.score ||
      merged.percentile !== current.percentile ||
      merged.wrong !== current.wrong ||
      merged.unattempted !== current.unattempted ||
      merged.notes !== current.notes
    ) {
      await tx.planTaskProgress.update({
        where: { id: current.id },
        data: merged,
      });
      result.planTasks += 1;
    }
  }

  const dayByNumber = new Map(existingDays.map((row) => [row.day, row]));
  for (const incoming of planner.planDays) {
    const current = dayByNumber.get(incoming.day);
    if (!current) {
      await tx.planDayProgress.create({
        data: {
          userId,
          day: incoming.day,
          checklistDone: incoming.checklistDone,
          revisionDone: incoming.revisionDone,
          dayNotes: incoming.dayNotes,
        },
      });
      result.planDays += 1;
      continue;
    }
    const checklistDone = [
      ...new Set([...current.checklistDone, ...incoming.checklistDone]),
    ].sort();
    const revisionDone = [
      ...new Set([...current.revisionDone, ...incoming.revisionDone]),
    ].sort();
    const dayNotes = current.dayNotes ?? incoming.dayNotes;
    if (
      checklistDone.join(",") !== current.checklistDone.join(",") ||
      revisionDone.join(",") !== current.revisionDone.join(",") ||
      dayNotes !== current.dayNotes
    ) {
      await tx.planDayProgress.update({
        where: { id: current.id },
        data: { checklistDone, revisionDone, dayNotes },
      });
      result.planDays += 1;
    }
  }

  // Groups restore by name so a file from another account keeps its grouping.
  // A name held by a TRASHED group is reused, not duplicated: the unique
  // (userId, name) constraint includes trashed rows, and leaving the group
  // trashed would silently capture the imported tasks in an invisible group.
  const groupIdByName = new Map(existingGroups.map((g) => [g.name, g.id]));
  const wantedGroups = new Set(
    planner.personalTasks
      .map((task) => task.groupName)
      .filter((name): name is string => !!name),
  );
  for (const name of wantedGroups) {
    const existing = groupIdByName.get(name);
    if (existing) {
      const row = existingGroups.find((g) => g.id === existing);
      if (row?.deletedAt) {
        await tx.todoGroup.update({
          where: { id: existing },
          data: { deletedAt: null },
        });
      }
      continue;
    }
    const created = await tx.todoGroup.create({
      data: { userId, name },
      select: { id: true },
    });
    groupIdByName.set(name, created.id);
    result.todoGroups += 1;
  }

  // Personal tasks are matched on (title, dueDate) — the same identity the
  // user perceives. An existing row is left alone so a re-import cannot
  // reopen a completed task or resurrect one the user has since trashed.
  const personalKey = (title: string, dueDate: string | null) =>
    `${title}\u0000${dueDate ?? ""}`;
  const existingPersonalKeys = new Set(
    existingPersonal.map((row) => personalKey(row.title, row.dueDate)),
  );
  for (const incoming of planner.personalTasks) {
    if (existingPersonalKeys.has(personalKey(incoming.title, incoming.dueDate)))
      continue;
    await tx.personalTask.create({
      data: {
        userId,
        title: incoming.title,
        notes: incoming.notes,
        dueDate: incoming.dueDate,
        url: incoming.url,
        category: incoming.category,
        priority: incoming.priority,
        status: incoming.status,
        groupId: incoming.groupName
          ? (groupIdByName.get(incoming.groupName) ?? null)
          : null,
        subtasks: incoming.subtasks,
        // A deletion timestamp from an older backup is clamped so the import
        // cannot create a row that is already past its retention window.
        deletedAt: clampImportedDeletedAt(incoming.deletedAt),
        version: 1,
      },
    });
    existingPersonalKeys.add(personalKey(incoming.title, incoming.dueDate));
    result.personalTasks += 1;
  }

  return result;
}

export function filtersFrom(url: string): Filters {
  return filtersSchema.parse(
    Object.fromEntries(new URL(url).searchParams.entries()),
  );
}
