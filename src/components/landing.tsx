"use client";
import Link from "next/link";
import { useRef } from "react";
import { animated, useSprings, useTrail, useSpring } from "@react-spring/web";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useInView,
} from "motion/react";

import { DuotoneIcon, DuotoneTile, PlainIcon, type IconName } from "./icon";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

/**
 * Animated public landing page for SSC Insight.
 *
 * Every call to action links to the sign-in route (`signInHref`); signed-in
 * visitors never see this page — the root route redirects them to the
 * workspace.
 * Motion stack, by design:
 *  - @react-spring/web  → physics: hero trail entrance, floating icon loops,
 *    count-up numbers, magnetic CTA tilt
 *  - motion (Framer)    → choreography: scroll-triggered reveals with
 *    stagger, SVG line drawing, scroll parallax, AnimatePresence
 *
 * Everything respects prefers-reduced-motion: loops and parallax switch off,
 * entrances render at rest.
 */

const FEATURES = [
  {
    icon: "history",
    title: "Log every attempt",
    body: "Manual entry or paste your score report — full, subject, and sectional mocks all live in one timeline.",
  },
  {
    icon: "trend",
    title: "See trends instantly",
    body: "Score, accuracy, and time plotted across every scope. The chart answers “am I actually improving?” at a glance.",
  },
  {
    icon: "compare",
    title: "Compare up to four mocks",
    body: "Put mocks side by side and find the difference behind the score — one subject, one bad hour, one fix.",
  },
  {
    icon: "book",
    title: "Subject deep dive",
    body: "Per-subject accuracy, time pressure, and radar shape. Know which section quietly eats your rank.",
  },
  {
    icon: "target",
    title: "One target, every view",
    body: "Set a goal out of 390 once. It becomes a reference line on every chart, in every tab, every day.",
  },
  {
    icon: "shield",
    title: "Your data stays yours",
    body: "Private by account. One-click JSON backup you can restore anywhere. No sharing, no analytics resale.",
  },
] as const satisfies ReadonlyArray<{ icon: IconName; title: string; body: string }>;

const STEPS = [
  {
    icon: "history",
    step: "01",
    title: "Log a mock",
    body: "Takes under a minute. Subjects, marks, time — paste the report and SSC Insight reads it for you.",
  },
  {
    icon: "trend",
    step: "02",
    title: "Watch patterns emerge",
    body: "Three mocks in, the insights panel starts talking: your strongest lever, your quietest leak.",
  },
  {
    icon: "target",
    step: "03",
    title: "Walk in confident",
    body: "Track the gap to your target closing mock by mock. Exam day becomes a formality you prepared for.",
  },
] as const satisfies ReadonlyArray<{ icon: IconName; step: string; title: string; body: string }>;

const FLOATERS = [
  { icon: "target", x: "6%", y: "18%", size: 44, drift: 16 },
  { icon: "trend", x: "12%", y: "64%", size: 38, drift: 12 },
  { icon: "timer", x: "86%", y: "22%", size: 40, drift: 14 },
  { icon: "book", x: "90%", y: "62%", size: 36, drift: 18 },
  { icon: "history", x: "78%", y: "8%", size: 30, drift: 10 },
  { icon: "compare", x: "20%", y: "10%", size: 30, drift: 12 },
] as const satisfies ReadonlyArray<{ icon: IconName; x: string; y: string; size: number; drift: number }>;

/** Gentle physics bob for the floating hero icons (react-spring). */
function FloatingIcons({ enabled }: { enabled: boolean }) {
  const springs = useSprings(
    FLOATERS.length,
    FLOATERS.map((f, i) =>
      enabled
        ? {
            from: { y: 0, rotate: 0 },
            to: async (next: (v: object) => Promise<void>) => {
              while (true) {
                await next({ y: -f.drift, rotate: i % 2 ? 4 : -4, delay: 500 + i * 420 });
                await next({ y: 0, rotate: 0, delay: 500 + i * 420 });
              }
            },
            config: { tension: 46, friction: 14, mass: 1 },
          }
        : { from: { y: 0, rotate: 0 }, to: { y: 0, rotate: 0 } },
    ),
  );
  return (
    <>
      {springs.map((spring, i) => {
        const f = FLOATERS[i]!;
        return (
          <animated.div
            key={i}
            style={{ position: "absolute", left: f.x, top: f.y, y: spring.y, rotate: spring.rotate }}
            className="hidden md:block"
            aria-hidden="true"
          >
            <div className="duotone-tile inline-flex size-14 items-center justify-center border border-rule-soft bg-paper/80 backdrop-blur-sm rounded-card">
              <DuotoneIcon name={f.icon} size={f.size - 16} tone="accent" />
            </div>
          </animated.div>
        );
      })}
    </>
  );
}

/** Hero copy entrance — react-spring trail for the connected stagger feel. */
function HeroTrail({ children }: { children: React.ReactNode[] }) {
  const trails = useTrail(children.length, {
    from: { opacity: 0, y: 26 },
    to: { opacity: 1, y: 0 },
    delay: 180,
    config: { tension: 150, friction: 22, mass: 0.9 },
  });
  return (
    <>
      {trails.map((style, i) => (
        <animated.div key={i} style={style}>
          {children[i]}
        </animated.div>
      ))}
    </>
  );
}

/** Spring-driven count-up that starts when scrolled into view. */
function CountUp({
  to,
  suffix = "",
  label,
}: {
  to: number;
  suffix?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();
  const { val } = useSpring({
    from: { val: 0 },
    to: { val: inView ? to : 0 },
    delay: inView ? 150 : 0,
    config: { mass: 1, tension: 55, friction: 20 },
  });
  const shown = Math.round(to).toLocaleString("en-IN");
  return (
    <div ref={ref} className="text-center">
      <p className="font-serif text-5xl md:text-6xl tracking-tight tabular">
        {reduced ? (
          shown
        ) : (
          <animated.span>
            {val.to((v) => Math.round(v).toLocaleString("en-IN"))}
          </animated.span>
        )}
        {suffix}
      </p>
      <p className="section-label mt-2">{label}</p>
    </div>
  );
}

export function Landing({ signInHref = "/sign-in" }: { signInHref?: string }) {
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  // Scroll parallax on the hero art (motion) — drifts the whole floater field.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const parallaxFade = useTransform(scrollYProgress, [0, 0.7], [1, 0.2]);

  // Magnetic CTA: react-spring follows the pointer with spring physics.
  const [ctaSpring, ctaApi] = useSpring(() => ({
    x: 0,
    y: 0,
    scale: 1,
    config: { tension: 220, friction: 16 },
  }));

  function handleCtaMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    ctaApi.start({ x: dx * 0.18, y: dy * 0.3, scale: 1.03 });
  }
  function handleCtaLeave() {
    ctaApi.start({ x: 0, y: 0, scale: 1 });
  }

  const gridVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 28 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 110, damping: 18 },
    },
  };

  return (
    <div id="top" className="min-h-screen bg-canvas text-ink overflow-x-clip">
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-40 border-b border-rule-soft bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="landing-wordmark text-2xl" aria-label="SSC Insight — back to top">
            ssc<span className="text-accent">insight</span>
            <span className="text-accent">.</span>
          </a>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild size="sm" className="gap-2">
              <Link href={signInHref}>
                Open workspace <PlainIcon name="arrowRight" size={15} />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section
        ref={heroRef}
        className="relative overflow-hidden"
        aria-label="Introduction"
      >
        {/* grid + blobs backdrop */}
        <div className="landing-grid-lines absolute inset-0" aria-hidden="true" />
        <div
          className="landing-blob size-[480px] bg-accent-soft -top-40 -left-32"
          aria-hidden="true"
        />
        <div
          className="landing-blob size-[380px] bg-soft top-24 right-[-120px]"
          aria-hidden="true"
        />
        <motion.div style={reduced ? undefined : { y: parallaxY, opacity: parallaxFade }} className="relative">
          <FloatingIcons enabled={!reduced} />
          <div className="relative mx-auto max-w-4xl px-5 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
            <HeroTrail>
              <p className="section-label mx-auto">
                SSC CGL Tier 2 · Mock tracker
              </p>
              <h1 className="page-title mt-5 text-balance">
                Every mock tells you something.
                <br />
                <span className="text-accent">Start listening.</span>
              </h1>
              <p className="muted mx-auto mt-6 max-w-xl text-[15px] leading-relaxed">
                Track your effort. Understand your progress. Make the next mock
                count — with per-subject analytics, trend charts, and an
                insights panel that finds the pattern before exam day does.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link href={signInHref} className="inline-flex">
                  <animated.button
                    style={ctaSpring}
                    onPointerMove={handleCtaMove}
                    onPointerLeave={handleCtaLeave}
                    className="inline-flex items-center gap-2.5 bg-accent px-7 py-3.5 text-paper text-[15px] font-medium hover:bg-accent-hover transition-colors"
                  >
                    <DuotoneIcon name="history" size={17} tone="paper" />
                    Open your workspace
                    <PlainIcon name="arrowRight" size={16} />
                  </animated.button>
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 border border-rule px-6 py-3 text-sm font-medium hover:bg-soft transition-colors"
                >
                  See what&apos;s inside
                </a>
              </div>
              <p className="muted mt-5 text-xs">
                Private by account · Google sign-in · Export everything, anytime
              </p>
            </HeroTrail>
          </div>
        </motion.div>
      </section>

      {/* ---------- Count-up strip ---------- */}
      <section className="border-y border-ink bg-paper" aria-label="By the numbers">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-5 py-12 sm:grid-cols-3">
          <CountUp to={390} label="Marks tracked per full mock" />
          <CountUp to={5} label="Subjects, one radar" />
          <CountUp to={100} suffix="%" label="Your data, your account" />
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="relative mx-auto max-w-6xl px-5 py-24" aria-label="Features">
        <div className="mb-14 max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            className="section-label"
          >
            What&apos;s inside
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.08 }}
            className="font-serif text-4xl md:text-5xl tracking-tight mt-3 text-balance"
          >
            Built for the mock-test grind,
            <span className="text-accent"> designed for clarity.</span>
          </motion.h2>
        </div>
        <motion.div
          variants={gridVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.article
              key={f.title}
              variants={cardVariants}
              whileHover={reduced ? undefined : { y: -6 }}
              className="panel group p-6"
            >
              <DuotoneTile name={f.icon} tile="accent" />
              <h3 className="font-serif text-xl mt-5">{f.title}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{f.body}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="border-y border-rule-soft bg-paper" aria-label="How it works">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <div className="mb-14 max-w-2xl">
            <p className="section-label">How it works</p>
            <h2 className="font-serif text-4xl tracking-tight mt-3">
              Three steps. No ceremony.
            </h2>
          </div>
          <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
            {/* connector line draws itself on scroll */}
            <svg
              className="absolute left-0 right-0 top-[52px] hidden h-px w-full md:block"
              aria-hidden="true"
            >
              <motion.line
                x1="6%"
                y1="0"
                x2="94%"
                y2="0"
                stroke="var(--rule)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.1, ease: "easeInOut", delay: 0.3 }}
              />
            </svg>
            {STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: 0.15 + i * 0.18, type: "spring", stiffness: 110, damping: 18 }}
                className="relative"
              >
                <div className="flex items-center gap-4">
                  <DuotoneTile name={s.icon} tile="ink" />
                  <span className="font-serif text-3xl text-rule-soft tabular" aria-hidden="true">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-serif text-2xl mt-5">{s.title}</h3>
                <p className="muted mt-2 text-sm leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Privacy strip ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-20" aria-label="Privacy">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="panel flex flex-col items-start gap-5 p-8 md:flex-row md:items-center md:gap-8"
        >
          <DuotoneTile name="shield" tile="accent" size={26} />
          <div className="flex-1">
            <h3 className="font-serif text-2xl">Private by construction</h3>
            <p className="muted mt-2 max-w-2xl text-sm leading-relaxed">
              One account, one workspace. Analytics are computed on the server
              from your own attempts — never shared, never sold, and a full
              JSON export is one click away whenever you want out.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="relative overflow-hidden border-t border-rule-soft" aria-label="Get started">
        <div className="landing-blob size-[420px] bg-accent-soft bottom-[-200px] left-1/2 -translate-x-1/2" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl px-5 py-28 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", stiffness: 90, damping: 16 }}
          >
            <DuotoneTile name="timer" tile="accent" size={26} className="mx-auto" />
            <h2 className="page-title mt-6">
              Your next chapter starts
              <br />
              with <span className="text-accent">one mock.</span>
            </h2>
            <p className="muted mx-auto mt-5 max-w-lg text-[15px] leading-relaxed">
              Log it, learn from it, and let the numbers carry you to the
              score you&apos;re chasing.
            </p>
            <div className="mt-9">
              <Button asChild className="gap-2.5 px-7 py-3.5 text-[15px]">
                <Link href={signInHref}>
                  Open your workspace <PlainIcon name="arrowRight" size={17} />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-rule-soft">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs muted sm:flex-row">
          <p className="landing-wordmark text-lg text-ink">
            ssc<span className="text-accent">insight</span>
            <span className="text-accent">.</span>
          </p>
          <p>Built for SSC CGL Tier 2 aspirants · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
