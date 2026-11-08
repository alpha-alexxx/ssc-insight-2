import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { DataConstellation } from "./data-constellation";
import { HeroArt } from "./hero-art";

/**
 * The hero. Copy is centred above a coded product surface that rises from the
 * lower edge, mirroring the reference's reveal rhythm without borrowing its
 * finance imagery. The headline animates with CSS only (`.landing-rise`), so
 * it is readable before hydration; the client art degrades to a static slab.
 */
export function Hero({ authEnabled }: { authEnabled: boolean }) {
  return (
    <section
      className="landing-hero landing-cinematic-panel relative isolate min-h-[calc(100svh-2rem)] overflow-hidden"
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

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-2rem)] max-w-6xl flex-col items-center px-5 pb-0 pt-16 text-center sm:px-8 sm:pt-20 lg:pt-24">
        <div className="landing-rise mx-auto max-w-3xl">
          <h1
            id="hero-title"
            className="mx-auto max-w-[13ch] font-serif text-[clamp(2.8rem,6.6vw,6.25rem)] font-[450] leading-[0.92] tracking-[-0.045em] text-balance"
          >
            <span className="landing-word-reveal block">Every attempt</span>
            <span className="landing-word-reveal landing-word-reveal-delay block">
              leaves evidence.
            </span>
            <span className="landing-word-reveal landing-word-reveal-late mt-2 block text-accent">
              Use it.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-[1rem] leading-relaxed text-muted sm:text-[1.0625rem]">
            SSC Insight turns mocks into a private preparation system. Track
            built-in SSC exam patterns or your own, read performance without
            double-counting, and place the next piece of work on a date.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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

          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted">
            <span>Private account</span>
            <span aria-hidden="true">·</span>
            <span>Google sign-in</span>
            <span aria-hidden="true">·</span>
            <span>Portable JSON backup</span>
          </p>
        </div>

        <div className="landing-hero-product mt-12 w-full max-w-[58rem] min-w-0 sm:mt-14">
          <HeroArt />
        </div>
      </div>

      <span
        aria-hidden="true"
        className="landing-scroll-cue absolute bottom-4 right-5 z-20 hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted lg:flex"
      >
        Scroll
        <span className="landing-scroll-mark h-px w-10 bg-rule" />
      </span>
    </section>
  );
}
