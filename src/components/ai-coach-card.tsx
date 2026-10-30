"use client";
import { AlertCircle, MessageSquare, RefreshCw, Sparkles } from "lucide-react";
import { Panel } from "./dashboard-panels";
import { Button } from "./ui/button";
import type { AiStatus } from "@/lib/ai/client-types";
import type { CoachInsight } from "@/lib/ai/schemas";

/**
 * The dashboard's coach launcher. Generation runs against the coach endpoint
 * and the result streams into the AI chat sheet — this card stays a compact
 * entry point: last headline as a teaser, errors, and usage. The full reading
 * lives in the conversation, where follow-up questions continue from it.
 */
export function AiCoachCard({
  status,
  insight,
  busy,
  error,
  onGenerate,
  onOpenChat,
}: {
  status: AiStatus;
  insight: CoachInsight | null;
  busy: boolean;
  error: string;
  onGenerate: () => void;
  onOpenChat: () => void;
}) {
  const usage = status.usage;
  return (
    <Panel
      title="AI coach"
      description="Guidance from your recent mocks, in the chat panel."
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={onGenerate}
          disabled={busy}
        >
          {busy ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {busy ? "Reading…" : insight ? "Regenerate" : "Generate insight"}
        </Button>
      }
    >
      <div className="px-4 pb-4 sm:px-6 sm:pb-5">
        {error && (
          <p
            role="alert"
            className="mb-4 flex items-start gap-2 border border-warning bg-warning-soft px-4 py-3 text-xs text-warning"
          >
            <AlertCircle size={14} className="mt-[1px] shrink-0" />
            {error}
          </p>
        )}

        {insight ? (
          <button
            type="button"
            onClick={onOpenChat}
            className="block w-full rounded-control border border-rule-soft bg-canvas px-4 py-3 text-left transition-colors hover:border-accent/40"
          >
            <span className="flex items-center gap-1.5 text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-accent">
              <Sparkles size={11} /> Latest insight
            </span>
            <span className="mt-1.5 block truncate font-serif text-[0.9375rem] font-medium leading-snug">
              {insight.headline}
            </span>
            <span className="mt-1 block truncate text-xs text-muted">
              Open the chat to read the full breakdown
            </span>
          </button>
        ) : (
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            {busy
              ? "Reading your saved mocks — the insight opens in the chat panel."
              : "Generate a short, evidence-based read of your preparation. It opens in the chat panel, where you can ask follow-ups."}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule-soft pt-4">
          <p className="text-[0.6875rem] text-muted">
            Only aggregates and the latest 20 full mocks are sent to the
            configured AI provider. Notes, email, and user identity are never
            sent.
          </p>
          <Button size="sm" variant="outline" onClick={onOpenChat}>
            <MessageSquare size={14} /> Ask a question
          </Button>
        </div>

        {usage && (
          <p className="mt-3 text-[0.6875rem] text-muted tabular">
            Today: {usage.requests} / {usage.limits.requests} requests ·{" "}
            {usage.tokens.toLocaleString("en-IN")} /{" "}
            {usage.limits.tokens.toLocaleString("en-IN")} tokens charged
          </p>
        )}
      </div>
    </Panel>
  );
}
