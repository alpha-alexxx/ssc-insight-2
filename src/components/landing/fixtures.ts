import {
  type AnalyticsAttempt,
  type Attempt,
  type SubjectId,
  type DashboardScope,
  SUBJECTS,
  totals,
} from "@/lib/domain";
import { analyze } from "@/lib/analytics";
import { completionTimestamp } from "@/lib/mock-entry";

/**
 * Sample data for the public landing page's coded product mockups.
 *
 * Every figure shown on `/` is derived here through the app's own scoring and
 * analytics code (`totals()` and `analyze()`), never typed by hand. That means
 * a mockup cannot display a score, percentage, accuracy, scope projection or
 * answer breakdown that the real tracker could not produce — if the scoring
 * rules ever change, the landing follows automatically.
 *
 * These attempts are illustrative, never imported, and never persisted. Each
 * surface that renders them names them as sample data in its caption.
 */

type SubjectInput = readonly [correct: number, incorrect: number, minutes: number];

type AttemptInput = {
  name: string;
  platform: string;
  /** Attempt date, recorded at IST midnight like the real form does. */
  date: string;
  subjects: Partial<Record<SubjectId, SubjectInput>>;
  /** Reported platform percentile, when the platform published one. */
  percentile?: number;
  rank?: number;
  participants?: number;
};

/** The stored timestamp for an attempt date — the same helper `MockForm` uses. */
const istMidnight = completionTimestamp;

const ROW_COUNTS: Record<SubjectId, number> = {
  quant: SUBJECTS.quant.questions,
  reasoning: SUBJECTS.reasoning.questions,
  english: SUBJECTS.english.questions,
  ga: SUBJECTS.ga.questions,
  computer: SUBJECTS.computer.questions,
};

/**
 * Per-subject minutes that add up to a plausible Tier 2 paper: the four
 * subjects total 114–131 minutes against a 135-minute exam. Accuracy is
 * derived from these counts, never stated.
 */
const FULL_ROWS: readonly AttemptInput[] = [
  {
    name: "RBE Paid Mock 1",
    platform: "RBE",
    date: "2026-09-20",
    subjects: {
      quant: [22, 6, 34],
      reasoning: [20, 7, 31],
      english: [30, 12, 41],
      ga: [14, 8, 18],
    },
  },
  {
    name: "RBE Paid Mock 2",
    platform: "RBE",
    date: "2026-09-27",
    subjects: {
      quant: [23, 6, 33],
      reasoning: [21, 6, 30],
      english: [31, 11, 41],
      ga: [14, 8, 18],
    },
  },
  {
    name: "Testbook Full Mock 1",
    platform: "Testbook",
    date: "2026-10-04",
    subjects: {
      quant: [21, 7, 36],
      reasoning: [19, 8, 32],
      english: [29, 13, 43],
      ga: [13, 9, 20],
    },
  },
  {
    name: "RBE Paid Mock 3",
    platform: "RBE",
    date: "2026-10-11",
    subjects: {
      quant: [24, 5, 33],
      reasoning: [22, 6, 29],
      english: [33, 9, 39],
      ga: [15, 8, 17],
    },
  },
  {
    name: "Oliveboard Full Mock 1",
    platform: "Oliveboard",
    date: "2026-10-18",
    subjects: {
      quant: [25, 4, 32],
      reasoning: [22, 6, 29],
      english: [34, 8, 38],
      ga: [16, 7, 16],
    },
  },
  {
    // The showcase attempt: carries a reported percentile and the optional
    // Computer row (scored separately, so it stays outside the 390 while its
    // twelve minutes sit inside the overall time).
    name: "Testbook Full Mock 2",
    platform: "Testbook",
    date: "2026-10-25",
    percentile: 76.5,
    rank: 2210,
    participants: 9400,
    subjects: {
      quant: [26, 4, 31],
      reasoning: [23, 5, 28],
      english: [35, 8, 37],
      ga: [17, 7, 16],
      computer: [15, 3, 12],
    },
  },
];

const OTHER_ROWS: readonly (AttemptInput & {
  type: "subject" | "sectional";
})[] = [
  {
    name: "RBE Sectional · Section I",
    platform: "RBE",
    date: "2026-10-21",
    type: "sectional",
    subjects: { quant: [24, 5, 26], reasoning: [21, 6, 20] },
  },
  {
    // Only a standalone subject attempt can honestly carry a subject
    // percentile — the landing shows that provenance rather than borrowing a
    // full mock's.
    name: "English Subject Mock 1",
    platform: "Testbook",
    date: "2026-10-23",
    type: "subject",
    percentile: 77.6,
    rank: 1840,
    participants: 8200,
    subjects: { english: [35, 5, 30] },
  },
];

function buildAttempt(
  row: AttemptInput & { type?: "full" | "subject" | "sectional" },
  index: number,
): Attempt {
  const type = row.type ?? "full";
  const subjects = Object.entries(row.subjects).map(
    ([subjectId, [correct, incorrect, minutes]]) => ({
      subjectId: subjectId as SubjectId,
      questions: ROW_COUNTS[subjectId as SubjectId],
      correct,
      incorrect,
      // The samples are CGL Tier 2 rows: Computer Knowledge is qualifying.
      qualifying: subjectId === "computer",
      timeSeconds: Math.round(minutes * 60),
    }),
  );
  const completedAt = istMidnight(row.date);
  return {
    id: `landing-sample-${index + 1}`,
    name: row.name,
    platform: row.platform,
    completedAt,
    type,
    examId: "cgl",
    tierId: "tier2",
    marking: { correct: 3, incorrect: 1 },
    subjects,
    percentile: row.percentile ?? null,
    rank: row.rank ?? null,
    participants: row.participants ?? null,
    notes: "",
    source: "manual",
    schemaVersion: 1,
    createdAt: completedAt,
    updatedAt: completedAt,
  } as Attempt;
}

/** Attempts the mockups render, oldest first. */
export const LANDING_ATTEMPTS: readonly AnalyticsAttempt[] = [
  ...FULL_ROWS.map(buildAttempt),
  ...OTHER_ROWS.map((row, index) => buildAttempt(row, FULL_ROWS.length + index)),
].sort((a, b) => a.completedAt.localeCompare(b.completedAt));

/** The full-mock subset, used by the hero and the dashboard trend. */
export const LANDING_FULL_MOCKS = LANDING_ATTEMPTS.filter(
  (attempt) => attempt.type === "full",
);

/** Latest attempt by attempt date — the one the hero showcases. */
export const LANDING_LATEST =
  LANDING_FULL_MOCKS[LANDING_FULL_MOCKS.length - 1]!;

/** The saved target, in marks out of 390. */
export const LANDING_TARGET = 320;

/**
 * The four analytical scopes, computed with the real projection code so the
 * Scope Diagram's point counts are the app's own counts, not a claim.
 */
export const LANDING_SCOPES: Record<
  DashboardScope,
  { label: string; pointCount: number; summary: string }
> = (() => {
  const scopes: DashboardScope[] = ["full", "subject", "sectional", "all"];
  const labels: Record<DashboardScope, string> = {
    full: "Full mocks",
    subject: "Subject wise",
    sectional: "Sectional wise",
    all: "All mocks",
  };
  const summaries: Record<DashboardScope, string> = {
    full: "one point per saved full mock",
    subject: "one point per subject result",
    sectional: "explicit sectionals plus Section I and II derived from full mocks",
    all: "one point per saved attempt, compared by percentage",
  };
  return Object.fromEntries(
    scopes.map((scope) => [
      scope,
      {
        label: labels[scope],
        pointCount: analyze([...LANDING_ATTEMPTS], scope).pointCount,
        summary: summaries[scope],
      },
    ]),
  ) as Record<DashboardScope, { label: string; pointCount: number; summary: string }>;
})();

/** Headline figures for the hero, the dashboard band and the final CTA. */
export const LANDING_SUMMARY = (() => {
  const full = analyze([...LANDING_ATTEMPTS], "full");
  const latest = totals(LANDING_LATEST);
  const targetPercentage = (LANDING_TARGET / 390) * 100;
  return {
    /** Full-mock trend points, oldest first: percentage per saved mock. */
    trend: full.trend.points.map((point) => ({
      key: point.key,
      date: point.date,
      label: point.name,
      percentage: point.percentage,
    })),
    latestScore: latest.score,
    latestMax: latest.maxScore,
    latestPercentage: latest.percentage,
    latestAccuracy: latest.accuracy,
    latestTimeSeconds: latest.timeSeconds,
    averagePercentage: full.summary.averagePercentage,
    bestPercentage: full.summary.bestPercentage,
    weightedAccuracy: full.summary.weightedAccuracy,
    attemptRate: full.summary.attemptRate,
    correct: full.summary.correct,
    incorrect: full.summary.incorrect,
    unattempted: full.summary.unattempted,
    questions: full.summary.questions,
    mockCount: full.sourceAttemptCount,
    targetMarks: LANDING_TARGET,
    targetPercentage,
    /** Percentage-point gap to target; negative means still short. */
    gapToTarget: latest.percentage - targetPercentage,
    whereYouStand: full.whereYouStand,
    radar: full.radial[0] ?? null,
  };
})();
