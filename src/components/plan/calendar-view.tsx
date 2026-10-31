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
import { PlanErrorCard } from "./plan-shared";
import { EventDialog } from "./event-dialog";
import { usePlanData } from "../use-plan-data";
import { longDate, monthDate, shortDate } from "@/lib/format";
import {
  parseCalendarState,
  serializeCalendarState,
  type CalendarViewMode,
} from "@/lib/calendar-url";
import type { Attempt } from "@/lib/domain";
import {
  addIsoDays,
  findDayByDate,
  istTodayIso,
  type PlanDayView,
  type PlanTaskView,
} from "@/lib/plan/view-model";
import {
  buildCalendarIndex,
  countEntries,
  DEFAULT_LAYERS,
  entriesFor,
  sortLayers,
  type CalendarLayer,
} from "@/lib/plan/calendar-entries";
import type { TaskDraft } from "../tasks/types";
import { CalendarToolbar } from "./calendar/calendar-toolbar";
import { CalendarMetrics } from "./calendar/calendar-metrics";
import { CalendarLegend, MonthGrid } from "./calendar/month-grid";
import { WeekView } from "./calendar/week-view";
import { AgendaView } from "./calendar/agenda-view";
import { DayLedger } from "./calendar/day-ledger";
import { DayDrawer } from "./calendar/day-drawer";
import { PersonalTaskDrawer } from "./calendar/personal-task-drawer";
import type { DayActions } from "./calendar/day-sections";
import { stepSize } from "./calendar/period-nav";
import { CalendarSurface } from "./calendar/calendar-surface";
import type { CalendarMode } from "./calendar/visuals";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHorizontalSwipe } from "@/hooks/use-horizontal-swipe";
import { useTodoMutations } from "../use-todos-data";

/* The two grids re-render on every plan patch otherwise; memo skips the
   re-renders that belong to unrelated state (the event dialog, the drawers).
   Their props are stable: the index is memoized and the handlers useCallback'd. */
const MemoMonthGrid = memo(MonthGrid);
const MemoWeekView = memo(WeekView);

/**
 * The study calendar — a unified ledger over three layers: the plan's own
 * scheduled work, the user's personal dated tasks, and every logged mock.
 *
 * The plan carries no clock times, so no surface is an hour grid: each is an
 * ordered, ruled list. Three layers are three kinds of ink (see visuals.ts),
 * and the day ledger gives the selected date a printed timetable's margin.
 *
 * View state (mode, date, layers) mirrors into the URL with replaceState, so a
 * refresh or shared link reopens the same view. `/plan/<date>` remains the
 * deep link for a day's full workspace.
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
  onAddMock: (date: string, task?: PlanTaskView, returnTo?: string) => void;
  onOpenAttempt: (attempt: Attempt) => void;
  onSelectedDateChange?: (date: string) => void;
}) {
  const {
    plan,
    today: planToday,
    loading,
    error,
    refresh,
    updateTask,
    toggleDayRevision,
    personalTasks,
    createPersonalTask,
    updatePersonalTask,
  } = planApi;
  const router = useRouter();
  const toast = useToast();
  const isMobile = useIsMobile();
  const today = planToday ?? istTodayIso();
  const { mutateTodoRequest } = useTodoMutations();

  /* URL mirror: read once on mount (leniently — bad params fall back to the
     defaults), write back with replaceState on every change. */
  const [urlState] = useState(() =>
    typeof window === "undefined"
      ? { mode: null, date: null, layers: null }
      : parseCalendarState(window.location.search),
  );
  /* null = automatic: agenda on phones, month everywhere else. Derived, never
     effect-set — an effect would paint the wrong surface first. The workspace
     is client-rendered after auth (private-workspace.tsx), so there is no
     server markup to disagree with. */
  const [explicitMode, setExplicitMode] = useState<CalendarViewMode | null>(
    urlState.mode,
  );
  const mode: CalendarMode =
    explicitMode ?? (isMobile ? "agenda" : "month");

  const [requested, setRequested] = useState(() => urlState.date ?? today);
  const [layers, setLayers] = useState<CalendarLayer[]>(
    () => urlState.layers ?? [...DEFAULT_LAYERS],
  );

  /** The open dialog is identified by task key + date; the live row is
   * resolved from the plan each render, so the dialog can never go stale. */
  const [event, setEvent] = useState<
    { key: string; date: string } | undefined
  >();
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false);
  const [taskDrawer, setTaskDrawer] = useState<
    | { mode: "edit"; id: string; dueDate: string | null }
    | { mode: "create"; dueDate: string }
    | null
  >(null);

  useEffect(() => {
    onSelectedDateChange?.(requested);
  }, [requested, onSelectedDateChange]);

  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      serializeCalendarState(
        { mode: explicitMode, date: requested, layers },
        { date: today },
      ),
    );
  }, [explicitMode, requested, layers, today]);

  /* One index per data change; layer filtering is a separate memo so toggling
     a layer never rebuilds the index. */
  const index = useMemo(
    () =>
      buildCalendarIndex({
        days: plan?.days ?? [],
        personalTasks,
        attempts,
        todayIso: today,
      }),
    [plan?.days, personalTasks, attempts, today],
  );

  /* Per-date reads plus the window totals the layer toggles report. Both come
     from one memo so a layer change recomputes once, not per surface. */
  const visible = useMemo(() => {
    const countsFor = (iso: string) =>
      countEntries(entriesFor(index, iso, layers));
    const inRangeTotals = index.dates.reduce(
      (acc, date) => {
        const counts = countsFor(date);
        return {
          plan: { total: acc.plan.total + counts.plan.total, done: acc.plan.done + counts.plan.done },
          rev: { total: acc.rev.total + counts.rev.total, done: acc.rev.done + counts.rev.done },
          tasks: {
            total: acc.tasks.total + counts.tasks.total,
            done: acc.tasks.done + counts.tasks.done,
            overdue: acc.tasks.overdue + counts.tasks.overdue,
          },
          mocks: acc.mocks + counts.mocks,
        };
      },
      {
        plan: { total: 0, done: 0 },
        rev: { total: 0, done: 0 },
        tasks: { total: 0, done: 0, overdue: 0 },
        mocks: 0,
      },
    );
    return {
      entriesOn: (iso: string) => entriesFor(index, iso, layers),
      countsOn: countsFor,
      inRangeTotals,
    };
  }, [index, layers]);

  const closeDrawers = useCallback(() => {
    setDayDrawerOpen(false);
    setTaskDrawer(null);
  }, []);

  const step = useCallback(
    (direction: 1 | -1) => {
      setRequested((current) =>
        mode === "month"
          ? shiftMonth(current, direction)
          : addIsoDays(current, direction * stepSize(mode)),
      );
    },
    [mode],
  );

  const goToday = useCallback(() => setRequested(today), [today]);

  const swipeHandlers = useHorizontalSwipe(step);

  const selectDate = useCallback((iso: string) => setRequested(iso), []);

  /** Grid taps select the day and, on phones, present it in the bottom drawer
   * — the inline panel only exists from md up. Period navigation never opens
   * it. */
  const selectDay = useCallback(
    (iso: string) => {
      setRequested(iso);
      if (isMobile) setDayDrawerOpen(true);
    },
    [isMobile],
  );

  const openTask = useCallback((task: PlanTaskView, day: PlanDayView) => {
    setEvent({ key: task.key, date: day.date });
  }, []);

  const toggleTask = useCallback(
    (task: PlanTaskView, next: boolean) => {
      void updateTask(task.key, { completed: next });
    },
    [updateTask],
  );

  const toggleRevision = useCallback(
    (day: PlanDayView, indexAt: number, next: boolean) => {
      void toggleDayRevision(day.day, indexAt, next);
    },
    [toggleDayRevision],
  );

  const openPersonal = useCallback(
    (entry: { task: { id: string; dueDate: string | null } }) => {
      closeDrawers();
      setTaskDrawer({
        mode: "edit",
        id: entry.task.id,
        dueDate: entry.task.dueDate,
      });
    },
    [closeDrawers],
  );

  const togglePersonal = useCallback(
    (entry: { task: { id: string }; status: string }, next: boolean) => {
      void semanticsNoop(updatePersonalTask(entry.task.id, {
        status: next ? "completed" : "todo",
      }));
    },
    [updatePersonalTask],
  );

  const addPersonal = useCallback((date: string) => {
    closeDrawers();
    setTaskDrawer({ mode: "create", dueDate: date });
  }, [closeDrawers]);

  const savePersonalTask = useCallback(
    async (draft: TaskDraft) => {
      const editing = taskDrawer?.mode === "edit" ? taskDrawer.id : null;
      /* The editor always supplies title and date (it validates both), so the
       * two writes share one payload; only the create path omits `status`,
       * which the API defaults to "todo". */
      const payload = {
        title: draft.title ?? "",
        dueDate: draft.dueDate ?? "",
        notes: draft.notes ?? "",
        url: draft.url ?? "",
        priority: draft.priority ?? "normal",
        category: "other",
      };
      try {
        if (editing)
          await updatePersonalTask(editing, {
            ...payload,
            status: draft.completed ? "completed" : (draft.status ?? "todo"),
          });
        else
          await createPersonalTask({
            ...payload,
            status: draft.completed ? "completed" : "todo",
          });
        toast.success(editing ? "Task updated" : "Task added", draft.title);
        closeDrawers();
        return true;
      } catch (cause) {
        toast.error(
          "Couldn't save the task",
          cause instanceof Error ? cause.message : undefined,
        );
        return false;
      }
    },
    [taskDrawer, updatePersonalTask, createPersonalTask, toast, closeDrawers],
  );

  const createGroup = useCallback(
    async (name: string) => {
      try {
        const group = await mutateTodoRequest<{ id: string }>(
          "/api/todos/groups",
          "POST",
          { name },
        );
        return group?.id ?? null;
      } catch {
        return null;
      }
    },
    [mutateTodoRequest],
  );

  const eventTask = useMemo(() => {
    if (!event || !plan) return null;
    const day = plan.days.find((entry) => entry.date === event.date);
    const task = day?.tasks.find((entry) => entry.key === event.key);
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

  const selectedDay = findDayByDate(plan.days, requested);
  const dayEntries = visible.entriesOn(requested);
  const dayCounts = countEntries(dayEntries);
  const planLength = plan.days.length;

  const markAllDone = (day: PlanDayView) => {
    const outstanding = day.tasks.filter((task) => !task.completed);
    if (!outstanding.length) return;
    for (const task of outstanding) void updateTask(task.key, { completed: true });
    toast.success(
      outstanding.length === 1
        ? "Task marked complete"
        : `Marked ${outstanding.length} tasks complete`,
      `Day ${day.day} · ${longDate(day.date)}`,
    );
  };

  const actions: DayActions = {
    onOpenPlanTask: (task, day) => {
      closeDrawers();
      openTask(task, day);
    },
    onTogglePlanTask: toggleTask,
    onLogAttemptForTask: (task) => {
      closeDrawers();
      onAddMock(task.date, task, currentPath());
    },
    onToggleRevision: toggleRevision,
    onOpenPersonal: openPersonal,
    onTogglePersonal: togglePersonal,
    onOpenAttempt: (attempt) => {
      closeDrawers();
      onOpenAttempt(attempt);
    },
  };

  const ledgerProps = {
    date: requested,
    day: selectedDay,
    entries: dayEntries,
    counts: dayCounts,
    today,
    planLength,
    planStart: plan.startDate,
    planEnd: plan.endDate,
    actions,
    onAddMock: (date: string) => onAddMock(date, undefined, currentPath()),
    onAddPersonal: addPersonal,
    onMarkAllDone: selectedDay
      ? () => markAllDone(selectedDay)
      : undefined,
    onGoToToday: goToday,
    onGoToPlanStart: () => setRequested(plan.startDate),
  };

  const toggleLayer = (layer: CalendarLayer, next: boolean) => {
    setLayers((current) => {
      const set = new Set(current);
      if (next) set.add(layer);
      else set.delete(layer);
      if (!set.size) return current;
      return sortLayers(set);
    });
  };

  const selectMode = (next: CalendarMode) => setExplicitMode(next);

  return (
    <div className="cal-page min-w-0">
      <PageHeader
        title="Study calendar"
        description="Scheduled tests and revision, your own tasks, and every result you have logged — one ledger."
        icon={
          <div className="hidden sm:block">
            <DuotoneTile name="calendar" tile="accent" className="size-11" />
          </div>
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <PlainIcon name="calendar" size={12} />
              {shortDate(plan.startDate)} – {shortDate(plan.endDate)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 tabular">
              <PlainIcon name="target" size={12} />
              {selectedDay
                ? `Day ${selectedDay.day} of ${planLength}`
                : "Outside the plan"}
            </span>
          </>
        }
        actions={
          <>
            <Button
              size="sm"
              onClick={() => onAddMock(requested, undefined, currentPath())}
            >
              <PlainIcon name="plus" size={13} /> Log mock
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addPersonal(requested)}
            >
              <PlainIcon name="plus" size={13} /> Add task
            </Button>
          </>
        }
      />

      {/* On phones the summary sits below the calendar so the calendar owns the
          first screen; from md it returns above, as DESIGN.md specifies. The
          `order` utilities need a flex parent — `.cal-page` supplies it. */}
      <div className="cal-strip">
        <CalendarMetrics
          index={index}
          layers={layers}
          today={today}
          onOpenNextMock={({ task, day }) => openTask(task, day)}
          onOpenWeek={() => {
            setExplicitMode("week");
            setRequested(today);
          }}
          onOpenDate={setRequested}
        />
      </div>

      <div className="cal-toolbar-slot">
        <CalendarToolbar
          title={periodTitle(mode, requested)}
          mode={mode}
          selected={requested}
          today={today}
          layers={layers}
          totals={visible.inRangeTotals}
          onStep={step}
          onToday={goToday}
          onSelectDate={selectDate}
          onMode={selectMode}
          onToggleLayer={toggleLayer}
        />
      </div>

      <div
        className={
          mode === "month" || mode === "week"
            ? "cal-surface mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(340px,1fr)]"
            : "cal-surface mt-4"
        }
      >
        <div className="min-w-0">
          <Swap swapKey={mode}>
            {mode === "month" || mode === "week" ? (
              <>
                <CalendarSurface
                  meta={
                    mode === "month"
                      ? monthMeta(requested, plan.startDate, plan.endDate)
                      : `Week of ${shortDate(weekStart(requested))}`
                  }
                  touchHandlers={swipeHandlers}
                >
                  {mode === "month" ? (
                    <MemoMonthGrid
                      index={index}
                      layers={layers}
                      selected={requested}
                      today={today}
                      planStart={plan.startDate}
                      planEnd={plan.endDate}
                      onSelect={selectDay}
                      onMonthStep={step}
                    />
                  ) : (
                    <MemoWeekView
                      index={index}
                      layers={layers}
                      selected={requested}
                      today={today}
                      onSelect={selectDay}
                    />
                  )}
                </CalendarSurface>
                <div className="px-1 pb-1">
                  <CalendarLegend />
                </div>
              </>
            ) : mode === "day" ? (
              <div {...swipeHandlers}>
                <DayLedger {...ledgerProps} variant="surface" />
              </div>
            ) : (
              <AgendaView
                index={index}
                layers={layers}
                selected={requested}
                today={today}
                planStart={plan.startDate}
                planEnd={plan.endDate}
                actions={actions}
                onAddMock={(date) => onAddMock(date, undefined, currentPath())}
                onAddPersonal={addPersonal}
                onGoToDate={selectDate}
                touchHandlers={swipeHandlers}
              />
            )}
          </Swap>
        </div>

        {/* The desktop rail: month and week only; day/agenda carry the ledger
            themselves. Below xl it stacks directly under the surface rather
            than sitting below the fold of the whole page. */}
        {(mode === "month" || mode === "week") && (
          <aside className="hidden min-w-0 md:block xl:sticky xl:top-[68px] xl:self-start">
            <Swap swapKey={requested}>
              <DayLedger {...ledgerProps} variant="rail" />
            </Swap>
          </aside>
        )}
      </div>

      {(mode === "month" || mode === "week") && (
        <DayDrawer
          open={isMobile && dayDrawerOpen}
          onOpenChange={(open) => {
            if (!open) setDayDrawerOpen(false);
          }}
          {...ledgerProps}
        />
      )}

      <PersonalTaskDrawer
        open={taskDrawer !== null}
        onOpenChange={(open) => {
          if (!open) setTaskDrawer(null);
        }}
        task={
          taskDrawer?.mode === "edit"
            ? { id: taskDrawer.id, dueDate: taskDrawer.dueDate }
            : null
        }
        draft={
          taskDrawer?.mode === "create"
            ? { dueDate: taskDrawer.dueDate }
            : null
        }
        onSave={savePersonalTask}
        onCreateGroup={createGroup}
      />

      <EventDialog
        task={eventTask?.task ?? null}
        day={eventTask?.day}
        onClose={() => setEvent(undefined)}
        onToggleComplete={(task) => {
          void updateTask(task.key, { completed: !task.completed });
        }}
        onOpenPlanDay={(date) => {
          setEvent(undefined);
          router.push(`/plan/${date}`);
        }}
        onToggleChecklist={toggleDayChecklist(planApi)}
        onToggleRevision={(day, indexAt, next) =>
          void toggleDayRevision(day.day, indexAt, next)
        }
      />
    </div>
  );
}

/** Fire-and-forget wrapper so a rejected promise cannot surface as unhandled;
 * the hook already toasts and rolls back. */
function semanticsNoop(promise: Promise<unknown>) {
  void promise.catch(() => undefined);
}

function toggleDayChecklist(planApi: ReturnType<typeof usePlanData>) {
  return (day: PlanDayView, itemId: string, done: boolean) => {
    void planApi.toggleChecklist(day.day, itemId, done);
  };
}

/** The calendar's own address, so "Log mock" can return here. */
function currentPath(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.pathname}${window.location.search}`;
}

/** One context line for the month surface: the plan's relation to the month
 * being viewed, said once. */
function monthMeta(selected: string, planStart: string, planEnd: string): string {
  if (selected < planStart) return `Before the plan · it starts ${shortDate(planStart)}`;
  if (selected > planEnd) return `After the plan · it ended ${shortDate(planEnd)}`;
  return "Select any date to open its ledger";
}

function weekStart(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7;
  return addIsoDays(iso, -weekday);
}

function periodTitle(mode: CalendarMode, selected: string): string {
  if (mode === "month") return monthDate(selected);
  if (mode === "week") {
    const from = weekStart(selected);
    return `${shortDate(from)} – ${shortDate(addIsoDays(from, 6))}`;
  }
  return longDate(selected);
}

/**
 * Step one month while keeping the day of month. `setUTCMonth` alone rolls a
 * 31st into the following month, so the day is clamped to the target month's
 * length first. There is no plan clamp any more: personal work and logged
 * results live outside the plan window.
 */
function shiftMonth(iso: string, direction: 1 | -1): string {
  const day = Number(iso.slice(8));
  const date = new Date(`${iso.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + direction);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

/** Header, strip and surface placeholders in the real page's shape. */
function CalendarLoading() {
  return (
    <div
      className="min-w-0"
      aria-busy="true"
      aria-label="Loading the study calendar"
    >
      <PageHeader
        title="Study calendar"
        description="Scheduled tests and revision, your own tasks, and every result you have logged."
      />
      <MetricStripSkeleton label="Loading plan summary" />
      <div className="panel mt-5 p-4 sm:p-6">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, at) => (
            <Skeleton key={at} className="h-14 w-full sm:h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}

