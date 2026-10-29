"use client";
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Panel } from "./dashboard-panels";
import { PlainIcon, DuotoneTile } from "./icon";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import { Swap } from "./motion-swap";
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
  dayTypeLabel,
  istTodayIso,
  isoWeekdayShort,
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
  const personalOverdue =
    planApi.personalTasks?.filter(
      (task) =>
        task.status !== "completed" && task.dueDate && task.dueDate < today,
    ).length ?? null;
  const activeDay = plan?.days.find((day) => day.date === activeDate) ?? null;
  const activeDayStats = activeDay ? dayAssignmentStats(activeDay) : null;
  const totalDays = plan?.days.length ?? 0;

  return (
    <div aria-busy={loading}>
      <DashboardOverview
        plan={plan}
        analytics={analytics}
        loading={loading}
        personalOverdue={personalOverdue}
        onOpenToday={() => onOpenDay(today)}
        onViewAll={onViewAll}
      />

      <section
        className="mt-8 border-t border-rule pt-5"
        aria-labelledby="today-plan-heading"
      >
        {/* Section head rebuilt on Tailwind + shadcn primitives (no extracted
            .section-head/.day-nav CSS). The dateline is the quiet signature:
            a bare serif date between arrow buttons, flanked by live plan
            facts instead of static filler copy. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <DuotoneTile name="book" tile="accent" className="size-10 shrink-0" />
            <div className="min-w-0">
              <h2
                id="today-plan-heading"
                className="font-serif text-[22px] font-medium leading-[1.2] tracking-[-0.025em] text-ink"
              >
                Today&apos;s Plan
              </h2>
              {activeDay ? (
                <p
                  className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted"
                  aria-live="polite"
                >
                  <span className="font-medium tabular text-ink">
                    Day {activeDay.day} of {totalDays}
                  </span>
                  <span
                    aria-hidden="true"
                    className="size-0.5 rounded-full bg-rule"
                  />
                  <span
                    className={cn(
                      activeDay.dayType.includes("MOCK") &&
                        "font-medium text-accent",
                    )}
                  >
                    {dayTypeLabel(activeDay.dayType)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="size-0.5 rounded-full bg-rule"
                  />
                  <span className="tabular">
                    {activeDayStats?.completed ?? 0}/{activeDayStats?.total ?? 0}{" "}
                    done
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted">
                  Your 50-day study plan and personal tasks, side by side.
                </p>
              )}
            </div>
          </div>
          {plan && (
            <div
              role="group"
              aria-label="Change the plan day"
              className="flex items-center justify-center gap-1.5 lg:justify-end"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-control text-muted"
                    aria-label="Previous day"
                    disabled={activeDate <= plan.startDate}
                    onClick={() => shiftFocus(-1)}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous day</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 gap-1.5 px-3 font-serif text-[17px] font-medium tabular tracking-[-0.02em] hover:bg-soft",
                      activeDate !== today && "text-accent",
                    )}
                    onClick={() => setFocusDate(null)}
                  >
                    {isoWeekdayShort(activeDate)}, {longDate(activeDate)}
                    <ChevronRight
                      size={13}
                      aria-hidden="true"
                      className={cn(
                        "-mr-1 text-accent transition-all duration-150",
                        activeDate === today && "-translate-x-0.5 opacity-0",
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {activeDate === today
                    ? "Step to another day, then jump back here"
                    : "Back to today"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-control text-muted"
                    aria-label="Next day"
                    disabled={activeDate >= plan.endDate}
                    onClick={() => shiftFocus(1)}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next day</TooltipContent>
              </Tooltip>
              {/* Kept mounted with `invisible` rather than unmounted: adding
                  a control would widen the cluster and slide the arrows out
                  from under the pointer mid-stepping. */}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 border-accent/40 px-3 text-xs font-medium text-accent hover:bg-accent-soft hover:text-accent",
                  activeDate === today && "invisible",
                )}
                disabled={activeDate === today}
                aria-hidden={activeDate === today || undefined}
                tabIndex={activeDate === today ? -1 : undefined}
                onClick={() => setFocusDate(null)}
              >
                Today
              </Button>
            </div>
          )}
        </div>
        {/* Full-width segmented control on its own row: at phone widths the
            two panes cannot sit side by side, so the switch reads as a tab
            bar rather than an orphaned pill under the date. */}
        <div
          role="group"
          aria-label="Switch between the study plan and personal tasks"
          className="segment-group is-block mt-5 lg:hidden"
        >
          <button
            type="button"
            id="pane-tab-study"
            className="segment"
            aria-pressed={mobilePane === "study"}
            aria-controls="pane-study"
            onClick={() => setMobilePane("study")}
          >
            Study
          </button>
          <button
            type="button"
            id="pane-tab-personal"
            className="segment"
            aria-pressed={mobilePane === "personal"}
            aria-controls="pane-personal"
            onClick={() => setMobilePane("personal")}
          >
            Personal
          </button>
        </div>
        <div className="mt-5 grid items-start gap-4 lg:mt-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div
            id="pane-study"
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
              <Swap swapKey={activeDate}>
                <TodayFocusPanel
                  plan={plan}
                  today={today}
                  date={activeDate}
                  planApi={planApi}
                  onOpenDay={onOpenDay}
                />
              </Swap>
            )}
          </div>
          <div
            id="pane-personal"
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

      <section className="mt-8" aria-labelledby="performance-heading">
        {/* One control bar, per the mockup: tile + title block, hairline
            divider, then the scope segments and filters at one height. */}
        <div className="panel mb-6 flex flex-wrap items-center gap-x-0 gap-y-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3 pr-4 sm:pr-5">
            <DuotoneTile name="report" tile="accent" className="size-10" />
            <div className="min-w-0">
              <h2 id="performance-heading" className="panel-title">
                Performance
              </h2>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">
                Track your mock results and identify areas to improve.
              </p>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="hidden h-12 w-px shrink-0 bg-rule-soft lg:block"
          />
          <div className="min-w-0 flex-1 pl-0 lg:pl-5">{scopeControls}</div>
        </div>
        {/* A scope change re-fetches analytics; say so, rather than letting
            the charts quietly swap under the heading. */}
        {loading && analytics && (
          <p
            role="status"
            className="mb-3 flex items-center gap-1.5 text-[11px] text-muted"
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
            <PerformanceOverview analytics={analytics} target={target} />
          </Swap>
        </div>
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
