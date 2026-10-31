import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Analytics } from "@/lib/analytics";
import type { DashboardScope, Filters } from "@/lib/domain";

/**
 * Dashboard analytics domain. Analytics has its own analytical scope:
 * platform and date filters drive it, while type/subject/search belong to
 * the paged list views (their KPI aggregates arrive from the paged
 * endpoint's stats payload).
 */

export const analyticsKeys = {
  all: ["analytics"] as const,
  view: (scope: DashboardScope, filters: Filters) =>
    [...analyticsKeys.all, "view", scope, filters] as const,
};

export function serializeAnalyticsParams(
  scope: DashboardScope,
  filters: Filters,
): string {
  const params = new URLSearchParams(
    Object.entries(filters).filter(
      ([key, value]) =>
        !!value && key !== "type" && key !== "subject" && key !== "search",
    ),
  );
  params.set("view", scope);
  return params.toString();
}

export function analyticsQueryOptions(
  scope: DashboardScope,
  filters: Filters,
) {
  return queryOptions({
    queryKey: analyticsKeys.view(scope, filters),
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      api<Analytics>(
        `/api/analytics?${serializeAnalyticsParams(scope, filters)}`,
        { signal },
      ),
  });
}
