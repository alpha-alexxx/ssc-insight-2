import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DISTRIBUTION_MIN_POINTS,
  RANK_MIN_RESULTS,
  distributionBuckets,
  findings,
  headlineMetrics,
  isSingleResult,
  sparklinePoints,
  subjectRanking,
} from "../src/lib/performance-metrics";
import { analyze } from "../src/lib/analytics";
import { attemptSchemaFor, type Attempt, type SubjectResult } from "../src/lib/domain";
import { MARKING, T2 } from "./fixtures/exam";

const attemptSchema = attemptSchemaFor(T2);
void attemptSchema;

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
    marking: MARKING,
    subjects,
    notes: "",
    source: "manual",
    schemaVersion: 1,
    createdAt: date,
    updatedAt: date,
    ...extra,
  };
}

test("headline figures come from the payload's own summary, not a re-derivation", () => {
  const rows = [
    attempt("a", "full", [quant, reasoning, english, ga], "2026-10-01T00:00:00.000Z", {
      scoreOverride: 200,
    }),
    attempt("b", "full", [quant, reasoning, english, ga], "2026-10-05T00:00:00.000Z", {
      scoreOverride: 250,
    }),
    attempt("c", "full", [quant, reasoning, english, ga], "2026-10-09T00:00:00.000Z", {
      scoreOverride: 300,
    }),
  ];
  const analytics = analyze(rows, "full");
  const headline = headlineMetrics(analytics);

  assert.equal(headline.attemptCount, 3);
  assert.equal(headline.latest?.score, 300);
  assert.equal(headline.average.value, analytics.summary.averagePercentage);
  assert.equal(headline.best.value, analytics.summary.bestPercentage);
  assert.equal(headline.accuracy.value, analytics.summary.weightedAccuracy);
  // The average is a mean of per-result percentages, and its hint says so.
  assert.match(headline.average.hint, /mean of 3 results/);
  assert.equal(headline.average.resultCount, 3);
});

test("the same payload produces identical figures on both surfaces", () => {
  const rows = [attempt("a", "full", [quant, reasoning, english, ga], "2026-10-01T00:00:00.000Z")];
  const analytics = analyze(rows, "full");
  // Two independent call sites (dashboard preview, performance KPI band) must
  // agree exactly — this is the drift the shared module exists to prevent.
  assert.deepEqual(headlineMetrics(analytics), headlineMetrics(analytics));
});

test("an empty scope reports null figures rather than zeros", () => {
  const analytics = analyze([], "full");
  const headline = headlineMetrics(analytics);
  assert.equal(headline.latest, null);
  assert.equal(headline.average.value, null);
  assert.equal(headline.best.value, null);
  assert.equal(headline.accuracy.value, null);
  assert.equal(headline.attemptCount, 0);
  assert.equal(headline.delta, null);
});

test("a single result never fabricates a delta", () => {
  const analytics = analyze(
    [attempt("a", "full", [quant, reasoning, english, ga], "2026-10-01T00:00:00.000Z")],
    "full",
  );
  assert.equal(headlineMetrics(analytics).delta, null);
  assert.equal(isSingleResult(analytics), true);
});

test("the target gap is percentage points, and null when incomparable", () => {
  const rows = [
    attempt("a", "full", [quant, reasoning, english, ga], "2026-10-01T00:00:00.000Z", {
      scoreOverride: 240,
    }),
  ];
  const comparable = analyze(rows, "full", {
    marks: 300,
    maxScore: 390,
    percentage: (300 / 390) * 100,
    tierLabel: "Tier 2 — Paper I",
    comparable: true,
  });
  const gap = headlineMetrics(comparable).targetGap.value;
  assert.ok(gap != null);
  // Percentage POINTS: latest% minus target%, not a ratio.
  assert.equal(
    gap,
    comparable.summary.latestSnapshotPercentage! - (300 / 390) * 100,
  );

  const incomparable = analyze(rows, "all", {
    marks: 300,
    maxScore: 390,
    percentage: (300 / 390) * 100,
    tierLabel: null,
    comparable: false,
  });
  const incomparableHeadline = headlineMetrics(incomparable);
  assert.equal(incomparableHeadline.targetGap.value, null);
  assert.match(incomparableHeadline.targetGap.hint, /vary across these papers/);
});

test("distribution buckets are fixed, complete and sum to the point count", () => {
  const rows = [
    attempt("a", "full", [quant, reasoning, english, ga], "2026-10-01T00:00:00.000Z", {
      scoreOverride: 39,
    }),
    attempt("b", "full", [quant, reasoning, english, ga], "2026-10-02T00:00:00.000Z", {
      scoreOverride: 195,
    }),
    attempt("c", "full", [quant, reasoning, english, ga], "2026-10-03T00:00:00.000Z", {
      scoreOverride: 390,
    }),
  ];
  const analytics = analyze(rows, "full");
  const distribution = distributionBuckets(analytics.trend.points);

  assert.equal(distribution.buckets.length, 10);
  assert.deepEqual(
    distribution.buckets.map((bucket) => bucket.from),
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90],
  );
  assert.equal(
    distribution.buckets.reduce((total, bucket) => total + bucket.count, 0),
    distribution.total,
  );
  assert.equal(distribution.total, analytics.trend.points.length);
  // 100% lands in the top bucket instead of overflowing past it.
  assert.equal(distribution.buckets[9]!.count, 1);
});

test("distribution is honest about needing several results", () => {
  assert.equal(DISTRIBUTION_MIN_POINTS, 3);
  const rows = [
    attempt("a", "full", [quant, reasoning, english, ga], "2026-10-01T00:00:00.000Z"),
  ];
  const analytics = analyze(rows, "full");
  assert.ok(analytics.trend.points.length < DISTRIBUTION_MIN_POINTS);
});

test("subject ranking reads the scoped stacks, strongest first", () => {
  const rows = [
    attempt("a", "full", [quant, reasoning, english, ga], "2026-10-01T00:00:00.000Z"),
  ];
  const analytics = analyze(rows, "subject");
  const ranking = subjectRanking(analytics.radial, analytics.trend.points);

  assert.ok(ranking.length >= 2);
  for (let index = 1; index < ranking.length; index += 1) {
    assert.ok(ranking[index - 1]!.percentage >= ranking[index]!.percentage);
    assert.equal(ranking[index]!.rank, index + 1);
  }
  // Reasoning (25/30) outranks Quant (14/30) in the fixture.
  assert.equal(ranking[0]!.label, "Reasoning");
  // Coverage is distinct ATTEMPTS, not points: one full mock contributes
  // four subject points but is still one attempt.
  assert.ok(ranking.every((rank) => rank.attemptCount === 1));
  assert.equal(RANK_MIN_RESULTS, 2);
});

test("subject ranking is empty when the scope has nothing", () => {
  assert.deepEqual(subjectRanking([]), []);
});

test("sparkline returns the tail without padding or interpolation", () => {
  const rows = Array.from({ length: 15 }, (_, index) =>
    attempt("a" + index, "full", [quant, reasoning, english, ga], `2026-10-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
  );
  const analytics = analyze(rows, "full");
  const spark = sparklinePoints(analytics.trend.points);
  assert.equal(spark.length, 12);
  assert.equal(spark.at(-1)!.date, analytics.trend.points.at(-1)!.date);

  const short = sparklinePoints(analytics.trend.points.slice(0, 3));
  assert.equal(short.length, 3);
  assert.equal(sparklinePoints([]).length, 0);
});

test("findings stay silent without evidence, and carry their numbers with it", () => {
  // One attempt, no target, nothing unattempted to complain about.
  const thin = analyze(
    [attempt("a", "full", [quant, reasoning, english, ga], "2026-10-01T00:00:00.000Z")],
    "full",
  );
  const thinIds = findings(thin).map((finding) => finding.id);
  assert.equal(thinIds.includes("accuracy-move"), false);
  assert.equal(thinIds.includes("target-gap"), false);
  assert.equal(thinIds.includes("subject-spread"), false);

  // Three attempts spread out, with a target and a clear subject spread.
  const rows = [
    attempt("a", "full", [quant, reasoning, english, ga], "2026-10-01T00:00:00.000Z", {
      scoreOverride: 200,
    }),
    attempt("b", "full", [quant, reasoning, english, ga], "2026-10-03T00:00:00.000Z", {
      scoreOverride: 240,
    }),
    attempt("c", "full", [quant, reasoning, english, ga], "2026-10-05T00:00:00.000Z", {
      scoreOverride: 280,
    }),
  ];
  const rich = analyze(rows, "full", {
    marks: 350,
    maxScore: 390,
    percentage: (350 / 390) * 100,
    tierLabel: "Tier 2 — Paper I",
    comparable: true,
  });
  const targetFinding = findings(rich).find(
    (finding) => finding.id === "target-gap",
  );
  assert.ok(targetFinding);
  if (targetFinding?.id === "target-gap") {
    // The figure is a percentage POINT gap, not a ratio, and the target rides
    // along so a rendered sentence can never disagree with the chart.
    assert.equal(
      targetFinding.gapPoints,
      rich.summary.latestSnapshotPercentage! - (350 / 390) * 100,
    );
    assert.equal(targetFinding.targetPercentage, (350 / 390) * 100);
  }
});

test("findings never describe an incomparable view with one gap", () => {
  const rows = [attempt("a", "full", [quant, reasoning, english, ga], "2026-10-01T00:00:00.000Z")];
  const analytics = analyze(rows, "all", {
    marks: 300,
    maxScore: 390,
    percentage: (300 / 390) * 100,
    tierLabel: null,
    comparable: false,
  });
  assert.equal(
    findings(analytics).some((finding) => finding.id === "target-gap"),
    false,
  );
});
