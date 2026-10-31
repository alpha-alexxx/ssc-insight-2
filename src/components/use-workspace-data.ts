"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import {
  mirrorsWorkspaceState,
  parseWorkspaceState,
  serializeWorkspaceState,
  type WorkspaceListState,
} from "@/lib/filters-url";
import type { Analytics } from "@/lib/analytics";
import type { Attempt } from "@/lib/domain";
import type { DashboardScope, Filters, PageSize, SortKey } from "@/lib/domain";

/**
 * Workspace data layer: persisted-record filters, the dashboard scope, the
 * analytics/unfiltered-attempts payloads behind them, the user's target,
 * and the server-paged list state (page/pageSize/sort/dir) for /history and
 * /compare.
 *
 * Ownership:
 * - filters/scope and the list state live here; the URL mirrors them via
 *   history.replaceState (see lib/filters-url.ts) so views stay shareable
 *   without RSC round-trips.
 * - The paged list itself is fetched through TanStack Query
 *   (use-attempt-list.ts), keyed on this state; this hook keeps the
 *   unfiltered attempt list (dashboard/calendar/plan/add consumers) and
 *   analytics.
 * - A new refresh aborts the previous one's network work, not just its
 *   state application, and settings load once (they change only on explicit
 *   user actions, not on filter changes).
 */
export function useWorkspaceData() {
  const pathname = usePathname();
  const [filters, setFilters] = useState<Filters>({});
  const [scope, setScope] = useState<DashboardScope>("full");
  const [allAttempts, setAllAttempts] = useState<Attempt[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [targetInput, setTargetInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Server-paged list state. Each view owns its page; pageSize/sort/dir are
  // shared (sort/dir only have UI on /history; the compare picker stays
  // date-desc). Any filter/sort/size change restarts at page 1.
  const [page, setPage] = useState(1);
  const [comparePage, setComparePage] = useState(1);
  const [pageSize, setPageSizeState] = useState<PageSize>(10);
  const [sort, setSortState] = useState<SortKey>("date");
  const [dir, setDirState] = useState<"asc" | "desc">("desc");

  /** Every filter write resets the paged lists — results moved, so a stale
   * page number could point past the end. */
  const updateFilters = useCallback((updater: (prev: Filters) => Filters) => {
    setFilters(updater);
    setPage(1);
    setComparePage(1);
  }, []);

  /** Column-sort toggle with the historical defaults: same key flips the
   * direction; a new key starts asc for text columns, desc otherwise. */
  const changeSort = useCallback((key: SortKey) => {
    setPage(1);
    setSortState((prev) => {
      if (prev === key) {
        setDirState((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setDirState(
        key === "name" || key === "type" || key === "platform"
          ? "asc"
          : "desc",
      );
      return key;
    });
  }, []);

  const setPageSize = useCallback((size: PageSize) => {
    setPageSizeState(size);
    setPage(1);
    setComparePage(1);
  }, []);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setLoading(true);
    setError("");
    // Dashboard analytics has its own analytical scope: platform and date
    // filters still drive it, while type/subject/search belong to the paged
    // list views (their KPI aggregates now arrive from the paged endpoint).
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
      const [stats, all] = await Promise.all([
        api<Analytics>(`/api/analytics?${analyticsQuery}`, {
          signal: abort.signal,
        }),
        api<Attempt[]>("/api/mock-attempts", { signal: abort.signal }),
      ]);
      if (id !== requestId.current) return;
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

  // The first load is instant; filter churn (typing included) settles for
  // 350ms before a request fires — the unified search debounce.
  const mountedRef = useRef(false);
  useEffect(() => {
    const delay = mountedRef.current ? 350 : 0;
    mountedRef.current = true;
    const timer = setTimeout(() => void refresh(), delay);
    return () => clearTimeout(timer);
  }, [refresh]);
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  // Restore the shareable URL state (filters, scope, list paging) whenever
  // the view changes — the shell persists across client-side navigation, so
  // a palette/programmatic handoff like /history?search=…&page=3 would
  // otherwise be stripped by the mirror effect below. Declared before the
  // mirror effect so a deep link's query is read before anything writes
  // back. Synchronous setState is the point here: this is the sync with an
  // external system (the address bar) that React's effect rules carve out.
  const [urlReady, setUrlReady] = useState(false);
  useEffect(() => {
    const state = parseWorkspaceState(window.location.search);
    // Post-hydration / post-navigation restore of external (address bar)
    // state; the setState must land before the debounced refresh reads
    // `filters`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(state.filters);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScope(state.scope);
    // The one `page` param belongs to the view being restored; sort/dir and
    // the shared pageSize only have meaning on /history.
    if (pathname === "/compare") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setComparePage(state.list.page);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPageSizeState(state.list.pageSize);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPage(state.list.page);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPageSizeState(state.list.pageSize);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSortState(state.list.sort);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDirState(state.list.dir);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrlReady(true);
  }, [pathname]);
  // Keep the address bar in step with the workspace state. replaceState
  // (not router navigation) so typing never triggers RSC round-trips or
  // spams history; reloads and shared links reconstruct the state from it.
  useEffect(() => {
    if (!urlReady) return;
    // Planner and Add Mock routes carry their own query context (`date`,
    // `task`, `returnTo`); rewriting them with the filter mirror would strip
    // that context. Only the views that actually consume filters/scope own
    // the address bar.
    if (!mirrorsWorkspaceState(pathname)) return;
    const list: WorkspaceListState = {
      page: pathname === "/compare" ? comparePage : page,
      pageSize,
      sort,
      dir,
    };
    const url = serializeWorkspaceState(pathname, { filters, scope, list });
    if (window.location.pathname + window.location.search !== url)
      window.history.replaceState(null, "", url);
  }, [
    pathname,
    filters,
    scope,
    urlReady,
    page,
    comparePage,
    pageSize,
    sort,
    dir,
  ]);

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
    updateFilters,
    scope,
    setScope,
    allAttempts,
    analytics,
    page,
    setPage,
    comparePage,
    setComparePage,
    pageSize,
    setPageSize,
    sort,
    dir,
    changeSort,
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
