"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowUp,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronRight,
  Check,
  ClipboardPaste,
  Copy,
  Info,
  Lightbulb,
  ListTodo,
  MessageSquare,
  Pencil,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useOverlayViewport, useOverlayFocus } from "./use-overlay-viewport";
import { Button } from "./ui/button";
import { PlainIcon } from "./icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { TodoAiComposer } from "./tasks/ai-composer";
import { AiSettingsForm } from "./ai-settings-form";
import { ExtractionReview } from "./extraction-review";
import { useExamScope } from "./exam-context";
import { parseReport } from "@/lib/report-parser";
import {
  MAX_EXTRACT_CHARS,
  extractionToAttempt,
  type ExtractionDraft,
  type ExtractedSubjectDraft,
} from "@/lib/ai/extraction";
import { SUBJECTS } from "@/lib/domain";
import { mockTypeLabel } from "@/lib/format";
import {
  parseTaskSuggestions,
  type TaskSuggestion,
} from "@/lib/ai/task-suggestion";
import { istTodayIso, linkHost } from "@/lib/plan/view-model";
import type { AttemptInput } from "@/lib/domain";
import type { AiCredentialSummary, ChatMessage } from "@/lib/ai/client-types";

const QUICK_QUESTIONS = [
  {
    text: "What should I focus on this week?",
    icon: BarChart3,
  },
  {
    text: "Why did my last full mock score change?",
    icon: TrendingUp,
  },
  {
    text: "Which subject has the weakest accuracy?",
    icon: Calendar,
  },
  {
    text: "Suggest a study plan based on my weak topics",
    icon: BookOpen,
  },
  {
    text: "Compare my last 5 mocks performance",
    icon: ListTodo,
  },
  {
    text: "Important topics to revise next?",
    icon: Lightbulb,
  },
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
  /** Tab to land on when the sheet opens; callers can deep-link a flow. */
  initialTab = "chat",
  onSend,
  onStop,
  onClear,
  onRetry,
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
  initialTab?: "chat" | "log" | "todos";
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  onRetry?: () => void;
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
    if (open) setTab(initialTab);
  }
  const viewport = useOverlayViewport(open);
  const overlayFocus = useOverlayFocus();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        {...overlayFocus}
        side="right"
        className="ai-workspace-sheet w-full gap-0 sm:max-w-[520px] flex flex-col"
        style={
          viewport
            ? { height: viewport.height, top: viewport.top, bottom: "auto" }
            : undefined
        }
        overlayClassName="bg-ink/20"
        aria-describedby="ai-sheet-description"
      >
        <SheetHeader className="shrink-0 gap-1.5 border-b border-rule-soft px-4 pb-3 pt-4 pr-14 sm:px-5">
          <SheetTitle className="font-serif text-xl font-medium leading-tight text-ink sm:text-[22px]">
            Study coach
          </SheetTitle>
          <SheetDescription
            id="ai-sheet-description"
            className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[11px] text-muted"
          >
            {contextLabel && (
              <span className="rounded-[2px] border border-rule-soft px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-[0.12em]">
                {contextLabel}
              </span>
            )}
            <span>Cleared when you close this panel.</span>
          </SheetDescription>
        </SheetHeader>
        <div
          className="shrink-0 border-b border-rule-soft px-3 py-2.5 sm:px-4"
          role="tablist"
          aria-label="AI mode"
        >
          {/* The app's one segmented-control grammar, not a bespoke tab bar. */}
          <div className="segment-group !flex w-full">
            {(
              [
                { id: "chat", label: "Ask", icon: MessageSquare },
                { id: "todos", label: "Todos", icon: ListTodo },
                { id: "log", label: "Log", icon: ClipboardPaste },
              ] as const
            ).map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`ai-tab-${item.id}`}
                aria-controls={`ai-panel-${item.id}`}
                aria-selected={tab === item.id}
                tabIndex={tab === item.id ? 0 : -1}
                onClick={() => {
                  onStop();
                  setTab(item.id);
                }}
                onKeyDown={(event) => {
                  const ids = ["chat", "todos", "log"] as const;
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % 3
                      : event.key === "ArrowLeft"
                        ? (index + 2) % 3
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? 2
                            : null;
                  if (next !== null) {
                    event.preventDefault();
                    onStop();
                    setTab(ids[next]);
                    document.getElementById(`ai-tab-${ids[next]}`)?.focus();
                  }
                }}
                className="segment min-w-0 flex-1 justify-center"
              >
                <item.icon size={15} className="shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div
          role="tabpanel"
          id={`ai-panel-${tab}`}
          aria-labelledby={`ai-tab-${tab}`}
          className="flex min-h-0 flex-1 flex-col"
        >
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
              onRetry={onRetry}
              onAiConfigured={onAiConfigured}
              taskApi={taskApi}
              onTaskAdded={onTaskAdded}
            />
          )}
          {tab === "todos" && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
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
        </div>
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
  onRetry,
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
  onRetry?: () => void;
  onAiConfigured?: (credential: AiCredentialSummary | null) => void;
  taskApi?: AiSheetTaskApi;
  onTaskAdded?: () => void;
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const follow = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const [lastSent, setLastSent] = useState("");

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ block: "end" });
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    if (follow.current) log.scrollTop = log.scrollHeight;
  }, [messages, streaming]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || streaming) return;
    follow.current = true;
    setShowLatest(false);
    setLastSent(value);
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
        onScroll={(event) => {
          const log = event.currentTarget;
          follow.current =
            log.scrollHeight - log.scrollTop - log.clientHeight < 80;
          setShowLatest(!follow.current);
        }}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
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
          <div className="flex flex-col gap-5 py-1">
            <div>
              <h3 className="font-serif text-[1.375rem] font-medium leading-tight text-ink">
                What would help you study today?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Answers use your aggregates and your latest 20 full mocks —
                never your notes or identity.
              </p>
            </div>
            <div className="border-t border-rule-soft">
              {QUICK_QUESTIONS.slice(0, 4).map((question) => (
                <button
                  key={question.text}
                  type="button"
                  onClick={() => submit(question.text)}
                  className="group flex min-h-12 w-full items-center gap-3 border-b border-rule-soft px-1 py-3 text-left text-sm leading-snug text-ink transition-colors hover:bg-soft"
                >
                  <question.icon
                    size={15}
                    className="shrink-0 text-muted group-hover:text-accent"
                  />
                  <span className="min-w-0 flex-1">{question.text}</span>
                  <ChevronRight
                    size={15}
                    className="shrink-0 text-muted group-hover:text-accent"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.length > 0 && (
          <CoachMemos
            messages={messages}
            streaming={streaming}
            taskApi={taskApi}
            onTaskAdded={onTaskAdded}
          />
        )}
        <div ref={endRef} />
      </div>

      {showLatest && (
        <div className="flex shrink-0 justify-center border-t border-rule-soft py-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              follow.current = true;
              setShowLatest(false);
              if (logRef.current)
                logRef.current.scrollTop = logRef.current.scrollHeight;
            }}
          >
            Jump to latest
          </Button>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 border-t border-warning bg-warning-soft px-4 py-2.5 text-[11px] text-warning sm:px-5"
        >
          <span className="min-w-0">{error}</span>
          {!streaming && onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 w-full sm:min-h-0 sm:w-auto"
              onClick={onRetry}
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
            ? "ai-composer shrink-0 bg-paper px-3 pb-3 pt-2 sm:px-5 sm:pb-5 sm:pt-3"
            : "hidden"
        }
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
      >
        <div className="ai-composer-field">
          <textarea
            ref={inputRef}
            id="ai-chat-input"
            rows={2}
            maxLength={maxChars}
            value={input}
            aria-label="Message your study coach"
            placeholder="Ask about a mock, a weak subject, or what to do next…"
            className="max-h-28 w-full resize-none border-0 bg-transparent px-3 pt-2.5 text-[13px] leading-relaxed placeholder:text-muted focus:outline-none focus:ring-0"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit(input);
              }
            }}
          />
          <div className="flex items-center justify-between gap-2 border-t border-rule-soft px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                aria-label="Clear conversation"
                title="Clear conversation"
                className="inline-flex size-10 items-center justify-center rounded-control text-muted transition-colors hover:bg-soft hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                disabled={streaming || !messages.length}
                onClick={onClear}
              >
                <Trash2 size={16} />
              </button>
              {error && lastSent && (
                <button
                  type="button"
                  aria-label="Edit question"
                  title="Edit question"
                  className="inline-flex size-10 items-center justify-center rounded-control text-accent transition-colors hover:bg-soft disabled:pointer-events-none disabled:opacity-40"
                  onClick={() => setInput(lastSent)}
                >
                  <Pencil size={15} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="tabular text-[10px] text-muted">
                {charCount}/{maxChars}
              </span>
              {streaming ? (
                <button
                  type="button"
                  aria-label="Stop generating"
                  title="Stop"
                  className="inline-flex size-10 items-center justify-center rounded-control border border-rule bg-paper text-ink transition-colors hover:bg-canvas"
                  onClick={onStop}
                >
                  <Square size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  aria-label="Send message"
                  title="Send"
                  className="inline-flex size-10 items-center justify-center rounded-control bg-accent text-paper transition-colors duration-150 hover:bg-accent-hover disabled:pointer-events-none disabled:bg-canvas disabled:text-muted"
                  disabled={!input.trim() || streaming}
                >
                  <ArrowUp size={17} strokeWidth={2.4} />
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

/* ---------------- coach memos ---------------- */

/** Section labels the coach is prompted to use. Recognised here so a memo can
 * render them as a ruled left-label column instead of a wall of prose. */
const MEMO_LABELS = new Set([
  "WHAT I SEE",
  "WHAT TO DO",
  "WORKING WELL",
  "NEEDS ATTENTION",
  "NEXT ACTIONS",
  "NEXT STEPS",
  "WHY",
]);

type MemoBlock =
  | { kind: "section"; label: string; body: string }
  | { kind: "text"; body: string };

const HEADLINE_MAX = 92;

/** Split an answer into an optional headline and labelled sections.
 *
 * The headline is only the answer's **first paragraph**, and only when that
 * paragraph is a short declarative line — a long opening paragraph is body
 * text, not a title, and setting it in the display serif would shout. Prose
 * the model writes before its first section stays body text; prose after a
 * section closes that section. Everything renders through the same safe
 * formatter, so nothing is lost whichever branch is taken. */
export function parseMemo(content: string): {
  headline: string[];
  blocks: MemoBlock[];
} {
  const headline: string[] = [];
  const blocks: MemoBlock[] = [];
  let current: { label: string; lines: string[] } | null = null;
  let seenSection = false;
  /** Untouched prose seen before the first section head. */
  let preamble: string[] = [];

  const flush = () => {
    if (!current) return;
    blocks.push({
      kind: "section",
      label: current.label,
      body: current.lines.join("\n").trim(),
    });
    current = null;
  };

  const flushPreamble = () => {
    if (!preamble.length) return;
    const [first, ...rest] = preamble;
    const short =
      first!.length <= HEADLINE_MAX &&
      !/^\s*[-*\d]/.test(first!) &&
      rest.every((line) => !line.trim());
    if (short) headline.push(first!);
    else blocks.push({ kind: "text", body: preamble.join("\n").trim() });
    preamble = [];
  };

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) {
      if (current) current.lines.push("");
      else if (!seenSection) preamble.push("");
      continue;
    }
    const arrow = line.match(/^\*\*([A-Za-z][A-Za-z \-']{2,28}?)\*\*:?\s*(.*)$/);
    const upper = line.match(
      /^(WHAT I SEE|WHAT TO DO|WORKING WELL|NEEDS ATTENTION|NEXT ACTIONS|NEXT STEPS|WHY)\b:?\s*(.*)$/i,
    );
    const candidate = arrow
      ? arrow[1]!.trim().toUpperCase()
      : upper
        ? upper[1]!.trim().toUpperCase()
        : null;
    if (candidate && MEMO_LABELS.has(candidate)) {
      flush();
      flushPreamble();
      seenSection = true;
      current = { label: candidate, lines: [arrow?.[2] ?? upper?.[2] ?? ""] };
      continue;
    }
    if (current) current.lines.push(line);
    else if (!seenSection) preamble.push(line);
    else {
      flush();
      blocks.push({ kind: "text", body: line });
    }
  }
  flush();
  flushPreamble();
  return { headline, blocks };
}

/** The memo list: one document, not a chat transcript. Your question becomes
 * the dateline that opens the answer beneath it. */
function CoachMemos({
  messages,
  streaming,
  taskApi,
  onTaskAdded,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  taskApi?: AiSheetTaskApi;
  onTaskAdded?: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {messages.map((message, index) =>
        message.role === "user" ? (
          <p
            key={message.id}
            className="section-label border-t border-rule-soft pt-4 first:border-t-0 first:pt-0"
          >
            Asked
          </p>
        ) : (
          <CoachMemo
            key={message.id}
            message={message}
            streaming={streaming && index === messages.length - 1}
            taskApi={taskApi}
            onTaskAdded={onTaskAdded}
          />
        ),
      )}
    </div>
  );
}

function CoachMemo({
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
    () => parseTaskSuggestions(message.content),
    [message.content],
  );
  const memo = useMemo(() => parseMemo(parsed.text), [parsed.text]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      // Clipboard unavailable (permissions/insecure context); ignore quietly.
    }
  };

  if (!message.content) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-muted">
        {streaming ? (
          <>
            <PlainIcon name="refresh" size={12} className="animate-spin" />
            Writing…
          </>
        ) : (
          "No response."
        )}
      </p>
    );
  }

  return (
    <article className="ai-memo min-w-0 break-words">
      {memo.headline.length > 0 && (
        <h3 className="font-serif text-[1.0625rem] font-medium leading-snug text-ink">
          <MessageContent content={memo.headline.join("\n")} />
        </h3>
      )}
      {memo.blocks.map((block, index) =>
        block.kind === "section" ? (
          <div key={index} className="ai-memo-section mt-3">
            <p className="section-label">{block.label}</p>
            <div className="ai-memo-body mt-1 text-sm leading-relaxed text-ink">
              <MessageContent content={block.body} />
            </div>
          </div>
        ) : (
          <div
            key={index}
            className="mt-2 text-sm leading-relaxed text-ink"
          >
            <MessageContent content={block.body} />
          </div>
        ),
      )}
      {parsed.suggestions.map((suggestion, index) => (
        <TaskSuggestionCard
          key={`${message.id}-${index}`}
          suggestion={suggestion}
          taskApi={taskApi}
          onTaskAdded={onTaskAdded}
        />
      ))}
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? "Copied" : "Copy answer"}
        className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-ink"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </article>
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
  const pattern = /(\*\*[^*]+\*\*)|(`[^`]+`)|(https?:\/\/[^\s<>()\[\]{}"']+)/g;
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
  const [state, setState] = useState<
    "pending" | "busy" | "added" | "failed" | "dismissed"
  >("pending");
  const [failure, setFailure] = useState("");
  const host = suggestion.url ? linkHost(suggestion.url) : null;
  // Personal todos now require a date; when the model leaves one out, the
  // confirmation card defaults to today (IST) instead of failing on save.
  const dueDate = suggestion.dueDate ?? istTodayIso();

  const add = () => {
    if (!taskApi || (state !== "pending" && state !== "failed")) return;
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

  if (state === "dismissed") return null;
  return (
    <div
      role="group"
      aria-label="Task suggestion from the coach"
      className="mt-3 border-l-2 border-l-accent bg-paper py-2 pl-3"
    >
      <p className="section-label text-accent">Suggested task</p>
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
            className="min-h-11 flex-1 sm:min-h-0 sm:flex-none"
            onClick={add}
            disabled={!taskApi || state === "busy"}
          >
            {state === "busy" ? "Adding…" : "Add task"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 sm:min-h-0"
            onClick={() => setState("dismissed")}
            disabled={state === "busy"}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- subject roster ---------------- */

/**
 * The parsed draft as a roster: one ruled row per subject with its question
 * count and right/wrong split, so the reader verifies the numbers against the
 * scorecard at a glance. Rows that cannot be resolved say so in place; the
 * full field editor stays one tap away behind "Edit details".
 */
function SubjectRoster({
  draft,
  onChange,
  onOpenDetails,
  onBack,
  onContinue,
  error,
}: {
  draft: ExtractionDraft;
  onChange: (next: ExtractionDraft) => void;
  onOpenDetails: () => void;
  onBack: () => void;
  onContinue: () => void;
  error: string;
}) {
  const blockers = draft.issues.filter((issue) => issue.severity === "blocker");
  const warnings = draft.issues.filter((issue) => issue.severity === "warning");
  const ready = blockers.length === 0 && draft.subjects.length > 0;

  const setSubject = (
    index: number,
    patch: Partial<ExtractedSubjectDraft>,
  ) => {
    onChange({
      ...draft,
      subjects: draft.subjects.map((subject, at) =>
        at === index ? { ...subject, ...patch } : subject,
      ),
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-rule-soft px-4 pb-3 pt-4 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="min-w-0 break-words font-serif text-[1.25rem] font-medium leading-tight text-ink sm:text-[1.375rem]">
            {draft.name?.trim() || "Parsed result"}
          </h3>
          <span
            className={cn(
              "section-label",
              ready ? "text-positive" : "text-warning",
            )}
          >
            {ready
              ? "Ready"
              : `${blockers.length} unresolved`}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {[
            draft.platform?.trim(),
            draft.date,
            draft.type ? mockTypeLabel(draft.type) : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Check the values below against your scorecard."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5">
        <ul className="divide-y divide-rule-soft border-b border-rule-soft">
          {draft.subjects.map((subject, index) => {
            const incomplete =
              subject.questions == null ||
              subject.correct == null ||
              subject.incorrect == null;
            return (
              <li key={`${subject.subjectId}-${index}`} className="py-2.5">
                <div className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate font-serif text-[15px] text-ink">
                    {SUBJECTS[subject.subjectId].name}
                  </span>
                  {incomplete ? (
                    <span className="shrink-0 text-[11px] font-medium text-warning">
                      Needs a value
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-baseline gap-2.5 text-[11px] tabular text-muted">
                      <span>{subject.questions}Q</span>
                      <span className="font-medium text-positive">
                        {subject.correct} ✓
                      </span>
                      <span className="font-medium text-danger">
                        {subject.incorrect} ✗
                      </span>
                    </span>
                  )}
                </div>
                {incomplete && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(
                      [
                        ["questions", "Questions"],
                        ["correct", "Correct"],
                        ["incorrect", "Wrong"],
                      ] as const
                    ).map(([field, label]) => (
                      <label
                        key={field}
                        className="text-[10px] font-medium text-muted"
                      >
                        {label}
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={subject[field] ?? ""}
                          onChange={(event) =>
                            setSubject(index, {
                              [field]:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            })
                          }
                          className="mt-1 h-10 w-full px-2 text-sm"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {warnings.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {warnings.map((issue) => (
              <li
                key={`${issue.code}-${issue.path ?? ""}`}
                className="border-l-2 border-l-warning pl-2.5 text-[11px] leading-relaxed text-muted"
              >
                {issue.message}
              </li>
            ))}
          </ul>
        )}
        {blockers.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {blockers.map((issue) => (
              <li
                key={`${issue.code}-${issue.path ?? ""}`}
                role="alert"
                className="border-l-2 border-l-danger pl-2.5 text-[11px] leading-relaxed text-danger"
              >
                {issue.message}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-rule-soft px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 sm:min-h-0"
            onClick={onBack}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-0"
            onClick={onOpenDetails}
          >
            Edit details
          </Button>
          <Button
            type="button"
            size="sm"
            className="ml-auto min-h-11 sm:min-h-0"
            onClick={onContinue}
            disabled={!ready}
          >
            Continue to the form
            <ChevronRight size={13} />
          </Button>
        </div>
      </div>
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
  const { activeShape } = useExamScope();
  // The tab opens only inside the workspace; the exam scope resolves in the
  // same tick the shell renders. Keep the JSX type-safe while it loads.
  const shape = activeShape ?? {
    examId: "cgl",
    tierId: "tier2",
    subjects: [
      { subjectId: "quant", questions: 30, qualifying: false },
      { subjectId: "reasoning", questions: 30, qualifying: false },
      { subjectId: "english", questions: 45, qualifying: false },
      { subjectId: "ga", questions: 25, qualifying: false },
      { subjectId: "computer", questions: 20, qualifying: true },
    ],
    marking: { correct: 3, incorrect: 1 },
    sections: [],
  };
  const [paste, setPaste] = useState("");
  const [draft, setDraft] = useState<ExtractionDraft | null>(null);
  /* false = paste step, "roster" = the parsed summary, "details" = the full
     field editor. The roster is the default review surface. */
  const [reviewing, setReviewing] = useState<false | "roster" | "details">(
    false,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusChecked, setStatusChecked] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  // Re-check AI availability when the tab opens (cheap status call).
  useEffect(() => {
    let cancelled = false;
    void api<{ enabled: boolean }>("/api/ai/status")
      .then((status) => {
        if (!cancelled) setAiEnabled(Boolean(status.enabled));
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
      const result = await api<{ draft?: ExtractionDraft }>("/api/ai/extract", {
        method: "POST",
        body: JSON.stringify({ text: paste }),
      });
      if (!result.draft) throw new Error("Could not arrange this report.");
      setDraft(result.draft);
      setReviewing("roster");
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
      const parsed = parseReport(shape, paste);
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
      const reviewed = extractionToAttempt(shape, draft, "");
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
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SubjectRoster
            draft={draft}
            onChange={setDraft}
            onOpenDetails={() => setReviewing("details")}
            onBack={() => {
              setReviewing(false);
              setError("");
            }}
            onContinue={useReviewed}
            error={error}
          />
        </div>
      </div>
    );
  }

  if (reviewing === "details" && draft) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
        <ExtractionReview
          draft={draft}
          shape={shape}
          onChange={setDraft}
          onUse={useReviewed}
          onBack={() => setReviewing("roster")}
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
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
      <h3 className="font-serif text-[1.375rem] font-medium leading-tight text-ink">
        Log a mock test
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Paste the scorecard. You review the parsed subjects here, then continue
        to the mock form — the only place that saves.
      </p>
      <label
        htmlFor="ai-log-mock-paste"
        className="mt-4 block text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted"
      >
        Scorecard text
      </label>
      <textarea
        id="ai-log-mock-paste"
        rows={10}
        maxLength={MAX_EXTRACT_CHARS}
        value={paste}
        onChange={(event) => setPaste(event.target.value)}
        placeholder="Paste the full scorecard section…"
        className="mt-1.5 min-h-48 max-h-80 resize-y text-sm leading-relaxed"
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
        <span>
          {paste.length.toLocaleString("en-IN")} /{" "}
          {MAX_EXTRACT_CHARS.toLocaleString("en-IN")} characters
        </span>
        <button
          type="button"
          className="-my-2 inline-flex min-h-11 items-center px-1 hover:text-accent"
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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {aiEnabled ? (
          <Button
            type="button"
            className="min-h-11 w-full sm:min-h-0 sm:w-auto"
            onClick={() => void importWithAi()}
            disabled={!paste.trim() || busy}
          >
            <Sparkles size={13} /> {busy ? "Reading…" : "Parse with AI"}
          </Button>
        ) : (
          <Button
            type="button"
            className="min-h-11 w-full sm:min-h-0 sm:w-auto"
            onClick={importStandard}
            disabled={!paste.trim()}
          >
            <ClipboardPaste size={13} /> Parse report
          </Button>
        )}
      </div>
      <p className="mt-4 flex items-start gap-2 border-t border-rule-soft pt-3 text-xs leading-relaxed text-muted">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>
          {aiEnabled
            ? "AI parsing returns an editable draft with cross-checks; you review every field before continuing."
            : "Standard parsing works without AI. AI-assisted parsing appears once a provider is set up in Settings → AI provider."}
        </span>
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
