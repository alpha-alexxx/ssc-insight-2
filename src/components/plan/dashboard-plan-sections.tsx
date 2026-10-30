"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Flag } from "lucide-react";
import { Panel } from "../dashboard-panels";
import { PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { CategoryChip } from "./plan-shared";
import { longDate, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
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
  date,
  planApi,
  onOpenDay,
}: {
  plan: PlanWithToday;
  today: string;
  /** The day this panel displays; defaults to today. */
  date?: string;
  planApi: PlanApi;
  onOpenDay: (date: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const focusDate = date ?? today;
  const shownDay = plan.days.find((day) => day.date === focusDate);
  const stats = shownDay ? dayAssignmentStats(shownDay) : null;
  // The dashboard head already states the day position and day type, so the
  // panel names the phase instead of repeating them.
  const phaseName = shownDay
    ? plan.phases.find((phase) => phase.phase === shownDay.phase)?.name
    : undefined;
  const focus = nextRecommendedAction(plan.days, today);
  const visibleTasks = shownDay
    ? expanded
      ? shownDay.tasks
      : shownDay.tasks.slice(0, 5)
    : [];
  const checklistDone = shownDay
    ? shownDay.checklist.filter((item) => item.done).length
    : 0;

  function openTask(task: PlanTaskView) {
    if (task.url) window.open(task.url, "_blank", "noopener,noreferrer");
    else onOpenDay(task.date);
  }

  return (
    <Panel
      dense
      icon="book"
      title="Study Plan"
      description={
        shownDay
          ? phaseName
            ? `Phase ${shownDay.phase} · ${phaseName}`
            : "Today's scheduled work."
          : "Browse the calendar to revisit the plan."
      }
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenDay(shownDay?.date ?? plan.startDate)}
        >
          Open day <PlainIcon name="arrowUpRight" size={12} />
        </Button>
      }
    >
      <div className="px-4 pb-3.5">
        {shownDay ? (
          <>
            <div className="mb-3 flex items-center">
              <div className="flex flex-1 items-center justify-center py-1">
                <ProgressRing
                  value={stats?.completed ?? 0}
                  total={stats?.total ?? 0}
                  caption="assignments done"
                />
              </div>
              <div className="h-10 w-px bg-rule-soft" aria-hidden="true" />
              <div className="flex flex-1 items-center justify-center py-1">
                <ProgressRing
                  value={checklistDone}
                  total={shownDay.checklist.length}
                  caption="checklist"
                />
              </div>
            </div>
            {shownDay.tasks.length === 0 ? (
              <p className="py-2 text-xs text-muted">
                Nothing is scheduled for this day.
              </p>
            ) : (
              <ul className="divide-y divide-rule-soft overflow-hidden rounded-control border border-rule-soft">
                {visibleTasks.map((task) => (
                  <li
                    key={task.key}
                    className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-soft motion-reduce:transition-none"
                  >
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
                    <button
                      type="button"
                      aria-label={`Open ${task.name}`}
                      onClick={() => openTask(task)}
                      className="shrink-0 text-muted transition-colors hover:text-accent"
                    >
                      <PlainIcon name="chevronRight" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {shownDay.tasks.length > 5 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                className="mt-2 inline-flex items-center gap-1 text-[0.625rem] font-medium text-muted transition-colors hover:text-ink"
              >
                {expanded
                  ? "Show fewer"
                  : `+${shownDay.tasks.length - 5} more on ${focusDate === today ? "today's" : "this day's"} plan`}
                <ChevronDown
                  size={12}
                  className={cn(
                    "transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </button>
            )}
          </>
        ) : (
          <p className="py-2 text-xs text-muted">
            Browse the calendar to revisit the plan, or log a mock in the
            tracker.
          </p>
        )}

        {focus && (
          <div className="callout-accent mt-3">
            <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-accent">
              Next up
            </span>
            <PlainIcon name="file" size={13} className="text-accent" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {focus.task.name}
            </span>
            <button
              type="button"
              onClick={() => onOpenDay(focus.task.date)}
              className="inline-flex items-center gap-1.5 text-[0.625rem] font-medium text-accent hover:text-accent-hover"
            >
              <PlainIcon name="calendar" size={12} />
              {shortDate(focus.task.date)}
              {focus.overdue ? " · overdue" : ""}
            </button>
            <PlainIcon name="chevronRight" size={13} className="text-accent" />
          </div>
        )}
      </div>
    </Panel>
  );
}

function ProgressRing({
  value,
  total,
  caption,
}: {
  value: number;
  total: number;
  caption: string;
}) {
  const ratio = total > 0 ? value / total : 0;
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <svg
        viewBox="0 0 40 40"
        className="size-10 shrink-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="4"
          style={{ stroke: "var(--rule-soft)" }}
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          style={{
            stroke: "var(--accent)",
            strokeDasharray: `${circumference * ratio} ${circumference}`,
          }}
        />
      </svg>
      <div className="min-w-0">
        <p className="font-serif text-xl leading-none tabular">
          {value}/{total}
        </p>
        <p className="mt-1 text-[0.625rem] text-muted">{caption}</p>
      </div>
    </div>
  );
}

/**
 * The three study panels merged into one dashboard card: plan progress,
 * upcoming tests, and the revision queue as labelled sections.
 */
export function StudyPipelinePanel({
  plan,
  today,
  onOpenDay,
}: {
  plan: PlanWithToday;
  today: string;
  onOpenDay: (date: string) => void;
}) {
  const todayPlan = plan.days.find((day) => day.date === today);
  return (
    <Panel
      dense
      icon="trend"
      title="Study pipeline"
      description="Track your learning track and revision in one place."
      className="min-w-0"
      action={
        todayPlan ? (
          <Button variant="outline" size="sm" onClick={() => onOpenDay(today)}>
            <PlainIcon name="target" size={12} />
            Plan day {todayPlan.day} of 50
          </Button>
        ) : null
      }
    >
      <div className="px-4 pb-4">
        <PipelineProgressSection
          plan={plan}
          today={today}
          onOpenDay={onOpenDay}
        />
        <PipelineUpcomingSection
          plan={plan}
          today={today}
          onOpenDay={onOpenDay}
        />
        <PipelineRevisionSection
          plan={plan}
          today={today}
          onOpenDay={onOpenDay}
        />
      </div>
    </Panel>
  );
}

function PipelineProgressSection({
  plan,
  today,
  onOpenDay,
}: {
  plan: PlanWithToday;
  today: string;
  onOpenDay: (date: string) => void;
}) {
  const stats = planProgressStats(plan.days);
  const todayPlan = plan.days.find((day) => day.date === today);
  const todayStats = todayPlan ? dayAssignmentStats(todayPlan) : null;
  const focus = nextRecommendedAction(plan.days, today);
  return (
    <section aria-label="Plan progress">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-muted">
          Progress
        </h3>
      </div>
      <div>
        {/* Same square 2px progress rule as the metric strip — the pill
            progress bar was the one off-idiom gauge left on the dashboard. */}
        <div
          className="metric-rule"
          role="progressbar"
          aria-valuenow={stats.completionPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Plan completion"
        >
          <span style={{ width: `${stats.completionPct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[0.625rem] text-muted">
          <span>{stats.completionPct}% complete</span>
          <span>
            {todayStats
              ? `${todayStats.completed}/${todayStats.total} on day ${todayPlan?.day}`
              : "—"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(
            [
              ["success", "Done", `${stats.completedAssignments}`],
              [
                "file",
                "Left",
                `${stats.totalAssignments - stats.completedAssignments}`,
              ],
              ["calendar", "Days", `${todayPlan?.day ?? "—"}/50`],
            ] as const
          ).map(([icon, label, value]) => (
            <div key={label} className="flex min-w-0 items-center gap-2">
              <PlainIcon
                name={icon}
                size={15}
                className="shrink-0 text-accent"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="font-serif text-lg leading-none tabular">
                  {value}
                </p>
                <p className="mt-0.5 text-[0.5625rem] uppercase tracking-[0.08em] text-muted">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
        {/* Mobile: stacked list — the chevron strip truncates to a few
            characters per phase at phone widths. */}
        <div className="mt-3 flex flex-col divide-y divide-rule-soft rounded-control border border-rule-soft sm:hidden" aria-label="Plan phases">
          {plan.phases.map((phase) => {
            const active = todayPlan?.phase === phase.phase;
            const past = todayPlan
              ? todayPlan.day > Number(phase.days.split("-").at(-1))
              : false;
            return (
              <div
                key={phase.phase}
                className={cn(
                  "flex items-center gap-2 px-3 py-2",
                  active
                    ? "bg-accent-soft"
                    : past
                      ? "bg-positive-soft"
                      : "bg-canvas",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold tabular",
                    active
                      ? "bg-accent text-paper"
                      : past
                        ? "bg-positive text-paper"
                        : "bg-soft text-muted",
                  )}
                  aria-hidden="true"
                >
                  {phase.phase}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[0.6875rem] font-medium",
                    active
                      ? "text-accent"
                      : past
                        ? "text-positive"
                        : "text-ink",
                  )}
                >
                  {phase.name}
                </span>
                <span className="shrink-0 text-[0.5625rem] leading-tight text-muted">
                  Days {phase.days}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 hidden gap-1.5 sm:flex">
          {plan.phases.map((phase, index) => {
            const active = todayPlan?.phase === phase.phase;
            const past = todayPlan
              ? todayPlan.day > Number(phase.days.split("-").at(-1))
              : false;
            const first = index === 0;
            const last = index === plan.phases.length - 1;
            return (
              <div
                key={phase.phase}
                className={cn(
                  "min-w-0 flex-1 py-2 pl-3 pr-4",
                  active
                    ? "bg-accent-soft"
                    : past
                      ? "bg-positive-soft"
                      : "bg-canvas",
                )}
                style={{
                  clipPath: first
                    ? "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)"
                    : last
                      ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)"
                      : "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold tabular",
                      active
                        ? "bg-accent text-paper"
                        : past
                          ? "bg-positive text-paper"
                          : "bg-soft text-muted",
                    )}
                    aria-hidden="true"
                  >
                    {phase.phase}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-[0.625rem] font-medium",
                        active
                          ? "text-accent"
                          : past
                            ? "text-positive"
                            : "text-ink",
                      )}
                    >
                      {phase.name}
                    </span>
                    <span className="block text-[0.5625rem] leading-tight text-muted">
                      Days {phase.days}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="callout-accent mt-3">
          <Flag size={13} className="shrink-0 text-accent" aria-hidden="true" />
          <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-accent">
            Next milestone
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-medium">
            {focus
              ? `${focus.task.name} · ${shortDate(focus.task.date)}`
              : "Every scheduled assignment is complete."}
          </span>
          {focus && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[0.625rem]"
              onClick={() => onOpenDay(focus.task.date)}
            >
              View plan <PlainIcon name="arrowRight" size={12} />
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function PipelineUpcomingSection({
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
    <section
      aria-label="Upcoming tests"
      className="mt-3 border-t border-rule-soft pt-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-muted">
          Upcoming tests
        </h3>
        <Link
          href="/calendar"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[0.625rem] font-medium text-accent hover:text-accent-hover"
        >
          View all <PlainIcon name="arrowRight" size={12} />
        </Link>
      </div>
      <div>
        {upcoming.length === 0 ? (
          <p className="py-2 text-xs text-muted">
            No scheduled tests left in the plan.
          </p>
        ) : (
          <ul className="divide-y divide-rule-soft overflow-hidden rounded-control border border-rule-soft">
            {upcoming.map(({ task, day }) => (
              <li key={task.key} className="px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <PlainIcon
                    name="file"
                    size={14}
                    className="shrink-0 text-muted"
                    aria-hidden="true"
                  />
                  <p className="min-w-0 flex-1 truncate text-xs font-medium">
                    {task.name}
                  </p>
                  <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
                    <button
                      type="button"
                      onClick={() => onOpenDay(day.date)}
                      className="text-[0.625rem] tabular text-muted hover:text-accent"
                    >
                      {longDate(day.date)}
                    </button>
                    <CategoryChip type={task.type} />
                  </div>
                  <button
                    type="button"
                    aria-label={`Open ${task.name}`}
                    onClick={() =>
                      task.url
                        ? window.open(task.url, "_blank", "noopener,noreferrer")
                        : onOpenDay(day.date)
                    }
                    className="shrink-0 text-muted transition-colors hover:text-accent"
                  >
                    <PlainIcon name="chevronRight" size={14} />
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2 sm:hidden">
                  <button
                    type="button"
                    onClick={() => onOpenDay(day.date)}
                    className="text-[0.625rem] tabular text-muted hover:text-accent"
                  >
                    {shortDate(day.date)}
                  </button>
                  <CategoryChip type={task.type} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PipelineRevisionSection({
  plan,
  today,
  onOpenDay,
}: {
  plan: PlanWithToday;
  today: string;
  onOpenDay: (date: string) => void;
}) {
  const revision = revisionQueue(plan.days, today);
  const [expanded, setExpanded] = useState(false);
  // The three oldest items lead; expansion reveals the rest of the queue.
  const visible = expanded ? revision.items.slice(0, 8) : revision.items.slice(0, 3);
  return (
    <section
      aria-label="Revision queue"
      className="mt-3 border-t border-rule-soft pt-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-muted">
          Revision queue
        </h3>
        <span
          className={`text-[0.625rem] tabular ${
            revision.total > 0 ? "text-accent" : "text-positive"
          }`}
        >
          {revision.total > 0
            ? `${revision.total} pending`
            : "Fully caught up"}
        </span>
      </div>
      <div>
        {revision.total === 0 ? (
          <p className="py-2 text-xs text-positive">
            Nothing to revisit right now — new entries appear as you complete
            assignments.
          </p>
        ) : (
          <ul className="divide-y divide-rule-soft overflow-hidden rounded-control border border-rule-soft">
            {visible.map((item) => (
              <li key={`${item.kind}:${item.id}`}>
                <button
                  type="button"
                  onClick={() => onOpenDay(item.date)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-soft"
                >
                  <span
                    className={`inline-flex shrink-0 items-center rounded-pill border px-2 py-0.5 text-[0.625rem] font-medium ${
                      item.kind === "rev1"
                        ? "border-accent/40 bg-accent-soft text-accent"
                        : item.kind === "rev2"
                          ? "border-rule-soft bg-soft text-muted"
                          : "border-positive/40 bg-positive-soft text-positive"
                    }`}
                  >
                    Rev-{item.kind === "rev1" ? 1 : item.kind === "rev2" ? 2 : 3}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {item.label}
                  </span>
                  <span className="shrink-0 text-[0.625rem] tabular text-muted">
                    {shortDate(item.date)}
                  </span>
                  <PlainIcon
                    name="chevronRight"
                    size={14}
                    className="shrink-0 text-muted"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
        {revision.total > visible.length && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="mt-2 inline-flex items-center gap-1 text-[0.625rem] font-medium text-muted transition-colors hover:text-ink"
          >
            {expanded
              ? "Show fewer"
              : `+${revision.total - visible.length} more pending`}
            <ChevronDown
              size={12}
              className={cn("transition-transform", expanded && "rotate-180")}
            />
          </button>
        )}
        <p className="mt-2 text-[0.5625rem] leading-relaxed text-muted">
          Completion is manual; attempting a test never marks revision done.
        </p>
      </div>
    </section>
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
          className="whitespace-nowrap text-[0.625rem] font-medium text-accent hover:text-accent-hover"
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
          <ul className="space-y-1.5 text-[0.6875rem]">
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
