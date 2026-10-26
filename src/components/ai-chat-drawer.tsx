"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Send, Square, Trash2, X } from "lucide-react";
import { Button } from "./ui/button";
import type { ChatMessage } from "@/lib/ai/client-types";

const SUGGESTIONS = [
  "What should I focus on this week?",
  "Why did my last full mock score change?",
  "Which subject has the weakest accuracy?",
];

export function AiChatDrawer({
  open,
  onOpenChange,
  messages,
  streaming,
  error,
  onSend,
  onStop,
  onClear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ChatMessage[];
  streaming: boolean;
  error: string;
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const lastUser = useMemo(
    () => messages.findLast((message) => message.role === "user"),
    [messages],
  );

  // Opening the drawer always lands on the latest message; while streaming,
  // follow the new tokens only if the reader hasn't scrolled up to reread.
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [open]);
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const nearBottom =
      log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    if (nearBottom) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, streaming]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || streaming) return;
    onSend(value);
    setInput("");
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l border-rule bg-paper rounded-none">
          <header className="flex items-start justify-between gap-3 border-b border-rule-soft px-5 py-4">
            <div>
              <Dialog.Title className="font-serif text-2xl leading-tight">
                Ask your coach
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted">
                Answers use your aggregates and the latest 20 full mocks. Notes,
                email, and identity are never sent.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="p-1 text-muted hover:text-ink"
              aria-label="Close coach chat"
            >
              <X size={20} />
            </Dialog.Close>
          </header>

          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-busy={streaming}
            className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
          >
            {!messages.length && (
              <div>
                <p className="text-sm leading-relaxed text-muted">
                  Ask about a score, a subject, or what to study next. Every
                  answer is rebuilt from your current saved data.
                </p>
                <div className="mt-4 flex flex-col items-start gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => submit(suggestion)}
                      className="border border-rule-soft px-3 py-2 text-left text-xs hover:border-accent hover:text-accent"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[90%] bg-ink px-4 py-3 text-sm leading-relaxed text-paper"
                    : "max-w-[95%] border-l-2 border-accent bg-canvas px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                }
              >
                {message.role === "assistant" && !message.content ? (
                  <span className="text-muted">
                    {streaming ? "Thinking…" : "No response."}
                  </span>
                ) : (
                  <span className="whitespace-pre-wrap">{message.content}</span>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {error && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 border-t border-warning bg-warning-soft px-5 py-3 text-xs text-warning"
            >
              <span>{error}</span>
              {!streaming && lastUser && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => submit(lastUser.content)}
                >
                  Try again
                </Button>
              )}
            </div>
          )}

          <form
            className="border-t border-rule-soft px-5 py-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit(input);
            }}
          >
            <label htmlFor="ai-chat-input" className="sr-only">
              Ask the coach a question
            </label>
            <textarea
              id="ai-chat-input"
              rows={3}
              maxLength={4_000}
              value={input}
              disabled={streaming}
              placeholder="Ask about your last mock, a weak subject, or what to do next…"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(input);
                }
              }}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={!messages.length && !error}
              >
                <Trash2 size={13} /> Clear
              </Button>
              {streaming ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onStop}
                >
                  <Square size={13} /> Stop
                </Button>
              ) : (
                <Button type="submit" size="sm" disabled={!input.trim()}>
                  Send <Send size={13} />
                </Button>
              )}
            </div>
            <p className="mt-3 text-[10px] text-muted">
              Session-only chat: closing the workspace clears this conversation.
              Do not paste sensitive personal information.
            </p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
