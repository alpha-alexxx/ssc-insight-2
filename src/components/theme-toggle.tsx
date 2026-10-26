"use client";
import { useSyncExternalStore, useCallback } from "react";
import { PlainIcon } from "./icon";

/**
 * Theme toggle for the SSC Insight warm-paper / warm-charcoal palette.
 *
 * - Persists choice to localStorage("ssc.theme")
 * - Falls back to system prefers-color-scheme on first visit
 * - Sets <html data-theme="light|dark"> so globals.css can react
 * - Inline script in layout.tsx applies the persisted choice before paint
 *   to avoid a flash of the wrong theme
 *
 * Uses useSyncExternalStore (the canonical React 19 pattern for external
 * state) so we never call setState inside an effect — the rule we'd otherwise
 * trip over. The "external store" here is the data-theme attribute on <html>.
 */

type Theme = "light" | "dark";

function subscribe(callback: () => void) {
  // The inline script + our own apply() writes data-theme; we also listen
  // for system theme changes when the user hasn't chosen explicitly.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    // Only react to system changes when the user hasn't explicitly chosen.
    if (!localStorage.getItem("ssc.theme")) callback();
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const apply = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("ssc.theme", next);
    } catch {
      // localStorage may be blocked (private mode); theme still applies for
      // this session via the attribute, just doesn't persist.
    }
  }, []);

  const toggle = useCallback(() => {
    apply(theme === "dark" ? "light" : "dark");
  }, [theme, apply]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
      className={`muted hover:text-accent transition-colors inline-flex items-center justify-center size-8 ${className}`}
    >
      <PlainIcon name={theme === "dark" ? "sun" : "moon"} size={17} tone="ink" />
    </button>
  );
}
