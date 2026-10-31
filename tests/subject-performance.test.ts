import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyze,
  buildWhereYouStand,
  filterAttempts,
  targetMarks,
  targetPercentage,
} from "../src/lib/analytics";
import {
  attemptSchemaFor,
  type Attempt,
  type SubjectResult,
} from "../src/lib/domain";
import { T2, MARKING } from "./fixtures/exam";

const attemptSchema = attemptSchemaFor(T2);

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
const full = attempt(
  "full",
  "full",
  [quant, reasoning, english, ga],
  "2026-10-05T00:00:00.000Z",
  { percentile: 65.59 },
);
const section1 = attempt(
  "section1",
  "sectional",
  [{ ...quant, correct: 18, incorrect: 4 }, reasoning],
  "2026-10-07T00:00:00.000Z",
  { percentile: 72 },
);
const subject = attempt(
  "subject",
  "subject",
  [{ ...quant, questions: 15, correct: 12, incorrect: 2 }],
  "2026-10-09T00:00:00.000Z",
  { percentile: 88 },
);
const section2 = attempt(
  "section2",
  "sectional",
  [english, ga],
  "2026-10-11T00:00:00.000Z",
);
const all = [section2, subject, full, section1];

test("full scope uses only persisted full mocks exactly once", () => {
  const stats = analyze(all, "full");
  assert.equal(stats.sourceAttemptCount, 1);
  assert.deepEqual(stats.sourceAttemptIds, ["full"]);
  assert.equal(stats.pointCount, 1);
  assert.deepEqual(stats.trend.series, [
    { id: "full", label: "Full mocks", pointCount: 1 },
  ]);
  assert.equal(stats.trend.points[0].score, 245);
  assert.equal(stats.trend.points[0].maxScore, 390);
  assert.equal(stats.trend.points[0].percentage, (245 / 390) * 100);
  assert.equal(stats.radial.length, 1);
  const fullStack = stats.radial[0];
  assert.equal(fullStack.correct, 90);
  assert.equal(fullStack.unattempted, 15);
  assert.equal(fullStack.score, 245);
  assert.equal(fullStack.maxScore, 390);
  assert.equal(fullStack.scorePercentage, (245 / 390) * 100);
  assert.equal(fullStack.percentile, 65.59);
  assert.equal(fullStack.percentileCount, 1);
  assert.equal(fullStack.centerMetric, "percentile");
  assert.deepEqual(
    stats.deepDive?.map((subject) => subject.id),
    ["quant", "reasoning", "english", "ga"],
  );
});

test("full scope falls back to score percentage when no percentile was saved", () => {
  const noPercentile = attempt(
    "plain",
    "full",
    [quant, reasoning, english, ga],
    "2026-10-03T00:00:00.000Z",
  );
  const stats = analyze([noPercentile], "full");
  assert.equal(stats.radial[0].percentile, null);
  assert.equal(stats.radial[0].percentileCount, 0);
  assert.equal(stats.radial[0].centerMetric, "score");
  assert.equal(stats.radial[0].scorePercentage, (245 / 390) * 100);
});

test("subject scope combines full, sectional and subject mocks once per subject result", () => {
  const stats = analyze(all, "subject");
  const q = stats.trend.series.find((s) => s.id === "quant")!;
  assert.deepEqual(
    stats.trend.points
      .filter((point) => point.seriesId === "quant")
      .map((point) => [point.sourceAttemptId, point.score, point.maxScore]),
    [
      ["full", 36, 90],
      ["section1", 50, 90],
      ["subject", 34, 45],
    ],
  );
  assert.equal(q.pointCount, 3);
  assert.deepEqual(
    stats.trend.series.map((series) => series.id),
    ["quant", "reasoning", "english", "ga"],
  );
  // 4 children from the full mock + 2 + 1 + 2; each appears exactly once.
  assert.equal(stats.pointCount, 9);
  assert.equal(stats.sourceAttemptCount, 4);
  assert.equal(stats.deepDive, null);
  assert.deepEqual(
    stats.trend.points
      .filter((point) => point.seriesId === "quant")
      .map((point) => point.percentile),
    [null, null, 88],
  );
  const quantRadial = stats.radial.find((row) => row.id === "quant")!;
  assert.equal(quantRadial.count, 3);
  assert.equal(quantRadial.correct, 14 + 18 + 12);
  assert.equal(quantRadial.incorrect, 6 + 4 + 2);
  assert.equal(quantRadial.total, 30 + 30 + 15);
  assert.equal(quantRadial.score, 120);
  assert.equal(quantRadial.maxScore, 225);
  assert.equal(quantRadial.scorePercentage, (120 / 225) * 100);
  assert.equal(quantRadial.percentile, 88);
  assert.equal(quantRadial.percentileCount, 1);
  assert.equal(quantRadial.centerMetric, "percentile");
  const reasoningRadial = stats.radial.find((row) => row.id === "reasoning")!;
  assert.equal(reasoningRadial.percentile, null);
  assert.equal(reasoningRadial.percentileCount, 0);
  assert.equal(reasoningRadial.centerMetric, "score");
  assert.equal(reasoningRadial.scorePercentage, (140 / 180) * 100);
});

test("sectional scope derives two sections from full mocks and never re-derives explicit sectionals", () => {
  const stats = analyze(all, "sectional");
  assert.deepEqual(
    stats.trend.series.map((series) => [series.id, series.pointCount]),
    [
      ["section1", 2],
      ["section2", 2],
    ],
  );
  const section1Points = stats.trend.points.filter(
    (point) => point.seriesId === "section1",
  );
  assert.deepEqual(
    section1Points.map((point) => [point.sourceAttemptId, point.score]),
    [
      ["full", 36 + 70],
      ["section1", 50 + 70],
    ],
  );
  assert.deepEqual(
    section1Points.map((point) => point.origin),
    ["full-derived", "attempt"],
  );
  assert.equal(stats.pointCount, 4);
  assert.equal(stats.sourceAttemptCount, 3);
  const section2Point = stats.trend.points.find(
    (point) => point.seriesId === "section2",
  )!;
  assert.equal(section2Point.score, 103 + 36);
  assert.equal(section2Point.maxScore, 210);
  assert.deepEqual(
    stats.deepDive?.map((subject) => subject.id),
    ["quant", "reasoning", "english", "ga"],
  );
  assert.equal(
    stats.deepDive?.find((subject) => subject.id === "quant")?.count,
    2,
  );
  const section1Stack = stats.radial.find((row) => row.id === "section1")!;
  assert.equal(section1Stack.score, 226);
  assert.equal(section1Stack.maxScore, 360);
  assert.equal(section1Stack.scorePercentage, (226 / 360) * 100);
  assert.equal(section1Stack.percentile, 72);
  assert.equal(section1Stack.percentileCount, 1);
  assert.equal(section1Stack.centerMetric, "percentile");
  const section2Stack = stats.radial.find((row) => row.id === "section2")!;
  assert.equal(section2Stack.percentile, null);
  assert.equal(section2Stack.percentileCount, 0);
  assert.equal(section2Stack.centerMetric, "score");
  assert.equal(section2Stack.scorePercentage, (278 / 420) * 100);
});

test("all scope counts each persisted attempt once and compares by percentage", () => {
  const stats = analyze(all, "all");
  assert.equal(stats.sourceAttemptCount, 4);
  assert.equal(stats.pointCount, 4);
  assert.deepEqual(stats.trend.series, [
    { id: "all", label: "All mocks", pointCount: 4 },
  ]);
  assert.deepEqual(
    stats.trend.points.map((point) => point.sourceAttemptId),
    ["full", "section1", "subject", "section2"],
  );
  assert.deepEqual(
    stats.trend.points.map((point) => point.maxScore),
    [390, 180, 45, 210],
  );
  assert.deepEqual(
    stats.radial.map((row) => row.id),
    ["full", "sectional", "subject"],
  );
  const fullStack = stats.radial.find((row) => row.id === "full")!;
  const sectionalStack = stats.radial.find((row) => row.id === "sectional")!;
  const subjectStack = stats.radial.find((row) => row.id === "subject")!;
  assert.equal(fullStack.percentile, 65.59);
  assert.equal(sectionalStack.percentile, 72);
  assert.equal(subjectStack.percentile, 88);
  assert.deepEqual(
    [fullStack, sectionalStack, subjectStack].map((row) => row.centerMetric),
    ["percentile", "percentile", "percentile"],
  );
  assert.equal(sectionalStack.count, 2);
  assert.equal(sectionalStack.percentileCount, 1);
  assert.equal(stats.deepDive?.length, 4);
});

test("radial percentiles average only genuine saved attempts", () => {
  const fullA = attempt(
    "full-a",
    "full",
    [quant, reasoning, english, ga],
    "2026-10-14T00:00:00.000Z",
    { percentile: 90 },
  );
  const fullB = attempt(
    "full-b",
    "full",
    [quant, reasoning, english, ga],
    "2026-10-15T00:00:00.000Z",
    { percentile: 96 },
  );
  const fullStats = analyze([fullA, fullB], "full");
  assert.equal(fullStats.radial[0].percentile, 93);
  assert.equal(fullStats.radial[0].percentileCount, 2);

  const subjectA = attempt(
    "subject-a",
    "subject",
    [{ subjectId: "quant", questions: 15, correct: 10, incorrect: 2, qualifying: false }],
    "2026-10-16T00:00:00.000Z",
    { percentile: 60 },
  );
  const subjectB = attempt(
    "subject-b",
    "subject",
    [{ subjectId: "quant", questions: 15, correct: 12, incorrect: 1, qualifying: false }],
    "2026-10-17T00:00:00.000Z",
    { percentile: 80 },
  );
  const subjectStats = analyze([subjectA, subjectB, fullA], "subject");
  const quantStack = subjectStats.radial.find((row) => row.id === "quant")!;
  assert.equal(quantStack.percentile, 70);
  assert.equal(quantStack.percentileCount, 2);
  assert.equal(quantStack.centerMetric, "percentile");
  assert.equal(
    subjectStats.radial.find((row) => row.id === "reasoning")?.percentile,
    null,
  );
});

test("where you stand is identical on every tab and only global filters change it", () => {
  const profiles = (["full", "subject", "sectional", "all"] as const).map(
    (scope) => analyze(all, scope).whereYouStand,
  );
  for (const profile of profiles.slice(1))
    assert.deepEqual(profile, profiles[0]);
  assert.deepEqual(
    profiles[0].map((row) => [row.subjectId, row.averagePercentage]),
    [
      ["quant", ((36 / 90) * 100 + (50 / 90) * 100 + (34 / 45) * 100) / 3],
      ["reasoning", ((70 / 90) * 100 + (70 / 90) * 100) / 2],
      ["english", ((103 / 135) * 100 + (103 / 135) * 100) / 2],
      ["ga", ((36 / 75) * 100 + (36 / 75) * 100) / 2],
      ["computer", null],
    ],
  );
  const scoped = filterAttempts(all, {
    from: "2026-10-07",
    to: "2026-10-09",
    platform: "Testbook",
  });
  const filtered = analyze(scoped, "full").whereYouStand;
  assert.equal(
    filtered.find((row) => row.subjectId === "quant")?.resultCount,
    2,
  );
  assert.deepEqual(
    analyze([], "full").whereYouStand,
    buildWhereYouStand([]),
  );
  assert.deepEqual(analyze([], "full").radial, []);
  assert.deepEqual(analyze([], "all").deepDive, []);
  assert.equal(analyze([], "all").summary.averagePercentage, null);
  assert.equal(
    analyze(all, "full").whereYouStand.find(
      (row) => row.subjectId === "computer",
    )?.averagePercentage,
    null,
  );
});

test("full-derived sections ignore parent overrides and copy neither rank nor split time", () => {
  const overridden = attempt(
    "overridden",
    "full",
    [
      { ...quant, scoreOverride: 60, timeSeconds: 1800 },
      { ...reasoning, timeSeconds: null },
      english,
      ga,
    ],
    "2026-10-12T00:00:00.000Z",
    {
      scoreOverride: 300,
      overallTimeSeconds: 5400,
      rank: 12,
      participants: 100,
      percentile: 91,
    },
  );
  const stats = analyze([overridden], "sectional");
  const section1Point = stats.trend.points.find(
    (point) => point.seriesId === "section1",
  )!;
  assert.equal(section1Point.score, 60 + 70);
  assert.equal(section1Point.timeSeconds, null);
  assert.equal(section1Point.rank, null);
  assert.equal(section1Point.percentile, null);
  const section2Point = stats.trend.points.find(
    (point) => point.seriesId === "section2",
  )!;
  assert.equal(section2Point.score, 103 + 36);
  assert.equal(section2Point.timeSeconds, 2100 + 600);
  assert.equal(section2Point.rank, null);
});

test("negative subject scores stay in summaries while radar geometry can clamp", () => {
  const negative = attempt(
    "negative",
    "subject",
    [{ subjectId: "quant", questions: 10, correct: 0, incorrect: 5, qualifying: false }],
    "2026-10-13T00:00:00.000Z",
  );
  const stats = analyze([negative], "subject");
  assert.equal(stats.trend.points[0].score, -5);
  assert.ok(stats.trend.points[0].percentage < 0);
  assert.equal(
    stats.whereYouStand.find((row) => row.subjectId === "quant")
      ?.averagePercentage,
    (-5 / 30) * 100,
  );
  assert.equal(stats.radial[0].correctPercentage, 0);
  assert.equal(stats.radial[0].incorrectPercentage, 50);
  assert.equal(stats.radial[0].unattemptedPercentage, 50);
  assert.equal(stats.radial[0].percentile, null);
  assert.equal(stats.radial[0].centerMetric, "score");
  assert.equal(stats.radial[0].scorePercentage, (-5 / 30) * 100);
});

test("target helpers use one out-of-390 goal for every scope", () => {
  assert.equal(targetPercentage(300, 390), (300 / 390) * 100);
  assert.equal(targetPercentage(null, 390), null);
  assert.equal(targetPercentage(0, 390), 0);
  assert.equal(targetPercentage(390, 390), 100);
  // A different paper size: 300 of 390 placed onto a 180-mark chart.
  assert.equal(targetMarks(300, 390, 180), (300 / 390) * 180);
  assert.equal(targetMarks(null, 390, 180), null);
});

test("target trend averages dated scope snapshots", () => {
  const sameDayA = attempt(
    "a",
    "full",
    [quant, reasoning, english, ga],
    "2026-10-14T04:00:00.000Z",
    { scoreOverride: 200 },
  );
  const sameDayB = attempt(
    "b",
    "full",
    [quant, reasoning, english, ga],
    "2026-10-14T09:00:00.000Z",
    { scoreOverride: 300 },
  );
  const stats = analyze([sameDayA, sameDayB], "full");
  assert.equal(stats.target.snapshots.length, 1);
  const snapshot = stats.target.snapshots[0];
  assert.equal(snapshot.pointCount, 2);
  assert.equal(
    snapshot.percentage,
    ((200 / 390) * 100 + (300 / 390) * 100) / 2,
  );
  assert.equal(stats.summary.latestSnapshotPercentage, snapshot.percentage);
  assert.equal(stats.summary.previousSnapshotPercentage, null);
});

test("trend ordering follows the attempt date, not the recorded timestamp", () => {
  // created later, attempted earlier — bookkeeping order is deliberately the
  // reverse of attempt-date order so a createdAt-based sort would fail here.
  const attemptedEarlier = attempt(
    "earlier",
    "full",
    [quant, reasoning, english, ga],
    "2026-10-02T04:00:00.000Z",
    { scoreOverride: 200, createdAt: "2026-10-20T04:00:00.000Z" },
  );
  const attemptedLater = attempt(
    "later",
    "full",
    [quant, reasoning, english, ga],
    "2026-10-09T04:00:00.000Z",
    { scoreOverride: 300, createdAt: "2026-10-11T04:00:00.000Z" },
  );
  const stats = analyze([attemptedLater, attemptedEarlier], "full");
  assert.deepEqual(
    stats.trend.points.map((point) => point.date),
    [
      attemptedEarlier.completedAt,
      attemptedLater.completedAt,
    ],
  );
  assert.equal(
    stats.target.snapshots.at(-1)?.percentage,
    (300 / 390) * 100,
  );
});

test("sectional groups contribute only to their own subjects; missing subjects never add zero points", () => {
  const stats = analyze(all, "subject");
  const counts = Object.fromEntries(
    stats.trend.series.map((series) => [series.id, series.pointCount]),
  );
  assert.deepEqual(counts, { quant: 3, reasoning: 2, english: 2, ga: 2 });
  assert.equal(
    stats.trend.points.some((point) => point.seriesId === "computer"),
    false,
  );
  assert.equal(attemptSchema.safeParse(section1).success, true);
  assert.equal(attemptSchema.safeParse(section2).success, true);
});
