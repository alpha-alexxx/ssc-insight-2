"use client";

import { useQueryClient } from "@tanstack/react-query";
import { examsKeys } from "@/lib/queries/exams";

/**
 * Settings no longer has its own cache. The workspace scope, the exam
 * catalog, the target envelope and the resolved per-tier targets are ONE
 * server payload (`/api/exams`), read through `examsKeys.current()`.
 *
 * The old parallel `["settings"]` cache held the same scope, so a write to
 * one left the other stale for up to ten minutes. It is gone; every
 * settings surface reads this one.
 */

/** Invalidate the settings/exam payload (backup import, custom-exam CRUD). */
export function useInvalidateSettings() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: examsKeys.all });
}
