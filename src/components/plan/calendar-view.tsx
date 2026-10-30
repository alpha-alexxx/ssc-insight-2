"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../page-header";
import { DuotoneTile, PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { Swap } from "../motion-swap";
import { MetricStripSkeleton } from "../metric-strip";
import { Skeleton } from "../ui/skeleton";
import { PlanErrorCard } from "./plan-shared";
import { EventDialog } from "./event-dialog";
import { usePlanData } from "../use-plan-data";
import { istDateKey, longDate, monthDate, shortDate } from "@/lib/format";
import type { Attempt } from "@/lib/domain";
import {
  addIsoDays,
  findDayByDate,
  istTodayIso,
  weekRange,
  type PlanDayView,
  type PlanTaskView,
} from "@/lib/plan/view-model";
import { CalendarMetrics } from "./calendar/calendar-metrics";
import { AgendaView } from "./calendar/agenda-view";
import { CalendarSurface } from "./calendar/calendar-surface";
import { DayView } from "./calendar/day-view";
import { MonthGrid, MonthLegend } from "./calendar/month-grid";
import { PeriodNav, stepSize } from "./calendar/period-nav";
import { SelectedDayPanel } from "./calendar/selected-day-panel";
import { SelectedDaySheet } from "./calendar/selected-day-sheet";
import { CALENDAR_MODES, type CalendarMode } from "./calendar/visuals";
import { WeekView } from "./calendar/week-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHorizontalSwipe } from "@/hooks/use-horizontal-swipe";

/**
 * Study calendar — four surfaces (month/week/day/agenda) over the merged
 * plan+progress payload. The plan carries no clock times, so every surface is
 * an ordered list rather than an hour grid. Selecting a date changes the day
 * panel; opening a task opens the shared detail dialog, and the deep link for
 * a date is /plan/<date>.
 *
 * Mode and selection stay local state: the view is excluded from the URL
 * mirror (filters-url.ts) because /plan/<date> already owns addressable dates.
 */
export function CalendarView({
  planApi,
  attempts,
  onAddMock,
  onOpenAttempt,
  onSelectedDateChange,
}: {
  planApi: ReturnType<typeof usePlanData>;
  attempts: Attempt[];
  onAddMock: (date: string, task?: PlanTaskView) => void;
  onOpenAttempt: (attempt: Attempt) => void;
  onSelectedDateChange?: (date: string) => void;
}) {
  const { plan, loading, error, refresh, updateTask } = planApi;
  const router = useRouter();
  const today = istTodayIso();
  const [mode, setMode] = useState<CalendarMode>("month");
  const [selected, setSelected] = useState(() => today);
  const [event, setEvent] = useState<
    { task: PlanTaskView; day: PlanDayView } | undefined
  >();
  const isMobile = useIsMobile();
  const [daySheetOpen, setDaySheetOpen] = useState(false);

  useEffect(() => {
    onSelectedDateChange?.(selected);
  }, [selected, onSelectedDateChange]);

  /* Hooks live above the loading/error returns. `step` is inert until the
     plan exists, which is exactly when the swipe handler can fire anyway. */
  const step = (direction: 1 | -1) => {
    if (!plan) return;
    const next =
      mode === "month"
        ? shiftMonth(plan, selected, direction)
        : addIsoDays(selected, direction * stepSize(mode));
    setSelected(clampToPlan(plan, next));
  };

  /* Swipe left/right on the month/week surface steps the period on touch. */
  const swipeHandlers = useHorizontalSwipe(step);

  /* A sheet left open across a phone→desktop resize simply unmounts via
     `open={isMobile && daySheetOpen}`; no effect needed to close it. */

  if (loading && !plan) return <CalendarLoading />;
  if (!plan)
    return (
      <PlanErrorCard
        message={error || "The study plan could not load."}
        onRetry={() => void refresh()}
      />
    );

  const selectedDay = findDayByDate(plan.days, selected);
  const dayAttempts = attempts.filter(
    (attempt) => istDateKey(attempt.completedAt) === selected,
  );

  const markAllDone = (day: PlanDayView) => {
    day.tasks
      .filter((task) => !task.completed)
      .forEach((task) => updateTask(task.key, { completed: true }));
  };

  const goToday = () => setSelected(clampToPlan(plan, today));

  /** Grid taps select the day and, on phones, present it in the bottom sheet
      — the aside only exists from md up, so below that the sheet is the only
      way to see a day's schedule without scrolling past the grid. Period
      navigation (arrows, date input, Today) deliberately doesn't open it. */
  const selectDay = (iso: string) => {
    setSelected(clampToPlan(plan, iso));
    if (isMobile) setDaySheetOpen(true);
  };

  /** Sheet actions that hand off to an overlay or route close the sheet
      first: the dialog overlays sit at the same z-index, so a dialog opened
      over the sheet would leave the sheet clickable through the dimmer. */
  const sheetCallbacks = {
    onOpenTask: (task: PlanTaskView, day: PlanDayView) => {
      setDaySheetOpen(false);
      setEvent({ task, day });
    },
    onAddMock: (date: string, task?: PlanTaskView) => {
      setDaySheetOpen(false);
      onAddMock(date, task);
    },
    onOpenAttempt: (attempt: Attempt) => {
      setDaySheetOpen(false);
      onOpenAttempt(attempt);
    },
  };

  const nav = (
    <PeriodNav
      mode={mode}
      selected={selected}
      planStart={plan.startDate}
      planEnd={plan.endDate}
      onStep={step}
      onToday={goToday}
      onSelect={(iso) => setSelected(clampToPlan(plan, iso))}
    />
  );

  const asideAgenda = mode === "month" || mode === "week";

  return (
    <div className="min-w-0">
      <PageHeader
        title="Study calendar"
        description="Every scheduled mock, sectional and revision block across the plan. Select a date to see its schedule."
        icon={
          <div className="hidden sm:block">
            <DuotoneTile name="calendar" tile="accent" className="size-11" />
          </div>
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <PlainIcon name="calendar" size={12} />
              {shortDate(plan.startDate)} – {longDate(plan.endDate)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 tabular">
              <PlainIcon name="target" size={12} />
              {selectedDay
                ? `Day ${selectedDay.day} of ${plan.days.length}`
                : "Outside the plan window"}
            </span>
          </>
        }
        actions={
          <Button size="sm" onClick={() => onAddMock(selected)}>
            <PlainIcon name="plus" size={13} /> Add mock
          </Button>
        }
      />

      <CalendarMetrics
        days={plan.days}
        today={today}
        onOpenNextMock={({ task, day }) => setEvent({ task, day })}
        onOpenWeek={() => {
          setMode("week");
          setSelected(clampToPlan(plan, today));
        }}
      />

      <div className="mt-5 flex items-center">
        <div
          role="group"
          aria-label="Calendar view"
          className="segment-group grid w-full grid-cols-4 gap-0.5 sm:inline-flex sm:w-auto"
        >
          {CALENDAR_MODES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={mode === entry.id}
              className="segment"
              onClick={() => setMode(entry.id)}
            >
              <PlainIcon
                name={entry.icon}
                size={14}
                className={mode === entry.id ? "shrink-0" : "shrink-0 text-muted"}
              />
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)]">
        <div className="min-w-0">
          <Swap swapKey={mode}>
            {mode === "month" || mode === "week" ? (
              <>
                <CalendarSurface
                  live
                  title={periodTitle(mode, selected)}
                  meta={
                    mode === "month"
                      ? `${plan.days.length} plan days · select any date`
                      : `Week of ${shortDate(weekRange(selected).from)}`
                  }
                  nav={nav}
                  touchHandlers={swipeHandlers}
                >
                  {mode === "month" ? (
                    <MonthGrid
                      days={plan.days}
                      selected={selected}
                      today={today}
                      planStart={plan.startDate}
                      planEnd={plan.endDate}
                      onSelect={selectDay}
                      onMonthStep={step}
                    />
                  ) : (
                    <WeekView
                      days={plan.days}
                      selected={selected}
                      today={today}
                      onSelect={selectDay}
                    />
                  )}
                </CalendarSurface>
                {mode === "month" && (
                  <div className="px-1 pb-1 pt-3">
                    <MonthLegend />
                  </div>
                )}
              </>
            ) : mode === "day" ? (
              <DayView
                days={plan.days}
                selected={selected}
                planLength={plan.days.length}
                planStart={plan.startDate}
                planEnd={plan.endDate}
                onStep={step}
                onToday={goToday}
                onSelect={(iso) => setSelected(clampToPlan(plan, iso))}
                onOpenTask={(task, day) => setEvent({ task, day })}
                onAddMock={onAddMock}
              />
            ) : (
              <AgendaView
                days={plan.days}
                selected={selected}
                today={today}
                planLength={plan.days.length}
                planStart={plan.startDate}
                planEnd={plan.endDate}
                attempts={attempts}
                onStep={step}
                onToday={goToday}
                onSelect={(iso) => setSelected(clampToPlan(plan, iso))}
                onOpenTask={(task, day) => setEvent({ task, day })}
                onLogResult={(task) => onAddMock(task.date, task)}
                onOpenAttempt={onOpenAttempt}
              />
            )}
          </Swap>
        </div>

        {asideAgenda && (
          <aside className="hidden min-w-0 md:block xl:sticky xl:top-[72px] xl:self-start">
            <Swap swapKey={selected}>
              <SelectedDayPanel
                day={selectedDay}
                selected={selected}
                planLength={plan.days.length}
                planStart={plan.startDate}
                planEnd={plan.endDate}
                attempts={dayAttempts}
                onOpenTask={(task, day) => setEvent({ task, day })}
                onAddMock={onAddMock}
                onOpenAttempt={onOpenAttempt}
                onMarkAllDone={
                  selectedDay ? () => markAllDone(selectedDay) : undefined
                }
              />
            </Swap>
          </aside>
        )}
      </div>

      {asideAgenda && (
        <SelectedDaySheet
          open={isMobile && daySheetOpen}
          onOpenChange={(open) => {
            if (!open) setDaySheetOpen(false);
          }}
          day={selectedDay}
          selected={selected}
          planLength={plan.days.length}
          planStart={plan.startDate}
          planEnd={plan.endDate}
          attempts={dayAttempts}
          {...sheetCallbacks}
          onMarkAllDone={
            selectedDay ? () => markAllDone(selectedDay) : undefined
          }
        />
      )}

      <EventDialog
        task={event?.task ?? null}
        day={event?.day}
        onClose={() => setEvent(undefined)}
        onToggleComplete={(task) => {
          updateTask(task.key, { completed: !task.completed });
          setEvent((prev) =>
            prev
              ? {
                  ...prev,
                  task: { ...prev.task, completed: !prev.task.completed },
                }
              : prev,
          );
        }}
        onOpenPlanDay={(date) => {
          setEvent(undefined);
          router.push(`/plan/${date}`);
        }}
      />
    </div>
  );
}

function periodTitle(mode: CalendarMode, selected: string): string {
  if (mode === "month") return monthDate(selected);
  if (mode === "week") {
    const range = weekRange(selected);
    return `${shortDate(range.from)} – ${shortDate(range.to)}`;
  }
  return longDate(selected);
}

function clampToPlan(
  plan: { startDate: string; endDate: string },
  iso: string,
): string {
  if (iso < plan.startDate) return plan.startDate;
  if (iso > plan.endDate) return plan.endDate;
  return iso;
}

/**
 * Step one month while keeping the day of month. `setUTCMonth` alone rolls a
 * 31st into the following month, so the day is clamped to the target month's
 * length first; `clampToPlan` then keeps the result inside the plan window so
 * a step at the edge lands on the first/last plan day, never an empty month.
 */
function shiftMonth(
  plan: { startDate: string; endDate: string },
  iso: string,
  direction: 1 | -1,
): string {
  const day = Number(iso.slice(8));
  const date = new Date(`${iso.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + direction);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return clampToPlan(plan, date.toISOString().slice(0, 10));
}

/** Header, strip and grid placeholders in the real page's shape. */
function CalendarLoading() {
  return (
    <div className="min-w-0" aria-busy="true" aria-label="Loading the study calendar">
      <PageHeader
        title="Study calendar"
        description="Every scheduled mock, sectional and revision block across the plan."
      />
      <MetricStripSkeleton label="Loading plan summary" />
      <div className="panel mt-5 p-4 sm:p-6">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full sm:h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
