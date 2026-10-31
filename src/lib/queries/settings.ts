import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/**
 * Settings domain: the workspace scope — active exam, enabled exams, and
 * one target score per exam (against that exam's primary tier maximum).
 * One resource, one key; the mutation writes the fresh value into the
 * cache, so reads never need background refetching.
 */

export type TrackerSettings = {
  activeExamId: string;
  /** Tier id of the active exam, or "all" for the combined view. */
  activeTierId: string;
  /** Enabled selectable tiers as "examId:tierId" keys. */
  enabledTiers: string[];
  examTargets: Record<string, number | null>;
};

export const settingsKeys = {
  all: ["settings"] as const,
  current: () => [...settingsKeys.all, "current"] as const,
};

export const settingsQueryOptions = queryOptions({
  queryKey: settingsKeys.current(),
  staleTime: 10 * 60_000,
  queryFn: ({ signal }) => api<TrackerSettings>("/api/settings", { signal }),
});

export async function updateSettingsRequest(settings: TrackerSettings) {
  return api<TrackerSettings>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
