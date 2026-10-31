import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adjacentEntryDate,
  buildCalendarIndex,
  CALENDAR_LAYERS,
  countEntries,
  countOn,
  datesBetween,
  DEFAULT_LAYERS,
  entriesFor,
  layersToMask,
  maskToLayers,
  outOfPlan,
  sortLayers,
} from "../src/lib/plan/calendar-entries";
import type { Attempt } from "../src/lib/domain";
import type {
  PersonalTaskView,
  PlanDayView,
  PlanTaskView,
} from "../src/lib/plan/view-model";

const TODAY = "2026-11-04";

function planTask(
  overrides: Partial<PlanTaskView> & { key: string; date: string },
): PlanTaskView {
  return {
    day: 1,
    type: "maths_sectional",
    name: overrides.key,
    questions: 30,
    marks: 90,
    url: "",
    linkLabel: "Open",
    completed: false,
    score: null,
    percentile: null,
    wrong: null,
    unattempted: null,
    rev1: false,
    rev2: false,
    rev3: false,
    notes: "",
    ...overrides,
  };
}

function planDay(
  overrides: Partial<PlanDayView> & { day: number; date: string; tasks: PlanTaskView[] },
): PlanDayView {
  return {
    weekday: "Wednesday",
    phase: 1,
    dayType: "PAID MOCK DAY",
    revisionTasks: [],
    revisionDone: [],
    checklist: [],
    notes: "",
    dayCompleted: false,
    ...overrides,
  };
}

function personal(
  overrides: Partial<PersonalTaskView> & { id: string },
): PersonalTaskView {
  return {
    title: overrides.id,
    notes: "",
    dueDate: null,
    url: "",
    category: "practice",
    priority: "normal",
    status: "todo",
    createdAt: "2026-11-01T10:00:00.000Z",
    ...overrides,
  };
}

function attempt(
  overrides: Partial<Attempt> & { id: string; completedAt: string },
): Attempt {
  return {
    name: "Mock",
    platform: "RBE",
    type: "full",
    examId: "cgl",
    tierId: "tier2",
    marking: { correct: 3, incorrect: 1 },
    subjects: [
      {
        subjectId: "quant",
        questions: 30,
        correct: 20,
        incorrect: 5,
        marking: { correct: 3, incorrect: 1 },
      },
    ],
    notes: "",
    source: "manual",
    schemaVersion: 1,
    createdAt: overrides.completedAt,
    updatedAt: overrides.completedAt,
    ...overrides,
  } as Attempt;
}

function build(overrides: {
  days?: PlanDayView[];
  personalTasks?: PersonalTaskView[];
  attempts?: Attempt[];
}) {
  return buildCalendarIndex({
    days: overrides.days ?? [],
    personalTasks: overrides.personalTasks ?? [],
    attempts: overrides.attempts ?? [],
    todayIso: TODAY,
  });
}

test("one entry per plan task, revision, todo and attempt — nothing double-counted", () => {
  const index = build({
    days: [
      planDay({
        day: 10,
        date: "2026-11-04",
        tasks: [
          planTask({ key: "d10:0", date: "2026-11-04" }),
          planTask({ key: "d10:1", date: "2026-11-04", completed: true }),
        ],
        revisionTasks: ["Rev-1: redo wrong questions"],
      }),
    ],
    personalTasks: [personal({ id: "t1", dueDate: "2026-11-04" })],
    attempts: [
      attempt({ id: "a1", completedAt: "2026-11-04T08:30:00+05:30" }),
    ],
  });

  const entries = entriesFor(index, "2026-11-04", DEFAULT_LAYERS);
  assert.equal(entries.length, 5);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, 5);
  assert.equal(index.totals.plan.total, 2);
  assert.equal(index.totals.plan.done, 1);
  assert.equal(index.totals.rev.total, 1);
  assert.equal(index.totals.tasks.total, 1);
  assert.equal(index.totals.mocks, 1);
});

test("an attempt is bucketed by its IST date, not by its UTC date", () => {
  // 2026-11-03T20:00Z is 01:30 IST on 4 November.
  const index = build({
    attempts: [attempt({ id: "a1", completedAt: "2026-11-03T20:00:00Z" })],
  });
  assert.deepEqual([...index.dates], ["2026-11-04"]);
});

test("attempts with an unreadable completedAt are dropped and counted", () => {
  const index = build({
    attempts: [attempt({ id: "bad", completedAt: "not-a-date" })],
  });
  assert.equal(index.dates.length, 0);
  assert.equal(index.invalidAttempts, 1);
  assert.equal(index.totals.mocks, 0);
});

test("undated personal tasks are excluded from the calendar and counted once", () => {
  const index = build({
    personalTasks: [
      personal({ id: "dated", dueDate: "2026-11-04" }),
      personal({ id: "undated" }),
      personal({ id: "undated-2" }),
    ],
  });
  assert.equal(index.totals.tasks.total, 1);
  assert.equal(index.unmatchedTodos, 2);
  assert.equal(index.byDate.has(""), false);
});

test("personal status is derived: past dates are overdue, completed never is", () => {
  const index = build({
    personalTasks: [
      personal({ id: "late", dueDate: "2026-11-01" }),
      personal({ id: "finished", dueDate: "2026-11-01", status: "completed" }),
      personal({ id: "today", dueDate: TODAY }),
    ],
  });
  const statuses = Object.fromEntries(
    entriesFor(index, "2026-11-01", DEFAULT_LAYERS).map((entry) => [
      entry.id,
      entry.kind === "personal" ? entry.status : "?",
    ]),
  );
  assert.equal(statuses["todo:late"], "overdue");
  assert.equal(statuses["todo:finished"], "completed");
  assert.equal(index.totals.tasks.overdue, 1);
  assert.equal(
    entriesFor(index, TODAY, DEFAULT_LAYERS)[0]?.kind === "personal",
    true,
  );
});

test("in-day order is scheduled, then revision, then owed, then evidence", () => {
  const index = build({
    days: [
      planDay({
        day: 10,
        date: "2026-11-04",
        tasks: [
          planTask({ key: "second", date: "2026-11-04" }),
          planTask({ key: "first", date: "2026-11-04" }),
        ],
        revisionTasks: ["Rev-1"],
      }),
    ],
    personalTasks: [
      personal({ id: "done", dueDate: "2026-11-04", status: "completed" }),
      personal({ id: "low", dueDate: "2026-11-04", priority: "low" }),
      personal({ id: "high", dueDate: "2026-11-04", priority: "high" }),
    ],
    attempts: [attempt({ id: "a1", completedAt: "2026-11-04T09:00:00+05:30" })],
  });
  const ids = entriesFor(index, "2026-11-04", DEFAULT_LAYERS).map(
    (entry) => entry.id,
  );
  assert.deepEqual(ids, [
    "plan:second", // plan array order is the plan's own sequence
    "plan:first",
    "rev:2026-11-04:0",
    "todo:high",
    "todo:low",
    "todo:done", // completed sinks
    "attempt:a1",
  ]);
});

test("revision completion comes from the day's own revisionDone", () => {
  const index = build({
    days: [
      planDay({
        day: 46,
        date: "2026-12-10",
        phase: 3,
        tasks: [],
        revisionTasks: ["Rev-3 block: Days 1-9", "Rev-3 block: Days 10-18"],
        revisionDone: ["1"],
      }),
    ],
  });
  const revisions = entriesFor(index, "2026-12-10", DEFAULT_LAYERS);
  assert.equal(revisions.length, 2);
  assert.equal(
    revisions[0]?.kind === "revision" ? revisions[0].done : null,
    false,
  );
  assert.equal(
    revisions[1]?.kind === "revision" ? revisions[1].done : null,
    true,
  );
  assert.deepEqual(index.totals.rev, { total: 2, done: 1 });
});

test("layer filtering keeps the index identity and drops only hidden layers", () => {
  const index = build({
    days: [
      planDay({
        day: 10,
        date: "2026-11-04",
        tasks: [planTask({ key: "d10:0", date: "2026-11-04" })],
      }),
    ],
    personalTasks: [personal({ id: "t1", dueDate: "2026-11-04" })],
    attempts: [attempt({ id: "a1", completedAt: "2026-11-04T09:00:00+05:30" })],
  });

  assert.equal(entriesFor(index, "2026-11-04", ["plan"]).length, 1);
  assert.equal(entriesFor(index, "2026-11-04", ["tasks", "mocks"]).length, 2);
  assert.equal(entriesFor(index, "2026-11-04", DEFAULT_LAYERS).length, 3);
  // The unfiltered index is untouched by a filtered read.
  assert.equal(index.byDate.get("2026-11-04")?.length, 3);
});

test("layer masks round-trip in canonical order", () => {
  assert.equal(layersToMask(["mocks", "plan"]), "101");
  assert.deepEqual(maskToLayers(layersToMask(["mocks", "plan"])), [
    "plan",
    "mocks",
  ]);
  assert.equal(layersToMask(DEFAULT_LAYERS), "111");
  assert.deepEqual(sortLayers(["mocks", "tasks", "plan"]), [
    "plan",
    "tasks",
    "mocks",
  ]);
  assert.deepEqual(maskToLayers("111"), [...CALENDAR_LAYERS]);
});

test("counts distinguish plan work from revision work and from personal work", () => {
  const entries = entriesFor(
    build({
      days: [
        planDay({
          day: 10,
          date: "2026-11-04",
          tasks: [
            planTask({ key: "a", date: "2026-11-04", completed: true }),
            planTask({ key: "b", date: "2026-11-04" }),
          ],
          revisionTasks: ["Rev-1"],
        }),
      ],
      personalTasks: [personal({ id: "t1", dueDate: "2026-11-04" })],
    }),
    "2026-11-04",
    DEFAULT_LAYERS,
  );
  assert.deepEqual(countEntries(entries), {
    plan: { total: 2, done: 1 },
    rev: { total: 1, done: 0 },
    tasks: { total: 1, done: 0, overdue: 0 },
    mocks: 0,
  });
});

test("datesBetween returns only entry-bearing dates inside the range", () => {
  const index = build({
    personalTasks: [
      personal({ id: "a", dueDate: "2026-11-01" }),
      personal({ id: "b", dueDate: "2026-11-05" }),
      personal({ id: "c", dueDate: "2026-11-20" }),
    ],
  });
  assert.deepEqual(datesBetween(index, "2026-11-01", "2026-11-10", DEFAULT_LAYERS), [
    "2026-11-01",
    "2026-11-05",
  ]);
});

test("adjacentEntryDate walks across long gaps and respects layers", () => {
  const index = build({
    personalTasks: [personal({ id: "a", dueDate: "2026-11-04" })],
    days: [
      planDay({
        day: 40,
        date: "2027-01-15",
        tasks: [planTask({ key: "far", date: "2027-01-15" })],
      }),
    ],
  });
  assert.equal(adjacentEntryDate(index, TODAY, 1), "2027-01-15");
  assert.equal(adjacentEntryDate(index, TODAY, 1, ["tasks"]), null);
  assert.equal(adjacentEntryDate(index, "2027-02-01", -1), "2027-01-15");
  assert.equal(adjacentEntryDate(index, "2026-01-01", -1), null);
});

test("an empty calendar is a valid index, not a crash", () => {
  const index = build({});
  assert.equal(index.dates.length, 0);
  assert.equal(index.range, null);
  assert.deepEqual(
    countEntries([]),
    {
      plan: { total: 0, done: 0 },
      rev: { total: 0, done: 0 },
      tasks: { total: 0, done: 0, overdue: 0 },
      mocks: 0,
    },
  );
  assert.deepEqual(entriesFor(index, TODAY, DEFAULT_LAYERS), []);
  assert.equal(adjacentEntryDate(index, TODAY, 1), null);
});

test("countOn follows the same layers as the surface", () => {
  const index = build({
    days: [
      planDay({
        day: 10,
        date: "2026-11-04",
        tasks: [planTask({ key: "d10:0", date: "2026-11-04" })],
      }),
    ],
    personalTasks: [personal({ id: "t1", dueDate: "2026-11-04" })],
  });
  assert.equal(countOn(index, "2026-11-04", ["tasks"]).tasks.total, 1);
  assert.equal(countOn(index, "2026-11-04", ["tasks"]).plan.total, 0);
  assert.equal(countOn(index, "2026-11-04", DEFAULT_LAYERS).plan.total, 1);
});

test("attempts are matched to a plan task only within their own date", () => {
  const index = build({
    days: [
      planDay({
        day: 10,
        date: "2026-11-04",
        tasks: [
          planTask({
            key: "d10:0",
            date: "2026-11-04",
            type: "live_mock",
            name: "CGL Live Mock 3",
          }),
        ],
      }),
    ],
    attempts: [
      attempt({
        id: "a1",
        name: "CGL Live Mock 3",
        completedAt: "2026-11-04T09:00:00+05:30",
      }),
    ],
  });
  const found = entriesFor(index, "2026-11-04", DEFAULT_LAYERS).find(
    (entry) => entry.kind === "attempt",
  );
  assert.equal(
    found?.kind === "attempt" ? found.matchedPlanTaskKey : null,
    "d10:0",
  );
});

test("outOfPlan is inclusive at both edges", () => {
  assert.equal(outOfPlan("2026-10-25", "2026-10-26", "2026-12-14"), true);
  assert.equal(outOfPlan("2026-10-26", "2026-10-26", "2026-12-14"), false);
  assert.equal(outOfPlan("2026-12-14", "2026-10-26", "2026-12-14"), false);
  assert.equal(outOfPlan("2026-12-15", "2026-10-26", "2026-12-14"), true);
});

test("score percentage is clamped and rounded from totals()", () => {
  const index = build({
    attempts: [
      attempt({
        id: "a1",
        completedAt: "2026-11-04T09:00:00+05:30",
        scoreOverride: 3 * 30, // full marks on 30 questions
      }),
      attempt({
        id: "a2",
        completedAt: "2026-11-05T09:00:00+05:30",
        scoreOverride: -1000, // pathological override below the floor
      }),
    ],
  });
  const pcts = [...index.byDate.values()]
    .flat()
    .filter((entry) => entry.kind === "attempt")
    .map((entry) => (entry.kind === "attempt" ? entry.scorePct : null));
  assert.deepEqual(pcts, [100, 0]);
});
