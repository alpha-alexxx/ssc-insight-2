"use client";
import { chatBaseForSend } from "@/lib/ai/chat-history";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { NdjsonDecoder, parseChatEvent } from "@/lib/ai/ndjson";
import type {
  AiScreenContext,
  AiStatus,
  ChatMessage,
  CoachMeta,
  CoachResponse,
} from "@/lib/ai/client-types";
import type { CoachInsight } from "@/lib/ai/schemas";
import { longDate } from "@/lib/format";

function newId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

/** Keep the prompt window tight: only the trailing exchanges, and never a
 * leading assistant turn (the API requires the history to start with a user
 * message). */
export function trimChatHistory(messages: ChatMessage[], lastN: number) {
  const history = [...messages]
    .map((message) => ({ role: message.role, content: message.content }))
    .filter((message) => message.content.trim())
    .slice(-lastN);
  while (history.length && history[0].role === "assistant") history.shift();
  return history;
}

/** The seeded user turn for dashboard-initiated insight generation. Exported
 * so the sheet's retry can route back to the coach endpoint instead of the
 * chat endpoint. */
export const INSIGHT_REQUEST_TEXT = "Generate an insight from my recent mocks.";

/** Render the structured coach insight as chat markdown — the sheet's
 * MessageContent supports ### headings, "-" bullets and **bold**, so the
 * reading experience matches the rest of the conversation. */
function insightToChatText(insight: CoachInsight, meta: CoachMeta | null) {
  const lines: string[] = [];
  lines.push(`### ${insight.headline}`);
  lines.push(insight.summary);
  lines.push("**Working well**");
  for (const item of insight.strengths) lines.push(`- ${item}`);
  lines.push("**Needs attention**");
  for (const item of insight.focusAreas) lines.push(`- ${item}`);
  lines.push("**Next actions**");
  insight.nextActions.forEach((item, index) =>
    lines.push(`${index + 1}. ${item}`),
  );
  for (const caveat of insight.caveats) lines.push(caveat);
  const dataDate = meta?.dataAsOf ? longDate(meta.dataAsOf) : null;
  lines.push(
    meta
      ? `Based on ${meta.coverage.totalAttempts} saved result${meta.coverage.totalAttempts === 1 ? "" : "s"} and ${meta.coverage.recentFullMocksIncluded} recent full mock${meta.coverage.recentFullMocksIncluded === 1 ? "" : "s"}${dataDate ? ` · data to ${dataDate}` : ""}.`
      : "Based on your saved results.",
  );
  return lines.join("\n");
}

/**
 * Client state for the optional AI subsystem: availability status, the coach
 * insight card, and the streaming chat drawer. Chat is in-memory only; the
 * in-flight stream aborts when the drawer closes or the workspace unmounts.
 * Everything here fails soft — AI must never block the tracker.
 */
export function useAiWorkspace() {
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [coachInsight, setCoachInsight] = useState<CoachInsight | null>(null);
  const [coachMeta, setCoachMeta] = useState<CoachMeta | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachError, setCoachError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatAbort = useRef<AbortController | null>(null);

  const refreshAiStatus = useCallback(async () => {
    try {
      setAiStatus(await api<AiStatus>("/api/ai/status"));
    } catch {
      // AI is optional; a status failure must never block the dashboard.
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void refreshAiStatus(), 0);
    return () => clearTimeout(timer);
  }, [refreshAiStatus]);
  useEffect(
    () => () => {
      chatAbort.current?.abort();
    },
    [],
  );

  const clearCoach = useCallback(() => {
    setCoachInsight(null);
    setCoachMeta(null);
  }, []);

  const generateCoach = useCallback(async () => {
    if (chatAbort.current) return; // a stream is already in flight
    setChatError("");
    setChatOpen(true);
    setChatStreaming(true);
    const requestId = newId();
    const assistantId = newId();
    // The request lands in the visible transcript: the chat context the model
    // sees on follow-ups includes what the insight covered.
    setChatMessages((current) => [
      ...chatBaseForSend(current, false),
      { id: requestId, role: "user", content: INSIGHT_REQUEST_TEXT },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setCoachBusy(true);
    setCoachError("");
    try {
      const result = await api<CoachResponse>("/api/ai/coach", {
        method: "POST",
        body: "{}",
      });
      setCoachInsight(result.insight);
      setCoachMeta(result.meta);
      setChatMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: insightToChatText(result.insight, result.meta) }
            : message,
        ),
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not generate an insight";
      setCoachError(message);
      setChatMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content:
                  "I could not read your saved mocks just now. The error shows on the dashboard coach card; try again from there.",
              }
            : message,
        ),
      );
    } finally {
      setChatStreaming(false);
      setCoachBusy(false);
      void refreshAiStatus();
    }
  }, [refreshAiStatus]);

  const openChat = useCallback(() => {
    setChatError("");
    setChatOpen(true);
  }, []);

  const setChatOpenSafe = useCallback((open: boolean) => {
    if (!open) chatAbort.current?.abort();
    setChatOpen(open);
  }, []);

  const stopChat = useCallback(() => {
    chatAbort.current?.abort();
  }, []);

  const clearChat = useCallback(() => {
    chatAbort.current?.abort();
    setChatMessages([]);
    setChatError("");
  }, []);

  const sendChat = useCallback(
    async (text: string, screen?: AiScreenContext | null, retry = false) => {
      if (chatAbort.current) return; // a stream is already in flight
      const base = chatBaseForSend(chatMessages, retry);
      const userMessage: ChatMessage = {
        id: newId(),
        role: "user",
        content: text,
      };
      const assistantId = newId();
      const history = trimChatHistory([...base, userMessage], 8);
      setChatMessages([
        ...base,
        userMessage,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setChatStreaming(true);
      setChatError("");
      const abort = new AbortController();
      chatAbort.current = abort;
      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            ...(screen ? { context: screen } : {}),
          }),
          signal: abort.signal,
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          if (response.status === 401)
            window.dispatchEvent(new Event("ssc:session-ended"));
          if (body?.error?.code === "AUTH_UNAVAILABLE")
            window.dispatchEvent(new Event("ssc:auth-unavailable"));
          throw new Error(
            body?.error?.message ?? "The coach could not answer. Try again.",
          );
        }
        if (!response.body)
          throw new Error("The coach returned an empty answer.");
        const reader = response.body.getReader();
        const decoder = new NdjsonDecoder();
        let finished = false;
        const handle = (line: string) => {
          const event = parseChatEvent(line);
          if (!event) return;
          if (event.type === "delta") {
            setChatMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + event.text }
                  : message,
              ),
            );
          } else if (event.type === "error") {
            setChatError(event.message);
            finished = true;
          } else if (event.type === "done") {
            finished = true;
          }
        };
        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.push(value)) {
            handle(line);
            if (finished) break;
          }
        }
        for (const line of decoder.flush()) {
          handle(line);
          if (finished) break;
        }
        await reader.cancel().catch(() => undefined);
      } catch (e) {
        if (!abort.signal.aborted)
          setChatError(
            e instanceof Error ? e.message : "The coach could not answer.",
          );
      } finally {
        setChatStreaming(false);
        if (chatAbort.current === abort) chatAbort.current = null;
        void refreshAiStatus();
      }
    },
    [chatMessages, refreshAiStatus],
  );

  return {
    aiStatus,
    refreshAiStatus,
    coach: {
      insight: coachInsight,
      meta: coachMeta,
      busy: coachBusy,
      error: coachError,
      generate: generateCoach,
      clear: clearCoach,
      open: openChat,
    },
    chat: {
      open: chatOpen,
      setOpen: setChatOpenSafe,
      messages: chatMessages,
      streaming: chatStreaming,
      error: chatError,
      send: sendChat,
      stop: stopChat,
      clear: clearChat,
    },
  };
}
