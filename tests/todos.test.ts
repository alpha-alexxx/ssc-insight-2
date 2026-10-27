import assert from "node:assert/strict";
import { test } from "node:test";
import {
  completionState,
  todoCreateSchema,
  todoPatchSchema,
  todoApplySchema,
} from "../src/lib/todos-core";
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
