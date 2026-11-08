"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { BrowserFrame } from "./mockups/browser-frame";
import { CompareScreen } from "./mockups/compare-screen";
import { DashboardScreen } from "./mockups/dashboard-screen";
import { HistoryScreen } from "./mockups/history-screen";
import { PlannerScreen } from "./mockups/planner-screen";
import type { LandingPlanData } from "./plan-facts";

type Stage = {
  id: string;
  label: string;
  title: string;
  body: string;
  url: string;
  screen: ReactNode;
};

function AssemblyLayer({
  progress,
  index,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  children: ReactNode;
}) {
  const start = index * 0.25;
  const middle = start + 0.12;
  const end = Math.min(1, start + 0.3);
  const opacity = useTransform(
    progress,
    index === 0 ? [0, middle, end] : [start, middle, end],
    index === 0 ? [1, 1, 0] : [0, 1, index === 3 ? 1 : 0],
  );
  const y = useTransform(progress, [start, middle, end], [44, 0, -26]);
  const scale = useTransform(progress, [start, middle, end], [0.965, 1, 0.985]);
  const clipPath = useTransform(
    progress,
    [start, middle],
    ["inset(8% 5% 8% 5%)", "inset(0% 0% 0% 0%)"],
  );

  return (
    <motion.div
      style={{ opacity, y, scale, clipPath }}
      className="absolute inset-0 origin-center will-change-transform"
    >
      {children}
    </motion.div>
  );
}

function Screen({ stage }: { stage: Stage }) {
  return (
    <figure className="m-0">
      <BrowserFrame url={stage.url}>{stage.screen}</BrowserFrame>
      <figcaption className="sr-only">
        Illustrative sample data. {stage.body}
      </figcaption>
    </figure>
  );
}

export function Assembly({ plan }: { plan: LandingPlanData }) {
  const target = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start start", "end end"],
  });

  const stages: Stage[] = [
    {
      id: "capture",
      label: "Capture",
      title: "Begin with the result you already have.",
      body: "Log the paper, its pattern, date, timing, accuracy and subject breakdown without flattening one exam into another.",
      url: "sscinsight.app/dashboard",
      screen: <DashboardScreen />,
    },
    {
      id: "read",
      label: "Read",
      title: "Turn attempts into evidence.",
      body: "History keeps every saved attempt legible. Trends, percentages and analytical scopes reveal movement without counting one mock twice.",
      url: "sscinsight.app/history",
      screen: <HistoryScreen />,
    },
    {
      id: "plan",
      label: "Plan",
      title: "Put the next piece of work on a date.",
      body: "The planner holds scheduled tests, revision blocks and personal tasks while the attempt date remains the truth used by performance views.",
      url: "sscinsight.app/calendar",
      screen: <PlannerScreen plan={plan} />,
    },
    {
      id: "improve",
      label: "Improve",
      title: "Compare what changed, then decide what follows.",
      body: "Place two to four results side by side and read the difference in the unit that matters: marks, percentage, accuracy, time or questions attempted.",
      url: "sscinsight.app/compare",
      screen: <CompareScreen />,
    },
  ];

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(stages.length - 1, Math.floor(value * stages.length));
    setActive((current) => (current === next ? current : next));
  });

  const linear = (
    <div className="space-y-14">
      {stages.map((stage, index) => (
        <article key={stage.id} className="grid gap-5">
          <div className="border-t border-rule-soft pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              {String(index + 1).padStart(2, "0")} · {stage.label}
            </p>
            <h3 className="mt-2 max-w-xl font-serif text-2xl leading-tight tracking-[-0.025em]">
              {stage.title}
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              {stage.body}
            </p>
          </div>
          <Screen stage={stage} />
        </article>
      ))}
    </div>
  );

  return (
    <section
      ref={target}
      id="workspace"
      aria-labelledby="assembly-title"
      className="landing-assembly landing-cinematic-panel relative"
    >
      <noscript>
        <style>{`.landing-assembly-linear{display:block!important}.landing-assembly-pinned{display:none!important}`}</style>
      </noscript>
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="max-w-3xl">
          <h2
            id="assembly-title"
            className="font-serif text-[clamp(2.1rem,5vw,4.8rem)] font-[450] leading-[0.98] tracking-[-0.035em] text-balance"
          >
            One result becomes a working preparation system.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
            The workspace assembles in the same order you use it: capture the
            attempt, read the pattern, plan the response, and compare what changed.
          </p>
        </div>
      </div>

      <div className="landing-assembly-linear mx-auto max-w-6xl px-5 pb-24 sm:px-8 lg:hidden">
        {linear}
      </div>
      <div className="landing-assembly-pinned relative hidden h-[360vh] lg:block">
            <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-hidden border-y border-rule-soft bg-paper">
              <div aria-hidden="true" className="landing-grid-lines absolute inset-0 opacity-50" />
              <div className="relative mx-auto grid h-full max-w-[92rem] grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.8fr)] gap-10 px-8 py-10 xl:gap-16 xl:px-12">
                <div className="flex min-h-0 flex-col justify-between py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                      Dashboard assembly
                    </p>
                    <div className="mt-8" aria-live="polite">
                      <p className="font-serif text-[4.5rem] leading-none tracking-[-0.04em] text-rule-soft tabular">
                        {String(active + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-5 font-serif text-[clamp(1.8rem,3vw,3rem)] leading-[1.04] tracking-[-0.03em] text-balance">
                        {stages[active]!.title}
                      </h3>
                      <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-muted">
                        {stages[active]!.body}
                      </p>
                    </div>
                  </div>

                  <ol className="grid gap-2" aria-label="Assembly stages">
                    {stages.map((stage, index) => (
                      <li key={stage.id}>
                        <div
                          className={`flex items-center gap-3 border-t py-2.5 text-sm transition-colors ${
                            active === index
                              ? "border-accent text-ink"
                              : "border-rule-soft text-muted"
                          }`}
                        >
                          <span className="w-6 tabular">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="font-medium">{stage.label}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="relative min-h-0 self-center">
                  <div className="relative aspect-[16/10] w-full">
                    {stages.map((stage, index) => (
                      <AssemblyLayer
                        key={stage.id}
                        progress={scrollYProgress}
                        index={index}
                      >
                        <Screen stage={stage} />
                      </AssemblyLayer>
                    ))}
                  </div>
                </div>
              </div>
              <motion.div
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-[3px] origin-left bg-accent"
                style={{ scaleX: scrollYProgress, right: 0 }}
              />
            </div>
      </div>
    </section>
  );
}
