"use client";
import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { normalizeSearchQuery, SEARCH_QUERY_MIN } from "@/lib/search-core";
import type { SearchResponse, SearchResultItem } from "@/lib/search";

/**
 * The client half of the unified search system, on TanStack Query. The query
 * key is the normalized query, so identical requests deduplicate and repeat
 * queries resolve from cache; obsolete in-flight requests are aborted by the
 * query client the moment the key changes, so a slow response can never
 * overwrite a newer one; `keepPreviousData` keeps the previous page visible
 * (dimmed) while a new query loads instead of flashing a skeleton.
 */

/** A flattened result with its originating page, for load-more merging. */
export type SearchHit = SearchResultItem;


export type UseSearchOptions = {
  /** Raw input value; normalized + debounced by the caller. */
  query: string;
  /** Only fetch while the palette is open. */
  enabled: boolean;
  limit?: number;
};

export function normalizeForSearch(raw: string): string {
  return normalizeSearchQuery(raw);
}

export function searchIsReady(raw: string): boolean {
  return normalizeSearchQuery(raw).length >= SEARCH_QUERY_MIN;
}

type SearchPage = SearchResponse & { nextCursor?: string };

export function useSearch({ query, enabled, limit = 15 }: UseSearchOptions) {
  const q = normalizeSearchQuery(query);
  const ready = q.length >= SEARCH_QUERY_MIN;

  return useInfiniteQuery({
    queryKey: ["search", q, limit],
    enabled: enabled && ready,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ q, limit: String(limit) });
      if (pageParam) params.set("cursor", pageParam);
      return api<SearchPage>(`/api/search?${params}`, { signal });
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** Results from all loaded pages, grouped by type in server relevance order —
 *  the palette renders one cmdk group per type. */
export function collectResultsByType(
  pages: SearchPage[] | undefined,
): Record<"attempts" | "tasks" | "groups" | "plan", SearchResultItem[]> {
  const out: Record<"attempts" | "tasks" | "groups" | "plan", SearchResultItem[]> = {
    attempts: [],
    tasks: [],
    groups: [],
    plan: [],
  };
  for (const page of pages ?? []) {
    for (const type of ["attempts", "tasks", "groups", "plan"] as const) {
      out[type].push(...(page.results[type]?.items ?? []));
    }
  }
  return out;
}

export function searchHasMore(pages: SearchPage[] | undefined): boolean {
  const last = pages?.[pages.length - 1];
  return last?.nextCursor != null;
}
