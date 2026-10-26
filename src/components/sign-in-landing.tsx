import {
  ArrowRight,
  BarChart3,
  Check,
  FileJson,
  LockKeyhole,
  Sparkles,
  Target,
} from "lucide-react";
import { AuthControl } from "./auth-control";

const sampleSubjects = [
  { name: "Quant", score: "36 / 90", detail: "14 correct · 6 incorrect" },
  { name: "Reasoning", score: "70 / 90", detail: "25 correct · 5 incorrect" },
  { name: "English", score: "103 / 135", detail: "37 correct · 8 incorrect" },
  { name: "General Awareness", score: "36 / 75", detail: "14 correct · 6 incorrect" },
];

const features = [
  {
    icon: BarChart3,
    title: "Every attempt in perspective",
    description:
      "Bring full, sectional, and subject mocks from any provider into one consistent analytical workspace.",
  },
  {
    icon: Target,
    title: "One target, clearer decisions",
    description:
      "Compare score percentage, accuracy, timing, and subject outcomes without mixing papers of different sizes.",
  },
  {
    icon: Sparkles,
    title: "Optional AI, always reviewed",
    description:
      "Arrange pasted scorecards and ask focused follow-ups. AI prepares drafts and insights; it never saves for you.",
  },
  {
    icon: FileJson,
    title: "Your records remain portable",
    description:
      "Download a private JSON backup and import it into another signed-in account with reviewed merge or replace.",
  },
];

const faqs = [
  {
    question: "What can I track?",
    answer:
      "SSC CGL Tier 2 full mocks, Section I and Section II practice, and standalone Quant, Reasoning, English, General Awareness, or Computer mocks.",
  },
  {
    question: "Do I need a particular test provider?",
    answer:
      "No. Enter results manually, use the standard text parser, or review an AI-arranged draft from the provider you already use.",
  },
  {
    question: "Are my results private?",
    answer:
      "Yes. Every data route verifies your Google session and scopes records to that account. There is no shared workspace or administrator view.",
  },
  {
    question: "Does AI change my records?",
    answer:
      "No. AI is optional and read-only. Extracted values must be reviewed and copied into the form, and Save remains a separate action.",
  },
];

function Wordmark() {
  return (
    <span className="wordmark text-ink">
      SSC <span className="text-accent">Insight</span>
    </span>
  );
}

function SampleLedger() {
  return (
    <article
      className="border border-rule bg-paper"
      aria-label="Illustrative full mock summary"
    >
      <header className="flex items-center justify-between border-b border-rule-soft px-4 py-3">
        <p className="section-label">Illustrative full mock</p>
        <span className="border border-accent/40 px-2 py-1 text-[10px] uppercase tracking-wide text-accent">
          Sample data
        </span>
      </header>

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 border-b border-rule-soft pb-4">
          <div>
            <p className="text-xs muted">SSC CGL Tier 2 · 130 questions</p>
            <h2 className="mt-2 font-serif text-3xl leading-tight tracking-tight">
              A clearer next attempt.
            </h2>
          </div>
          <span className="grid size-10 shrink-0 place-items-center border border-positive text-positive">
            <Check size={20} aria-hidden="true" />
          </span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule-soft py-5">
          <div>
            <strong className="font-serif text-5xl leading-none tracking-tight tabular">
              245
            </strong>
            <span className="ml-2 text-sm muted">/ 390</span>
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl tabular">62.8%</p>
            <p className="text-[10px] uppercase tracking-wide muted">score</p>
          </div>
        </div>

        <div className="divide-y divide-rule-soft">
          {sampleSubjects.map((subject) => (
            <div
              key={subject.name}
              className="grid grid-cols-[1fr_auto] gap-x-4 py-3"
            >
              <div>
                <h3 className="text-sm font-medium">{subject.name}</h3>
                <p className="mt-1 text-[11px] muted">{subject.detail}</p>
              </div>
              <strong className="self-center text-sm font-medium tabular">
                {subject.score}
              </strong>
            </div>
          ))}
        </div>

        <p className="border-t border-ink pt-3 text-xs leading-relaxed muted">
          The next useful focus is visible without turning preparation into
          another complicated dashboard.
        </p>
      </div>
    </article>
  );
}

export function SignInLanding({
  googleEnabled,
  authUnavailable,
}: {
  googleEnabled: boolean;
  authUnavailable: boolean;
}) {
  return (
    <div id="top" className="min-h-screen bg-canvas text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-ink focus:bg-paper focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <header className="border-b border-rule bg-paper">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#top" aria-label="SSC Insight home">
            <Wordmark />
          </a>
          <nav className="hidden items-center gap-6 text-xs muted sm:flex" aria-label="Landing page">
            <a className="hover:text-ink" href="#features">What you get</a>
            <a className="hover:text-ink" href="#how-it-works">How it works</a>
            <a className="hover:text-ink" href="#privacy">Privacy</a>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="border-b border-rule">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,.8fr)] lg:items-center lg:gap-16 lg:py-24">
            <div>
              <p className="section-label flex items-center gap-2">
                <span className="size-1.5 bg-accent" aria-hidden="true" />
                A private workspace for SSC preparation
              </p>
              <h1 className="mt-5 max-w-[11ch] font-serif text-[clamp(3.25rem,7vw,6.5rem)] leading-[.9] tracking-[-.055em]">
                Make every mock count.
              </h1>
              <p className="mt-6 max-w-[54ch] text-base leading-relaxed muted sm:text-lg">
                Record SSC CGL Tier 2 results, compare the right analytical
                grain, and decide what deserves attention before your next
                attempt.
              </p>

              {authUnavailable && (
                <p
                  role="alert"
                  className="mt-6 max-w-xl border border-danger bg-danger-soft p-3 text-sm text-danger"
                >
                  Your session could not be verified. Google sign-in may be
                  temporarily unavailable; retry below in a moment.
                </p>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <AuthControl enabled={googleEnabled} presentation="landing" />
                <a
                  href="#features"
                  className="inline-flex h-10 items-center gap-2 border-b border-ink text-sm font-medium hover:border-accent hover:text-accent"
                >
                  See how it works <ArrowRight size={15} aria-hidden="true" />
                </a>
              </div>

              <p className="mt-5 flex items-center gap-2 text-xs muted">
                <LockKeyhole size={14} aria-hidden="true" />
                Your mocks and analytics belong only to your signed-in account.
              </p>
            </div>

            <SampleLedger />
          </div>
        </section>

        <div className="border-b border-rule bg-paper">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-2 px-5 py-4 text-[10px] uppercase tracking-[.14em] muted sm:px-8">
            <strong className="font-medium text-accent">Built for SSC CGL Tier 2</strong>
            <span>Full mocks</span>
            <span>Subject practice</span>
            <span>Sectional analysis</span>
            <span>Any test provider</span>
          </div>
        </div>

        <section id="features" className="border-b border-rule">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
            <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
              <h2 className="max-w-[12ch] font-serif text-4xl leading-[.98] tracking-tight sm:text-5xl">
                Less guesswork. Better review.
              </h2>
              <p className="max-w-[54ch] text-base leading-relaxed muted lg:justify-self-end">
                A score says how one test went. Consistent structure reveals
                trends, weak subjects, timing pressure, and progress toward the
                same target.
              </p>
            </div>

            <div className="mt-10 grid border-y border-rule md:grid-cols-2">
              {features.map(({ icon: Icon, title, description }, index) => (
                <article
                  key={title}
                  className="border-b border-rule-soft p-5 last:border-b-0 md:border-r md:[&:nth-child(2n)]:border-r-0 md:[&:nth-last-child(-n+2)]:border-b-0 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-accent tabular">0{index + 1}</span>
                    <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 font-serif text-2xl tracking-tight">{title}</h3>
                  <p className="mt-2 max-w-[48ch] text-sm leading-relaxed muted">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-b border-rule bg-paper">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
            <p className="section-label">A simple review habit</p>
            <h2 className="mt-3 max-w-[14ch] font-serif text-4xl leading-none tracking-tight sm:text-5xl">
              Three steps to a more useful next attempt.
            </h2>
            <ol className="mt-10 grid border-y border-rule md:grid-cols-3">
              {[
                ["Log the result", "Enter counts manually or paste the provider’s scorecard text."],
                ["Review the pattern", "Switch between full, subject, sectional, and all-mock analytical scopes."],
                ["Choose the next focus", "Use trends, target progress, and notes to plan the next study block."],
              ].map(([title, description], index) => (
                <li
                  key={title}
                  className="border-b border-rule-soft py-6 last:border-b-0 md:border-b-0 md:border-r md:px-6 md:last:border-r-0 md:first:pl-0"
                >
                  <span className="text-xs tabular text-accent">0{index + 1}</span>
                  <h3 className="mt-4 font-serif text-2xl">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed muted">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="privacy" className="border-b border-rule">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:py-24">
            <div>
              <p className="section-label">Private by design</p>
              <h2 className="mt-3 max-w-[12ch] font-serif text-4xl leading-none tracking-tight sm:text-5xl">
                Your preparation stays yours.
              </h2>
              <p className="mt-5 max-w-[46ch] text-sm leading-relaxed muted">
                Google sign-in identifies the workspace. The app stores no
                separate profile row or shared public results, and every data
                request verifies ownership independently.
              </p>
            </div>
            <div className="divide-y divide-rule-soft border-y border-rule">
              {faqs.map(({ question, answer }) => (
                <details key={question} className="group">
                  <summary className="flex list-none items-center justify-between gap-4 py-4 font-medium">
                    {question}
                    <span className="text-accent group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="max-w-[62ch] pb-5 text-sm leading-relaxed muted">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-paper">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
            <div className="border border-rule p-6 sm:p-10">
              <p className="section-label text-accent">Your next attempt</p>
              <h2 className="mt-4 max-w-[16ch] font-serif text-4xl leading-none tracking-tight sm:text-5xl">
                Start with the work you are already doing.
              </h2>
              <p className="mt-4 max-w-[50ch] text-sm leading-relaxed muted">
                Sign in, log one mock, and let the comparisons become useful as
                your private history grows.
              </p>
              <div className="mt-6">
                <a
                  href="#top"
                  className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-sm font-medium text-paper hover:bg-accent"
                >
                  Continue to sign in <ArrowRight size={15} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule bg-canvas">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <a href="#top" aria-label="SSC Insight home"><Wordmark /></a>
          <p>An independent companion for SSC CGL Tier 2 preparation.</p>
          <a className="hover:text-ink" href="#privacy">Privacy and questions</a>
        </div>
      </footer>
    </div>
  );
}
