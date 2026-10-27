"use client";
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
    setCoachBusy(true);
    setCoachError("");
    try {
      const result = await api<CoachResponse>("/api/ai/coach", {
        method: "POST",
        body: "{}",
      });
      setCoachInsight(result.insight);
      setCoachMeta(result.meta);
    } catch (e) {
      setCoachError(
        e instanceof Error ? e.message : "Could not generate an insight",
      );
    } finally {
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
    async (text: string, screen?: AiScreenContext | null) => {
      if (chatAbort.current) return; // a stream is already in flight
      const userMessage: ChatMessage = {
        id: newId(),
        role: "user",
        content: text,
      };
      const assistantId = newId();
      const history = trimChatHistory(
        [...chatMessages, userMessage],
        8,
      );
      setChatMessages((current) => [
        ...current,
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
