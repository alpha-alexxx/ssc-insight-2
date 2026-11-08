import { DuotoneIcon } from "@/components/icon";
import { BrowserFrame } from "./mockups/browser-frame";
import { DayWorkspaceScreen } from "./mockups/day-workspace-screen";
import type { LandingPlanData } from "./plan-facts";
import { PlanGrid, PlanLegend } from "./planner-section";
import { Reveal } from "./reveal";
import { ScopeDiagram } from "./scope-diagram";

export function PreparationStory({ plan }: { plan: LandingPlanData }) {
  return (
    <section
      id="system"
      aria-labelledby="system-title"
      className="landing-section relative overflow-hidden border-y border-rule-soft bg-canvas py-20 sm:py-28"
    >
      <div
        aria-hidden="true"
        className="landing-paper-orbit absolute -right-40 top-20 size-[32rem] opacity-50"
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <h2
            id="system-title"
            className="font-serif text-[clamp(2.1rem,5vw,4.75rem)] font-[450] leading-[0.98] tracking-[-0.035em] text-balance"
          >
            See the pattern. Put the response on a date.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
            SSC Insight separates interpretation from scheduling. One saved
            attempt can be read at different analytical scopes; the preparation
            system then turns that evidence into dated work without rewriting the
            result.
          </p>
        </Reveal>

        <div className="mt-14 border-t border-rule pt-10 sm:mt-20 sm:pt-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start">
            <Reveal className="lg:sticky lg:top-28">
              <div className="flex items-center gap-3 text-accent">
                <DuotoneIcon name="layers" size={20} tone="accent" />
                <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                  Read one attempt four ways
                </p>
              </div>
              <h3 className="mt-5 max-w-lg font-serif text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.04] tracking-[-0.03em] text-balance">
                Change the lens without changing the record.
              </h3>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
                Full mock, subject, sectional, and all-mock views project the same
                saved evidence. Missing values remain missing, derived sections
                borrow nothing, and an attempt is never counted twice.
              </p>
              <dl className="mt-8 divide-y divide-rule-soft border-y border-rule-soft text-sm">
                {[
                  ["One source", "the saved attempt"],
                  ["Four readings", "without duplication"],
                  ["No invented values", "missing stays missing"],
                ].map(([term, detail]) => (
                  <div key={term} className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="font-medium text-ink">{term}</dt>
                    <dd className="text-right text-muted">{detail}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal distance={20}>
              <ScopeDiagram />
            </Reveal>
          </div>
        </div>

        <div className="mt-20 border-t border-rule pt-10 sm:mt-28 sm:pt-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.18fr)_minmax(18rem,0.82fr)] lg:items-end">
            <Reveal>
              <PlanGrid plan={plan} />
              <PlanLegend plan={plan} />
            </Reveal>
            <Reveal distance={18}>
              <div className="flex items-center gap-3 text-accent">
                <DuotoneIcon name="calendar" size={20} tone="accent" />
                <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                  Turn evidence into work
                </p>
              </div>
              <h3 className="mt-5 font-serif text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.04] tracking-[-0.03em] text-balance">
                A dated plan that preserves what actually happened.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Structured assignments, personal tasks, revision blocks, and
                mock results meet in one calendar. Scheduled date, attempt date,
                and recorded date keep their separate meanings.
              </p>
              <p className="mt-6 border-t border-rule-soft pt-4 text-xs leading-relaxed text-muted">
                The included 50-day CGL plan is one concrete workflow. Built-in
                exam catalogs also cover CHSL, MTS, CPO, GD Constable,
                Stenographer, Selection Post, and your own custom exam patterns.
              </p>
            </Reveal>
          </div>

          <Reveal as="figure" className="m-0 mt-12" distance={24}>
            <BrowserFrame url={`sscinsight.app/plan/${plan.sampleDay.date}`}>
              <DayWorkspaceScreen plan={plan} />
            </BrowserFrame>
            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>Illustrative sample data · a real plan day rendered in code</span>
              <span className="tabular">
                Day {plan.sampleDay.day} of {plan.days.length}
              </span>
            </figcaption>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
