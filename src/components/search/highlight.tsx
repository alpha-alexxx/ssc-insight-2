"use client";
import { Fragment } from "react";

/**
 * Marks the query's occurrences inside a result title — the search-affordance
 * contract: the reader sees *why* this row matched. Token-safe (accent-soft
 * wash, ink text) and case-insensitive; the query is normalized upstream so
 * whitespace quirks never split the pattern.
 */
export function Highlight({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const pattern = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${pattern})`, "ig"));
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === needle.toLowerCase() ? (
          <mark key={index} className="search-mark">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
