"use client";
import { useEffect, useState } from "react";

/**
 * The shared query debounce: the raw value updates on every keystroke while
 * the debounced value (what fetches key off) only moves once typing settles.
 * Search surfaces use 350ms — long enough to skip half-typed queries, short
 * enough to feel instant.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
