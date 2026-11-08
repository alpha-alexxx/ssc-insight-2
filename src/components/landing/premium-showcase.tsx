"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

const CHART = "M0 112 C42 106 62 76 104 82 S168 104 210 65 S276 28 320 50 S386 92 430 30 S496 18 540 8";

function MiniIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-5 place-items-center rounded-md bg-[#fff0ed] text-[10px] font-bold text-[#ff4f38]">
      {children}
    </span>
  );
}

export function PremiumDashboard() {
  return (
    <div className="premium-window overflow-hidden rounded-[22px] border border-black/8 bg-white text-[#171315] shadow-[0_36px_100px_-40px_rgba(77,35,45,.38)]">
      <div className="flex h-9 items-center gap-1.5 border-b border-black/6 bg-[#fbfafb] px-4">
        <i className="size-2 rounded-full bg-[#ffb8ad]" />
        <i className="size-2 rounded-full bg-[#ffd5cf]" />
        <i className="size-2 rounded-full bg-[#ece9ea]" />
        <span className="ml-3 text-[8px] font-medium text-[#8c8588]">sscinsight.app/dashboard</span>
        <span className="ml-auto flex items-center gap-1 text-[7px] font-medium text-[#6b665e]">
          <i className="size-1.5 rounded-full bg-[#7d9b5f]" /> Illustrative preview
        </span>
      </div>

      <div className="grid aspect-[16/9] grid-cols-[8.6rem_minmax(0,1fr)] sm:grid-cols-[10.5rem_minmax(0,1fr)]">
        <aside className="border-r border-black/6 bg-[#fcfbfb] p-3 sm:p-4">
          <div className="flex items-center gap-2 text-[9px] font-bold">
            <span className="grid size-5 place-items-center rounded-md bg-[#ff4f38] text-[8px] text-white">S</span>
            SSC Insight
          </div>
          <p className="mt-5 text-[6px] font-semibold uppercase tracking-[0.18em] text-[#aaa3a6]">Workspace</p>
          <ul className="mt-2 space-y-1 text-[7px] font-medium sm:text-[8px]">
            {["Dashboard", "Study calendar", "Today's plan", "My tasks"].map((item, index) => (
              <li
                key={item}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${index === 0 ? "bg-[#fff0ed] text-[#e63d27]" : "text-[#716a6d]"}`}
              >
                <MiniIcon>{index + 1}</MiniIcon>{item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[6px] font-semibold uppercase tracking-[0.18em] text-[#aaa3a6]">Results</p>
          <ul className="mt-2 space-y-1 text-[7px] font-medium text-[#716a6d] sm:text-[8px]">
            {["Mock history", "Compare", "Performance"].map((item, index) => (
              <li key={item} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                <MiniIcon>{index + 5}</MiniIcon>{item}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-[#171315] px-3 py-2 text-center text-[7px] font-semibold text-white">+ Log a mock</div>
        </aside>

        <div className="min-w-0 p-3 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[7px] font-semibold uppercase tracking-[0.16em] text-[#ff4f38]">Sunday · 8 November</p>
              <h3 className="mt-1 text-[clamp(0.95rem,2vw,1.5rem)] font-bold tracking-[-0.04em]">Good evening, aspirant.</h3>
              <p className="mt-1 text-[7px] text-[#8c8588] sm:text-[8px]">Your plan, recent evidence, and next action in one view.</p>
            </div>
            <span className="rounded-lg border border-black/8 px-2 py-1 text-[7px] text-[#716a6d]">Search · ⌘K</span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              ["Today's plan", "4 left", "01"],
              ["Plan complete", "68%", "02"],
              ["Latest result", "279 / 390", "03"],
              ["Accuracy", "75.5%", "04"],
            ].map(([label, value, number]) => (
              <div key={label} className="rounded-xl border border-black/6 bg-[#fcfbfb] p-2 sm:p-3">
                <div className="flex justify-between text-[6px] font-semibold uppercase tracking-[0.1em] text-[#aaa3a6]"><span>{label}</span><span>{number}</span></div>
                <p className="mt-2 text-[clamp(0.75rem,1.5vw,1.12rem)] font-bold tracking-[-0.03em]">{value}</p>
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-[#f0edef]"><i className="block h-full w-2/3 rounded-full bg-[#ff4f38]" /></span>
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-[minmax(0,1.5fr)_minmax(8rem,.7fr)] gap-2">
            <div className="rounded-xl border border-black/6 bg-white p-3">
              <div className="flex items-center justify-between">
                <div><p className="text-[8px] font-semibold">Performance signal</p><p className="text-[6px] text-[#aaa3a6]">Last six full mocks</p></div>
                <span className="rounded-md bg-[#fff0ed] px-2 py-1 text-[6px] font-semibold text-[#e63d27]">+12.8 pts</span>
              </div>
              <svg viewBox="0 0 540 125" className="mt-2 h-[72px] w-full overflow-visible" aria-hidden="true">
                <defs><linearGradient id="premium-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6a55" stopOpacity=".28"/><stop offset="1" stopColor="#ff6a55" stopOpacity="0"/></linearGradient></defs>
                <path d={`${CHART} L540 125 L0 125 Z`} fill="url(#premium-area)" />
                <path d={CHART} fill="none" stroke="#ff4f38" strokeWidth="3" strokeLinecap="round" />
                {[0,108,216,324,432,540].map((x, i) => <circle key={x} cx={x} cy={[112,80,62,49,29,8][i]} r="4" fill="white" stroke="#ff4f38" strokeWidth="2" />)}
              </svg>
            </div>
            <div className="rounded-xl bg-[#171315] p-3 text-white">
              <p className="text-[6px] font-semibold uppercase tracking-[0.14em] text-white/50">Next useful action</p>
              <p className="mt-2 text-[10px] font-semibold leading-tight sm:text-xs">Revise General Awareness mistakes.</p>
              <div className="mt-3 space-y-1.5 text-[6px] text-white/60">
                <p className="flex justify-between"><span>Questions</span><b className="text-white">25</b></p>
                <p className="flex justify-between"><span>Due</span><b className="text-white">Today</b></p>
              </div>
              <span className="mt-3 block rounded-lg bg-[#ff4f38] px-2 py-1.5 text-center text-[6px] font-bold">Open today&apos;s plan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PremiumShowcase() {
  const target = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 80, damping: 22 });
  const y = useSpring(my, { stiffness: 80, damping: 22 });
  const { scrollYProgress } = useScroll({ target, offset: ["start end", "end start"] });
  const lift = useTransform(scrollYProgress, [0, 0.45, 1], [90, 0, -36]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [0.93, 1]);

  return (
    <section
      ref={target}
      aria-label="SSC Insight product showcase"
      onPointerMove={(event) => {
        if (reduced || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        mx.set(((event.clientX - rect.left) / rect.width - 0.5) * 12);
        my.set(((event.clientY - rect.top) / rect.height - 0.5) * 8);
      }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
      className="premium-showcase relative mx-auto mt-12 max-w-[72rem] px-4 sm:mt-16 sm:px-8"
    >
      <motion.figure style={{ y: lift, scale, x }} className="relative z-10 m-0 origin-top will-change-transform">
        <PremiumDashboard />
        <figcaption className="sr-only">A coded product preview of the SSC Insight dashboard using illustrative sample data.</figcaption>
      </motion.figure>

      <motion.div
        aria-hidden="true"
        style={{ x: useTransform(x, (v) => v * -1.3), y: useTransform(y, (v) => v * -1.4) }}
        className="premium-float-card absolute -left-3 top-[34%] z-20 hidden w-48 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-[0_24px_60px_-28px_rgba(100,38,53,.45)] backdrop-blur md:block"
      >
        <p className="text-[9px] font-semibold text-[#8c8588]">Attempt recorded</p>
        <div className="mt-2 flex items-end justify-between"><b className="text-xl tracking-[-0.04em] text-[#171315]">279</b><span className="text-[9px] text-[#ff4f38]">+13 marks</span></div>
      </motion.div>

      <motion.div
        aria-hidden="true"
        style={{ x: useTransform(x, (v) => v * 1.1), y: useTransform(y, (v) => v * -1.1) }}
        className="premium-float-card premium-float-delay absolute -right-2 top-[18%] z-20 hidden w-52 rounded-2xl bg-[#171315] p-4 text-white shadow-[0_24px_60px_-28px_rgba(28,19,23,.75)] backdrop-blur md:block"
      >
        <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-white/45">Focus signal</p>
        <p className="mt-2 text-sm font-semibold leading-tight">Accuracy is rising. GA still costs the most marks.</p>
      </motion.div>
    </section>
  );
}
