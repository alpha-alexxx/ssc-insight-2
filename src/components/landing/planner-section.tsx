import type { LandingPlanData } from "./plan-facts";

/**
 * The 50-day plan, drawn as a specimen grid.
 *
 * Phase tints use semantic soft tokens, so every palette resolves without a
 * per-palette rule. Shape carries the category alongside colour (the plan-cell
 * treatments differ in fill, not only hue), and the whole strip is exposed as
 * a list so a screen reader hears the days rather than decoration.
 */
export function PlanGrid({ plan }: { plan: LandingPlanData }) {
  return (
    <div className="plan-grid" role="list" aria-label="50-day study plan">
      {plan.days.map((day) => (
        <div
          key={day.day}
          role="listitem"
          className="plan-cell"
          data-phase={day.phase}
          data-mock={day.hasMock ? "true" : undefined}
          data-today={day.day === 3 ? "true" : undefined}
          title={`Day ${day.day} · ${day.weekday} ${day.date} · ${day.dayType} · ${day.taskCount} tasks`}
        >
          <span aria-hidden="true">{day.day}</span>
          <span className="sr-only">
            Day {day.day}, {day.weekday}, {day.dayType}, {day.taskCount} tasks
          </span>
        </div>
      ))}
    </div>
  );
}

export function PlanLegend({ plan }: { plan: LandingPlanData }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.6875rem] text-muted">
      {plan.phases.map((phase) => (
        <li key={phase.phase} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-[2px] border border-rule-soft"
            data-phase={phase.phase}
            style={{
              background:
                phase.phase === 1
                  ? "var(--accent-soft)"
                  : phase.phase === 2
                    ? "var(--soft)"
                    : "var(--positive-soft)",
            }}
          />
          <span>
            Phase {phase.phase} · {phase.name}
            <span className="text-rule"> · days {phase.days}</span>
          </span>
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-[2px] border border-rule-soft bg-paper"
          style={{ boxShadow: "inset 0 -2px 0 0 var(--accent)" }}
        />
        <span>Mock day · {plan.mockDayCount} of {plan.days.length}</span>
      </li>
    </ul>
  );
}
