"use client";
import type { ReactNode } from "react";
import { PageHeader } from "../page-header";
import { PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { PerformanceOverview } from "../performance-overview";
import { ScoreBand } from "./score-band";
import { FindingsPanel } from "./findings-panel";
import { useExamScope } from "../exam-context";
import { Swap } from "../motion-swap";
import { EmptyChart } from "../dashboard-panels";
import { findings, isSingleResult } from "@/lib/performance-metrics";
import type { Analytics } from "@/lib/analytics";
import type { Attempt } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * `/performance` — the dedicated analytical workspace.
 *
 * The dashboard answers "what should I do today"; this page answers "how am I
 * improving, where am I weak". The scope tabs and filters that used to sit on
 * the dashboard live here, so the two surfaces no longer compete for the same
 * first screen.
 *
 * Order is deliberate: the KPI band states where you are, the findings name
 * what the numbers show, and the charts below are the evidence a reader can
 * check them against.
 *
 * Every figure reads the one analytics payload the shell already holds; the
 * shared derivations live in `@/lib/performance-metrics` so a number shown
 * here and on the dashboard preview cannot diverge.
 */
export function PerformanceView({
  analytics,
  target,
  loading,
  controls,
  onAdd,
}: {
  analytics: Analytics | null;
  target: number | null;
  loading: boolean;
  /** The scope + filter control row, owned by the shell's workspace state. */
  controls: ReactNode;
  onOpenAttempt?: (attempt: Attempt) => void;
  onAdd: () => void;
}) {
  const examScope = useExamScope();
  const examLabel = examScope.exams
    ? examScope.activeTierId === "all"
      ? `${examScope.activeExamId.toUpperCase()} · All tiers`
      : examScope.examLabel(examScope.activeExamId, examScope.activeTierId)
    : null;

  const empty = !!analytics && analytics.pointCount === 0;

  return (
    <>
      <PageHeader
        title="Performance"
        description="Track your mock results and identify areas to improve."
        meta={
          <>
            {examLabel && (
              <>
                <span>{examLabel}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>All dates in India Standard Time</span>
          </>
        }
        actions={
          <Button size="sm" onClick={onAdd}>
            <PlainIcon name="plus" size={14} /> Add mock
          </Button>
        }
      />

      <div className="panel mb-4 px-4 py-3 sm:px-5">{controls}</div>

      {/* A scope change re-fetches analytics; say so, rather than letting the
          charts quietly swap under the heading. */}
      {loading && analytics && (
        <p
          role="status"
          className="mb-3 flex items-center gap-1.5 text-[0.6875rem] text-muted"
        >
          <PlainIcon name="refresh" size={12} className="animate-spin" />
          Updating your results…
        </p>
      )}

      <div
        className={cn(
          "transition-opacity duration-150 motion-reduce:transition-none",
          loading && analytics && "opacity-60",
        )}
      >
        <Swap swapKey={analytics?.scope ?? "none"}>
          {empty ? (
            <div className="panel">
              <EmptyChart>
                No saved result matches this view. Log a mock, or widen the
                filters above.
              </EmptyChart>
            </div>
          ) : analytics ? (
            <>
              <ScoreBand analytics={analytics} target={target} />
              <FindingsPanel
                findings={findings(analytics)}
                className="mt-4"
              />
              {isSingleResult(analytics) && (
                <p className="mt-4 rounded-control border border-rule-soft bg-canvas px-4 py-3 text-[0.6875rem] leading-relaxed text-muted">
                  One result is saved in this view. The summary above is
                  exact, but trends, distributions and subject comparisons need
                  a second attempt before they can say anything honest.
                </p>
              )}
              <div className="mt-6">
                <PerformanceOverview analytics={analytics} target={target} />
              </div>
            </>
          ) : (
            <div className="panel">
              <EmptyChart>Loading your preparation…</EmptyChart>
            </div>
          )}
        </Swap>
      </div>
    </>
  );
}
