"use client";
import { useEffect, useState } from "react";
import { PlainIcon } from "./icon";
import { istTimeLabel } from "@/lib/format";

/**
 * Live IST clock for the dashboard header. The date already appears in the
 * page meta, so this shows time only — one fact per surface.
 *
 * The next tick is scheduled to the next minute boundary rather than a fixed
 * interval, so the clock never displays a minute that has already passed and
 * does not drift. Renders a placeholder until mounted so server and client
 * markup cannot disagree on the time.
 */
export function DashboardClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      // IST is a whole-minute offset, so the minute turns over with UTC.
      const toNextMinute = 60_000 - (Date.now() % 60_000);
      setTime(istTimeLabel());
      timer = window.setTimeout(tick, toNextMinute + 250);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div
      className="flex min-w-[7.5rem] items-center gap-2 rounded-control border border-rule-soft bg-paper px-2.5 py-1.5 sm:min-w-[8.75rem] sm:gap-2.5 sm:px-3"
      aria-label={`Current time in India Standard Time${time ? `: ${time}` : ""}`}
    >
      <span
        className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent sm:flex"
        aria-hidden="true"
      >
        <PlainIcon name="clock" size={15} />
      </span>
      <span className="min-w-0">
        <span className="block font-serif text-sm leading-tight tabular">
          {time ?? "--:--"}
        </span>
        <span className="block text-[0.625rem] leading-tight text-muted">
          IST
        </span>
      </span>
    </div>
  );
}
