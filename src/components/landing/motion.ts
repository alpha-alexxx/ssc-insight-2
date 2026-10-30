/**
 * Shared motion constants for the landing page's JavaScript-driven motion.
 *
 * The CSS side reads the app's own `--ease-out-soft` / `--dur-*` tokens; these
 * exist only for the two places that must animate in JS (the accordion is
 * CSS, but the scope diagram draws SVG paths and the showcase swaps panels).
 * One curve for everything, so the page moves as a single system.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;
