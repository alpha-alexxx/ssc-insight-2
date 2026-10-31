import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attemptData,
  attemptWhere,
  toAttempt,
} from "../src/lib/attempt-persistence";
import { attemptSchemaFor, totals } from "../src/lib/domain";
import { T2 } from "./fixtures/exam";

const attemptSchema = attemptSchemaFor(T2);

const input = attemptSchema.parse({
  name: "Imported legacy result",
  platform: "Testbook",
  type: "subject",
  examId: "cgl",
  tierId: "tier2",
  marking: { correct: 3, incorrect: 1 },
  completedAt: "2026-10-23T18:30:00.000Z",
  notes: "Keep overrides",
  source: "paste",
  scoreOverride: -0.5,
  overallTimeSeconds: 0,
  rank: 1,
  participants: 100,
  percentile: 99.99,
  subjects: [
    {
      subjectId: "quant",
      questions: 15,
      correct: 0,
      incorrect: 2,
      scoreOverride: -1.25,
      timeSeconds: 0,
    },
  ],
});

test("Prisma mapping round-trips dates, nullable metrics, legacy overrides and subject order", () => {
  const data = attemptData(input);
  assert.equal(data.subjects.create[0].position, 0);
  const row = {
    ...data,
    userId: "test-user",
    id: "0e3ff340-17b2-42b2-b537-d858eb6fa947",
    schemaVersion: 1,
    createdAt: new Date("2026-10-24T00:00:00.123Z"),
    updatedAt: new Date("2026-10-24T01:00:00.456Z"),
    subjects: data.subjects.create.map((subject) => ({
      ...subject,
      attemptId: "0e3ff340-17b2-42b2-b537-d858eb6fa947",
    })),
  };
  const mapped = toAttempt(row);
  assert.deepEqual(attemptSchema.parse(mapped), input);
  assert.equal(mapped.createdAt, "2026-10-24T00:00:00.123Z");
  assert.equal(totals(mapped).score, -0.5);
  assert.equal(totals(mapped).timeSeconds, 0);
  assert.equal(mapped.subjects[0].timeSeconds, 0);
  assert.ok(!("position" in mapped.subjects[0]));
  assert.ok(!("attemptId" in mapped.subjects[0]));
});

test("missing optional values normalize to null without inventing measurements", () => {
  const parsed = attemptSchema.parse({
    ...input,
    type: "subject",
    scoreOverride: undefined,
    overallTimeSeconds: undefined,
    rank: undefined,
    participants: undefined,
    percentile: undefined,
    subjects: [
      {
        subjectId: "computer",
        questions: 20,
        correct: 0,
        incorrect: 0,
        qualifying: true,
      },
    ],
  });
  const data = attemptData(parsed);
  assert.equal(data.scoreOverride, null);
  assert.equal(data.overallTimeSeconds, null);
  assert.equal(data.percentile, null);
  assert.equal(data.subjects.create[0].timeSeconds, null);
  assert.equal(data.subjects.create[0].scoreOverride, null);
});

test("subject array order is persisted independently from subject identifiers", () => {
  const parsed = attemptSchema.parse({
    ...input,
    type: "sectional",
    subjects: [
      { subjectId: "ga", questions: 25, correct: 10, incorrect: 2, qualifying: false },
      { subjectId: "english", questions: 45, correct: 20, incorrect: 4, qualifying: false },
    ],
  });
  assert.deepEqual(
    attemptData(parsed).subjects.create.map(({ subjectId, position }) => ({
      subjectId,
      position,
    })),
    [
      { subjectId: "ga", position: 0 },
      { subjectId: "english", position: 1 },
    ],
  );
});

test("Postgres filters preserve IST inclusive dates, subject relation and literal search", () => {
  const where = attemptWhere({
    type: "sectional",
    subject: "quant",
    platform: "RBE",
    from: "2026-10-24",
    to: "2026-10-24",
    search: "100%_test\\value",
  });
  assert.deepEqual(where, {
    type: "sectional",
    subjects: { some: { subjectId: "quant" } },
    platform: "RBE",
    completedAt: {
      gte: new Date("2026-10-23T18:30:00.000Z"),
      lte: new Date("2026-10-24T18:29:59.999Z"),
    },
    OR: [
      { name: { contains: "100\\%\\_test\\\\value", mode: "insensitive" } },
      { platform: { contains: "100\\%\\_test\\\\value", mode: "insensitive" } },
      { notes: { contains: "100\\%\\_test\\\\value", mode: "insensitive" } },
    ],
  });
  assert.deepEqual(
    attemptWhere({ type: "all", subject: "all", platform: "all" }),
    {},
  );
});

test("search where-clauses sweep notes alongside name and platform", () => {
  const where = attemptWhere({ search: "mock" });
  assert.deepEqual(where.OR, [
    { name: { contains: "mock", mode: "insensitive" } },
    { platform: { contains: "mock", mode: "insensitive" } },
    { notes: { contains: "mock", mode: "insensitive" } },
  ]);
});
