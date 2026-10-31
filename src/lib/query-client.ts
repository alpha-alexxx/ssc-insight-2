import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";

/**
 * Central TanStack Query factory — the only place a QueryClient is built.
 *
 * Lifecycle: the browser gets one singleton per page load; the server (if a
 * future Server Component ever prefetches) gets a fresh client per call so
 * user data and in-flight requests can never leak across requests or users.
 * The workspace mounts the browser client once in QueryProvider and unmounts
 * it on logout, which drops the whole cache with the session.
 *
 * Policies (docs/caching.md carries the full per-resource matrix):
 * - In-memory only. Nothing persists across reloads; gcTime reaps unused
 *   entries five minutes after their last observer.
 * - No refetchOnWindowFocus: this is a personal tracker, not a dashboard —
 *   explicit invalidations after mutations keep data fresh.
 * - Auth/validation failures and aborted requests never retry; other errors
 *   retry once, and a 429 waits out the server's Retry-After before trying.
 */

/** Statuses that mean "asking again will return the same answer": auth,
 * permissions, missing records, and validation. Retry only helps transient
 * failures (network blips, 5xx, rate limits). */
const NO_RETRY_STATUSES = new Set([400, 401, 403, 404, 413, 415, 422]);

function shouldRetry(failureCount: number, error: unknown): boolean {
  // One retry, matching the previous QueryClient's `retry: 1`.
  if (failureCount >= 1) return false;
  if (error instanceof ApiError) {
    if (NO_RETRY_STATUSES.has(error.status)) return false;
  }
  if (error instanceof Error && error.name === "AbortError") return false;
  return true;
}

function retryDelay(failureCount: number, error: unknown): number {
  if (error instanceof ApiError && error.retryAfterSeconds)
    return Math.min(error.retryAfterSeconds * 1000, 30_000);
  return Math.min(1000 * 2 ** failureCount, 30_000);
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: shouldRetry,
        retryDelay,
      },
      // Mutations are user-initiated actions (often writes against the
      // 20/30s limiter); the UI surfaces failures and the user retries.
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
