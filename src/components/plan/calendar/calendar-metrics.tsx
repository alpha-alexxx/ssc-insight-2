"use client";
import { MetricCell } from "../../metric-strip";
import { shortDate } from "@/lib/format";
import {
  isMockType,
  nextMockDay,
  weekRange,
  type PlanDayView,
  type PlanTaskView,
} from "@/lib/plan/view-model";
import {
  countEntries,
  datesBetween,
  entriesFor,
  type CalendarIndex,
  type CalendarLayer,
} from "@/lib/plan/calendar-entries";

/**
 * The calendar's divided metric strip: next mock, plan completion, this week's
 * load, and scheduled mocks done — all derived from the plan payload, with the
 * personal layer's outstanding count folded into the "this week" hint when it
 * is visible. Two cells are deliberately static: they have no surface to open,
 * and inventing one would be worse than the documented exception.
 */
export function CalendarMetrics({
  index,
  layers,
  today,
  onOpenNextMock,
  onOpenWeek,
  onOpenDate,
}: {
  index: CalendarIndex;
  layers: readonly CalendarLayer[];
  today: string;
  onOpenNextMock: (found: { task: PlanTaskView; day: PlanDayView }) => void;
  onOpenWeek: () => void;
  onOpenDate: (iso: string) => void;
}) {
  const days = [...index.planDayByDate.values()];
  const totals = index.totals;
  const next = nextMockDay(days, today);

  const week = weekRange(today);
  const weekDates = datesBetween(index, week.from, week.to, layers);
  const weekCounts = weekDates.reduce(
    (acc, date) => {
      const counts = countEntries(entriesFor(index, date, layers));
      return {
        planDone: acc.planDone + counts.plan.done,
        planTotal: acc.planTotal + counts.plan.total,
        tasks: acc.tasks + counts.tasks.total,
        mocks: acc.mocks + counts.mocks,
      };
    },
    { planDone: 0, planTotal: 0, tasks: 0, mocks: 0 },
  );

  const planPct =
    totals.plan.total === 0
      ? 0
      : Math.round((totals.plan.done / totals.plan.total) * 100);
  const mocks = days.flatMap((day) =>
    day.tasks.filter((task) => isMockType(task.type)),
  );
  const mocksDone = mocks.filter((task) => task.completed).length;

  return (
    <div className="strip-frame">
      <div className="metric-strip">
        <MetricCell
          label="Next mock"
          icon="file"
          value={next ? shortDate(next.task.date) : "—"}
          hint={
            next
              ? next.task.name
              : totals.plan.total > 0
                ? "Every mock in the plan is done"
                : "No mock scheduled"
          }
          pct={null}
          onClick={next ? () => onOpenNextMock(next) : undefined}
        />
        <MetricCell
          label="Plan completed"
          icon="target"
          value={`${planPct}%`}
          hint={`${totals.plan.done} of ${totals.plan.total} scheduled`}
          pct={planPct / 100}
          onClick={
            days.length
              ? () => {
                  const inPlan = days.find((day) => day.date >= today) ?? days[0];
                  if (inPlan) onOpenDate(inPlan.date);
                }
              : undefined
          }
        />
        <MetricCell
          label="This week"
          icon="calendar"
          value={
            weekCounts.planTotal > 0
              ? `${weekCounts.planDone}/${weekCounts.planTotal}`
              : "—"
          }
          hint={
            weekCounts.tasks || weekCounts.mocks
              ? `${weekCounts.tasks} personal · ${weekCounts.mocks} logged`
              : `${shortDate(week.from)} – ${shortDate(week.to)}`
          }
          pct={
            weekCounts.planTotal > 0
              ? weekCounts.planDone / weekCounts.planTotal
              : null
          }
          onClick={onOpenWeek}
        />
        <MetricCell
          label="Mocks done"
          icon="success"
          value={`${mocksDone}/${mocks.length}`}
          hint="Scheduled mocks completed"
          pct={mocks.length > 0 ? mocksDone / mocks.length : null}
        />
      </div>
    </div>
  );
}
