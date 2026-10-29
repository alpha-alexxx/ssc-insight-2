import assert from "node:assert/strict";
import { test } from "node:test";
import {
  studyPlanSchema,
  planTaskKey,
  parsePlanTaskKey,
} from "../src/lib/plan/schema";
import {
  addIsoDays,
  dayAssignmentStats,
  monthGridDays,
  nextMockDay,
  nextRecommendedAction,
  planProgressStats,
  revisionQueue,
  weekRange,
  type PlanDayView,
  type PlanTaskView,
} from "../src/lib/plan/view-model";
import planJson from "../src/data/study-plan.json";

/* ---------- source data integrity (the plan is never rewritten) ---------- */

const plan = studyPlanSchema.parse(planJson);
const days = plan.daily_targets;

test("plan schema: 50 contiguous days from 2026-10-26 to 2026-12-14", () => {
  assert.equal(days.length, 50);
  assert.equal(plan.start_date, "2026-10-26");
  assert.equal(plan.end_date, "2026-12-14");
  for (let i = 0; i < days.length; i++) {
    assert.equal(days[i]!.day, i + 1, `day numbering breaks at index ${i}`);
    assert.equal(days[i]!.date, addIsoDays(plan.start_date, i));
    if (i > 0)
      assert.equal(days[i]!.date, addIsoDays(days[i - 1]!.date, 1));
  }
});

test("plan schema: every weekday matches its date", () => {
  for (const day of days) {
    const expected = new Date(`${day.date}T12:00:00Z`).toLocaleDateString(
      "en-US",
      { weekday: "long", timeZone: "UTC" },
    );
    assert.equal(day.weekday, expected, `day ${day.day} weekday mismatch`);
  }
});

test("plan schema: phases cover Build 1-20, Speed 21-45, Final 46-50", () => {
  for (const day of days) {
    const expected = day.day <= 20 ? 1 : day.day <= 45 ? 2 : 3;
    assert.equal(day.phase, expected, `day ${day.day} phase mismatch`);
  }
  assert.deepEqual(
    plan.phases.map((p) => p.days),
    ["1-20", "21-45", "46-50"],
  );
});

test("plan schema: every task keeps its RBE url with query params", () => {
  let count = 0;
  for (const day of days) {
    assert.equal(day.daily_checklist.map((c) => c.id).join(","), "attempt,analysis,rev1,notes", `day ${day.day} checklist drift`);
    for (const [index, task] of day.tasks.entries()) {
      count++;
      assert.ok(task.url.startsWith("https://rbelearning.com/test-series/116/tests?subjectId="), `day ${day.day} task ${index} url`);
      assert.ok(task.url.length > "https://rbelearning.com/test-series/116/tests?subjectId=".length, `day ${day.day} task ${index} lost its query param`);
      assert.equal(task.completed, false, "source must ship incomplete");
      assert.equal(task.score, null, "source must ship null scores");
    }
  }
  // The export declares 273 planned tests but contains 262 task rows —
  // recorded honestly: the app preserves the file as-is and derives all
  // counts from the actual rows.
  assert.equal(count, 262);
  assert.equal(plan.planned_tests_total, 273);
});

test("plan schema: task keys are stable and reversible", () => {
  assert.equal(planTaskKey(12, 3), "d12:3");
  assert.deepEqual(parsePlanTaskKey("d12:3"), { day: 12, taskIndex: 3 });
  assert.equal(parsePlanTaskKey("nonsense"), null);
});

/* ---------- derivations ---------- */

function taskView(overrides: Partial<PlanTaskView> & { key: string; date: string }): PlanTaskView {
  return {
    day: 1,
    type: "live_mock",
    name: overrides.key,
    questions: 10,
    marks: 30,
    url: "https://rbelearning.com/test-series/116/tests?subjectId=458",
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

function dayView(overrides: Partial<PlanDayView> & { day: number; date: string; tasks: PlanTaskView[] }): PlanDayView {
  return {
    weekday: "Monday",
    phase: 1,
    dayType: "STUDY DAY",
    revisionTasks: [],
    revisionDone: [],
    checklist: [
      { id: "attempt", label: "Attempt", done: false },
      { id: "analysis", label: "Analyse", done: false },
      { id: "rev1", label: "Rev-1", done: false },
      { id: "notes", label: "Notes", done: false },
    ],
    notes: "",
    dayCompleted: false,
    ...overrides,
  };
}

test("day stats distinguish task completion from full day completion", () => {
  const day = dayView({
    day: 1,
    date: "2026-10-26",
    tasks: [taskView({ key: "a", date: "2026-10-26", completed: true })],
  });
  const stats = dayAssignmentStats(day);
  assert.equal(stats.completed, 1);
  assert.equal(stats.allTasksDone, true);
  assert.equal(stats.dayCompleted, false, "checklist still open");

  day.checklist.forEach((item) => (item.done = true));
  assert.equal(dayAssignmentStats(day).dayCompleted, true);
});

test("plan stats aggregate assignments across days", () => {
  const done = taskView({ key: "a", date: "2026-10-26", completed: true });
  const todo = taskView({ key: "b", date: "2026-10-26" });
  const stats = planProgressStats([
    dayView({ day: 1, date: "2026-10-26", tasks: [done, todo] }),
    dayView({ day: 2, date: "2026-10-27", tasks: [todo] }),
  ]);
  assert.equal(stats.totalDays, 2);
  assert.equal(stats.totalAssignments, 3);
  assert.equal(stats.completedAssignments, 1);
  assert.equal(stats.completionPct, 33);
});

test("next recommended action prefers today's first outstanding, then overdue, then future", () => {
  const today = "2026-10-27";
  const overdueTask = taskView({ key: "o", date: "2026-10-26" });
  const todayTask = taskView({ key: "t", date: "2026-10-27" });
  const futureTask = taskView({ key: "f", date: "2026-10-28" });
  const days = [
    dayView({ day: 1, date: "2026-10-26", tasks: [overdueTask] }),
    dayView({ day: 2, date: "2026-10-27", tasks: [todayTask] }),
    dayView({ day: 3, date: "2026-10-28", tasks: [futureTask] }),
  ];
  const focus = nextRecommendedAction(days, today);
  assert.equal(focus?.task.key, "t", "today's outstanding work first");
  assert.equal(focus?.overdue, false);

  todayTask.completed = true;
  const next = nextRecommendedAction(days, today);
  assert.equal(next?.task.key, "o");
  assert.equal(next?.overdue, true, "past-due work is flagged overdue");

  overdueTask.completed = true;
  const future = nextRecommendedAction(days, today);
  assert.equal(future?.task.key, "f");
});

test("revision queue follows the plan's rules, not elapsed time", () => {
  const today = "2026-11-01"; // Sunday closing the Oct 26 – Nov 1 week
  const completedInWeek = taskView({ key: "w", date: "2026-11-01", completed: true });
  const completedPastRev1 = taskView({ key: "p", date: "2026-10-27", completed: true, rev1: true, rev2: true });
  const notCompleted = taskView({ key: "n", date: "2026-11-01" });
  const phase3Task = taskView({ key: "r3", date: "2026-12-10", completed: true });
  const days = [
    dayView({ day: 2, date: "2026-10-27", tasks: [completedPastRev1] }),
    dayView({ day: 7, date: "2026-11-01", tasks: [completedInWeek, notCompleted] }),
    dayView({ day: 46, date: "2026-12-10", phase: 3, tasks: [phase3Task], revisionTasks: ["Rev-3 block: Days 1-9"] }),
  ];
  const queue = revisionQueue(days, today);
  assert.deepEqual(
    queue.rev1.map((i) => i.id).sort(),
    ["r3", "w"],
    "rev1 pending for completed tasks without rev1",
  );
  assert.deepEqual(
    queue.rev2.map((i) => i.id),
    ["w"],
    "weekly rev2 covers only the running week",
  );
  assert.ok(queue.rev3.some((i) => i.id === "r3"));
  assert.ok(
    queue.rev3.some((i) => i.dayRevisionIndex === 0),
    "day-level Rev-3 blocks appear in the queue",
  );
  assert.ok(!queue.items.some((i) => i.id === "n"), "unattempted work is not revision debt");
});

test("week range is Monday-based", () => {
  const week = weekRange("2026-10-28"); // Wednesday
  assert.equal(week.from, "2026-10-26");
  assert.equal(week.to, "2026-11-01");
});

test("month grid covers whole Monday-led weeks", () => {
  const cases = [
    // October 2026 starts on a Thursday and ends on a Saturday: five rows.
    { iso: "2026-10-15", from: "2026-09-28", to: "2026-11-01", length: 35 },
    // November 2026 starts on a Sunday and ends on a Monday: six rows.
    { iso: "2026-11-15", from: "2026-10-26", to: "2026-12-06", length: 42 },
    { iso: "2026-12-15", from: "2026-11-30", to: "2027-01-03", length: 35 },
    { iso: "2027-01-15", from: "2026-12-28", to: "2027-01-31", length: 35 },
  ];
  for (const expected of cases) {
    const grid = monthGridDays(expected.iso);
    assert.equal(grid[0], expected.from);
    assert.equal(grid.at(-1), expected.to);
    assert.equal(grid.length, expected.length);
    assert.equal(grid.length % 7, 0, `${expected.iso}: whole weeks only`);
    assert.equal(new Set(grid).size, grid.length, "no duplicate days");
    // Every day of the displayed month is present.
    const month = expected.iso.slice(0, 7);
    const monthDays = grid.filter((iso) => iso.slice(0, 7) === month);
    assert.equal(monthDays[0], `${month}-01`, "month starts on the 1st");
    assert.equal(
      monthDays.at(-1),
      addIsoDays(`${month}-01`, monthDays.length - 1),
      "no gaps inside the month",
    );
  }
});

test("month grid stays a whole block outside the plan window", () => {
  const grid = monthGridDays("2027-06-10");
  assert.equal(grid[0], "2027-05-31"); // a Monday
  assert.equal(grid.length % 7, 0);
});


/* ---------- next mock ---------- */

test("next mock filters by type before stopping", () => {
  // Twenty sectional tests exhaust any small `upcomingMocks` budget; the first
  // real mock sits behind them, so the helper must filter before it stops.
  const filler = Array.from({ length: 20 }, (_, index) =>
    dayView({
      day: index + 1,
      date: addIsoDays("2026-10-26", index),
      tasks: [
        taskView({
          key: `d${index + 1}:0`,
          date: addIsoDays("2026-10-26", index),
          type: "maths_sectional",
        }),
      ],
    }),
  );
  const mockDate = addIsoDays("2026-10-26", 20);
  const mockDay = dayView({
    day: 21,
    date: mockDate,
    tasks: [taskView({ key: "d21:0", day: 21, date: mockDate })],
  });
  const found = nextMockDay([...filler, mockDay], "2026-10-26");
  assert.equal(found?.task.date, mockDate);
  assert.equal(found?.day.day, 21);
});

test("next mock skips completed mocks and past days", () => {
  const past = dayView({
    day: 1,
    date: "2026-10-26",
    tasks: [taskView({ key: "d1:0", date: "2026-10-26" })],
  });
  const done = dayView({
    day: 2,
    date: "2026-10-27",
    tasks: [
      taskView({ key: "d2:0", day: 2, date: "2026-10-27", completed: true }),
    ],
  });
  const next = dayView({
    day: 3,
    date: "2026-10-28",
    tasks: [
      taskView({ key: "d3:0", day: 3, date: "2026-10-28", type: "paid_mock" }),
    ],
  });
  assert.equal(nextMockDay([past, done, next], "2026-10-27")?.task.key, "d3:0");
  assert.equal(nextMockDay([done], "2026-10-27"), null);
});

test("next mock reads the real plan without truncating", () => {
  // Built from the source plan through the same view conversion the app uses.
  const view = days.map((day) =>
    dayView({
      day: day.day,
      date: day.date,
      tasks: day.tasks.map((task) =>
        taskView({
          key: planTaskKey(day.day, day.tasks.indexOf(task)),
          date: day.date,
          type: task.type,
          completed: task.completed,
        }),
      ),
    }),
  );
  const found = nextMockDay(view, "2026-10-26");
  assert.ok(found, "the plan schedules at least one mock");
  assert.equal(found.task.completed, false);
  assert.equal(found.day.date, "2026-10-26");
});
