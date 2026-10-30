import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { HeroArt } from "./hero-art";

/**
 * The hero. The copy column is a server component and animates with CSS only
 * (`.landing-rise`), so the headline is painted and readable before any
 * JavaScript runs — the LCP never waits on hydration. The art column is the
 * one client island, and it degrades to a flat, static slab below `lg`.
 */
export function Hero({ authEnabled }: { authEnabled: boolean }) {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      <div aria-hidden="true" className="landing-grid-lines absolute inset-0" />
      <div
        aria-hidden="true"
        className="landing-blob absolute -left-40 -top-44 size-[34rem] bg-accent-soft opacity-70"
      />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-10 lg:pb-28 lg:pt-24">
        <div className="landing-rise max-w-xl">
          <p className="section-label flex items-center gap-2.5">
            <span aria-hidden="true" className="h-px w-6 bg-rule" />
            SSC CGL Tier 2 · Mock tracker
          </p>

          <h1
            id="hero-title"
            className="mt-5 max-w-[17ch] font-serif text-[clamp(2.125rem,4vw,3.125rem)] font-[450] leading-[1.06] tracking-[-0.035em] text-balance"
          >
            Your mocks are data.
            <span className="mt-1 block text-accent">
              Make them mean something.
            </span>
          </h1>

          <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-muted">
            SSC Insight is a private tracker for SSC CGL Tier 2. Log every full,
            sectional and subject mock, and read the trend, the gap to your
            target, and the next test on a 50-day plan.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <GoogleSignInButton
              enabled={authEnabled}
              label="Sign in with Google"
              className="h-auto gap-2.5 px-6 py-3 text-[0.9375rem]"
            />
            <a
              href="#workspace"
              className="inline-flex items-center gap-2 rounded-control border border-rule px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              See the workspace
              <span aria-hidden="true">↓</span>
            </a>
          </div>

          <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span>Private account</span>
            <span aria-hidden="true">·</span>
            <span>Google sign-in</span>
            <span aria-hidden="true">·</span>
            <span>Export everything, anytime</span>
          </p>
        </div>

        <div className="min-w-0">
          <HeroArt />
        </div>
      </div>
    </section>
  );
}
