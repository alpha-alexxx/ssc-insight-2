"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

const STAGES = [
  {
    label: "Capture",
    title: "The paper stays itself.",
    body: "Exam, tier, scoring, timing and subject detail remain attached to the result you actually sat.",
  },
  {
    label: "Read",
    title: "The weak signal gets named.",
    body: "Four analytical views reveal the pattern without counting one saved attempt more than once.",
  },
  {
    label: "Plan",
    title: "The response receives a date.",
    body: "Tests, revisions and personal work meet on one calendar while planned and attempted dates stay distinct.",
  },
  {
    label: "Improve",
    title: "The next record proves the change.",
    body: "Compare up to four attempts across marks, percentage, accuracy, pace, time and questions attempted.",
  },
] as const;

function CapturePlate() {
  return (
    <div className="gazette-scene gazette-capture-scene">
      <header><span>Illustrative result</span><b>SSC CGL · Tier 2</b><time>02 Nov 2026</time></header>
      <div className="gazette-scene-score"><span>Score</span><strong>279<small>/390</small></strong><span>Accuracy</span><strong>75.5%</strong></div>
      <div className="gazette-mini-table">
        {[["Quantitative Aptitude", "72 / 90"], ["Reasoning", "66 / 90"], ["English", "87 / 135"], ["General Awareness", "54 / 75"]].map(([name, value], index) => (
          <div key={name} className={index === 3 ? "is-alert" : ""}><span>{name}</span><b>{value}</b></div>
        ))}
      </div>
    </div>
  );
}

function ReadPlate() {
  return (
    <div className="gazette-scene gazette-read-scene">
      <header><span>Performance brief</span><b>Six full mocks</b></header>
      <div className="gazette-read-grid">
        <div><strong>+12.8</strong><span>percentage points</span></div>
        <div className="gazette-line-chart" aria-hidden="true"><svg viewBox="0 0 520 180"><path d="M0 156 C72 166 88 111 154 126 S247 151 304 82 S403 111 520 20" /><line x1="0" y1="162" x2="520" y2="162" /></svg></div>
        <blockquote>“General Awareness remains the largest recoverable loss: 18 marks on the latest paper.”</blockquote>
      </div>
    </div>
  );
}

function PlanPlate() {
  return (
    <div className="gazette-scene gazette-plan-scene">
      <header><span>Preparation register</span><b>November 2026</b></header>
      <div className="gazette-calendar-row">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="gazette-calendar-grid">{Array.from({ length: 14 }, (_, index) => <span key={index} className={index === 6 ? "is-today" : ""}>{index + 2}</span>)}</div>
      <div className="gazette-dated-action"><time>08 NOV</time><div><b>Revise General Awareness errors</b><span>25 questions · Personal task</span></div><em>Scheduled</em></div>
    </div>
  );
}

function ComparePlate() {
  return (
    <div className="gazette-scene gazette-compare-scene">
      <header><span>Comparison report</span><b>What changed?</b></header>
      <div className="gazette-compare-table">
        {[['Metric', '18 Oct', '02 Nov', 'Move'], ['Score', '266', '279', '+13'], ['Accuracy', '69.8%', '75.5%', '+5.7'], ['GA score', '47', '54', '+7'], ['Time', '1:55', '2:04', '+0:09']].map((row, rowIndex) => row.map((cell, cellIndex) => <span key={`${rowIndex}-${cellIndex}`} className={rowIndex === 0 ? "is-head" : cellIndex === 3 ? "is-move" : ""}>{cell}</span>))}
      </div>
    </div>
  );
}

const SCENES = [<CapturePlate key="capture" />, <ReadPlate key="read" />, <PlanPlate key="plan" />, <ComparePlate key="compare" />];

function SceneLayer({ progress, index, children }: { progress: MotionValue<number>; index: number; children: ReactNode }) {
  const start = index * 0.25;
  const hold = start + 0.12;
  const end = Math.min(1, start + 0.28);
  const opacity = useTransform(progress, index === 0 ? [0, hold, end] : [start, hold, end], index === 0 ? [1, 1, 0] : [0, 1, index === 3 ? 1 : 0]);
  const clipPath = useTransform(progress, [start, hold], ["inset(12% 0 0 0)", "inset(0% 0 0 0)"]);
  const y = useTransform(progress, [start, hold, end], [60, 0, -32]);
  return <motion.div className="gazette-stage-layer" style={{ opacity, clipPath, y }}>{children}</motion.div>;
}

export function GazetteJourney() {
  const target = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (!reduced) setActive(Math.min(3, Math.floor(value * 4)));
  });

  const linear = STAGES.map((stage, index) => (
    <article className="gazette-linear-stage" key={stage.label}>
      <div><span>{stage.label}</span><h3>{stage.title}</h3><p>{stage.body}</p></div>
      {SCENES[index]}
    </article>
  ));

  return (
    <section ref={target} id="workflow" className="gazette-journey">
      <noscript><style>{`.gazette-journey-pinned{display:none!important}.gazette-journey-linear{display:grid!important}`}</style></noscript>
      <div className="gazette-section-heading">
        <h2>The record becomes a system.</h2>
        <p>One result moves through a disciplined loop. Each stage keeps its meaning and leaves the next action explicit.</p>
      </div>
      <div className="gazette-journey-linear">{linear}</div>
      <div className="gazette-journey-pinned">
        <div className="gazette-journey-sticky">
          <div className="gazette-stage-copy">
            <span>{active + 1} of 4 · {STAGES[active].label}</span>
            <h3>{STAGES[active].title}</h3>
            <p>{STAGES[active].body}</p>
            <ol>{STAGES.map((stage, index) => <li key={stage.label} className={active === index ? "is-active" : ""}>{stage.label}</li>)}</ol>
          </div>
          <div className="gazette-stage-visual">{SCENES.map((scene, index) => <SceneLayer key={STAGES[index].label} progress={scrollYProgress} index={index}>{scene}</SceneLayer>)}</div>
          <motion.span className="gazette-stage-progress" aria-hidden="true" style={{ scaleX: scrollYProgress }} />
        </div>
      </div>
    </section>
  );
}
