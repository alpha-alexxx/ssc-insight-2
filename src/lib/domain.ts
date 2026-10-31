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
export const FULL_MOCK_MAX_SCORE = 390;
export const dashboardScopeSchema = z.enum([
  "full",
  "subject",
  "sectional",
  "all",
]);
export type DashboardScope = z.infer<typeof dashboardScopeSchema>;
export const SECTIONS = {
  section1: {
    name: "Section I",
    description: "Quant + Reasoning",
    subjectIds: ["quant", "reasoning"],
    maxScore: 180,
  },
  section2: {
    name: "Section II",
    description: "English + General Awareness",
    subjectIds: ["english", "ga"],
    maxScore: 210,
  },
} as const satisfies Record<
  string,
  {
    name: string;
    description: string;
    subjectIds: readonly SubjectId[];
    maxScore: number;
  }
>;
export type SectionId = keyof typeof SECTIONS;
export const sectionIds = Object.keys(SECTIONS) as SectionId[];
export function sectionForSubjects(
  subjects: readonly { subjectId: SubjectId }[],
): SectionId | null {
  const ids = new Set(subjects.map((subject) => subject.subjectId));
  return (
    sectionIds.find(
      (sectionId) =>
        ids.size === SECTIONS[sectionId].subjectIds.length &&
        SECTIONS[sectionId].subjectIds.every((subjectId) => ids.has(subjectId)),
    ) ?? null
  );
}
const optionalNumber = z.number().finite().nullable().optional();
export const subjectSchema = z
  .object({
    subjectId: z.enum(["quant", "reasoning", "english", "ga", "computer"]),
    questions: z.number().int().min(1).max(500),
    correct: z.number().int().min(0),
    incorrect: z.number().int().min(0),
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
      (s.scoreOverride >= -s.questions && s.scoreOverride <= s.questions * 3),
    "Score must fit the question count",
  );
export const attemptSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    platform: z.string().trim().min(1).max(80),
    completedAt: z.iso.datetime(),
    type: z.enum(["full", "subject", "sectional"]),
    subjects: z.array(subjectSchema).min(1).max(5),
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
    const mainIds = ids.filter((id) => id !== "computer");
    const fail = (message: string) =>
      ctx.addIssue({ code: "custom", message, path: ["subjects"] });
    if (new Set(ids).size !== ids.length)
      fail("Each subject can appear only once");
    if (
      a.type === "full" &&
      (mainIds.length !== MAIN_SUBJECT_IDS.length ||
        MAIN_SUBJECT_IDS.some((id) => !ids.includes(id)) ||
        a.subjects.some((s) => s.questions !== SUBJECTS[s.subjectId].questions))
    )
      fail(
        "Full mocks require the four main subjects and standard question counts",
      );
    if (a.type === "subject" && ids.length !== 1)
      fail("Subject mocks require one subject");
    if (a.type === "sectional" && sectionForSubjects(a.subjects) == null)
      fail("Select Quant + Reasoning or English + General Awareness");
    if (a.rank && a.participants && a.rank > a.participants)
      ctx.addIssue({
        code: "custom",
        message: "Rank cannot exceed participant count",
        path: ["rank"],
      });
    const q = a.subjects
      .filter((s) => a.type !== "full" || s.subjectId !== "computer")
      .reduce((sum, s) => sum + s.questions, 0);
    if (
      a.scoreOverride != null &&
      (a.scoreOverride < -q || a.scoreOverride > q * 3)
    )
      ctx.addIssue({
        code: "custom",
        message: "Overall score is outside the possible range",
        path: ["scoreOverride"],
      });
  });
export type SubjectResult = z.infer<typeof subjectSchema>;
export type AttemptInput = z.infer<typeof attemptSchema>;
export type Attempt = AttemptInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
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
};
/**
 * Validation for the persisted-record filter params, shared by the analytics
 * API (strict parse → 400) and the workspace URL mirror (lenient parse →
 * malformed params fall back to defaults). Keep in sync with filterAttempts().
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
export function subjectStats(s: SubjectResult) {
  const attempted = s.correct + s.incorrect;
  const score = s.scoreOverride ?? s.correct * 3 - s.incorrect;
  return {
    ...s,
    attempted,
    unattempted: s.questions - attempted,
    score,
    maxScore: s.questions * 3,
    percentage: (score / (s.questions * 3)) * 100,
    accuracy: attempted ? (s.correct / attempted) * 100 : null,
  };
}
/** Accepts any attempt-shaped object carrying the scoring inputs — full
 * Attempt records as well as the minimal projections the repository sorts
 * server-side. Only these four fields feed the math. */
export function totals(
  a: Pick<
    AttemptInput,
    "type" | "subjects" | "scoreOverride" | "overallTimeSeconds"
  >,
) {
  const scoringSubjects =
    a.type === "full"
      ? a.subjects.filter((s) => s.subjectId !== "computer")
      : a.subjects;
  const sums = scoringSubjects.reduce(
    (acc, s) => {
      const t = subjectStats(s);
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
    maxScore: sums.questions * 3,
    attempted,
    unattempted: sums.questions - attempted,
    accuracy: attempted ? (sums.correct / attempted) * 100 : null,
    percentage: (score / (sums.questions * 3)) * 100,
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
  return `${a.name.trim().toLowerCase()}|${a.platform.trim().toLowerCase()}|${a.completedAt}|${a.type}`;
}
