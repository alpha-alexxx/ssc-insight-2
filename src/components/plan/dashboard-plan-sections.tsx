"use client";
import Link from "next/link";
import { Panel } from "../dashboard-panels";
import { PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { CategoryChip } from "./plan-shared";
import { shortDate } from "@/lib/format";
import {
  dayAssignmentStats,
  nextRecommendedAction,
  planProgressStats,
  revisionQueue,
  upcomingMocks,
  type PersonalTaskView,
  type PlanDayView,
  type PlanPayload,
  type PlanTaskView,
} from "@/lib/plan/view-model";

type PlanApi = {
  updateTask: (
    key: string,
    patch: { completed: boolean },
  ) => void | Promise<void>;
};

export type PlanWithToday = PlanPayload & { today: string };

/**
 * Reusable dashboard plan panels. The dashboard owns loading/error states and
 * arranges these compact panels; the same derivations feed the calendar and
 * daily workspace, so no second planner data model is introduced.
 */

export function TodayFocusPanel({
  plan,
  today,
  planApi,
  onOpenDay,
}: {
  plan: PlanWithToday;
  today: string;
  planApi: PlanApi;
  onOpenDay: (date: string) => void;
}) {
  const todayPlan = plan.days.find((day) => day.date === today);
  const stats = todayPlan ? dayAssignmentStats(todayPlan) : null;
  const focus = nextRecommendedAction(plan.days, today);
  const phase = todayPlan
    ? plan.phases.find((item) => item.phase === todayPlan.phase)
    : null;

  return (
    <Panel
      dense
      icon="fire"
      title="Today's focus"
      description={
        todayPlan
          ? `Day ${todayPlan.day} of 50 · ${phase?.name ?? `Phase ${todayPlan.phase}`} · ${todayPlan.dayType}`
          : "Today is outside the 50-day plan window."
      }
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenDay(todayPlan?.date ?? plan.startDate)}
        >
          {todayPlan ? "Open day" : "Calendar"}
        </Button>
      }
    >
      <div className="px-4 pb-3.5">
        {todayPlan ? (
          <>
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-muted">
              <span>
                {stats?.completed ?? 0}/{stats?.total ?? 0} assignments done
              </span>
              <span className="tabular">
                {todayPlan.checklist.filter((item) => item.done).length}/
                {todayPlan.checklist.length} checklist
              </span>
            </div>
            {todayPlan.tasks.length === 0 ? (
              <p className="py-2 text-xs text-muted">
                Nothing is scheduled for today.
              </p>
            ) : (
              <ul className="divide-y divide-rule-soft overflow-hidden rounded-control border border-rule-soft">
                {todayPlan.tasks.slice(0, 5).map((task) => (
                  <li key={task.key} className="flex items-center gap-2.5 px-3 py-2">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={task.completed}
                      aria-label={`Mark ${task.name} ${task.completed ? "incomplete" : "complete"}`}
                      onClick={() =>
                        planApi.updateTask(task.key, {
                          completed: !task.completed,
                        })
                      }
                      className={`flex size-4.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                        task.completed
                          ? "border-positive bg-positive-soft text-positive"
                          : "border-rule bg-paper hover:border-ink"
                      }`}
                    >
                      {task.completed && <PlainIcon name="check" size={10} />}
                    </button>
                    <span
                      className={`min-w-0 flex-1 truncate text-xs ${
                        task.completed ? "text-muted line-through" : ""
                      }`}
                    >
                      {task.name}
                    </span>
                    <CategoryChip type={task.type} />
                  </li>
                ))}
              </ul>
            )}
            {todayPlan.tasks.length > 5 && (
              <p className="mt-1.5 text-[10px] text-muted">
                +{todayPlan.tasks.length - 5} more on today&apos;s plan
              </p>
            )}
          </>
        ) : (
          <p className="py-2 text-xs text-muted">
            Browse the calendar to revisit the plan, or log a mock in the
            tracker.
          </p>
        )}

        {focus && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control border border-accent/35 bg-accent-soft px-3 py-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-accent">
              Next up
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {focus.task.name}
            </span>
            <button
              type="button"
              onClick={() => onOpenDay(focus.task.date)}
              className="text-[10px] font-medium text-accent hover:text-accent-hover"
            >
              {shortDate(focus.task.date)}
              {focus.overdue ? " · overdue" : ""}
            </button>
          </div>
        )}
      </div>
    </Panel>
  );
}

export function PlanProgressPanel({
  plan,
  today,
}: {
  plan: PlanWithToday;
  today: string;
}) {
  const stats = planProgressStats(plan.days);
  const todayPlan = plan.days.find((day) => day.date === today);
  const focus = nextRecommendedAction(plan.days, today);
  return (
    <Panel
      dense
      icon="trend"
      title="Study progress"
      description={`${stats.completedAssignments} of ${stats.totalAssignments} assignments complete.`}
    >
      <div className="px-4 pb-4">
        <div
          className="h-1.5 overflow-hidden rounded-pill bg-soft"
          role="progressbar"
          aria-valuenow={stats.completionPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Plan completion"
        >
          <div
            className="h-full bg-accent"
            style={{ width: `${stats.completionPct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
          <span>{stats.completionPct}% complete</span>
          <span>
            {stats.completedDays}/{stats.totalDays} full days
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(
            [
              ["Done", `${stats.completedAssignments}`],
              ["Left", `${stats.totalAssignments - stats.completedAssignments}`],
              ["Days", `${todayPlan?.day ?? "—"}/50`],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="min-w-0">
              <p className="font-serif text-lg leading-none tabular">{value}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-muted">
                {label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-1" aria-label="Plan phases">
          {plan.phases.map((phase) => {
            const active = todayPlan?.phase === phase.phase;
            const past = todayPlan
              ? todayPlan.day > Number(phase.days.split("-").at(-1))
              : false;
            return (
              <div
                key={phase.phase}
                className={`min-w-0 flex-1 rounded-control border px-2 py-1.5 text-[9px] ${
                  active
                    ? "border-accent bg-accent-soft font-medium text-accent"
                    : past
                      ? "border-positive/35 bg-positive-soft text-positive"
                      : "border-rule-soft bg-canvas text-muted"
                }`}
              >
                <span className="block truncate">{phase.name}</span>
                <span className="block opacity-75">Days {phase.days}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 border-t border-rule-soft pt-2 text-[10px] text-muted">
          {focus ? (
            <>
              <span className="font-medium text-ink">Next milestone:</span>{" "}
              {focus.task.name} · {shortDate(focus.task.date)}
            </>
          ) : (
            "Every scheduled assignment is complete."
          )}
        </div>
      </div>
    </Panel>
  );
}

export function UpcomingTestsPanel({
  plan,
  today,
  onOpenDay,
}: {
  plan: PlanWithToday;
  today: string;
  onOpenDay: (date: string) => void;
}) {
  const upcoming = upcomingMocks(plan.days, today, 5);
  return (
    <Panel
      dense
      icon="calendar"
      title="Upcoming tests"
      description="Scheduled work from the plan."
      action={
        <Link
          href="/calendar"
          className="text-[10px] font-medium text-accent hover:text-accent-hover"
        >
          Calendar
        </Link>
      }
    >
      <div className="px-4 pb-3.5">
        {upcoming.length === 0 ? (
          <p className="py-2 text-xs text-muted">
            No scheduled tests left in the plan.
          </p>
        ) : (
          <ul className="divide-y divide-rule-soft overflow-hidden rounded-control border border-rule-soft">
            {upcoming.map(({ task, day }) => (
              <li key={task.key} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{task.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted">
                    <span className="rounded-pill border border-rule-soft bg-soft px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.06em]">
                      Scheduled
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenDay(day.date)}
                      className="tabular hover:text-accent"
                    >
                      {shortDate(day.date)}
                    </button>
                    <CategoryChip type={task.type} />
                  </p>
                </div>
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${task.name}`}
                  className="shrink-0 text-muted transition-colors hover:text-accent"
                >
                  <PlainIcon name="arrowUpRight" size={14} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

export function RevisionQueuePanel({
  plan,
  today,
}: {
  plan: PlanWithToday;
  today: string;
}) {
  const revision = revisionQueue(plan.days, today);
  return (
    <Panel
      dense
      icon="refresh"
      title="Revision queue"
      description="Rev-1 same day · Rev-2 weekly · Rev-3 final."
    >
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["Rev-1", revision.rev1.length],
              ["Rev-2", revision.rev2.length],
              ["Rev-3", revision.rev3.length],
            ] as const
          ).map(([label, count]) => (
            <div key={label} className="min-w-0">
              <p
                className={`font-serif text-xl tabular ${
                  count > 0 ? "text-accent" : "text-muted"
                }`}
              >
                {count}
              </p>
              <p className="text-[9px] uppercase tracking-[0.08em] text-muted">
                {label}
              </p>
            </div>
          ))}
        </div>
        {revision.total > 0 ? (
          <ul className="mt-2 space-y-1 text-[10px] text-muted">
            {revision.items.slice(0, 2).map((item) => (
              <li key={`${item.kind}:${item.id}`} className="truncate">
                <span className="font-medium text-ink">{item.label}</span>
                {" · "}
                {shortDate(item.date)} · {item.kind}
              </li>
            ))}
            {revision.total > 2 && <li>+{revision.total - 2} more pending</li>}
          </ul>
        ) : (
          <p className="mt-2 text-[10px] text-positive">
            Revision is fully caught up.
          </p>
        )}
        <p className="mt-2 text-[9px] leading-relaxed text-muted">
          Completion is manual; attempting a test never marks revision done.
        </p>
      </div>
    </Panel>
  );
}

export function PersonalTasksPanel({
  personalTasks,
  today,
}: {
  personalTasks: PersonalTaskView[];
  today: string;
}) {
  const overdue = personalTasks.filter(
    (task) => task.status !== "completed" && task.dueDate && task.dueDate < today,
  );
  const dueToday = personalTasks.filter(
    (task) => task.status !== "completed" && task.dueDate === today,
  );
  const high = personalTasks
    .filter(
      (task) =>
        task.status !== "completed" &&
        task.priority === "high" &&
        task.dueDate !== today &&
        (!task.dueDate || task.dueDate > today),
    )
    .slice(0, 2);
  const total = overdue.length + dueToday.length + high.length;
  return (
    <Panel
      dense
      icon="check"
      title="My tasks"
      description="Personal work outside the plan."
      action={
        <Link
          href="/my-tasks"
          className="text-[10px] font-medium text-accent hover:text-accent-hover"
        >
          All tasks
        </Link>
      }
    >
      <div className="px-4 pb-4">
        {total === 0 ? (
          <p className="text-xs text-muted">
            Nothing outstanding.{" "}
            <Link href="/my-tasks" className="text-accent hover:underline">
              Add a personal task
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-1.5 text-[11px]">
            {overdue.slice(0, 2).map((task) => (
              <li key={task.id} className="flex justify-between gap-2">
                <span className="truncate">{task.title}</span>
                <span className="whitespace-nowrap text-danger">Overdue</span>
              </li>
            ))}
            {dueToday.slice(0, 2).map((task) => (
              <li key={task.id} className="flex justify-between gap-2">
                <span className="truncate">{task.title}</span>
                <span className="whitespace-nowrap text-muted">Due today</span>
              </li>
            ))}
            {high.map((task) => (
              <li key={task.id} className="flex justify-between gap-2">
                <span className="truncate">{task.title}</span>
                <span className="whitespace-nowrap text-accent">High</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

export type DashboardPlanApi = PlanApi & {
  plan: PlanWithToday | null;
  personalTasks: PersonalTaskView[];
};

export type { PlanDayView, PlanPayload, PlanTaskView };
