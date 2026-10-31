import { z } from "zod";
import {
  markingSchema,
  duplicateKey,
  type Attempt,
  type AttemptInput,
} from "./domain";
import type { CustomExamDef } from "./exams";

export const BACKUP_FORMAT = "ssc-insight-backup";
/** 3 = multi-exam: attempts carry exam/tier/marking, settings are per-exam,
 * custom exams are included. 2 = pre-multi-exam (single CGL Tier 2). */
export const BACKUP_FORMAT_VERSION = 3;
export const BACKUP_MAX_BYTES = 4 * 1024 * 1024;
export const BACKUP_REQUEST_MAX_BYTES = BACKUP_MAX_BYTES + 256 * 1024;
export const BACKUP_MAX_ATTEMPTS = 10_000;
export const BACKUP_INSERT_CHUNK_SIZE = 500;
export const BACKUP_SAMPLE_LIMIT = 5;
export type ImportMode = "merge" | "replace";
export type BackupSettings = {
  activeExamId: string;
  enabledExams: string[];
  examTargets: Record<string, number | null>;
};
export type BackupSummary = {
  attempts: number;
  subjectResults: number;
  firstCompletedAt: string | null;
  lastCompletedAt: string | null;
};
export type BackupV3 = {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  summary: BackupSummary;
  settings: BackupSettings;
  customExams: CustomExamDef[];
  attempts: Attempt[];
  warnings: string[];
};
export type ParsedBackup = {
  /** 3 = multi-exam; 2 = pre-multi-exam; 1 = legacy hand-rolled schema. */
  version: 1 | 2 | 3;
  legacy: boolean;
  exportedAt: string | null;
  summary: BackupSummary | null;
  settings: BackupSettings | null;
  customExams: CustomExamDef[];
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
export type SettingsPreview = {
  available: boolean;
  applied: boolean;
  changed: boolean;
};
export type BackupPreview = {
  mode: ImportMode;
  formatVersion: 1 | 2 | 3;
  legacy: boolean;
  exportedAt: string | null;
  total: number;
  subjectResults: number;
  importable: number;
  skippedDuplicates: number;
  conflicts: number;
  existingTargetCount: number;
  willDelete: number;
  settings: SettingsPreview;
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
  settings: { applied: boolean };
};

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}

const summarySchema = z.object({
  attempts: z.number().int().nonnegative(),
  subjectResults: z.number().int().nonnegative(),
  firstCompletedAt: z.iso.datetime().nullable(),
  lastCompletedAt: z.iso.datetime().nullable(),
});
const examTargetsSchema = z.record(
  z.string().min(1).max(40),
  z.number().min(0).max(100_000).nullable(),
);
const backupSettingsSchema = z.object({
  activeExamId: z.string().min(1).max(40),
  enabledExams: z.array(z.string().min(1).max(40)).max(10),
  examTargets: examTargetsSchema,
});
const customExamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  subjects: z
    .array(
      z.object({
        subjectId: z.enum(["quant", "reasoning", "english", "ga", "computer"]),
        questions: z.number().int().min(1).max(500),
        qualifying: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(5),
  marking: markingSchema,
});

/**
 * Backups span every exam/tier the user has, so attempts are validated
 * structurally — self-consistent against their own marking snapshot — not
 * against a single tier pattern. A backup may also carry custom exams that
 * no longer exist; their attempts stay self-contained by design.
 */
const backupSubjectSchema = z
  .object({
    subjectId: z.enum(["quant", "reasoning", "english", "ga", "computer"]),
    questions: z.number().int().min(1).max(500),
    correct: z.number().int().min(0),
    incorrect: z.number().int().min(0),
    qualifying: z.boolean().default(false),
    scoreOverride: z.number().finite().nullable().optional(),
    timeSeconds: z.number().int().min(0).max(86400).nullable().optional(),
  })
  .refine(
    (s) => s.correct + s.incorrect <= s.questions,
    "Attempted questions cannot exceed total questions",
  );

// Provenance keys (id/createdAt/updatedAt/schemaVersion) are deliberately
// absent: they are stripped at parse time and import regenerates them.
const backupAttemptSchema = z.object({
  name: z.string().trim().min(1).max(150),
  platform: z.string().trim().min(1).max(80),
  completedAt: z.iso.datetime(),
  type: z.enum(["full", "subject", "sectional"]),
  examId: z.string().min(1).max(40).default("cgl"),
  tierId: z.string().min(1).max(40).default("tier2"),
  marking: markingSchema.default({ correct: 3, incorrect: 1 }),
  subjects: z.array(backupSubjectSchema).min(1).max(5),
  scoreOverride: z.number().finite().nullable().optional(),
  overallTimeSeconds: z.number().int().min(0).max(86400).nullable().optional(),
  rank: z.number().int().min(1).nullable().optional(),
  participants: z.number().int().min(1).nullable().optional(),
  percentile: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().max(5000).default(""),
  source: z.enum(["manual", "paste", "backup"]).default("backup"),
});

const backupAttemptsWithBounds = z
  .array(backupAttemptSchema)
  .max(BACKUP_MAX_ATTEMPTS)
  .superRefine((attempts, ctx) => {
    attempts.forEach((a, index) => {
      const fail = (message: string, path: (string | number)[]) =>
        ctx.addIssue({ code: "custom", message, path: [index, ...path] });
      if (new Set(a.subjects.map((s) => s.subjectId)).size !== a.subjects.length)
        fail("Each subject can appear only once", ["subjects"]);
      for (const [sIndex, subject] of a.subjects.entries()) {
        if (subject.scoreOverride == null) continue;
        if (
          subject.scoreOverride <
            -subject.questions * a.marking.incorrect ||
          subject.scoreOverride > subject.questions * a.marking.correct
        )
          fail("Score must fit the question count and marking scheme", [
            "subjects",
            sIndex,
            "scoreOverride",
          ]);
      }
      const q = a.subjects.reduce((sum, s) => sum + s.questions, 0);
      if (
        a.scoreOverride != null &&
        (a.scoreOverride < -q * a.marking.incorrect ||
          a.scoreOverride > q * a.marking.correct)
      )
        fail("Overall score is outside the possible range", ["scoreOverride"]);
    });
  });

const backupV3Schema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  exportedAt: z.iso.datetime(),
  summary: summarySchema,
  settings: backupSettingsSchema,
  customExams: z.array(customExamSchema).max(20).default([]),
  attempts: backupAttemptsWithBounds,
  warnings: z.array(z.string().max(500)).max(20).default([]),
});
const backupV2Schema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.literal(2),
  exportedAt: z.iso.datetime(),
  summary: summarySchema,
  settings: z.object({
    targetScore: z.number().min(0).max(390).nullable(),
  }),
  attempts: backupAttemptsWithBounds,
  warnings: z.array(z.string().max(500)).max(20).default([]),
});
const legacyBackupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.iso.datetime().optional(),
  attempts: backupAttemptsWithBounds,
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

/** Pre-multi-exam rows carry no qualifying flag; the only qualifying subject
 * that existed was Computer Knowledge under the CGL Tier 2 scheme. */
function backfillLegacyQualifying<T extends { subjects: { subjectId: string; qualifying: boolean }[] }>(
  attempts: T[],
): T[] {
  return attempts.map((attempt) => ({
    ...attempt,
    subjects: attempt.subjects.map((subject) => ({
      ...subject,
      qualifying: subject.subjectId === "computer",
    })),
  }));
}

export function buildBackup(
  attempts: Attempt[],
  settings: BackupSettings,
  customExams: CustomExamDef[],
  exportedAt = new Date(),
): BackupV3 {
  const ordered = [...attempts].sort(
    (a, b) =>
      a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id),
  );
  const warnings: string[] = [];
  const invalid = ordered.filter(
    (attempt) => !backupAttemptSchema.safeParse(attempt).success,
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
    settings,
    customExams,
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
    try {
      if (version === 3) {
        const parsed = backupV3Schema.parse(input);
        assertSummary(parsed.summary, parsed.attempts);
        return {
          version: 3,
          legacy: false,
          exportedAt: parsed.exportedAt,
          summary: parsed.summary,
          settings: parsed.settings,
          customExams: parsed.customExams,
          hasSettings: true,
          attempts: parsed.attempts,
          warnings: parsed.warnings,
        };
      }
      const parsed = backupV2Schema.parse(input);
      assertSummary(parsed.summary, parsed.attempts);
      return {
        version: 2,
        legacy: false,
        exportedAt: parsed.exportedAt,
        summary: parsed.summary,
        // Pre-multi-exam target was a CGL Tier 2 score; map it so it lands
        // on the same exam after import.
        settings: {
          activeExamId: "cgl",
          enabledExams: ["cgl"],
          examTargets: parsed.settings.targetScore != null
            ? { cgl: parsed.settings.targetScore }
            : {},
        },
        customExams: [],
        hasSettings: true,
        attempts: backfillLegacyQualifying(parsed.attempts),
        warnings: parsed.warnings,
      };
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new BackupError(`Invalid backup file: ${formatIssues(error)}`);
      throw error;
    }
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
      settings: null,
      customExams: [],
      hasSettings: false,
      attempts: backfillLegacyQualifying(parsed.attempts),
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
    input.examId,
    input.tierId,
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
