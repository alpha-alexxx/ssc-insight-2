import type { LandingPlanData } from "./plan-facts";

/**
 * The ledger strip: five product constants, set as one ruled row of figures.
 *
 * Deliberately not the dashboard's `.metric-strip` (four cells, cell padding,
 * a progress rule) — this is an editorial fact line with its own type scale.
 * Every figure is a real product constant or a plan-derived count; the plan
 * task count comes from the rows (262), never the export's declared total.
 */
export function LedgerFacts({ plan }: { plan: LandingPlanData }) {
  const facts = [
    {
      value: "390",
      unit: "marks",
      note: "in a full mock · +3 correct, −1 incorrect",
    },
    {
      value: "4",
      unit: "scopes",
      note: "one saved record, four readings",
    },
    {
      value: String(plan.days.length),
      unit: "days",
      note: "26 Oct – 14 Dec 2026, three phases",
    },
    {
      value: String(plan.taskCount),
      unit: "tasks",
      note: "scheduled across the study plan",
    },
    {
      value: "1",
      unit: "file",
      note: "JSON backup, importable anywhere",
    },
  ];

  return (
    <section aria-label="At a glance" className="bg-canvas pb-20 pt-14 sm:pb-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="section-label mb-5">The paper, the plan, the export</p>
        <dl className="ledger-row">
          {facts.map((fact) => (
            <div key={fact.unit} className="ledger-cell">
              <dd className="ledger-value">
                {fact.value}
                <span className="ledger-unit">{fact.unit}</span>
              </dd>
              <dt className="ledger-note">{fact.note}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
