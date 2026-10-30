"use client";
import { useRef } from "react";

/**
 * Horizontal swipe detection for period navigation on touch devices. A swipe
 * only counts when the gesture is decisively horizontal — |dx| past a
 * threshold and at least twice |dy| — so scrolling the page or the month list
 * vertically never fires it. Fires once per completed touch; attach the
 * returned handlers alongside any existing touch handling.
 */
export function useHorizontalSwipe(onSwipe: (direction: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    // Gestures starting in form fields (text selection, caret moves in the
    // notes/result editors) never navigate — a horizontal drag there is
    // editing, not paging.
    const target = event.target as HTMLElement | null;
    if (target?.closest?.("input, textarea, select, [contenteditable='true']"))
      return;
    if (touch) start.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const origin = start.current;
    start.current = null;
    if (!origin) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - origin.x;
    const dy = touch.clientY - origin.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 2) return;
    onSwipe(dx < 0 ? 1 : -1);
  };

  return { onTouchStart, onTouchEnd };
}
