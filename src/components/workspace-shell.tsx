"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "motion/react";
import { PlainIcon } from "./icon";
import {
  AppHeader,
  AppSidebar,
  MobileNav,
  VIEW_HREF,
  VIEW_META,
  type AppView,
} from "./app-shell";
import { CompareView } from "./compare-view";
import { DateRangeFilter } from "./date-range-filter";
import { HistoryPanel } from "./history-panel";
import { MockDetailDialog } from "./mock-detail-dialog";
import { MockForm } from "./mock-form";
import { PerformanceOverview } from "./performance-overview";
import { AiCoachCard } from "./ai-coach-card";
import { AiChatDrawer } from "./ai-chat-drawer";
import { useAiWorkspace } from "./use-ai-workspace";
import { useBackupImport } from "./use-backup-import";
import { useWorkspaceData } from "./use-workspace-data";
import { SettingsPanels } from "./settings-panels";
import { ToastProvider, useToast } from "./toast";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { Button } from "./ui/button";
import { api } from "@/lib/api-client";
import { BACKUP_MAX_BYTES } from "@/lib/backup";
import {
  SUBJECTS,
  subjectIds,
  type Attempt,
  type DashboardScope,
  type Filters,
} from "@/lib/domain";
import { formatNumber as n } from "@/lib/domain";
import { Dialog } from "radix-ui";

/**
 * Workspace shell — the persistent client orchestrator behind the real
 * /dashboard, /add, /history, /compare and /settings routes. Lives in the
 * (workspace) layout so its state (attempts, filters, compare selection,
 * in-progress edit, AI chat) survives route navigation; the active view is
 * derived from the pathname and navigation is router.push.
 *
 * Composition:
 * - useWorkspaceData — filters/scope (+ URL mirror), attempts, analytics,
 *   target, refresh; one deduplicated request set per change.
 * - useAiWorkspace — optional AI coach card and chat drawer state.
 * - useBackupImport — preview/fingerprint/confirm import flow.
 * The shell owns view routing, the shared `busy` flag, and the handlers.
 * Handlers passed to memoized panels are useCallback-stable and derived
 * props are useMemo'd so streaming chat tokens do not re-render charts.
 */

/** Route path → shell view. Unknown paths fall back to the dashboard. */
const PATH_VIEW: Record<string, AppView> = {
  "/dashboard": "dashboard",
  "/add": "add",
  "/history": "history",
  "/compare": "compare",
  "/settings": "settings",
};

export function WorkspaceShell({
  authEnabled = false,
  userEmail = "",
  userName = "",
}: {
  authEnabled?: boolean;
  userEmail?: string;
  userName?: string;
}) {
  // ToastProvider wraps the inner component so useToast works inside it.
  // ErrorBoundary already wraps the whole tree in layout.tsx.
  return (
    <ToastProvider>
      <WorkspaceShellInner
        authEnabled={authEnabled}
        userEmail={userEmail}
        userName={userName}
      />
    </ToastProvider>
  );
}

function WorkspaceShellInner({
  authEnabled = false,
  userEmail = "",
  userName = "",
}: {
  authEnabled?: boolean;
  userEmail?: string;
  userName?: string;
}) {
  const toast = useToast();
  const reduced = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  // The view follows the URL; the (workspace) layout keeps this component
  // mounted across navigations so workspace state persists.
  const view = PATH_VIEW[pathname] ?? "dashboard";
  const {
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
  } = useWorkspaceData();
  const ai = useAiWorkspace();
  const {
    insight: coachInsight,
    meta: coachMeta,
    busy: coachBusy,
    error: coachError,
    generate: generateCoach,
    clear: clearCoach,
    open: openCoachChat,
  } = ai.coach;
  const [editing, setEditing] = useState<Attempt>();
  const [detail, setDetail] = useState<Attempt | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  // The hidden file input lives in this component's JSX; the import hook
  // only touches it inside callbacks.
  const fileRef = useRef<HTMLInputElement>(null);

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
      if (next === "history") setFilters((f) => ({ ...f, type: "all" }));
      go(next);
    },
    [go, setFilters],
  );
  const add = useCallback(() => navigate("add"), [navigate]);
  const changeFilter = useCallback(
    (key: keyof Filters, value: string) => {
      setFilters((f) => ({ ...f, [key]: value }));
    },
    [setFilters],
  );
  const searchFilter = useCallback(
    (value: string) => changeFilter("search", value),
    [changeFilter],
  );
  const viewAllHistory = useCallback(() => navigate("history"), [navigate]);

  const remove = useCallback(
    async (a: Attempt) => {
      setBusy(true);
      try {
        await api(`/api/mock-attempts/${a.id}`, {
          method: "DELETE",
          body: "{}",
        });
        setDetail(null);
        setSelected((ids) => ids.filter((id) => id !== a.id));
        clearCoach();
        toast.success("Mock deleted");
        await refresh();
      } catch (e) {
        toast.error(
          "Couldn’t delete",
          e instanceof Error ? e.message : "Could not delete",
        );
      } finally {
        setBusy(false);
      }
    },
    [clearCoach, refresh, toast],
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

  const saveTarget = useCallback(async () => {
    setBusy(true);
    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          targetScore: targetInput ? Number(targetInput) : null,
        }),
      });
      setTarget(targetInput ? Number(targetInput) : null);
      toast.success("Target updated");
    } catch (e) {
      toast.error(
        "Couldn’t save target",
        e instanceof Error ? e.message : "Could not save",
      );
    } finally {
      setBusy(false);
    }
  }, [setTarget, targetInput, toast]);

  const backup = useBackupImport({
    download,
    refresh,
    onTargetApplied: loadSettings,
    setBusy,
    fileRef,
  });

  useKeyboardShortcuts(
    useMemo(
      () => ({
        onAddMock: add,
        onNavigate: navigate,
        onShowHelp: () =>
          toast.info(
            "Shortcuts",
            "n=new mock · g d/h/c/s=navigate · /=focus search · ?=help",
          ),
      }),
      [add, navigate, toast],
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
    () =>
      selected
        .map((id) => allAttempts.find((a) => a.id === id))
        .filter((a): a is Attempt => !!a),
    [allAttempts, selected],
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
  const visibleAttempts =
    view === "dashboard" ? dashboardAttempts : attempts;

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
  const savedMock = useCallback(() => {
    navigate("dashboard");
    toast.success("Mock saved", "Your progress is up to date.");
    void refresh();
  }, [navigate, refresh, toast]);
  const closeForm = useCallback(() => navigate("dashboard"), [navigate]);

  // Stable coach card node: lets the memoized PerformanceOverview skip
  // re-renders while chat tokens stream or filters change underneath it.
  const coachNode = useMemo(
    () =>
      ai.aiStatus?.enabled ? (
        <AiCoachCard
          status={ai.aiStatus}
          insight={coachInsight}
          meta={coachMeta}
          busy={coachBusy}
          error={coachError}
          onGenerate={() => void generateCoach()}
          onOpenChat={openCoachChat}
        />
      ) : undefined,
    [
      ai.aiStatus,
      coachBusy,
      coachError,
      generateCoach,
      coachInsight,
      coachMeta,
      openCoachChat,
    ],
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to content
        </a>
        <AppSidebar view={view} userName={userName} userEmail={userEmail} />
        <div className="lg:ml-[224px]">
          <AppHeader view={view} authEnabled={authEnabled} />
          <MobileNav view={view} />
          <main
            id="main-content"
            /* -1 lets the skip link move real focus here (Phase 12). */
            tabIndex={-1}
            className="px-5 md:px-9 py-7 md:py-9 max-w-[1600px] mx-auto focus:outline-none"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view === "add" ? "add" : view}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
            {view === "add" ? (
              <MockForm
                key={editing?.id ?? "new"}
                attempt={editing}
                knownAttempts={allAttempts}
                onClose={closeForm}
                onSaved={savedMock}
              />
            ) : (
              <>
                <div className="flex flex-wrap justify-between items-center gap-4 mb-7">
                  <div>
                    <h1 className="page-title">
                      {view === "dashboard"
                        ? "Your preparation, in perspective."
                        : view === "history"
                          ? "Every mock. Every step forward."
                          : view === "compare"
                            ? "See what’s changing."
                            : "Make this workspace yours."}
                    </h1>
                    <p className="muted mt-1.5 text-[13px]">
                      {view === "dashboard"
                        ? "Track your effort. Understand your progress. Make the next mock count."
                        : view === "history"
                          ? "All your results, with the details that matter."
                          : view === "compare"
                            ? "Compare up to four mocks and find the difference behind the scores."
                            : "Set a target, keep a backup, and stay in control of your data."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      aria-label="Download backup"
                      onClick={() => void download("json")}
                    >
                      <PlainIcon name="download" size={15} />
                      <span className="hidden sm:inline">Backup</span>
                    </Button>
                    <Button onClick={add}>
                      <PlainIcon name="plus" size={17} /> Add mock
                    </Button>
                  </div>
                </div>
                {error && (
                  <div
                    role="alert"
                    className="mb-5 flex flex-wrap gap-3 justify-between items-center bg-warning-soft text-warning border border-warning rounded-control px-5 py-4"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        Database connection needs attention
                      </p>
                      <p className="text-xs mt-1 max-w-2xl">{error}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void refresh()}
                      disabled={loading}
                    >
                      <PlainIcon
                        name="refresh"
                        size={13}
                        className={loading ? "animate-spin" : ""}
                      />{" "}
                      Retry
                    </Button>
                  </div>
                )}
                {view === "settings" ? (
                  <SettingsPanels
                    target={target}
                    targetInput={targetInput}
                    setTargetInput={setTargetInput}
                    saveTarget={() => void saveTarget()}
                    busy={busy}
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
                    onDownloadSafety={() => void backup.downloadSafetyBackup()}
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
                ) : (
                  <>
                    <ScopeFilters
                      view={view}
                      scope={scope}
                      setScope={setScope}
                      filters={filters}
                      setFilters={setFilters}
                      changeFilter={changeFilter}
                      platforms={platforms}
                    />
                    {loading && (
                      <p
                        role="status"
                        className="text-xs muted mb-4 flex items-center gap-2"
                      >
                        <PlainIcon
                          name="refresh"
                          size={12}
                          className="animate-spin"
                        />{" "}
                        Updating your results…
                      </p>
                    )}
                    {view === "dashboard" && (
                      <div aria-busy={loading}>
                        <PerformanceOverview
                          analytics={analytics}
                          target={target}
                          coach={coachNode}
                        />
                      </div>
                    )}
                    {view === "compare" ? (
                      <div className="mt-6">
                        <CompareView
                          attempts={attempts}
                          compared={compared}
                          selected={selected}
                          onToggle={toggleCompare}
                          onClear={clearCompare}
                        />
                      </div>
                    ) : (
                      <HistoryPanel
                        mode={view === "dashboard" ? "dashboard" : "history"}
                        attempts={visibleAttempts}
                        totalCount={allAttempts.length}
                        sourceCount={analytics?.sourceAttemptCount ?? 0}
                        search={filters.search ?? ""}
                        onSearch={searchFilter}
                        onViewAll={viewAllHistory}
                        onOpen={openDetail}
                        onAdd={add}
                      />
                    )}
                  </>
                )}
                <footer className="flex flex-wrap justify-between gap-2 text-[10px] muted pt-7">
                  <p>Built for progress, one mock at a time.</p>
                  <p>
                    SSC CGL Tier 2 <span className="mx-2">·</span> All dates in
                    India Standard Time
                  </p>
                </footer>
              </>
            )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
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
        <AiChatDrawer
          open={ai.chat.open}
          onOpenChange={ai.chat.setOpen}
          messages={ai.chat.messages}
          streaming={ai.chat.streaming}
          error={ai.chat.error}
          onSend={(text) => void ai.chat.send(text)}
          onStop={ai.chat.stop}
          onClear={ai.chat.clear}
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
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  changeFilter: (key: keyof Filters, value: string) => void;
  platforms: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div
        role="group"
        aria-label="Analytical scope"
        className="segment-group"
      >
        {(
          [
            { id: "full", label: "Full mocks" },
            { id: "subject", label: "Subject wise" },
            { id: "sectional", label: "Sectional wise" },
            { id: "all", label: "All mocks" },
          ] as const
        ).map((t) => {
          const active =
            view === "dashboard"
              ? scope === t.id
              : (filters.type ?? "all") === t.id;
          return (
            <button
              key={t.id}
              aria-pressed={active}
              className="segment"
              onClick={() =>
                view === "dashboard"
                  ? setScope(t.id as DashboardScope)
                  : changeFilter("type", t.id)
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="ml-auto flex gap-2 flex-wrap">
        <select
          aria-label="Filter by platform"
          className="w-auto py-2 text-xs"
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
            className="w-auto py-2 text-xs"
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
        <DateRangeFilter
          from={filters.from ?? ""}
          to={filters.to ?? ""}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        />
      </div>
    </div>
  );
}
