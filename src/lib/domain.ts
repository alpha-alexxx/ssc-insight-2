import { z } from "zod";
export const SUBJECTS = {
  quant: {
    name: "Quantitative Aptitude",
    short: "Quant",
    questions: 30,
    color: "#2563eb",
  },
  reasoning: {
    name: "General Intelligence and Reasoning",
    short: "Reasoning",
    questions: 30,
    color: "#8b5cf6",
  },
  english: {
    name: "English Comprehension",
    short: "English",
    questions: 45,
    color: "#0891b2",
  },
  ga: {
    name: "General Awareness",
    short: "General Awareness",
    questions: 25,
    color: "#e59a24",
  },
  computer: {
    name: "Computer Knowledge",
    short: "Computer",
    questions: 20,
    color: "#64748b",
  },
} as const;
export type SubjectId = keyof typeof SUBJECTS;
export const subjectIds = Object.keys(SUBJECTS) as SubjectId[];
/** Two-to-five-letter abbreviations for tight columns (phone report tables). */
export const SUBJECT_INITIALS: Record<SubjectId, string> = {
  quant: "Quant",
  reasoning: "GI",
  english: "EN",
  ga: "GA",
  computer: "CK",
};
export const MAIN_SUBJECT_IDS = [
  "quant",
  "reasoning",
  "english",
  "ga",
] as const satisfies readonly SubjectId[];
/** Legacy single-exam constant: the CGL Tier 2 merit total. Everything
 * exam-aware takes its max from the tier pattern (src/lib/exams.ts) instead;
 * this remains for the plan module, landing, and backup back-compat. */
export const FULL_MOCK_MAX_SCORE = 390;
export const dashboardScopeSchema = z.enum([
  "full",
  "subject",
  "sectional",
  "all",
]);
export type DashboardScope = z.infer<typeof dashboardScopeSchema>;

/** Marking scheme of one tier: marks per correct answer and the penalty per
 * incorrect one. The penalty may be fractional (CPO −0.25), so scores can be. */
export type Marking = { correct: number; incorrect: number };
export const markingSchema = z
  .object({
    correct: z.number().positive().max(100),
    incorrect: z.number().min(0).max(100),
  })
  .strict();

/** Canonical section ids (chart colors and legacy data key off them).
 * CGL and CHSL Tier 2 both run a numbered Section III (Computer Knowledge),
 * so the vocabulary has to reach past the original two-way Section I/II split.
 * A tier only ever produces points for the sections it actually declares. */
export type SectionId = "section1" | "section2" | "section3" | "section4";
export const sectionIds = [
  "section1",
  "section2",
  "section3",
  "section4",
] as const;
/** A section split of one tier pattern. */
export type PatternSection = {
  id: SectionId;
  name: string;
  description: string;
  subjectIds: readonly SubjectId[];
  /** Sectional timer, when the paper runs one. */
  durationMinutes?: number;
  /** A qualifying section (CGL/CHSL Section III) is tracked but excluded from
   * merit aggregates, mirroring how qualifying subjects are treated. */
  qualifying?: boolean;
};

/** The subjects of one tier, with their per-subject question counts and
 * qualifying flags. */
export type PatternSubjects = readonly {
  subjectId: SubjectId;
  questions: number;
  qualifying: boolean;
}[];

/** The slice of a resolved tier pattern (src/lib/exam-pattern.ts) that the
 * scoring and validation layer consumes. */
export type PatternShape = {
  examId: string;
  tierId: string;
  subjects: PatternSubjects;
  marking: Marking;
  sections: readonly PatternSection[];
  /** The tier's own label ("Tier 2 — Paper I"), so prompts and backup samples
   * can name a custom tier instead of falling back to its raw id. */
  tierLabel?: string;
  /** Objective duration, when the catalog states one. */
  durationMinutes?: number | null;
};

export function sectionForSubjects(
  subjects: readonly { subjectId: SubjectId }[],
  sections: readonly PatternSection[],
): PatternSection | null {
  const ids = new Set(subjects.map((subject) => subject.subjectId));
  return (
    sections.find(
      (section) =>
        ids.size === section.subjectIds.length &&
        section.subjectIds.every((subjectId) => ids.has(subjectId)),
    ) ?? null
  );
}
const optionalNumber = z.number().finite().nullable().optional();
export function subjectSchemaFor(marking: Marking) {
  return z
    .object({
      subjectId: z.enum(["quant", "reasoning", "english", "ga", "computer"]),
      questions: z.number().int().min(1).max(500),
      correct: z.number().int().min(0),
      incorrect: z.number().int().min(0),
      qualifying: z.boolean().default(false),
      scoreOverride: optionalNumber,
      timeSeconds: z.number().int().min(0).max(86400).nullable().optional(),
    })
    .refine(
      (s) => s.correct + s.incorrect <= s.questions,
      "Attempted questions cannot exceed total questions",
    )
    .refine(
      (s) =>
        s.scoreOverride == null ||
        (s.scoreOverride >=
          -s.questions * marking.incorrect &&
          s.scoreOverride <= s.questions * marking.correct),
      "Score must fit the question count",
    );
}
export type SubjectResult = z.infer<ReturnType<typeof subjectSchemaFor>>;

/** Shape of a validated attempt input — identical for every exam pattern.
 * Mirrors the zod output of attemptSchemaFor: optional keys may be absent. */
export type AttemptInput = {
  name: string;
  platform: string;
  completedAt: string;
  type: "full" | "subject" | "sectional";
  subjects: SubjectResult[];
  marking: Marking;
  examId: string;
  tierId: string;
  scoreOverride?: number | null;
  overallTimeSeconds?: number | null;
  rank?: number | null;
  participants?: number | null;
  percentile?: number | null;
  notes: string;
  source: "manual" | "paste" | "backup";
};

/**
 * Attempt validation for one resolved tier pattern. Full mocks require every
 * merit-bearing (non-qualifying) pattern subject at its standard count;
 * qualifying subjects may be added and must match their count too. Sectional
 * mocks only exist for patterns that define sections.
 */
export function attemptSchemaFor(pattern: PatternShape) {
  const subjectRow = subjectSchemaFor(pattern.marking);
  return z
    .object({
      name: z.string().trim().min(1).max(150),
      platform: z.string().trim().min(1).max(80),
      completedAt: z.iso.datetime(),
      type: z.enum(["full", "subject", "sectional"]),
      examId: z.string().min(1).max(40),
      tierId: z.string().min(1).max(40),
      marking: markingSchema,
      subjects: z.array(subjectRow).min(1).max(5),
      scoreOverride: optionalNumber,
      overallTimeSeconds: z
        .number()
        .int()
        .min(0)
        .max(86400)
        .nullable()
        .optional(),
      rank: z.number().int().min(1).nullable().optional(),
      participants: z.number().int().min(1).nullable().optional(),
      percentile: z.number().min(0).max(100).nullable().optional(),
      notes: z.string().max(5000).default(""),
      source: z.enum(["manual", "paste", "backup"]).default("manual"),
    })
    .superRefine((a, ctx) => {
      const ids = a.subjects.map((s) => s.subjectId);
      const fail = (message: string) =>
        ctx.addIssue({ code: "custom", message, path: ["subjects"] });
      if (a.examId !== pattern.examId || a.tierId !== pattern.tierId)
        ctx.addIssue({
          code: "custom",
          message: "Attempt does not match the selected exam tier",
          path: ["examId"],
        });
      if (
        a.marking.correct !== pattern.marking.correct ||
        a.marking.incorrect !== pattern.marking.incorrect
      )
        ctx.addIssue({
          code: "custom",
          message: "Marking scheme does not match the selected exam tier",
          path: ["marking"],
        });
      if (new Set(ids).size !== ids.length)
        fail("Each subject can appear only once");
      if (a.type === "full") {
        const merit = pattern.subjects.filter((s) => !s.qualifying);
        const ok = merit.every((p) => {
          const row = a.subjects.find((s) => s.subjectId === p.subjectId);
          return row != null && row.questions === p.questions;
        });
        const qualifyingOk = a.subjects.every((s) => {
          const p = pattern.subjects.find((q) => q.subjectId === s.subjectId);
          return p != null && (!p.qualifying || s.questions === p.questions);
        });
        if (!ok || !qualifyingOk)
          fail(
            "Full mocks require the tier's subjects at their standard question counts",
          );
      }
      if (a.type === "subject" && ids.length !== 1)
        fail("Subject mocks require one subject");
      if (a.type === "sectional") {
        if (!pattern.sections.length)
          fail("This exam tier does not have sectional tests");
        else if (sectionForSubjects(a.subjects, pattern.sections) == null)
          fail("Select the subjects of one section");
      }
      if (a.rank && a.participants && a.rank > a.participants)
        ctx.addIssue({
          code: "custom",
          message: "Rank cannot exceed participant count",
          path: ["rank"],
        });
      const scoringSubjects =
        a.type === "full"
          ? a.subjects.filter((s) => !s.qualifying)
          : a.subjects;
      const q = scoringSubjects.reduce((sum, s) => sum + s.questions, 0);
      if (
        a.scoreOverride != null &&
        (a.scoreOverride < -q * pattern.marking.incorrect ||
          a.scoreOverride > q * pattern.marking.correct)
      )
        ctx.addIssue({
          code: "custom",
          message: "Overall score is outside the possible range",
          path: ["scoreOverride"],
        });
    });
}
export type Attempt = AttemptInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1 | 2;
};
// Analytics must never require notes. The AI context fetches attempts with
// Prisma's `omit` so note text never enters server memory in the first place.
export type AnalyticsAttempt = Omit<Attempt, "notes">;
export type Filters = {
  type?: string;
  subject?: string;
  platform?: string;
  from?: string;
  to?: string;
  search?: string;
  tier?: string;
  /** Set server-side from the user's active exam; never user input. */
  examId?: string;
};
/**
 * Validation for the persisted-record filter params, shared by the analytics
 * API (strict parse → 400) and the workspace URL mirror (lenient parse →
 * malformed params drop individually). Keep in sync with filterAttempts().
 */
export const filtersSchema = z.object({
  type: z.enum(["all", "full", "subject", "sectional"]).optional(),
  subject: z
    .enum(["all", "quant", "reasoning", "english", "ga", "computer"])
    .optional(),
  platform: z.string().max(80).optional(),
  search: z.string().max(150).optional(),
  from: z.iso.date().or(z.literal("")).optional(),
  to: z.iso.date().or(z.literal("")).optional(),
  tier: z.string().max(40).optional(),
});

/** Server-paged list columns, in table order. Score/accuracy/time are
 * totals()-derived, so the repository sorts those in JS (attempt-sort.ts). */
export const ATTEMPT_SORT_KEYS = [
  "name",
  "type",
  "platform",
  "date",
  "score",
  "accuracy",
  "percentile",
  "time",
] as const;
export type SortKey = (typeof ATTEMPT_SORT_KEYS)[number];

/** Rows per page offered by the /history and /compare pickers. */
export const PAGE_SIZES = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** Strict validation for GET /api/mock-attempts list params: the shared
 * filters plus the paging contract. A request without `page` stays the
 * legacy unpaged array response the dashboard and shell caches depend on. */
export const attemptListSchema = filtersSchema.extend({
  page: z.coerce.number().int().min(1).max(100_000).optional(),
  pageSize: z.coerce
    .number()
    .int()
    .refine((v): v is PageSize => (PAGE_SIZES as readonly number[]).includes(v))
    .optional(),
  sort: z.enum(ATTEMPT_SORT_KEYS).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  stats: z.literal("1").optional(),
});

/** KPI strip aggregates for /history, computed server-side over the whole
 * filtered set (see buildAttemptStats). Null averages mean no data. */
export type AttemptStats = {
  totalMocks: number;
  avgScore: number | null;
  /** The common paper maximum behind avgScore, when the filtered set spans
   * one tier only; null when tiers are mixed (use avgScorePct instead). */
  avgScoreMax: number | null;
  avgScorePct: number | null;
  avgAccuracy: number | null;
  accuracyDelta: number | null;
  avgTime: number | null;
  timeDelta: number | null;
  newThisMonth: number;
};

/** One server-paged page of attempts, plus the count metadata the shadcn
 * pagination UI needs and the optional KPI stats block. */
export type PagedAttempts = {
  items: Attempt[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  stats?: AttemptStats;
};
export function subjectStats(s: SubjectResult, marking: Marking) {
  const attempted = s.correct + s.incorrect;
  const score =
    s.scoreOverride ??
    s.correct * marking.correct - s.incorrect * marking.incorrect;
  return {
    ...s,
    attempted,
    unattempted: s.questions - attempted,
    score,
    maxScore: s.questions * marking.correct,
    percentage: (score / (s.questions * marking.correct)) * 100,
    accuracy: attempted ? (s.correct / attempted) * 100 : null,
  };
}
/** Accepts any attempt-shaped object carrying the scoring inputs — full
 * Attempt records as well as the minimal projections the repository sorts
 * server-side. Marking comes from the attempt's snapshotted tier pattern;
 * qualifying subjects are excluded from a full mock's merit total. */
export function totals(
  a: Pick<
    AttemptInput,
    | "type"
    | "subjects"
    | "scoreOverride"
    | "overallTimeSeconds"
    | "marking"
  >,
) {
  const scoringSubjects =
    a.type === "full"
      ? a.subjects.filter((s) => !s.qualifying)
      : a.subjects;
  const sums = scoringSubjects.reduce(
    (acc, s) => {
      const t = subjectStats(s, a.marking);
      return {
        correct: acc.correct + s.correct,
        incorrect: acc.incorrect + s.incorrect,
        questions: acc.questions + s.questions,
        score: acc.score + t.score,
        timeSeconds: acc.timeSeconds + (s.timeSeconds ?? 0),
      };
    },
    { correct: 0, incorrect: 0, questions: 0, score: 0, timeSeconds: 0 },
  );
  const attempted = sums.correct + sums.incorrect;
  const score = a.scoreOverride ?? sums.score;
  return {
    ...sums,
    score,
    maxScore: sums.questions * a.marking.correct,
    attempted,
    unattempted: sums.questions - attempted,
    accuracy: attempted ? (sums.correct / attempted) * 100 : null,
    percentage: (score / (sums.questions * a.marking.correct)) * 100,
    timeSeconds:
      a.overallTimeSeconds ??
      (a.subjects.every((s) => s.timeSeconds != null)
        ? a.subjects.reduce((sum, s) => sum + (s.timeSeconds ?? 0), 0)
        : null),
  };
}
export function formatNumber(n: number | null | undefined, digits = 1) {
  return n == null
    ? "—"
    : n.toLocaleString("en-IN", { maximumFractionDigits: digits });
}
/** Scores can be fractional under −0.25/−0.50 penalties; show up to two
 * decimals and drop trailing zeros (142.75 stays, 130 stays "130"). */
export function formatScore(n: number | null | undefined) {
  return formatNumber(n, 2);
}
export function formatTime(seconds: number | null | undefined) {
  if (seconds == null) return "—";
  /* Round the whole value first: averages arrive fractional (0:32:57.83…),
     and rounding only the seconds component could render a ":60". */
  const total = Math.round(seconds);
  return `${Math.floor(total / 3600)}:${String(Math.floor(total / 60) % 60).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export function parseTime(value: string) {
  if (!value.trim()) return null;
  const parts = value.split(":").map(Number);
  if (
    parts.some((n) => !Number.isInteger(n) || n < 0) ||
    parts.length > 3 ||
    parts.slice(1).some((n) => n > 59)
  )
    throw new Error("Time must use hh:mm:ss or mm:ss");
  return parts.reduce((a, n) => a * 60 + n, 0);
}
export function duplicateKey(a: AttemptInput) {
  return `${a.examId}|${a.tierId}|${a.name.trim().toLowerCase()}|${a.platform.trim().toLowerCase()}|${a.completedAt}|${a.type}`;
}
