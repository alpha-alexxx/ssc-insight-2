"use client";
import { useState } from "react";
import { PlainIcon, DuotoneIcon } from "./icon";
import { Button } from "./ui/button";
import { Panel } from "./dashboard-panels";
import { AppearancePanel } from "./appearance-panel";
import { AiSettingsForm } from "./ai-settings-form";
import { cn } from "@/lib/utils";
import {
  type BackupPreview,
  type ImportMode,
} from "@/lib/backup";
import { FULL_MOCK_MAX_SCORE, formatNumber as n } from "@/lib/domain";
import { longDate } from "@/lib/format";

/**
 * Settings view — target, backup & transfer, about (Phase 6).
 * Extracted verbatim from dashboard.tsx during the shell split; the
 * preview box was re-composed with the token system (radius-control,
 * consistent warning surfaces, check-row labels).
 */

export type SettingsPanelsProps = {
  target: number | null;
  targetInput: string;
  setTargetInput: (value: string) => void;
  saveTarget: () => Promise<boolean>;
  busy: boolean;
  userName?: string;
  userEmail?: string;
  onDownload: (format: "json" | "csv") => void;
  onChooseFile: () => void;
  fileInput: React.ReactNode;
  backupName: string;
  preview: BackupPreview | null;
  importMode: ImportMode;
  changeImportMode: (mode: ImportMode) => void;
  applyTarget: boolean;
  changeApplyTarget: (apply: boolean) => void;
  safetyDownloaded: boolean;
  onDownloadSafety: () => void;
  onReset: () => void;
  onCommit: () => void;
  targetChange: boolean;
  onOpenReplace: () => void;
};

export function SettingsPanels({
  target,
  targetInput,
  setTargetInput,
  saveTarget,
  busy,
  userName = "",
  userEmail = "",
  onDownload,
  onChooseFile,
  fileInput,
  backupName,
  preview,
  importMode,
  changeImportMode,
  applyTarget,
  changeApplyTarget,
  safetyDownloaded,
  onDownloadSafety,
  onReset,
  onCommit,
  targetChange,
  onOpenReplace,
}: SettingsPanelsProps) {
  const [section, setSection] = useState<
    "study" | "appearance" | "ai" | "data" | "about"
  >("study");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState("");
  const dirty = targetInput !== (target?.toString() ?? "");
  const numeric = targetInput.trim() === "" ? null : Number(targetInput);
  const valid =
    targetInput.trim() === "" ||
    (Number.isFinite(numeric) &&
      numeric != null &&
      numeric >= 0 &&
      numeric <= FULL_MOCK_MAX_SCORE);

  async function submitTarget(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || !valid || busy || saveState === "saving") return;
    setSaveState("saving");
    setSaveError("");
    const ok = await saveTarget();
    if (ok) setSaveState("saved");
    else {
      setSaveState("error");
      setSaveError("The target could not be saved. Your previous value is unchanged.");
    }
  }

  const sections = [
    { id: "study" as const, label: "Study target" },
    { id: "appearance" as const, label: "Appearance" },
    { id: "ai" as const, label: "AI provider" },
    { id: "data" as const, label: "Data & backup" },
    { id: "about" as const, label: "About & account" },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)]">
      <nav
        aria-label="Settings sections"
        className="hidden h-fit lg:sticky lg:top-[72px] lg:block"
      >
        <div className="flex flex-col gap-1">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={section === item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                "rounded-control px-3 py-2 text-left text-xs font-medium transition-colors",
                section === item.id
                  ? "bg-ink text-paper"
                  : "text-muted hover:bg-soft hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex min-w-0 flex-col gap-4">
        <div
          className={section === "study" ? "block" : "block lg:hidden"}
          id="settings-study"
        >
          <Panel
            dense
            icon="target"
            title="Study target"
            description={
              target == null
                ? "One target, shown as a percentage on every performance scope."
                : `Current target: ${n(target)} / ${FULL_MOCK_MAX_SCORE}.`
            }
          >
            <form
              className="flex flex-col gap-3 px-4 pb-4"
              onSubmit={(event) => void submitTarget(event)}
            >
              <label>
                Target score (out of {FULL_MOCK_MAX_SCORE})
                <input
                  type="number"
                  className="no-spin"
                  min={0}
                  max={FULL_MOCK_MAX_SCORE}
                  step="0.01"
                  placeholder="e.g. 320"
                  value={targetInput}
                  aria-invalid={!valid || undefined}
                  onChange={(event) => {
                    setTargetInput(event.target.value);
                    setSaveState("idle");
                    setSaveError("");
                  }}
                />
              </label>
              <p className="text-[11px] leading-relaxed text-muted">
                The same ratio is applied to subject and sectional charts.
                Leave it empty to turn the reference off.
              </p>
              {!valid && (
                <p role="alert" className="text-[11px] text-danger">
                  Enter a score between 0 and {FULL_MOCK_MAX_SCORE}, or leave it
                  empty.
                </p>
              )}
              {saveError && (
                <p role="alert" className="text-[11px] text-danger">
                  {saveError}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={busy || !dirty || !valid || saveState === "saving"}>
                  {saveState === "saving" ? "Saving…" : "Save target"}
                </Button>
                <span
                  role="status"
                  className={cn(
                    "text-[11px]",
                    saveState === "saved" ? "text-positive" : "text-muted",
                  )}
                >
                  {saveState === "saved"
                    ? "Saved"
                    : dirty
                      ? "Unsaved changes"
                      : "No changes"}
                </span>
              </div>
            </form>
          </Panel>
        </div>

        <div
          className={section === "appearance" ? "block" : "block lg:hidden"}
          id="settings-appearance"
        >
          <AppearancePanel />
        </div>

        <div
          className={section === "ai" ? "block" : "block lg:hidden"}
          id="settings-ai"
        >
          <Panel dense icon="sparkles" title="AI provider">
            <AiSettingsForm showHeading={false} />
          </Panel>
        </div>

        <div
          className={section === "data" ? "block" : "block lg:hidden"}
          id="settings-data"
        >
          <Panel
            dense
            icon="shield"
            title="Data & backup"
            description="A complete JSON backup you can restore in another account."
          >
            <div className="flex flex-col gap-3 px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onDownload("json")}>
                  <PlainIcon name="download" size={15} /> Download backup
                </Button>
                <Button variant="outline" onClick={() => onDownload("csv")}>
                  <PlainIcon name="download" size={15} /> CSV (read-only)
                </Button>
                <Button variant="outline" disabled={busy} onClick={onChooseFile}>
                  <PlainIcon name="upload" size={15} /> Import backup
                </Button>
                {fileInput}
              </div>
              <p className="text-[11px] leading-relaxed text-muted">
                JSON includes every mock, note, rank, timing, and the target,
                but no email or account ID. CSV is for reading and cannot be
                imported.
              </p>
              <div className="rounded-control border border-rule-soft bg-canvas p-3">
                <p className="text-[11px] font-medium">
                  Moving to another Google account?
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  Download JSON here → sign out → sign in with the other account
                  → import → review the counts → Merge or Replace. This moves
                  your data, not your Google login identity.
                </p>
              </div>
              {preview && (
                <BackupPreviewCard
                  preview={preview}
                  backupName={backupName}
                  importMode={importMode}
                  changeImportMode={changeImportMode}
                  applyTarget={applyTarget}
                  changeApplyTarget={changeApplyTarget}
                  busy={busy}
                  safetyDownloaded={safetyDownloaded}
                  onDownloadSafety={onDownloadSafety}
                  onReset={onReset}
                  onCommit={onCommit}
                  targetChange={targetChange}
                  onOpenReplace={onOpenReplace}
                />
              )}
            </div>
          </Panel>
        </div>

        <div
          className={section === "about" ? "block" : "block lg:hidden"}
          id="settings-about"
        >
          <Panel
            dense
            icon="book"
            title="About & account"
            description="Your private SSC CGL Tier 2 workspace."
          >
            <div className="flex flex-col gap-3 px-4 pb-4 text-xs leading-relaxed text-muted">
              <div className="rounded-control border border-rule-soft bg-canvas p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Signed in as
                </p>
                <p className="mt-1 text-sm font-medium text-ink">
                  {userName || "Private workspace"}
                </p>
                <p className="text-[11px]">{userEmail || "Account email unavailable"}</p>
              </div>
              <p>
                Full mocks include Quant, Reasoning, English and General
                Awareness for 390 marks. Computer Knowledge is tracked
                separately as a qualifying subject.
              </p>
              <p>
                Scoring is +3 correct and −1 incorrect. Scores are derived from
                subject counts; only derived display values are stored in the
                analytics layer.
              </p>
              <p>
                Mocks, comparisons, backups, and settings are private to your
                Google account. A portable JSON export lives under Data &
                backup.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function BackupPreviewCard({
  preview,
  backupName,
  importMode,
  changeImportMode,
  applyTarget,
  changeApplyTarget,
  busy,
  safetyDownloaded,
  onDownloadSafety,
  onReset,
  onCommit,
  targetChange,
  onOpenReplace,
}: {
  preview: BackupPreview;
  backupName: string;
  importMode: ImportMode;
  changeImportMode: (mode: ImportMode) => void;
  applyTarget: boolean;
  changeApplyTarget: (apply: boolean) => void;
  busy: boolean;
  safetyDownloaded: boolean;
  onDownloadSafety: () => void;
  onReset: () => void;
  onCommit: () => void;
  targetChange: boolean;
  onOpenReplace: () => void;
}) {
  return (
    <div
      className={`w-full border rounded-control p-4 ${
        importMode === "replace"
          ? "border-danger bg-danger-soft"
          : "border-rule-soft bg-accent-soft"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{backupName || "Backup file"}</p>
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
          {preview.total} attempts · {preview.subjectResults} subject results
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["New", preview.importable],
            ["Duplicates skipped", preview.skippedDuplicates],
            ["Conflicts", preview.conflicts],
            [
              importMode === "replace"
                ? "Mocks to delete"
                : "Mocks in this account",
              importMode === "replace"
                ? preview.willDelete
                : preview.existingTargetCount,
            ],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] muted">{label}</p>
            <p className="font-semibold tabular">{value}</p>
          </div>
        ))}
      </div>
      {importMode === "replace" && (
        <p className="text-[11px] mt-3 leading-relaxed">
          Replace deletes <strong>{preview.willDelete}</strong> existing mocks
          in this account, then imports <strong>{preview.importable}</strong>{" "}
          from the backup. Download a safety backup before confirming.
        </p>
      )}
      <div className="mt-4">
        <p className="text-[11px] font-medium">Import mode</p>
        <div
          role="group"
          aria-label="Import mode"
          className="segment-group mt-1.5"
        >
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
              className="segment"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        {preview.target.available ? (
          <label className="check-row items-start text-xs">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={applyTarget}
              disabled={busy}
              onChange={(e) => changeApplyTarget(e.target.checked)}
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
          {preview.conflicts === 1 ? "" : "s"} share a name, date, and type
          with existing mocks but differ in content. Merge adds them instead of
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
            {preview.samples.skippedDuplicates.length > 0 && (
              <div>
                <p className="font-medium">Duplicates skipped</p>
                <ul className="muted">
                  {preview.samples.skippedDuplicates.map((sample, index) => (
                    <li key={`${sample}-${index}`}>{sample}</li>
                  ))}
                </ul>
              </div>
            )}
            {preview.samples.conflicts.length > 0 && (
              <div>
                <p className="font-medium">Conflicts</p>
                <ul className="muted">
                  {preview.samples.conflicts.map((sample, index) => (
                    <li key={`${sample}-${index}`}>{sample}</li>
                  ))}
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
            disabled={busy || (preview.importable === 0 && !targetChange)}
            onClick={onCommit}
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
              onClick={onDownloadSafety}
            >
              <PlainIcon name="download" size={14} /> Download current backup
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || !safetyDownloaded}
              onClick={onOpenReplace}
            >
              Replace account data…
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" disabled={busy} onClick={onReset}>
          Cancel
        </Button>
      </div>
      {importMode === "replace" && safetyDownloaded && (
        <p className="flex items-center gap-1.5 text-[11px] text-positive mt-2">
          <DuotoneIcon name="success" size={13} tone="accent" />
          Safety backup downloaded. Verify it before replacing this account.
        </p>
      )}
    </div>
  );
}
