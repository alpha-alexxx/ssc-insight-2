import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/**
 * Settings domain: the tracker's per-user settings (currently the target
 * score). One resource, one key; the mutation writes the fresh value into
 * the cache, so reads never need background refetching.
 */

export type TrackerSettings = { targetScore: number | null };

export const settingsKeys = {
  all: ["settings"] as const,
  current: () => [...settingsKeys.all, "current"] as const,
};

export const settingsQueryOptions = queryOptions({
  queryKey: settingsKeys.current(),
  staleTime: 10 * 60_000,
  queryFn: ({ signal }) => api<TrackerSettings>("/api/settings", { signal }),
});

export async function updateSettingsRequest(targetScore: number | null) {
  return api<TrackerSettings>("/api/settings", {
    method: "PUT",
    body: JSON.stringify({ targetScore }),
  });
}
