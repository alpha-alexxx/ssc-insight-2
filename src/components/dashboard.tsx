"use client";
import { Panel, EmptyChart } from "./dashboard-panels";
import { PerformanceOverview } from "./performance-overview";
import { AuthControl } from "./auth-control";
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

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, MotionConfig } from "motion/react";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Download,
  Ellipsis,
  GitCompareArrows,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Upload,
  X,
} from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "./ui/button";
import { api, MockForm } from "./mock-form";
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
  FULL_MOCK_MAX_SCORE,
  SUBJECTS,
  subjectIds,
  totals,
  subjectStats,
  formatNumber as n,
  formatTime,
} from "@/lib/domain";
import type { Analytics } from "@/lib/analytics";
type View = "dashboard" | "history" | "compare" | "add" | "settings";
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
const longDate = (date: string) =>
  new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
const typeName = (type: string) =>
  type === "full"
    ? "Full mock"
    : type === "sectional"
      ? "Sectional"
      : "Subject";
const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function Dashboard({
  authEnabled = false,
  userEmail = "",
}: {
  authEnabled?: boolean;
  userEmail?: string;
}) {
  const [view, setView] = useState<View>("dashboard");
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
  const [notice, setNotice] = useState("");
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
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [coachInsight, setCoachInsight] = useState<CoachInsight | null>(null);
  const [coachMeta, setCoachMeta] = useState<CoachMeta | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachError, setCoachError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatAbort = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewId = useRef(0);
  const requestId = useRef(0);
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
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  function navigate(next: View) {
    setView(next);
    setEditing(undefined);
    if (next === "history") setFilters((f) => ({ ...f, type: "all" }));
  }
  function add() {
    setEditing(undefined);
    setView("add");
  }
  function changeFilter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }
  async function remove(a: Attempt) {
    if (
      !confirm(
        `Delete “${a.name}”? This permanently removes this result from your tracker.`,
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/api/mock-attempts/${a.id}`, { method: "DELETE", body: "{}" });
      setDetail(null);
      setSelected((ids) => ids.filter((id) => id !== a.id));
      clearCoach();
      setNotice("Mock deleted");
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not delete");
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
          if (parsed.warnings?.length) setNotice(parsed.warnings.join(" "));
        } catch {
          // The server always returns JSON here; validation happens on import.
        }
        if (text.length > BACKUP_MAX_BYTES)
          setNotice(
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
      setNotice(e instanceof Error ? e.message : "Export failed");
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
        setNotice(e instanceof Error ? e.message : "Could not preview backup");
      }
      return null;
    } finally {
      if (id === previewId.current) setBusy(false);
    }
  }
  async function readBackup(file?: File) {
    if (!file) return;
    if (file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv") {
      setNotice(
        "CSV exports are read-only. Choose the JSON backup file to import.",
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > BACKUP_MAX_BYTES) {
      setNotice("Backup must be under 4 MB");
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
      setNotice(
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
    setNotice(
      "Current account backup downloaded. Verify it in your downloads before replacing.",
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
      if (result.deleted) parts.push(`${result.deleted} existing mocks removed`);
      if (result.target.applied)
        parts.push(
          result.target.targetScore == null
            ? "target cleared"
            : `target set to ${n(result.target.targetScore)} / 390`,
        );
      clearCoach();
      setNotice(parts.length ? parts.join(" · ") : "Backup imported");
      resetImport();
      await refresh();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not import the backup";
      if (/preview|workspace changed/i.test(message)) {
        setPreview(null);
        setSafetyDownloaded(false);
        setNotice(message);
        await runPreview(backupFile, importMode, applyTarget);
        return;
      }
      setNotice(message);
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
        <aside className="fixed left-0 top-0 bottom-0 w-[224px] bg-paper border-r border-rule hidden lg:flex flex-col z-20">
          <Link href="/" className="flex items-center px-6 h-24">
            <span className="wordmark">
              ssc<span className="text-accent">insight</span>
              <span className="text-accent">.</span>
              <span className="block font-sans text-[9px] tracking-[.03em] muted font-normal mt-2">
                Your preparation, clearer
              </span>
            </span>
          </Link>
          <div className="px-4 mt-6">
            <p className="section-label px-3 mb-3">Workspace</p>
            <nav aria-label="Main navigation" className="space-y-1">
              {[
                {
                  id: "dashboard" as const,
                  label: "Dashboard",
                  icon: LayoutDashboard,
                },
                {
                  id: "history" as const,
                  label: "Mock history",
                  icon: ClipboardList,
                },
                {
                  id: "compare" as const,
                  label: "Compare mocks",
                  icon: GitCompareArrows,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  className={`nav-button ${view === item.id ? "active" : ""}`}
                  aria-current={view === item.id ? "page" : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <item.icon size={18} />
                  {item.label}
                  {view === item.id && (
                    <span className="ml-auto size-1.5 rounded-none bg-accent" />
                  )}
                </button>
              ))}
            </nav>
            <p className="section-label px-3 mb-3 mt-10">Preferences</p>
            <button
              className={`nav-button ${view === "settings" ? "active" : ""}`}
              aria-current={view === "settings" ? "page" : undefined}
              onClick={() => navigate("settings")}
            >
              <Settings2 size={18} /> Settings & backup
            </button>
          </div>
          <div className="mt-auto mx-5 mb-5 p-4 rounded-none bg-canvas">
            <BookOpen size={20} className="text-accent mb-3" />
            <p className="font-medium text-xs">One mock at a time.</p>
            <p className="text-xs muted leading-relaxed mt-1">
              Consistency is your biggest advantage. Keep showing up.
            </p>
            <div className="mt-4 pt-3 border-t border-rule flex items-center gap-2 text-[11px] muted">
              <span className="size-1.5 rounded-none bg-accent" /> SSC CGL ·
              Tier 2
            </div>
          </div>
          <div className="px-6 py-5 border-t border-rule-soft flex gap-3 items-center">
            <span className="size-9 bg-soft rounded-none flex items-center justify-center text-xs font-medium">
              MY
            </span>
            <div>
              <p className="text-xs font-medium">My workspace</p>
              <p className="text-[11px] muted">Private · your account</p>
            </div>
            <Ellipsis size={17} className="ml-auto muted" />
          </div>
        </aside>
        <div className="lg:ml-[224px]">
          <header className="h-[72px] px-5 md:px-9 bg-paper border-b border-rule flex justify-between items-center gap-3">
            <div className="flex items-center gap-3 text-xs muted">
              <span className="lg:hidden wordmark-mobile text-ink">
                sscinsight<span className="text-accent">.</span>
              </span>
              <span className="hidden lg:inline">My workspace</span>
              <ChevronRight size={13} className="hidden lg:block" />
              <span className="text-ink hidden sm:inline">
                {view === "dashboard"
                  ? "Dashboard"
                  : view === "history"
                    ? "Mock history"
                    : view === "compare"
                      ? "Compare mocks"
                      : view === "add"
                        ? "Log a mock"
                        : "Settings"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:flex items-center gap-2 text-xs muted">
                <span className="size-1.5 rounded-none bg-accent" />
                SSC CGL Tier 2
              </span>
              <span className="h-5 w-px bg-rule-soft hidden sm:block" />
              <button
                title="Open help and setup"
                aria-label="Help and setup"
                onClick={() => navigate("settings")}
                className="muted hover:text-accent"
              >
                <CircleHelp size={19} />
              </button>
              <AuthControl enabled={authEnabled} />
            </div>
          </header>
          <nav
            aria-label="Mobile navigation"
            className="lg:hidden flex gap-1 px-3 py-2 bg-paper border-b overflow-x-auto"
          >
            {(["dashboard", "history", "compare", "settings"] as const).map(
              (v) => (
                <button
                  onClick={() => navigate(v)}
                  aria-current={view === v ? "page" : undefined}
                  key={v}
                  className={`text-xs px-3 py-2 whitespace-nowrap rounded-none ${view === v ? "bg-ink text-paper" : "muted hover:bg-soft"}`}
                >
                  {v === "history"
                    ? "Mock history"
                    : v === "compare"
                      ? "Compare"
                      : v === "settings"
                        ? "Settings"
                        : "Dashboard"}
                </button>
              ),
            )}
          </nav>
          <main className="px-5 md:px-9 py-7 md:py-9 max-w-[1600px] mx-auto">
            {view === "add" ? (
              <MockForm
                key={editing?.id ?? "new"}
                attempt={editing}
                onClose={() => navigate("dashboard")}
                onSaved={() => {
                  clearCoach();
                  navigate("dashboard");
                  setNotice("Mock saved. Your progress is up to date.");
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
                      <ArrowDownToLine size={15} />
                      <span className="hidden sm:inline">Backup</span>
                    </Button>
                    <Button onClick={add}>
                      <Plus size={17} /> Add mock
                    </Button>
                  </div>
                </div>
                {error && (
                  <div
                    role="alert"
                    className="mb-5 flex flex-wrap gap-3 justify-between items-center bg-warning-soft text-warning border border-warning rounded-none px-5 py-4"
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
                      <RefreshCw
                        size={13}
                        className={loading ? "animate-spin" : ""}
                      />{" "}
                      Retry
                    </Button>
                  </div>
                )}
                {view === "settings" ? (
                  <div className="grid xl:grid-cols-2 gap-6">
                    <Panel
                      title="My target"
                      description={
                        target == null
                          ? "Set one target to show it as a percentage on every dashboard tab."
                          : `One goal, shown as ${n(target)} / ${FULL_MOCK_MAX_SCORE} and as a percentage on every dashboard tab.`
                      }
                    >
                      <form
                        className="p-6 pt-2 space-y-4"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setBusy(true);
                          try {
                            await api("/api/settings", {
                              method: "PUT",
                              body: JSON.stringify({
                                targetScore: targetInput
                                  ? Number(targetInput)
                                  : null,
                              }),
                            });
                            setTarget(targetInput ? Number(targetInput) : null);
                            clearCoach();
                            setNotice("Target updated");
                          } catch (e) {
                            setNotice(
                              e instanceof Error ? e.message : "Could not save",
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <label>
                          Target score (out of {FULL_MOCK_MAX_SCORE})
                          <input
                            type="number"
                            min={0}
                            max={FULL_MOCK_MAX_SCORE}
                            step="0.01"
                            placeholder="e.g. 320"
                            value={targetInput}
                            onChange={(e) => setTargetInput(e.target.value)}
                          />
                        </label>
                        <p className="text-xs muted leading-relaxed">
                          The same ratio is applied to subject and sectional
                          charts, so one target works across every view. Leave
                          it empty to turn the reference off.
                        </p>
                        <Button disabled={busy}>Save target</Button>
                      </form>
                    </Panel>
                    <Panel
                      title="Backup & transfer"
                      description="A complete JSON backup you can restore in another account."
                    >
                      <div className="p-6 pt-2 space-y-4">
                        <div className="flex flex-wrap gap-3">
                          <Button onClick={() => void download("json")}>
                            <ArrowDownToLine size={15} /> Download backup
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void download("csv")}
                          >
                            <Download size={15} /> Download CSV (read-only)
                          </Button>
                          <Button
                            variant="outline"
                            disabled={busy}
                            onClick={() => fileRef.current?.click()}
                          >
                            <Upload size={15} /> Import backup
                          </Button>
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
                        </div>
                        <p className="text-xs muted leading-relaxed">
                          The JSON backup is the restorable file. It includes
                          every mock, note, rank, timing, and your target score,
                          but no email or account ID. CSV is for reading in a
                          spreadsheet and cannot be imported.
                        </p>
                        <div className="border border-rule-soft bg-canvas p-4">
                          <p className="text-xs font-medium">
                            Moving to another Google account?
                          </p>
                          <p className="text-xs muted mt-1.5 leading-relaxed">
                            Download the JSON backup here → sign out → sign in
                            with the other account → import the file → review the
                            counts → Merge or Replace. This moves your data, not
                            your Google login identity.
                          </p>
                        </div>
                        {preview && (
                          <div
                            className={`w-full border p-4 ${
                              importMode === "replace"
                                ? "border-danger bg-danger-soft"
                                : "border-rule-soft bg-accent-soft"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">
                                  {backupName || "Backup file"}
                                </p>
                                <p className="text-[11px] muted mt-1">
                                  {preview.legacy
                                    ? "Legacy backup · attempts only"
                                    : `Format v${preview.formatVersion}`}
                                  {preview.exportedAt
                                    ? ` · exported ${longDate(preview.exportedAt)}`
                                    : ""}
                                </p>
                              </div>
                              <span className="text-[11px] muted tabular">
                                {preview.total} attempts ·{" "}
                                {preview.subjectResults} subject results
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <div>
                                <p className="text-[11px] muted">New</p>
                                <p className="font-semibold tabular">
                                  {preview.importable}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] muted">
                                  Duplicates skipped
                                </p>
                                <p className="font-semibold tabular">
                                  {preview.skippedDuplicates}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] muted">Conflicts</p>
                                <p className="font-semibold tabular">
                                  {preview.conflicts}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] muted">
                                  {importMode === "replace"
                                    ? "Mocks to delete"
                                    : "Mocks in this account"}
                                </p>
                                <p className="font-semibold tabular">
                                  {importMode === "replace"
                                    ? preview.willDelete
                                    : preview.existingTargetCount}
                                </p>
                              </div>
                            </div>
                            {importMode === "replace" && (
                              <p className="text-[11px] mt-3 leading-relaxed">
                                Replace deletes{" "}
                                <strong>{preview.willDelete}</strong> existing
                                mocks in this account, then imports{" "}
                                <strong>{preview.importable}</strong> from the
                                backup. Download a safety backup before
                                confirming.
                              </p>
                            )}
                            <div className="mt-4">
                              <p className="text-[11px] font-medium">
                                Import mode
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-2">
                                {(
                                  [
                                    ["merge", "Merge into this account"],
                                    ["replace", "Replace this account"],
                                  ] as const
                                ).map(([mode, label]) => (
                                  <button
                                    key={mode}
                                    type="button"
                                    aria-pressed={importMode === mode}
                                    disabled={busy}
                                    onClick={() => changeImportMode(mode)}
                                    className={`px-3 py-1.5 border text-xs ${
                                      importMode === mode
                                        ? "bg-ink text-paper border-ink"
                                        : "bg-paper text-muted border-rule"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="mt-3">
                              {preview.target.available ? (
                                <label className="!flex !flex-row items-start gap-2 text-xs text-ink">
                                  <input
                                    type="checkbox"
                                    checked={applyTarget}
                                    disabled={busy}
                                    onChange={(e) =>
                                      changeApplyTarget(e.target.checked)
                                    }
                                  />
                                  <span>
                                    {preview.target.incoming == null
                                      ? `Clear the current target${
                                          preview.target.current != null
                                            ? ` (${n(preview.target.current)} / 390)`
                                            : ""
                                        } — the backup has no target`
                                      : `Apply target from backup: ${
                                          preview.target.current == null
                                            ? "none"
                                            : `${n(preview.target.current)} / 390`
                                        } → ${n(preview.target.incoming)} / 390`}
                                  </span>
                                </label>
                              ) : (
                                <p className="text-[11px] muted">
                                  Legacy backup: no target setting to apply.
                                </p>
                              )}
                            </div>
                            {preview.conflicts > 0 && (
                              <p className="text-[11px] mt-3 leading-relaxed">
                                {preview.conflicts} record
                                {preview.conflicts === 1 ? "" : "s"} share a
                                name, date, and type with existing mocks but
                                differ in content. Merge adds them instead of
                                silently dropping them.
                              </p>
                            )}
                            {preview.warnings.length > 0 && (
                              <ul className="mt-3 space-y-1 text-[11px]">
                                {preview.warnings.map((warning) => (
                                  <li key={warning}>{warning}</li>
                                ))}
                              </ul>
                            )}
                            {(preview.samples.skippedDuplicates.length > 0 ||
                              preview.samples.conflicts.length > 0) && (
                              <details className="mt-3 text-[11px]">
                                <summary className="cursor-pointer text-muted">
                                  Review skipped and conflicting records
                                </summary>
                                <div className="mt-2 space-y-2">
                                  {preview.samples.skippedDuplicates.length >
                                    0 && (
                                    <div>
                                      <p className="font-medium">
                                        Duplicates skipped
                                      </p>
                                      <ul className="muted">
                                        {preview.samples.skippedDuplicates.map(
                                          (sample, index) => (
                                            <li key={`${sample}-${index}`}>
                                              {sample}
                                            </li>
                                          ),
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                  {preview.samples.conflicts.length > 0 && (
                                    <div>
                                      <p className="font-medium">Conflicts</p>
                                      <ul className="muted">
                                        {preview.samples.conflicts.map(
                                          (sample, index) => (
                                            <li key={`${sample}-${index}`}>
                                              {sample}
                                            </li>
                                          ),
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                              {importMode === "merge" ? (
                                <Button
                                  size="sm"
                                  disabled={
                                    busy ||
                                    (preview.importable === 0 && !targetChange)
                                  }
                                  onClick={() => void commitImport(false)}
                                >
                                  {preview.importable > 0
                                    ? `Import ${preview.importable} mocks`
                                    : targetChange
                                      ? "Apply target"
                                      : "Nothing to import"}
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => void downloadSafetyBackup()}
                                  >
                                    <ArrowDownToLine size={14} /> Download
                                    current backup
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={busy || !safetyDownloaded}
                                    onClick={() => setReplaceOpen(true)}
                                  >
                                    Replace account data…
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busy}
                                onClick={resetImport}
                              >
                                Cancel
                              </Button>
                            </div>
                            {importMode === "replace" && safetyDownloaded && (
                              <p className="text-[11px] text-positive mt-2">
                                Safety backup downloaded. Verify it before
                                replacing this account.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </Panel>
                    <Panel
                      title="About this tracker"
                      description="Your private SSC CGL Tier 2 results."
                    >
                      <div className="p-6 pt-2 text-sm muted space-y-3">
                        <p>
                          Full mocks include Quant, Reasoning, English and
                          General Awareness, for a total of 390 marks. Computer
                          Knowledge is tracked separately.
                        </p>
                        <p>
                          Default scoring: +3 for correct answers and −1 for
                          incorrect answers. Scores are calculated automatically
                          from the subject question counts.
                        </p>
                        <p>
                          Your mocks, comparisons, backups, and settings are
                          private to your Google account.
                        </p>
                        <p>
                          Your results are saved in Neon Postgres. See README
                          for server connection and Google sign-in setup.
                        </p>
                      </div>
                    </Panel>
                  </div>
                ) : (
                  <>
                    <div className="mb-5 flex flex-wrap items-center gap-3">
                      <div
                        className="flex max-w-full shrink-0 gap-0 overflow-x-auto border border-rule bg-paper p-1"
                        role="group"
                        aria-label={
                          view === "dashboard"
                            ? "Dashboard analysis scope"
                            : "Mock type filter"
                        }
                      >
                        {[
                          { id: "full", label: "Full mocks" },
                          { id: "subject", label: "Subject wise" },
                          { id: "sectional", label: "Sectional wise" },
                          { id: "all", label: "All mocks" },
                        ].map((t) => {
                          const active =
                            view === "dashboard"
                              ? scope === t.id
                              : (filters.type ?? "all") === t.id;
                          return (
                            <button
                              key={t.id}
                              aria-pressed={active}
                              className={`shrink-0 whitespace-nowrap px-2.5 py-1.5 text-xs transition-colors ${active ? "bg-ink text-paper" : "muted hover:bg-soft hover:text-ink"}`}
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
                          className="!w-auto !py-2 text-xs"
                          value={filters.platform ?? "all"}
                          onChange={(e) =>
                            changeFilter("platform", e.target.value)
                          }
                        >
                          <option value="all">All platforms</option>
                          {platforms.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                        {view !== "dashboard" && (
                          <select
                            aria-label="Filter by subject"
                            className="!w-auto !py-2 text-xs"
                            value={filters.subject ?? "all"}
                            onChange={(e) =>
                              changeFilter("subject", e.target.value)
                            }
                          >
                            <option value="all">All subjects</option>
                            {subjectIds.map((id) => (
                              <option key={id} value={id}>
                                {SUBJECTS[id].short}
                              </option>
                            ))}
                          </select>
                        )}
                        <details className="relative">
                          <summary className="border border-rule bg-paper rounded-none py-2 px-3 text-xs text-muted list-none">
                            {filters.from || filters.to
                              ? "Custom dates"
                              : "All time"}{" "}
                            <span className="ml-2">⌄</span>
                          </summary>
                          <div className="absolute right-0 top-10 z-10 bg-paper border rounded-none p-4 w-64  space-y-3">
                            <label>
                              From
                              <input
                                type="date"
                                value={filters.from ?? ""}
                                onChange={(e) =>
                                  changeFilter("from", e.target.value)
                                }
                              />
                            </label>
                            <label>
                              Through
                              <input
                                type="date"
                                value={filters.to ?? ""}
                                onChange={(e) =>
                                  changeFilter("to", e.target.value)
                                }
                              />
                            </label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setFilters((f) => ({ ...f, from: "", to: "" }))
                              }
                            >
                              Clear dates
                            </Button>
                          </div>
                        </details>
                      </div>
                    </div>
                    {loading && (
                      <p
                        role="status"
                        className="text-xs muted mb-4 flex items-center gap-2"
                      >
                        <RefreshCw size={12} className="animate-spin" />{" "}
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
                      <>
                        <Panel
                          title={`Choose your mocks (${compared.length}/4)`}
                          description="Select two to four records below. Filters help you find them."
                        >
                          <div className="divide-y divide-rule-soft max-h-72 overflow-auto">
                            {attempts.length ? (
                              attempts.map((a) => (
                                <label
                                  key={a.id}
                                  className="!flex flex-row items-center gap-3 px-6 py-3 hover:bg-canvas cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(a.id)}
                                    disabled={
                                      selected.length >= 4 &&
                                      !selected.includes(a.id)
                                    }
                                    onChange={() =>
                                      setSelected((ids) =>
                                        ids.includes(a.id)
                                          ? ids.filter((id) => id !== a.id)
                                          : [...ids, a.id],
                                      )
                                    }
                                  />
                                  <span className="flex-1">
                                    <span className="block text-sm text-ink">
                                      {a.name}
                                    </span>
                                    <span className="text-[11px] muted">
                                      {a.platform} · {dateLabel(a.completedAt)}{" "}
                                      · {typeName(a.type)}
                                    </span>
                                  </span>
                                  <span className="text-ink tabular">
                                    {n(totals(a).score)} / {totals(a).maxScore}
                                  </span>
                                </label>
                              ))
                            ) : (
                              <EmptyChart>
                                No mocks match these filters.
                              </EmptyChart>
                            )}
                          </div>
                        </Panel>
                        {compared.length >= 2 ? (
                          <div className="panel mt-6 overflow-auto">
                            <table className="w-full tabular">
                              <thead>
                                <tr>
                                  <th>Comparison</th>
                                  {compared.map((a) => (
                                    <th key={a.id} className="min-w-48">
                                      <span className="block font-semibold text-ink">
                                        {a.name}
                                      </span>
                                      <span className="text-[10px]">
                                        {a.platform} ·{" "}
                                        {dateLabel(a.completedAt)}
                                      </span>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  {
                                    label: "Score",
                                    get: (a: Attempt) =>
                                      `${n(totals(a).score)} / ${totals(a).maxScore}`,
                                  },
                                  {
                                    label: "Score percentage",
                                    get: (a: Attempt) =>
                                      `${n(totals(a).percentage)}%`,
                                  },
                                  {
                                    label: "Difference vs first",
                                    get: (a: Attempt) =>
                                      `${n(totals(a).percentage - totals(compared[0]).percentage)} pp`,
                                  },
                                  {
                                    label: "Accuracy",
                                    get: (a: Attempt) =>
                                      totals(a).accuracy == null
                                        ? "—"
                                        : `${n(totals(a).accuracy)}%`,
                                  },
                                  {
                                    label: "Accuracy change vs first",
                                    get: (a: Attempt) =>
                                      totals(a).accuracy == null ||
                                      totals(compared[0]).accuracy == null
                                        ? "—"
                                        : `${n(totals(a).accuracy! - totals(compared[0]).accuracy!)} pp`,
                                  },
                                  {
                                    label: "Score change vs first",
                                    get: (a: Attempt) =>
                                      totals(a).maxScore ===
                                      totals(compared[0]).maxScore
                                        ? `${n(totals(a).score - totals(compared[0]).score)} marks`
                                        : "Different maximum · compare %",
                                  },
                                  {
                                    label: "Attempted",
                                    get: (a: Attempt) =>
                                      `${totals(a).attempted} / ${totals(a).questions}`,
                                  },
                                  {
                                    label: "Time taken",
                                    get: (a: Attempt) =>
                                      formatTime(totals(a).timeSeconds),
                                  },
                                  {
                                    label: "Attempt change vs first",
                                    get: (a: Attempt) =>
                                      `${totals(a).attempted - totals(compared[0]).attempted} questions`,
                                  },
                                  {
                                    label: "Time change vs first",
                                    get: (a: Attempt) =>
                                      totals(a).timeSeconds == null ||
                                      totals(compared[0]).timeSeconds == null
                                        ? "—"
                                        : `${n((totals(a).timeSeconds! - totals(compared[0]).timeSeconds!) / 60)} min`,
                                  },
                                ].map((row) => (
                                  <tr key={row.label}>
                                    <td className="text-xs muted">
                                      {row.label}
                                    </td>
                                    {compared.map((a) => (
                                      <td key={a.id}>{row.get(a)}</td>
                                    ))}
                                  </tr>
                                ))}
                                {subjectIds.map((id) => (
                                  <tr key={id}>
                                    <td className="text-xs font-medium">
                                      {SUBJECTS[id].short}
                                    </td>
                                    {compared.map((a) => {
                                      const s = a.subjects.find(
                                        (s) => s.subjectId === id,
                                      );
                                      const base = compared[0].subjects.find(
                                        (s) => s.subjectId === id,
                                      );
                                      const t = s ? subjectStats(s) : null;
                                      return (
                                        <td key={a.id}>
                                          {t ? (
                                            <>
                                              <p>
                                                {n(t.score)} / {t.maxScore}{" "}
                                                <span className="text-xs muted">
                                                  ({n(t.percentage)}%)
                                                </span>
                                              </p>
                                              <p className="text-[11px] muted mt-1">
                                                {n(t.accuracy)}% accuracy ·{" "}
                                                {t.attempted} attempted ·{" "}
                                                {formatTime(t.timeSeconds)}
                                              </p>
                                              {base && (
                                                <p className="text-[10px] mt-1 text-accent">
                                                  {n(
                                                    t.percentage -
                                                      subjectStats(base)
                                                        .percentage,
                                                  )}{" "}
                                                  pp vs first
                                                </p>
                                              )}
                                            </>
                                          ) : (
                                            "—"
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <EmptyChart>
                            Select at least two mocks to compare their results.
                          </EmptyChart>
                        )}
                      </>
                    ) : (
                      <Panel
                        title={
                          view === "dashboard" ? "Recent mocks" : "Mock history"
                        }
                        description={
                          view === "dashboard"
                            ? `${analytics?.sourceAttemptCount ?? 0} saved attempt${analytics?.sourceAttemptCount === 1 ? "" : "s"} contribute to this view.`
                            : `${attempts.length} results in this view`
                        }
                        action={
                          view === "dashboard" ? (
                            <button
                              onClick={() => navigate("history")}
                              className="text-accent text-xs flex items-center gap-1 whitespace-nowrap"
                            >
                              View all <ArrowRight size={13} />
                            </button>
                          ) : (
                            <div className="relative">
                              <Search
                                size={14}
                                className="absolute left-2.5 top-2.5 muted"
                              />
                              <input
                                aria-label="Search mocks"
                                placeholder="Search mocks…"
                                className="!pl-8 !py-2 text-xs"
                                value={filters.search ?? ""}
                                onChange={(e) =>
                                  changeFilter("search", e.target.value)
                                }
                              />
                            </div>
                          )
                        }
                      >
                        <div className="overflow-auto">
                          {visibleAttempts.length ? (
                            <table className="w-full whitespace-nowrap tabular">
                              <thead>
                                <tr>
                                  <th>Mock name</th>
                                  <th>Date</th>
                                  <th>Score</th>
                                  <th>Accuracy</th>
                                  <th>Percentile</th>
                                  <th>Time taken</th>
                                  <th>
                                    <span className="sr-only">View result</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {visibleAttempts
                                  .slice(
                                    0,
                                    view === "dashboard"
                                      ? 5
                                      : visibleAttempts.length,
                                  )
                                  .map((a) => {
                                    const t = totals(a);
                                    return (
                                      <tr key={a.id}>
                                        <td>
                                          <button
                                            onClick={() => setDetail(a)}
                                            className="text-left"
                                          >
                                            <span className="text-[13px] font-medium hover:text-accent">
                                              {a.name}
                                            </span>
                                            <span className="block text-[11px] muted mt-1">
                                              {a.platform}{" "}
                                              <span className="mx-1">·</span>{" "}
                                              {typeName(a.type)}
                                            </span>
                                          </button>
                                        </td>
                                        <td className="text-xs muted">
                                          {dateLabel(a.completedAt)}
                                        </td>
                                        <td className="font-medium text-[13px]">
                                          {n(t.score)}
                                          <span className="muted font-normal text-xs">
                                            {" "}
                                            / {t.maxScore}
                                          </span>
                                        </td>
                                        <td className="text-xs">
                                          <span className="bg-positive-soft text-positive rounded-none px-2 py-1">
                                            {n(t.accuracy)}
                                            {t.accuracy != null ? "%" : ""}
                                          </span>
                                        </td>
                                        <td className="text-xs muted">
                                          {n(a.percentile)}
                                          {a.percentile != null ? "%" : ""}
                                        </td>
                                        <td className="text-xs muted">
                                          {formatTime(t.timeSeconds)}
                                        </td>
                                        <td>
                                          <button
                                            className="text-muted hover:text-accent"
                                            aria-label={`View ${a.name}`}
                                            onClick={() => setDetail(a)}
                                          >
                                            <ArrowUpRight size={16} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="py-12 px-5 text-center">
                              <div className="size-12 mx-auto bg-accent-soft text-accent rounded-none flex items-center justify-center mb-4">
                                <ClipboardList size={23} />
                              </div>
                              <h3 className="font-serif text-[22px] leading-tight">
                                Your next chapter starts with one mock.
                              </h3>
                              <p className="text-xs muted mt-2 mb-5">
                                {allAttempts.length
                                  ? "No results match these filters. Try another view."
                                  : "Add your first result to start building your track record."}
                              </p>
                              <Button size="sm" onClick={add}>
                                <Plus size={15} /> Log your first mock
                              </Button>
                            </div>
                          )}
                        </div>
                      </Panel>
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
          </main>
        </div>
        {notice && (
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            role="status"
            className="fixed bottom-6 left-5 right-5 sm:left-auto sm:right-6 max-w-lg z-50 bg-ink text-paper py-3 px-5 rounded-none  flex items-center gap-4 text-sm"
          >
            {notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
        <Dialog.Root
          open={!!detail}
          onOpenChange={(open) => {
            if (!open) setDetail(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-ink/40 z-40" />
            <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-paper border border-rule rounded-none w-[calc(100%-32px)] max-w-4xl max-h-[85vh] overflow-auto p-6 md:p-8 ">
              <Dialog.Title className="font-serif text-3xl leading-tight pr-8">
                {detail?.name}
              </Dialog.Title>
              <Dialog.Description className="muted text-xs mt-2">
                {detail &&
                  `${detail.platform} · ${longDate(detail.completedAt)} · ${typeName(detail.type)}`}
              </Dialog.Description>
              <Dialog.Close
                className="absolute top-5 right-5 muted"
                aria-label="Close result"
              >
                <X size={20} />
              </Dialog.Close>
              {detail && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 py-7 tabular">
                    {[
                      {
                        label: "Score",
                        value: `${n(totals(detail).score)} / ${totals(detail).maxScore}`,
                      },
                      {
                        label: "Accuracy",
                        value:
                          totals(detail).accuracy == null
                            ? "—"
                            : `${n(totals(detail).accuracy, 2)}%`,
                      },
                      {
                        label: "Rank",
                        value: detail.rank
                          ? `${n(detail.rank)} / ${n(detail.participants)}`
                          : "—",
                      },
                      {
                        label: "Percentile",
                        value:
                          detail.percentile != null
                            ? `${n(detail.percentile, 2)}%`
                            : "—",
                      },
                    ].map((s) => (
                      <div key={s.label}>
                        <p className="text-xs muted mb-1">{s.label}</p>
                        <p className="font-serif text-2xl">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full text-xs tabular">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Score</th>
                          <th>Correct</th>
                          <th>Incorrect</th>
                          <th>Skipped</th>
                          <th>Accuracy</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.subjects.map((s) => {
                          const t = subjectStats(s);
                          return (
                            <tr key={s.subjectId}>
                              <td>{SUBJECTS[s.subjectId].short}</td>
                              <td>
                                {n(t.score)} / {t.maxScore}
                              </td>
                              <td>{s.correct}</td>
                              <td>{s.incorrect}</td>
                              <td>{t.unattempted}</td>
                              <td>
                                {n(t.accuracy)}
                                {t.accuracy != null ? "%" : ""}
                              </td>
                              <td>{formatTime(s.timeSeconds)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4 text-xs muted">
                    Overall: {totals(detail).attempted} attempted ·{" "}
                    {formatTime(totals(detail).timeSeconds)}
                  </p>
                  {detail.notes && (
                    <p className="text-sm mt-5 p-4 bg-canvas rounded-none whitespace-pre-wrap">
                      {detail.notes}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-between gap-3 mt-7">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy}
                      onClick={() => void remove(detail)}
                    >
                      Delete mock
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelected((ids) =>
                            ids.includes(detail.id)
                              ? ids
                              : ids.length < 4
                                ? [...ids, detail.id]
                                : ids,
                          );
                          setDetail(null);
                          setView("compare");
                        }}
                      >
                        Compare
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditing(detail);
                          setDetail(null);
                          setView("add");
                        }}
                      >
                        Edit result
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <Dialog.Root
          open={replaceOpen && preview !== null}
          onOpenChange={setReplaceOpen}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-ink/40 z-40" />
            <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-paper border border-rule w-[calc(100%-32px)] max-w-xl p-6 md:p-8">
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
                  <div className="p-3 bg-danger-soft border border-danger text-xs">
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
