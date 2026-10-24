import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, filterAttempts } from "../src/lib/analytics";
import {
  attemptSchema,
  type Attempt,
  type SubjectResult,
} from "../src/lib/domain";

const quant: SubjectResult = {
  subjectId: "quant",
  questions: 30,
  correct: 14,
  incorrect: 6,
  timeSeconds: 1800,
};
const reasoning: SubjectResult = {
  subjectId: "reasoning",
  questions: 30,
  correct: 25,
  incorrect: 5,
  timeSeconds: 1200,
};
const english: SubjectResult = {
  subjectId: "english",
  questions: 45,
  correct: 37,
  incorrect: 8,
  timeSeconds: 2100,
};
const ga: SubjectResult = {
  subjectId: "ga",
  questions: 25,
  correct: 14,
  incorrect: 6,
  timeSeconds: 600,
};
function attempt(
  id: string,
  type: Attempt["type"],
  subjects: SubjectResult[],
  date: string,
): Attempt {
  return {
    id,
    name: `Mock ${id}`,
    platform: "Testbook",
    completedAt: date,
    type,
    subjects,
    notes: "",
    source: "manual",
    schemaVersion: 1,
    createdAt: date,
    updatedAt: date,
  };
}
const full = attempt(
  "full",
  "full",
  [quant, reasoning, english, ga],
  "2026-10-05T00:00:00.000Z",
);
const section1 = attempt(
  "section1",
  "sectional",
  [{ ...quant, correct: 18, incorrect: 4 }, reasoning],
  "2026-10-07T00:00:00.000Z",
);
const subject = attempt(
  "subject",
  "subject",
  [{ ...quant, questions: 15, correct: 12, incorrect: 2 }],
  "2026-10-09T00:00:00.000Z",
);
const section2 = attempt(
  "section2",
  "sectional",
  [english, ga],
  "2026-10-11T00:00:00.000Z",
);
const all = [section2, subject, full, section1];

test("subject trends combine full, sectional and subject mocks while summaries retain mock-type filters", () => {
  const stats = analyze(filterAttempts(all, { type: "full" }), all);
  const q = stats.subjects.find((s) => s.id === "quant")!;
  assert.equal(stats.count, 1);
  assert.equal(stats.averageFullScore, 245);
  assert.equal(q.count, 3);
  assert.deepEqual(
    q.trend.map((p) => p.mockId),
    ["full", "section1", "subject"],
  );
  assert.deepEqual(
    q.trend.map((p) => p.mockType),
    ["full", "sectional", "subject"],
  );
  assert.deepEqual(
    q.trend.map((p) => p.score),
    [36, 50, 34],
  );
  assert.deepEqual(
    q.trend.map((p) => p.maxScore),
    [90, 90, 45],
  );
  assert.equal(q.trend[2].percentage, (34 / 45) * 100);
  assert.equal(
    q.trend[2].rollingAverage,
    (40 + (50 / 90) * 100 + (34 / 45) * 100) / 3,
  );
  assert.equal(q.accuracy, (44 / 56) * 100);
});
test("sectional groups contribute only to their own subjects; missing subjects never add zero points", () => {
  const stats = analyze([], all);
  assert.equal(stats.subjects.find((s) => s.id === "reasoning")?.count, 2);
  assert.equal(stats.subjects.find((s) => s.id === "english")?.count, 2);
  assert.equal(stats.subjects.find((s) => s.id === "ga")?.count, 2);
  assert.equal(stats.subjects.find((s) => s.id === "computer")?.count, 0);
  assert.deepEqual(
    stats.subjects.find((s) => s.id === "english")?.trend.map((p) => p.mockId),
    ["full", "section2"],
  );
  assert.equal(attemptSchema.safeParse(section1).success, true);
  assert.equal(attemptSchema.safeParse(section2).success, true);
});
test("date and platform constraints still scope the cross-type subject series", () => {
  const scoped = filterAttempts(all, {
    from: "2026-10-07",
    to: "2026-10-09",
    platform: "Testbook",
  });
  const stats = analyze(filterAttempts(scoped, { type: "full" }), scoped);
  assert.equal(stats.count, 0);
  assert.deepEqual(
    stats.subjects.find((s) => s.id === "quant")?.trend.map((p) => p.mockId),
    ["section1", "subject"],
  );
  assert.equal(
    analyze([], filterAttempts(all, { platform: "RBE" })).subjects.every(
      (s) => s.count === 0,
    ),
    true,
  );
});
