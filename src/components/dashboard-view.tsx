"use client";
import type { ReactNode } from "react";
import { Panel } from "./dashboard-panels";
import { PlainIcon } from "./icon";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { DashboardOverview } from "./dashboard-overview";
import { AttemptRecordCard } from "./attempt-outcome-card";
import { PerformanceOverview } from "./performance-overview";
import { PlanErrorCard } from "./plan/plan-shared";
import {
  PlanProgressPanel,
  RevisionQueuePanel,
  TodayFocusPanel,
  UpcomingTestsPanel,
  type PlanWithToday,
} from "./plan/dashboard-plan-sections";
import type { usePlanData } from "./use-plan-data";
import type { Analytics } from "@/lib/analytics";
import type { Attempt } from "@/lib/domain";
import { PersonalTodos } from "./plan/personal-todos";
import { CalendarView } from "./plan/calendar-view";
import { istTodayIso } from "@/lib/plan/view-model";

/**
 * Dashboard composition. The overview answers "where am I?", the primary
 * column answers "what do I do next?", and the secondary column keeps plan
 * progress, revision, personal tasks and the coach in view. Performance
 * analysis stays below as a distinct, scope-aware section.
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
  onAddMock,
  studyAttempts,
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
  onAddMock: (date: string) => void;
  studyAttempts: Attempt[];
}) {
  const plan = planApi.plan as PlanWithToday | null;
  const today = plan?.today ?? istTodayIso();

  return (
    <div aria-busy={loading}>
      <DashboardOverview
        plan={plan}
        analytics={analytics}
        target={target}
        loading={loading}
      />

      <section
        className="mt-5 border-t border-rule pt-4"
        aria-labelledby="today-plan-heading"
      >
        <h2 id="today-plan-heading" className="mb-4 font-serif text-2xl">
          Today&apos;s Plan
        </h2>
        {planApi.error && !plan ? (
          <PlanErrorCard
            message={planApi.error}
            onRetry={() => void planApi.refresh()}
          />
        ) : !plan ? (
          <DashboardSkeleton />
        ) : (
          <TodayFocusPanel
            plan={plan}
            today={today}
            planApi={planApi}
            onOpenDay={onOpenDay}
          />
        )}
        <div className="mt-4">
          <PersonalTodos compact initialDate={today} />
        </div>
      </section>
      <section
        className="mt-6 border-t border-rule pt-4"
        aria-labelledby="study-calendar-heading"
      >
        <div className="mb-4">
          <h2 id="study-calendar-heading" className="font-serif text-2xl">
            Study Calendar
          </h2>
          <p className="mt-1 text-xs text-muted">
            Your structured study schedule and mock tests.
          </p>
        </div>
        <CalendarView
          planApi={planApi}
          attempts={studyAttempts}
          onAddMock={onAddMock}
          onOpenAttempt={onOpenAttempt}
        />
      </section>
      {plan && (
        <div className="mt-6 grid items-start gap-4 xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <PlanProgressPanel plan={plan} today={today} />
            <UpcomingTestsPanel
              plan={plan}
              today={today}
              onOpenDay={onOpenDay}
            />
            <RevisionQueuePanel plan={plan} today={today} />
          </div>
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

function DashboardSkeleton() {
  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
