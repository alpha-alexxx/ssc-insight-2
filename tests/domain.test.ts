import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attemptSchema,
  totals,
  subjectStats,
  duplicateKey,
  parseTime,
  type Attempt,
  type AttemptInput,
} from "../src/lib/domain";
import { analyze, filterAttempts } from "../src/lib/analytics";
import { parseReport } from "../src/lib/report-parser";
const input: AttemptInput = {
  name: "Mock 1",
  platform: "Testbook",
  completedAt: "2026-10-24T06:00:00.000Z",
  type: "full",
  notes: "",
  source: "manual",
  subjects: [
    {
      subjectId: "quant",
      questions: 30,
      correct: 14,
      incorrect: 6,
      timeSeconds: 1782,
    },
    {
      subjectId: "reasoning",
      questions: 30,
      correct: 25,
      incorrect: 5,
      timeSeconds: 995,
    },
    {
      subjectId: "english",
      questions: 45,
      correct: 37,
      incorrect: 8,
      timeSeconds: 2112,
    },
    {
      subjectId: "ga",
      questions: 25,
      correct: 14,
      incorrect: 6,
      timeSeconds: 588,
    },
  ],
};
function stored(value = input, id = "1"): Attempt {
  return {
    ...value,
    id,
    createdAt: value.completedAt,
    updatedAt: value.completedAt,
    schemaVersion: 1,
  };
}
test("supplied sample totals and time", () => {
  const t = totals(input);
  assert.equal(t.score, 245);
  assert.equal(t.maxScore, 390);
  assert.equal(t.correct, 90);
  assert.equal(t.incorrect, 25);
  assert.equal(t.unattempted, 15);
  assert.equal(t.accuracy?.toFixed(2), "78.26");
  assert.equal(t.timeSeconds, 5477);
  assert.equal(parseTime("1:31:17"), 5477);
});
test("zero attempts, negative scores, missing times and overrides", () => {
  const s = {
    subjectId: "quant" as const,
    questions: 10,
    correct: 0,
    incorrect: 0,
  };
  assert.equal(subjectStats(s).accuracy, null);
  assert.equal(subjectStats({ ...s, incorrect: 3 }).score, -3);
  assert.equal(subjectStats({ ...s, scoreOverride: 12.5 }).score, 12.5);
  assert.equal(
    totals({ ...input, subjects: [s], type: "subject" }).timeSeconds,
    null,
  );
  assert.equal(
    totals({ ...input, scoreOverride: 250, overallTimeSeconds: 12 }).score,
    250,
  );
});
test("validation rejects invalid totals, rank, full layout and duplicate subjects", () => {
  assert.equal(attemptSchema.safeParse(input).success, true);
  assert.equal(
    attemptSchema.safeParse({ ...input, rank: 100, participants: 50 }).success,
    false,
  );
  assert.equal(
    attemptSchema.safeParse({ ...input, subjects: [input.subjects[0]] })
      .success,
    false,
  );
  assert.equal(
    attemptSchema.safeParse({
      ...input,
      type: "subject",
      subjects: [{ ...input.subjects[0], correct: 40 }],
    }).success,
    false,
  );
  assert.equal(
    attemptSchema.safeParse({
      ...input,
      type: "sectional",
      subjects: [input.subjects[0], input.subjects[2]],
    }).success,
    false,
  );
});
test("computer is excluded from full scoring and weighted accuracy is correct", () => {
  const computer = stored(
    {
      ...input,
      type: "subject",
      subjects: [
        { subjectId: "computer", questions: 20, correct: 20, incorrect: 0 },
      ],
    },
    "2",
  );
  const all = analyze([stored(), computer], "all");
  assert.equal(all.sourceAttemptCount, 2);
  assert.equal(all.pointCount, 2);
  assert.equal(all.trend.points[0].score, 245);
  assert.equal(all.trend.points[0].maxScore, 390);
  assert.equal(
    all.whereYouStand.find((subject) => subject.subjectId === "computer")
      ?.averagePercentage,
    100,
  );
  // The subject result's full 20 questions count in All scope question totals.
  assert.equal(all.summary.weightedAccuracy, (110 / 135) * 100);
});
test("IST date range includes the correct UTC boundaries", () => {
  const a = stored({ ...input, completedAt: "2026-10-23T19:00:00.000Z" });
  assert.equal(
    filterAttempts([a], { from: "2026-10-24", to: "2026-10-24" }).length,
    1,
  );
  assert.equal(filterAttempts([a], { from: "2026-10-25" }).length, 0);
});
test("ordered snapshots and duplicate key", () => {
  const rows = Array.from({ length: 10 }, (_, i) =>
    stored(
      {
        ...input,
        scoreOverride: 200 + i,
        completedAt: new Date(Date.UTC(2026, 9, i + 1)).toISOString(),
      },
      String(i),
    ),
  );
  const a = analyze(rows, "full");
  assert.equal(a.trend.points.length, 10);
  assert.deepEqual(
    a.trend.points.map((point) => point.score),
    Array.from({ length: 10 }, (_, i) => 200 + i),
  );
  assert.equal(a.target.snapshots.length, 10);
  assert.equal(
    a.summary.latestSnapshotPercentage,
    (209 / 390) * 100,
  );
  assert.equal(
    a.summary.previousSnapshotPercentage,
    (208 / 390) * 100,
  );
  assert.equal(
    duplicateKey(input),
    duplicateKey({ ...input, name: " MOCK 1 " }),
  );
});
const block = (
  name: string,
  score: number,
  q: number,
  attempted: number,
  correct: number,
  incorrect: number,
  time: string,
) =>
  `${name}\n${score}.00\n/${q * 3}\n${attempted}\n/${q}\nof total Qs\n${((correct / attempted) * 100).toFixed(2)}%\naccuracy\n${correct}\n/${q}\n${((correct / attempted) * 100).toFixed(2)}% accuracy\n${incorrect}\n/${q}\n${((incorrect / attempted) * 100).toFixed(2)}% of attempted\n${q - attempted}\n/${q}\nskipped\n${time}\nhh:mm:ss\n`;
test("paste parser reads supplied platform layout", () => {
  const report = `Question Stats\nYour Score\n245\n/390\nRank\n436\n/1,267\nPercentile\n65.59%\nCorrect\n90\nIncorrect\n25\nUnattempted\n15\nAccuracy\n78.26\nSectional Summary\n${block("Quantitative Aptitude", 36, 30, 20, 14, 6, "0:29:42")}${block("General Intelligence and Reasoning", 70, 30, 30, 25, 5, "0:16:35")}${block("English Comprehension", 103, 45, 45, 37, 8, "0:35:12")}${block("General Awareness", 36, 25, 20, 14, 6, "0:09:48")}Overall\n245.00\n/390\n1:31:17\nhh:mm:ss`;
  const result = parseReport(report);
  assert.equal(result.values.subjects?.length, 4);
  assert.equal(result.values.scoreOverride, 245);
  assert.equal(result.values.rank, 436);
  assert.equal(result.values.participants, 1267);
  assert.equal(result.values.percentile, 65.59);
  assert.equal(result.values.overallTimeSeconds, 5477);
  assert.equal(totals({ ...input, ...result.values }).correct, 90);
  assert.deepEqual(result.warnings, []);
});
test("unsupported and inconsistent reports require review", () => {
  assert.ok(parseReport("random text").warnings.length);
  const p = parseReport(
    `Your Score\n100\n${block("Quantitative Aptitude", 36, 30, 20, 14, 6, "0:29:42")}`,
  );
  assert.ok(p.warnings.some((w) => w.includes("total differs")));
});
