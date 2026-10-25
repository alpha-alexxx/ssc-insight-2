import { z } from "zod";
import {
  FULL_MOCK_MAX_SCORE,
  attemptSchema,
  duplicateKey,
  type Attempt,
  type AttemptInput,
} from "./domain";

export const BACKUP_FORMAT = "ssc-insight-backup";
export const BACKUP_FORMAT_VERSION = 2;
export const BACKUP_MAX_BYTES = 4 * 1024 * 1024;
export const BACKUP_REQUEST_MAX_BYTES = BACKUP_MAX_BYTES + 256 * 1024;
export const BACKUP_MAX_ATTEMPTS = 10_000;
export const BACKUP_INSERT_CHUNK_SIZE = 500;
export const BACKUP_SAMPLE_LIMIT = 5;
export type ImportMode = "merge" | "replace";
export type BackupSettings = { targetScore: number | null };
export type BackupSummary = {
  attempts: number;
  subjectResults: number;
  firstCompletedAt: string | null;
  lastCompletedAt: string | null;
};
export type BackupV2 = {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  summary: BackupSummary;
  settings: BackupSettings;
  attempts: Attempt[];
  warnings: string[];
};
export type ParsedBackup = {
  version: 1 | 2;
  legacy: boolean;
  exportedAt: string | null;
  summary: BackupSummary | null;
  targetScore: number | null;
  hasSettings: boolean;
  attempts: AttemptInput[];
  warnings: string[];
};
export type ImportOptions = {
  preview: boolean;
  mode: ImportMode;
  applyTarget: boolean;
  previewFingerprint?: string;
  confirmReplace: boolean;
  legacyRequest: boolean;
};
export type ImportPlan = {
  total: number;
  importable: number;
  skippedDuplicates: number;
  conflicts: number;
  accepted: AttemptInput[];
  skippedSamples: string[];
  conflictSamples: string[];
};
export type TargetPreview = {
  available: boolean;
  applied: boolean;
  current: number | null;
  incoming: number | null;
  changed: boolean;
};
export type BackupPreview = {
  mode: ImportMode;
  formatVersion: 1 | 2;
  legacy: boolean;
  exportedAt: string | null;
  total: number;
  subjectResults: number;
  importable: number;
  skippedDuplicates: number;
  conflicts: number;
  existingTargetCount: number;
  willDelete: number;
  target: TargetPreview;
  samples: {
    skippedDuplicates: string[];
    conflicts: string[];
  };
  warnings: string[];
  previewFingerprint: string;
};
export type ImportResult = {
  mode: ImportMode;
  imported: number;
  skipped: number;
  conflicts: number;
  deleted: number;
  target: { applied: boolean; targetScore: number | null };
};

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}

const settingsSchema = z.object({
  targetScore: z.number().min(0).max(FULL_MOCK_MAX_SCORE).nullable(),
});
const summarySchema = z.object({
  attempts: z.number().int().nonnegative(),
  subjectResults: z.number().int().nonnegative(),
  firstCompletedAt: z.iso.datetime().nullable(),
  lastCompletedAt: z.iso.datetime().nullable(),
});
const backupV2Schema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  exportedAt: z.iso.datetime(),
  summary: summarySchema,
  settings: settingsSchema,
  attempts: z.array(attemptSchema).max(BACKUP_MAX_ATTEMPTS),
  warnings: z.array(z.string().max(500)).max(20).default([]),
});
const legacyBackupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.iso.datetime().optional(),
  attempts: z.array(attemptSchema).max(BACKUP_MAX_ATTEMPTS),
});
const importRequestSchema = z.object({
  backup: z.unknown().optional(),
  preview: z.boolean().default(true),
  mode: z.enum(["merge", "replace"]).default("merge"),
  applyTarget: z.boolean().default(false),
  previewFingerprint: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  confirmReplace: z.boolean().default(false),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function formatIssues(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}

function computedSummary(attempts: AttemptInput[]): BackupSummary {
  const dates = attempts
    .map((attempt) => new Date(attempt.completedAt).toISOString())
    .sort();
  return {
    attempts: attempts.length,
    subjectResults: attempts.reduce(
      (total, attempt) => total + attempt.subjects.length,
      0,
    ),
    firstCompletedAt: dates[0] ?? null,
    lastCompletedAt: dates[dates.length - 1] ?? null,
  };
}

function assertSummary(
  summary: BackupSummary,
  attempts: AttemptInput[],
) {
  const computed = computedSummary(attempts);
  if (
    summary.attempts !== computed.attempts ||
    summary.subjectResults !== computed.subjectResults ||
    summary.firstCompletedAt !== computed.firstCompletedAt ||
    summary.lastCompletedAt !== computed.lastCompletedAt
  )
    throw new BackupError(
      "Backup summary does not match its records. The file may be incomplete or modified.",
    );
}

export function buildBackup(
  attempts: Attempt[],
  targetScore: number | null,
  exportedAt = new Date(),
): BackupV2 {
  const ordered = [...attempts].sort(
    (a, b) =>
      a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id),
  );
  const warnings: string[] = [];
  const invalid = ordered.filter(
    (attempt) => !attemptSchema.safeParse(attempt).success,
  ).length;
  if (invalid)
    warnings.push(
      `${invalid} record${invalid === 1 ? "" : "s"} cannot be validated against the current schema. This backup may not be importable.`,
    );
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    summary: computedSummary(ordered),
    settings: { targetScore },
    attempts: ordered,
    warnings,
  };
}

export function parseBackup(input: unknown): ParsedBackup {
  if (!isRecord(input))
    throw new BackupError("This is not an SSC Insight backup file.");

  if ("formatVersion" in input) {
    const version = input.formatVersion;
    if (typeof version === "number" && version > BACKUP_FORMAT_VERSION)
      throw new BackupError(
        `This backup uses format version ${version}. Update the app before importing it.`,
      );
    let parsed: z.infer<typeof backupV2Schema>;
    try {
      parsed = backupV2Schema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new BackupError(`Invalid backup file: ${formatIssues(error)}`);
      throw error;
    }
    assertSummary(parsed.summary, parsed.attempts);
    return {
      version: 2,
      legacy: false,
      exportedAt: parsed.exportedAt,
      summary: parsed.summary,
      targetScore: parsed.settings.targetScore,
      hasSettings: true,
      attempts: parsed.attempts,
      warnings: parsed.warnings,
    };
  }

  if (input.schemaVersion === 1) {
    let parsed: z.infer<typeof legacyBackupSchema>;
    try {
      parsed = legacyBackupSchema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new BackupError(
          `Invalid version-1 backup: ${formatIssues(error)}`,
        );
      throw error;
    }
    return {
      version: 1,
      legacy: true,
      exportedAt: parsed.exportedAt ?? null,
      summary: null,
      targetScore: null,
      hasSettings: false,
      attempts: parsed.attempts,
      warnings: [],
    };
  }

  throw new BackupError(
    "This is not an SSC Insight backup file. Choose the JSON backup, not the CSV export.",
  );
}

export function parseImportRequest(body: unknown): {
  backup: ParsedBackup;
  options: ImportOptions;
} {
  let request: z.infer<typeof importRequestSchema>;
  try {
    request = importRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError)
      throw new BackupError(`Invalid import request: ${formatIssues(error)}`);
    throw error;
  }
  const nested = request.backup !== undefined;
  const backup = parseBackup(nested ? request.backup : body);
  const legacyRequest = !nested && backup.version === 1;
  if (legacyRequest && request.mode !== "merge")
    throw new BackupError("Legacy backup requests support merge only.");
  return {
    backup,
    options: {
      preview: request.preview,
      mode: request.mode,
      applyTarget: request.applyTarget,
      previewFingerprint: request.previewFingerprint,
      confirmReplace: request.confirmReplace,
      legacyRequest,
    },
  };
}

export function attemptFingerprint(input: AttemptInput) {
  const completedAt = new Date(input.completedAt).toISOString();
  const subjects = [...input.subjects]
    .sort((a, b) => a.subjectId.localeCompare(b.subjectId))
    .map((subject) => [
      subject.subjectId,
      subject.questions,
      subject.correct,
      subject.incorrect,
      subject.scoreOverride ?? null,
      subject.timeSeconds ?? null,
    ]);
  return JSON.stringify([
    input.name.trim().toLowerCase(),
    input.platform.trim().toLowerCase(),
    completedAt,
    input.type,
    subjects,
    input.scoreOverride ?? null,
    input.overallTimeSeconds ?? null,
    input.rank ?? null,
    input.participants ?? null,
    input.percentile ?? null,
    input.notes.trim(),
  ]);
}

export function attemptLabel(input: AttemptInput) {
  return `${input.name.trim()} · ${input.platform.trim()} · ${new Date(
    input.completedAt,
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })}`;
}

export function planImport(
  existing: AttemptInput[],
  incoming: AttemptInput[],
  mode: ImportMode,
): ImportPlan {
  const accepted: AttemptInput[] = [];
  const seen = new Set(
    mode === "merge" ? existing.map((attempt) => attemptFingerprint(attempt)) : [],
  );
  const existingKeys = new Set(existing.map((attempt) => duplicateKey(attempt)));
  let skippedDuplicates = 0;
  let conflicts = 0;
  const skippedSamples: string[] = [];
  const conflictSamples: string[] = [];

  for (const attempt of incoming) {
    const fingerprint = attemptFingerprint(attempt);
    if (seen.has(fingerprint)) {
      skippedDuplicates++;
      if (skippedSamples.length < BACKUP_SAMPLE_LIMIT)
        skippedSamples.push(attemptLabel(attempt));
      continue;
    }
    seen.add(fingerprint);
    accepted.push(attempt);
    if (mode === "merge" && existingKeys.has(duplicateKey(attempt))) {
      conflicts++;
      if (conflictSamples.length < BACKUP_SAMPLE_LIMIT)
        conflictSamples.push(attemptLabel(attempt));
    }
  }

  return {
    total: incoming.length,
    importable: accepted.length,
    skippedDuplicates,
    conflicts,
    accepted,
    skippedSamples,
    conflictSamples,
  };
}
