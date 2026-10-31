"use client";
import {
  keepPreviousData,
  useQueries,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api } from "@/lib/api-client";
import type {
  Attempt,
  Filters,
  PagedAttempts,
  SortKey,
} from "@/lib/domain";

/**
 * TanStack data layer for the server-paged attempt lists behind /history
 * and /compare. Mirrors the search half's conventions: the query key
 * carries the full request shape so identical requests deduplicate and
 * repeat pages resolve from cache; obsolete in-flight requests abort the
 * moment the key changes; `keepPreviousData` keeps the previous page
 * visible (dimmed) while the next one loads instead of flashing a skeleton.
 *
 * Search follows the unified contract — a one-character query is too broad
 * to fetch, so it holds until the second character (or clears) — with the
 * shared 350ms debounce on the search value only; the discrete selects and
 * date filter fetch immediately.
 */

export type AttemptPageParams = {
  filters: Filters;
  page: number;
  pageSize: number;
  sort: SortKey;
  dir: "asc" | "desc";
  /** /history requests the whole-filtered-set KPI aggregates. */
  withStats?: boolean;
  /** Only fetch while the owning view is active. */
  enabled?: boolean;
};

export function useAttemptPage({
  filters,
  page,
  pageSize,
  sort,
  dir,
  withStats,
  enabled = true,
}: AttemptPageParams) {
  const debouncedSearch = useDebouncedValue(filters.search ?? "", 350);
  const gated: Filters = {
    ...filters,
    search: debouncedSearch.length >= 2 ? debouncedSearch : "",
  };
  return useQuery({
    queryKey: ["mock-attempts", gated, page, pageSize, sort, dir, !!withStats],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => {
      const params = new URLSearchParams(
        Object.entries(gated).filter(([, v]) => !!v),
      );
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("sort", sort);
      params.set("dir", dir);
      if (withStats) params.set("stats", "1");
      return api<PagedAttempts>(`/api/mock-attempts?${params}`, { signal });
    },
  });
}

/**
 * Full attempt objects for the compare selection. Selections can come from
 * any view (detail dialog "Compare", another picker page), so the ledger
 * hydrates per id through the existing detail endpoint instead of assuming
 * the selected rows are on the current picker page. Max four ids, cached.
 */
export function useAttemptsByIds(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["mock-attempt", id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api<Attempt>(`/api/mock-attempts/${id}`, { signal }),
      enabled: !!id,
    })),
  });
}

/** Resolved attempts for the selection, in selection order (404s from
 * deleted attempts drop out). */
export function collectSelectedAttempts(
  results: UseQueryResult<Attempt, Error>[],
): Attempt[] {
  return results
    .map((result) => result.data)
    .filter((a): a is Attempt => !!a);
}
