import type { Analytics, AnswerStack, PerformancePoint } from "./analytics";
import { shortDate } from "./format";

/**
 * The one place performance figures are derived.
 *
 * Both `/dashboard` (its compact preview) and `/performance` read every KPI,
 * distribution bucket, subject ranking and written insight from here. Before
 * this module the dashboard and the score band each recomputed "latest",
 * "average" and "best" from `analytics.trend.points` independently, so the two
 * surfaces could disagree about the same saved mock. They now cannot: the
 * arithmetic exists once.
 *
 * Rules this module keeps:
 *  - Aggregation methods are named, never implied. Averages are a mean of
 *    per-result percentages, which is NOT the same as a weighted marks
 *    aggregate once different papers are mixed.
 *  - Gaps are percentage POINTS (`targetGap`), never percentages.
 *  - Absent data stays `null`; it never becomes zero.
 *  - A finding is emitted only when its evidence guard passes. A single
 *    attempt can never be described as a trend.
 *
 * Client-safe: pure functions over the analytics payload, no database, no
 * `server-only` import, no catalog data.
 */

/** A metric that has both a figure and the sentence explaining it. */
export type MetricValue = {
  value: number | null;
  /** One short line defining the figure ("mean of 6 results"). */
  hint: string;
};

export type LatestResult = {
  percentage: number;
  score: number;
  maxScore: number;
  date: string;
  name: string;
};

export type HeadlineMetrics = {
  /** The most recent result in scope, or null when nothing is scoped. */
  latest: LatestResult | null;
  /** Mean of per-result percentages across the scope. */
  /** Marks figure for a single-paper scope; null when papers are mixed. */
  average: MetricValue & { resultCount: number; marks: number | null };
  /** Highest per-result percentage in scope. */
  best: MetricValue & { date: string | null; marks: number | null };
  /** Pooled correct ÷ attempted, as a percentage. */
  accuracy: MetricValue & { correct: number; attempted: number };
  /** How many distinct saved attempts the scope contains. */
  attemptCount: number;
  /** Latest percentage minus the target percentage, in percentage points. */
  targetGap: MetricValue;
  /** Change between the two most recent dated snapshots, in points. */
  delta: number | null;
};

const formatPoints = (value: number) =>
  Math.abs(value) < 0.05 ? "0" : value.toFixed(1);

/**
 * The headline figures for one analytics payload.
 *
 * `average` is deliberately the mean of per-result percentages. On a scope
 * that mixes maxima (the combined all-tiers view) a marks-weighted average
 * would silently favour the longer paper, so the percentage mean is the
 * honest aggregate — and the hint says so.
 */
export function headlineMetrics(
  analytics: Pick<Analytics, "trend" | "summary" | "target" | "sourceAttemptCount">,
): HeadlineMetrics {
  const points = analytics.trend.points;
  const latestPoint: PerformancePoint | null = points.length
    ? points[points.length - 1]!
    : null;

  const latest: LatestResult | null = latestPoint
    ? {
        percentage: latestPoint.percentage,
        score: latestPoint.score,
        maxScore: latestPoint.maxScore,
        date: latestPoint.date,
        name: latestPoint.name,
      }
    : null;

  const latestSnapshot = analytics.summary.latestSnapshotPercentage;
  const previousSnapshot = analytics.summary.previousSnapshotPercentage;

  const averageValue = analytics.summary.averagePercentage;
  /* A marks average only means anything on a single-paper scope: averaging
   * marks across a 390-mark paper and a 100-mark paper is the exact
   * apples-to-oranges comparison the percentage mean exists to avoid. */
  const singlePaper = points.every(
    (point) => point.maxScore === points[0]!.maxScore,
  );
  const averageMarks =
    singlePaper && points.length
      ? points.reduce((total, point) => total + point.score, 0) / points.length
      : null;
  const average: HeadlineMetrics["average"] = {
    value: averageValue,
    marks: averageMarks,
    resultCount: analytics.sourceAttemptCount,
    hint:
      averageValue == null
        ? "no results in this view"
        : `mean of ${analytics.sourceAttemptCount} ${
            analytics.sourceAttemptCount === 1 ? "result" : "results"
          }`,
  };

  const bestValue = analytics.summary.bestPercentage;
  // The latest result that reached the best score, not the first: "best on
  // 24 Oct" should name the most recent time it was that good.
  const bestPoint =
    bestValue == null
      ? null
      : [...points].reverse().find((point) => point.percentage === bestValue) ??
        null;
  const best: HeadlineMetrics["best"] = {
    value: bestValue,
    marks: singlePaper ? (bestPoint?.score ?? null) : null,
    date: bestPoint?.date ?? null,
    hint: bestPoint ? `on ${shortDate(bestPoint.date)}` : "no results yet",
  };

  const accuracyValue = analytics.summary.weightedAccuracy;
  const attempted = analytics.summary.correct + analytics.summary.incorrect;
  const accuracy: HeadlineMetrics["accuracy"] = {
    value: accuracyValue,
    correct: analytics.summary.correct,
    attempted,
    hint: attempted
      ? `${analytics.summary.correct} of ${attempted} attempted`
      : "no questions recorded",
  };

  const targetPercentage = analytics.target.percentage;
  // An incomparable view (mixed papers) must never be described by one gap.
  const gapApplicable =
    targetPercentage != null &&
    analytics.target.comparable &&
    latestSnapshot != null;
  const targetGap: MetricValue = {
    value: gapApplicable ? latestSnapshot - targetPercentage! : null,
    hint: !gapApplicable
      ? targetPercentage == null
        ? "no target set"
        : "targets vary across these papers"
      : `vs ${formatPoints(targetPercentage!)}% target`,
  };

  const delta =
    latestSnapshot != null && previousSnapshot != null
      ? latestSnapshot - previousSnapshot
      : null;

  return {
    latest,
    average,
    best,
    accuracy,
    attemptCount: analytics.sourceAttemptCount,
    targetGap,
    delta,
  };
}

/* ------------------------------------------------------------------ *
 * Score distribution
 * ------------------------------------------------------------------ */

export type DistributionBucket = {
  /** Lower bound of the bucket, 0, 10, ... 90. */
  from: number;
  /** Upper bound, 10, 20, ... 100. */
  to: number;
  label: string;
  count: number;
  /** Share of the scoped results in this bucket, 0–100. */
  percentage: number;
};

export type Distribution = {
  buckets: DistributionBucket[];
  total: number;
};

/** Below three results a histogram says nothing a single number does not. */
export const DISTRIBUTION_MIN_POINTS = 3;

/**
 * Ten fixed-percentage-point buckets over the scoped results.
 *
 * Buckets are fixed, not data-derived: a distribution whose edges move with
 * the data makes two attempts impossible to compare across filters. A score
 * of exactly 100 lands in the top bucket rather than overflowing.
 */
export function distributionBuckets(points: PerformancePoint[]): Distribution {
  const buckets: DistributionBucket[] = Array.from({ length: 10 }, (_, index) => {
    const from = index * 10;
    return {
      from,
      to: from + 10,
      label: `${from}–${from + 10}%`,
      count: 0,
      percentage: 0,
    };
  });
  for (const point of points) {
    const index = Math.min(
      buckets.length - 1,
      Math.max(0, Math.floor(point.percentage / 10)),
    );
    buckets[index]!.count += 1;
  }
  const total = points.length;
  for (const bucket of buckets) {
    bucket.percentage = total ? (bucket.count / total) * 100 : 0;
  }
  return { buckets, total };
}

/* ------------------------------------------------------------------ *
 * Subject ranking
 * ------------------------------------------------------------------ */

export type SubjectRank = {
  id: string;
  label: string;
  /** Score percentage for this entity across the scope. */
  percentage: number;
  /** Distinct saved attempts behind the figure — not the point count. */
  attemptCount: number;
  /** Difference from the scope's mean score percentage, in points. */
  vsMean: number;
  /** 1 is the strongest populated subject. */
  rank: number;
};

/** One result cannot establish a strength or a weakness. */
export const RANK_MIN_RESULTS = 2;

/**
 * Subjects (or sections) of the CURRENT scope, strongest first.
 *
 * Reads `analytics.radial` rather than `whereYouStand`: the radial stacks are
 * projected from the scoped attempts, while `whereYouStand` is deliberately
 * global and ignores the scope. Ranking the global profile here would tell a
 * student filtered to one week about their whole history.
 *
 * Coverage is counted in distinct attempts, never `stack.count`: a full mock
 * contributes four subject points but is still one attempt, so the point count
 * over-reports the evidence by 4×.
 */
export function subjectRanking(
  stacks: AnswerStack[],
  points: PerformancePoint[] = [],
): SubjectRank[] {
  const populated = stacks.filter((stack) => stack.total > 0);
  if (populated.length === 0) return [];
  const mean =
    populated.reduce((total, stack) => total + stack.scorePercentage, 0) /
    populated.length;
  const attemptsFor = (entityId: string) =>
    new Set(
      points
        .filter((point) => point.entityId === entityId)
        .map((point) => point.sourceAttemptId),
    ).size;
  return [...populated]
    .sort((a, b) => b.scorePercentage - a.scorePercentage)
    .map((stack, index) => ({
      id: stack.id,
      label: stack.label,
      percentage: stack.scorePercentage,
      attemptCount: points.length ? attemptsFor(stack.id) : stack.count,
      vsMean: stack.scorePercentage - mean,
      rank: index + 1,
    }));
}

/* ------------------------------------------------------------------ *
 * Sparkline
 * ------------------------------------------------------------------ */

export type SparklinePoint = { date: string; percentage: number };

/**
 * The tail of the trend, for a compact preview line.
 *
 * Returns the whole series when it is shorter than `limit`, never padded and
 * never interpolated: a two-point sparkline is honest, a smoothed one is not.
 */
export function sparklinePoints(
  points: PerformancePoint[],
  limit = 12,
): SparklinePoint[] {
  return points
    .slice(-limit)
    .map((point) => ({ date: point.date, percentage: point.percentage }));
}

/* ------------------------------------------------------------------ *
 * Findings
 * ------------------------------------------------------------------ */

export type FindingTone = "positive" | "warning" | "neutral";

/**
 * A measured observation, with its numbers still attached.
 *
 * Deliberately NOT a sentence. Wording is editorial and belongs in the
 * component, where DESIGN.md's voice rules govern it; keeping copy out of this
 * layer is also what makes each finding testable — a test can assert the gap
 * is 14.2 points, but asserting a string only proves the string equals itself.
 * `values` are the raw figures the component interpolates, so the rendered
 * sentence can never disagree with the chart beside it.
 */
export type Finding =
  | {
      id: "subject-spread";
      tone: FindingTone;
      kind: "observation";
      strongest: { label: string; percentage: number };
      weakest: { label: string; percentage: number };
      gapPoints: number;
    }
  | {
      id: "accuracy-move";
      tone: FindingTone;
      kind: "observation";
      movePoints: number;
      resultsCompared: number;
    }
  | {
      id: "target-gap";
      tone: FindingTone;
      kind: "observation";
      gapPoints: number;
      targetPercentage: number;
    }
  | {
      id: "unattempted-share";
      tone: FindingTone;
      kind: "observation";
      sharePercentage: number;
      unattempted: number;
      questions: number;
    };

/** A meaningful gap between two subjects; below this, noise. */
const SUBJECT_GAP_POINTS = 5;
/** Accuracy must move this much before it is worth a sentence. */
const ACCURACY_MOVE_POINTS = 2;
/** Snapshots required before "has improved" is a claim we can make. */
const ACCURACY_MIN_SNAPSHOTS = 3;
/** Unattempted share worth calling out. */
const UNATTEMPTED_SHARE = 0.1;

/**
 * Deterministic, evidence-gated findings about the current scope.
 *
 * Every rule returns nothing when its guard fails, so an empty list is a
 * legitimate answer. Nothing here is generated: these are measurements, which
 * is why they can ship without an AI provider and why they never contradict
 * the charts beside them.
 */
export function findings(analytics: Analytics): Finding[] {
  const out: Finding[] = [];
  const { summary, target, trend } = analytics;

  /* ---- subject spread ---- */
  const ranks = subjectRanking(analytics.radial, trend.points).filter(
    (rank) => rank.attemptCount >= RANK_MIN_RESULTS,
  );
  if (ranks.length >= 2) {
    const strongest = ranks[0]!;
    const weakest = ranks[ranks.length - 1]!;
    const gapPoints = strongest.percentage - weakest.percentage;
    if (gapPoints >= SUBJECT_GAP_POINTS) {
      out.push({
        id: "subject-spread",
        tone: "neutral",
        kind: "observation",
        strongest: {
          label: strongest.label,
          percentage: strongest.percentage,
        },
        weakest: { label: weakest.label, percentage: weakest.percentage },
        gapPoints,
      });
    }
  }

  /* ---- accuracy movement ---- */
  const snapshots = trend.points;
  if (snapshots.length >= ACCURACY_MIN_SNAPSHOTS) {
    // Compare the mean accuracy of the first half with the second half: two
    // single results are too noisy to call a direction on their own.
    const half = Math.floor(snapshots.length / 2);
    const meanAccuracy = (rows: PerformancePoint[]) => {
      const values = rows
        .map((row) => row.accuracy)
        .filter((value): value is number => value != null);
      return values.length
        ? values.reduce((total, value) => total + value, 0) / values.length
        : null;
    };
    const earlier = meanAccuracy(snapshots.slice(0, half));
    const later = meanAccuracy(snapshots.slice(-half));
    if (earlier != null && later != null) {
      const movePoints = later - earlier;
      if (Math.abs(movePoints) >= ACCURACY_MOVE_POINTS) {
        out.push({
          id: "accuracy-move",
          tone: movePoints > 0 ? "positive" : "warning",
          kind: "observation",
          movePoints,
          resultsCompared: snapshots.length,
        });
      }
    }
  }

  /* ---- target gap ---- */
  if (
    target.comparable &&
    target.percentage != null &&
    summary.latestSnapshotPercentage != null
  ) {
    const gapPoints = summary.latestSnapshotPercentage - target.percentage;
    if (Math.abs(gapPoints) >= SUBJECT_GAP_POINTS) {
      out.push({
        id: "target-gap",
        tone: gapPoints >= 0 ? "positive" : "warning",
        kind: "observation",
        gapPoints,
        targetPercentage: target.percentage,
      });
    }
  }

  /* ---- unattempted share ---- */
  if (summary.questions > 0) {
    const share = summary.unattempted / summary.questions;
    if (share >= UNATTEMPTED_SHARE) {
      out.push({
        id: "unattempted-share",
        tone: "warning",
        kind: "observation",
        sharePercentage: share * 100,
        unattempted: summary.unattempted,
        questions: summary.questions,
      });
    }
  }

  return out;
}

/** True when a single result is all the scope contains. */
export function isSingleResult(analytics: Pick<Analytics, "pointCount">): boolean {
  return analytics.pointCount === 1;
}
