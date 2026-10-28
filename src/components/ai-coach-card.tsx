"use client";
import { AlertCircle, MessageSquare, RefreshCw, Sparkles } from "lucide-react";
import { Panel } from "./dashboard-panels";
import { Button } from "./ui/button";
import type { AiStatus, CoachMeta } from "@/lib/ai/client-types";
import type { CoachInsight } from "@/lib/ai/schemas";
import { longDate } from "@/lib/format";

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-2">
          <span aria-hidden="true" className="text-accent mt-[2px]">
            —
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function AiCoachCard({
  status,
  insight,
  meta,
  busy,
  error,
  onGenerate,
  onOpenChat,
}: {
  status: AiStatus;
  insight: CoachInsight | null;
  meta: CoachMeta | null;
  busy: boolean;
  error: string;
  onGenerate: () => void;
  onOpenChat: () => void;
}) {
  const usage = status.usage;
  const dataDate = meta?.dataAsOf ? longDate(meta.dataAsOf) : null;
  return (
    <Panel
      title="AI coach"
      description="Get personalized guidance based on your recent mocks."
      className="mb-6"
      action={
        <Button
          size="sm"
          variant={insight ? "outline" : "default"}
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
      <div className="px-6 pb-5">
        {error && (
          <p
            role="alert"
            className="mb-4 flex items-start gap-2 border border-warning bg-warning-soft px-4 py-3 text-xs text-warning"
          >
            <AlertCircle size={14} className="mt-[1px] shrink-0" />
            {error}
          </p>
        )}

        {!insight && !busy && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Generate a short, evidence-based read of your preparation. It uses
            your aggregate analytics and the latest 20 full mocks. Your notes
            are never included, and nothing is saved automatically.
          </p>
        )}

        {!insight && busy && (
          <p role="status" className="text-sm text-muted">
            Reading your saved mocks…
          </p>
        )}

        {insight && (
          <>
            <h3 className="font-serif text-xl leading-snug">
              {insight.headline}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed">
              {insight.summary}
            </p>

            <div className="mt-5 grid gap-5 border-t border-rule-soft pt-5 md:grid-cols-2">
              <div>
                <p className="section-label mb-2">Working well</p>
                <Bullets items={insight.strengths} />
              </div>
              <div>
                <p className="section-label mb-2">Needs attention</p>
                <Bullets items={insight.focusAreas} />
              </div>
            </div>

            <div className="mt-5 border-t border-rule-soft pt-5">
              <p className="section-label mb-2">Next actions</p>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                {insight.nextActions.map((action, index) => (
                  <li key={`${index}-${action}`}>{action}</li>
                ))}
              </ol>
            </div>

            {insight.caveats.length > 0 && (
              <div className="mt-5 border-l-2 border-rule pl-4">
                {insight.caveats.map((caveat) => (
                  <p
                    key={caveat}
                    className="text-xs leading-relaxed text-muted"
                  >
                    {caveat}
                  </p>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-rule-soft pt-4">
              <p className="text-[11px] text-muted">
                {meta
                  ? `Based on ${meta.coverage.totalAttempts} saved result${meta.coverage.totalAttempts === 1 ? "" : "s"} and ${meta.coverage.recentFullMocksIncluded} recent full mock${meta.coverage.recentFullMocksIncluded === 1 ? "" : "s"}${dataDate ? ` · data to ${dataDate}` : ""}.`
                  : "Based on your saved results."}{" "}
                AI can be wrong; your saved data is the source of truth.
              </p>
              <Button size="sm" variant="outline" onClick={onOpenChat}>
                <MessageSquare size={14} /> Ask a follow-up
              </Button>
            </div>
          </>
        )}

        {!insight && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule-soft pt-4">
            <p className="text-[11px] text-muted">
              Only aggregates and the latest 20 full mocks are sent to the
              configured AI provider. Notes, email, and user identity are never
              sent.
            </p>
            <Button size="sm" variant="outline" onClick={onOpenChat}>
              <MessageSquare size={14} /> Ask a question
            </Button>
          </div>
        )}

        {usage && (
          <p className="mt-3 text-[11px] text-muted tabular">
            Today: {usage.requests} / {usage.limits.requests} requests ·{" "}
            {usage.tokens.toLocaleString("en-IN")} /{" "}
            {usage.limits.tokens.toLocaleString("en-IN")} tokens charged
          </p>
        )}
      </div>
    </Panel>
  );
}
