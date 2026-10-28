"use client";
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Panel } from "./dashboard-panels";
import { PlainIcon, DuotoneTile } from "./icon";
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
import { WeekStripPanel, WeekStripSkeleton } from "./plan/week-strip";
import type { usePlanData } from "./use-plan-data";
import type { Analytics } from "@/lib/analytics";
import type { Attempt } from "@/lib/domain";
import { PersonalTodos } from "./plan/personal-todos";
import {
  addIsoDays,
  dayAssignmentStats,
  istTodayIso,
  isoWeekdayName,
} from "@/lib/plan/view-model";
import { longDate } from "@/lib/format";
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
  onOpenPersonalAi,
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
  /** Opens the shell AI chat on the Plan-todos tab. */
  onOpenPersonalAi?: () => void;
}) {
  const plan = planApi.plan as PlanWithToday | null;
  const today = plan?.today ?? istTodayIso();
  const [mobilePane, setMobilePane] = useState<"study" | "personal">("study");
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const activeDate = focusDate ?? today;
  const shiftFocus = (delta: number) => {
    if (!plan) return;
    const next = addIsoDays(activeDate, delta);
    if (next >= plan.startDate && next <= plan.endDate) setFocusDate(next);
  };
  const heroDay = plan?.days.find((day) => day.date === activeDate);
  const heroStats = heroDay ? dayAssignmentStats(heroDay) : null;
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
        onOpenToday={() => onOpenDay(today)}
        onViewAll={onViewAll}
      />

      <section
        className="mt-5 border-t border-rule pt-4"
        aria-labelledby="today-plan-heading"
      >
        <div className="flex min-w-0 items-center gap-3">
          <DuotoneTile name="book" tile="accent" className="size-10" />
          <div className="min-w-0">
            <h2 id="today-plan-heading" className="font-serif text-2xl">
              Today&apos;s Plan
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Stay consistent. Complete your study plan and personal tasks for
              today.
            </p>
          </div>
        </div>
        {plan && (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button
              variant="outline"
              size="icon"
              className="size-10"
              aria-label="Previous day"
              disabled={activeDate <= plan.startDate}
              onClick={() => shiftFocus(-1)}
            >
              <ChevronLeft size={17} />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-balance font-serif text-2xl leading-tight tracking-[-0.02em] sm:text-[28px]">
                {isoWeekdayName(activeDate)}, {longDate(activeDate)}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                {heroDay ? (
                  <>
                    <span>
                      Day {heroDay.day} of 50 ·{" "}
                      {plan.phases.find((item) => item.phase === heroDay.phase)
                        ?.name ?? `Phase ${heroDay.phase}`}{" "}
                      · {heroDay.dayType}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular">
                      {heroStats?.completed ?? 0}/{heroStats?.total ?? 0} done
                    </span>
                  </>
                ) : (
                  <span>Outside the plan window</span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="size-10"
              aria-label="Next day"
              disabled={activeDate >= plan.endDate}
              onClick={() => shiftFocus(1)}
            >
              <ChevronRight size={17} />
            </Button>
            {activeDate !== today && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusDate(null)}
              >
                Today
              </Button>
            )}
          </div>
        )}
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
                key={activeDate}
                plan={plan}
                today={today}
                date={activeDate}
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
            <PersonalTodos
              compact
              dashboardColumn
              initialDate={today}
              focusDate={activeDate}
              onOpenAi={onOpenPersonalAi}
            />
          </div>
        </div>
      </section>

      <section className="mt-6" aria-label="This week">
        {plan ? (
          <WeekStripPanel plan={plan} today={today} onOpenDay={onOpenDay} />
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
      description="Actual attempt data from your latest mocks."
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
