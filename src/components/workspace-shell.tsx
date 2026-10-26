"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import { PlainIcon } from "./icon";
import { AppHeader, AppSidebar, MobileNav, VIEW_HREF, VIEW_META, type AppView } from "./app-shell";
import { CompareView } from "./compare-view";
import { DateRangeFilter } from "./date-range-filter";
import { HistoryPanel } from "./history-panel";
import { MockDetailDialog } from "./mock-detail-dialog";
import { MockForm } from "./mock-form";
import { PerformanceOverview } from "./performance-overview";
import { AiCoachCard } from "./ai-coach-card";
import { AiChatDrawer } from "./ai-chat-drawer";
import { NdjsonDecoder, parseChatEvent } from "@/lib/ai/ndjson";
import type {
  AiStatus,
  ChatMessage,
  CoachMeta,
  CoachResponse,
} from "@/lib/ai/client-types";
import type { CoachInsight } from "@/lib/ai/schemas";
import { SettingsPanels } from "./settings-panels";
import { ToastProvider, useToast } from "./toast";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { Button } from "./ui/button";
import { api } from "@/lib/api-client";
import {
  BACKUP_MAX_BYTES,
  type BackupPreview,
  type ImportMode,
  type ImportResult,
} from "@/lib/backup";
import {
  type Attempt,
  type DashboardScope,
  type Filters,
  SUBJECTS,
  subjectIds,
} from "@/lib/domain";
import type { Analytics } from "@/lib/analytics";
import { Dialog } from "radix-ui";
import { formatNumber as n } from "@/lib/domain";

/**
 * Workspace shell — the persistent client orchestrator behind the real
 * /dashboard, /add, /history, /compare and /settings routes. Lives in the
 * (workspace) layout so its state (attempts, filters, compare selection,
 * in-progress edit, AI chat) survives route navigation; the active view is
 * derived from the pathname and navigation is router.push.
 *
 * Owns workspace state and data flow; presentation lives in focused modules:
 * app-shell (sidebar/header/mobile nav), settings-panels, compare-view,
 * history-panel, mock-detail-dialog, performance-overview, ai-insights.
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
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [allAttempts, setAllAttempts] = useState<Attempt[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [scope, setScope] = useState<DashboardScope>("full");
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Attempt>();
  const [detail, setDetail] = useState<Attempt | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const [targetInput, setTargetInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [backupFile, setBackupFile] = useState<unknown | null>(null);
  const [backupName, setBackupName] = useState("");
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [applyTarget, setApplyTarget] = useState(false);
  const [safetyDownloaded, setSafetyDownloaded] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewId = useRef(0);
  const requestId = useRef(0);
  const chatAbort = useRef<AbortController | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [coachInsight, setCoachInsight] = useState<CoachInsight | null>(null);
  const [coachMeta, setCoachMeta] = useState<CoachMeta | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachError, setCoachError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatError, setChatError] = useState("");

  const newId = () =>
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
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
      const [rows, stats, all, settings] = await Promise.all([
        api<Attempt[]>(`/api/mock-attempts?${query}`),
        api<Analytics>(`/api/analytics?${analyticsQuery}`),
        api<Attempt[]>("/api/mock-attempts"),
        api<{ targetScore: number | null }>("/api/settings"),
      ]);
      if (id !== requestId.current) return;
      setAttempts(rows);
      setAnalytics(stats);
      setAllAttempts(all);
      setTarget(settings.targetScore);
      setTargetInput(settings.targetScore?.toString() ?? "");
    } catch (e) {
      if (id === requestId.current)
        setError(e instanceof Error ? e.message : "Could not load data");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [filters, scope]);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 150);
    return () => clearTimeout(timer);
  }, [refresh]);

  // Client-side views swap without navigation, so keep the tab title in
  // step with the visible screen.
  useEffect(() => {
    document.title = `${VIEW_META[view].label} · SSC Insight`;
  }, [view]);

  const refreshAiStatus = useCallback(async () => {
    try {
      setAiStatus(await api<AiStatus>("/api/ai/status"));
    } catch {
      // AI is optional; a status failure must never block the dashboard.
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void refreshAiStatus(), 0);
    return () => clearTimeout(timer);
  }, [refreshAiStatus]);
  useEffect(
    () => () => {
      chatAbort.current?.abort();
    },
    [],
  );
  function clearCoach() {
    setCoachInsight(null);
    setCoachMeta(null);
  }
  async function generateCoach() {
    setCoachBusy(true);
    setCoachError("");
    try {
      const result = await api<CoachResponse>("/api/ai/coach", {
        method: "POST",
        body: "{}",
      });
      setCoachInsight(result.insight);
      setCoachMeta(result.meta);
    } catch (e) {
      setCoachError(
        e instanceof Error ? e.message : "Could not generate an insight",
      );
    } finally {
      setCoachBusy(false);
      void refreshAiStatus();
    }
  }
  async function sendChat(text: string) {
    if (chatStreaming) return;
    const userMessage: ChatMessage = {
      id: newId(),
      role: "user",
      content: text,
    };
    const assistantId = newId();
    const history = [...chatMessages, userMessage]
      .map((message) => ({ role: message.role, content: message.content }))
      .filter((message) => message.content.trim())
      .slice(-8);
    while (history.length && history[0].role === "assistant") history.shift();
    setChatMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setChatStreaming(true);
    setChatError("");
    const abort = new AbortController();
    chatAbort.current = abort;
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abort.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (response.status === 401)
          window.dispatchEvent(new Event("ssc:session-ended"));
        if (body?.error?.code === "AUTH_UNAVAILABLE")
          window.dispatchEvent(new Event("ssc:auth-unavailable"));
        throw new Error(
          body?.error?.message ?? "The coach could not answer. Try again.",
        );
      }
      if (!response.body) throw new Error("The coach returned an empty answer.");
      const reader = response.body.getReader();
      const decoder = new NdjsonDecoder();
      let finished = false;
      const handle = (line: string) => {
        const event = parseChatEvent(line);
        if (!event) return;
        if (event.type === "delta") {
          setChatMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + event.text }
                : message,
            ),
          );
        } else if (event.type === "error") {
          setChatError(event.message);
          finished = true;
        } else if (event.type === "done") {
          finished = true;
        }
      };
      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.push(value)) {
          handle(line);
          if (finished) break;
        }
      }
      for (const line of decoder.flush()) {
        handle(line);
        if (finished) break;
      }
      await reader.cancel().catch(() => undefined);
    } catch (e) {
      if (!abort.signal.aborted)
        setChatError(
          e instanceof Error ? e.message : "The coach could not answer.",
        );
    } finally {
      setChatStreaming(false);
      if (chatAbort.current === abort) chatAbort.current = null;
      void refreshAiStatus();
    }
  }

  /** Plain route change — keeps in-progress state (editing, selection). */
  function go(next: AppView) {
    router.push(VIEW_HREF[next]);
  }
  /** Workspace navigation — starts the destination view from scratch. */
  function navigate(next: AppView) {
    setEditing(undefined);
    if (next === "history") setFilters((f) => ({ ...f, type: "all" }));
    go(next);
  }
  function add() {
    navigate("add");
  }
  useKeyboardShortcuts({
    onAddMock: add,
    onNavigate: (v) => navigate(v),
    onShowHelp: () =>
      toast.info(
        "Shortcuts",
        "n=new mock · g d/h/c/s=navigate · /=focus search · ?=help",
      ),
  });
  function changeFilter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }
  async function remove(a: Attempt) {
    setBusy(true);
    try {
      await api(`/api/mock-attempts/${a.id}`, { method: "DELETE", body: "{}" });
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
  }
  async function download(format: "json" | "csv"): Promise<boolean> {
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
      toast.error("Export failed", e instanceof Error ? e.message : undefined);
      return false;
    }
  }
  async function runPreview(
    file: unknown,
    mode: ImportMode,
    apply: boolean,
  ): Promise<BackupPreview | null> {
    const id = ++previewId.current;
    setBusy(true);
    setSafetyDownloaded(false);
    setReplaceOpen(false);
    try {
      const result = await api<BackupPreview>("/api/backup", {
        method: "POST",
        body: JSON.stringify({
          backup: file,
          preview: true,
          mode,
          applyTarget: apply,
        }),
      });
      if (id !== previewId.current) return null;
      setPreview(result);
      return result;
    } catch (e) {
      if (id === previewId.current) {
        setPreview(null);
        toast.error(
          "Could not preview backup",
          e instanceof Error ? e.message : undefined,
        );
      }
      return null;
    } finally {
      if (id === previewId.current) setBusy(false);
    }
  }
  async function readBackup(file?: File) {
    if (!file) return;
    if (file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv") {
      toast.info(
        "CSV is read-only",
        "Choose the JSON backup file to import.",
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > BACKUP_MAX_BYTES) {
      toast.error("Backup too large", "Backup must be under 4 MB");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      setBackupFile(parsed);
      setBackupName(file.name);
      setPreview(null);
      setImportMode("merge");
      setApplyTarget(false);
      setSafetyDownloaded(false);
      const first = await runPreview(parsed, "merge", false);
      if (first) {
        const recommended =
          first.target.incoming != null && first.target.current == null;
        setApplyTarget(recommended);
        if (recommended) await runPreview(parsed, "merge", true);
      }
    } catch (e) {
      toast.error(
        "Invalid backup",
        e instanceof SyntaxError
          ? "This is not a valid JSON backup file."
          : e instanceof Error
            ? e.message
            : "Invalid backup",
      );
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  function changeImportMode(mode: ImportMode) {
    setImportMode(mode);
    if (backupFile) void runPreview(backupFile, mode, applyTarget);
  }
  function changeApplyTarget(next: boolean) {
    setApplyTarget(next);
    if (backupFile) void runPreview(backupFile, importMode, next);
  }
  async function downloadSafetyBackup() {
    const saved = await download("json");
    if (!saved) return;
    setSafetyDownloaded(true);
    toast.success(
      "Backup downloaded",
      "Verify it in your downloads before replacing.",
    );
  }
  function resetImport() {
    setBackupFile(null);
    setBackupName("");
    setPreview(null);
    setImportMode("merge");
    setApplyTarget(false);
    setSafetyDownloaded(false);
    setReplaceOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  }
  async function commitImport(confirmed: boolean) {
    if (!backupFile || !preview) return;
    if (importMode === "replace" && (!confirmed || !safetyDownloaded)) return;
    setBusy(true);
    setReplaceOpen(false);
    try {
      const result = await api<ImportResult>("/api/backup", {
        method: "POST",
        body: JSON.stringify({
          backup: backupFile,
          preview: false,
          mode: importMode,
          applyTarget,
          previewFingerprint: preview.previewFingerprint,
          confirmReplace: importMode === "replace" && confirmed,
        }),
      });
      const parts: string[] = [];
      if (importMode === "replace")
        parts.push(`Replaced account with ${result.imported} mocks`);
      else if (result.imported) parts.push(`${result.imported} mocks imported`);
      if (result.skipped) parts.push(`${result.skipped} duplicates skipped`);
      if (result.conflicts) parts.push(`${result.conflicts} conflicts added`);
      if (result.deleted)
        parts.push(`${result.deleted} existing mocks removed`);
      if (result.target.applied)
        parts.push(
          result.target.targetScore == null
            ? "target cleared"
            : `target set to ${n(result.target.targetScore)} / 390`,
        );
      toast.success(
        "Backup imported",
        parts.length ? parts.join(" · ") : undefined,
      );
      resetImport();
      await refresh();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not import the backup";
      if (/preview|workspace changed/i.test(message)) {
        setPreview(null);
        setSafetyDownloaded(false);
        toast.warning("Re-previewing backup", message);
        await runPreview(backupFile, importMode, applyTarget);
        return;
      }
      toast.error("Import failed", message);
    } finally {
      setBusy(false);
    }
  }
  async function saveTarget() {
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
  }

  const compared = selected
    .map((id) => allAttempts.find((a) => a.id === id))
    .filter((a): a is Attempt => !!a);

  const platforms = [...new Set(allAttempts.map((a) => a.platform))].sort();
  const dashboardAttempts = (analytics?.sourceAttemptIds ?? [])
    .map((id) => allAttempts.find((attempt) => attempt.id === id))
    .filter((attempt): attempt is Attempt => !!attempt)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const visibleAttempts = view === "dashboard" ? dashboardAttempts : attempts;
  const targetChange =
    preview != null &&
    applyTarget &&
    preview.target.available &&
    preview.target.current !== preview.target.incoming;
  const targetAction = !preview
    ? ""
    : applyTarget && preview.target.available
      ? preview.target.incoming == null
        ? "clear the current target"
        : `set target to ${n(preview.target.incoming)} / 390`
      : "keep the current target";

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
                onClose={() => navigate("dashboard")}
                onSaved={() => {
                  navigate("dashboard");
                  toast.success("Mock saved", "Your progress is up to date.");
                  void refresh();
                }}
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
                          void readBackup(e.target.files?.[0])
                        }
                      />
                    }
                    backupName={backupName}
                    preview={preview}
                    importMode={importMode}
                    changeImportMode={changeImportMode}
                    applyTarget={applyTarget}
                    changeApplyTarget={changeApplyTarget}
                    safetyDownloaded={safetyDownloaded}
                    onDownloadSafety={() => void downloadSafetyBackup()}
                    onReset={resetImport}
                    onCommit={() => void commitImport(false)}
                    targetChange={targetChange}
                    onOpenReplace={() => setReplaceOpen(true)}
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
                          coach={
                            aiStatus?.enabled ? (
                              <AiCoachCard
                                status={aiStatus}
                                insight={coachInsight}
                                meta={coachMeta}
                                busy={coachBusy}
                                error={coachError}
                                onGenerate={() => void generateCoach()}
                                onOpenChat={() => {
                                  setChatError("");
                                  setChatOpen(true);
                                }}
                              />
                            ) : undefined
                          }
                        />
                      </div>
                    )}
                    {view === "compare" ? (
                      <div className="mt-6">
                        <CompareView
                          attempts={attempts}
                          compared={compared}
                          selected={selected}
                          onToggle={(id) =>
                            setSelected((ids) =>
                              ids.includes(id)
                                ? ids.filter((x) => x !== id)
                                : ids.length < 4
                                  ? [...ids, id]
                                  : ids,
                            )
                          }
                          onClear={() => setSelected([])}
                        />
                      </div>
                    ) : (
                      <HistoryPanel
                        mode={view === "dashboard" ? "dashboard" : "history"}
                        attempts={visibleAttempts}
                        totalCount={allAttempts.length}
                        sourceCount={analytics?.sourceAttemptCount ?? 0}
                        search={filters.search ?? ""}
                        onSearch={(value) => changeFilter("search", value)}
                        onViewAll={() => navigate("history")}
                        onOpen={(a) => setDetail(a)}
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
          onClose={() => setDetail(null)}
          onEdit={(a) => {
            setEditing(a);
            setDetail(null);
            go("add");
          }}
          onCompare={(a) => {
            setSelected((ids) =>
              ids.includes(a.id) ? ids : ids.length < 4 ? [...ids, a.id] : ids,
            );
            setDetail(null);
            go("compare");
          }}
          onDelete={(a) => void remove(a)}
          busy={busy}
        />
        <Dialog.Root
          open={replaceOpen && preview !== null}
          onOpenChange={setReplaceOpen}
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
              {preview && (
                <div className="mt-5 space-y-3 text-sm">
                  <p>
                    This permanently deletes{" "}
                    <strong className="tabular">{preview.willDelete}</strong>{" "}
                    existing mocks in this account and imports{" "}
                    <strong className="tabular">{preview.importable}</strong>{" "}
                    mocks from the backup.
                  </p>
                  <p className="text-xs muted">
                    Target: {targetAction}.{" "}
                    {safetyDownloaded
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
                  onClick={() => setReplaceOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy || !safetyDownloaded}
                  onClick={() => void commitImport(true)}
                >
                  Replace account data
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <AiChatDrawer
          open={chatOpen}
          onOpenChange={(open) => {
            if (!open) chatAbort.current?.abort();
            setChatOpen(open);
          }}
          messages={chatMessages}
          streaming={chatStreaming}
          error={chatError}
          onSend={(text) => void sendChat(text)}
          onStop={() => chatAbort.current?.abort()}
          onClear={() => {
            chatAbort.current?.abort();
            setChatMessages([]);
            setChatError("");
          }}
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
