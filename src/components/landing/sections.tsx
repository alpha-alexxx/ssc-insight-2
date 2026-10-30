import { DuotoneIcon, DuotoneTile } from "@/components/icon";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { shortDate } from "@/lib/format";
import { totals } from "@/lib/domain";
import { LANDING_ATTEMPTS, LANDING_FULL_MOCKS, LANDING_SUMMARY } from "./fixtures";
import type { LandingPlanData } from "./plan-facts";
import { Faq } from "./faq";
import { PlanGrid, PlanLegend } from "./planner-section";
import { Reveal } from "./reveal";
import { ScopeDiagram } from "./scope-diagram";
import { Section, SectionHead } from "./section";
import { AiPanel } from "./mockups/ai-panel";
import { BrowserFrame, MockupCaption } from "./mockups/browser-frame";
import { CompareScreen } from "./mockups/compare-screen";
import { DayWorkspaceScreen } from "./mockups/day-workspace-screen";

/**
 * The editorial sections between the two plates.
 *
 * All server components: copy, the fact strip, the scope diagram and the plan
 * grid are static HTML, and only the small interactive islands inside them
 * (the diagram's one-shot draw, the FAQ accordion) ship JavaScript.
 */

/* ---------- 03 · Analytical scopes ---------- */

export function ScopesSection() {
  return (
    <Section id="scopes" number="03" className="py-20 sm:py-24">
      <SectionHead
        eyebrow="Analytical scopes"
        title="One record, four readings."
        lede="Switching a tab changes how a saved mock is projected. It never changes what was saved, and it never counts the same attempt twice."
      />
      <div className="pt-12">
        <ScopeDiagram />
      </div>

      <div className="mt-12 grid gap-6 border-t border-rule-soft pt-8 sm:grid-cols-3">
        {[
          {
            title: "A full mock is never counted twice",
            body: "All mocks reads every saved attempt exactly once. Its subjects and sections are projections of that one record, not extra records.",
          },
          {
            title: "Derived sections carry no borrowed numbers",
            body: "Section I and II sum their subjects. They do not inherit the parent mock's score override, rank, percentile or overall time.",
          },
          {
            title: "Missing stays missing",
            body: "A subject you never attempted draws no line. It is never plotted as zero, and no value is borrowed from another attempt to fill the gap.",
          },
        ].map((item, index) => (
          <Reveal key={item.title} distance={8 + index * 6}>
            <h3 className="font-serif text-[1.0625rem] leading-tight tracking-[-0.02em]">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ---------- 04 · The 50-day plan ---------- */

export function PlanSection({ plan }: { plan: LandingPlanData }) {
  return (
    <Section id="plan" number="04" className="py-20 sm:py-24">
      <SectionHead
        eyebrow="The 50-day plan"
        title="A schedule that doesn't move."
        lede="Built from the RBE daily targets: three phases, every test dated, every source link kept. Recording progress never rewrites the plan."
      />

      <Reveal className="mt-12">
        <PlanGrid plan={plan} />
        <PlanLegend plan={plan} />
      </Reveal>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)] lg:items-start">
        <Reveal>
          <figure className="m-0">
            <BrowserFrame url={`sscinsight.app/plan/${plan.sampleDay.date}`}>
              <DayWorkspaceScreen plan={plan} />
            </BrowserFrame>
            <MockupCaption>
              Day {plan.sampleDay.day} of 50 · {plan.sampleDay.dayType} — the
              day&apos;s assignments, the four habits, and the revision block.
            </MockupCaption>
          </figure>
        </Reveal>

        <Reveal className="lg:pt-2">
          <h3 className="font-serif text-[1.375rem] leading-tight tracking-[-0.025em]">
            Every day opens into its own workspace.
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {plan.taskCount} scheduled tasks across {plan.days.length} days,{" "}
            {plan.mockDayCount} of them carrying a full-length mock. Each day
            lists its assignments with the original source link, the four daily
            habits, and its revision block.
          </p>
          <dl className="mt-7 divide-y divide-rule-soft border-y border-rule-soft">
            {[
              ["Attempt date", "what the tracker records and charts use"],
              ["Scheduled date", "the plan's own day, which never moves"],
              ["Revision", "marked by hand, never by attempting"],
              ["Source link", "every test keeps its original RBE link"],
            ].map(([term, detail]) => (
              <div key={term} className="py-3">
                <dt className="text-[0.8125rem] font-medium">{term}</dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-muted">
                  {detail}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </Section>
  );
}

/* ---------- 05 · Compare ---------- */

export function CompareSection() {
  // The two mocks the ledger compares, described in words outside the
  // aria-hidden mockup so the information is not trapped in decoration.
  const withPercentile = LANDING_FULL_MOCKS.at(-1)!;
  const earlier = LANDING_FULL_MOCKS.at(-2)!;
  const later = totals(withPercentile);
  const before = totals(earlier);
  const delta = later.score - before.score;

  return (
    <Section id="compare" number="05" className="py-20 sm:py-24">
      <SectionHead
        eyebrow="Compare"
        title="Find the difference behind the score."
        lede="Two to four results side by side — score, percentage, accuracy, attempted, time and time per question — with a difference column in the unit that matters."
      />

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
        <Reveal className="lg:sticky lg:top-24">
          <dl className="divide-y divide-rule-soft border-y border-rule-soft">
            {[
              { term: "Score", detail: `${before.score} → ${later.score} of ${later.maxScore}` },
              { term: "Difference", detail: `${delta > 0 ? "+" : ""}${delta} marks` },
              {
                term: "Percentage",
                detail: `${before.percentage.toFixed(1)}% → ${later.percentage.toFixed(1)}%`,
              },
              {
                term: "Accuracy",
                detail: `${(before.accuracy ?? 0).toFixed(1)}% → ${(later.accuracy ?? 0).toFixed(1)}%`,
              },
              {
                term: "Attempts compared",
                detail: `${shortDate(earlier.completedAt)} and ${shortDate(withPercentile.completedAt)}`,
              },
            ].map((row) => (
              <div key={row.term} className="flex items-baseline justify-between gap-4 py-3">
                <dt className="section-label">{row.term}</dt>
                <dd className="text-right text-sm tabular">{row.detail}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm leading-relaxed text-muted">
            Where two records have different maximums, percentages stand in for
            marks. Percentile only appears when a platform actually published
            one — it is never inferred.
          </p>
          <p className="mt-4 text-xs text-muted">
            Comparing {LANDING_ATTEMPTS.filter((a) => a.type !== "full").length}{" "}
            sectional and subject results works the same way.
          </p>
        </Reveal>

        <Reveal>
          <figure className="m-0">
            <BrowserFrame url="sscinsight.app/compare">
              <CompareScreen />
            </BrowserFrame>
            <MockupCaption>
              Two full mocks compared across every metric, with a subject-level
              breakdown and a difference column in percentage points.
            </MockupCaption>
          </figure>
        </Reveal>
      </div>
    </Section>
  );
}

/* ---------- Plate II · optional AI + privacy ---------- */

export function AiSection() {
  return (
    <div className="pb-14 pt-16 sm:pb-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
        <div>
          <p className="plate-label">Optional · AI coach</p>
          <h2 className="plate-title mt-3">A second reading, if you want one.</h2>
          <p className="plate-body mt-4">
            Point the coach at any OpenAI-compatible endpoint with your own key
            and it returns a structured read of your recent mocks: strengths,
            focus areas and next actions. Bring a key, or skip it — the tracker
            behaves the same either way.
          </p>
          <ul className="mt-7 divide-y divide-[var(--plate-rule-soft)] border-y border-[var(--plate-rule-soft)]">
            {[
              "Read-only: it cannot create, edit or schedule a mock.",
              "Sends aggregates and your latest 20 full mocks — no notes, email or identity.",
              "Paste a scorecard and it prepares a draft; the form is the only place that saves.",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-3 py-3 text-sm leading-relaxed text-[var(--plate-muted)]"
              >
                <span
                  aria-hidden="true"
                  className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-[var(--plate-rule)]"
                />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-[var(--plate-muted)]">
            Hidden entirely when no provider is configured.
          </p>
        </div>

        <div className="mx-auto w-full max-w-sm lg:max-w-none">
          <AiPanel />
        </div>
      </div>
    </div>
  );
}

export function PrivacySection() {
  return (
    <div
      id="privacy"
      className="landing-section grid gap-10 border-t border-[var(--plate-rule)] py-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
    >
      <div>
        <p className="plate-label">Private by construction</p>
        <h2 className="plate-title mt-3">Your account is the boundary.</h2>
        <p className="plate-body mt-4">
          Google sign-in, isolated records, and no shared surface anywhere. Every
          read and write is scoped to the verified user — there is no guest
          record and no administrator view.
        </p>
        <div className="mt-7 flex items-start gap-3 rounded-control border border-[var(--plate-rule-soft)] bg-[var(--plate-surface)] p-4">
          <DuotoneTile name="shield" tile="ink" size={20} className="shrink-0" />
          <p className="text-xs leading-relaxed text-[var(--plate-muted)]">
            Account changes remount the workspace, so a different Google account
            never sees a stale session&apos;s data.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-[var(--plate-rule-soft)] bg-[var(--plate-card)] p-5 text-ink">
          <p className="section-label flex items-center gap-2">
            <DuotoneIcon name="download" size={13} tone="accent" />
            In the file
          </p>
          <ul className="mt-3 space-y-1.5 text-[0.8125rem] leading-relaxed">
            {[
              "Every attempt and subject result",
              "Notes, rank, participants, percentile",
              "Per-subject timing and overrides",
              "Your target score",
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true" className="text-positive">
                  +
                </span>
                <span className="text-muted">{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-[var(--plate-rule-soft)] bg-[var(--plate-card)] p-5 text-ink">
          <p className="section-label flex items-center gap-2">
            <DuotoneIcon name="shield" size={13} tone="accent" />
            Never in the file
          </p>
          <ul className="mt-3 space-y-1.5 text-[0.8125rem] leading-relaxed">
            {[
              "Email address or user ID",
              "Sign-in credentials",
              "Your AI provider key",
              "Anything from another account",
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true" className="text-danger">
                  −
                </span>
                <span className="text-muted">{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs leading-relaxed text-[var(--plate-muted)]">
            One JSON file, <span className="tabular">ssc-insight-backup</span>{" "}
            version 2, imports into a different Google account — merge or
            replace, atomically. Your AI key is sealed with AES-256-GCM before
            it is stored and is shown back only as its last four characters.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- 06 · FAQ ---------- */

export function FaqSection() {
  return (
    <Section id="faq" number="06" className="py-20 sm:py-24">
      <SectionHead
        eyebrow="Questions"
        title="The details, before you sign in."
        lede="Plain answers about accounts, scoring and leaving with your data."
      />
      <Faq />
    </Section>
  );
}

/* ---------- 07 · Final CTA + footer ---------- */

export function FinalCta({ authEnabled }: { authEnabled: boolean }) {
  const summary = LANDING_SUMMARY;
  return (
    <Section id="start" number="07" bordered={false} className="py-20 sm:py-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-card border border-rule-soft bg-paper px-6 py-14 sm:px-12">
          <div
            aria-hidden="true"
            className="landing-blob absolute -right-24 -top-24 size-[22rem] bg-accent-soft opacity-70"
          />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="section-label">Start here</p>
              <h2 className="mt-3 max-w-xl font-serif text-[clamp(1.875rem,3.6vw,2.875rem)] font-[450] leading-[1.08] tracking-[-0.03em] text-balance">
                Start with the mock you already took.
              </h2>
              <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-muted">
                Sign in, log one result, and the ledger begins — trend, target
                gap and plan position from a single attempt.
              </p>
              <div className="mt-8">
                <GoogleSignInButton
                  enabled={authEnabled}
                  label="Sign in with Google"
                  className="h-auto gap-2.5 px-6 py-3 text-[0.9375rem]"
                />
              </div>
              <p className="mt-4 text-xs text-muted">
                No card, no test series, nothing shared.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-rule-soft pt-5 lg:min-w-[16rem] lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
              {[
                { label: "Marks in a paper", value: "390" },
                { label: "Target reference", value: `${Math.round(summary.targetPercentage)}%` },
                { label: "Plan length", value: "50 days" },
                { label: "Export", value: "JSON" },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="section-label">{row.label}</dt>
                  <dd className="mt-1 font-serif text-2xl leading-none tracking-[-0.02em] tabular">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-rule-soft bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="landing-wordmark text-xl text-ink">
              ssc<span className="text-accent">insight</span>
              <span className="text-accent">.</span>
            </p>
            <p className="mt-3 max-w-[16rem] text-xs leading-relaxed text-muted">
              A private mock tracker for SSC CGL Tier 2. One account, one
              workspace.
            </p>
          </div>

          {[
            {
              title: "This page",
              links: [
                ["#workspace", "The workspace"],
                ["#scopes", "Analytical scopes"],
                ["#plan", "The 50-day plan"],
                ["#compare", "Compare"],
                ["#faq", "Questions"],
              ],
            },
            {
              title: "The paper",
              links: [],
              rows: [
                ["Full mock", "130 Q · 390 marks"],
                ["Section I", "Quant + Reasoning · 180"],
                ["Section II", "English + GA · 210"],
                ["Marking", "+3 correct · −1 wrong"],
              ],
            },
            {
              title: "The plan",
              links: [],
              rows: [
                ["Window", "26 Oct – 14 Dec 2026"],
                ["Phase 1", "Build · days 1–20"],
                ["Phase 2", "Speed & Accuracy · 21–45"],
                ["Phase 3", "Final Revision · 46–50"],
              ],
            },
          ].map((column) => (
            <div key={column.title}>
              <p className="section-label">{column.title}</p>
              <ul className="mt-3 space-y-1.5 text-[0.8125rem]">
                {column.links?.map(([href, label]) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="text-muted transition-colors hover:text-ink"
                    >
                      {label}
                    </a>
                  </li>
                ))}
                {column.rows?.map(([term, detail]) => (
                  <li key={term} className="flex flex-wrap justify-between gap-x-3">
                    <span className="text-ink">{term}</span>
                    <span className="text-muted">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-rule-soft pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Dates in India Standard Time · SSC CGL Tier 2 · {new Date().getFullYear()}
          </p>
          <p>Not affiliated with the Staff Selection Commission.</p>
        </div>
      </div>
    </footer>
  );
}

/** Shared by the showcase caption: how many sample attempts the page shows. */
export const SAMPLE_ATTEMPT_COUNT = LANDING_ATTEMPTS.length;
