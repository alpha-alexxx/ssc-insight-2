"use client";
import { PlainIcon, DuotoneIcon } from "./icon";
import { Button } from "./ui/button";
import { Panel } from "./dashboard-panels";
import { AppearancePanel } from "./appearance-panel";
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
  saveTarget: () => void;
  busy: boolean;
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
  return (
    <div className="grid xl:grid-cols-2 gap-6">
      <div className="xl:col-span-2">
        <AppearancePanel />
      </div>
      <Panel
        icon="target"
        title="My target"
        description={
          target == null
            ? "Set one target to show it as a percentage on every dashboard tab."
            : `One goal, shown as ${n(target)} / ${FULL_MOCK_MAX_SCORE} and as a percentage on every dashboard tab.`
        }
      >
        <form
          className="p-6 pt-2 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveTarget();
          }}
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
              onChange={(e) => setTargetInput(e.target.value)}
            />
          </label>
          <p className="text-xs muted leading-relaxed">
            The same ratio is applied to subject and sectional charts, so one
            target works across every view. Leave it empty to turn the
            reference off.
          </p>
          <Button disabled={busy}>Save target</Button>
        </form>
      </Panel>
      <Panel
        icon="shield"
        title="Backup &amp; transfer"
        description="A complete JSON backup you can restore in another account."
      >
        <div className="p-6 pt-2 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onDownload("json")}>
              <PlainIcon name="download" size={15} /> Download backup
            </Button>
            <Button variant="outline" onClick={() => onDownload("csv")}>
              <PlainIcon name="download" size={15} /> Download CSV (read-only)
            </Button>
            <Button variant="outline" disabled={busy} onClick={onChooseFile}>
              <PlainIcon name="upload" size={15} /> Import backup
            </Button>
            {fileInput}
          </div>
          <p className="text-xs muted leading-relaxed">
            The JSON backup is the restorable file. It includes every mock,
            note, rank, timing, and your target score, but no email or account
            ID. CSV is for reading in a spreadsheet and cannot be imported.
          </p>
          <div className="border border-rule-soft bg-canvas rounded-control p-4">
            <p className="text-xs font-medium">
              Moving to another Google account?
            </p>
            <p className="text-xs muted mt-1.5 leading-relaxed">
              Download the JSON backup here → sign out → sign in with the other
              account → import the file → review the counts → Merge or Replace.
              This moves your data, not your Google login identity.
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
      <Panel
        icon="book"
        title="About this tracker"
        description="Your private SSC CGL Tier 2 results."
      >
        <div className="p-6 pt-2 text-sm muted space-y-3">
          <p>
            Full mocks include Quant, Reasoning, English and General Awareness,
            for a total of 390 marks. Computer Knowledge is tracked separately.
          </p>
          <p>
            Default scoring: +3 for correct answers and −1 for incorrect
            answers. Scores are calculated automatically from the subject
            question counts.
          </p>
          <p>
            Your mocks, comparisons, backups, and settings are private to your
            Google account.
          </p>
          <p>
            Results are stored in your own configured database; a one-click
            JSON export lives under Backup &amp; transfer whenever you want a
            portable copy.
          </p>
        </div>
      </Panel>
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
