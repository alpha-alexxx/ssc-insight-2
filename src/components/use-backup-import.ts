"use client";
import { useCallback, useRef, useState, type RefObject } from "react";
import { useToast } from "./toast";
import { api } from "@/lib/api-client";
import {
  BACKUP_MAX_BYTES,
  type BackupPreview,
  type ImportMode,
  type ImportResult,
} from "@/lib/backup";
import { formatNumber as n } from "@/lib/domain";

/**
 * Backup preview/import workflow behind the settings page: file selection,
 * the preview → fingerprint → confirm ladder, replace-mode safety gating,
 * and the merge/replace commit. Heavy planning lives in lib/backup.ts
 * (server-side); this hook only orchestrates the client side of it.
 *
 * `fileRef` is owned by the shell (the hidden input lives in its JSX); the
 * hook only reads it inside event callbacks to reset the picker. `busy` is
 * shared with the shell's other mutations so settings surfaces disable
 * consistently; `onTargetApplied` lets the shell reload the target when an
 * import applies one.
 */
export function useBackupImport({
  download,
  refresh,
  onTargetApplied,
  setBusy,
  fileRef,
}: {
  download: (format: "json" | "csv") => Promise<boolean>;
  refresh: () => Promise<void>;
  onTargetApplied: () => void;
  setBusy: (busy: boolean) => void;
  fileRef: RefObject<HTMLInputElement | null>;
}) {
  const toast = useToast();
  const [backupFile, setBackupFile] = useState<unknown | null>(null);
  const [backupName, setBackupName] = useState("");
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [applyTarget, setApplyTarget] = useState(false);
  const [safetyDownloaded, setSafetyDownloaded] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const previewId = useRef(0);

  const runPreview = useCallback(
    async (
      file: unknown,
      mode: ImportMode,
      apply: boolean,
    ): Promise<BackupPreview | null> => {
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
    },
    [setBusy, toast],
  );

  const readBackup = useCallback(
    async (file?: File) => {
      if (!file) return;
      if (
        file.name.toLowerCase().endsWith(".csv") ||
        file.type === "text/csv"
      ) {
        toast.info("CSV is read-only", "Choose the JSON backup file to import.");
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
          // Recommend applying when the backup carries settings the
          // account does not have yet (first migration onto the account).
          const recommended = first.settings.available && first.settings.changed;
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
    },
    [fileRef, runPreview, toast],
  );

  const changeImportMode = useCallback(
    (mode: ImportMode) => {
      setImportMode(mode);
      if (backupFile) void runPreview(backupFile, mode, applyTarget);
    },
    [applyTarget, backupFile, runPreview],
  );

  const changeApplyTarget = useCallback(
    (next: boolean) => {
      setApplyTarget(next);
      if (backupFile) void runPreview(backupFile, importMode, next);
    },
    [backupFile, importMode, runPreview],
  );

  const downloadSafetyBackup = useCallback(async () => {
    const saved = await download("json");
    if (!saved) return;
    setSafetyDownloaded(true);
    toast.success(
      "Backup downloaded",
      "Verify it in your downloads before replacing.",
    );
  }, [download, toast]);

  const resetImport = useCallback(() => {
    setBackupFile(null);
    setBackupName("");
    setPreview(null);
    setImportMode("merge");
    setApplyTarget(false);
    setSafetyDownloaded(false);
    setReplaceOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  }, [fileRef]);

  const commitImport = useCallback(
    async (confirmed: boolean) => {
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
        else if (result.imported)
          parts.push(`${result.imported} mocks imported`);
        if (result.skipped) parts.push(`${result.skipped} duplicates skipped`);
        if (result.conflicts) parts.push(`${result.conflicts} conflicts added`);
        if (result.deleted)
          parts.push(`${result.deleted} existing mocks removed`);
        if (result.settings.applied)
          parts.push("exam scope and targets applied");
        toast.success(
          "Backup imported",
          parts.length ? parts.join(" · ") : undefined,
        );
        resetImport();
        if (result.settings.applied) onTargetApplied();
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
    },
    [
      applyTarget,
      backupFile,
      importMode,
      onTargetApplied,
      preview,
      refresh,
      resetImport,
      runPreview,
      safetyDownloaded,
      setBusy,
      toast,
    ],
  );

  return {
    backupName,
    preview,
    importMode,
    applyTarget,
    safetyDownloaded,
    replaceOpen,
    setReplaceOpen,
    readBackup,
    changeImportMode,
    changeApplyTarget,
    downloadSafetyBackup,
    resetImport,
    commitImport,
  };
}
