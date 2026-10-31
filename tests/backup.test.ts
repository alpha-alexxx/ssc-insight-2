import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BACKUP_MAX_ATTEMPTS,
  BACKUP_MAX_BYTES,
  BackupError,
  attemptFingerprint,
  buildBackup,
  parseBackup,
  parseImportRequest,
  planImport,
} from "../src/lib/backup";
import type { Attempt, AttemptInput, SubjectResult } from "../src/lib/domain";

const quant: SubjectResult = {
  subjectId: "quant",
  questions: 30,
  correct: 14,
  incorrect: 6,
  qualifying: false,
  timeSeconds: 1800,
};
const reasoning: SubjectResult = {
  subjectId: "reasoning",
  questions: 30,
  correct: 25,
  incorrect: 5,
  qualifying: false,
  timeSeconds: 1200,
};
const english: SubjectResult = {
  subjectId: "english",
  questions: 45,
  correct: 37,
  incorrect: 8,
  qualifying: false,
  timeSeconds: 2100,
};
const ga: SubjectResult = {
  subjectId: "ga",
  questions: 25,
  correct: 14,
  incorrect: 6,
  qualifying: false,
  timeSeconds: 600,
};
function attempt(
  id: string,
  type: Attempt["type"],
  subjects: SubjectResult[],
  date: string,
  extra: Partial<Attempt> = {},
): Attempt {
  return {
    id,
    name: `Mock ${id}`,
    platform: "Testbook",
    completedAt: date,
    type,
    examId: "cgl",
    tierId: "tier2",
    marking: { correct: 3, incorrect: 1 },
    subjects,
    notes: "",
    source: "manual",
    schemaVersion: 1,
    createdAt: date,
    updatedAt: date,
    ...extra,
  };
}
const full = attempt(
  "full",
  "full",
  [quant, reasoning, english, ga],
  "2026-10-05T00:00:00.000Z",
  { percentile: 65.59 },
);
const subject = attempt(
  "subject",
  "subject",
  [{ ...quant, questions: 15, correct: 12, incorrect: 2 }],
  "2026-10-09T00:00:00.000Z",
  { source: "paste" },
);
const SETTINGS = {
  activeExamId: "cgl",
  enabledExams: ["cgl"],
  examTargets: { cgl: 320 },
};
const backup = buildBackup(
  [subject, full],
  SETTINGS,
  [],
  new Date("2026-10-25T10:00:00.000Z"),
);

test("v2 backup includes complete records, target, and metadata but no ownership", () => {
  assert.equal(backup.format, BACKUP_FORMAT);
  assert.equal(backup.formatVersion, BACKUP_FORMAT_VERSION);
  assert.equal(backup.exportedAt, "2026-10-25T10:00:00.000Z");
  assert.deepEqual(backup.summary, {
    attempts: 2,
    subjectResults: 5,
    firstCompletedAt: "2026-10-05T00:00:00.000Z",
    lastCompletedAt: "2026-10-09T00:00:00.000Z",
  });
  assert.equal(backup.settings.examTargets.cgl, 320);
  assert.deepEqual(backup.warnings, []);
  assert.deepEqual(
    backup.attempts.map((row) => row.id),
    ["full", "subject"],
  );
  const serialized = JSON.stringify(backup);
  assert.equal(serialized.includes("userId"), false);
  assert.equal(serialized.includes("@gmail.com"), false);
  assert.equal(serialized.includes("email"), false);
});

test("v2 parse strips provenance identifiers and preserves user fields", () => {
  const parsed = parseBackup(JSON.parse(JSON.stringify(backup)));
  assert.equal(parsed.version, 3);
  assert.equal(parsed.legacy, false);
  assert.equal(parsed.hasSettings, true);
  assert.equal(parsed.settings?.examTargets.cgl, 320);
  assert.equal(parsed.attempts.length, 2);
  assert.equal(parsed.attempts[0].source, "manual");
  assert.equal(parsed.attempts[1].source, "paste");
  assert.equal(parsed.attempts[0].notes, "");
  assert.equal("id" in parsed.attempts[0], false);
  assert.equal("createdAt" in parsed.attempts[0], false);
  assert.equal("updatedAt" in parsed.attempts[0], false);
  assert.equal("userId" in parsed.attempts[0], false);
});

test("v2 summary and dates must match the records", () => {
  assert.throws(
    () =>
      parseBackup({
        ...backup,
        summary: { ...backup.summary, attempts: 99 },
      }),
    BackupError,
  );
  assert.throws(
    () =>
      parseBackup({
        ...backup,
        summary: {
          ...backup.summary,
          firstCompletedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    BackupError,
  );
  assert.throws(
    () =>
      parseBackup({
        ...backup,
        summary: { ...backup.summary, subjectResults: 99 },
      }),
    BackupError,
  );
});

test("legacy v1 backups remain importable without settings", () => {
  const parsed = parseBackup({
    schemaVersion: 1,
    exportedAt: "2026-10-01T00:00:00.000Z",
    attempts: backup.attempts,
  });
  assert.equal(parsed.version, 1);
  assert.equal(parsed.legacy, true);
  assert.equal(parsed.hasSettings, false);
  assert.equal(parsed.settings, null);
  assert.equal(parsed.summary, null);
  assert.equal(parsed.attempts.length, 2);
  assert.equal(
    parseBackup({ schemaVersion: 1, attempts: [] }).attempts.length,
    0,
  );
});

test("unsupported, malformed, and invalid-record backups fail cleanly", () => {
  assert.throws(
    () => parseBackup({ ...backup, formatVersion: 4 }),
    /format version 4/,
  );
  assert.throws(
    () => parseBackup({ format: "other", formatVersion: 3 }),
    BackupError,
  );
  assert.throws(
    () => parseBackup({ schemaVersion: 2, attempts: [] }),
    BackupError,
  );
  assert.throws(() => parseBackup("text"), BackupError);
  assert.throws(() => parseBackup({}), BackupError);
  const invalid = {
    ...backup,
    attempts: [
      {
        ...backup.attempts[0],
        subjects: backup.attempts[0].subjects.slice(0, 2),
      },
    ],
    summary: {
      attempts: 1,
      subjectResults: 2,
      firstCompletedAt: backup.summary.firstCompletedAt,
      lastCompletedAt: backup.summary.lastCompletedAt,
    },
  };
  assert.throws(() => parseBackup(invalid), BackupError);
});

test("target and attempt limits are validated", () => {
  // Pre-multi-exam (v2) targets map onto the CGL entry of the per-exam map.
  assert.equal(
    parseBackup({
      ...backup,
      formatVersion: 2,
      settings: { targetScore: 0 },
    }).settings?.examTargets.cgl,
    0,
  );
  assert.equal(
    parseBackup({
      ...backup,
      formatVersion: 2,
      settings: { targetScore: 390 },
    }).settings?.examTargets.cgl,
    390,
  );
  assert.throws(
    () =>
      parseBackup({
        ...backup,
        formatVersion: 2,
        settings: { targetScore: 391 },
      }),
    BackupError,
  );
  const tooMany = Array.from({ length: BACKUP_MAX_ATTEMPTS + 1 }, () =>
    attempt("subject", "subject", [{ ...quant, questions: 15 }], "2026-10-09T00:00:00.000Z"),
  );
  assert.throws(
    () =>
      parseBackup({
        ...backup,
        attempts: tooMany,
        summary: {
          attempts: tooMany.length,
          subjectResults: tooMany.length,
          firstCompletedAt: "2026-10-09T00:00:00.000Z",
          lastCompletedAt: "2026-10-09T00:00:00.000Z",
        },
      }),
    BackupError,
  );
  assert.equal(BACKUP_MAX_BYTES, 4 * 1024 * 1024);
});

test("parseImportRequest supports new and legacy requests", () => {
  const nested = parseImportRequest({
    backup,
    preview: false,
    mode: "replace",
    applyTarget: true,
    previewFingerprint: "a".repeat(64),
    confirmReplace: true,
  });
  assert.equal(nested.options.preview, false);
  assert.equal(nested.options.mode, "replace");
  assert.equal(nested.options.applyTarget, true);
  assert.equal(nested.options.confirmReplace, true);
  assert.equal(nested.options.legacyRequest, false);

  const legacy = parseImportRequest({
    schemaVersion: 1,
    attempts: backup.attempts,
    preview: true,
  });
  assert.equal(legacy.options.legacyRequest, true);
  assert.equal(legacy.options.mode, "merge");
  assert.equal(legacy.options.preview, true);
  const topLevelV3 = parseImportRequest({ ...backup, preview: true });
  assert.equal(topLevelV3.options.legacyRequest, false);
  assert.equal(topLevelV3.backup.version, 3);
  assert.throws(
    () =>
      parseImportRequest({
        schemaVersion: 1,
        attempts: backup.attempts,
        mode: "replace",
      }),
    BackupError,
  );
  const nestedLegacy = parseImportRequest({
    backup: { schemaVersion: 1, attempts: backup.attempts },
    mode: "replace",
    previewFingerprint: "a".repeat(64),
    confirmReplace: true,
    preview: false,
  });
  assert.equal(nestedLegacy.options.legacyRequest, false);
  assert.equal(nestedLegacy.options.mode, "replace");
  assert.throws(
    () =>
      parseImportRequest({
        backup,
        previewFingerprint: "bad",
      }),
    BackupError,
  );
});

test("fingerprints ignore provenance and normalize content", () => {
  const base = {
    ...subject,
    id: "subject",
    createdAt: "2026-10-09T00:00:00.000Z",
    updatedAt: "2026-10-09T00:00:00.000Z",
    schemaVersion: 1 as const,
    examId: "cgl",
    tierId: "tier2",
    marking: { correct: 3, incorrect: 1 },
  };
  const baseFingerprint = attemptFingerprint(base);

  assert.equal(
    attemptFingerprint({
      ...base,
      id: "different",
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
      source: "paste",
    } as AttemptInput),
    baseFingerprint,
  );
  assert.equal(
    attemptFingerprint({
      ...base,
      name: "  MOCK SUBJECT  ",
      platform: " testbook ",
      notes: "  ",
    }),
    baseFingerprint,
  );
  assert.equal(
    attemptFingerprint({
      ...base,
      completedAt: "2026-10-09T05:30:00+05:30",
    }),
    baseFingerprint,
  );
  assert.equal(
    attemptFingerprint({
      ...base,
      subjects: [{ ...base.subjects[0], scoreOverride: undefined }],
    }),
    attemptFingerprint({
      ...base,
      subjects: [{ ...base.subjects[0], scoreOverride: null }],
    }),
  );
  const two = {
    ...full,
    subjects: [quant, reasoning],
  };
  assert.equal(
    attemptFingerprint({ ...two, subjects: [reasoning, quant] }),
    attemptFingerprint(two),
  );
  assert.notEqual(
    attemptFingerprint({ ...base, notes: "different" }),
    baseFingerprint,
  );
  assert.notEqual(
    attemptFingerprint({ ...base, rank: 12 }),
    baseFingerprint,
  );
  assert.notEqual(
    attemptFingerprint({ ...base, percentile: 88 }),
    baseFingerprint,
  );
  assert.notEqual(
    attemptFingerprint({
      ...base,
      subjects: [{ ...base.subjects[0], timeSeconds: 99 }],
    }),
    baseFingerprint,
  );
  assert.notEqual(
    attemptFingerprint({
      ...base,
      subjects: [{ ...base.subjects[0], scoreOverride: 20 }],
    }),
    baseFingerprint,
  );
});

test("merge skips exact duplicates, reports conflicts, and dedupes within the file", () => {
  const existingA = full;
  const existingB = subject;
  const incomingA = full;
  const incomingC = attempt(
    "c",
    "subject",
    [{ ...quant, questions: 10, correct: 5, incorrect: 2 }],
    "2026-10-10T00:00:00.000Z",
  );
  const incomingD = attempt(
    "d",
    "subject",
    [{ ...quant, questions: 15, correct: 9, incorrect: 3 }],
    subject.completedAt,
    { name: subject.name, platform: subject.platform },
  );
  const plan = planImport(
    [existingA, existingB],
    [incomingA, incomingC, incomingC, incomingD],
    "merge",
  );
  assert.equal(plan.total, 4);
  assert.equal(plan.importable, 2);
  assert.equal(plan.skippedDuplicates, 2);
  assert.equal(plan.conflicts, 1);
  assert.deepEqual(
    plan.accepted.map((row) => row.name),
    ["Mock c", "Mock subject"],
  );
  assert.equal(plan.skippedSamples.length, 2);
  assert.equal(plan.conflictSamples.length, 1);
});

test("replace ignores existing records and dedupes only within the file", () => {
  const incomingA = full;
  const incomingC = attempt(
    "c",
    "subject",
    [{ ...quant, questions: 10, correct: 5, incorrect: 2 }],
    "2026-10-10T00:00:00.000Z",
  );
  const plan = planImport(
    [full, subject],
    [incomingA, incomingC, incomingC],
    "replace",
  );
  assert.equal(plan.total, 3);
  assert.equal(plan.importable, 2);
  assert.equal(plan.skippedDuplicates, 1);
  assert.equal(plan.conflicts, 0);
  assert.equal(planImport([], [], "merge").importable, 0);
});

test("ownership fields cannot survive a v2 parse", () => {
  const forged = {
    ...backup,
    userId: "other-user",
    email: "other@example.com",
    attempts: backup.attempts.map((row) => ({
      ...row,
      userId: "other-user",
      subjects: row.subjects.map((s) => ({ ...s, userId: "other-user" })),
    })),
  };
  const parsed = parseBackup(JSON.parse(JSON.stringify(forged)));
  const serialized = JSON.stringify(parsed);
  assert.equal(serialized.includes("other-user"), false);
  assert.equal(serialized.includes("other@example.com"), false);
  assert.equal(serialized.includes("userId"), false);
});
