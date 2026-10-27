import { chatBaseForSend } from "../src/lib/ai/chat-history";
import type { ChatMessage } from "../src/lib/ai/client-types";
import assert from "node:assert/strict";
import { test } from "node:test";
import { trimChatHistory } from "../src/components/use-ai-workspace";

const user = (content: string) => ({
  id: content,
  role: "user" as const,
  content,
});
const assistant = (content: string) => ({
  id: `a-${content}`,
  role: "assistant" as const,
  content,
});

test("chat history keeps the trailing window and drops empties", () => {
  const messages = [
    user("one"),
    assistant(""),
    user("two"),
    assistant("reply"),
    user("three"),
  ];
  assert.deepEqual(trimChatHistory(messages, 8), [
    { role: "user", content: "one" },
    { role: "user", content: "two" },
    { role: "assistant", content: "reply" },
    { role: "user", content: "three" },
  ]);
});

test("chat history never starts with an assistant turn", () => {
  const messages = [
    user("one"),
    assistant("reply"),
    user("two"),
    assistant("r2"),
  ];
  assert.deepEqual(trimChatHistory(messages, 2), [
    { role: "user", content: "two" },
    { role: "assistant", content: "r2" },
  ]);
});

test("chat history window trims to the last N messages", () => {
  const messages = [
    user("1"),
    assistant("a"),
    user("2"),
    assistant("b"),
    user("3"),
  ];
  assert.deepEqual(trimChatHistory(messages, 3), [
    { role: "user", content: "2" },
    { role: "assistant", content: "b" },
    { role: "user", content: "3" },
  ]);
  // A window that would start with an assistant turn is shifted once more.
  assert.deepEqual(trimChatHistory(messages, 2), [
    { role: "user", content: "3" },
  ]);
});

test("retry replaces only the failed exchange, preserving earlier conversation", () => {
  const messages: ChatMessage[] = [
    { id: "1", role: "user", content: "First question" },
    { id: "2", role: "assistant", content: "First answer" },
    { id: "3", role: "user", content: "Retry this" },
    { id: "4", role: "assistant", content: "Partial response" },
  ];
  assert.deepEqual(chatBaseForSend(messages, true), messages.slice(0, 2));
  assert.equal(chatBaseForSend(messages, false), messages);
  assert.equal(messages.length, 4);
  assert.deepEqual(chatBaseForSend([], true), []);
  assert.deepEqual(chatBaseForSend(messages.slice(0, 1), true), []);
});
