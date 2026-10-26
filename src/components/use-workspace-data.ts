"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import {
  parseWorkspaceState,
  serializeWorkspaceState,
} from "@/lib/filters-url";
import type { Analytics } from "@/lib/analytics";
import type { Attempt } from "@/lib/domain";
import type { DashboardScope, Filters } from "@/lib/domain";

/**
 * Workspace data layer: persisted-record filters, the dashboard scope, the
 * attempts/analytics payloads behind them, and the user's target.
 *
 * Ownership:
 * - filters/scope live here; the URL mirrors them via history.replaceState
 *   (see lib/filters-url.ts) so views stay shareable without RSC round-trips.
 * - One refresh covers filtered attempts, analytics, and the unfiltered
 *   list; the two attempt fetches share one request while no filter is set.
 * - A new refresh aborts the previous one's network work, not just its state
 *   application, and settings load once (they change only on explicit
 *   user actions, not on filter changes).
 */
export function useWorkspaceData() {
  const pathname = usePathname();
  const [filters, setFilters] = useState<Filters>({});
  const [scope, setScope] = useState<DashboardScope>("full");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [allAttempts, setAllAttempts] = useState<Attempt[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [targetInput, setTargetInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setLoading(true);
    setError("");
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => !!v),
    );
    // Dashboard analytics has its own analytical scope. Persisted type and
    // subject filters still drive Mock history and Compare.
    const analyticsQuery = new URLSearchParams(
      Object.entries(filters).filter(
        ([key, value]) =>
          !!value &&
          key !== "type" &&
          key !== "subject" &&
          key !== "search",
      ),
    );
    analyticsQuery.set("view", scope);
    try {
      const allPromise = api<Attempt[]>("/api/mock-attempts", { signal: abort.signal });
      // With no filters active the filtered list is the unfiltered list —
      // share one request instead of fetching the same payload twice.
      const filteredPromise: Promise<Attempt[]> = Object.values(filters).some(
        Boolean,
      )
        ? api<Attempt[]>(`/api/mock-attempts?${query}`, { signal: abort.signal })
        : allPromise;
      const [rows, stats, all] = await Promise.all([
        filteredPromise,
        api<Analytics>(`/api/analytics?${analyticsQuery}`, {
          signal: abort.signal,
        }),
        allPromise,
      ]);
      if (id !== requestId.current) return;
      setAttempts(rows);
      setAnalytics(stats);
      setAllAttempts(all);
    } catch (e) {
      // A superseded refresh was aborted on purpose; only real failures of
      // the current request surface as errors.
      if (abort.signal.aborted || id !== requestId.current) return;
      setError(e instanceof Error ? e.message : "Could not load data");
    } finally {
      if (id === requestId.current && !abort.signal.aborted)
        setLoading(false);
    }
  }, [filters, scope]);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 150);
    return () => clearTimeout(timer);
  }, [refresh]);
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  // Restore the shareable URL state (filters + scope) once after hydration —
  // declared before the mirror effect so a deep link's query is read before
  // anything writes back. It also runs before the refresh debounce fires, so
  // the first fetch already uses the restored filters. Synchronous setState
  // is the point here: this is the one-shot sync with an external system
  // (the address bar) that React's effect rules carve out, and it must land
  // before the debounced refresh reads `filters`.
  const [urlReady, setUrlReady] = useState(false);
  useEffect(() => {
    const state = parseWorkspaceState(window.location.search);
    // One-shot post-hydration restore of external (address bar) state; the
    // setState must land before the debounced refresh reads `filters`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(state.filters);
    setScope(state.scope);
    setUrlReady(true);
  }, []);
  // Keep the address bar in step with the workspace state. replaceState
  // (not router navigation) so typing never triggers RSC round-trips or
  // spams history; reloads and shared links reconstruct the state from it.
  useEffect(() => {
    if (!urlReady) return;
    const url = serializeWorkspaceState(pathname, { filters, scope });
    if (window.location.pathname + window.location.search !== url)
      window.history.replaceState(null, "", url);
  }, [pathname, filters, scope, urlReady]);

  // Settings (the target) change only through explicit user actions, so they
  // load once on mount and after import/save — not on every data refresh.
  const loadSettings = useCallback(async () => {
    try {
      const settings = await api<{ targetScore: number | null }>(
        "/api/settings",
      );
      setTarget(settings.targetScore);
      setTargetInput(settings.targetScore?.toString() ?? "");
    } catch {
      // Non-critical: the target panel falls back to "Not set".
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    api<{ targetScore: number | null }>("/api/settings")
      .then((settings) => {
        if (cancelled) return;
        setTarget(settings.targetScore);
        setTargetInput(settings.targetScore?.toString() ?? "");
      })
      .catch(() => {
        // Non-critical: the target panel falls back to "Not set".
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    filters,
    setFilters,
    scope,
    setScope,
    attempts,
    allAttempts,
    analytics,
    target,
    setTarget,
    targetInput,
    setTargetInput,
    loading,
    error,
    refresh,
    loadSettings,
  };
}
