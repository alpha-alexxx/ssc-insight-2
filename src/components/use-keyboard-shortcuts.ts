"use client";
import { useEffect } from "react";

/**
 * Global keyboard shortcuts for SSC Insight.
 *
 * - `n`         Add a new mock
 * - `g d`        Go to Dashboard
 * - `g h`        Go to Mock history
 * - `g c`        Go to Compare
 * - `g s`        Go to Settings
 * - `/`          Focus the first visible filter input (mock history search)
 * - `?`          Show keyboard shortcuts help (delegates to a custom event)
 * - `Esc`        Close any open dialog / clear shortcuts sequence
 *
 * Shortcuts are disabled while typing in any input, textarea, or contentEditable.
 * The two-key `g <x>` sequence waits 800ms for the second key.
 */

type Handlers = {
  onAddMock: () => void;
  onNavigate: (view: "dashboard" | "history" | "compare" | "settings") => void;
  onShowHelp?: () => void;
};

export function useKeyboardShortcuts(handlers: Handlers) {
  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
        return true;
      return target.isContentEditable;
    }

    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) {
        // Escape should still bubble out of inputs.
        if (event.key !== "Escape") return;
      }
      if (event.key === "Escape") {
        gPressed = false;
        if (gTimer) clearTimeout(gTimer);
        return;
      }

      // Two-key sequence `g <x>`.
      if (gPressed) {
        gPressed = false;
        if (gTimer) {
          clearTimeout(gTimer);
          gTimer = null;
        }
        if (event.key === "d") {
          event.preventDefault();
          handlers.onNavigate("dashboard");
        } else if (event.key === "h") {
          event.preventDefault();
          handlers.onNavigate("history");
        } else if (event.key === "c") {
          event.preventDefault();
          handlers.onNavigate("compare");
        } else if (event.key === "s") {
          event.preventDefault();
          handlers.onNavigate("settings");
        }
        return;
      }

      if (event.key === "g") {
        gPressed = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => {
          gPressed = false;
        }, 800);
        return;
      }

      if (event.key === "n") {
        event.preventDefault();
        handlers.onAddMock();
      } else if (event.key === "/") {
        event.preventDefault();
        const filter = document.querySelector<HTMLInputElement>(
          'input[aria-label*="earch" i], input[placeholder*="earch" i]',
        );
        filter?.focus();
      } else if (event.key === "?") {
        event.preventDefault();
        handlers.onShowHelp?.();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [handlers]);
}
