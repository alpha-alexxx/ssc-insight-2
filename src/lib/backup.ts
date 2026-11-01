import { z } from "zod";
import {
  markingSchema,
  duplicateKey,
  type Attempt,
  type AttemptInput,
} from "./domain";
import type { CustomExamDef } from "./exams";
import {
  EMPTY_TARGETS,
  migrateLegacyExamTargets,
  targetSettingsSchema,
  type TargetSettings,
} from "./target-settings";

export const BACKUP_FORMAT = "ssc-insight-backup";
/** 5 = planner data (plan progress, day progress, personal tasks, groups),
 * the versioned target envelope and in-app preferences. 4 = tier-level scope.
 * 3 = exam-level scope (attempts already carried exam/tier). 2 =
 * pre-multi-exam (single CGL Tier 2). 1 = legacy attempts-only. */
export const BACKUP_FORMAT_VERSION = 5;
export const BACKUP_MAX_BYTES = 4 * 1024 * 1024;
export const BACKUP_REQUEST_MAX_BYTES = BACKUP_MAX_BYTES + 256 * 1024;
export const BACKUP_MAX_ATTEMPTS = 10_000;
export const BACKUP_INSERT_CHUNK_SIZE = 500;
export const BACKUP_SAMPLE_LIMIT = 5;
export type ImportMode = "merge" | "replace";

/** In-app-only preferences travel with the account so a restore keeps them. */
export type BackupPreferences = {
  overdueEmphasis: boolean;
  mockDueToday: boolean;
  targetGap: boolean;
  quietHours: { enabled: boolean; start: string; end: string };
};

export type BackupSettings = {
  activeExamId: string;
  activeTierId: string;
  /** "examId:tierId" keys. */
  enabledTiers: string[];
  /** Percentile goals, structure defaults and per-tier overrides. */
  targets: TargetSettings;
  preferences?: BackupPreferences;
};

/* ---------------- planner data (format 5) ---------------- */

export type BackupPlanTaskProgress = {
  taskKey: string;
  completed: boolean;
  score: number | null;
  percentile: number | null;
  wrong: number | null;
  unattempted: number | null;
  rev1: boolean;
  rev2: boolean;
  rev3: boolean;
  notes: string | null;
};

export type BackupPlanDayProgress = {
  day: number;
  checklistDone: string[];
  revisionDone: string[];
  dayNotes: string | null;
};

export type BackupTodoGroup = { name: string };

export type BackupSubtask = { id: string; title: string; completed: boolean };

export type BackupPersonalTask = {
  /** Stable within the file; children may reference a parent group name. */
  title: string;
  notes: string | null;
  dueDate: string | null;
  url: string | null;
  category: string;
  priority: string;
  status: string;
  /** Group NAME (not id) so the import can re-create groups per account. */
  groupName: string | null;
  subtasks: BackupSubtask[];
  /** Trashed tasks are included so a restore does not resurrect them. */
  deletedAt: string | null;
  createdAt: string;
};

export type BackupPlanner = {
  planTasks: BackupPlanTaskProgress[];
  planDays: BackupPlanDayProgress[];
  todoGroups: BackupTodoGroup[];
  personalTasks: BackupPersonalTask[];
};

export const EMPTY_PLANNER: BackupPlanner = {
  planTasks: [],
  planDays: [],
  todoGroups: [],
  personalTasks: [],
};

export type BackupSummary = {
  attempts: number;
  subjectResults: number;
  firstCompletedAt: string | null;
  lastCompletedAt: string | null;
  /** Planner row counts, so a preview can state what restoring adds. */
  planTasks?: number;
  planDays?: number;
  personalTasks?: number;
  todoGroups?: number;
};

export type BackupV5 = {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  summary: BackupSummary;
  settings: BackupSettings;
  customExams: CustomExamDef[];
  planner: BackupPlanner;
  attempts: Attempt[];
  warnings: string[];
};

/** Kept as the exported name the rest of the app already imports. */
export type BackupV4 = BackupV5;

export type ParsedBackup = {
  /** 5 = current; 4 = tier-level scope; 3 = exam-level scope; 2 =
   * pre-multi-exam; 1 = legacy. */
  version: 1 | 2 | 3 | 4 | 5;
  legacy: boolean;
  exportedAt: string | null;
  summary: BackupSummary | null;
  settings: BackupSettings | null;
  customExams: CustomExamDef[];
  planner: BackupPlanner;
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
  formatVersion: 1 | 2 | 3 | 4 | 5;
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
  /** Planner rows in the file, so the preview states what a restore adds. */
  planner: {
    planTasks: number;
    planDays: number;
    personalTasks: number;
    todoGroups: number;
    /** Existing planner rows in this account (replace keeps them). */
    existingPlanTasks: number;
    existingPlanDays: number;
    existingPersonalTasks: number;
  };
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
  planner: {
    planTasks: number;
    planDays: number;
    personalTasks: number;
    todoGroups: number;
  };
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
  planTasks: z.number().int().nonnegative().optional(),
  planDays: z.number().int().nonnegative().optional(),
  personalTasks: z.number().int().nonnegative().optional(),
  todoGroups: z.number().int().nonnegative().optional(),
});
/** Legacy (v3/v4) per-exam marks map, kept only for reading old files. */
const examTargetsSchema = z.record(
  z.string().min(1).max(40),
  z.number().min(0).max(100_000).nullable(),
);
const preferencesSchema = z
  .object({
    overdueEmphasis: z.boolean(),
    mockDueToday: z.boolean(),
    targetGap: z.boolean(),
    quietHours: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    }),
  })
  .strict();
const backupSettingsSchema = z.object({
  activeExamId: z.string().min(1).max(40),
  activeTierId: z.string().min(1).max(40),
  enabledTiers: z.array(z.string().min(3).max(81)).max(120),
  targets: targetSettingsSchema,
  preferences: preferencesSchema.optional(),
});
/** v4 settings shape: tier-level scope + the pre-v2 per-exam marks map. */
const v4SettingsSchema = z.object({
  activeExamId: z.string().min(1).max(40),
  activeTierId: z.string().min(1).max(40),
  enabledTiers: z.array(z.string().min(3).max(81)).max(20),
  examTargets: examTargetsSchema,
});

const planTaskProgressSchema = z.object({
  taskKey: z.string().min(1).max(20),
  completed: z.boolean().default(false),
  score: z.number().finite().nullable().default(null),
  percentile: z.number().finite().min(0).max(100).nullable().default(null),
  wrong: z.number().int().nonnegative().nullable().default(null),
  unattempted: z.number().int().nonnegative().nullable().default(null),
  rev1: z.boolean().default(false),
  rev2: z.boolean().default(false),
  rev3: z.boolean().default(false),
  notes: z.string().max(2000).nullable().default(null),
});
const planDayProgressSchema = z.object({
  day: z.number().int().positive().max(3650),
  checklistDone: z.array(z.string().max(120)).max(50).default([]),
  revisionDone: z.array(z.string().max(40)).max(50).default([]),
  dayNotes: z.string().max(2000).nullable().default(null),
});
const subtaskSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  completed: z.boolean().default(false),
});
const personalTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(2000).nullable().default(null),
  dueDate: z.iso.date().nullable().default(null),
  url: z.string().max(2048).nullable().default(null),
  category: z.string().max(40).default("other"),
  priority: z.string().max(20).default("normal"),
  status: z.string().max(20).default("todo"),
  groupName: z.string().max(80).nullable().default(null),
  subtasks: z.array(subtaskSchema).max(50).default([]),
  deletedAt: z.iso.datetime().nullable().default(null),
  createdAt: z.iso.datetime(),
});
const plannerSchema = z.object({
  planTasks: z.array(planTaskProgressSchema).max(5000).default([]),
  planDays: z.array(planDayProgressSchema).max(1000).default([]),
  todoGroups: z
    .array(z.object({ name: z.string().trim().min(1).max(80) }))
    .max(200)
    .default([]),
  personalTasks: z.array(personalTaskSchema).max(5000).default([]),
});
const customTierSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().trim().min(1).max(40),
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
const customExamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  tiers: z.array(customTierSchema).min(1).max(4),
});
/** v3 custom exams carried one flat pattern (subjects + marking). */
const v3CustomExamSchema = z.object({
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

const backupV5Schema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  exportedAt: z.iso.datetime(),
  summary: summarySchema,
  settings: backupSettingsSchema,
  customExams: z.array(customExamSchema).max(20).default([]),
  planner: plannerSchema.default(EMPTY_PLANNER),
  attempts: backupAttemptsWithBounds,
  warnings: z.array(z.string().max(500)).max(20).default([]),
});
/** v4 imports: tier-level scope with the pre-v2 per-exam marks map. */
const backupV4ImportSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.literal(4),
  exportedAt: z.iso.datetime(),
  summary: summarySchema,
  settings: v4SettingsSchema,
  customExams: z.array(customExamSchema).max(20).default([]),
  attempts: backupAttemptsWithBounds,
  warnings: z.array(z.string().max(500)).max(20).default([]),
});
/** v3 imports: exam-level settings + single-pattern custom exams. */
const backupV3ImportSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.literal(3),
  exportedAt: z.iso.datetime(),
  summary: summarySchema,
  settings: z.object({
    activeExamId: z.string().min(1).max(40),
    enabledExams: z.array(z.string().min(1).max(40)).max(10),
    examTargets: examTargetsSchema,
  }),
  customExams: z.array(v3CustomExamSchema).max(20).default([]),
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
  planner: BackupPlanner = EMPTY_PLANNER,
): BackupV5 {
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
    summary: { ...computedSummary(ordered), ...plannerCounts(planner) },
    settings,
    customExams,
    planner,
    attempts: ordered,
    warnings,
  };
}

/** Row counts for the summary/preview. */
export function plannerCounts(planner: BackupPlanner) {
  return {
    planTasks: planner.planTasks.length,
    planDays: planner.planDays.length,
    personalTasks: planner.personalTasks.length,
    todoGroups: planner.todoGroups.length,
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
      if (version === 5) {
        const parsed = backupV5Schema.parse(input);
        assertSummary(parsed.summary, parsed.attempts);
        return {
          version: 5,
          legacy: false,
          exportedAt: parsed.exportedAt,
          summary: parsed.summary,
          settings: parsed.settings,
          customExams: parsed.customExams,
          planner: parsed.planner,
          hasSettings: true,
          attempts: parsed.attempts,
          warnings: parsed.warnings,
        };
      }
      if (version === 4) {
        const parsed = backupV4ImportSchema.parse(input);
        assertSummary(parsed.summary, parsed.attempts);
        // The pre-v2 per-exam marks map pins to the tier it was measured
        // against, so no target silently changes ceiling.
        return {
          version: 4,
          legacy: false,
          exportedAt: parsed.exportedAt,
          summary: parsed.summary,
          settings: {
            ...parsed.settings,
            targets: migrateLegacyExamTargets(parsed.settings.examTargets),
          },
          customExams: parsed.customExams,
          planner: EMPTY_PLANNER,
          hasSettings: true,
          attempts: parsed.attempts,
          warnings: parsed.warnings,
        };
      }
      if (version === 3) {
        const parsed = backupV3ImportSchema.parse(input);
        assertSummary(parsed.summary, parsed.attempts);
        // Exam-level scope expands to each exam's primary-tier key; the
        // single-pattern custom exams wrap in one "Main" tier.
        const primaryById: Record<string, string> = {
          cgl: "tier2",
          chsl: "tier2",
          cpo: "paper1",
        };
        return {
          version: 3,
          legacy: false,
          exportedAt: parsed.exportedAt,
          summary: parsed.summary,
          settings: {
            activeExamId: parsed.settings.activeExamId,
            activeTierId:
              primaryById[parsed.settings.activeExamId] ?? "main",
            enabledTiers: parsed.settings.enabledExams.map(
              (examId) => `${examId}:${primaryById[examId] ?? "main"}`,
            ),
            targets: migrateLegacyExamTargets(parsed.settings.examTargets),
          },
          customExams: parsed.customExams.map((exam) => ({
            id: exam.id,
            name: exam.name,
            tiers: [
              {
                id: "main",
                label: "Main",
                subjects: exam.subjects,
                marking: exam.marking,
              },
            ],
          })),
          planner: EMPTY_PLANNER,
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
          activeTierId: "tier2",
          enabledTiers: ["cgl:tier2"],
          targets:
            parsed.settings.targetScore != null
              ? migrateLegacyExamTargets({ cgl: parsed.settings.targetScore })
              : { ...EMPTY_TARGETS },
        },
        customExams: [],
        planner: EMPTY_PLANNER,
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
      planner: EMPTY_PLANNER,
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
