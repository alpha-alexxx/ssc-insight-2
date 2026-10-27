"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Send, Square, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { PlainIcon } from "./icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { AiSettingsForm } from "./ai-settings-form";
import type { AiCredentialSummary, ChatMessage } from "@/lib/ai/client-types";

const SUGGESTIONS = [
  "What should I focus on this week?",
  "Why did my last full mock score change?",
  "Which subject has the weakest accuracy?",
];

/**
 * Desktop: a controlled-width right Sheet that keeps the workspace visible.
 * Mobile: a full-width Sheet with a dvh flex layout so the composer stays
 * above the on-screen keyboard. Conversation state lives in the shell hook;
 * closing aborts the stream but never clears the history.
 */
export function AiChatSheet({
  open,
  onOpenChange,
  messages,
  streaming,
  error,
  contextLabel,
  configured = true,
  onSend,
  onStop,
  onClear,
  onAiConfigured,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ChatMessage[];
  streaming: boolean;
  error: string;
  contextLabel?: string;
  /** False when no AI provider is configured; shows the setup form instead. */
  configured?: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  /** Notifies the shell so AI status can be refetched after setup. */
  onAiConfigured?: (credential: AiCredentialSummary | null) => void;
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastUser = useMemo(
    () => messages.findLast((message) => message.role === "user"),
    [messages],
  );

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ block: "end" });
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    if (nearBottom) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, streaming]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || streaming) return;
    onSend(value);
    setInput("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-[460px]"
        overlayClassName="bg-ink/20"
        aria-describedby="ai-sheet-description"
      >
        <SheetHeader className="border-b border-rule-soft px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-serif text-[22px] leading-tight">
                Ask your coach
              </SheetTitle>
              <SheetDescription id="ai-sheet-description" className="mt-1">
                Read-only answers from your aggregates and latest 20 full mocks.
                Notes, email, and identity are never sent.
              </SheetDescription>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
            {contextLabel && (
              <span className="inline-flex items-center gap-1 rounded-pill border border-rule-soft bg-canvas px-2 py-0.5">
                <PlainIcon name="calendar" size={10} />
                {contextLabel}
              </span>
            )}
            <span>Session-only chat</span>
          </div>
        </SheetHeader>

        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-busy={streaming}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        >
          {!messages.length && !configured && (
            <div className="rounded-control border border-rule bg-canvas p-3.5">
              <p className="text-xs leading-relaxed text-muted">
                Add a provider and API key to start asking questions. Your key is
                encrypted before storage and never returned to this page.
              </p>
              <div className="mt-3">
                <AiSettingsForm
                  variant="panel"
                  showHeading={false}
                  onChanged={onAiConfigured}
                />
              </div>
            </div>
          )}

          {!messages.length && configured && (
            <div className="rounded-control border border-rule-soft bg-canvas p-3.5">
              <p className="text-xs leading-relaxed text-muted">
                Ask about a score, a subject, or what to study next. Every
                answer is rebuilt from your current saved data.
              </p>
              <div className="mt-3 flex flex-col items-start gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submit(suggestion)}
                    className="w-full rounded-control border border-rule-soft bg-paper px-2.5 py-2 text-left text-[11px] leading-snug transition-colors hover:border-accent hover:text-accent"
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
                  ? "ml-auto max-w-[88%] rounded-control bg-ink px-3 py-2 text-[13px] leading-relaxed text-paper"
                  : "max-w-[96%] border-l-2 border-accent bg-canvas px-3 py-2 text-[13px] leading-relaxed"
              }
            >
              {message.role === "assistant" && !message.content ? (
                <span className="inline-flex items-center gap-1.5 text-muted">
                  {streaming ? (
                    <>
                      <PlainIcon
                        name="refresh"
                        size={12}
                        className="animate-spin"
                      />
                      Thinking…
                    </>
                  ) : (
                    "No response."
                  )}
                </span>
              ) : (
                <MessageContent content={message.content} />
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 border-t border-warning bg-warning-soft px-4 py-2.5 text-[11px] text-warning"
          >
            <span className="min-w-0">{error}</span>
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
          className={
            configured
              ? "border-t border-rule-soft bg-paper px-3 py-3"
              : "hidden"
          }
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
        >
          <label htmlFor="ai-chat-input" className="sr-only">
            Ask the coach a question
          </label>
          <textarea
            ref={inputRef}
            id="ai-chat-input"
            rows={2}
            maxLength={4_000}
            value={input}
            disabled={streaming}
            placeholder="Ask about a mock, a weak subject, or what to do next…"
            className="max-h-32 resize-none text-[13px]"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(input);
              }
            }}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
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
              <Button type="button" variant="outline" size="sm" onClick={onStop}>
                <Square size={13} /> Stop
              </Button>
            ) : (
              <Button type="submit" size="sm" disabled={!input.trim()}>
                Send <Send size={13} />
              </Button>
            )}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted">
            Closing the panel keeps this conversation for the session. Do not
            paste sensitive personal information.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** Minimal safe formatter: paragraphs, bullets, and fenced code only. */
function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let code: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-1 flex flex-col gap-0.5 pl-4 list-disc">
        {list.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  const flushCode = () => {
    if (!code.length) return;
    blocks.push(
      <pre
        key={`code-${blocks.length}`}
        className="my-1 overflow-x-auto rounded-control border border-rule-soft bg-paper p-2 text-[11px]"
      >
        <code>{code.join("\n")}</code>
      </pre>,
    );
    code = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      flushList();
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]!);
      continue;
    }
    flushList();
    if (line.trim()) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="my-0.5 whitespace-pre-wrap">
          {line}
        </p>,
      );
    }
  }
  flushList();
  flushCode();
  return <>{blocks.length ? blocks : content}</>;
}
