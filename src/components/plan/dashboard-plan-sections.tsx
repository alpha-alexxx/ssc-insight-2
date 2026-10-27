"use client";
import Link from "next/link";
import { Panel } from "../dashboard-panels";
import { PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { CategoryChip } from "./plan-shared";
import { usePlanData } from "../use-plan-data";
import { shortDate } from "@/lib/format";
import {
  istTodayIso,
  nextRecommendedAction,
  planProgressStats,
  revisionQueue,
  upcomingMocks,
} from "@/lib/plan/view-model";

/**
 * Plan sections for the dashboard: Today's Focus, Study Plan Progress,
 * Upcoming tests, the Revision queue, and a My Tasks preview — all derived
 * from the same merged plan+progress payload the planner views use. They
 * sit above the existing performance analytics, which keep answering
 * "how am I performing" with recorded tracker results.
 */
export function DashboardPlanSections({
  planApi,
}: {
  planApi: ReturnType<typeof usePlanData>;
}) {
  const { plan, loading, error, refresh, personalTasks, updateTask } = planApi;
  const today = istTodayIso();

  if (loading && !plan)
    return (
      <div className="panel p-6 animate-pulse mb-6" aria-busy="true">
        <div className="h-5 w-52 bg-rule-soft rounded mb-4" />
        <div className="h-24 w-full bg-rule-soft rounded" />
      </div>
    );
  if (!plan)
    return (
      <div className="mb-6">
        <div
          role="alert"
          className="flex flex-wrap gap-3 justify-between items-center bg-warning-soft text-warning border border-warning rounded-control px-5 py-4"
        >
          <p className="text-sm font-medium">
            The study plan could not load{error ? `: ${error}` : "."}
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="border border-warning rounded-control px-3 py-2 text-xs font-medium hover:bg-warning/10 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );

  const stats = planProgressStats(plan.days);
  const todayPlan = plan.days.find((day) => day.date === today);
  const focus = nextRecommendedAction(plan.days, today);
  const upcoming = upcomingMocks(plan.days, today, 4);
  const revision = revisionQueue(plan.days, today);
  const overduePersonal = personalTasks.filter(
    (t) => t.status !== "completed" && t.dueDate && t.dueDate < today,
  );
  const todayPersonal = personalTasks.filter(
    (t) => t.status !== "completed" && t.dueDate === today,
  );
  const highPriority = personalTasks
    .filter(
      (t) =>
        t.status !== "completed" && t.priority === "high" && t.dueDate !== today && (!t.dueDate || t.dueDate > today),
    )
    .slice(0, 3);
  const todayPhase = todayPlan ? plan.phases.find((p) => p.phase === todayPlan.phase) : null;

  return (
    <div className="space-y-6 mb-8">
      <Panel
        icon="fire"
        title="Today's focus"
        description={
          todayPlan
            ? `Day ${todayPlan.day} of 50 · ${todayPhase?.name ?? `Phase ${todayPlan.phase}`} · ${todayPlan.dayType}`
            : "Today is outside the 50-day plan window (26 Oct – 14 Dec)."
        }
        action={
          todayPlan ? (
            <Link href={`/plan/${today}`}>
              <Button size="sm" variant="outline">
                Open today&apos;s plan
              </Button>
            </Link>
          ) : (
            <Link href="/calendar">
              <Button size="sm" variant="outline">
                Open the calendar
              </Button>
            </Link>
          )
        }
      >
        <div className="px-6 pb-5">
          {todayPlan ? (
            <>
              {todayPlan.tasks.length === 0 ? (
                <p className="text-sm muted">Nothing is scheduled for today.</p>
              ) : (
                <ul className="divide-y divide-rule-soft border border-rule-soft rounded-control overflow-hidden">
                  {todayPlan.tasks.slice(0, 4).map((task) => (
                    <li key={task.key} className="flex items-center gap-3 px-4 py-2.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={task.completed}
                        aria-label={`Mark ${task.name} ${task.completed ? "incomplete" : "complete"}`}
                        onClick={() => updateTask(task.key, { completed: !task.completed })}
                        className={`flex size-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                          task.completed
                            ? "border-positive bg-positive-soft text-positive"
                            : "border-rule bg-paper hover:border-ink"
                        }`}
                      >
                        {task.completed && <PlainIcon name="check" size={12} />}
                      </button>
                      <span className={`min-w-0 flex-1 text-[13px] truncate ${task.completed ? "muted line-through" : ""}`}>
                        {task.name}
                      </span>
                      <CategoryChip type={task.type} />
                    </li>
                  ))}
                </ul>
              )}
              {todayPlan.tasks.length > 4 && (
                <p className="mt-2 text-xs muted">
                  +{todayPlan.tasks.length - 4} more on today&apos;s plan
                </p>
              )}
            </>
          ) : (
            <p className="text-sm muted">
              Browse the calendar to revisit the plan, or log a mock in the tracker.
            </p>
          )}

          {focus && (
            <div className="mt-4 border border-accent/40 bg-accent-soft rounded-control p-4">
              <p className="section-label text-accent">Next up</p>
              <p className="mt-1 text-sm font-medium">{focus.task.name}</p>
              <p className="text-xs muted mt-0.5">
                {shortDate(focus.task.date)} · Plan day {focus.day.day}
                {focus.overdue ? " · behind the plan" : focus.task.date === today ? "" : " · upcoming"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href={`/plan/${focus.task.date}`}>
                  <Button size="sm">Go to it</Button>
                </Link>
                <a href={focus.task.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">
                    <PlainIcon name="arrowUpRight" size={12} /> Open test
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          icon="trend"
          title="Study plan progress"
          description={`${stats.completedAssignments} of ${stats.totalAssignments} assignments complete.`}
        >
          <div className="px-6 pb-5">
            <div
              className="h-2.5 bg-soft rounded-pill overflow-hidden"
              role="progressbar"
              aria-valuenow={stats.completionPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Plan completion"
            >
              <div className="h-full bg-accent" style={{ width: `${stats.completionPct}%` }} />
            </div>
            <p className="mt-2 text-xs muted tabular">{stats.completionPct}% complete</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {(
                [
                  ["Days done", `${stats.completedDays}/${stats.totalDays}`],
                  ["Assignments", `${stats.completedAssignments}/${stats.totalAssignments}`],
                  ["Days started", `${plan.days.filter((d) => d.tasks.some((t) => t.completed)).length}/${stats.totalDays}`],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="border border-rule-soft rounded-control p-3">
                  <p className="font-serif text-xl tabular">{value}</p>
                  <p className="text-[10px] muted mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] muted leading-relaxed">
              &ldquo;Days done&rdquo; counts only fully complete days — every assignment and the
              whole checklist. &ldquo;Days started&rdquo; counts any completed work.
            </p>
            <div className="mt-3 flex gap-1.5" aria-label="Plan phases">
              {plan.phases.map((phase) => {
                const active = todayPlan?.phase === phase.phase;
                const past =
                  todayPlan ? todayPlan.day > Number(phase.days.split("-").at(-1)) : false;
                return (
                  <div
                    key={phase.phase}
                    className={`flex-1 rounded-control border px-2.5 py-1.5 text-[10px] ${
                      active
                        ? "border-accent bg-accent-soft text-accent font-medium"
                        : past
                          ? "border-positive/40 bg-positive-soft text-positive"
                          : "border-rule-soft bg-canvas text-muted"
                    }`}
                  >
                    {phase.name}
                    <span className="block opacity-75">Days {phase.days}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel
          icon="calendar"
          title="Upcoming tests"
          description="Next scheduled work from the plan."
          action={
            <Link href="/calendar">
              <Button size="sm" variant="ghost">
                View calendar
              </Button>
            </Link>
          }
        >
          <div className="px-6 pb-5">
            {upcoming.length === 0 ? (
              <p className="text-sm muted">
                Every scheduled test is complete — outstanding work.
              </p>
            ) : (
              <ul className="divide-y divide-rule-soft border border-rule-soft rounded-control overflow-hidden">
                {upcoming.map(({ task }) => (
                  <li key={task.key} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">{task.name}</p>
                      <p className="text-[11px] muted mt-0.5 flex flex-wrap items-center gap-x-2">
                        <Link href={`/plan/${task.date}`} className="hover:text-accent transition-colors">
                          {shortDate(task.date)}
                        </Link>
                        <CategoryChip type={task.type} />
                        <span className="tabular">
                          {task.questions} Q · {task.marks} marks
                        </span>
                      </p>
                    </div>
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${task.name} on RBE`}
                      className="muted hover:text-accent transition-colors"
                    >
                      <PlainIcon name="arrowUpRight" size={14} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          icon="refresh"
          title="Revision queue"
          description="Rev-1 same day · Rev-2 Sunday · Rev-3 final days 46–50."
        >
          <div className="px-6 pb-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              {(
                [
                  ["Rev-1", revision.rev1.length, "same-day"],
                  ["Rev-2", revision.rev2.length, "this week"],
                  ["Rev-3", revision.rev3.length, "final"],
                ] as const
              ).map(([label, count, hint]) => (
                <div key={label} className="border border-rule-soft rounded-control p-3">
                  <p className={`font-serif text-2xl tabular ${count > 0 ? "text-accent" : "muted"}`}>
                    {count}
                  </p>
                  <p className="text-[10px] muted mt-0.5">
                    {label} · {hint}
                  </p>
                </div>
              ))}
            </div>
            {revision.total > 0 ? (
              <ul className="mt-3 space-y-1.5 text-xs muted">
                {revision.items.slice(0, 3).map((item) => (
                  <li key={`${item.kind}:${item.id}`} className="truncate">
                    <span className="text-ink font-medium">{item.label}</span>{" "}
                    · {shortDate(item.date)} · {item.kind}
                  </li>
                ))}
                {revision.total > 3 && <li>+{revision.total - 3} more pending</li>}
              </ul>
            ) : (
              <p className="mt-3 text-xs positive">Revision is fully caught up.</p>
            )}
            <p className="mt-3 text-[11px] muted leading-relaxed">
              Revision completion is manual — attempting a test never marks its
              revision done.
            </p>
          </div>
        </Panel>

        <Panel
          icon="check"
          title="My tasks"
          description="Personal tasks on top of the plan."
          action={
            <Link href="/my-tasks">
              <Button size="sm" variant="ghost">
                All tasks
              </Button>
            </Link>
          }
        >
          <div className="px-6 pb-5">
            {overduePersonal.length + todayPersonal.length + highPriority.length === 0 ? (
              <p className="text-sm muted">
                Nothing outstanding.{" "}
                <Link href="/my-tasks" className="text-accent hover:underline">
                  Add a personal task
                </Link>{" "}
                alongside the plan.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {overduePersonal.slice(0, 2).map((task) => (
                  <li key={task.id} className="flex justify-between gap-2">
                    <span className="truncate">{task.title}</span>
                    <span className="text-danger text-xs whitespace-nowrap">
                      Overdue{task.dueDate ? ` · ${shortDate(task.dueDate)}` : ""}
                    </span>
                  </li>
                ))}
                {todayPersonal.slice(0, 2).map((task) => (
                  <li key={task.id} className="flex justify-between gap-2">
                    <span className="truncate">{task.title}</span>
                    <span className="text-xs muted whitespace-nowrap">Due today</span>
                  </li>
                ))}
                {highPriority.map((task) => (
                  <li key={task.id} className="flex justify-between gap-2">
                    <span className="truncate">{task.title}</span>
                    <span className="text-accent text-xs whitespace-nowrap">High priority</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
