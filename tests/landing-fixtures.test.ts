import { test } from "node:test";
import assert from "node:assert/strict";
import { attemptSchemaFor, totals, FULL_MOCK_MAX_SCORE } from "../src/lib/domain";
import { T2 } from "./fixtures/exam";

const attemptSchema = attemptSchemaFor(T2);
import { analyze } from "../src/lib/analytics";
import {
  LANDING_ATTEMPTS,
  LANDING_FULL_MOCKS,
  LANDING_LATEST,
  LANDING_SCOPES,
  LANDING_SUMMARY,
  LANDING_TARGET,
} from "../src/components/landing/fixtures";

/**
 * The landing page's mockups are drawn from sample data. If that data could
 * not have been saved by the real form, the marketing would be showing a
 * product that does not exist — so every fixture is validated against the
 * same schema and scoring code the app uses.
 */

/** Drop the persisted-only fields so the sample matches `AttemptInput`. */
const BOOKKEEPING = ["id", "createdAt", "updatedAt", "schemaVersion"] as const;

function stripBookkeeping(attempt: (typeof LANDING_ATTEMPTS)[number]) {
  const input = { ...attempt } as Record<string, unknown>;
  for (const key of BOOKKEEPING) delete input[key];
  return input;
}

test("every landing fixture passes the write/import schema", () => {
  assert.ok(LANDING_ATTEMPTS.length > 0);
  for (const attempt of LANDING_ATTEMPTS) {
    const parsed = attemptSchema.safeParse(stripBookkeeping(attempt));
    assert.ok(
      parsed.success,
      `${attempt.name} would be rejected by attemptSchema: ${
        parsed.success ? "" : parsed.error.message
      }`,
    );
  }
});

test("fixtures are ordered by attempt date and land on IST midnight", () => {
  const dates = LANDING_ATTEMPTS.map((a) => a.completedAt);
  assert.deepEqual([...dates].sort(), dates);
  for (const attempt of LANDING_ATTEMPTS) {
    // completionTimestamp() stores UTC, so the IST midnight is 18:30Z.
    assert.match(attempt.completedAt, /T18:30:00\.000Z$/);
  }
});

test("full fixtures use the standard 30/30/45/25 layout", () => {
  const standard = [
    ["quant", 30],
    ["reasoning", 30],
    ["english", 45],
    ["ga", 25],
  ];
  for (const attempt of LANDING_FULL_MOCKS) {
    const main = attempt.subjects
      .filter((s) => s.subjectId !== "computer")
      .map((s) => [s.subjectId, s.questions]);
    assert.deepEqual(main, standard);
    // Computer is optional, scored separately, and never affects the 390.
    for (const subject of attempt.subjects) {
      if (subject.subjectId === "computer") assert.equal(subject.questions, 20);
    }
  }
});

test("the optional Computer row stays outside the 390 but inside the time", () => {
  const withComputer = LANDING_FULL_MOCKS.find((attempt) =>
    attempt.subjects.some((s) => s.subjectId === "computer"),
  );
  assert.ok(withComputer, "one sample full mock should include Computer");
  const t = totals(withComputer);
  assert.equal(t.maxScore, 390);
  const computer = withComputer.subjects.find((s) => s.subjectId === "computer")!;
  const withoutComputer = totals({
    ...withComputer,
    subjects: withComputer.subjects.filter((s) => s.subjectId !== "computer"),
  });
  assert.equal(t.score, withoutComputer.score, "Computer marks stay separate");
  assert.ok(
    (t.timeSeconds ?? 0) > (withoutComputer.timeSeconds ?? 0),
    "Computer time still counts toward the overall time",
  );
  assert.ok((computer.timeSeconds ?? 0) > 0);
});

test("derived percentages and counts stay inside their real bounds", () => {
  for (const attempt of LANDING_ATTEMPTS) {
    const t = totals(attempt);
    assert.ok(t.percentage >= -100 && t.percentage <= 100);
    assert.ok(t.accuracy == null || (t.accuracy >= 0 && t.accuracy <= 100));
    assert.equal(t.attempted + t.unattempted, t.questions);
    assert.equal(t.maxScore, t.questions * 3);
  }
  const full = totals(LANDING_LATEST);
  assert.equal(full.maxScore, FULL_MOCK_MAX_SCORE);
  assert.ok(full.score <= full.maxScore);
});

test("all-four scope projection never double-counts a full mock", () => {
  // A full mock contributes exactly one point to All mocks, while the
  // subject and sectional scopes derive many points from the same records.
  assert.equal(LANDING_SCOPES.all.pointCount, LANDING_ATTEMPTS.length);
  assert.equal(LANDING_SCOPES.full.pointCount, LANDING_FULL_MOCKS.length);
  assert.ok(LANDING_SCOPES.subject.pointCount > LANDING_ATTEMPTS.length);
  assert.ok(LANDING_SCOPES.sectional.pointCount > LANDING_ATTEMPTS.length);
  // And the analysis agrees with the numbers the page prints.
  for (const scope of ["full", "subject", "sectional", "all"] as const) {
    assert.equal(
      analyze([...LANDING_ATTEMPTS], scope).pointCount,
      LANDING_SCOPES[scope].pointCount,
    );
  }
  // Sectional points are derived twice per full mock plus each explicit one;
  // subject points are every subject row, including the optional Computer.
  const fullCount = LANDING_FULL_MOCKS.length;
  const explicitSectionals = LANDING_ATTEMPTS.filter(
    (a) => a.type === "sectional",
  ).length;
  assert.equal(
    LANDING_SCOPES.sectional.pointCount,
    fullCount * 2 + explicitSectionals,
  );
  const subjectRows = LANDING_ATTEMPTS.reduce(
    (sum, attempt) => sum + attempt.subjects.length,
    0,
  );
  assert.equal(LANDING_SCOPES.subject.pointCount, subjectRows);
});

test("percentiles are never borrowed across projections", () => {
  // Only the standalone subject attempt and the latest full mock carry a
  // reported percentile. Every other subject ring must fall back to score
  // percentage — a full mock's percentile never leaks into a subject slice.
  const withPercentile = LANDING_ATTEMPTS.filter((a) => a.percentile != null);
  assert.equal(withPercentile.length, 2);
  assert.ok(withPercentile.some((a) => a.type === "full"));
  assert.ok(withPercentile.some((a) => a.type === "subject"));

  const subjectRings = analyze([...LANDING_ATTEMPTS], "subject").radial;
  const english = subjectRings.find((ring) => ring.id === "english");
  const quant = subjectRings.find((ring) => ring.id === "quant");
  assert.equal(english?.centerMetric, "percentile");
  assert.equal(english?.percentile, 77.6);
  assert.equal(quant?.centerMetric, "score");
  assert.equal(quant?.percentile, null);
});

test("full-mock and sectional times are realistic for the paper", () => {
  for (const attempt of LANDING_ATTEMPTS) {
    const t = totals(attempt);
    const minutes = (t.timeSeconds ?? 0) / 60;
    if (attempt.type === "full") {
      assert.ok(minutes > 100 && minutes <= 135, `${attempt.name}: ${minutes}m`);
    } else {
      assert.ok(minutes > 0 && minutes <= 60, `${attempt.name}: ${minutes}m`);
    }
  }
});

test("summary figures match the trend and the target", () => {
  const s = LANDING_SUMMARY;
  assert.equal(s.trend.length, LANDING_FULL_MOCKS.length);
  assert.ok(s.trend.every((p) => p.percentage >= 0 && p.percentage <= 100));
  const latest = s.trend[s.trend.length - 1]!;
  assert.equal(latest.percentage, s.latestPercentage);
  assert.equal(s.latestScore, totals(LANDING_LATEST).score);
  assert.equal(s.targetPercentage, (LANDING_TARGET / FULL_MOCK_MAX_SCORE) * 100);
  assert.equal(s.gapToTarget, s.latestPercentage - s.targetPercentage);
  // The sample student is deliberately short of target: the gap is the story.
  assert.ok(s.gapToTarget < 0);
  // Answer shares sum to 100 (rounding aside) over a non-empty ledger.
  if (s.radar) {
    const shares =
      s.radar.correctPercentage +
      s.radar.incorrectPercentage +
      s.radar.unattemptedPercentage;
    assert.ok(Math.abs(shares - 100) < 0.01);
    assert.equal(
      s.radar.correct + s.radar.incorrect + s.radar.unattempted,
      s.radar.total,
    );
  }
});
