"use client";
import type { ComponentProps, ReactNode } from "react";

/**
 * Panel chrome shared by the month, week, day and agenda surfaces: a title, an
 * optional context line, and the period controls. `.section-head` stacks the
 * title above the controls below `lg`, which is what keeps the toolbar from
 * squeezing the period name at phone widths.
 */
export function CalendarSurface({
  title,
  meta,
  nav,
  children,
  live,
  touchHandlers,
}: {
  title: ReactNode;
  meta?: ReactNode;
  nav?: ReactNode;
  children: ReactNode;
  /** Announce period changes to a screen reader (set on the title only). */
  live?: boolean;
  /** Touch handlers for swipe period navigation on the surface body. */
  touchHandlers?: Pick<ComponentProps<"div">, "onTouchStart" | "onTouchEnd">;
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
        {nav && (
          <div
            role="group"
            aria-label="Change period"
            className="flex flex-wrap items-center gap-2"
          >
            {nav}
          </div>
        )}
      </div>
      <div className="px-4 pb-4 pt-3 sm:px-6" {...touchHandlers}>
        {children}
      </div>
    </section>
  );
}
