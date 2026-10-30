"use client";
import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { totals } from "@/lib/domain";
import { shortDate } from "@/lib/format";
import {
  LANDING_FULL_MOCKS,
  LANDING_LATEST,
  LANDING_SUMMARY,
} from "./fixtures";
import { MockRing, MockTrend } from "./mockups/data-parts";

/**
 * The hero composition.
 *
 * A dashboard slab in the middle, with two "clipless" record cards that
 * break its bottom edge — the way a printed plate carries a pasted-in
 * correction. Deliberately no card sits over the slab's figures: the score
 * band and the trend are the argument, and covering them would be decoration
 * winning over the product.
 *
 * Motion, each bounded:
 *  - the slab tilts by at most 1.2deg and never leaves its column;
 *  - the two overlapping cards drift on their own CSS keyframe periods
 *    (9s / 13s), so they never pulse in unison;
 *  - the whole field follows the pointer by at most 8px, on fine pointers
 *    only, through motion values — no React state, so no re-render per frame.
 *
 * Under `prefers-reduced-motion` the tilt, drift and parallax are dropped and
 * the composition renders at rest. Below `lg` the overlapping cards are
 * dropped entirely and the slab stands alone.
 */

const MAX_SHIFT = 8;

export function HeroArt() {
  const reduced = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 90, damping: 20, mass: 0.6 };
  const x = useSpring(px, spring);
  const y = useSpring(py, spring);
  // Layers move at different rates for a shallow sense of depth.
  const slabX = useTransform(x, (value) => value * 0.35);
  const slabY = useTransform(y, (value) => value * 0.35);
  const cardAX = useTransform(x, (value) => value * -0.8);
  const cardAY = useTransform(y, (value) => value * -0.8);
  const cardBX = useTransform(x, (value) => value * 0.7);
  const cardBY = useTransform(y, (value) => value * 0.7);

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== "mouse") return;
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    const dx =
      (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy =
      (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    px.set(Math.max(-1, Math.min(1, dx)) * MAX_SHIFT);
    py.set(Math.max(-1, Math.min(1, dy)) * MAX_SHIFT);
  }
  function onPointerLeave() {
    px.set(0);
    py.set(0);
  }

  const s = LANDING_SUMMARY;
  const points = s.trend.map((point) => ({ percentage: point.percentage }));
  const ring = s.radar;
  const latest = totals(LANDING_LATEST);
  const recent = [...LANDING_FULL_MOCKS].reverse().slice(1, 3);

  return (
    <div
      ref={frame}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative mx-auto w-full max-w-[34rem] pb-6 lg:max-w-none lg:pb-24"
    >
      {/* Atmospheric wash behind the composition. */}
      <div
        aria-hidden="true"
        className="landing-blob pointer-events-none absolute -right-16 -top-10 size-[22rem] bg-accent-soft opacity-80"
      />
      <div
        aria-hidden="true"
        className="landing-blob pointer-events-none absolute -bottom-10 -left-12 size-[16rem] bg-soft opacity-70"
      />

      {/* ---------- the slab ---------- */}
      <motion.div
        style={reduced ? undefined : { x: slabX, y: slabY }}
        className="landing-sweep relative z-10 lg:-rotate-[1.2deg] motion-reduce:rotate-0"
      >
        <div className="overflow-hidden rounded-card border border-rule-soft bg-paper landing-lift">
          {/* window chrome */}
          <div className="flex items-center gap-2 border-b border-rule-soft bg-canvas px-3 py-2">
            <span className="flex gap-1" aria-hidden="true">
              <span className="size-1.5 rounded-[1px] bg-rule-soft" />
              <span className="size-1.5 rounded-[1px] bg-rule-soft" />
              <span className="size-1.5 rounded-[1px] bg-rule-soft" />
            </span>
            <span className="truncate text-[0.625rem] text-muted">
              ssc insight · dashboard
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-[0.5625rem] text-muted">
              <span
                className="size-1.5 rounded-full bg-positive"
                aria-hidden="true"
              />
              Session verified
            </span>
          </div>

          <div className="p-3 sm:p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="section-label">Full mocks</p>
                <p className="mt-1 font-serif text-[1.05rem] leading-tight tracking-[-0.02em] sm:text-[1.2rem]">
                  Your preparation, in perspective.
                </p>
              </div>
              <span className="shrink-0 rounded-control border border-rule-soft px-1.5 py-0.5 text-[0.5625rem] text-muted">
                Target {Math.round(s.targetPercentage)}%
              </span>
            </div>

            {/* metric strip: 2x2 on phones, four across from sm */}
            <div className="mt-3 grid grid-cols-2 border-y border-ink sm:grid-cols-4">
              {[
                {
                  label: "Latest",
                  value: String(s.latestScore),
                  unit: `/ ${s.latestMax}`,
                },
                {
                  label: "Average",
                  value: `${(s.averagePercentage ?? 0).toFixed(1)}%`,
                  unit: "",
                },
                {
                  label: "Best",
                  value: `${(s.bestPercentage ?? 0).toFixed(1)}%`,
                  unit: "",
                },
                {
                  label: "Accuracy",
                  value: `${(s.weightedAccuracy ?? 0).toFixed(1)}%`,
                  unit: "",
                },
              ].map((cell, index) => (
                <div
                  key={cell.label}
                  className={`min-w-0 px-2.5 py-2 ${
                    index % 2 === 1 ? "border-l border-rule-soft" : ""
                  } ${index >= 2 ? "border-t border-rule-soft sm:border-t-0" : ""} ${
                    index === 2 ? "sm:border-l" : ""
                  }`}
                >
                  <p className="section-label truncate">{cell.label}</p>
                  <p className="mt-0.5 flex items-baseline gap-1 font-serif text-lg leading-none tracking-[-0.02em] tabular sm:text-xl">
                    {cell.value}
                    {cell.unit ? (
                      <span className="font-sans text-[0.5em] font-medium tracking-normal text-muted">
                        {cell.unit}
                      </span>
                    ) : null}
                  </p>
                </div>
              ))}
            </div>

            {/* trend */}
            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="section-label">Score trend</p>
                <p className="text-[0.5625rem] text-muted">
                  dashed line is your target
                </p>
              </div>
              <div className="mt-1.5 h-24 sm:h-28">
                <MockTrend points={points} target={s.targetPercentage} />
              </div>
              <div className="mt-1 flex justify-between text-[0.5625rem] text-muted tabular">
                <span>{shortDate(s.trend[0]?.date ?? "")}</span>
                <span>{shortDate(s.trend.at(-1)?.date ?? "")}</span>
              </div>
            </div>

            {/* subject chips, with a proportion rule each */}
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-rule-soft pt-3 sm:grid-cols-4">
              {s.whereYouStand
                .filter((row) => row.subjectId !== "computer")
                .map((row) => (
                  <div key={row.subjectId} className="min-w-0">
                    <p className="flex items-baseline justify-between gap-1 text-[0.625rem]">
                      <span className="truncate text-muted">{row.label}</span>
                      <span className="shrink-0 font-medium tabular">
                        {row.averagePercentage == null
                          ? "—"
                          : `${Math.round(row.averagePercentage)}%`}
                      </span>
                    </p>
                    <span
                      className="mt-1 block h-0.5 bg-soft"
                      aria-hidden="true"
                    >
                      <span
                        className="block h-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, row.averagePercentage ?? 0))}%`,
                          background: `var(--chart-${row.subjectId})`,
                        }}
                      />
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ---------- the shelf (lg and up) ----------
          Three record cards in a real grid below the slab. They overlap the
          slab's bottom edge by a hair so the composition reads as one collage,
          but they never sit on top of its figures. */}
      <div className="relative z-20 mt-3 hidden grid-cols-3 gap-2.5 lg:grid">
        <motion.div
          style={reduced ? undefined : { x: cardAX, y: cardAY }}
          className="min-w-0"
        >
          <div className={reduced ? undefined : "landing-float-a"}>
            <div className="rounded-card border border-rule-soft bg-paper p-2.5 landing-lift">
              <div className="flex items-center gap-2">
                <MockRing
                  size={40}
                  stroke={5}
                  correct={ring?.correct ?? 0}
                  incorrect={ring?.incorrect ?? 0}
                  unattempted={ring?.unattempted ?? 0}
                  centre={`${Math.round(s.latestPercentage)}%`}
                  caption=""
                />
                <div className="min-w-0">
                  <p className="text-[0.5rem] font-semibold uppercase tracking-[0.12em] text-positive">
                    Attempted
                  </p>
                  <p className="text-[0.72rem] font-medium leading-tight">
                    {LANDING_LATEST.name}
                  </p>
                  <p className="truncate text-[0.58rem] text-muted">
                    {shortDate(LANDING_LATEST.completedAt)} ·{" "}
                    {LANDING_LATEST.platform}
                  </p>
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between border-t border-rule-soft pt-1.5 text-[0.58rem]">
                <span className="text-muted">Score</span>
                <span className="font-serif text-[0.8rem] tabular">
                  {latest.score} / {latest.maxScore}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          style={reduced ? undefined : { x: cardBX, y: cardBY }}
          className="min-w-0"
        >
          <div className={reduced ? undefined : "landing-float-c"}>
            <div className="rounded-card border border-rule-soft bg-paper p-2.5 landing-lift">
              <p className="section-label">Answer breakdown</p>
              <div className="mt-1.5 flex items-center gap-2.5">
                {ring ? (
                  <MockRing
                    size={46}
                    stroke={6}
                    correct={ring.correct}
                    incorrect={ring.incorrect}
                    unattempted={ring.unattempted}
                    centre={`${ring.scorePercentage.toFixed(0)}%`}
                  />
                ) : null}
                <dl className="min-w-0 flex-1 space-y-0.5 text-[0.575rem]">
                  {ring
                    ? [
                        {
                          label: "Correct",
                          count: ring.correct,
                          share: ring.correctPercentage,
                          color: "var(--chart-average)",
                        },
                        {
                          label: "Incorrect",
                          count: ring.incorrect,
                          share: ring.incorrectPercentage,
                          color: "var(--accent)",
                        },
                        {
                          label: "Skipped",
                          count: ring.unattempted,
                          share: ring.unattemptedPercentage,
                          color: "var(--outcome-unattempted)",
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center gap-1"
                        >
                          <span
                            className="size-1 shrink-0 rounded-full"
                            style={{ background: row.color }}
                            aria-hidden="true"
                          />
                          <dt className="flex-1 truncate text-muted">
                            {row.label}
                          </dt>
                          <dd className="tabular">{row.count}</dd>
                        </div>
                      ))
                    : null}
                </dl>
              </div>
            </div>
          </div>
        </motion.div>

        {/* The two most recent attempts, completing the shelf. */}
        <div className="min-w-0">
          <div className={reduced ? undefined : "landing-float-b"}>
            <div className="h-full rounded-card border border-rule-soft bg-paper p-2.5 landing-lift">
              <p className="section-label">Recent mocks</p>
              <ul className="mt-1.5 space-y-1">
                {recent.map((attempt) => (
                  <li
                    key={attempt.id}
                    className="flex items-baseline justify-between gap-1 text-[0.625rem]"
                  >
                    <span className="truncate text-muted">
                      {shortDate(attempt.completedAt)}
                    </span>
                    <span className="shrink-0 font-medium tabular">
                      {totals(attempt).score}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
