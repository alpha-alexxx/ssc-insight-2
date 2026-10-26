"use client";
import { useCallback } from "react";
import { useTheme } from "next-themes";
import { PlainIcon } from "./icon";

/**
 * Theme toggle for the SSC Insight warm-paper / warm-charcoal palette.
 *
 * Wired to next-themes (the shadcn/ui dark-mode mechanism): the provider in
 * layout.tsx owns persistence (localStorage "ssc.theme") and applies the
 * resolved theme to <html class> before paint, so this component only reads
 * and writes through useTheme — no manual DOM attributes or external store.
 *
 * Both icons render and CSS picks the visible one via the `dark:` variant
 * (globals.css maps it to the `.dark` class). No mounted-gate, no hydration
 * mismatch, and the correct icon is in the first painted frame. Like the
 * shadcn docs' simple toggle, the label is static for the same reason.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className={`muted hover:text-accent transition-colors inline-flex items-center justify-center size-8 ${className}`}
    >
      <PlainIcon name="moon" size={17} tone="ink" className="dark:hidden" />
      <PlainIcon name="sun" size={17} tone="ink" className="hidden dark:block" />
    </button>
  );
}
