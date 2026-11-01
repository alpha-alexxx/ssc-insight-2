import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Analytics } from "@/lib/analytics";
import type { DashboardScope, Filters } from "@/lib/domain";

/**
 * Analytics query domain.
 *
 * Analytics has its own analytical scope: platform, tier and date filters
 * drive it, while `type`/`subject`/`search` belong to the paged record lists
 * (their KPI aggregates arrive from the paged endpoint's own stats payload).
 * The scope is what decides whether a saved full mock projects as one result,
 * four subject results or two section results — it is not a record filter.
 */

export const analyticsKeys = {
  all: ["analytics"] as const,
  /**
   * Keyed on the serialized REQUEST, not on the filter object.
   *
   * The two used to disagree: the URL dropped `type`/`subject`/`search` while
   * the key kept them, so two filter objects that produced the identical
   * request occupied two cache entries. Harmless while one surface asked; a
   * correctness problem now that the dashboard and `/performance` ask for
   * different scopes from the same shell state.
   */
  request: (params: string) =>
    [...analyticsKeys.all, "request", params] as const,
};

/**
 * The query string for one analytical request.
 *
 * `examId` is never included: the route sets it from the signed-in user's
 * active exam, so accepting it from the client would be a scope-smuggling
 * path (and ownership is always server-derived).
 */
export function serializeAnalyticsParams(
  scope: DashboardScope,
  filters: Filters,
): string {
  const params = new URLSearchParams();
  // Stable ordering: the serialized string IS the cache key, so two equal
  // filter objects must produce byte-identical URLs.
  const keys = ["platform", "tier", "from", "to"] as const;
  for (const key of keys) {
    const value = filters[key];
    if (value && value !== "all") params.set(key, value);
  }
  params.set("view", scope);
  return params.toString();
}

export function analyticsQueryOptions(
  scope: DashboardScope,
  filters: Filters,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const params = serializeAnalyticsParams(scope, filters);
  return queryOptions({
    queryKey: analyticsKeys.request(params),
    placeholderData: keepPreviousData,
    enabled,
    queryFn: ({ signal }) =>
      api<Analytics>(`/api/analytics?${params}`, { signal }),
  });
}
