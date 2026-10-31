"use client";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../page-header";
import { DuotoneTile, PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { Swap } from "../motion-swap";
import { MetricStripSkeleton } from "../metric-strip";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "../toast";
import { cn } from "@/lib/utils";
import { PlanErrorCard } from "./plan-shared";
import { EventDialog } from "./event-dialog";
import { usePlanData } from "../use-plan-data";
import { istDateKey, longDate, monthDate, shortDate } from "@/lib/format";
import { parseCalendarState, serializeCalendarState } from "@/lib/calendar-url";
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
import { CalendarLegend, MonthGrid } from "./calendar/month-grid";
import { PeriodNav, stepSize } from "./calendar/period-nav";
import { SelectedDayPanel } from "./calendar/selected-day-panel";
import { SelectedDaySheet } from "./calendar/selected-day-sheet";
import { CALENDAR_MODES, type CalendarMode } from "./calendar/visuals";
import { WeekView } from "./calendar/week-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHorizontalSwipe } from "@/hooks/use-horizontal-swipe";

/* The two grids re-render on every plan patch otherwise; memo skips the
   re-renders that belong to unrelated state (the event dialog, the day
   sheet). Their props are stable: the selection and step handlers are
   useCallback'd here. */
const MemoMonthGrid = memo(MonthGrid);
const MemoWeekView = memo(WeekView);

/**
 * Study calendar — four surfaces (month/week/day/agenda) over the merged
 * plan+progress payload. The plan carries no clock times, so every surface is
 * an ordered list rather than an hour grid.
 *
 * One control cluster per question: the toolbar under the header owns both
 * the mode and the period controls (what am I looking at, how do I move),
 * while each surface's head states its period title and context. Mode and
 * selection mirror into the URL (lib/calendar-url.ts) with replaceState, so a
 * refresh or shared link reopens the same view; the deep link for a date's
 * full workspace is still /plan/<date>.
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
  const { plan, today: planToday, loading, error, refresh, updateTask } = planApi;
  const router = useRouter();
  const toast = useToast();
  const isMobile = useIsMobile();
  const today = planToday ?? istTodayIso();

  /* URL mirror: read once on mount (leniently — bad params fall back to the
     defaults), write back with replaceState on every change. */
  const [urlState] = useState(() =>
    typeof window === "undefined"
      ? { mode: null, date: null }
      : parseCalendarState(window.location.search),
  );
  const [mode, setMode] = useState<CalendarMode>(() => urlState.mode ?? "month");
  const [requested, setRequested] = useState(
    () => urlState.date ?? istTodayIso(),
  );
  /** The plan window owns the calendar: a request outside it (a shared URL
      dated past the plan, today after the plan has ended) resolves to the
      nearest plan day during render, so no state-sync effect is needed. */
  const selected = plan ? clampToPlan(plan, requested) : requested;
  /** The open dialog is identified by task key + date; the live row is
      resolved from the plan each render, so the dialog can never go stale. */
  const [event, setEvent] = useState<
    { key: string; date: string } | undefined
  >();
  const [daySheetOpen, setDaySheetOpen] = useState(false);

  useEffect(() => {
    onSelectedDateChange?.(selected);
  }, [selected, onSelectedDateChange]);

  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      serializeCalendarState(mode, selected, { mode: "month", date: today }),
    );
  }, [mode, selected, today]);

  /* Hooks live above the loading/error returns. `step` is inert until the
     plan exists, which is exactly when the swipe handler can fire anyway. */
  const step = useCallback(
    (direction: 1 | -1) => {
      if (!plan) return;
      const next =
        mode === "month"
          ? shiftMonth(plan, selected, direction)
          : addIsoDays(selected, direction * stepSize(mode));
      setRequested(clampToPlan(plan, next));
    },
    [plan, mode, selected],
  );

  const goToday = useCallback(() => {
    if (!plan) return;
    setRequested(clampToPlan(plan, today));
  }, [plan, today]);

  /* Swipe left/right steps the period on touch — every surface, since the
     plan carries no other horizontal gesture. */
  const swipeHandlers = useHorizontalSwipe(step);

  const selectClamped = useCallback(
    (iso: string) => {
      if (!plan) return;
      setRequested(clampToPlan(plan, iso));
    },
    [plan],
  );

  /** Grid taps select the day and, on phones, present it in the bottom sheet
      — the aside only exists from md up, so below that the sheet is the only
      way to see a day's schedule without scrolling past the grid. Period
      navigation (arrows, date input, Today) deliberately doesn't open it. */
  const selectDay = useCallback(
    (iso: string) => {
      if (!plan) return;
      setRequested(clampToPlan(plan, iso));
      if (isMobile) setDaySheetOpen(true);
    },
    [plan, isMobile],
  );

  const openTask = useCallback((task: PlanTaskView, day: PlanDayView) => {
    setEvent({ key: task.key, date: day.date });
  }, []);

  const toggleTask = useCallback(
    (task: PlanTaskView, next: boolean) => {
      updateTask(task.key, { completed: next });
    },
    [updateTask],
  );

  /* A sheet left open across a phone→desktop resize simply unmounts via
     `open={isMobile && daySheetOpen}`; no effect needed to close it. */

  /** The dialog's live task, resolved from the plan by key each render — one
      source of truth, no hand-patched snapshot. */
  const eventTask = useMemo(() => {
    if (!event || !plan) return null;
    const day = plan.days.find((d) => d.date === event.date);
    const task = day?.tasks.find((t) => t.key === event.key);
    return task && day ? { task, day } : null;
  }, [event, plan]);

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

  /** Optimistic per-task POSTs (no batch endpoint exists — the requests run
      in parallel and each is tiny), with one summary toast for feedback. */
  const markAllDone = (day: PlanDayView) => {
    const outstanding = day.tasks.filter((task) => !task.completed);
    if (!outstanding.length) return;
    for (const task of outstanding) updateTask(task.key, { completed: true });
    toast.success(
      outstanding.length === 1
        ? "Task marked complete"
        : `Marked ${outstanding.length} tasks complete`,
      `Day ${day.day} · ${longDate(day.date)}`,
    );
  };

  /** Sheet actions that hand off to an overlay or route close the sheet
      first: the dialog overlays sit at the same z-index, so a dialog opened
      over the sheet would leave the sheet clickable through the dimmer. */
  const sheetCallbacks = {
    onOpenTask: (task: PlanTaskView, day: PlanDayView) => {
      setDaySheetOpen(false);
      setEvent({ key: task.key, date: day.date });
    },
    onToggleTask: toggleTask,
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
      today={today}
      planStart={plan.startDate}
      planEnd={plan.endDate}
      onStep={step}
      onToday={goToday}
      onSelect={selectClamped}
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
        onOpenNextMock={({ task, day }) => openTask(task, day)}
        onOpenWeek={() => {
          setMode("week");
          setRequested(clampToPlan(plan, today));
        }}
      />

      {/* The calendar toolbar: mode on the left, period controls on the right
          — one row from sm, stacked full-width rows on phones. */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
              {/* Icons drop below 360px so labels keep room at 320. */}
              <PlainIcon
                name={entry.icon}
                size={14}
                className={cn(
                  "shrink-0 max-[359px]:hidden",
                  mode !== entry.id && "text-muted",
                )}
              />
              {entry.label}
            </button>
          ))}
        </div>
        <div
          role="group"
          aria-label="Change period"
          className="flex flex-wrap items-center justify-between gap-2 sm:justify-end"
        >
          {nav}
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
                  touchHandlers={swipeHandlers}
                >
                  {mode === "month" ? (
                    <MemoMonthGrid
                      days={plan.days}
                      selected={selected}
                      today={today}
                      planStart={plan.startDate}
                      planEnd={plan.endDate}
                      onSelect={selectDay}
                      onMonthStep={step}
                    />
                  ) : (
                    <MemoWeekView
                      days={plan.days}
                      selected={selected}
                      today={today}
                      onSelect={selectDay}
                    />
                  )}
                </CalendarSurface>
                {/* Both grids speak the same chip grammar, so both carry the
                    legend; the day and agenda rows are labelled in words. */}
                <div className="px-1 pb-1 pt-3">
                  <CalendarLegend />
                </div>
              </>
            ) : mode === "day" ? (
              <DayView
                days={plan.days}
                selected={selected}
                planLength={plan.days.length}
                planStart={plan.startDate}
                planEnd={plan.endDate}
                onSelect={selectClamped}
                onOpenTask={openTask}
                onToggleTask={toggleTask}
                onAddMock={onAddMock}
                touchHandlers={swipeHandlers}
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
                onOpenTask={openTask}
                onToggleTask={toggleTask}
                onLogResult={(task) => onAddMock(task.date, task)}
                onOpenAttempt={onOpenAttempt}
                touchHandlers={swipeHandlers}
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
                onOpenTask={openTask}
                onToggleTask={toggleTask}
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
        task={eventTask?.task ?? null}
        day={eventTask?.day}
        onClose={() => setEvent(undefined)}
        onToggleComplete={(task) => {
          updateTask(task.key, { completed: !task.completed });
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
