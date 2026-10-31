import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PlanPayload, PlanTaskView } from "@/lib/plan/view-model";

/**
 * Study-plan domain: the static 50-day plan merged with per-user progress.
 * One cache entry; every mutation patches it optimistically and only
 * refetches on failure, so the calendar, day flow, and dashboard sections
 * read one authoritative copy.
 */

/** Mutable per-task progress fields (the plan content itself is static). */
export type TaskPatchInput = Partial<
  Pick<
    PlanTaskView,
    | "completed"
    | "score"
    | "percentile"
    | "wrong"
    | "unattempted"
    | "rev1"
    | "rev2"
    | "rev3"
    | "notes"
  >
>;

export type PlanProgressInput =
  | { kind: "task"; key: string; patch: TaskPatchInput }
  | { kind: "checklist"; day: number; itemId: string; done: boolean }
  | { kind: "revision"; day: number; revisionIndex: number; done: boolean }
  | { kind: "day-notes"; day: number; notes: string };

/** GET /api/plan payload: the merged plan plus today's IST date. */
export type PlanPayloadWithToday = PlanPayload & { today: string };

export const planKeys = {
  all: ["plan"] as const,
  current: () => [...planKeys.all, "current"] as const,
};

export const planQueryOptions = queryOptions({
  queryKey: planKeys.current(),
  // Progress writes go through optimistic cache patches, so the payload
  // stays fresh without polling; the long staleTime just prevents a
  // pointless refetch if the shell ever remounts the query.
  staleTime: 10 * 60_000,
  queryFn: ({ signal }) => api<PlanPayloadWithToday>("/api/plan", { signal }),
});

export function postPlanProgress(input: PlanProgressInput) {
  return api("/api/plan/progress", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
