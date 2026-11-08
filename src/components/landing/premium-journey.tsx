"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";

const STEPS = [
  {
    label: "Capture",
    title: "Save the result as it actually happened.",
    body: "Choose the exam and tier, then record counts, timing, rank, percentile and subject detail without forcing every paper into one shape.",
  },
  {
    label: "Read",
    title: "Let the pattern become visible.",
    body: "Trend, percentage, accuracy and four analytical scopes turn isolated attempts into evidence without counting one result twice.",
  },
  {
    label: "Plan",
    title: "Put the response on a date.",
    body: "Scheduled tests, revision blocks and personal tasks share one calendar while attempt date and planned date keep their separate meanings.",
  },
  {
    label: "Improve",
    title: "Compare the change, then repeat.",
    body: "Place up to four results side by side and see the difference in marks, percentage, accuracy, time, pace and questions attempted.",
  },
] as const;

function SceneFrame({ index }: { index: number }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-black/8 bg-white shadow-[0_36px_90px_-46px_rgba(73,25,42,.45)]">
      <div className="flex h-10 items-center border-b border-black/6 bg-[#fbfafb] px-4 text-[9px] font-medium text-[#8c8588]">
        <span className="mr-2 size-2 rounded-full bg-[#ff4f38]" />
        sscinsight.app/{["add", "performance", "calendar", "compare"][index]}
        <span className="ml-auto rounded-md bg-white px-2 py-1">Illustrative preview</span>
      </div>
      <div className="aspect-[16/10] p-5 sm:p-7">
        {index === 0 ? <CaptureScene /> : null}
        {index === 1 ? <ReadScene /> : null}
        {index === 2 ? <PlanScene /> : null}
        {index === 3 ? <CompareScene /> : null}
      </div>
    </div>
  );
}

function CaptureScene() {
  return (
    <div className="grid h-full grid-cols-[1fr_.72fr] gap-4">
      <div className="rounded-2xl border border-black/7 bg-[#fcfbfb] p-4">
        <p className="premium-kicker">New attempt</p>
        <h4 className="mt-2 text-xl font-bold tracking-[-0.04em]">Testbook Full Mock 2</h4>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {["SSC CGL", "Tier 2", "25 Oct 2026", "Full mock"].map((item) => <div key={item} className="rounded-xl border border-black/7 bg-white px-3 py-2 text-xs text-[#716a6d]">{item}</div>)}
        </div>
        <div className="mt-3 rounded-xl bg-[#171315] px-4 py-3 text-xs font-semibold text-white">Continue to subject breakdown →</div>
      </div>
      <div className="grid grid-rows-3 gap-3">
        {[["Correct", "92"], ["Incorrect", "21"], ["Skipped", "17"]].map(([label, value], i) => <div key={label} className="flex items-center justify-between rounded-2xl border border-black/7 bg-white px-4"><span className="text-xs text-[#716a6d]">{label}</span><b className={i === 1 ? "text-[#ff4f38]" : "text-[#171315]"}>{value}</b></div>)}
      </div>
    </div>
  );
}

function ReadScene() {
  return (
    <div className="grid h-full grid-cols-[1.4fr_.6fr] gap-4">
      <div className="rounded-2xl bg-[#171315] p-5 text-white">
        <div className="flex justify-between"><div><p className="premium-kicker !text-white/45">Score movement</p><p className="mt-2 text-3xl font-bold tracking-[-0.05em]">71.5%</p></div><span className="h-fit rounded-lg bg-[#ff4f38] px-2 py-1 text-[10px] font-bold">+12.8 pts</span></div>
        <svg viewBox="0 0 500 150" className="mt-5 w-full" aria-hidden="true"><path d="M0 125 C70 130 80 90 140 96 S230 120 280 62 S370 90 420 36 S470 25 500 12" fill="none" stroke="#ff6a55" strokeWidth="5" strokeLinecap="round"/><path d="M0 138H500" stroke="white" strokeOpacity=".12"/></svg>
      </div>
      <div className="grid gap-3">
        {[["Accuracy", "75.5%"], ["Average", "62.8%"], ["Target gap", "−10.5"]].map(([label, value]) => <div key={label} className="rounded-2xl border border-black/7 bg-[#fcfbfb] p-4"><p className="text-[10px] text-[#8c8588]">{label}</p><b className="mt-1 block text-xl tracking-[-0.04em]">{value}</b></div>)}
      </div>
    </div>
  );
}

function PlanScene() {
  return (
    <div className="grid h-full grid-cols-[.72fr_1.28fr] gap-4">
      <div className="rounded-2xl bg-[#fff0ed] p-5"><p className="premium-kicker">Today</p><p className="mt-2 text-4xl font-bold tracking-[-0.06em]">08</p><p className="text-sm text-[#716a6d]">November · Sunday</p><div className="mt-5 space-y-2">{["Full mock", "GA revision", "Error log"].map((x,i)=><div key={x} className="rounded-xl bg-white px-3 py-2 text-xs"><span className="mr-2 text-[#ff4f38]">0{i+1}</span>{x}</div>)}</div></div>
      <div className="rounded-2xl border border-black/7 bg-white p-4"><div className="grid grid-cols-7 gap-2 text-center text-[9px] text-[#8c8588]">{["M","T","W","T","F","S","S"].map((x,i)=><span key={`${x}-${i}`}>{x}</span>)}{Array.from({length:28},(_,i)=><span key={i} className={`grid aspect-square place-items-center rounded-lg ${i===12?"bg-[#ff4f38] font-bold text-white":i===16?"bg-[#171315] text-white":"bg-[#fcfbfb] text-[#4f484b]"}`}>{i+1}</span>)}</div></div>
    </div>
  );
}

function CompareScene() {
  return (
    <div className="h-full rounded-2xl border border-black/7 bg-white p-5">
      <div className="flex items-center justify-between"><div><p className="premium-kicker">Side-by-side</p><h4 className="mt-1 text-xl font-bold tracking-[-0.04em]">What changed?</h4></div><span className="rounded-lg bg-[#fff0ed] px-3 py-2 text-xs font-semibold text-[#e63d27]">2 mocks selected</span></div>
      <div className="mt-5 grid grid-cols-[1fr_.7fr_.7fr_.5fr] text-xs">
        {["Metric", "18 Oct", "25 Oct", "Difference", "Score", "266", "279", "+13", "Accuracy", "69.8%", "75.5%", "+5.7", "Time", "1:55", "2:04", "+0:09"].map((x,i)=><div key={`${x}-${i}`} className={`border-b border-black/7 px-3 py-3 ${i<4?"text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8c8588]":i%4===3?"font-bold text-[#ff4f38]":""}`}>{x}</div>)}
      </div>
    </div>
  );
}

function Layer({ progress, index, children }: { progress: MotionValue<number>; index: number; children: ReactNode }) {
  const start = index * 0.25;
  const middle = start + 0.11;
  const end = Math.min(1, start + 0.29);
  const opacity = useTransform(progress, index === 0 ? [0, middle, end] : [start, middle, end], index === 0 ? [1, 1, 0] : [0, 1, index === 3 ? 1 : 0]);
  const y = useTransform(progress, [start, middle, end], [70, 0, -40]);
  const scale = useTransform(progress, [start, middle], [0.94, 1]);
  return <motion.div style={{ opacity, y, scale }} className="absolute inset-0 origin-center">{children}</motion.div>;
}

export function PremiumJourney() {
  const target = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (value) => setActive(Math.min(3, Math.floor(value * 4))));

  const linear = <div className="space-y-16">{STEPS.map((step,index)=><article key={step.label} className="grid gap-6"><div><p className="premium-kicker">0{index+1} · {step.label}</p><h3 className="mt-3 text-3xl font-bold tracking-[-0.05em]">{step.title}</h3><p className="mt-3 max-w-xl text-sm leading-relaxed text-[#716a6d]">{step.body}</p></div><SceneFrame index={index}/></article>)}</div>;

  return (
    <section ref={target} id="workflow" className="premium-journey scroll-mt-16 bg-[#f7f5f6]">
      <noscript><style>{`.premium-journey-linear{display:block!important}.premium-journey-pinned{display:none!important}`}</style></noscript>
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <p className="premium-kicker">From result to response</p>
        <h2 className="mt-4 max-w-4xl text-[clamp(2.7rem,6vw,5.8rem)] font-bold leading-[0.93] tracking-[-0.065em] text-[#171315]">One loop. Every part of your preparation.</h2>
      </div>
      <div className="premium-journey-linear mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:hidden">{linear}</div>
      <div className="premium-journey-pinned relative hidden h-[360vh] lg:block">
        <div className="sticky top-[68px] h-[calc(100vh-68px)] overflow-hidden">
          <div className="mx-auto grid h-full max-w-7xl grid-cols-[.72fr_1.4fr] items-center gap-14 px-8">
            <div>
              <p className="premium-kicker">0{active+1} · {STEPS[active].label}</p>
              <h3 className="mt-5 text-[clamp(2.2rem,4vw,4.6rem)] font-bold leading-[0.96] tracking-[-0.06em]">{STEPS[active].title}</h3>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#716a6d]">{STEPS[active].body}</p>
              <ol className="mt-12 grid grid-cols-4 gap-2" aria-label="Workflow stages">{STEPS.map((step,index)=><li key={step.label} className={`border-t-2 pt-3 text-xs font-semibold transition-colors ${active===index?"border-[#ff4f38] text-[#171315]":"border-black/8 text-[#aaa3a6]"}`}>{step.label}</li>)}</ol>
            </div>
            <div className="relative aspect-[16/10]">{STEPS.map((step,index)=><Layer key={step.label} progress={scrollYProgress} index={index}><SceneFrame index={index}/></Layer>)}</div>
          </div>
          <motion.span aria-hidden="true" style={{ scaleX: scrollYProgress }} className="absolute inset-x-0 bottom-0 h-1 origin-left bg-[#ff4f38]" />
        </div>
      </div>
    </section>
  );
}
