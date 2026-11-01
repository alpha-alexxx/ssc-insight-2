import assert from "node:assert/strict";
import { test } from "node:test";
import { safeHttpUrlCore } from "../src/lib/plan/view-model";
import {
  effectiveStatus,
  linkHost,
  personalTasksByDate,
  type PersonalTaskView,
} from "../src/lib/plan/view-model";
import { parseTaskSuggestions } from "../src/lib/ai/task-suggestion";

const TODAY = "2026-10-28";

function task(overrides: Partial<PersonalTaskView> = {}): PersonalTaskView {
  return {
    id: "t1",
    title: "Revise profit & loss",
    notes: "",
    dueDate: null,
    url: "",
    category: "revision",
    priority: "normal",
    status: "todo",
    subtasks: [],
    groupId: null,
    version: 1,
    createdAt: "2026-10-27T00:00:00.000Z",
    ...overrides,
  };
}

/* ---------------- safeHttpUrlCore (API adds the zod wrapper) ---------------- */

test("safeHttpUrlCore accepts https and http links", () => {
  for (const value of [
    "https://rbe.example.com/test/123",
    "http://localhost:3000/quiz",
    "https://a.co",
  ]) {
    assert.equal(safeHttpUrlCore(value), true, value);
  }
});

test("safeHttpUrlCore rejects non-http schemes, bare text, and whitespace-only values", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,<script>",
    "ftp://files.example.com/x",
    "www.example.com/quiz",
    "rbe quiz link",
    "   ",
  ]) {
    assert.equal(safeHttpUrlCore(value), false, value);
  }
});

test("safeHttpUrlCore allows an empty string (normalized to null on persist)", () => {
  assert.equal(safeHttpUrlCore(""), true);
});

/* ---------------- effectiveStatus ---------------- */

test("effectiveStatus derives overdue only from a past due date on open tasks", () => {
  assert.equal(effectiveStatus(task({ dueDate: "2026-10-27" }), TODAY), "overdue");
  assert.equal(effectiveStatus(task({ dueDate: TODAY }), TODAY), "todo");
  assert.equal(effectiveStatus(task({ dueDate: "2026-10-29" }), TODAY), "todo");
  assert.equal(effectiveStatus(task({}), TODAY), "todo");
});

test("effectiveStatus never marks a completed task overdue", () => {
  assert.equal(
    effectiveStatus(task({ status: "completed", dueDate: "2026-10-01" }), TODAY),
    "completed",
  );
});

test("effectiveStatus passes in_progress through", () => {
  assert.equal(effectiveStatus(task({ status: "in_progress" }), TODAY), "in_progress");
  // 'skipped' is not a personal status; it falls back to the stored value and
  // the dot system renders the neutral todo ring for it.
  assert.equal(effectiveStatus(task({ status: "skipped" }), TODAY), "skipped");
});

/* ---------------- linkHost ---------------- */

test("linkHost extracts the hostname and tolerates junk", () => {
  assert.equal(linkHost("https://rbe.example.com/test/123?a=1"), "rbe.example.com");
  assert.equal(linkHost("http://localhost:3000/quiz"), "localhost");
  assert.equal(linkHost(""), null);
  assert.equal(linkHost("not a url"), null);
});

/* ---------------- personalTasksByDate ---------------- */

test("personalTasksByDate groups by due date and buckets undated tasks", () => {
  const a = task({ id: "a", dueDate: "2026-10-28" });
  const b = task({ id: "b", dueDate: "2026-10-28" });
  const c = task({ id: "c", dueDate: "2026-10-30" });
  const d = task({ id: "d", dueDate: null });
  const grouped = personalTasksByDate([a, b, c, d]);
  assert.deepEqual([...grouped.get("2026-10-28")!.map((t) => t.id)], ["a", "b"]);
  assert.deepEqual([...grouped.get("2026-10-30")!.map((t) => t.id)], ["c"]);
  assert.deepEqual([...grouped.get("")!.map((t) => t.id)], ["d"]);
});

/* ---------------- parseTaskSuggestions ---------------- */

const suggestionBlock = (body: string) => `\`\`\`task-suggestion\n${body}\n\`\`\``;

test("parseTaskSuggestions extracts a valid block and strips it from the text", () => {
  const content = [
    "Here is the task you asked for.",
    suggestionBlock(
      '{"title":"Revise profit & loss","dueDate":"2026-10-29","priority":"high","category":"revision","url":"https://rbe.example.com/x","notes":"focus on ratio problems"}',
    ),
    "The app will show a confirmation card.",
  ].join("\n\n");
  const parsed = parseTaskSuggestions(content);
  assert.equal(parsed.suggestions.length, 1);
  const suggestion = parsed.suggestions[0]!;
  assert.equal(suggestion.title, "Revise profit & loss");
  assert.equal(suggestion.dueDate, "2026-10-29");
  assert.equal(suggestion.priority, "high");
  assert.equal(suggestion.category, "revision");
  assert.equal(suggestion.url, "https://rbe.example.com/x");
  assert.equal(suggestion.urlRemovedReason, null);
  assert.ok(parsed.text.includes("Here is the task"));
  assert.ok(parsed.text.includes("confirmation card"));
  assert.ok(!parsed.text.includes("task-suggestion"));
});

test("parseTaskSuggestions defaults missing fields and drops invalid URLs with a warning", () => {
  const parsed = parseTaskSuggestions(
    suggestionBlock('{"title":"Practice seating puzzles","url":"javascript:alert(1)"}'),
  );
  assert.equal(parsed.suggestions.length, 1);
  const suggestion = parsed.suggestions[0]!;
  assert.equal(suggestion.priority, "normal");
  assert.equal(suggestion.category, "other");
  assert.equal(suggestion.dueDate, null);
  assert.equal(suggestion.url, null);
  assert.match(suggestion.urlRemovedReason ?? "", /http\(s\)/);
});

test("parseTaskSuggestions keeps malformed JSON visible as a code block", () => {
  const content = `Before.\n${suggestionBlock("{not json")}\nAfter.`;
  const parsed = parseTaskSuggestions(content);
  assert.equal(parsed.suggestions.length, 0);
  assert.ok(parsed.text.includes("```task-suggestion"));
  assert.ok(parsed.text.includes("{not json"));
  assert.ok(parsed.text.includes("Before."));
  assert.ok(parsed.text.includes("After."));
});

test("parseTaskSuggestions rejects blocks without a title", () => {
  const parsed = parseTaskSuggestions(suggestionBlock('{"notes":"no title"}'));
  assert.equal(parsed.suggestions.length, 0);
  assert.ok(parsed.text.includes("```task-suggestion"));
});

test("parseTaskSuggestions returns plain text untouched", () => {
  const content = "Just a normal answer with **bold** and https://example.com.";
  const parsed = parseTaskSuggestions(content);
  assert.deepEqual(parsed.suggestions, []);
  assert.equal(parsed.text, content);
});
