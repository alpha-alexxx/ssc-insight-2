"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Palette × style preference system, orthogonal to next-themes' light/dark.
 *
 * Two data attributes on <html> drive everything through CSS custom
 * properties in globals.css: data-palette (color identity) and data-style
 * (Sera/Vega/Mira geometry, density, motion). The inline script below runs
 * BEFORE paint (same pattern as next-themes), so the first frame is already
 * correct — no flash, and because the attributes are written to <html>
 * outside React, there is no hydration mismatch. Defaults (orange/vega)
 * reproduce the original design exactly, so an absent or invalid stored
 * value is always safe.
 */

export const PALETTE_STORAGE_KEY = "ssc.palette";
export const STYLE_STORAGE_KEY = "ssc.style";

export const PALETTES = [
  {
    id: "orange",
    label: "Terracotta",
    description: "The original warm editorial paper.",
    canvas: "#f4f1e8",
    paper: "#faf8f2",
    accent: "#b65335",
  },
  {
    id: "blue",
    label: "Blue",
    description: "Cool, precise, data-first.",
    canvas: "#eef0f3",
    paper: "#f9fafb",
    accent: "#2563eb",
  },
  {
    id: "lime",
    label: "Lime",
    description: "Fresh, analytical, grounded.",
    canvas: "#f0f2e6",
    paper: "#f9faf2",
    accent: "#4d7c0f",
  },
  {
    id: "violet",
    label: "Violet",
    description: "Sophisticated and modern.",
    canvas: "#f1eff5",
    paper: "#faf9fd",
    accent: "#6d28d8",
  },
  {
    id: "rose",
    label: "Rose",
    description: "Elegant, warm, editorial.",
    canvas: "#f5eff1",
    paper: "#fcf8f9",
    accent: "#be123c",
  },
] as const;

export const STYLES = [
  {
    id: "vega",
    label: "Vega",
    description: "The original editorial ledger: square, quiet, precise.",
  },
  {
    id: "sera",
    label: "Sera",
    description: "Brutal: ink-weight rules, hard offset shadows, decisive.",
  },
  {
    id: "mira",
    label: "Mira",
    description: "Compact: tighter spacing, denser tables, quick feedback.",
  },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];
export type StyleId = (typeof STYLES)[number]["id"];

const PALETTE_IDS = new Map(PALETTES.map((p) => [p.id, true]));
const STYLE_IDS = new Map(STYLES.map((s) => [s.id, true]));

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Preference is non-essential; private modes may refuse writes.
  }
}

/** Runs before paint to set the <html> data attributes — no wrong-theme flash. */
export const THEME_PREFS_SCRIPT = `(function(){var d=document.documentElement;try{var p=localStorage.getItem("${PALETTE_STORAGE_KEY}");if(p==="blue"||p==="lime"||p==="violet"||p==="rose"||p==="orange")d.dataset.palette=p;var s=localStorage.getItem("${STYLE_STORAGE_KEY}");if(s==="sera"||s==="vega"||s==="mira")d.dataset.style=s}catch(e){}})();`;

type ThemePrefs = {
  palette: PaletteId;
  style: StyleId;
  setPalette: (palette: PaletteId) => void;
  setStyle: (style: StyleId) => void;
};

const ThemePrefsContext = createContext<ThemePrefs | null>(null);

// Lazy initializers read the <html> attributes the before-paint script set.
// The provider renders no markup of its own, so there is no hydration
// surface: SSR renders defaults, and the only consumers either render no
// DOM (the shell's transition timing) or gate on mount (AppearancePanel).
function initialPalette(): PaletteId {
  if (typeof document === "undefined") return "orange";
  const value = document.documentElement.dataset.palette as
    | PaletteId
    | undefined;
  return value && PALETTE_IDS.has(value) ? value : "orange";
}
function initialStyle(): StyleId {
  if (typeof document === "undefined") return "vega";
  const value = document.documentElement.dataset.style as StyleId | undefined;
  return value && STYLE_IDS.has(value) ? value : "vega";
}

export function ThemeStyleProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteId>(initialPalette);
  const [style, setStyleState] = useState<StyleId>(initialStyle);

  const setPalette = useCallback((next: PaletteId) => {
    setPaletteState(next);
    document.documentElement.dataset.palette = next;
    persist(PALETTE_STORAGE_KEY, next);
  }, []);
  const setStyle = useCallback((next: StyleId) => {
    setStyleState(next);
    document.documentElement.dataset.style = next;
    persist(STYLE_STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ palette, style, setPalette, setStyle }),
    [palette, style, setPalette, setStyle],
  );
  return (
    <ThemePrefsContext.Provider value={value}>
      {children}
    </ThemePrefsContext.Provider>
  );
}

export function useThemePrefs(): ThemePrefs {
  const ctx = useContext(ThemePrefsContext);
  if (!ctx)
    throw new Error("useThemePrefs must be used inside ThemeStyleProvider");
  return ctx;
}

/** View-transition spec per style: Sera decisive, Vega smooth, Mira quick. */
export function viewTransition(style: StyleId): {
  duration: number;
  ease: "circOut" | "easeOut";
} {
  switch (style) {
    case "sera":
      return { duration: 0.16, ease: "circOut" };
    case "mira":
      return { duration: 0.13, ease: "easeOut" };
    default:
      return { duration: 0.22, ease: "easeOut" };
  }
}
