"use client";
import { MetricCell } from "../../metric-strip";
import { shortDate } from "@/lib/format";
import {
  dayAssignmentStats,
  isMockType,
  nextMockDay,
  planProgressStats,
  weekRange,
  type PlanDayView,
  type PlanTaskView,
} from "@/lib/plan/view-model";

/**
 * The calendar's divided metric strip. Four cells, all derived from the plan
 * payload — no invented numbers, no second stat strip elsewhere on the page.
 *
 * Two of the four are deliberately static: `Plan completed` and `Mocks done`
 * have no destination to act on, so they render as plain cells. `DESIGN.md`
 * asks each cell to be a single link target; that rule assumes a surface to
 * open, and inventing one would be worse than stating the exception.
 */
export function CalendarMetrics({
  days,
  today,
  onOpenNextMock,
  onOpenWeek,
}: {
  days: PlanDayView[];
  today: string;
  onOpenNextMock: (found: { task: PlanTaskView; day: PlanDayView }) => void;
  onOpenWeek: () => void;
}) {
  const stats = planProgressStats(days);
  const next = nextMockDay(days, today);
  const week = weekRange(today);
  const weekDays = days.filter(
    (day) => day.date >= week.from && day.date <= week.to,
  );
  const weekTotal = weekDays.reduce((sum, day) => sum + day.tasks.length, 0);
  const weekDone = weekDays.reduce(
    (sum, day) => sum + dayAssignmentStats(day).completed,
    0,
  );
  const mocks = days.flatMap((day) =>
    day.tasks.filter((task) => isMockType(task.type)),
  );
  const mocksDone = mocks.filter((task) => task.completed).length;

  return (
    <div className="metric-strip metric-strip-scroll">
      <MetricCell
        label="Next mock"
        icon="file"
        value={next ? shortDate(next.task.date) : "—"}
        hint={
          next
            ? next.task.name
            : stats.totalAssignments > 0
              ? "Every mock in the plan is done"
              : "No mock scheduled"
        }
        pct={null}
        onClick={next ? () => onOpenNextMock(next) : undefined}
      />
      <MetricCell
        label="Plan completed"
        icon="target"
        value={`${stats.completionPct}%`}
        hint={`${stats.completedAssignments} of ${stats.totalAssignments} assignments`}
        pct={stats.completionPct / 100}
      />
      <MetricCell
        label="This week"
        icon="calendar"
        value={weekTotal > 0 ? `${weekDone}/${weekTotal}` : "—"}
        hint={`${shortDate(week.from)} – ${shortDate(week.to)}`}
        pct={weekTotal > 0 ? weekDone / weekTotal : null}
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
  );
}
