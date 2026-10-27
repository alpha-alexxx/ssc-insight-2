"use client";
import { useEffect, useRef, useState } from "react";

/** The visual viewport shrinks when a mobile keyboard overlays the layout viewport. */
export function useOverlayViewport(open: boolean) {
  const [viewport, setViewport] = useState<{
    height: number;
    top: number;
  } | null>(null);
  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => setViewport({ height: vv.height, top: vv.offsetTop });
    const frame = requestAnimationFrame(update);
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);
  return viewport;
}

/** Imperatively opened Radix dialogs have no Trigger ref to restore focus to. */
export function useOverlayFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      opener.current = document.activeElement as HTMLElement | null;
    },
    onCloseAutoFocus: (event: Event) => {
      if (opener.current?.isConnected) {
        event.preventDefault();
        opener.current.focus();
      }
    },
  };
}
