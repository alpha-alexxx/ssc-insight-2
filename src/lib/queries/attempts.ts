import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  Attempt,
  Filters,
  PagedAttempts,
  SortKey,
} from "@/lib/domain";

/**
 * Mock-attempt domain keys and query options.
 *
 * Key shape: ["mock-attempts", scope, …] where scope separates the three
 * read shapes — the unfiltered full list (dashboard/calendar/plan lookups),
 * the server-paged lists (/history, /compare), and per-id details (compare
 * hydration, detail dialog). Mutations invalidate exactly the scope they
 * touch: `attemptKeys.all` after a write, `attemptKeys.detail(id)` to drop
 * one record from the cache without refetching anything.
 */

export type AttemptListParams = {
  filters: Filters;
  page: number;
  pageSize: number;
  sort: SortKey;
  dir: "asc" | "desc";
  /** /history requests the whole-filtered-set KPI aggregates. */
  withStats?: boolean;
};

export const attemptKeys = {
  all: ["mock-attempts"] as const,
  /** Unfiltered Attempt[] behind dashboard/calendar/plan consumers. */
  full: () => [...attemptKeys.all, "full"] as const,
  lists: () => [...attemptKeys.all, "list"] as const,
  list: (params: AttemptListParams) => [...attemptKeys.lists(), params] as const,
  details: () => [...attemptKeys.all, "detail"] as const,
  detail: (id: string) => [...attemptKeys.details(), id] as const,
};

export function serializeAttemptListParams(params: AttemptListParams): string {
  const search = new URLSearchParams(
    Object.entries(params.filters).filter(([, v]) => !!v),
  );
  search.set("page", String(params.page));
  search.set("pageSize", String(params.pageSize));
  search.set("sort", params.sort);
  search.set("dir", params.dir);
  if (params.withStats) search.set("stats", "1");
  return search.toString();
}

export function attemptListQueryOptions(params: AttemptListParams) {
  return queryOptions({
    queryKey: attemptKeys.list(params),
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      api<PagedAttempts>(
        `/api/mock-attempts?${serializeAttemptListParams(params)}`,
        { signal },
      ),
  });
}

export const allAttemptsQueryOptions = queryOptions({
  queryKey: attemptKeys.full(),
  staleTime: 30_000,
  queryFn: ({ signal }) => api<Attempt[]>("/api/mock-attempts", { signal }),
});

export function attemptDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: attemptKeys.detail(id),
    enabled: !!id,
    queryFn: ({ signal }) =>
      api<Attempt>(`/api/mock-attempts/${id}`, { signal }),
  });
}

export async function deleteAttemptRequest(id: string) {
  return api(`/api/mock-attempts/${id}`, { method: "DELETE", body: "{}" });
}
