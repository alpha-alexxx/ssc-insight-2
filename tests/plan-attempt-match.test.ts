import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fillFromAttempt,
  matchAttemptForTask,
  namesMatch,
} from "../src/lib/plan/attempt-match";
import type { Attempt } from "../src/lib/domain";

function attempt(overrides: Partial<Attempt> & { name: string }): Attempt {
  return {
    id: "a1",
    platform: "Test platform",
    type: "sectional",
    examId: "cgl",
    tierId: "tier2",
    marking: { correct: 3, incorrect: 1 },
    subjects: [
      {
        subjectId: "quant",
        questions: 25,
        correct: 18,
        incorrect: 4,
        qualifying: false,
      },
    ],
    completedAt: "2026-11-13T10:30:00+05:30",
    source: "manual",
    schemaVersion: 1,
    createdAt: "2026-11-13T10:35:00+05:30",
    updatedAt: "2026-11-13T10:35:00+05:30",
    ...overrides,
  } as Attempt;
}

const TASK = {
  type: "maths_sectional" as const,
  name: "Maths sectional — Time & Work set 4",
  date: "2026-11-13",
};

test("name matching: exact, punctuation and case insensitive", () => {
  assert.ok(namesMatch("Maths sectional — Time & Work set 4", "maths sectional time work set 4"));
  assert.ok(namesMatch("Live Mock 2", "live mock 2"));
});

test("name matching: containment both ways with a length floor", () => {
  assert.ok(namesMatch("RBE Maths Sectional 12", "Maths Sectional 12"));
  assert.ok(namesMatch("Maths sectional", "RBE full maths sectional practice"));
  // Very short strings never match by containment alone.
  assert.equal(namesMatch("Mock", "Mock test extra"), false);
});

test("name matching: token overlap needs half of the smaller name and 2+ tokens", () => {
  assert.ok(namesMatch("Quant topic test percentages", "percentages practice quant"));
  assert.equal(namesMatch("Algebra", "Algebra basics chapter"), false);
  assert.equal(namesMatch("GK", "GK sectional mix"), false);
});

test("name matching: different work never matches", () => {
  assert.equal(namesMatch("Maths sectional — Time & Work", "Reasoning sectional — puzzles"), false);
});

test("matchAttemptForTask: same date and name matches; other dates do not", () => {
  const same = attempt({ name: "RBE Maths Sectional Time & Work 4" });
  const otherDay = attempt({
    name: TASK.name,
    completedAt: "2026-11-12T10:30:00+05:30",
    id: "a2",
  });
  const matched = matchAttemptForTask(TASK, [same, otherDay]);
  assert.equal(matched?.id, "a1");
  assert.equal(matchAttemptForTask(TASK, [otherDay]), null);
});

test("matchAttemptForTask: ignores non-mock tasks and non-matching names", () => {
  assert.equal(matchAttemptForTask({ ...TASK, type: "maths_topic" }, [attempt({ name: TASK.name })]), null);
  assert.equal(matchAttemptForTask(TASK, [attempt({ name: "English sectional grammar" })]), null);
});

test("matchAttemptForTask: best overlap wins, then most recent", () => {
  const close = attempt({ name: "Maths sectional Time & Work set 4", id: "close" });
  const loose = attempt({ name: "Maths sectional practice mix", id: "loose" });
  assert.equal(matchAttemptForTask(TASK, [loose, close])?.id, "close");
  const equalA = attempt({ name: "Maths sectional attempt A", id: "a", completedAt: "2026-11-13T09:00:00+05:30" });
  const equalB = attempt({ name: "Maths sectional attempt B", id: "b", completedAt: "2026-11-13T11:00:00+05:30" });
  assert.equal(matchAttemptForTask(TASK, [equalA, equalB])?.id, "b");
});

test("fillFromAttempt derives the editor draft from tracker totals", () => {
  // 25 questions, 18 correct, 4 incorrect: score 18*3 - 4 = 50,
  // wrong 4, unattempted 3.
  const draft = fillFromAttempt(
    attempt({ name: "x", percentile: 78.4, scoreOverride: null }),
  );
  assert.equal(draft.score, 50);
  assert.equal(draft.wrong, 4);
  assert.equal(draft.unattempted, 3);
  assert.equal(draft.percentile, 78.4);
  const overridden = fillFromAttempt(
    attempt({ name: "x", scoreOverride: 112 }),
  );
  assert.equal(overridden.score, 112);
});
