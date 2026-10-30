"use client";
import { useState } from "react";
import { Tabs } from "radix-ui";
import { motion, useReducedMotion } from "motion/react";
import { BrowserFrame, MockupCaption } from "./mockups/browser-frame";
import { CompareScreen } from "./mockups/compare-screen";
import { DashboardScreen } from "./mockups/dashboard-screen";
import { HistoryScreen } from "./mockups/history-screen";
import { PlannerScreen } from "./mockups/planner-screen";
import type { LandingPlanData } from "./plan-facts";
import { EASE } from "./motion";

/**
 * Plate I: the product showcase.
 *
 * The tabs are a printed index, not a segmented control — they sit on the
 * plate above the specimen frame and each one swaps a full rendered screen.
 * Radix supplies the a11y contract (arrow keys, roving tabindex, the right
 * roles); the visual grammar is the landing's own, so the panel reads like
 * turning a page rather than switching a dashboard filter.
 */

type TabId = "dashboard" | "history" | "compare" | "planner";

const TABS: { id: TabId; label: string; url: string; caption: string }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    url: "sscinsight.app/dashboard",
    caption:
      "One account, today's plan and the performance that matters — the divided metric strip, the score band, the trend, the subject radar and the answer breakdown.",
  },
  {
    id: "history",
    label: "History",
    url: "sscinsight.app/history",
    caption:
      "Every saved attempt in one sortable ledger: mock name, type, platform, attempt date, score, accuracy and time taken.",
  },
  {
    id: "compare",
    label: "Compare",
    url: "sscinsight.app/compare",
    caption:
      "Two to four results side by side — score, percentage, accuracy, attempted, time and time per question, with each subject broken out and a difference column.",
  },
  {
    id: "planner",
    label: "Planner",
    url: "sscinsight.app/calendar",
    caption:
      "The 50-day plan as a calendar: every scheduled mock, sectional and topic test on its date, with the selected day's assignments and the four daily habits.",
  },
];

export function Showcase({ plan }: { plan: LandingPlanData }) {
  const [tab, setTab] = useState<TabId>("dashboard");
  const reduced = useReducedMotion();
  const current = TABS.find((item) => item.id === tab) ?? TABS[0]!;

  return (
    <Tabs.Root
      value={tab}
      onValueChange={(value) => setTab(value as TabId)}
      className="relative"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="plate-label">The workspace</p>
          <h2 className="plate-title mt-3">The tracker you sign into.</h2>
          <p className="plate-body mt-4">
            Every screen below is a rendering of the real workspace — drawn
            with the app&apos;s own design tokens and populated with sample
            data. Nothing here is a stock dashboard screenshot.
          </p>
        </div>
        <Tabs.List
          aria-label="Workspace screens"
          className="specimen-tabs shrink-0 self-stretch lg:self-auto"
        >
          {TABS.map((item) => (
            <Tabs.Trigger key={item.id} value={item.id} className="specimen-tab">
              {item.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>

      {TABS.map((item) => (
        <Tabs.Content
          key={item.id}
          value={item.id}
          className="mt-7 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--plate-fg)]"
        >
          <motion.figure
            key={item.id}
            className="m-0"
            initial={
              reduced || tab !== item.id ? false : { opacity: 0, y: 6 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [...EASE] }}
          >
            <BrowserFrame url={item.url}>
              {item.id === "dashboard" ? <DashboardScreen /> : null}
              {item.id === "history" ? <HistoryScreen /> : null}
              {item.id === "compare" ? <CompareScreen /> : null}
              {item.id === "planner" ? <PlannerScreen plan={plan} /> : null}
            </BrowserFrame>
            <MockupCaption>{current.caption}</MockupCaption>
          </motion.figure>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
