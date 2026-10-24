"use client";
import { Panel, EmptyChart } from "./dashboard-panels";
import { PerformanceOverview } from "./performance-overview";
import { AuthControl } from "./auth-control";

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
  X,
} from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "./ui/button";
import { api, MockForm } from "./mock-form";
import {
  type Attempt,
  type Filters,
  type SubjectId,
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
export function Dashboard({ authEnabled = false }: { authEnabled?: boolean }) {
  const [view, setView] = useState<View>("dashboard");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [allAttempts, setAllAttempts] = useState<Attempt[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [filters, setFilters] = useState<Filters>({ type: "full" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Attempt>();
  const [detail, setDetail] = useState<Attempt | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState<SubjectId>("quant");
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<number | null>(null);
  const [targetInput, setTargetInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<{
    schemaVersion: number;
    attempts: unknown[];
  } | null>(null);
  const [preview, setPreview] = useState<{
    total: number;
    newRecords: number;
    duplicates: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => !!v),
    );
    try {
      const [rows, stats, all, settings] = await Promise.all([
        api<Attempt[]>(`/api/mock-attempts?${query}`),
        api<Analytics>(`/api/analytics?${query}`),
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
  }, [filters]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 150);
    return () => clearTimeout(timer);
  }, [refresh]);
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
      setNotice("Mock deleted");
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }
  async function download(format: "json" | "csv") {
    try {
      const response = await fetch(`/api/backup?format=${format}`);
      if (!response.ok) {
        const body = await response.json();
        if (response.status === 401)
          window.dispatchEvent(new Event("ssc:session-ended"));
        if (body.error?.code === "AUTH_UNAVAILABLE")
          window.dispatchEvent(new Event("ssc:auth-unavailable"));
        throw new Error(body.error.message);
      }
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `ssc-insight-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Export failed");
    }
  }
  async function readBackup(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error("Backup must be under 2 MB");
      const parsed = JSON.parse(await file.text());
      const result = await api<{
        total: number;
        newRecords: number;
        duplicates: number;
      }>("/api/backup", {
        method: "POST",
        body: JSON.stringify({ ...parsed, preview: true }),
      });
      setBackup(parsed);
      setPreview(result);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Invalid backup");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function restore() {
    if (!backup) return;
    setBusy(true);
    try {
      const result = await api<{ imported: number }>("/api/backup", {
        method: "POST",
        body: JSON.stringify({ ...backup, preview: false }),
      });
      setNotice(`${result.imported} mocks imported`);
      setBackup(null);
      setPreview(null);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }
  const compared = selected
    .map((id) => allAttempts.find((a) => a.id === id))
    .filter((a): a is Attempt => !!a);

  const platforms = [...new Set(allAttempts.map((a) => a.platform))].sort();
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
                      aria-label="Export CSV"
                      onClick={() => void download("csv")}
                    >
                      <Download size={15} />
                      <span className="hidden sm:inline">Export</span>
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
                      title="Your target"
                      description="An optional reference point for your full mocks."
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
                          Target score (out of 390)
                          <input
                            type="number"
                            min={0}
                            max={390}
                            step="0.01"
                            placeholder="e.g. 320"
                            value={targetInput}
                            onChange={(e) => setTargetInput(e.target.value)}
                          />
                        </label>
                        <Button disabled={busy}>Save target</Button>
                      </form>
                    </Panel>
                    <Panel
                      title="Backup & export"
                      description="Your records, ready to take with you."
                    >
                      <div className="p-6 pt-2 flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          onClick={() => void download("json")}
                        >
                          <ArrowDownToLine size={15} /> JSON backup
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void download("csv")}
                        >
                          <Download size={15} /> CSV export
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => fileRef.current?.click()}
                        >
                          Restore JSON
                        </Button>
                        <input
                          className="hidden"
                          type="file"
                          accept=".json,application/json"
                          ref={fileRef}
                          aria-label="Choose backup file"
                          onChange={(e) => void readBackup(e.target.files?.[0])}
                        />
                        <p className="text-xs muted w-full mt-2 leading-relaxed">
                          Restore adds new records and skips duplicates. It does
                          not replace existing results. Review the preview
                          before importing.
                        </p>
                        {preview && (
                          <div className="w-full bg-accent-soft rounded-none p-4">
                            <p className="font-medium">
                              {preview.total} records found
                            </p>
                            <p className="text-sm mt-1">
                              {preview.newRecords} new · {preview.duplicates}{" "}
                              duplicates to skip
                            </p>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                disabled={busy || !preview.newRecords}
                                onClick={() => void restore()}
                              >
                                Import {preview.newRecords} mocks
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setPreview(null);
                                  setBackup(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
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
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      <div className="flex rounded-none border border-rule p-1 bg-paper gap-1">
                        {[
                          { id: "full", label: "Full mocks" },
                          { id: "subject", label: "Subject wise" },
                          { id: "sectional", label: "Sectional" },
                          { id: "all", label: "All mocks" },
                        ].map((t) => (
                          <button
                            key={t.id}
                            aria-pressed={filters.type === t.id}
                            className={`px-3 py-1.5 rounded-none text-xs transition-colors ${filters.type === t.id ? "bg-ink text-paper" : "muted hover:bg-soft"}`}
                            onClick={() => changeFilter("type", t.id)}
                          >
                            {t.label}
                          </button>
                        ))}
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
                      <PerformanceOverview
                        analytics={analytics}
                        target={target}
                        subject={subject}
                        onSubjectChange={setSubject}
                      />
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
                            ? "A little reflection after every attempt goes a long way."
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
                          {attempts.length ? (
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
                                {attempts
                                  .slice(
                                    0,
                                    view === "dashboard" ? 5 : attempts.length,
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
      </div>
    </MotionConfig>
  );
}
