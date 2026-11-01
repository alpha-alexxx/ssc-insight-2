"use client";

import { Panel } from "../dashboard-panels";
import { PlainIcon, DuotoneIcon } from "../icon";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { longDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BackupPreview, ImportMode } from "@/lib/backup";

/**
 * Data & backup. The JSON export is the account's whole study record — mocks
 * AND planner work — so moving accounts no longer silently loses completions,
 * notes and personal tasks. The preview states exactly what an import adds,
 * including planner rows, before anything is written.
 */
export function DataPanel({
  onDownload,
  onChooseFile,
  fileInput,
  backup,
  busy,
  onOpenReplace,
}: {
  onDownload: (format: "json" | "csv") => void;
  onChooseFile: () => void;
  fileInput: React.ReactNode;
  backup: {
    preview: BackupPreview | null;
    backupName: string;
    importMode: ImportMode;
    changeImportMode: (mode: ImportMode) => void;
    applyTarget: boolean;
    changeApplyTarget: (apply: boolean) => void;
    safetyDownloaded: boolean;
    downloadSafetyBackup: () => Promise<void>;
    resetImport: () => void;
    commitImport: (confirmed: boolean) => Promise<void>;
  };
  busy: boolean;
  onOpenReplace: () => void;
}) {
  const { preview } = backup;
  const settingsChange =
    preview != null &&
    backup.applyTarget &&
    preview.settings.available &&
    preview.settings.changed;

  return (
    <div className="flex flex-col gap-4">
      <Panel
        dense
        icon="download"
        title="Export"
        description="Take your record with you, in either format."
      >
        <div className="px-4 pb-4">
          <Tabs defaultValue="json">
            <TabsList aria-label="Export format">
              <TabsTrigger value="json">JSON backup</TabsTrigger>
              <TabsTrigger value="csv">CSV (read-only)</TabsTrigger>
            </TabsList>
            <TabsContent value="json">
              <p className="text-xs leading-relaxed text-muted">
                A complete, portable backup: every mock and subject result with
                its notes, rank, percentile and timing, your exam scope and
                targets, custom exams, and all planner work — plan progress,
                day notes, personal tasks and groups. It contains no email,
                account id or credentials, so it imports cleanly into a
                different Google account.
              </p>
              <Button className="mt-3 max-sm:w-full" onClick={() => onDownload("json")}>
                <PlainIcon name="download" size={15} /> Download JSON backup
              </Button>
            </TabsContent>
            <TabsContent value="csv">
              <p className="text-xs leading-relaxed text-muted">
                A spreadsheet of your mock results. CSV is for reading only —
                it cannot be imported, and it does not include planner work.
              </p>
              <Button
                variant="outline"
                className="mt-3 max-sm:w-full"
                onClick={() => onDownload("csv")}
              >
                <PlainIcon name="download" size={15} /> Download CSV
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </Panel>

      <Panel
        dense
        icon="upload"
        title="Import"
        description="Preview first; nothing is written until you confirm."
      >
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={onChooseFile}>
              <PlainIcon name="upload" size={15} /> Choose backup file
            </Button>
            {fileInput}
          </div>
          {!preview && (
            <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted">
              Imports are atomic and capped at 4 MB. Merge keeps what you have
              and skips exact duplicates; replace deletes this account&apos;s
              mocks first and needs a safety download.
            </p>
          )}
          {preview && (
            <BackupPreviewCard
              preview={preview}
              backupName={backup.backupName}
              importMode={backup.importMode}
              changeImportMode={backup.changeImportMode}
              applyTarget={backup.applyTarget}
              changeApplyTarget={backup.changeApplyTarget}
              busy={busy}
              safetyDownloaded={backup.safetyDownloaded}
              onDownloadSafety={() => void backup.downloadSafetyBackup()}
              onReset={backup.resetImport}
              onCommit={() => void backup.commitImport(false)}
              settingsChange={settingsChange}
              onOpenReplace={onOpenReplace}
            />
          )}
        </div>
      </Panel>

      <Panel
        dense
        icon="user"
        title="Moving to another Google account"
        description="This moves your data, not your login identity."
      >
        <div className="px-4 pb-4">
          <ol className="space-y-1.5 text-xs leading-relaxed text-muted">
            <li>1. Download the JSON backup here.</li>
            <li>2. Sign out.</li>
            <li>3. Sign in with the other Google account.</li>
            <li>4. Import the file and review the preview.</li>
            <li>5. Choose Merge or Replace.</li>
          </ol>
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
  settingsChange,
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
  settingsChange: boolean;
  onOpenReplace: () => void;
}) {
  const plannerRows =
    preview.planner.planTasks +
    preview.planner.planDays +
    preview.planner.personalTasks;
  return (
    <div
      className={cn(
        "mt-3 w-full rounded-control border p-4",
        importMode === "replace"
          ? "border-danger bg-danger-soft"
          : "border-rule-soft bg-accent-soft",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">
            {backupName || "Backup file"}
          </p>
          <p className="mt-1 text-[0.6875rem] text-muted">
            {preview.legacy
              ? "Legacy backup · attempts only"
              : `Format v${preview.formatVersion}`}
            {preview.exportedAt
              ? ` · exported ${longDate(preview.exportedAt)}`
              : ""}
          </p>
        </div>
        <span className="text-[0.6875rem] tabular text-muted">
          {preview.total} attempt{preview.total === 1 ? "" : "s"} ·{" "}
          {preview.subjectResults} subject result
          {preview.subjectResults === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["New mocks", preview.importable],
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
            <p className="text-[0.6875rem] text-muted">{label}</p>
            <p className="font-semibold tabular">{value}</p>
          </div>
        ))}
      </div>

      {plannerRows > 0 && (
        <div className="mt-3 rounded-control border border-rule-soft bg-paper p-2.5">
          <p className="text-[0.6875rem] font-medium text-ink">
            Planner work in this file
          </p>
          <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-muted">
            {preview.planner.planTasks} plan task progress ·{" "}
            {preview.planner.planDays} day records ·{" "}
            {preview.planner.personalTasks} personal tasks ·{" "}
            {preview.planner.todoGroups} groups. Planner work is always merged:
            a completed item never becomes incomplete, and a re-import never
            reopens a task you have since finished.
          </p>
        </div>
      )}

      {importMode === "replace" && (
        <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink">
          Replace deletes <strong>{preview.willDelete}</strong> existing mocks
          in this account, then imports <strong>{preview.importable}</strong>{" "}
          from the backup. Planner work is never deleted.
        </p>
      )}

      <div className="mt-4">
        <p className="text-[0.6875rem] font-medium text-ink">Import mode</p>
        <div role="group" aria-label="Import mode" className="segment-group mt-1.5">
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
        {preview.settings.available ? (
          <label className="check-row items-start text-xs">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={applyTarget}
              disabled={busy}
              onChange={(e) => changeApplyTarget(e.target.checked)}
            />
            <span>
              Apply scope and targets from the backup (exam, enabled tiers,
              percentile goals and tier targets)
            </span>
          </label>
        ) : (
          <p className="text-[0.6875rem] text-muted">
            This backup has no settings to apply.
          </p>
        )}
      </div>

      {preview.conflicts > 0 && (
        <p className="mt-3 text-[0.6875rem] leading-relaxed">
          {preview.conflicts} record{preview.conflicts === 1 ? "" : "s"} share a
          name, date and type with existing mocks but differ in content. Merge
          adds them rather than silently dropping them.
        </p>
      )}

      {preview.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-[0.6875rem]">
          {preview.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <div className="action-row mt-4 sm:justify-start">
        {importMode === "merge" ? (
          <Button
            size="sm"
            disabled={busy || (preview.importable === 0 && !settingsChange)}
            onClick={onCommit}
          >
            {preview.importable > 0
              ? `Import ${preview.importable} mock${preview.importable === 1 ? "" : "s"}`
              : settingsChange
                ? "Apply settings"
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
        <p className="mt-2 flex items-center gap-1.5 text-[0.6875rem] text-positive">
          <DuotoneIcon name="success" size={13} tone="accent" />
          Safety backup downloaded. Verify it before replacing this account.
        </p>
      )}
    </div>
  );
}
