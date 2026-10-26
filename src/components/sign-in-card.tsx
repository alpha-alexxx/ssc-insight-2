"use client";
import { motion, useReducedMotion } from "motion/react";
import { useSpring, animated } from "@react-spring/web";
import { AuthControl } from "./auth-control";
import { DuotoneIcon, DuotoneTile } from "./icon";
import { ThemeToggle } from "./theme-toggle";

/**
 * Animated sign-in card — the entry point for unauthenticated visitors.
 * Motion: staggered entrance (motion) + a soft breathing glow behind the
 * duotone tile (react-spring). Reduced motion renders everything at rest.
 */
export function SignInCard({ authEnabled }: { authEnabled: boolean }) {
  const reduced = useReducedMotion();
  const glow = useSpring(
    reduced
      ? { from: { opacity: 0.5 }, to: { opacity: 0.5 } }
      : {
          from: { opacity: 0.35, scale: 1 },
          to: async (next: (v: object) => Promise<void>) => {
            while (true) {
              await next({ opacity: 0.6, scale: 1.08, delay: 1400 });
              await next({ opacity: 0.35, scale: 1, delay: 1400 });
            }
          },
          config: { tension: 40, friction: 16 },
        },
  );

  return (
    <main className="relative mx-auto max-w-lg px-5 py-20 overflow-x-clip">
      {/* theme toggle floats top-right */}
      <div className="fixed top-5 right-5 z-10">
        <ThemeToggle />
      </div>

      {/* breathing accent glow behind the tile */}
      <div className="relative flex justify-center" aria-hidden="true">
        <animated.div
          style={glow}
          className="landing-blob size-40 bg-accent-soft top-[-30px]"
        />
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 18, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 16 }}
          className="relative"
        >
          <DuotoneTile name="history" tile="accent" size={28} />
        </motion.div>
      </div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, type: "spring", stiffness: 110, damping: 18 }}
      >
        <h1 className="font-serif text-4xl text-center mt-8 tracking-tight text-balance">
          Your preparation.
          <br />
          <span className="text-accent">Your space.</span>
        </h1>
      </motion.div>

      <motion.p
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, type: "spring", stiffness: 110, damping: 18 }}
        className="muted text-center mt-4 text-[15px] leading-relaxed"
      >
        Sign in with Google to access your private mocks, progress, and
        settings. One account, one workspace — nothing shared.
      </motion.p>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 110, damping: 18 }}
        className="mt-8 flex justify-center"
      >
        <AuthControl enabled={authEnabled} />
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="mt-12 flex items-center justify-center gap-2 text-xs muted"
      >
        <DuotoneIcon name="shield" size={15} tone="accent" />
        <span>Private by account · Export everything, anytime</span>
      </motion.div>
    </main>
  );
}
