"use client";
import Link from "next/link";
import { Panel } from "./dashboard-panels";
import { PlainIcon } from "./icon";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { ScoreBand } from "./performance/score-band";
import { Sparkline } from "./performance/sparkline";
import { sparklinePoints } from "@/lib/performance-metrics";
import type { Analytics } from "@/lib/analytics";

/**
 * The dashboard's performance preview: awareness, not analysis.
 *
 * The full workspace lives at `/performance`; this panel exists so the
 * command center can say where the last result landed without becoming a
 * second report. It reuses the same `ScoreBand` and the same
 * `headlineMetrics`/`sparklinePoints` derivations as that page, which is what
 * stops "Latest" reading differently in two places.
 *
 * It reads `analytics` for the `"all"` scope, so this preview and the
 * dashboard's own "Latest result" cell describe the same population.
 */
export function PerformancePreview({
  analytics,
  target,
  loading,
  href = "/performance",
  onAdd,
}: {
  analytics: Analytics | null;
  target: number | null;
  loading: boolean;
  /** The performance address, carrying the current scope/filters. */
  href?: string;
  onAdd: () => void;
}) {
  const points = analytics ? sparklinePoints(analytics.trend.points) : [];
  const hasResults = !!analytics && analytics.pointCount > 0;

  return (
    <Panel
      icon="report"
      title="Performance"
      description="How your recent results are moving. The full analysis lives on its own page."
      action={
        <Button asChild variant="outline" size="sm" className="h-8">
          <Link href={href}>
            View performance <PlainIcon name="arrowRight" size={12} />
          </Link>
        </Button>
      }
    >
      <div className="px-4 pb-4 sm:px-5">
        {loading && !analytics ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : !hasResults ? (
          <div className="rounded-control border border-rule-soft bg-canvas px-4 py-6 text-center">
            <p className="text-xs text-muted">
              No saved result yet. Once you log a mock, this panel shows your
              latest score, recent average, accuracy and the gap to your target.
            </p>
            <Button size="sm" className="mt-3" onClick={onAdd}>
              <PlainIcon name="plus" size={13} /> Log a mock
            </Button>
          </div>
        ) : (
          <>
            {/* The same band the analytics page opens with. `.score-band` is
                the sanctioned surface for these figures — a second
                `.metric-strip` here would repeat the headline metrics in a
                second stat strip, which DESIGN.md forbids. */}
            <ScoreBand analytics={analytics} target={target} variant="preview" />
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Sparkline
                points={points}
                target={
                  analytics.target.comparable
                    ? analytics.target.percentage
                    : null
                }
                className="h-11 min-w-[9rem] flex-1"
              />
              <p className="text-[0.625rem] leading-relaxed text-muted">
                {points.length > 1
                  ? `Last ${points.length} results, by attempt date.`
                  : "One result saved — a trend appears after the second."}
              </p>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
