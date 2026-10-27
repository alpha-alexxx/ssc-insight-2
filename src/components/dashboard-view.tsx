"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Panel } from "./dashboard-panels";
import { PlainIcon } from "./icon";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { DashboardOverview } from "./dashboard-overview";
import { AttemptRecordCard } from "./attempt-outcome-card";
import { PerformanceOverview } from "./performance-overview";
import { PlanErrorCard } from "./plan/plan-shared";
import {
  StudyPipelinePanel,
  TodayFocusPanel,
  type PlanWithToday,
} from "./plan/dashboard-plan-sections";
import { WeekStrip, WeekStripSkeleton } from "./plan/week-strip";
import type { usePlanData } from "./use-plan-data";
import type { Analytics } from "@/lib/analytics";
import type { Attempt } from "@/lib/domain";
import { PersonalTodos } from "./plan/personal-todos";
import { istTodayIso } from "@/lib/plan/view-model";
import { cn } from "@/lib/utils";

/**
 * Dashboard composition. The metric strip answers "where am I?", Today's Plan
 * pairs the study day with the personal task column side by side (tabbed
 * below lg), the week strip replaces the full calendar, and the pipeline
 * column keeps progress, revision and the coach in view. Performance analysis
 * stays below as a distinct, scope-aware section.
 */
export function DashboardView({
  planApi,
  analytics,
  attempts,
  target,
  loading,
  scopeControls,
  coach,
  onOpenAttempt,
  onAdd,
  onViewAll,
  onOpenDay,
}: {
  planApi: ReturnType<typeof usePlanData>;
  analytics: Analytics | null;
  attempts: Attempt[];
  target: number | null;
  loading: boolean;
  scopeControls: ReactNode;
  coach?: ReactNode;
  onOpenAttempt: (attempt: Attempt) => void;
  onAdd: () => void;
  onViewAll: () => void;
  onOpenDay: (date: string) => void;
}) {
  const plan = planApi.plan as PlanWithToday | null;
  const today = plan?.today ?? istTodayIso();
  const [mobilePane, setMobilePane] = useState<"study" | "personal">("study");
  const personalOverdue =
    planApi.personalTasks?.filter(
      (task) =>
        task.status !== "completed" && task.dueDate && task.dueDate < today,
    ).length ?? null;

  return (
    <div aria-busy={loading}>
      <DashboardOverview
        plan={plan}
        analytics={analytics}
        target={target}
        loading={loading}
        personalOverdue={personalOverdue}
      />

      <section
        className="mt-5 border-t border-rule pt-4"
        aria-labelledby="today-plan-heading"
      >
        <h2 id="today-plan-heading" className="mb-4 font-serif text-2xl">
          Today&apos;s Plan
        </h2>
        <div
          role="group"
          aria-label="Switch between the study plan and personal tasks"
          className="segment-group mb-3 lg:hidden"
        >
          <button
            type="button"
            className="segment"
            aria-pressed={mobilePane === "study"}
            onClick={() => setMobilePane("study")}
          >
            Study
          </button>
          <button
            type="button"
            className="segment"
            aria-pressed={mobilePane === "personal"}
            onClick={() => setMobilePane("personal")}
          >
            Personal
          </button>
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div
            className={cn(
              "min-w-0",
              mobilePane !== "study" && "hidden lg:block",
            )}
          >
            {planApi.error && !plan ? (
              <PlanErrorCard
                message={planApi.error}
                onRetry={() => void planApi.refresh()}
              />
            ) : !plan ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-52 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <TodayFocusPanel
                plan={plan}
                today={today}
                planApi={planApi}
                onOpenDay={onOpenDay}
              />
            )}
          </div>
          <div
            className={cn(
              "min-w-0",
              mobilePane !== "personal" && "hidden lg:block",
            )}
          >
            <PersonalTodos compact dashboardColumn initialDate={today} />
          </div>
        </div>
      </section>

      <section
        className="mt-6 border-t border-rule pt-4"
        aria-labelledby="this-week-heading"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="this-week-heading" className="font-serif text-2xl">
              This week
            </h2>
            <p className="mt-1 text-xs text-muted">
              Three days around today. Pick a day to open its plan.
            </p>
          </div>
          <Link
            href="/calendar"
            className="text-[10px] font-medium text-accent hover:text-accent-hover"
          >
            Full calendar
          </Link>
        </div>
        {plan ? (
          <WeekStrip plan={plan} today={today} onOpenDay={onOpenDay} />
        ) : (
          <WeekStripSkeleton />
        )}
      </section>

      {plan && (
        <div className="mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <StudyPipelinePanel plan={plan} today={today} onOpenDay={onOpenDay} />
          <div className="flex min-w-0 flex-col gap-4">
            <RecentAttemptsPanel
              attempts={attempts}
              onOpenAttempt={onOpenAttempt}
              onAdd={onAdd}
              onViewAll={onViewAll}
            />
            {coach}
          </div>
        </div>
      )}

      <section className="mt-6" aria-labelledby="performance-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-3">
          <div>
            <h2
              id="performance-heading"
              className="font-serif text-[22px] font-medium tracking-[-0.025em]"
            >
              Performance
            </h2>
            <p className="mt-1 text-[11px] text-muted">
              Saved results, trends, and answer breakdowns. Filters apply below.
            </p>
          </div>
          <div className="min-w-0 max-w-full">{scopeControls}</div>
        </div>
        <PerformanceOverview analytics={analytics} target={target} />
      </section>
    </div>
  );
}

function RecentAttemptsPanel({
  attempts,
  onOpenAttempt,
  onAdd,
  onViewAll,
}: {
  attempts: Attempt[];
  onOpenAttempt: (attempt: Attempt) => void;
  onAdd: () => void;
  onViewAll: () => void;
}) {
  const visible = attempts.slice(0, 4);
  return (
    <Panel
      dense
      icon="history"
      title="Recent attempts"
      description="Actual attempt dates, newest first."
      action={
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-hover"
        >
          View all <PlainIcon name="arrowRight" size={12} />
        </button>
      }
    >
      <div className="px-4 pb-3.5">
        {visible.length ? (
          <ul className="flex flex-col gap-2">
            {visible.map((attempt) => (
              <li key={attempt.id}>
                <AttemptRecordCard attempt={attempt} onOpen={onOpenAttempt} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-control border border-rule-soft bg-canvas px-4 py-4 text-center">
            <p className="text-xs text-muted">
              No saved attempts match this view.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="outline" onClick={onViewAll}>
                Open history
              </Button>
              <Button size="sm" onClick={onAdd}>
                <PlainIcon name="plus" size={13} /> Log a mock
              </Button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
