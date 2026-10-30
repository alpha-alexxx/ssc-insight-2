"use client";
import type { ComponentProps, ReactNode } from "react";

/**
 * Panel chrome shared by the month, week, day and agenda surfaces: a period
 * title and a context line. All period controls live in the page-level
 * calendar toolbar (calendar-view.tsx), so this head answers "what am I
 * looking at" while the toolbar answers "how do I move" — one control cluster
 * per question. `flush` removes the body's horizontal padding for surfaces
 * whose rows carry their own (the day view's full-width task rows).
 */
export function CalendarSurface({
  title,
  meta,
  children,
  live,
  touchHandlers,
  flush,
}: {
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  /** Announce period changes to a screen reader (set on the title only). */
  live?: boolean;
  /** Touch handlers for swipe period navigation on the surface body. */
  touchHandlers?: Pick<ComponentProps<"div">, "onTouchStart" | "onTouchEnd">;
  /** Drop the body's horizontal padding so row padding can own the gutters. */
  flush?: boolean;
}) {
  return (
    <section className="panel">
      <div className="section-head border-b border-rule-soft px-4 pb-3 pt-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="panel-title" aria-live={live ? "polite" : undefined}>
            {title}
          </h2>
          {meta && <p className="mt-1 text-[11px] text-muted">{meta}</p>}
        </div>
      </div>
      <div
        className={flush ? "pb-4 pt-3" : "px-4 pb-4 pt-3 sm:px-6"}
        {...touchHandlers}
      >
        {children}
      </div>
    </section>
  );
}
