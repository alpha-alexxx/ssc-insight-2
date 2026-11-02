/**
 * Task-suggestion protocol for the AI coach (suggest-and-confirm).
 *
 * The chat model never writes data. When the user asks it to remember or add
 * a task, the model emits ONE fenced block:
 *
 * ```task-suggestion
 * {"title":"Revise profit & loss","dueDate":"2026-10-28","priority":"high",
 *  "category":"revision","url":"https://…","notes":"…"}
 * ```
 *
 * The client renders this as a confirmation card; the task exists only after
 * the user clicks Add. Everything here is pure and unit-tested.
 */

import { stripUnsafeChars } from "./sanitize-core";

/** Fenced task-suggestion blocks. The inner body is the first fenced region. */
const BLOCK_PATTERN = /```task-suggestion\r?\n([\s\S]*?)```/g;

export type TaskSuggestion = {
  title: string;
  dueDate: string | null;
  priority: "low" | "normal" | "high";
  category: string;
  url: string | null;
  notes: string;
  /** Set when a provided URL failed http(s) validation and was dropped. */
  urlRemovedReason: string | null;
};

export type ParsedChatContent = {
  /** Chat text with suggestion blocks removed. */
  text: string;
  /** One entry per valid or recoverable suggestion block, in order. */
  suggestions: TaskSuggestion[];
};

const PRIORITIES: TaskSuggestion["priority"][] = ["low", "normal", "high"];
const CATEGORIES = [
  "revision",
  "practice",
  "error_review",
  "notes",
  "formula",
  "other",
];

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function parseSuggestionBody(body: string): TaskSuggestion | null {
  // The same character policy the prompt builders use, so a suggestion cannot
  // smuggle bidi overrides or zero-width lookalikes into a task title.
  const cleaned = stripUnsafeChars(body).trim();
  if (!cleaned) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;

  const title = typeof record.title === "string" ? record.title.trim().slice(0, 200) : "";
  if (!title) return null;

  const dueDateRaw =
    typeof record.dueDate === "string" ? record.dueDate.trim() : "";
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDateRaw) ? dueDateRaw : null;

  const priorityRaw =
    typeof record.priority === "string" && record.priority.trim().length
      ? (record.priority.trim().toLowerCase() as TaskSuggestion["priority"])
      : "normal";
  const priority = PRIORITIES.includes(priorityRaw) ? priorityRaw : "normal";

  const categoryRaw =
    typeof record.category === "string" && record.category.trim().length
      ? record.category.trim().toLowerCase()
      : "other";
  const category = (CATEGORIES as string[]).includes(categoryRaw)
    ? categoryRaw
    : "other";

  let url: string | null = null;
  let urlRemovedReason: string | null = null;
  if (typeof record.url === "string" && record.url.trim()) {
    const candidate = record.url.trim().slice(0, 2048);
    if (isHttpUrl(candidate)) url = candidate;
    else
      urlRemovedReason =
        "Link removed — only http(s) links are allowed in this app.";
  }

  const notes =
    typeof record.notes === "string" ? record.notes.trim().slice(0, 2000) : "";

  return { title, dueDate, priority, category, url, notes, urlRemovedReason };
}

/**
 * Split streamed chat content into display text and task suggestions. A
 * complete, parseable block becomes a suggestion (even with an invalid URL —
 * the card warns and drops just the link). Malformed JSON stays in the text
 * as a plain code block so nothing the model said silently disappears.
 */
export function parseTaskSuggestions(content: string): ParsedChatContent {
  const suggestions: TaskSuggestion[] = [];
  const text = content.replace(BLOCK_PATTERN, (match, body: string) => {
    const suggestion = parseSuggestionBody(body);
    if (!suggestion) return match; // keep malformed blocks visible as code
    suggestions.push(suggestion);
    return "";
  });
  return { text: text.replace(/\n{3,}/g, "\n\n").trimEnd(), suggestions };
}
