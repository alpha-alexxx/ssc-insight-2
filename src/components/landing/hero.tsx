import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { DataConstellation } from "./data-constellation";
import { HeroArt } from "./hero-art";

/**
 * The hero. The copy column is a server component and animates with CSS only
 * (`.landing-rise`), so the headline is painted and readable before any
 * JavaScript runs — the LCP never waits on hydration. The art column is the
 * one client island, and it degrades to a flat, static slab below `lg`.
 */
export function Hero({ authEnabled }: { authEnabled: boolean }) {
  return (
    <section
      className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden"
      aria-labelledby="hero-title"
    >
      <div aria-hidden="true" className="landing-grid-lines absolute inset-0" />
      <DataConstellation />
      <div
        aria-hidden="true"
        className="landing-blob absolute -left-40 -top-44 size-[34rem] bg-accent-soft opacity-70"
      />
      <div
        aria-hidden="true"
        className="landing-paper-orbit absolute -right-28 top-10 size-[30rem] opacity-70"
      />

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl gap-14 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12 lg:pb-20 lg:pt-20">
        <div className="landing-rise max-w-xl">
          <h1
            id="hero-title"
            className="max-w-[14ch] font-serif text-[clamp(2.7rem,6vw,5.6rem)] font-[450] leading-[0.94] tracking-[-0.04em] text-balance"
          >
            <span className="landing-word-reveal block">Every attempt</span>
            <span className="landing-word-reveal landing-word-reveal-delay block">
              leaves evidence.
            </span>
            <span className="landing-word-reveal landing-word-reveal-late mt-2 block text-accent">
              Use it.
            </span>
          </h1>

          <p className="mt-7 max-w-lg text-[1rem] leading-relaxed text-muted sm:text-[1.0625rem]">
            SSC Insight turns mocks into a private preparation system. Track
            built-in SSC exam patterns or your own, read performance without
            double-counting, and place the next piece of work on a date.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <GoogleSignInButton
              enabled={authEnabled}
              label="Sign in with Google"
              className="h-auto gap-2.5 px-6 py-3 text-[0.9375rem]"
            />
            <a
              href="#workspace"
              className="landing-magnetic inline-flex items-center gap-2 rounded-control border border-rule bg-paper px-5 py-3 text-sm font-medium text-ink transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:translate-y-0"
            >
              Watch the workspace assemble
              <span aria-hidden="true" className="landing-arrow-down">↓</span>
            </a>
          </div>

          <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span>Private account</span>
            <span aria-hidden="true">·</span>
            <span>Google sign-in</span>
            <span aria-hidden="true">·</span>
            <span>Portable JSON backup</span>
          </p>
        </div>

        <div className="min-w-0">
          <HeroArt />
        </div>
      </div>

      <a
        href="#workspace"
        aria-label="Scroll to the workspace story"
        className="absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted lg:flex"
      >
        Scroll to assemble
        <span aria-hidden="true" className="landing-scroll-mark h-9 w-px bg-rule" />
      </a>
    </section>
  );
}
