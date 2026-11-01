"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  mirrorsWorkspaceState,
  parseWorkspaceState,
  serializeWorkspaceState,
  type WorkspaceListState,
} from "@/lib/filters-url";
import {
  analyticsKeys,
  analyticsQueryOptions,
} from "@/lib/queries/analytics";
import { allAttemptsQueryOptions, attemptKeys } from "@/lib/queries/attempts";
import { examsKeys } from "@/lib/queries/exams";
import { useExamScope } from "./exam-context";
import type {
  Attempt,
  DashboardScope,
  Filters,
  PageSize,
  SortKey,
} from "@/lib/domain";

/** Stable identity while the query is pending. A fresh `?? []` on every
 * render defeats `memo` on the calendar's grids and the dashboard panels. */
const EMPTY_ATTEMPTS: Attempt[] = [];

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
 *   (use-attempt-list.ts), keyed on this state.
 * - Analytics and the unfiltered attempt list are TanStack queries keyed by
 *   (scope, debounced filters): instant on mount, 350ms behind typing
 *   bursts, superseded requests aborted by the query client, and
 *   `keepPreviousData` holds the previous view visible while a new filter
 *   combination loads instead of flashing a skeleton.
 * - Settings (the target) live in their own query — they change only on
 *   explicit user actions, not on filter changes.
 */
export function useWorkspaceData() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({});
  const [scope, setScope] = useState<DashboardScope>("full");
  // The target is resolved on the server for the tier the workspace is
  // showing, with that tier's own maximum, and delivered with the exam
  // payload. There is no separate settings query any more — one cache means
  // scope and target can never disagree.
  const { activeTarget, activeShape } = useExamScope();
  const target = activeTarget?.marks ?? null;
  const targetMaxScore =
    activeTarget?.maxScore ??
    (activeShape
      ? activeShape.subjects
          .filter((s) => !s.qualifying)
          .reduce((sum, s) => sum + s.questions, 0) *
        activeShape.marking.correct
      : null);
  const [targetInput, setTargetInput] = useState("");

  // Server-paged list state. Each view owns its page; pageSize/sort/dir are
  // shared (sort/dir only have UI on /history; the compare picker stays
  // date-desc). Any filter/sort/size change restarts at page 1. Sort key
  // and direction are one state so the toggle is a single pure update
  // (nested setState inside an updater double-fires under StrictMode).
  const [page, setPage] = useState(1);
  const [comparePage, setComparePage] = useState(1);
  const [pageSize, setPageSizeState] = useState<PageSize>(10);
  const [sortState, setSortState] = useState<{
    key: SortKey;
    dir: "asc" | "desc";
  }>({ key: "date", dir: "desc" });
  const sort = sortState.key;
  const dir = sortState.dir;

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
    setSortState((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : {
            key,
            dir:
              key === "name" || key === "type" || key === "platform"
                ? "asc"
                : "desc",
          },
    );
  }, []);

  const setPageSize = useCallback((size: PageSize) => {
    setPageSizeState(size);
    setPage(1);
    setComparePage(1);
  }, []);

  // Dashboard analytics has its own analytical scope: platform and date
  // filters still drive it, while type/subject/search belong to the paged
  // list views (their KPI aggregates now arrive from the paged endpoint).
  // The debounce is the unified 350ms search debounce; useDebouncedValue
  // seeds instantly, so the first load is not delayed.
  const debouncedFilters = useDebouncedValue(filters, 350);
  const analyticsQuery = useQuery(
    analyticsQueryOptions(scope, debouncedFilters),
  );
  const allAttemptsQuery = useQuery(allAttemptsQueryOptions);
  const analytics = analyticsQuery.data ?? null;
  const allAttempts = allAttemptsQuery.data ?? EMPTY_ATTEMPTS;
  const loading = analyticsQuery.isPending || allAttemptsQuery.isPending;
  const error =
    analyticsQuery.error?.message ?? allAttemptsQuery.error?.message ?? "";

  /** Post-mutation reload for the shell-owned queries (analytics + the
   * unfiltered attempt list). The paged lists and per-id details are
   * invalidated by the callers that know a write happened. */
  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
      queryClient.invalidateQueries({ queryKey: attemptKeys.full() }),
    ]);
  }, [queryClient]);

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

    setScope(state.scope);
    // The one `page` param belongs to the view being restored; sort/dir and
    // the shared pageSize only have meaning on /history.
    if (pathname === "/compare") {
      setComparePage(state.list.page);
      setPageSizeState(state.list.pageSize);
    } else {
      setPage(state.list.page);
      setPageSizeState(state.list.pageSize);
      setSortState({ key: state.list.sort, dir: state.list.dir });
    }

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

  // Seed the input from the cached settings payload whenever it or the
  // active exam changes — on first load, after a switch, and after a backup
  // import applies incoming settings.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTargetInput(target?.toString() ?? "");
  }, [target]);

  // Backup import may apply an incoming target: invalidating the exam
  // payload refetches it, and the seed effect above updates the input.
  const reloadSettings = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: examsKeys.all });
  }, [queryClient]);

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
    targetMaxScore,
    targetInput,
    setTargetInput,
    loading,
    error,
    refresh,
    reloadSettings,
  };
}
