"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ClipboardPaste, Copy, Send, Sparkles, Square, Trash2 } from "lucide-react";
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
import { ExtractionReview } from "./extraction-review";
import { parseReport } from "@/lib/report-parser";
import {
  MAX_EXTRACT_CHARS,
  extractionToAttempt,
  type ExtractionDraft,
} from "@/lib/ai/extraction";
import { parseTaskSuggestions, type TaskSuggestion } from "@/lib/ai/task-suggestion";
import { linkHost } from "@/lib/plan/view-model";
import type { AttemptInput } from "@/lib/domain";
import type {
  AiCredentialSummary,
  ChatMessage,
} from "@/lib/ai/client-types";

const SUGGESTIONS = [
  "What should I focus on this week?",
  "Why did my last full mock score change?",
  "Which subject has the weakest accuracy?",
  "Add a task: revise profit & loss errors tomorrow",
];

/** What the sheet needs beyond chat state. The create handler performs the
 * actual personal-task write (AI stays read-only; this is the confirm step). */
export type AiSheetTaskApi = {
  createPersonalTask: (input: {
    title: string;
    notes?: string;
    dueDate?: string | null;
    url?: string | null;
    category: string;
    priority: string;
    status: string;
  }) => Promise<unknown>;
};

/** A reviewed mock draft handed to the real form. */
export type LogMockPayload = {
  values: Partial<AttemptInput>;
  date: string;
};

/**
 * The AI panel: a tabbed right Sheet with "Coach chat" and "Log a mock".
 * Desktop keeps the workspace visible; mobile is a full-width Sheet with a
 * dvh flex layout so the composer stays above the keyboard. Conversation
 * state lives in the shell hook; closing aborts the stream but never clears
 * the history.
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
  taskApi,
  onLogMock,
  onTaskAdded,
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
  /** Personal-task creator for suggest-and-confirm cards. */
  taskApi?: AiSheetTaskApi;
  /** Hands a reviewed mock draft to the real form (the sole save path). */
  onLogMock?: (draft: LogMockPayload) => void;
  /** Shell feedback (toast) after a suggested task is added. */
  onTaskAdded?: () => void;
}) {
  const [tab, setTab] = useState<"chat" | "log">("chat");
  // Reset to chat whenever the sheet reopens; the tab is not persistent state.
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setTab("chat");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-[520px]"
        overlayClassName="bg-ink/20"
        aria-describedby="ai-sheet-description"
      >
        <SheetHeader className="border-b border-rule-soft px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-serif text-[22px] leading-tight">
                AI workspace
              </SheetTitle>
              <SheetDescription id="ai-sheet-description" className="mt-1">
                Read-only coach answers and paste-to-draft extraction. Notes,
                email, and identity are never sent; nothing saves itself.
              </SheetDescription>
            </div>
          </div>
          <div
            role="group"
            aria-label="AI panel mode"
            className="segment-group mt-3"
          >
            <button
              type="button"
              aria-pressed={tab === "chat"}
              className="segment"
              onClick={() => setTab("chat")}
            >
              <Sparkles size={13} className="mr-1 inline" /> Coach chat
            </button>
            <button
              type="button"
              aria-pressed={tab === "log"}
              className="segment"
              onClick={() => setTab("log")}
            >
              <ClipboardPaste size={13} className="mr-1 inline" /> Log a mock
            </button>
          </div>
          {tab === "chat" && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
              {contextLabel && (
                <span className="inline-flex items-center gap-1 rounded-pill border border-rule-soft bg-canvas px-2 py-0.5">
                  <PlainIcon name="calendar" size={10} />
                  {contextLabel}
                </span>
              )}
              <span>Session-only chat</span>
            </div>
          )}
        </SheetHeader>

        {tab === "chat" ? (
          <CoachChatTab
            open={open}
            messages={messages}
            streaming={streaming}
            error={error}
            configured={configured}
            onSend={onSend}
            onStop={onStop}
            onClear={onClear}
            onAiConfigured={onAiConfigured}
            taskApi={taskApi}
            onTaskAdded={onTaskAdded}
          />
        ) : (
          <LogMockTab
            configured={configured}
            onAiConfigured={onAiConfigured}
            onLogMock={(payload) => {
              onLogMock?.(payload);
              onOpenChange(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ---------------- Coach chat tab ---------------- */

function CoachChatTab({
  open,
  messages,
  streaming,
  error,
  configured,
  onSend,
  onStop,
  onClear,
  onAiConfigured,
  taskApi,
  onTaskAdded,
}: {
  open: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  error: string;
  configured: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  onAiConfigured?: (credential: AiCredentialSummary | null) => void;
  taskApi?: AiSheetTaskApi;
  onTaskAdded?: () => void;
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    <>
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
              Ask about a score, a subject, or what to study next. Ask
              &ldquo;add a task&hellip;&rdquo; to get a confirmation card
              &mdash; tasks are added only after you approve them.
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
          <ChatBubble
            key={message.id}
            message={message}
            streaming={streaming}
            taskApi={taskApi}
            onTaskAdded={onTaskAdded}
          />
        ))}
        <div ref={endRef} />
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 border-t border-warning bg-warning-soft px-4 py-2.5 text-[11px] text-warning"
        >
          <span className="min-w-0">{error}</span>
          {!streaming && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const lastUser = messages.findLast(
                  (message) => message.role === "user",
                );
                if (lastUser) submit(lastUser.content);
              }}
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
          placeholder="Ask about a mock, a weak subject, or say “add a task…”"
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
    </>
  );
}

/* ---------------- chat bubbles + rich text ---------------- */

function ChatBubble({
  message,
  streaming,
  taskApi,
  onTaskAdded,
}: {
  message: ChatMessage;
  streaming: boolean;
  taskApi?: AiSheetTaskApi;
  onTaskAdded?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const parsed = useMemo(
    () =>
      message.role === "assistant"
        ? parseTaskSuggestions(message.content)
        : { text: message.content, suggestions: [] as TaskSuggestion[] },
    [message.role, message.content],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      // Clipboard unavailable (permissions/insecure context); ignore quietly.
    }
  };

  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[88%] rounded-control bg-ink px-3 py-2 text-[13px] leading-relaxed text-paper">
        {message.content}
      </div>
    );
  }

  const waiting = !message.content;
  return (
    <div className="max-w-[96%] border-l-2 border-accent bg-canvas px-3 py-2 text-[13px] leading-relaxed">
      {waiting ? (
        <span className="inline-flex items-center gap-1.5 text-muted">
          {streaming ? (
            <>
              <PlainIcon name="refresh" size={12} className="animate-spin" />
              Thinking…
            </>
          ) : (
            "No response."
          )}
        </span>
      ) : (
        <>
          <MessageContent content={parsed.text || message.content} />
          {parsed.suggestions.map((suggestion, index) => (
            <TaskSuggestionCard
              key={`${message.id}-${index}`}
              suggestion={suggestion}
              taskApi={taskApi}
              onTaskAdded={onTaskAdded}
            />
          ))}
        </>
      )}
      {!waiting && (
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={copied ? "Copied" : "Copy answer"}
          className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-muted transition-colors hover:text-accent"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}

/** Minimal safe formatter over plain strings — no HTML, no dangerouslySet.
 * Supports paragraphs, "-" bullets, fenced code, ### headings, **bold**,
 * `inline code`, and bare https?:// links. */
function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let code: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-1 flex list-disc flex-col gap-0.5 pl-4">
        {list.map((item, index) => (
          <li key={index}>{inlineNodes(item)}</li>
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
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (heading) {
      flushList();
      blocks.push(
        <p
          key={`h-${blocks.length}`}
          className="mt-1.5 font-serif text-[15px] font-medium leading-snug"
        >
          {inlineNodes(heading[1]!)}
        </p>,
      );
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
          {inlineNodes(line)}
        </p>,
      );
    }
  }
  flushList();
  flushCode();
  return <>{blocks.length ? blocks : content}</>;
}

/** Inline formatting: **bold**, `code`, and bare http(s) links. Built from
 * plain-string regex only — never HTML. */
function inlineNodes(text: string): ReactNode[] {
  const pattern =
    /(\*\*[^*]+\*\*)|(`[^`]+`)|(https?:\/\/[^\s<>()\[\]{}"']+)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const [raw, bold, code, url] = match;
    if (bold) {
      nodes.push(
        <strong key={`b-${key++}`} className="font-semibold">
          {bold.slice(2, -2)}
        </strong>,
      );
    } else if (code) {
      nodes.push(
        <code
          key={`c-${key++}`}
          className="rounded-[3px] bg-paper px-1 py-0.5 text-[12px]"
        >
          {code.slice(1, -1)}
        </code>,
      );
    } else if (url) {
      nodes.push(
        <a
          key={`u-${key++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-accent underline decoration-dotted underline-offset-2 hover:text-accent-hover"
        >
          {linkHost(url) ?? url}
        </a>,
      );
    } else {
      nodes.push(raw);
    }
    last = match.index + raw.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/* ---------------- task suggestion card ---------------- */

function TaskSuggestionCard({
  suggestion,
  taskApi,
  onTaskAdded,
}: {
  suggestion: TaskSuggestion;
  taskApi?: AiSheetTaskApi;
  onTaskAdded?: () => void;
}) {
  const [state, setState] = useState<"pending" | "busy" | "added" | "failed">(
    "pending",
  );
  const [failure, setFailure] = useState("");
  const host = suggestion.url ? linkHost(suggestion.url) : null;

  const add = () => {
    if (!taskApi || state !== "pending") return;
    setState("busy");
    taskApi
      .createPersonalTask({
        title: suggestion.title,
        notes: suggestion.notes || undefined,
        dueDate: suggestion.dueDate,
        url: suggestion.url,
        category: suggestion.category,
        priority: suggestion.priority,
        status: "todo",
      })
      .then(() => {
        setState("added");
        onTaskAdded?.();
      })
      .catch((cause: unknown) => {
        setState("failed");
        setFailure(
          cause instanceof Error ? cause.message : "Could not add the task.",
        );
      });
  };

  return (
    <div
      role="group"
      aria-label="Task suggestion from the coach"
      className="mt-2 rounded-control border border-dashed border-accent/50 bg-paper p-3"
    >
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
        <Sparkles size={11} /> Suggested task
      </p>
      <p className="mt-1.5 text-[13px] font-medium leading-snug">
        {suggestion.title}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
        <span className="rounded-pill border border-rule-soft bg-soft px-2 py-0.5">
          {suggestion.category === "other"
            ? "Personal"
            : suggestion.category.replace(/_/g, " ")}
        </span>
        {suggestion.dueDate && (
          <span className="tabular">Due {suggestion.dueDate}</span>
        )}
        {suggestion.priority !== "normal" && (
          <span
            className={
              suggestion.priority === "high" ? "text-accent font-medium" : ""
            }
          >
            {suggestion.priority} priority
          </span>
        )}
        {host && <span className="truncate">Link: {host}</span>}
      </p>
      {suggestion.notes && (
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          {suggestion.notes}
        </p>
      )}
      {suggestion.urlRemovedReason && (
        <p className="mt-1 text-[11px] text-warning">
          {suggestion.urlRemovedReason}
        </p>
      )}
      {state === "added" ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-positive">
          <Check size={13} /> Added to My Tasks
        </p>
      ) : state === "failed" ? (
        <div className="mt-2">
          <p role="alert" className="text-xs text-danger">
            {failure}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1.5"
            onClick={add}
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={add}
            disabled={!taskApi || state === "busy"}
          >
            {state === "busy" ? "Adding…" : "Add task"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setState("added")} // dismissed — nothing is written
            disabled={state === "busy"}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Log a mock tab ---------------- */

/** Paste → parse (AI or standard) → review → hand the reviewed draft to the
 * real form. This tab never saves; /add remains the sole save path. */
function LogMockTab({
  configured,
  onAiConfigured,
  onLogMock,
}: {
  configured: boolean;
  onAiConfigured?: (credential: AiCredentialSummary | null) => void;
  onLogMock: (draft: LogMockPayload) => void;
}) {
  const [paste, setPaste] = useState("");
  const [draft, setDraft] = useState<ExtractionDraft | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusChecked, setStatusChecked] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  // Re-check AI availability when the tab opens (cheap status call).
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/ai/status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body?.data) setAiEnabled(Boolean(body.data.enabled));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setStatusChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const importWithAi = async () => {
    setBusy(true);
    setError("");
    setDraft(null);
    try {
      const response = await fetch("/api/ai/extract", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: paste }),
      });
      const body = (await response.json().catch(() => null)) as {
        data?: { draft?: ExtractionDraft };
        error?: { message?: string };
      } | null;
      if (!response.ok || !body?.data?.draft)
        throw new Error(
          body?.error?.message ?? "Could not arrange this report.",
        );
      setDraft(body.data.draft);
      setReviewing(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not arrange this report.",
      );
    } finally {
      setBusy(false);
    }
  };

  const importStandard = () => {
    setError("");
    try {
      const parsed = parseReport(paste);
      // Hand the deterministic result straight to the real form: /add
      // applies it through applyExtracted exactly like a manual paste import.
      onLogMock({
        values: parsed.values,
        date: "",
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not read this report.",
      );
    }
  };

  const useReviewed = () => {
    if (!draft) return;
    try {
      const reviewed = extractionToAttempt(draft, "");
      onLogMock(reviewed);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Resolve the highlighted fields before continuing.",
      );
    }
  };

  if (reviewing && draft) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <ExtractionReview
          draft={draft}
          onChange={setDraft}
          onUse={useReviewed}
          onBack={() => setReviewing(false)}
          onDiscard={() => {
            setDraft(null);
            setReviewing(false);
            setError("");
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div className="rounded-control border border-rule-soft bg-canvas p-3.5">
        <p className="text-xs leading-relaxed text-muted">
          Paste the scorecard here, review the arranged draft, and continue to
          the mock form. The form stays the only place that saves — this panel
          only prepares the values.
        </p>
      </div>
      <label
        htmlFor="ai-log-mock-paste"
        className="mt-3 block text-xs font-medium"
      >
        Scorecard text
      </label>
      <textarea
        id="ai-log-mock-paste"
        rows={8}
        maxLength={MAX_EXTRACT_CHARS}
        value={paste}
        onChange={(event) => setPaste(event.target.value)}
        placeholder="Paste the full scorecard section…"
        className="mt-1 max-h-56 resize-y text-[12px]"
      />
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
        <span>
          {paste.length.toLocaleString("en-IN")} /{" "}
          {MAX_EXTRACT_CHARS.toLocaleString("en-IN")} characters
        </span>
        <button
          type="button"
          className="hover:text-accent"
          onClick={() => setPaste("")}
          disabled={!paste}
        >
          Clear paste
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 border border-warning bg-warning-soft px-3 py-2 text-xs text-warning"
        >
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {aiEnabled ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void importWithAi()}
            disabled={!paste.trim() || busy}
          >
            <Sparkles size={13} /> {busy ? "Reading…" : "Parse with AI"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={importStandard}
            disabled={!paste.trim()}
          >
            <ClipboardPaste size={13} /> Parse report
          </Button>
        )}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        {aiEnabled
          ? "AI parsing returns an editable draft with cross-checks; you review every field before continuing."
          : "Standard parsing works without AI. AI-assisted parsing appears once a provider is set up in Settings → AI provider."}
      </p>

      {!statusChecked && (
        <p className="mt-3 text-[10px] text-muted" aria-busy="true">
          Checking AI availability…
        </p>
      )}

      {/* Keep provider setup reachable from this tab when AI is off. */}
      {!aiEnabled && !configured && (
        <div className="mt-4 rounded-control border border-rule bg-canvas p-3.5">
          <AiSettingsForm
            variant="panel"
            showHeading={false}
            onChanged={onAiConfigured}
          />
        </div>
      )}
    </div>
  );
}
