import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/lib/analytics";
import {
  attemptSchemaFor,
  totals,
  type Attempt,
  type SubjectResult,
} from "../src/lib/domain";
import { MARKING, T2 } from "./fixtures/exam";

/**
 * Merit time and pace.
 *
 * `totals().timeSeconds` deliberately INCLUDES qualifying (Computer Knowledge)
 * time — that time is really spent on the paper — while `questions`, `score`
 * and `attempted` exclude it, because it is not merit. Dividing one by the
 * other inflates pace on exactly the papers that have a qualifying section, so
 * pace reads `meritTimeSeconds` instead. These tests pin both halves.
 */

const attemptSchema = attemptSchemaFor(T2);
void attemptSchema;

const quant: SubjectResult = {
  subjectId: "quant",
  questions: 30,
  correct: 20,
  incorrect: 5,
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
const computer: SubjectResult = {
  subjectId: "computer",
  questions: 20,
  correct: 16,
  incorrect: 4,
  qualifying: true,
  timeSeconds: 900,
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

const meritSubjects = [quant, reasoning, english, ga];
const meritQuestions = 30 + 30 + 45 + 25; // 130
const meritTime = 1800 + 1200 + 2100 + 600; // 5700

test("merit time excludes the qualifying subject that wall-clock time includes", () => {
  const withComputer = attempt(
    "full",
    "full",
    [...meritSubjects, computer],
    "2026-10-01T00:00:00.000Z",
  );
  const t = totals(withComputer);

  assert.equal(t.meritTimeSeconds, meritTime);
  // Wall-clock still counts the Computer sitting, unchanged and intentional.
  assert.equal(t.timeSeconds, meritTime + 900);
  // Questions and score never included it.
  assert.equal(t.questions, meritQuestions);
  assert.equal(t.attempted, 20 + 5 + 25 + 5 + 37 + 8 + 14 + 6);
});

test("merit time is null when a scoring subject has no timing", () => {
  const partial = attempt(
    "partial",
    "full",
    [...meritSubjects.slice(0, 3), { ...ga, timeSeconds: null }],
    "2026-10-01T00:00:00.000Z",
  );
  // Null, not a smaller number: a partially timed paper understates pace.
  assert.equal(totals(partial).meritTimeSeconds, null);
});

test("merit time ignores an un-decomposable whole-sitting override", () => {
  const overridden = attempt(
    "override",
    "full",
    meritSubjects,
    "2026-10-01T00:00:00.000Z",
    { overallTimeSeconds: 1234 },
  );
  const t = totals(overridden);
  assert.equal(t.timeSeconds, 1234);
  // The override describes the whole sitting, not the merit part.
  assert.equal(t.meritTimeSeconds, meritTime);
});

test("pace divides merit time by attempted questions, not by wall-clock", () => {
  const withComputer = attempt(
    "full",
    "full",
    [...meritSubjects, computer],
    "2026-10-01T00:00:00.000Z",
  );
  const analytics = analyze([withComputer], "full");
  const point = analytics.trend.points[0]!;

  const attempted = point.attempted;
  assert.equal(point.paceSeconds, meritTime / attempted);
  // The wrong arithmetic (wall-clock over merit questions) would be larger.
  const wrong = (meritTime + 900) / attempted;
  assert.notEqual(point.paceSeconds, wrong);
  assert.ok(point.paceSeconds! < wrong);
});

test("pace is null, never zero, when timing is unknown", () => {
  const noTimes = attempt(
    "untimed",
    "full",
    meritSubjects.map((subject) => ({ ...subject, timeSeconds: null })),
    "2026-10-01T00:00:00.000Z",
  );
  const analytics = analyze([noTimes], "full");
  assert.equal(analytics.trend.points[0]!.paceSeconds, null);
});

test("pace is null when nothing was attempted", () => {
  const blank = attempt(
    "blank",
    "full",
    meritSubjects.map((subject) => ({ ...subject, correct: 0, incorrect: 0 })),
    "2026-10-01T00:00:00.000Z",
  );
  const analytics = analyze([blank], "full");
  assert.equal(analytics.trend.points[0]!.paceSeconds, null);
});

test("a subject slice's pace is its own time over its own attempts", () => {
  const analytics = analyze([attempt("a", "full", meritSubjects, "2026-10-01T00:00:00.000Z")], "subject");
  const quantPoint = analytics.trend.points.find((point) => point.entityId === "quant")!;
  assert.equal(quantPoint.paceSeconds, 1800 / 25);
});

test("stack coverage counts attempts, not points, and weights the average time", () => {
  const analytics = analyze(
    [
      attempt("a", "full", meritSubjects, "2026-10-01T00:00:00.000Z"),
      attempt("b", "full", meritSubjects, "2026-10-03T00:00:00.000Z"),
    ],
    "subject",
  );
  const quantStack = analytics.radial.find((stack) => stack.id === "quant")!;
  // Two attempt-level points for one subject, from two attempts.
  assert.equal(quantStack.count, 2);
  assert.equal(quantStack.attemptCount, 2);
  assert.equal(quantStack.timedCount, 2);
  assert.equal(quantStack.averageTimeSeconds, 1800 / 25);
});

test("deep-dive trends run oldest to newest like every other series", () => {
  const analytics = analyze(
    [
      attempt("late", "full", meritSubjects, "2026-10-09T00:00:00.000Z"),
      attempt("early", "full", meritSubjects, "2026-10-01T00:00:00.000Z"),
    ],
    "full",
  );
  const quantDive = analytics.deepDive!.find((subject) => subject.id === "quant")!;
  const dates = quantDive.trend.map((row) => row.date);
  assert.deepEqual([...dates].sort(), dates, "deep-dive trend must ascend by date");
  // And it agrees with the main trend's ordering.
  assert.equal(dates[0], analytics.trend.points[0]!.date);
});

test("no target reference means no fabricated 390 maximum", () => {
  const analytics = analyze(
    [attempt("a", "full", meritSubjects, "2026-10-01T00:00:00.000Z")],
    "full",
  );
  // The maximum is the one the data actually has, not the legacy CGL paper.
  assert.equal(analytics.target.maxScore, 390);
  assert.equal(analytics.target.comparable, false);
  assert.equal(analytics.target.percentage, null);

  // A different paper size is reported as itself.
  const small = analyze(
    [
      attempt("b", "subject", [{ ...quant, questions: 10, correct: 6, incorrect: 2 }], "2026-10-01T00:00:00.000Z"),
    ],
    "subject",
  );
  assert.equal(small.target.maxScore, 30);
});

test("an empty scope reports a null maximum rather than a paper size", () => {
  const analytics = analyze([], "full");
  assert.equal(analytics.target.maxScore, null);
  assert.equal(analytics.target.comparable, false);
});
