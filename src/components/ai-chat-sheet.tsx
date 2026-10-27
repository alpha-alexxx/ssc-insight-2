"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  ClipboardPaste,
  Copy,
  FileText,
  Lightbulb,
  ListTodo,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  TrendingUp,
  Trash2,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import { PlainIcon } from "./icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { TodoAiComposer } from "./plan/personal-todos";
import { AiSettingsForm } from "./ai-settings-form";
import { ExtractionReview } from "./extraction-review";
import { parseReport } from "@/lib/report-parser";
import {
  MAX_EXTRACT_CHARS,
  extractionToAttempt,
  type ExtractionDraft,
} from "@/lib/ai/extraction";
import { parseTaskSuggestions, type TaskSuggestion } from "@/lib/ai/task-suggestion";
import { istTodayIso, linkHost } from "@/lib/plan/view-model";
import type { AttemptInput } from "@/lib/domain";
import type {
  AiCredentialSummary,
  ChatMessage,
} from "@/lib/ai/client-types";

const QUICK_QUESTIONS = [
  { text: "What should I focus on this week?", icon: BarChart3, color: "bg-accent-soft text-accent" },
  { text: "Why did my last full mock score change?", icon: TrendingUp, color: "bg-danger-soft text-danger" },
  { text: "Which subject has the weakest accuracy?", icon: Calendar, color: "bg-warning-soft text-warning" },
  { text: "Suggest a study plan based on my weak topics", icon: BookOpen, color: "bg-positive-soft text-positive" },
  { text: "Compare my last 5 mocks performance", icon: ListTodo, color: "bg-[var(--chart-reasoning)]/15 text-[var(--chart-reasoning)]" },
  { text: "Important topics to revise next?", icon: Lightbulb, color: "bg-warning-soft text-warning" },
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
  const [tab, setTab] = useState<"chat" | "log" | "todos">("chat");
  // Reset to chat whenever the sheet reopens; the tab is not persistent state.
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setTab("chat");
  }
  // Switching to the todo composer must not leave a stream running; the
  // composer manages its own generation requests.
  const switchToTodos = () => {
    onStop();
    setTab("todos");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-[520px] flex flex-col"
        overlayClassName="bg-ink/20"
        aria-describedby="ai-sheet-description"
      >
        {/* Header */}
        <div className="border-b border-rule-soft px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft">
                <Sparkles size={20} className="text-accent" />
              </div>
              <div className="min-w-0">
                <h2 className="font-serif text-[22px] font-medium leading-tight text-ink">
                  Ask your <span className="text-accent">coach</span>
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Get insights from your mock data and personalized guidance.
                </p>
              </div>
            </div>
            {contextLabel && (
              <div className="flex shrink-0 items-center gap-2 rounded-control border border-rule-soft bg-canvas px-3 py-1.5">
                <Calendar size={14} className="text-muted" />
                <div className="text-right">
                  <p className="text-[11px] font-medium leading-tight text-ink">{contextLabel}</p>
                  <p className="text-[10px] text-muted">Session-only chat</p>
                </div>
              </div>
            )}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted">
            Read-only answers from your aggregates and latest 20 full mocks. Notes, email, and identity are never sent.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="border-b border-rule-soft px-5 py-3">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              aria-pressed={tab === "chat"}
              onClick={() => setTab("chat")}
              className={`flex flex-col items-center gap-1.5 rounded-control border px-3 py-3 text-center transition-colors ${
                tab === "chat"
                  ? "border-ink bg-ink text-paper"
                  : "border-rule-soft bg-paper text-muted hover:border-rule hover:text-ink"
              }`}
            >
              <MessageSquare size={18} />
              <span className="text-[11px] font-medium leading-tight">Coach</span>
              <span className={`text-[9px] leading-tight ${tab === "chat" ? "text-paper/70" : "text-muted"}`}>
                Get insights & guidance
              </span>
            </button>
            <button
              type="button"
              aria-pressed={tab === "todos"}
              onClick={switchToTodos}
              className={`flex flex-col items-center gap-1.5 rounded-control border px-3 py-3 text-center transition-colors ${
                tab === "todos"
                  ? "border-ink bg-ink text-paper"
                  : "border-rule-soft bg-paper text-muted hover:border-rule hover:text-ink"
              }`}
            >
              <FileText size={18} />
              <span className="text-[11px] font-medium leading-tight">Plan todos</span>
              <span className={`text-[9px] leading-tight ${tab === "todos" ? "text-paper/70" : "text-muted"}`}>
                Create & manage plan
              </span>
            </button>
            <button
              type="button"
              aria-pressed={tab === "log"}
              onClick={() => setTab("log")}
              className={`flex flex-col items-center gap-1.5 rounded-control border px-3 py-3 text-center transition-colors ${
                tab === "log"
                  ? "border-ink bg-ink text-paper"
                  : "border-rule-soft bg-paper text-muted hover:border-rule hover:text-ink"
              }`}
            >
              <Plus size={18} />
              <span className="text-[11px] font-medium leading-tight">Add mock</span>
              <span className={`text-[9px] leading-tight ${tab === "log" ? "text-paper/70" : "text-muted"}`}>
                Manually add a result
              </span>
            </button>
          </div>
        </div>

        {tab === "chat" && (
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
        )}
        {tab === "todos" && (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <TodoAiComposer compact />
          </div>
        )}
        {tab === "log" && (
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

  const charCount = input.length;
  const maxChars = 1000;

  return (
    <>
      {/* Quick questions or message log */}
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-busy={streaming}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4"
      >
        {!messages.length && !configured && (
          <div className="rounded-control border border-rule bg-canvas p-4">
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
          <div className="flex flex-col gap-4">
            {/* Quick questions header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-control bg-accent-soft">
                  <Zap size={14} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Quick questions</p>
                  <p className="text-[10px] text-muted">Click a question below or type your own.</p>
                </div>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 text-[10px] text-muted hover:text-accent"
              >
                <RefreshCw size={11} />
                More questions
              </button>
            </div>

            {/* Quick questions grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.text}
                  type="button"
                  onClick={() => submit(q.text)}
                  className="group flex items-start gap-2.5 rounded-control border border-rule-soft bg-paper p-3 text-left transition-all hover:border-accent hover:shadow-sm"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${q.color}`}>
                    <q.icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium leading-snug text-ink group-hover:text-accent">
                      {q.text}
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-3 w-3 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex flex-col gap-3">
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
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 border-t border-warning bg-warning-soft px-5 py-2.5 text-[11px] text-warning"
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

      {/* Composer */}
      <form
        className={
          configured
            ? "border-t border-rule-soft bg-paper px-5 py-4"
            : "hidden"
        }
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
      >
        <div className="rounded-control border border-rule-soft bg-canvas p-3">
          <div className="flex items-start gap-2">
            <MessageSquare size={16} className="mt-0.5 shrink-0 text-muted" />
            <textarea
              ref={inputRef}
              id="ai-chat-input"
              rows={2}
              maxLength={maxChars}
              value={input}
              disabled={streaming}
              placeholder="Ask about a mock, a weak subject, or what to do next..."
              className="max-h-24 flex-1 resize-none border-0 bg-transparent p-0 text-[13px] leading-relaxed placeholder:text-muted focus:outline-none focus:ring-0"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(input);
                }
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-control border border-rule-soft bg-paper px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:border-rule hover:text-ink"
            >
              <ClipboardPaste size={12} />
              Attach (optional)
            </button>
            <div className="flex items-center gap-3">
              <span className="text-[10px] tabular text-muted">
                {charCount}/{maxChars}
              </span>
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
          </div>
        </div>
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
      <div className="ml-auto max-w-[88%] rounded-control bg-ink px-3.5 py-2.5 text-[13px] leading-relaxed text-paper">
        {message.content}
      </div>
    );
  }

  const waiting = !message.content;
  return (
    <div className="max-w-[96%] rounded-control border-l-2 border-accent bg-canvas px-3.5 py-2.5 text-[13px] leading-relaxed">
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
          className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted transition-colors hover:text-accent"
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
      <ul
        key={`list-${blocks.length}`}
        className="my-1 flex flex-col gap-0.5 pl-4 list-disc"
      >
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
  // Personal todos now require a date; when the model leaves one out, the
  // confirmation card defaults to today (IST) instead of failing on save.
  const dueDate = suggestion.dueDate ?? istTodayIso();

  const add = () => {
    if (!taskApi || state !== "pending") return;
    setState("busy");
    taskApi
      .createPersonalTask({
        title: suggestion.title,
        notes: suggestion.notes || undefined,
        dueDate,
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
      className="mt-2.5 rounded-control border border-dashed border-accent/50 bg-paper p-3"
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
        {dueDate && <span className="tabular">Due {dueDate}</span>}
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
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
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
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <div className="rounded-control border border-rule-soft bg-canvas p-4">
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
        <div className="mt-4 rounded-control border border-rule bg-canvas p-4">
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
