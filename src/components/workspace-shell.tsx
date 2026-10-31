"use client";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "motion/react";
import { PlainIcon, DuotoneTile } from "./icon";
import { DashboardClock } from "./dashboard-clock";
import { CommandPalette } from "./command-palette";
import { AppFrame, VIEW_HREF, VIEW_META, type AppView } from "./app-shell";
import { CompareView } from "./compare-view";
import { DateRangeFilter } from "./date-range-filter";
import { HistoryPanel } from "./history-panel";
import { MockDetailDialog } from "./mock-detail-dialog";
import { AddMockView } from "./add-mock-view";
import { DashboardView } from "./dashboard-view";
import { AiCoachCard } from "./ai-coach-card";
import { AiChatSheet, type LogMockPayload } from "./ai-chat-sheet";
import { PageHeader } from "./page-header";
import { QueryProvider } from "./query-provider";
import { useAiWorkspace } from "./use-ai-workspace";
import { useBackupImport } from "./use-backup-import";
import {
  collectSelectedAttempts,
  useAttemptPage,
  useAttemptsByIds,
} from "./use-attempt-list";
import { useWorkspaceData } from "./use-workspace-data";
import { usePlanData } from "./use-plan-data";
import { MyTasksView } from "./tasks/my-tasks-view";
import { useInvalidateTodos } from "./use-todos-data";
import { planKeys } from "@/lib/queries/plan";
import { CalendarView } from "./plan/calendar-view";
import { PlanDayView } from "./plan/plan-day-view";
import { SettingsPanels } from "./settings-panels";
import { ToastProvider, useToast } from "./toast";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { useThemePrefs, viewTransition } from "./theme-style-provider";
import { useUiStore, type AiChatTab } from "@/stores/ui-store";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { settingsKeys, updateSettingsRequest } from "@/lib/queries/settings";
import {
  attemptKeys,
  deleteAttemptRequest,
} from "@/lib/queries/attempts";
import { analyticsKeys } from "@/lib/queries/analytics";
import { BACKUP_MAX_BYTES } from "@/lib/backup";
import {
  SUBJECTS,
  subjectIds,
  type Attempt,
  type DashboardScope,
  type Filters,
} from "@/lib/domain";
import { formatNumber as n } from "@/lib/domain";
import { longDate, shortDate, isIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { istTodayIso } from "@/lib/plan/view-model";
import type { AiScreenContext, AiView } from "@/lib/ai/client-types";
import type { PlanTaskView } from "@/lib/plan/view-model";
import { Dialog } from "radix-ui";

/**
 * Workspace shell — the persistent client orchestrator behind the real
 * /dashboard, /add, /history, /compare and /settings routes. Lives in the
 * (workspace) layout so its state (attempts, filters, compare selection,
 * in-progress edit, AI chat) survives route navigation; the active view is
 * derived from the pathname and navigation is router.push.
 *
 * Composition:
 * - useWorkspaceData — filters/scope/list-state (+ URL mirror), the
 *   unfiltered attempts, analytics, target, refresh.
 * - useAttemptPage — the server-paged /history and /compare lists on
 *   TanStack Query, keyed on that state.
 * - useAiWorkspace — optional AI coach card and chat drawer state.
 * - useBackupImport — preview/fingerprint/confirm import flow.
 * The shell owns view routing, the shared `busy` flag, and the handlers.
 * Handlers passed to memoized panels are useCallback-stable and derived
 * props are useMemo'd so streaming chat tokens do not re-render charts.
 */

/** Route path → shell view. Unknown paths fall back to the dashboard;
 * /plan/<date> is a dynamic route matched by prefix. */
const PATH_VIEW: Record<string, AppView> = {
  "/dashboard": "dashboard",
  "/calendar": "calendar",
  "/my-tasks": "tasks",
  "/add": "add",
  "/history": "history",
  "/compare": "compare",
  "/settings": "settings",
};

function viewForPathname(pathname: string): AppView {
  if (pathname.startsWith("/plan/")) return "plan";
  return PATH_VIEW[pathname] ?? "dashboard";
}

export function WorkspaceShell({
  authEnabled = false,
  userEmail = "",
  userName = "",
  userImage = "",
  defaultSidebarOpen = true,
}: {
  authEnabled?: boolean;
  userEmail?: string;
  userName?: string;
  userImage?: string;
  defaultSidebarOpen?: boolean;
}) {
  // ToastProvider wraps the inner component so useToast works inside it.
  // ErrorBoundary already wraps the whole tree in layout.tsx.
  // QueryProvider scopes the TanStack cache to the workspace session —
  // lib/query-client.ts owns the client config, devtools are dev-only, and
  // unmounting the shell (logout) drops the cache with it.
  return (
    <QueryProvider>
      <ToastProvider>
        <WorkspaceShellInner
          authEnabled={authEnabled}
          userEmail={userEmail}
          defaultSidebarOpen={defaultSidebarOpen}
          userName={userName}
          userImage={userImage}
        />
      </ToastProvider>
    </QueryProvider>
  );
}

function WorkspaceShellInner({
  authEnabled = false,
  userEmail = "",
  userName = "",
  userImage = "",
  defaultSidebarOpen = true,
}: {
  authEnabled?: boolean;
  userEmail?: string;
  userName?: string;
  userImage?: string;
  defaultSidebarOpen?: boolean;
}) {
  const toast = useToast();
  const reduced = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { style: themeStyle } = useThemePrefs();
  // The view follows the URL; the (workspace) layout keeps this component
  // mounted across navigations so workspace state persists.
  const view = viewForPathname(pathname);
  // Sera transitions decisive, Vega smooth, Mira quick (style tokens).
  const viewMotion = viewTransition(themeStyle);
  // Planner state: the merged 50-day plan + progress and personal tasks,
  // mounted once here so the dashboard, calendar, tasks, and day views
  // all read (and mutate) one authoritative copy.
  const planApi = usePlanData();
  const {
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
    targetInput,
    setTargetInput,
    loading,
    error,
    refresh,
    reloadSettings,
  } = useWorkspaceData();
  // Server-paged attempt lists (TanStack Query). Each view fetches only
  // while it is active; keepPreviousData keeps the previous page visible
  // while a filter/sort/page change loads.
  const historyList = useAttemptPage({
    filters,
    page,
    pageSize,
    sort,
    dir,
    withStats: true,
    enabled: view === "history",
  });
  const compareList = useAttemptPage({
    filters,
    page: comparePage,
    pageSize,
    sort: "date",
    dir: "desc",
    enabled: view === "compare",
  });
  const ai = useAiWorkspace();
  const {
    insight: coachInsight,
    busy: coachBusy,
    error: coachError,
    generate: generateCoach,
    clear: clearCoach,
    open: openCoachChat,
  } = ai.coach;
  const [editing, setEditing] = useState<Attempt>();
  const [detail, setDetail] = useState<Attempt | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  // Full objects for the compare selection, hydrated per id so selections
  // made anywhere (detail dialog, another picker page) still land.
  const selectedResults = useAttemptsByIds(selected);
  const [busy, setBusy] = useState(false);
  // Global shell UI state lives in the Zustand store (stores/ui-store.ts):
  // palette visibility, the AI drawer flag/tab, the planner date, and the
  // quick-add handoff. Compare selection, dialogs, and form inputs stay
  // component-local.
  const searchOpen = useUiStore((s) => s.searchOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const requestQuickAdd = useUiStore((s) => s.requestQuickAdd);
  const aiChatTab = useUiStore((s) => s.aiChatTab);
  const plannerDate = useUiStore((s) => s.plannerDate);
  const setPlannerDate = useUiStore((s) => s.setPlannerDate);
  // The hidden file input lives in this component's JSX; the import hook
  // only touches it inside callbacks.
  const fileRef = useRef<HTMLInputElement>(null);

  // A deep-linked /plan/<date> is authoritative for that view without a
  // state-syncing effect. Calendar selection supplies the fallback date.
  const pathPlanDate = useMemo(() => {
    if (!pathname.startsWith("/plan/")) return null;
    try {
      const value = decodeURIComponent(pathname.slice("/plan/".length));
      return isIsoDate(value) ? value : null;
    } catch {
      return null;
    }
  }, [pathname]);
  const effectivePlannerDate = pathPlanDate ?? plannerDate;

  /** Plain route change — keeps in-progress state (editing, selection). */
  const go = useCallback(
    (next: AppView) => {
      router.push(VIEW_HREF[next]);
    },
    [router],
  );
  /** Workspace navigation — starts the destination view from scratch. */
  const navigate = useCallback(
    (next: AppView) => {
      setEditing(undefined);
      if (next === "history") updateFilters((f) => ({ ...f, type: "all" }));
      go(next);
    },
    [go, updateFilters],
  );
  /** Sidebar/header link intent: reset stale edit state without navigating. */
  const routeIntent = useCallback(
    (next: AppView) => {
      setEditing(undefined);
      if (next === "history") updateFilters((f) => ({ ...f, type: "all" }));
    },
    [updateFilters],
  );
  const add = useCallback(() => navigate("add"), [navigate]);
  const openSearch = useCallback(() => setSearchOpen(true), [setSearchOpen]);
  /**
   * Planner → Add Mock. The actual attempt date is prefilled, but remains
   * editable in the form. The return target is a real plan-day route.
   */
  const addMockForDate = useCallback(
    (date: string, task?: PlanTaskView) => {
      setEditing(undefined);
      setPlannerDate(date);
      const params = new URLSearchParams({
        date,
        returnTo: `/plan/${date}`,
      });
      if (task) params.set("name", task.name);
      router.push(`/add?${params.toString()}`);
    },
    [router, setPlannerDate],
  );
  const changeFilter = useCallback(
    (key: keyof Filters, value: string) => {
      updateFilters((f) => ({ ...f, [key]: value }));
    },
    [updateFilters],
  );
  const searchFilter = useCallback(
    (value: string) => changeFilter("search", value),
    [changeFilter],
  );
  const viewAllHistory = useCallback(() => navigate("history"), [navigate]);

  // Post-mutation reload for every attempt-scope query (paged lists, the
  // unfiltered lookup list, per-id details) plus the dashboard analytics.
  const refreshAfterMutation = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: attemptKeys.all }),
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
    ]);
  }, [queryClient]);

  const remove = useCallback(
    async (a: Attempt) => {
      setBusy(true);
      try {
        await deleteAttemptRequest(a.id);
        setDetail(null);
        setSelected((ids) => ids.filter((id) => id !== a.id));
        // Drop the deleted record's detail cache entry without refetching.
        queryClient.removeQueries({ queryKey: attemptKeys.detail(a.id) });
        clearCoach();
        toast.success("Mock deleted");
        await refreshAfterMutation();
      } catch (e) {
        toast.error(
          "Couldn’t delete",
          e instanceof Error ? e.message : "Could not delete",
        );
      } finally {
        setBusy(false);
      }
    },
    [clearCoach, refreshAfterMutation, queryClient, toast],
  );

  const download = useCallback(
    async (format: "json" | "csv"): Promise<boolean> => {
      try {
        const response = await fetch(`/api/backup?format=${format}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          if (response.status === 401)
            window.dispatchEvent(new Event("ssc:session-ended"));
          if (body?.error?.code === "AUTH_UNAVAILABLE")
            window.dispatchEvent(new Event("ssc:auth-unavailable"));
          throw new Error(body?.error?.message ?? "Export failed");
        }
        let blob: Blob;
        if (format === "json") {
          const text = await response.text();
          try {
            const parsed = JSON.parse(text) as { warnings?: string[] };
            if (parsed.warnings?.length)
              toast.warning("Backup has warnings", parsed.warnings.join(" "));
          } catch {
            // The server always returns JSON here; validation happens on import.
          }
          if (text.length > BACKUP_MAX_BYTES)
            toast.warning(
              "Backup is large",
              "Backup downloaded, but it is larger than the 4 MB import limit.",
            );
          blob = new Blob([text], { type: "application/json" });
        } else {
          blob = await response.blob();
        }
        const date = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          format === "json"
            ? `ssc-insight-backup-${date}.json`
            : `ssc-insight-export-${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
      } catch (e) {
        toast.error(
          "Export failed",
          e instanceof Error ? e.message : undefined,
        );
        return false;
      }
    },
    [toast],
  );

  const saveTarget = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    try {
      const value = targetInput.trim() ? Number(targetInput) : null;
      // Write-through: the PUT response is the fresh settings payload, so
      // the cache updates without a refetch (lib/queries/settings.ts).
      const fresh = await updateSettingsRequest(value);
      queryClient.setQueryData(settingsKeys.current(), fresh);
      toast.success("Target updated");
      return true;
    } catch (e) {
      toast.error(
        "Couldn’t save target",
        e instanceof Error ? e.message : "Could not save",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, [queryClient, targetInput, toast]);

  // A backup import (merge or replace) can change every data domain at
  // once — mocks, plan progress, personal tasks — so the commit revalidates
  // all of them; settings revalidate via onTargetApplied when the import
  // applied a target.
  const invalidateTodos = useInvalidateTodos();
  const refreshAfterImport = useCallback(async () => {
    await Promise.all([
      refreshAfterMutation(),
      queryClient.invalidateQueries({ queryKey: planKeys.all }),
      invalidateTodos(),
    ]);
  }, [invalidateTodos, queryClient, refreshAfterMutation]);

  const backup = useBackupImport({
    download,
    refresh: refreshAfterImport,
    onTargetApplied: reloadSettings,
    setBusy,
    fileRef,
  });

  useKeyboardShortcuts(
    useMemo(
      () => ({
        // On My Tasks, `n` focuses the quick-add bar instead of the Add Mock
        // form — new work means a task there, not a mock.
        onAddMock: () => {
          if (view === "tasks") {
            requestQuickAdd();
            return;
          }
          add();
        },
        onNavigate: navigate,
        onOpenSearch: openSearch,
        onShowHelp: () =>
          toast.info(
            "Shortcuts",
            "⌘K=search · n=new (task on My Tasks, mock elsewhere) · g d/h/c/s=navigate · /=focus search · ?=help",
          ),
      }),
      [add, navigate, openSearch, requestQuickAdd, toast, view],
    ),
  );

  // Client-side views swap without navigation, so keep the tab title in
  // step with the visible screen.
  useEffect(() => {
    document.title = `${VIEW_META[view].label} · SSC Insight`;
  }, [view]);

  // Derived view inputs. Memoized so the memoized panels below skip
  // re-renders while chat streams or unrelated shell state changes.
  const compared = useMemo(
    () => collectSelectedAttempts(selectedResults),
    [selectedResults],
  );
  const platforms = useMemo(
    () => [...new Set(allAttempts.map((a) => a.platform))].sort(),
    [allAttempts],
  );
  const dashboardAttempts = useMemo(() => {
    if (!analytics) return [];
    return (analytics.sourceAttemptIds ?? [])
      .map((id) => allAttempts.find((attempt) => attempt.id === id))
      .filter((attempt): attempt is Attempt => !!attempt)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }, [allAttempts, analytics]);

  // A filter/sort/page-size change can leave the stored page past the end
  // of the new result set; clamp to the last page once the server answers.
  useEffect(() => {
    if (
      view === "history" &&
      historyList.data &&
      page > historyList.data.pageCount
    ) {
      setPage(historyList.data.pageCount);
    }
  }, [view, historyList.data, page, setPage]);
  useEffect(() => {
    if (
      view === "compare" &&
      compareList.data &&
      comparePage > compareList.data.pageCount
    ) {
      setComparePage(compareList.data.pageCount);
    }
  }, [view, compareList.data, comparePage, setComparePage]);

  // Screen orientation for the AI panel. This object contains only the view
  // name and (when relevant) an ISO date — never titles, notes, or IDs.
  const aiScreenContext = useMemo<AiScreenContext | null>(() => {
    if (view === "add") return null;
    const aiView: AiView = view;
    const date =
      view === "dashboard"
        ? istTodayIso()
        : view === "calendar" || view === "plan"
          ? effectivePlannerDate
          : undefined;
    return date ? { view: aiView, date } : { view: aiView };
  }, [view, effectivePlannerDate]);
  // The paged lists own their loading surfaces on /history and /compare;
  // the shell banner only relays their failures for the retry button.
  const activeList = view === "compare" ? compareList : historyList;
  const listError =
    view === "history" || view === "compare"
      ? activeList.error?.message
      : undefined;
  const listFetching = activeList.isFetching;
  const aiContextLabel =
    aiScreenContext?.date != null
      ? `${VIEW_META[view].label} · ${shortDate(`${aiScreenContext.date}T12:00:00+05:30`)}`
      : undefined;

  /** One-shot reviewed draft from the AI panel's Log a Mock tab. Consumed by
   * AddMockView on the next /add render, then cleared. The form stays the
   * sole save path; this only prefills it. */
  const [addPrefill, setAddPrefill] = useState<LogMockPayload | null>(null);
  /** Opens the shared AI sheet on a specific flow tab ("plan_todo" = todos). */
  const openAiChat = useCallback((tab: AiChatTab) => {
    useUiStore.getState().openAiChat(tab);
  }, []);
  const handleLogMock = useCallback(
    (draft: LogMockPayload) => {
      setAddPrefill(draft);
      router.push("/add");
    },
    [router],
  );
  const handleTaskAdded = useCallback(() => {
    toast.success("Task added to My Tasks");
  }, [toast]);

  const openDetail = useCallback((a: Attempt) => setDetail(a), []);
  const closeDetail = useCallback(() => setDetail(null), []);
  const editFromDetail = useCallback(
    (a: Attempt) => {
      setEditing(a);
      setDetail(null);
      go("add");
    },
    [go],
  );
  const compareFromDetail = useCallback(
    (a: Attempt) => {
      setSelected((ids) =>
        ids.includes(a.id) ? ids : ids.length < 4 ? [...ids, a.id] : ids,
      );
      setDetail(null);
      go("compare");
    },
    [go],
  );
  const clearCompare = useCallback(() => setSelected([]), []);
  const toggleCompare = useCallback(
    (id: string) =>
      setSelected((ids) =>
        ids.includes(id)
          ? ids.filter((x) => x !== id)
          : ids.length < 4
            ? [...ids, id]
            : ids,
      ),
    [],
  );
  const savedMock = useCallback(
    async (returnTo?: string | null) => {
      await refreshAfterMutation();
      setEditing(undefined);
      if (returnTo) {
        const date = returnTo.match(/^\/plan\/(\d{4}-\d{2}-\d{2})/)?.[1];
        if (date) setPlannerDate(date);
        router.push(returnTo);
      } else {
        navigate("dashboard");
      }
      toast.success("Mock saved", "Your progress is up to date.");
    },
    [navigate, refreshAfterMutation, router, setPlannerDate, toast],
  );
  const closeForm = useCallback(() => navigate("dashboard"), [navigate]);

  // Stable coach card node: lets the memoized dashboard panels skip
  // re-renders while chat tokens stream or filters change underneath it.
  const coachNode = useMemo(
    () =>
      ai.aiStatus?.enabled ? (
        <AiCoachCard
          status={ai.aiStatus}
          insight={coachInsight}
          busy={coachBusy}
          error={coachError}
          onGenerate={() => void generateCoach()}
          onOpenChat={openCoachChat}
        />
      ) : undefined,
    [ai.aiStatus, coachBusy, coachError, generateCoach, coachInsight, openCoachChat],
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <AppFrame
          defaultSidebarOpen={defaultSidebarOpen}
          view={view}
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          authEnabled={authEnabled}
          aiEnabled={!!ai.aiStatus?.enabled}
          onRouteIntent={routeIntent}
          onAddMock={add}
          onOpenAi={() => openAiChat("chat")}
          onOpenSearch={openSearch}
        >
          {/* px-3 on phones is deliberate: at 375px the 2×2 metric strip needs
              every pixel for "Personal overdue" before it ellipsizes. */}
          <div className="workspace-content mx-auto w-full max-w-[1560px] px-3 py-4 sm:px-5 md:py-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view === "add" ? "add" : view}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -6 }}
                transition={viewMotion}
              >
                {view === "add" ? (
                  <Suspense
                    fallback={
                      <div className="mx-auto max-w-6xl">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="mt-4 h-64 w-full" />
                      </div>
                    }
                  >
                    <AddMockView
                      key={editing?.id ?? "new"}
                      attempt={editing}
                      knownAttempts={allAttempts}
                      prefill={addPrefill}
                      onConsumePrefill={() => setAddPrefill(null)}
                      onClose={closeForm}
                      onSaved={savedMock}
                    />
                  </Suspense>
                ) : (
                  <>
                    {view === "dashboard" && (
                      <PageHeader
                        title="Dashboard"
                        description="Today's work, plan progress, and the performance that matters."
                        icon={
                          <div className="hidden sm:block">
                            <DuotoneTile
                              name="dashboard"
                              tile="accent"
                              className="size-11"
                            />
                          </div>
                        }
                        meta={
                          <>
                            <span className="inline-flex items-center gap-1.5">
                              <PlainIcon name="calendar" size={12} />
                              {longDate(istTodayIso())}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1.5">
                              <PlainIcon name="file" size={12} />
                              SSC CGL Tier 2
                            </span>
                            {planApi.plan ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1.5">
                                  <PlainIcon name="target" size={12} />
                                  {planApi.plan.days.find(
                                    (day) => day.date === istTodayIso(),
                                  )?.day
                                    ? `Plan day ${
                                        planApi.plan.days.find(
                                          (day) => day.date === istTodayIso(),
                                        )?.day
                                      } of 50`
                                    : "Outside the plan window"}
                                </span>
                              </>
                            ) : null}
                          </>
                        }
                        actions={
                          <>
                            <DashboardClock />
                            <div className="flex items-center">
                              <Button
                                size="sm"
                                className="rounded-r-none!"
                                onClick={add}
                              >
                                <PlainIcon name="plus" size={14} /> Add mock
                              </Button>
                              <Button
                                size="sm"
                                aria-label="Create mock with AI"
                                title="Create mock with AI"
                                onClick={() => openAiChat("log")}
                                className="rounded-l-none! border-l border-paper/40"
                              >
                                <PlainIcon name="sparkles" size={14} />
                              </Button>
                            </div>
                          </>
                        }
                      />
                    )}
                    {view === "history" && (
                      <PageHeader
                        title="Mock history"
                        description="Every saved result with its actual attempt date, score, and details."
                        actions={
                          <Button size="sm" onClick={add}>
                            <PlainIcon name="plus" size={14} /> Add mock
                          </Button>
                        }
                      />
                    )}
                    {view === "compare" && (
                      <PageHeader
                        title="Compare mocks"
                        description="Put up to four results side by side and find the difference behind the scores."
                        actions={
                          <Button size="sm" onClick={add}>
                            <PlainIcon name="plus" size={14} /> Add mock
                          </Button>
                        }
                      />
                    )}
                    {view === "settings" && (
                      <PageHeader
                        title="Settings"
                        description="Target, appearance, account data, and the private workspace."
                      />
                    )}
                    {(error || listError) && (
                      <div
                        role="alert"
                        className="mb-5 flex flex-wrap gap-3 justify-between items-center bg-warning-soft text-warning border border-warning rounded-control px-5 py-4"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            Database connection needs attention
                          </p>
                          <p className="text-xs mt-1 max-w-2xl">
                            {error || listError}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void refresh();
                            void activeList.refetch();
                          }}
                          disabled={loading || listFetching}
                        >
                          <PlainIcon
                            name="refresh"
                            size={13}
                            className={
                              loading || listFetching ? "animate-spin" : ""
                            }
                          />{" "}
                          Retry
                        </Button>
                      </div>
                    )}
                    {view === "calendar" ? (
                      <CalendarView
                        planApi={planApi}
                        attempts={allAttempts}
                        onAddMock={addMockForDate}
                        onOpenAttempt={openDetail}
                        onSelectedDateChange={setPlannerDate}
                      />
                    ) : view === "tasks" ? (
                      <MyTasksView />
                    ) : view === "plan" ? (
                      <PlanDayView
                        date={decodeURIComponent(
                          pathname.slice("/plan/".length),
                        )}
                        planApi={planApi}
                        attempts={allAttempts}
                        onAddMock={addMockForDate}
                        onOpenAttempt={openDetail}
                      />
                    ) : view === "settings" ? (
                      <SettingsPanels
                        target={target}
                        targetInput={targetInput}
                        setTargetInput={setTargetInput}
                        saveTarget={saveTarget}
                        busy={busy}
                        userName={userName}
                        userEmail={userEmail}
                        onDownload={(format) => void download(format)}
                        onChooseFile={() => fileRef.current?.click()}
                        fileInput={
                          <input
                            className="hidden"
                            type="file"
                            accept=".json,application/json"
                            ref={fileRef}
                            aria-label="Choose backup file"
                            onChange={(e) =>
                              void backup.readBackup(e.target.files?.[0])
                            }
                          />
                        }
                        backupName={backup.backupName}
                        preview={backup.preview}
                        importMode={backup.importMode}
                        changeImportMode={backup.changeImportMode}
                        applyTarget={backup.applyTarget}
                        changeApplyTarget={backup.changeApplyTarget}
                        safetyDownloaded={backup.safetyDownloaded}
                        onDownloadSafety={() =>
                          void backup.downloadSafetyBackup()
                        }
                        onReset={backup.resetImport}
                        onCommit={() => void backup.commitImport(false)}
                        targetChange={
                          backup.preview != null &&
                          backup.applyTarget &&
                          backup.preview.target.available &&
                          backup.preview.target.current !==
                            backup.preview.target.incoming
                        }
                        onOpenReplace={() => backup.setReplaceOpen(true)}
                      />
                    ) : view === "dashboard" ? (
                      <DashboardView
                        planApi={planApi}
                        onOpenPersonalAi={() => openAiChat("todos")}
                        analytics={analytics}
                        attempts={dashboardAttempts}
                        target={target}
                        loading={loading}
                        coach={coachNode}
                        scopeControls={
                          <ScopeFilters
                            view={view}
                            scope={scope}
                            setScope={setScope}
                            filters={filters}
                            setFilters={updateFilters}
                            changeFilter={changeFilter}
                            platforms={platforms}
                          />
                        }
                        onOpenAttempt={openDetail}
                        onAdd={add}
                        onViewAll={viewAllHistory}
                        onOpenDay={(date) => {
                          setPlannerDate(date);
                          router.push(`/plan/${date}`);
                        }}
                      />
                    ) : (
                      <>
                        <div className="mb-4">
                          <ScopeFilters
                            view={view}
                            scope={scope}
                            setScope={setScope}
                            filters={filters}
                            setFilters={updateFilters}
                            changeFilter={changeFilter}
                            platforms={platforms}
                          />
                        </div>
                        {listFetching && (
                          <p
                            role="status"
                            className="mb-3 flex items-center gap-2 text-xs text-muted"
                          >
                            <PlainIcon
                              name="refresh"
                              size={12}
                              className="animate-spin"
                            />{" "}
                            Updating your results…
                          </p>
                        )}
                        {view === "compare" ? (
                          <CompareView
                            data={compareList.data}
                            isFetching={compareList.isFetching}
                            onPageChange={setComparePage}
                            onPageSizeChange={setPageSize}
                            compared={compared}
                            selected={selected}
                            onToggle={toggleCompare}
                            onClear={clearCompare}
                            onOpen={openDetail}
                          />
                        ) : (
                          <HistoryPanel
                            data={historyList.data}
                            isFetching={historyList.isFetching}
                            sort={{ key: sort, dir }}
                            onSort={changeSort}
                            onPageChange={setPage}
                            onPageSizeChange={setPageSize}
                            search={filters.search ?? ""}
                            onSearch={searchFilter}
                            onOpen={openDetail}
                            onAdd={add}
                          />
                        )}
                      </>
                    )}
                    <footer className="flex flex-wrap justify-between gap-2 pt-6 text-[0.625rem] text-muted">
                      <p>Built for progress, one mock at a time.</p>
                      <p>
                        SSC CGL Tier 2 <span className="mx-2">·</span> All dates
                        in India Standard Time
                      </p>
                    </footer>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </AppFrame>
        <CommandPalette
          open={searchOpen}
          onOpenChange={setSearchOpen}
          aiEnabled={!!ai.aiStatus?.enabled}
          onAddMock={add}
          onOpenAi={() => openAiChat("chat")}
        />
        <MockDetailDialog
          attempt={detail}
          onClose={closeDetail}
          onEdit={editFromDetail}
          onCompare={compareFromDetail}
          onDelete={(a) => void remove(a)}
          busy={busy}
        />
        <Dialog.Root
          open={backup.replaceOpen && backup.preview !== null}
          onOpenChange={backup.setReplaceOpen}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay fixed inset-0 bg-ink/40 z-40" />
            <Dialog.Content className="dialog-content fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-paper border border-rule rounded-panel w-[calc(100%-32px)] max-w-xl p-6 md:p-8 shadow-pop">
              <Dialog.Title className="font-serif text-3xl leading-tight pr-8">
                Replace this account’s data?
              </Dialog.Title>
              <Dialog.Description className="muted text-xs mt-2">
                Signed in as {userEmail || "the current account"}. This action
                cannot be undone from the app.
              </Dialog.Description>
              {backup.preview && (
                <div className="mt-5 space-y-3 text-sm">
                  <p>
                    This permanently deletes{" "}
                    <strong className="tabular">
                      {backup.preview.willDelete}
                    </strong>{" "}
                    existing mocks in this account and imports{" "}
                    <strong className="tabular">
                      {backup.preview.importable}
                    </strong>{" "}
                    mocks from the backup.
                  </p>
                  <p className="text-xs muted">
                    Target:{" "}
                    {backup.applyTarget && backup.preview.target.available
                      ? backup.preview.target.incoming == null
                        ? "clear the current target"
                        : `set target to ${n(backup.preview.target.incoming)} / 390`
                      : "keep the current target"}
                    .{" "}
                    {backup.safetyDownloaded
                      ? "A safety backup was downloaded."
                      : "Download a safety backup first."}
                  </p>
                  <div className="p-3 bg-danger-soft border border-danger rounded-control text-xs">
                    Keep the downloaded safety backup until you have verified
                    the imported data. This cannot be undone from the app.
                  </div>
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => backup.setReplaceOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy || !backup.safetyDownloaded}
                  onClick={() => void backup.commitImport(true)}
                >
                  Replace account data
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <AiChatSheet
          open={ai.chat.open}
          onOpenChange={ai.chat.setOpen}
          initialTab={aiChatTab}
          messages={ai.chat.messages}
          streaming={ai.chat.streaming}
          error={ai.chat.error}
          contextLabel={aiContextLabel}
          configured={!!ai.aiStatus?.enabled}
          onSend={(text) => void ai.chat.send(text, aiScreenContext)}
          onRetry={() => {
            const lastUser = ai.chat.messages.findLast(
              (message) => message.role === "user",
            );
            if (lastUser)
              void ai.chat.send(lastUser.content, aiScreenContext, true);
          }}
          onStop={ai.chat.stop}
          onClear={ai.chat.clear}
          onAiConfigured={() => void ai.refreshAiStatus()}
          taskApi={{ createPersonalTask: planApi.createPersonalTask }}
          onLogMock={handleLogMock}
          onTaskAdded={handleTaskAdded}
        />
      </div>
    </MotionConfig>
  );
}

/** Scope tabs + platform/subject/date filters, shared by the three views. */
function ScopeFilters({
  view,
  scope,
  setScope,
  filters,
  setFilters,
  changeFilter,
  platforms,
}: {
  view: AppView;
  scope: DashboardScope;
  setScope: (scope: DashboardScope) => void;
  filters: Filters;
  /** Function-form-only filter writer; resets the paged lists' pages. */
  setFilters: (updater: (prev: Filters) => Filters) => void;
  changeFilter: (key: keyof Filters, value: string) => void;
  platforms: string[];
}) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      {/* The four scope options share one row from sm up; on phones they
          become a 2×2 pill grid (.scope-tabs) so every option stays visible
          with no scrolling and no ragged wrap point. */}
      <div
        role="group"
        aria-label="Analytical scope"
        className="segment-group scope-tabs w-full sm:w-auto"
      >
        {(
          [
            { id: "full", label: "Full mocks", icon: "file" },
            { id: "subject", label: "Subject wise", icon: "book" },
            { id: "sectional", label: "Sectional wise", icon: "layers" },
            { id: "all", label: "All mocks", icon: "history" },
          ] as const
        ).map((t) => {
          const active =
            view === "dashboard"
              ? scope === t.id
              : (filters.type ?? "all") === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              className="segment"
              onClick={() =>
                view === "dashboard"
                  ? setScope(t.id as DashboardScope)
                  : changeFilter("type", t.id)
              }
            >
              <PlainIcon
                name={t.icon}
                size={14}
                className={active ? "" : "text-muted"}
              />
              {t.label}
            </button>
          );
        })}
      </div>
      {/* Filters close the control group: one full-width row per filter on
          phones. A 2-up grid was the earlier choice, but a 16px field font
          plus the chevron padding no longer fits "All platforms" in half of
          a 375px panel — stacking keeps the label readable and the target
          full width. Right-aligned inline from sm up. */}
      <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:ml-auto sm:flex sm:w-auto sm:justify-end">
        <select
          aria-label="Filter by platform"
          className="w-full min-w-0 truncate rounded-control py-[9px] pl-3 pr-7 text-xs sm:w-auto sm:max-w-[11.5rem]"
          value={filters.platform ?? "all"}
          onChange={(e) => changeFilter("platform", e.target.value)}
        >
          <option value="all">All platforms</option>
          {platforms.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        {view !== "dashboard" && (
          <select
            aria-label="Filter by subject"
            className="w-full min-w-0 truncate rounded-control py-[9px] pl-3 pr-7 text-xs sm:w-auto sm:max-w-[11.5rem]"
            value={filters.subject ?? "all"}
            onChange={(e) => changeFilter("subject", e.target.value)}
          >
            <option value="all">All subjects</option>
            {subjectIds.map((id) => (
              <option key={id} value={id}>
                {SUBJECTS[id].short}
              </option>
            ))}
          </select>
        )}
        <div
          className={cn(
            "min-w-0 [&>button]:w-full sm:[&>button]:w-auto",
            view !== "dashboard" && "max-sm:col-span-2",
          )}
        >
          <DateRangeFilter
            from={filters.from ?? ""}
            to={filters.to ?? ""}
            onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          />
        </div>
      </div>
    </div>
  );
}
