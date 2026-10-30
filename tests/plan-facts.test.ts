import { test } from "node:test";
import assert from "node:assert/strict";
import planJson from "../src/data/study-plan.json";
import { studyPlanSchema } from "../src/lib/plan/schema";
import { buildLandingPlan } from "../src/components/landing/plan-facts";
import { dayTypeLabel } from "../src/lib/plan/view-model";

/**
 * The landing page prints plan counts. They must be the counts the workspace
 * itself derives — the export's declared total (273) does not match its rows
 * (262), and copying the header number would put a false claim on `/`.
 */

const source = studyPlanSchema.parse(planJson);
const plan = buildLandingPlan(source.daily_targets, source.phases);

test("task count comes from the rows, not the declared total", () => {
  const rows = source.daily_targets.reduce(
    (sum, day) => sum + day.tasks.length,
    0,
  );
  assert.equal(plan.taskCount, rows);
  assert.notEqual(plan.taskCount, source.planned_tests_total);
});

test("every plan day appears once, in day order", () => {
  assert.equal(plan.days.length, source.daily_targets.length);
  assert.deepEqual(
    plan.days.map((day) => day.day),
    Array.from({ length: plan.days.length }, (_, index) => index + 1),
  );
});

test("each day's task count matches its source row", () => {
  for (const day of plan.days) {
    const raw = source.daily_targets.find((row) => row.day === day.day);
    assert.ok(raw, `day ${day.day} missing from source`);
    assert.equal(day.taskCount, raw.tasks.length);
  }
});

test("mock days are the days with a live or paid mock", () => {
  const expected = source.daily_targets.filter((day) =>
    day.tasks.some(
      (task) => task.type === "live_mock" || task.type === "paid_mock",
    ),
  ).length;
  assert.equal(plan.mockDayCount, expected);
  for (const day of plan.days) {
    const raw = source.daily_targets.find((row) => row.day === day.day)!;
    assert.equal(
      day.hasMock,
      raw.tasks.some(
        (task) => task.type === "live_mock" || task.type === "paid_mock",
      ),
    );
  }
});

test("phases cover the whole plan with no gaps", () => {
  assert.equal(plan.phases.length, 3);
  let next = 1;
  for (const phase of plan.phases) {
    assert.equal(phase.from, next);
    next = phase.to + 1;
  }
  assert.equal(next - 1, plan.days.length);
});

test("the sample day is real plan data and exposes a category per task", () => {
  const day = plan.sampleDay;
  const raw = source.daily_targets.find((row) => row.day === day.day)!;
  assert.equal(day.date, raw.date);
  assert.equal(day.dayType, dayTypeLabel(raw.day_type));
  assert.equal(day.tasks.length, raw.tasks.length);
  assert.equal(day.checklist.length, raw.daily_checklist.length);
  for (const task of day.tasks) {
    assert.ok(task.name.length > 0);
    assert.ok(task.short.length > 0);
    assert.ok(task.questions > 0 && task.marks > 0);
  }
  assert.ok(
    plan.phases.some((phase) => phase.name === day.phaseName),
    "sample day names a real phase",
  );
});
