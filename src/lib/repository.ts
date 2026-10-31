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
  type BackupPreview,
  type ImportOptions,
  type ImportResult,
  type ParsedBackup,
} from "./backup";
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
    where: { userId, id: { in: ids } },
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
  const row = await database().mockAttempt.findUnique({
    where: { id, userId },
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
      where: { id, userId },
      data: {
        ...data,
        subjects: { deleteMany: {}, create: data.subjects.create },
      },
      include: attemptInclude,
    }),
  );
}

export async function deleteAttempt(userId: string, id: string) {
  await database().mockAttempt.delete({ where: { id, userId } });
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
      const [rows, settings, customExamRows] = await Promise.all([
        tx.mockAttempt.findMany({
          where: { userId },
          include: attemptInclude,
          orderBy: [{ completedAt: "asc" }, { id: "asc" }],
        }),
        getTrackerSettings(userId),
        tx.customExam.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, tiers: true },
        }),
      ]);
      return buildBackup(
        rows.map(toAttempt),
        {
          activeExamId: settings.activeExamId,
          activeTierId: settings.activeTierId,
          enabledTiers: settings.enabledTiers,
          examTargets: settings.examTargets,
        },
        customExamRows
          .map(toCustomExamDef)
          .filter((exam): exam is CustomExamDef => exam != null),
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
          where: { userId },
          include: attemptInclude,
        }),
        getTrackerSettings(userId),
      ]);
      const existing = existingRows.map(toAttempt);
      const plan = planImport(existing, backup.attempts, options.mode);
      const incomingSettings = backup.hasSettings ? backup.settings : null;
      const settingsKey = (value: TrackerSettingsShape | null) =>
        value == null
          ? null
          : JSON.stringify([
              value.activeExamId,
              value.activeTierId,
              [...value.enabledTiers].sort(),
              Object.entries(value.examTargets).sort(([a], [b]) =>
                a.localeCompare(b),
              ),
            ]);
      const fingerprint = importFingerprint({
        userId,
        existing: existing.map((attempt) => attemptFingerprint(attempt)),
        currentSettings: settingsKey(currentSettings),
        incoming: backup.attempts.map((attempt) => attemptFingerprint(attempt)),
        settings: incomingSettings ? settingsKey(incomingSettings) : null,
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
        const result = await tx.mockAttempt.deleteMany({ where: { userId } });
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
      // has (same id) are left untouched so re-imports stay idempotent.
      if (backup.customExams.length) {
        const existingIds = await tx.customExam.findMany({
          where: { userId, id: { in: backup.customExams.map((e) => e.id) } },
          select: { id: true },
        });
        const have = new Set(existingIds.map((row) => row.id));
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
            examTargets: incomingSettings.examTargets,
          },
          update: {
            activeExamId: incomingSettings.activeExamId,
            activeTierId: incomingSettings.activeTierId,
            enabledTiers: incomingSettings.enabledTiers,
            examTargets: incomingSettings.examTargets,
          },
        });
        invalidateSettings(userId);
        appliedSettings = true;
      }

      return {
        mode: options.mode,
        imported: plan.accepted.length,
        skipped: plan.skippedDuplicates,
        conflicts: plan.conflicts,
        deleted,
        settings: { applied: appliedSettings },
      } satisfies ImportResult;
    },
    {
      isolationLevel: "Serializable",
      maxWait: 10_000,
      timeout: 55_000,
    },
  );
}

export function filtersFrom(url: string): Filters {
  return filtersSchema.parse(
    Object.fromEntries(new URL(url).searchParams.entries()),
  );
}
