import assert from "node:assert/strict";
import { test } from "node:test";
import {
  completionState,
  todoCreateSchema,
  todoPatchSchema,
  todoApplySchema,
  todoListOptions,
  todoCalendarRange,
  todoCalendarWhere,
  calendarCounts,
} from "../src/lib/todos-core";

test("calendar ranges are real dates, inclusive, and bounded to six weeks", () => {
  assert.ok(
    todoCalendarRange.safeParse({ from: "2026-12-28", to: "2027-02-07" })
      .success,
  );
  assert.ok(
    todoCalendarRange.safeParse({ from: "2028-02-29", to: "2028-02-29" })
      .success,
  );
  for (const range of [
    { from: "2026-12-28", to: "2027-02-08" },
    { from: "2026-12-28", to: "2026-12-27" },
    { from: "2026-02-29", to: "2026-03-01" },
  ])
    assert.equal(todoCalendarRange.safeParse(range).success, false);
});

test("calendar database selection always scopes ownership, excludes Trash, and includes boundaries", () => {
  assert.deepEqual(
    todoCalendarWhere("verified-owner", {
      from: "2027-01-01",
      to: "2027-01-31",
    }),
    {
      userId: "verified-owner",
      deletedAt: null,
      dueDate: { gte: "2027-01-01", lte: "2027-01-31" },
    },
  );
});

test("calendar aggregation uses database counts beyond any list page and keeps completion distinct", () => {
  assert.deepEqual(
    calendarCounts([
      { dueDate: "2027-01-01", status: "todo", _count: { _all: 125 } },
      { dueDate: "2027-01-01", status: "in_progress", _count: { _all: 2 } },
      { dueDate: "2027-01-01", status: "completed", _count: { _all: 12 } },
      { dueDate: "2027-01-31", status: "completed", _count: { _all: 1 } },
      { dueDate: null, status: "todo", _count: { _all: 8 } },
    ]),
    {
      "2027-01-01": { pending: 127, completed: 12 },
      "2027-01-31": { pending: 0, completed: 1 },
    },
  );
  assert.deepEqual(calendarCounts([]), {});
});

test("list filters have compatible defaults and reject unsupported sort and status values", () => {
  assert.deepEqual(todoListOptions.parse({}), {
    completion: "all",
    priority: "all",
    group: "all",
    sort: "priority",
  });
  assert.equal(
    todoListOptions.safeParse({ completion: "done" }).success,
    false,
  );
  assert.equal(
    todoListOptions.safeParse({ sort: 'title; DROP TABLE "PersonalTask"' })
      .success,
    false,
  );
  assert.equal(
    todoListOptions.safeParse({ excludeDate: "2026-02-30" }).success,
    false,
  );
  assert.deepEqual(
    todoListOptions.parse({
      completion: "pending",
      priority: "high",
      group: "ungrouped",
      sort: "date",
      excludeDate: "2027-01-01",
    }),
    {
      completion: "pending",
      priority: "high",
      group: "ungrouped",
      sort: "date",
      excludeDate: "2027-01-01",
    },
  );
  assert.equal(
    todoListOptions.safeParse({ completion: "in_progress" }).success,
    true,
  );
});
const subtasks = [
  { id: "a", title: "Read", completed: false },
  { id: "b", title: "Practice", completed: true },
];
test("create proposals preserve explicit completion and synchronize children", () => {
  const draft = todoCreateSchema.parse({
    title: "Finished work",
    dueDate: "2027-06-10",
    completed: true,
    subtasks,
  });
  assert.equal(draft.completed, true);
  const state = completionState(draft.subtasks, "todo", draft.completed);
  assert.equal(state.status, "completed");
  assert.ok(state.subtasks.every((item) => item.completed));
  const reopened = todoCreateSchema.parse({ ...draft, completed: false });
  assert.equal(
    completionState(reopened.subtasks, "todo", reopened.completed).status,
    "todo",
  );
  assert.equal(completionState([], "todo", true).status, "completed");
});
test("new todos require valid dates but allow dates beyond the mock window", () => {
  assert.equal(todoCreateSchema.safeParse({ title: "Work" }).success, false);
  assert.equal(
    todoCreateSchema.safeParse({ title: "Work", dueDate: "2027-06-10" })
      .success,
    true,
  );
  assert.equal(
    todoCreateSchema.safeParse({ title: "Work", dueDate: "2026-02-30" })
      .success,
    false,
  );
});
test("parent completion toggles all children and reopening reopens them all", () => {
  const done = completionState(subtasks, "todo", true);
  assert.equal(done.status, "completed");
  assert.ok(done.subtasks.every((s) => s.completed));
  const opened = completionState(done.subtasks, "completed", false);
  assert.equal(opened.status, "todo");
  assert.ok(opened.subtasks.every((s) => !s.completed));
});
test("child completion controls parent and an unchecked child reopens parent", () => {
  assert.equal(completionState(subtasks, "completed").status, "todo");
  assert.equal(
    completionState(
      subtasks.map((s) => ({ ...s, completed: true })),
      "todo",
    ).status,
    "completed",
  );
  assert.equal(completionState([], "completed").status, "completed");
});
test("updates and batches require concurrency versions and bounded selected operations", () => {
  assert.equal(todoPatchSchema.safeParse({ title: "changed" }).success, false);
  assert.equal(
    todoApplySchema.safeParse({
      idempotencyKey: "request-123",
      operations: [{ type: "delete", id: "other" }],
    }).success,
    false,
  );
  assert.equal(
    todoApplySchema.safeParse({
      idempotencyKey: "request-123",
      operations: Array.from({ length: 26 }, () => ({
        type: "delete",
        id: "a",
        version: 1,
      })),
    }).success,
    false,
  );
  assert.equal(
    todoApplySchema.safeParse({
      idempotencyKey: "request-123",
      operations: [
        { type: "update", id: "a", version: 1, data: { completed: true } },
      ],
    }).success,
    true,
  );
});

test("partial edits never inject create defaults or erase subtasks", () => {
  assert.deepEqual(todoPatchSchema.parse({ version: 1, title: "Renamed" }), {
    version: 1,
    title: "Renamed",
  });
  assert.deepEqual(todoPatchSchema.parse({ version: 1, completed: true }), {
    version: 1,
    completed: true,
  });
});

test("status patches accept the three-state values and never inject a default", () => {
  for (const status of ["todo", "in_progress", "completed"]) {
    assert.deepEqual(todoPatchSchema.parse({ version: 1, status }), {
      version: 1,
      status,
    });
  }
  assert.equal(
    todoPatchSchema.safeParse({ version: 1, status: "done" }).success,
    false,
  );
  assert.equal(
    todoPatchSchema.safeParse({ version: 1, status: null }).success,
    false,
  );
  // A bare completed patch still parses identically (AI proposals and the
  // checkbox stay source-compatible).
  assert.deepEqual(
    todoPatchSchema.parse({ version: 2, completed: false, status: "todo" }),
    { version: 2, completed: false, status: "todo" },
  );
});
