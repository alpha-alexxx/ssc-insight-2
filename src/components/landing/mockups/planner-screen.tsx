import type { LandingPlanData } from "../plan-facts";
import { PLAN_CATEGORIES } from "@/lib/plan/view-model";
import { MockChip } from "./data-parts";
import { MockPageHead, MockPanel, WorkspaceFrame } from "./workspace-frame";

/**
 * The study-calendar mockup: the month grid with category chips on the left
 * and the selected day's schedule on the right. Every row comes from the real
 * study-plan source via `plan-data.ts`, so names, question counts and marks
 * are the ones the workspace shows.
 */

/** A month grid shaped like the plan window (26 Oct – 14 Dec 2026). */
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Leading blanks so 1 Nov 2026 lands on a Sunday in a Monday-led grid. */
const NOVEMBER_OFFSET = 6;

function dayNumber(day: number) {
  return day;
}

export function PlannerScreen({ plan }: { plan: LandingPlanData }) {
  const visibleDays = plan.days.slice(0, 28);
  const sample = plan.sampleDay;

  return (
    <WorkspaceFrame view="Study calendar" active="Study calendar">
      <MockPageHead
        title="Study planner"
        subtitle="Every scheduled mock, sectional and revision block across the plan."
        meta={`26 Oct – 14 Dec 2026 · ${plan.days.length} days · ${plan.taskCount} scheduled tasks`}
        actions={
          <span className="rounded-control bg-accent px-[0.6em] py-[0.2em] text-[0.8em] font-medium text-paper">
            + Add mock
          </span>
        }
      />

      <div className="px-[1.1em] py-[0.9em]">
        <div className="grid grid-cols-2 gap-[0.5em] @[560px]:grid-cols-4">
          {[
            { label: "Next mock", value: "29 Oct", hint: sample.tasks[0]?.name ?? "" },
            { label: "Plan completed", value: "0%", hint: `0 of ${plan.taskCount} tasks` },
            { label: "Mock days", value: String(plan.mockDayCount), hint: "Full-length papers" },
            { label: "Phases", value: "3", hint: "Build → Speed → Revision" },
          ].map((cell) => (
            <div
              key={cell.label}
              className="rounded-control border border-rule-soft bg-paper px-[0.7em] py-[0.55em]"
            >
              <p className="mock-label truncate">{cell.label}</p>
              <p className="mock-figure mt-0.5">{cell.value}</p>
              <p className="mt-0.5 truncate text-[0.76em] text-muted">{cell.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-[0.75em] grid gap-[0.75em] @[760px]:grid-cols-[1.6fr_1fr]">
          <MockPanel
            title="November 2026"
            description="Day 1–28 of the plan."
            action={<span className="text-muted">Today ›</span>}
            bodyClassName="!pb-[0.7em]"
          >
            <div className="grid grid-cols-7 gap-[2px] text-[0.72em]">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday} className="mock-label pb-[0.25em] text-center">
                  {weekday}
                </span>
              ))}
              {Array.from({ length: NOVEMBER_OFFSET }).map((_, index) => (
                <span key={`blank-${index}`} />
              ))}
              {visibleDays.map((day) => {
                const isToday = day.day === sample.day;
                return (
                  <div
                    key={day.day}
                    className={`min-h-[3.1em] rounded-[2px] border p-[2px] ${
                      isToday
                        ? "border-accent bg-accent-soft"
                        : "border-rule-soft bg-paper"
                    }`}
                  >
                    <span
                      className={`block text-[0.9em] tabular ${
                        isToday ? "font-semibold text-accent" : "text-muted"
                      }`}
                    >
                      {dayNumber(day.day)}
                    </span>
                    {/* A chip per day, like the real month grid at this width —
                        the day-type sentence is too long for a cell. */}
                    <span className="mt-[2px] flex flex-col gap-[2px]">
                      {day.hasMock ? (
                        <span className="truncate rounded-[2px] bg-accent-soft px-[2px] py-[1px] text-[0.62em] leading-tight text-accent">
                          {day.dayType.replace(" day", "")}
                        </span>
                      ) : null}
                      {day.taskCount > 0 ? (
                        <span className="flex items-center gap-[2px] text-[0.62em] leading-tight text-muted">
                          <span
                            className="mock-dot"
                            style={{
                              background: day.hasMock
                                ? "var(--accent)"
                                : "var(--chart-time)",
                            }}
                            aria-hidden="true"
                          />
                          {day.taskCount}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-[0.6em] flex flex-wrap gap-[0.6em] text-[0.72em] text-muted">
              {[
                { label: "Mock test", color: "var(--accent)" },
                { label: "Sectional", color: "var(--chart-time)" },
                { label: "Topic", color: "var(--chart-average)" },
              ].map((item) => (
                <span key={item.label} className="flex items-center gap-[0.3em]">
                  <span
                    className="mock-dot"
                    style={{ background: item.color }}
                    aria-hidden="true"
                  />
                  {item.label}
                </span>
              ))}
            </div>
          </MockPanel>

          <div className="flex flex-col gap-[0.6em]">
            <MockPanel
              title={`Day ${sample.day} · 28 Oct`}
              description={`${sample.dayType} · ${sample.tasks.length} tasks`}
              action={<span className="text-muted">Open day ›</span>}
            >
              <ul className="flex flex-col gap-[0.35em]">
                {sample.tasks.slice(0, 5).map((task, index) => (
                  <li
                    key={task.name}
                    className="flex items-start gap-[0.4em] rounded-control border border-rule-soft px-[0.45em] py-[0.35em]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.35em] size-[0.7em] shrink-0 rounded-[2px] border border-rule"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.86em] font-medium">
                        {task.name}
                      </span>
                      <span className="mt-[1px] flex items-center gap-[0.35em]">
                        <MockChip>{task.short}</MockChip>
                        <span className="text-[0.74em] text-muted">
                          {task.questions} Q · {task.marks} marks
                        </span>
                      </span>
                    </span>
                    {index === 0 ? (
                      <span className="shrink-0 text-[0.75em] text-accent">
                        Log result
                      </span>
                    ) : null}
                  </li>
                ))}
                {sample.tasks.length > 5 ? (
                  <li className="text-[0.75em] text-muted">
                    +{sample.tasks.length - 5} more on this day
                  </li>
                ) : null}
              </ul>
            </MockPanel>

            <MockPanel
              title="Daily checklist"
              description="The plan's four habits for every study day."
            >
              <ul className="flex flex-col gap-[0.28em] text-[0.8em]">
                {sample.checklist.map((item) => (
                  <li key={item} className="flex items-start gap-[0.4em]">
                    <span
                      aria-hidden="true"
                      className="mt-[0.3em] size-[0.65em] shrink-0 rounded-[2px] border border-rule"
                    />
                    <span className="text-muted">{item}</span>
                  </li>
                ))}
              </ul>
            </MockPanel>

            <div className="rounded-control border border-rule-soft bg-positive-soft px-[0.6em] py-[0.45em] text-[0.8em] text-positive">
              Next up:{" "}
              <span className="font-medium">
                {sample.tasks[0]?.name ?? PLAN_CATEGORIES.live_mock.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
