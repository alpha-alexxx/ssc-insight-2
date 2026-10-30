import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll reveals — implemented in CSS, with the visible state as the base.
 *
 * The previous landing used Motion's `whileInView` together with
 * `initial={false}`, which starts everything at its animate value, so nothing
 * ever revealed. The obvious fix — an explicit hidden `initial` — introduces
 * the opposite bug: if the observer never fires (no JavaScript, a very tall
 * viewport, a screenshot tool, an interrupted hydration) the section stays
 * invisible, which is far worse than no animation.
 *
 * So this inverts the default. The element is painted and readable at all
 * times; the reveal is an *enhancement* layered on top, and only where the
 * browser supports scroll-driven animations and the reader has not asked for
 * reduced motion. Coverage:
 *
 *  - Chromium / Edge / Safari: `animation-timeline: view()` drives the fade
 *    from the element's own position in the scrollport — no observers, no
 *    JavaScript, no `IntersectionObserver` bookkeeping.
 *  - Firefox (no `view()` timeline yet) and every no-JS case: the base state
 *    wins and the page renders fully visible.
 *  - `prefers-reduced-motion: reduce`: the animation is never applied.
 *
 * `globals.css` owns the keyframes (`.rise`); this module is deliberately a
 * server component so a section's reveal costs zero client JavaScript.
 */

export function Reveal({
  children,
  className,
  /** Travel distance in px. 0 makes it a pure fade. */
  distance = 12,
  /** Extra class names for the wrapper. */
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  as?: "div" | "section" | "figure";
}) {
  const Tag = as;
  return (
    <Tag
      className={cn("rise", className)}
      style={{ "--rise-y": `${distance}px` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
