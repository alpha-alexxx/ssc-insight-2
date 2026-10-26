"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Landing } from "./landing";
import { PrivateWorkspace } from "./private-workspace";

/**
 * Decides what a signed-in user sees at "/":
 *
 *  - First visit in this tab session → the animated landing page, with a
 *    CTA that transitions into the workspace.
 *  - Every visit after that (same tab) → straight to the dashboard.
 *
 * The flag lives in sessionStorage (not localStorage): a fresh tab gives you
 * the welcome moment again, but reloading never interrupts mid-work.
 *
 * Render phases: the server and the first client render agree on "checking",
 * then a deferred effect reads sessionStorage and swaps — the same deferred
 * pattern PrivateWorkspace uses, so there is no hydration mismatch.
 */

type Phase = "checking" | "landing" | "app";

const FLAG = "ssc.landing.seen";

export function WorkspaceEntry({
  userId,
  userName,
}: {
  userId: string;
  userName?: string;
}) {
  const [phase, setPhase] = useState<Phase>("checking");
  const reduced = useReducedMotion();

  useEffect(() => {
    // Deferred to a macrotask: no synchronous setState inside the effect
    // body, and sessionStorage is guaranteed available in the browser phase.
    const id = setTimeout(() => {
      let seen = false;
      try {
        seen = sessionStorage.getItem(FLAG) === "1";
      } catch {
        seen = false; // Storage blocked → show the landing once per load.
      }
      setPhase(seen ? "app" : "landing");
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const enterWorkspace = useCallback(() => {
    try {
      sessionStorage.setItem(FLAG, "1");
    } catch {
      // Storage blocked; the in-memory phase switch still works.
    }
    setPhase("app");
  }, []);

  if (phase === "checking") {
    return (
      <p role="status" className="p-8 muted">
        Checking your session…
      </p>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {phase === "landing" ? (
        <motion.div
          key="landing"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0, y: -18, scale: 0.99 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <Landing onEnter={enterWorkspace} userName={userName} />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <PrivateWorkspace key={userId} userId={userId} userName={userName} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
