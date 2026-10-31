"use client";
import {
  useQueries,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  attemptDetailQueryOptions,
  attemptListQueryOptions,
  type AttemptListParams,
} from "@/lib/queries/attempts";
import type { Attempt, Filters } from "@/lib/domain";

/**
 * TanStack data layer for the server-paged attempt lists behind /history
 * and /compare. Keys and options live in lib/queries/attempts.ts — the
 * query key carries the full request shape so identical requests
 * deduplicate and repeat pages resolve from cache; obsolete in-flight
 * requests abort the moment the key changes; `keepPreviousData` keeps the
 * previous page visible (dimmed) while the next one loads instead of
 * flashing a skeleton.
 *
 * Search follows the unified contract — a one-character query is too broad
 * to fetch, so it holds until the second character (or clears) — with the
 * shared 350ms debounce on the search value only; the discrete selects and
 * date filter fetch immediately.
 */

export type AttemptPageParams = AttemptListParams & {
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
    ...attemptListQueryOptions({ filters: gated, page, pageSize, sort, dir, withStats }),
    enabled,
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
      ...attemptDetailQueryOptions(id),
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
