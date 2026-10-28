"use client";
import { useEffect, useState } from "react";
import { PlainIcon } from "./icon";
import { longDate } from "@/lib/format";
import { istTodayIso } from "@/lib/plan/view-model";

/**
 * Live IST clock for the dashboard header. Renders a placeholder until
 * mounted so the server and client never disagree on the time.
 */
export function DashboardClock() {
  const [now, setNow] = useState<{ time: string; date: string } | null>(null);
  useEffect(() => {
    const tick = () => {
      setNow({
        time: new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(new Date()),
        date: longDate(istTodayIso()),
      });
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div
      className="flex items-center gap-2.5 rounded-control border border-rule-soft bg-paper px-3 py-1.5"
      aria-label={`Current time in India Standard Time${now ? `: ${now.time}` : ""}`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <PlainIcon name="clock" size={15} />
      </span>
      <span className="min-w-0">
        <span className="block font-serif text-sm leading-tight tabular">
          {now?.time ?? "--:--"}
        </span>
        <span className="block text-[10px] leading-tight text-muted">
          {now?.date ?? ""}
        </span>
      </span>
    </div>
  );
}
