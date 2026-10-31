/**
 * Unified-search domain keys. The query text is normalized by the caller
 * (search-core) so identical requests share one cache entry; the limit is
 * part of the key because it shapes every page.
 */

export const searchKeys = {
  all: ["search"] as const,
  page: (q: string, limit: number) => [...searchKeys.all, q, limit] as const,
};
