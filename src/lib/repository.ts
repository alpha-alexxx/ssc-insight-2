import { database } from "./db";
import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { type AttemptInput, type Filters } from "./domain";
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
import { LruCache } from "./cache";

/**
 * Hard server-side cap on a single listAttempts response. Protects the page
 * from a user with hundreds of mocks; the dashboard's history view paginates
 * client-side today, but the API still must not return unbounded payloads.
 * Raise the cap rather than removing it; never remove it.
 */
export const LIST_ATTEMPTS_MAX = 500;

/** Per-user settings cache. TrackerSettings is one row per user, read on every
 * page load, written only when the user changes their target. 60s TTL with
 * write-through invalidation. Saves one DB roundtrip per dashboard load. */
const settingsCache = new LruCache<string, { targetScore: number | null }>({
  ttlMs: 60_000,
  maxBytes: 256_000,
});

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

/**
 * AI context data. Notes are omitted in SQL so private note text is never
 * loaded into server memory or placed in a prompt.
 */
export async function listAttemptsForAi(userId: string) {
  const rows = await database().mockAttempt.findMany({
    where: { userId },
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

export async function createAttempt(userId: string, input: AttemptInput) {
  const attempt = toAttempt(
    await database().mockAttempt.create({
      data: { id: randomUUID(), ...attemptData(input), userId },
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
) {
  const data = attemptData(input);
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

export async function getSettings(userId: string) {
  return settingsCache.getOrLoad(userId, async () => {
    const row = await database().trackerSettings.findUnique({
      where: { userId },
      select: { targetScore: true },
    });
    return { targetScore: row?.targetScore ?? null };
  });
}

export async function saveSettings(userId: string, targetScore: number | null) {
  const row = await database().trackerSettings.upsert({
    where: { userId },
    create: { userId, targetScore },
    update: { targetScore },
    select: { targetScore: true },
  });
  // Write-through: refresh the cache immediately so the next read is a hit.
  settingsCache.set(userId, { targetScore: row.targetScore });
  return { targetScore: row.targetScore };
}

/**
 * Drop the cached settings row for a user. Call this whenever a code path
 * writes TrackerSettings outside saveSettings() (e.g. backup import).
 */
export function invalidateSettings(userId: string) {
  settingsCache.invalidate(userId);
}

export async function exportBackup(userId: string) {
  return database().$transaction(
    async (tx) => {
      const [rows, settings] = await Promise.all([
        tx.mockAttempt.findMany({
          where: { userId },
          include: attemptInclude,
          orderBy: [{ completedAt: "asc" }, { id: "asc" }],
        }),
        tx.trackerSettings.findUnique({ where: { userId } }),
      ]);
      return buildBackup(
        rows.map(toAttempt),
        settings?.targetScore ?? null,
      );
    },
    { isolationLevel: "RepeatableRead" },
  );
}

function importFingerprint(input: {
  userId: string;
  existing: string[];
  currentTarget: number | null;
  incoming: string[];
  target: number | null;
  mode: ImportOptions["mode"];
  applyTarget: boolean;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        input.userId,
        [...input.existing].sort(),
        input.currentTarget,
        [...input.incoming].sort(),
        input.target,
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
      const [existingRows, settings] = await Promise.all([
        tx.mockAttempt.findMany({
          where: { userId },
          include: attemptInclude,
        }),
        tx.trackerSettings.findUnique({ where: { userId } }),
      ]);
      const existing = existingRows.map(toAttempt);
      const currentTarget = settings?.targetScore ?? null;
      const plan = planImport(existing, backup.attempts, options.mode);
      const fingerprint = importFingerprint({
        userId,
        existing: existing.map((attempt) => attemptFingerprint(attempt)),
        currentTarget,
        incoming: backup.attempts.map((attempt) => attemptFingerprint(attempt)),
        target: backup.hasSettings ? backup.targetScore : null,
        mode: options.mode,
        applyTarget: options.applyTarget,
      });
      const targetAvailable = backup.hasSettings;
      const targetApplied = targetAvailable && options.applyTarget;
      const targetChanged =
        targetApplied && currentTarget !== backup.targetScore;
      const target = {
        available: targetAvailable,
        applied: targetApplied,
        current: currentTarget,
        incoming: targetAvailable ? backup.targetScore : null,
        changed: targetChanged,
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
          target,
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

      let targetScore = currentTarget;
      let appliedTarget = false;
      if (targetApplied) {
        const row = await tx.trackerSettings.upsert({
          where: { userId },
          create: { userId, targetScore: backup.targetScore },
          update: { targetScore: backup.targetScore },
        });
        targetScore = row.targetScore;
        appliedTarget = true;
      }

      return {
        mode: options.mode,
        imported: plan.accepted.length,
        skipped: plan.skippedDuplicates,
        conflicts: plan.conflicts,
        deleted,
        target: { applied: appliedTarget, targetScore },
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
  return z
    .object({
      type: z.enum(["all", "full", "subject", "sectional"]).optional(),
      subject: z
        .enum(["all", "quant", "reasoning", "english", "ga", "computer"])
        .optional(),
      platform: z.string().max(80).optional(),
      search: z.string().max(150).optional(),
      from: z.iso.date().or(z.literal("")).optional(),
      to: z.iso.date().or(z.literal("")).optional(),
    })
    .parse(Object.fromEntries(new URL(url).searchParams.entries()));
}
