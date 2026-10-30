"use client";
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Panel } from "./dashboard-panels";
import { PlainIcon, DuotoneTile } from "./icon";
import { Separator } from "./ui/separator";
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
        {/* An editorial head rather than a card: a small-caps dateline carries
            the plan position, the serif title names the section, and one
            hairline closes it before the panels. The old book tile repeated
            the tile inside the Study Plan panel directly below, and the old
            dateline repeated that panel's "Day X of 50 · MOCK DAY" line — so
            the position lives here once, and the panel now names the phase. */}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <p
              className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted"
              aria-live="polite"
            >
              {activeDay ? (
                <>
                  <span className="tabular text-ink">
                    Day {activeDay.day} of {totalDays}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span
                    className={cn(
                      activeDay.dayType.includes("MOCK") && "text-accent",
                    )}
                  >
                    {dayTypeLabel(activeDay.dayType)}
                  </span>
                </>
              ) : (
                "Plan overview"
              )}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2
                id="today-plan-heading"
                className="font-serif text-[1.375rem] font-medium leading-[1.2] tracking-[-0.025em] text-ink"
              >
                What&apos;s the Plan!
              </h2>
              {/* The return control sits beside the title, not in the arrow
                  cluster: it only appears once the day has stepped away, so
                  the arrows can never slide out from under the pointer. */}
              {plan && activeDate !== today && (
                <button
                  type="button"
                  onClick={() => setFocusDate(null)}
                  className="text-[0.6875rem] font-medium text-accent underline decoration-accent/40 underline-offset-[3px] transition-colors hover:decoration-accent motion-reduce:transition-none"
                >
                  Back to today
                </button>
              )}
            </div>
          </div>
          {plan && (
            <div
              role="group"
              aria-label="Change the plan day"
              className="flex h-9 w-full items-stretch divide-x divide-rule-soft overflow-hidden rounded-control border border-rule-soft bg-paper sm:w-auto sm:shrink-0"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Previous day"
                    disabled={activeDate <= plan.startDate}
                    onClick={() => shiftFocus(-1)}
                    className="flex w-8 items-center justify-center text-muted transition-colors hover:bg-soft hover:text-ink disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none"
                  >
                    <ChevronLeft size={15} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Previous day</TooltipContent>
              </Tooltip>
              {/* The dateline is the head's only live region: repeating it on
                  the title block would announce the same day change twice. */}
              <p
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 px-3 font-serif text-[0.9375rem] font-medium tabular tracking-[-0.01em] sm:flex-none",
                  activeDate === today ? "text-ink" : "text-accent",
                )}
              >
                {isoWeekdayShort(activeDate)}, {longDate(activeDate)}
                {activeDate === today && (
                  <span className="rounded-pill bg-ink px-1.5 py-px font-sans text-[0.5625rem] font-semibold uppercase tracking-[0.08em] text-paper">
                    Today
                  </span>
                )}
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Next day"
                    disabled={activeDate >= plan.endDate}
                    onClick={() => shiftFocus(1)}
                    className="flex w-8 items-center justify-center text-muted transition-colors hover:bg-soft hover:text-ink disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none"
                  >
                    <ChevronRight size={15} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Next day</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
        {/* The Study/Personal switch rides inside the head, under the title,
            on its own rule-to-rule row at phone widths — it used to float on
            the canvas as a third stacked bar between the title and the
            panels. It is full-width until the two panes can sit side by side
            (lg), which is exactly when the switch stops being needed. */}
        <div
          role="group"
          aria-label="Switch between the study plan and personal tasks"
          className="segment-group is-block mt-3 lg:hidden"
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
        <div className="mt-4 h-px bg-rule-soft" aria-hidden="true" />
        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
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
        {/* The section opens with a toolbar card: an identity row (duotone
            tile, serif title, subtitle), a full-bleed hairline, then the
            control row — scope tabs left, platform/date filters right —
            everything on paper inside the panel. */}
        <div className="panel mb-6">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <DuotoneTile
              name="report"
              tile="accent"
              className="size-10 shrink-0"
            />
            <div className="min-w-0">
              <h2 id="performance-heading" className="panel-title">
                Performance
              </h2>
              <p className="mt-0.5 text-[0.6875rem] leading-snug text-muted">
                Track your mock results and identify areas to improve.
              </p>
            </div>
          </div>
          <Separator />
          <div className="px-4 py-3 sm:px-5">{scopeControls}</div>
        </div>
        {/* A scope change re-fetches analytics; say so, rather than letting
            the charts quietly swap under the heading. */}
        {loading && analytics && (
          <p
            role="status"
            className="mt-3 flex items-center gap-1.5 text-[0.6875rem] text-muted"
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
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[0.625rem] font-medium text-accent hover:text-accent-hover"
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
