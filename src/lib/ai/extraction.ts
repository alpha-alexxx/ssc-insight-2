import { z } from "zod";
import {
  attemptSchema,
  MAIN_SUBJECT_IDS,
  SECTIONS,
  SUBJECTS,
  sectionForSubjects,
  subjectIds,
  type AttemptInput,
  type SubjectId,
} from "../domain";
import { completionTimestamp } from "../mock-entry";
import { parseModelJson } from "./schemas";

export const MAX_EXTRACT_CHARS = 20_000;

export type ExtractionIssue = {
  code: string;
  path?: string;
  severity: "warning" | "blocker";
  message: string;
};

export type ExtractedSubjectDraft = {
  subjectId: SubjectId;
  questions: number | null;
  correct: number | null;
  incorrect: number | null;
  timeSeconds: number | null;
  reported: {
    score: number | null;
    attempted: number | null;
    unattempted: number | null;
    timeText: string | null;
  };
  derivedFields: Array<"questions" | "correct" | "incorrect">;
};

export type ExtractionDraft = {
  name: string | null;
  platform: string | null;
  date: string | null;
  type: AttemptInput["type"] | null;
  subjects: ExtractedSubjectDraft[];
  rank: number | null;
  participants: number | null;
  percentile: number | null;
  modelWarnings: string[];
  issues: ExtractionIssue[];
  confidence: "high" | "medium" | "low";
};

function numeric(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const text = value.trim();
    const clock = text.match(/^(\d{1,3}):([0-5]\d):([0-5]\d)$/);
    if (clock)
      return (
        Number(clock[1]) * 3_600 + Number(clock[2]) * 60 + Number(clock[3])
      );
    const parsed = Number(text.replace(/[,%\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return value;
}

const nullableNumber = z.preprocess(numeric, z.number().finite().nullable());
const subjectRowSchema = z.object({
  subjectId: z.enum(["quant", "reasoning", "english", "ga", "computer"]),
  questions: nullableNumber.default(null),
  correct: nullableNumber.default(null),
  incorrect: nullableNumber.default(null),
  timeText: z.string().trim().max(80).nullable().default(null),
  // Accepted for compatibility with older provider responses. New prompts ask
  // for the exact report text so conversion stays deterministic server-side.
  timeSeconds: nullableNumber.default(null),
  score: nullableNumber.default(null),
  attempted: nullableNumber.default(null),
  unattempted: nullableNumber.default(null),
});

const extractionModelSchema = z.object({
  name: z.string().max(300).nullable().default(null),
  platform: z.string().max(300).nullable().default(null),
  date: z.string().max(40).nullable().default(null),
  type: z.enum(["full", "subject", "sectional"]).nullable().default(null),
  subjects: z.array(subjectRowSchema).max(8).default([]),
  rank: nullableNumber.default(null),
  participants: nullableNumber.default(null),
  percentile: nullableNumber.default(null),
  warnings: z.array(z.string().max(400)).max(8).default([]),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});

function validDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normaliseDate(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const text = value.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    return validDate(year, month, day)
      ? `${iso[1]}-${iso[2]}-${iso[3]}`
      : null;
  }
  const indian = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!indian) return null;
  const day = Number(indian[1]);
  const month = Number(indian[2]);
  const year = Number(indian[3]);
  return validDate(year, month, day)
    ? `${indian[3]}-${indian[2].padStart(2, "0")}-${indian[1].padStart(2, "0")}`
    : null;
}

function parseReportedTime(value: string | null) {
  if (!value) return null;
  const text = value.trim().toLowerCase();
  const hms = text.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/);
  if (hms) {
    const total =
      Number(hms[1]) * 3_600 + Number(hms[2]) * 60 + Number(hms[3]);
    return total <= 86_400 ? total : null;
  }
  const ms = text.match(/^(\d{1,3}):([0-5]\d)$/);
  if (ms) {
    const total = Number(ms[1]) * 60 + Number(ms[2]);
    return total <= 86_400 ? total : null;
  }

  const hours = text.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\b/);
  const minutes = text.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/);
  const seconds = text.match(/(\d+)\s*(?:s|sec|secs|second|seconds)\b/);
  if (!hours && !minutes && !seconds) return null;
  const total =
    Number(hours?.[1] ?? 0) * 3_600 +
    Number(minutes?.[1] ?? 0) * 60 +
    Number(seconds?.[1] ?? 0);
  return total <= 86_400 ? total : null;
}

function issue(
  code: string,
  message: string,
  path?: string,
  severity: ExtractionIssue["severity"] = "blocker",
): ExtractionIssue {
  return { code, message, ...(path ? { path } : {}), severity };
}

function exactInteger(
  value: number | null,
  path: string,
  label: string,
  issues: ExtractionIssue[],
  min: number,
  max: number,
) {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < min || value > max) {
    issues.push(
      issue(
        "INVALID_INTEGER",
        `${label} must be a whole number between ${min} and ${max}.`,
        path,
      ),
    );
    return null;
  }
  return value;
}

function inferType(subjects: readonly { subjectId: SubjectId }[]) {
  const ids = new Set(subjects.map((subject) => subject.subjectId));
  const hasFullLayout =
    MAIN_SUBJECT_IDS.every((id) => ids.has(id)) &&
    [...ids].every((id) => MAIN_SUBJECT_IDS.includes(id as never) || id === "computer");
  if (hasFullLayout) return "full" as const;
  if (sectionForSubjects(subjects)) return "sectional" as const;
  if (subjects.length === 1) return "subject" as const;
  return null;
}

function deriveQuestions(subject: ExtractedSubjectDraft) {
  if (subject.questions != null || subject.reported.unattempted == null)
    return subject;
  const attempted =
    subject.reported.attempted ??
    (subject.correct != null && subject.incorrect != null
      ? subject.correct + subject.incorrect
      : null);
  if (attempted == null) return subject;
  const questions = attempted + subject.reported.unattempted;
  if (!Number.isInteger(questions) || questions < 1 || questions > 500)
    return subject;
  return {
    ...subject,
    questions,
    derivedFields: [
      ...new Set([...subject.derivedFields, "questions" as const]),
    ],
  };
}

function deriveCounts(
  subject: ExtractedSubjectDraft,
  path: string,
  issues: ExtractionIssue[],
) {
  let attempted = subject.reported.attempted;
  if (
    attempted == null &&
    subject.questions != null &&
    subject.reported.unattempted != null
  ) {
    attempted = subject.questions - subject.reported.unattempted;
  }

  let correct = subject.correct;
  let incorrect = subject.incorrect;
  const score = subject.reported.score;
  const derived = new Set(subject.derivedFields);

  if (attempted != null) {
    if (correct != null && incorrect == null) {
      incorrect = attempted - correct;
      derived.add("incorrect");
    } else if (incorrect != null && correct == null) {
      correct = attempted - incorrect;
      derived.add("correct");
    } else if (correct == null && incorrect == null && score != null) {
      correct = (score + attempted) / 4;
      incorrect = attempted - correct;
      derived.add("correct");
      derived.add("incorrect");
    }
  } else if (score != null) {
    if (correct != null && incorrect == null) {
      incorrect = correct * 3 - score;
      derived.add("incorrect");
    } else if (incorrect != null && correct == null) {
      correct = (score + incorrect) / 3;
      derived.add("correct");
    }
  }

  const validDerived = (value: number | null) =>
    value == null || (Number.isInteger(value) && value >= 0);
  if (!validDerived(correct) || !validDerived(incorrect)) {
    issues.push(
      issue(
        "NON_INTEGRAL_DERIVATION",
        `${SUBJECTS[subject.subjectId].short}: reported values do not produce whole, non-negative correct and incorrect counts.`,
        path,
      ),
    );
    correct = subject.correct;
    incorrect = subject.incorrect;
    derived.delete("correct");
    derived.delete("incorrect");
  }

  return { ...subject, correct, incorrect, derivedFields: [...derived] };
}

function localIssues(draft: Omit<ExtractionDraft, "issues">) {
  const issues: ExtractionIssue[] = [];
  if (!draft.name?.trim())
    issues.push(issue("MISSING_NAME", "Enter the mock name.", "name"));
  if (!draft.platform?.trim())
    issues.push(issue("MISSING_PLATFORM", "Enter the platform.", "platform"));
  if (!draft.date)
    issues.push(issue("MISSING_DATE", "Enter a valid completion date.", "date"));
  if (!draft.type)
    issues.push(issue("MISSING_TYPE", "Choose the mock type.", "type"));
  if (!draft.subjects.length)
    issues.push(
      issue("MISSING_SUBJECTS", "Add at least one subject result.", "subjects"),
    );

  const seen = new Set<SubjectId>();
  draft.subjects.forEach((subject, index) => {
    const path = `subjects.${index}`;
    if (seen.has(subject.subjectId))
      issues.push(
        issue(
          "DUPLICATE_SUBJECT",
          `${SUBJECTS[subject.subjectId].short} appears more than once.`,
          `${path}.subjectId`,
        ),
      );
    seen.add(subject.subjectId);
    if (
      subject.questions != null &&
      (!Number.isInteger(subject.questions) ||
        subject.questions < 1 ||
        subject.questions > 500)
    )
      issues.push(
        issue(
          "INVALID_QUESTIONS",
          `${SUBJECTS[subject.subjectId].short}: questions must be a whole number from 1 to 500.`,
          `${path}.questions`,
        ),
      );
    if (
      subject.correct != null &&
      (!Number.isInteger(subject.correct) || subject.correct < 0 || subject.correct > 500)
    )
      issues.push(
        issue(
          "INVALID_CORRECT",
          `${SUBJECTS[subject.subjectId].short}: correct must be a whole number from 0 to 500.`,
          `${path}.correct`,
        ),
      );
    if (
      subject.incorrect != null &&
      (!Number.isInteger(subject.incorrect) ||
        subject.incorrect < 0 ||
        subject.incorrect > 500)
    )
      issues.push(
        issue(
          "INVALID_INCORRECT",
          `${SUBJECTS[subject.subjectId].short}: incorrect must be a whole number from 0 to 500.`,
          `${path}.incorrect`,
        ),
      );
    if (
      subject.timeSeconds != null &&
      (!Number.isInteger(subject.timeSeconds) ||
        subject.timeSeconds < 0 ||
        subject.timeSeconds > 86_400)
    )
      issues.push(
        issue(
          "INVALID_TIME",
          `${SUBJECTS[subject.subjectId].short}: time must be between 00:00:00 and 24:00:00.`,
          `${path}.timeSeconds`,
        ),
      );
    if (subject.questions == null)
      issues.push(
        issue(
          "MISSING_QUESTIONS",
          `${SUBJECTS[subject.subjectId].short}: enter the question count.`,
          `${path}.questions`,
        ),
      );
    if (subject.correct == null)
      issues.push(
        issue(
          "MISSING_CORRECT",
          `${SUBJECTS[subject.subjectId].short}: enter the correct count.`,
          `${path}.correct`,
        ),
      );
    if (subject.incorrect == null)
      issues.push(
        issue(
          "MISSING_INCORRECT",
          `${SUBJECTS[subject.subjectId].short}: enter the incorrect count.`,
          `${path}.incorrect`,
        ),
      );
    if (
      subject.questions != null &&
      subject.correct != null &&
      subject.incorrect != null &&
      subject.correct + subject.incorrect > subject.questions
    )
      issues.push(
        issue(
          "ATTEMPTS_EXCEED_QUESTIONS",
          `${SUBJECTS[subject.subjectId].short}: attempted questions exceed the question count.`,
          path,
        ),
      );
    const attempted = subject.correct != null && subject.incorrect != null
      ? subject.correct + subject.incorrect
      : null;
    if (
      subject.reported.attempted != null &&
      (!Number.isInteger(subject.reported.attempted) ||
        subject.reported.attempted < 0 ||
        subject.reported.attempted > 500)
    )
      issues.push(
        issue(
          "INVALID_REPORTED_ATTEMPTED",
          `${SUBJECTS[subject.subjectId].short}: reported attempted must be a whole number from 0 to 500.`,
          `${path}.reported.attempted`,
        ),
      );
    if (
      subject.reported.unattempted != null &&
      (!Number.isInteger(subject.reported.unattempted) ||
        subject.reported.unattempted < 0 ||
        subject.reported.unattempted > 500)
    )
      issues.push(
        issue(
          "INVALID_REPORTED_UNATTEMPTED",
          `${SUBJECTS[subject.subjectId].short}: reported unattempted must be a whole number from 0 to 500.`,
          `${path}.reported.unattempted`,
        ),
      );
    if (
      attempted != null &&
      subject.reported.attempted != null &&
      attempted !== subject.reported.attempted
    )
      issues.push(
        issue(
          "ATTEMPTED_MISMATCH",
          `${SUBJECTS[subject.subjectId].short}: the counts conflict with the reported attempted total.`,
          path,
          "warning",
        ),
      );
    if (
      attempted != null &&
      subject.questions != null &&
      subject.reported.unattempted != null &&
      subject.questions - attempted !== subject.reported.unattempted
    )
      issues.push(
        issue(
          "UNATTEMPTED_MISMATCH",
          `${SUBJECTS[subject.subjectId].short}: the counts conflict with the reported unattempted total.`,
          path,
          "warning",
        ),
      );
    if (
      subject.correct != null &&
      subject.incorrect != null &&
      subject.reported.score != null &&
      subject.correct * 3 - subject.incorrect !== subject.reported.score
    )
      issues.push(
        issue(
          "SCORE_MISMATCH",
          `${SUBJECTS[subject.subjectId].short}: the counts conflict with the reported score.`,
          path,
          "warning",
        ),
      );
    if (subject.timeSeconds == null)
      issues.push(
        issue(
          "MISSING_TIME",
          `${SUBJECTS[subject.subjectId].short}: time was not found; leave it blank or enter it.`,
          `${path}.timeSeconds`,
          "warning",
        ),
      );
  });

  if (draft.type === "full") {
    const ids = draft.subjects.map((subject) => subject.subjectId);
    if (
      MAIN_SUBJECT_IDS.some((id) => !ids.includes(id)) ||
      ids.some((id) => id !== "computer" && !MAIN_SUBJECT_IDS.includes(id as never))
    )
      issues.push(
        issue(
          "INVALID_FULL_LAYOUT",
          "A full mock needs Quant, Reasoning, English, and General Awareness.",
          "subjects",
        ),
      );
    draft.subjects.forEach((subject, index) => {
      if (
        subject.questions != null &&
        subject.questions !== SUBJECTS[subject.subjectId].questions
      )
        issues.push(
          issue(
            "INVALID_FULL_QUESTIONS",
            `${SUBJECTS[subject.subjectId].short}: a full mock requires ${SUBJECTS[subject.subjectId].questions} questions.`,
            `subjects.${index}.questions`,
          ),
        );
    });
  }
  if (draft.type === "subject" && draft.subjects.length !== 1)
    issues.push(
      issue(
        "INVALID_SUBJECT_LAYOUT",
        "A subject mock needs exactly one subject.",
        "subjects",
      ),
    );
  if (draft.type === "sectional" && !sectionForSubjects(draft.subjects))
    issues.push(
      issue(
        "INVALID_SECTION_LAYOUT",
        "A sectional mock must be Quant + Reasoning or English + General Awareness.",
        "subjects",
      ),
    );
  if (
    draft.rank != null &&
    (!Number.isInteger(draft.rank) || draft.rank < 1)
  )
    issues.push(issue("INVALID_RANK_VALUE", "Rank must be a positive whole number.", "rank"));
  if (
    draft.participants != null &&
    (!Number.isInteger(draft.participants) || draft.participants < 1)
  )
    issues.push(
      issue(
        "INVALID_PARTICIPANTS",
        "Participants must be a positive whole number.",
        "participants",
      ),
    );
  if (
    draft.percentile != null &&
    (draft.percentile < 0 || draft.percentile > 100)
  )
    issues.push(
      issue(
        "INVALID_PERCENTILE_VALUE",
        "Percentile must be between 0 and 100.",
        "percentile",
      ),
    );
  if (
    draft.rank != null &&
    draft.participants != null &&
    draft.rank > draft.participants
  )
    issues.push(
      issue(
        "INVALID_RANK",
        "Rank cannot exceed the participant count.",
        "rank",
      ),
    );
  return issues;
}

export function validateExtractionDraft(draft: ExtractionDraft): ExtractionDraft {
  return { ...draft, issues: localIssues(draft) };
}

export function parseExtraction(raw: string): ExtractionDraft {
  return normaliseExtraction(parseModelJson(raw, z.unknown()));
}

/** Convert untrusted model JSON into an editable, explicitly incomplete draft. */
export function normaliseExtraction(raw: unknown): ExtractionDraft {
  const parsed = extractionModelSchema.parse(raw);
  const inputIssues: ExtractionIssue[] = [];
  const duplicateIds = new Set<SubjectId>();
  const seen = new Set<SubjectId>();
  let subjects = parsed.subjects.map((row, index): ExtractedSubjectDraft => {
    if (seen.has(row.subjectId)) duplicateIds.add(row.subjectId);
    seen.add(row.subjectId);
    const path = `subjects.${index}`;
    const parsedTime = parseReportedTime(row.timeText);
    if (row.timeText && parsedTime == null)
      inputIssues.push(
        issue(
          "INVALID_TIME_TEXT",
          `${SUBJECTS[row.subjectId].short}: could not read the reported time “${row.timeText}”. Enter it manually.`,
          `${path}.timeSeconds`,
          "warning",
        ),
      );
    return {
      subjectId: row.subjectId,
      questions: exactInteger(row.questions, `${path}.questions`, "Questions", inputIssues, 1, 500),
      correct: exactInteger(row.correct, `${path}.correct`, "Correct", inputIssues, 0, 500),
      incorrect: exactInteger(row.incorrect, `${path}.incorrect`, "Incorrect", inputIssues, 0, 500),
      timeSeconds:
        parsedTime ??
        exactInteger(
          row.timeSeconds,
          `${path}.timeSeconds`,
          "Time",
          inputIssues,
          0,
          86_400,
        ),
      reported: {
        score: row.score,
        attempted: exactInteger(row.attempted, `${path}.reported.attempted`, "Attempted", inputIssues, 0, 500),
        unattempted: exactInteger(row.unattempted, `${path}.reported.unattempted`, "Unattempted", inputIssues, 0, 500),
        timeText: row.timeText,
      },
      derivedFields: [],
    };
  });

  const type = parsed.type ?? inferType(subjects);
  const ids = new Set(subjects.map((subject) => subject.subjectId));
  const validFullLayout =
    type === "full" && MAIN_SUBJECT_IDS.every((id) => ids.has(id));
  if (validFullLayout) {
    subjects = subjects.map((subject) =>
      subject.questions == null
        ? {
            ...subject,
            questions: SUBJECTS[subject.subjectId].questions,
            derivedFields: [...subject.derivedFields, "questions"],
          }
        : subject,
    );
  }
  subjects = subjects.map(deriveQuestions);
  subjects = subjects.map((subject, index) =>
    deriveCounts(subject, `subjects.${index}`, inputIssues),
  );

  const date = normaliseDate(parsed.date);
  if (parsed.date?.trim() && !date)
    inputIssues.push(
      issue("INVALID_DATE", "The completion date could not be read.", "date"),
    );

  const rank = exactInteger(parsed.rank, "rank", "Rank", inputIssues, 1, Number.MAX_SAFE_INTEGER);
  const participants = exactInteger(
    parsed.participants,
    "participants",
    "Participants",
    inputIssues,
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const percentile =
    parsed.percentile == null ||
    (parsed.percentile >= 0 && parsed.percentile <= 100)
      ? parsed.percentile
      : null;
  if (parsed.percentile != null && percentile == null)
    inputIssues.push(
      issue(
        "INVALID_PERCENTILE",
        "Percentile must be between 0 and 100.",
        "percentile",
      ),
    );

  const base: Omit<ExtractionDraft, "issues"> = {
    name: parsed.name?.trim().slice(0, 150) || null,
    platform: parsed.platform?.trim().slice(0, 80) || null,
    date,
    type,
    subjects,
    rank,
    participants,
    percentile,
    modelWarnings: parsed.warnings.map((warning) => warning.trim()).filter(Boolean),
    confidence: parsed.confidence,
  };
  const duplicates = [...duplicateIds].map((id) =>
    issue(
      "DUPLICATE_SUBJECT",
      `${SUBJECTS[id].short} appeared more than once. Remove the duplicate row.`,
      "subjects",
    ),
  );
  return {
    ...base,
    issues: [...inputIssues, ...duplicates, ...localIssues(base)],
  };
}

export function extractionToAttempt(
  draft: ExtractionDraft,
  notes: string,
): { values: AttemptInput; date: string; warnings: string[] } {
  const reviewed = validateExtractionDraft(draft);
  if (reviewed.issues.some((entry) => entry.severity === "blocker"))
    throw new Error("Resolve the highlighted extraction fields before continuing.");
  if (!reviewed.name || !reviewed.platform || !reviewed.date || !reviewed.type)
    throw new Error("Complete the required mock details before continuing.");

  const values = attemptSchema.parse({
    name: reviewed.name,
    platform: reviewed.platform,
    completedAt: completionTimestamp(reviewed.date),
    type: reviewed.type,
    subjects: reviewed.subjects.map((subject) => ({
      subjectId: subject.subjectId,
      questions: subject.questions,
      correct: subject.correct,
      incorrect: subject.incorrect,
      timeSeconds: subject.timeSeconds,
      scoreOverride: null,
    })),
    rank: reviewed.rank,
    participants: reviewed.participants,
    percentile: reviewed.percentile,
    notes,
    source: "paste",
    scoreOverride: null,
    overallTimeSeconds: null,
  });
  return {
    values,
    date: reviewed.date,
    warnings: [
      ...reviewed.modelWarnings,
      ...reviewed.issues
        .filter((entry) => entry.severity === "warning")
        .map((entry) => entry.message),
    ],
  };
}

export function blankExtractedSubject(subjectId: SubjectId): ExtractedSubjectDraft {
  return {
    subjectId,
    questions: null,
    correct: null,
    incorrect: null,
    timeSeconds: null,
    reported: {
      score: null,
      attempted: null,
      unattempted: null,
      timeText: null,
    },
    derivedFields: [],
  };
}

export const extractionSubjectIds = subjectIds;
export const extractionSections = SECTIONS;
