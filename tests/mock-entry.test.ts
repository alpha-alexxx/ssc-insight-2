import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculatedEntry,
  completionDate,
  completionTimestamp,
  durationSeconds,
  MOCK_PLATFORMS,
  platformSelection,
} from "../src/lib/mock-entry";
import {
  attemptSchema,
  totals,
  type Attempt,
  type AttemptInput,
} from "../src/lib/domain";
import { analyze } from "../src/lib/analytics";
import { parseReport } from "../src/lib/report-parser";

const input: AttemptInput = {
  name: "Practice",
  platform: "Testbook",
  completedAt: "2026-10-24T00:00:00.000Z",
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
const computer = {
  subjectId: "computer" as const,
  questions: 20,
  correct: 15,
  incorrect: 3,
  timeSeconds: 600,
};

test("date-only entry is stored and displayed consistently in IST", () => {
  assert.equal(completionTimestamp("2026-10-24"), "2026-10-23T18:30:00.000Z");
  assert.equal(completionDate(completionTimestamp("2026-10-24")), "2026-10-24");
  assert.equal(completionDate("2026-10-23T19:00:00.000Z"), "2026-10-24");
  assert.equal(completionDate(completionTimestamp("2024-02-29")), "2024-02-29");
});
test("platform presets normalize case and preserve the custom-platform choice", () => {
  assert.deepEqual(MOCK_PLATFORMS, [
    "Testbook",
    "RBE",
    "Oliveboard",
    "Pundits",
    "Test Ranking",
  ]);
  assert.equal(platformSelection("testbook"), "Testbook");
  assert.equal(platformSelection("RBE"), "RBE");
  assert.equal(platformSelection("My coaching"), "other");
  assert.equal(platformSelection(""), "");
});
test("duration blocks treat omitted hours, minutes or seconds as zero", () => {
  assert.equal(durationSeconds(["", "29", "42"]), 1782);
  assert.equal(durationSeconds(["1", "", "17"]), 3617);
  assert.equal(durationSeconds(["", "", ""]), 0);
});
test("form scores and time derive live from counts, ignoring stale overrides", () => {
  const calculated = calculatedEntry({
    ...input,
    scoreOverride: 300,
    overallTimeSeconds: 999,
    subjects: input.subjects.map((s) => ({ ...s, scoreOverride: 90 })),
  });
  assert.equal(totals(calculated).score, 245);
  assert.equal(calculated.overallTimeSeconds, 5477);
  assert.equal(calculated.scoreOverride, null);
  const changed = calculatedEntry({
    ...calculated,
    subjects: calculated.subjects.map((s, i) =>
      i === 0 ? { ...s, correct: s.correct + 1 } : s,
    ),
  });
  assert.equal(totals(changed).score, 248);
  const empty = calculatedEntry({
    ...input,
    subjects: input.subjects.map((s) => ({ ...s, timeSeconds: null })),
  });
  assert.equal(empty.overallTimeSeconds, 0);
});
test("full mocks accept optional computer without changing the main score", () => {
  const full = calculatedEntry({
    ...input,
    subjects: [...input.subjects, computer],
  });
  assert.equal(attemptSchema.safeParse(full).success, true);
  assert.equal(totals(full).score, 245);
  assert.equal(totals(full).maxScore, 390);
  assert.equal(totals(full).questions, 130);
  assert.equal(totals(full).timeSeconds, 6077);
  assert.equal(
    attemptSchema.safeParse({ ...full, scoreOverride: 450 }).success,
    false,
  );
});
test("computer remains separate in full averages and does not split comparable full-mock series", () => {
  const rows: Attempt[] = Array.from({ length: 10 }, (_, i) => ({
    ...calculatedEntry({
      ...input,
      subjects: i % 2 ? [...input.subjects, computer] : input.subjects,
    }),
    id: String(i),
    schemaVersion: 1,
    createdAt: input.completedAt,
    updatedAt: input.completedAt,
  }));
  const stats = analyze(rows, "full");
  assert.equal(stats.trend.points.length, 10);
  assert.ok(stats.trend.points.every((point) => point.score === 245));
  assert.equal(stats.trend.series.length, 1);
  assert.equal(
    stats.whereYouStand.find((subject) => subject.subjectId === "computer")
      ?.averagePercentage,
    70,
  );
  assert.equal(stats.summary.weightedAccuracy, (90 / 115) * 100);
});
test("paste reports with all main subjects and Computer remain full mocks", () => {
  const names = [
    "Quantitative Aptitude",
    "General Intelligence and Reasoning",
    "English Comprehension",
    "General Awareness",
    "Computer Knowledge",
  ];
  const report = [...input.subjects, computer]
    .map(
      (s, i) =>
        `${names[i]}\n${s.correct * 3 - s.incorrect}\n/${s.questions * 3}\nCorrect\n${s.correct}\nIncorrect\n${s.incorrect}\n0:10:00`,
    )
    .join("\n");
  const parsed = parseReport(`Your Score\n245\n/390\n${report}`);
  assert.equal(parsed.values.type, "full");
  assert.equal(parsed.values.subjects?.length, 5);
  assert.deepEqual(parsed.warnings, []);
});
