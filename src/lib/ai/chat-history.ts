import type { ChatMessage } from "./client-types";

/** A retry replaces the latest user/assistant exchange, including partial output. */
export function chatBaseForSend(
  messages: ChatMessage[],
  retry: boolean,
): ChatMessage[] {
  if (!retry) return messages;
  const index = messages.findLastIndex((message) => message.role === "user");
  return index < 0 ? messages : messages.slice(0, index);
}
