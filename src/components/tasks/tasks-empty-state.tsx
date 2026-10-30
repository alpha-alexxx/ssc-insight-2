"use client";

import type { ReactNode } from "react";

/**
 * Per-view empty states. Words do the work: each one names the situation and
 * offers the next action instead of decorating an empty box.
 */
export function TasksEmptyState({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-y border-rule-soft px-4 py-10 text-center">
      <h3 className="font-serif text-lg">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted">
        {detail}
      </p>
      {children && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>
      )}
    </div>
  );
}
