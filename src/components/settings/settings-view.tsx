"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PlainIcon } from "../icon";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { SettingsGuardProvider, useSettingsGuard } from "./settings-guard";
import { ExamsPanel } from "./exams-panel";
import { TargetsPanel } from "./targets-panel";
import { RemindersPanel } from "./reminders-panel";
import { DataPanel } from "./data-panel";
import { AboutPanel } from "./about-panel";
import { AppearancePanel } from "../appearance-panel";
import { AiSettingsForm } from "../ai-settings-form";
import { Panel } from "../dashboard-panels";

/**
 * Settings — seven groups behind one navigable rail.
 *
 * The section is a real selection: clicking the rail swaps the rendered
 * panel. (The previous implementation rendered every panel at once with
 * `hidden lg:block`, so the desktop rail only recoloured a button and the
 * page was one long stack.) The selection mirrors to `?section=` so a deep
 * link — "open the percentile target" — can land directly on the group.
 *
 * Each panel owns its draft and registers with the guard, so leaving a
 * section with unsaved edits asks before discarding.
 */

export const SETTINGS_SECTIONS = [
  { id: "exams", label: "Exams & tiers", hint: "Pick what you are preparing for" },
  { id: "targets", label: "Targets", hint: "Percentile goal and marks targets" },
  { id: "reminders", label: "Reminders", hint: "In-app nudges only" },
  { id: "appearance", label: "Appearance", hint: "Palette and visual style" },
  { id: "ai", label: "AI provider", hint: "Model, endpoint and key" },
  { id: "data", label: "Data & backup", hint: "Export, import and transfer" },
  { id: "about", label: "About & account", hint: "What this workspace is" },
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["id"];

const SECTION_IDS = new Set<string>(SETTINGS_SECTIONS.map((s) => s.id));

function isSection(value: string | null): value is SettingsSection {
  return value != null && SECTION_IDS.has(value);
}

/** Read `?section=` once on mount; unknown values fall back to Exams. */
function initialSection(): SettingsSection {
  if (typeof window === "undefined") return "exams";
  const value = new URLSearchParams(window.location.search).get("section");
  return isSection(value) ? value : "exams";
}

export function SettingsView({
  userName,
  userEmail,
  onDownload,
  onChooseFile,
  fileInput,
  backup,
  onOpenReplace,
  saveTarget,
  busy,
  /** Explicit landing section (a deep link). Defaults to `?section=`. */
  initialSectionOverride,
}: {
  userName: string;
  userEmail: string;
  onDownload: (format: "json" | "csv") => void;
  onChooseFile: () => void;
  fileInput: React.ReactNode;
  backup: Omit<
    ReturnType<typeof import("../use-backup-import").useBackupImport>,
    "busy"
  >;
  onOpenReplace: () => void;
  saveTarget: () => Promise<boolean>;
  busy: boolean;
  initialSectionOverride?: SettingsSection;
}) {
  const [section, setSection] = useState<SettingsSection>(
    initialSectionOverride ?? initialSection,
  );

  // Mirror the section into the URL (replaceState, like the other workspace
  // views) so a reload or a shared link reopens the same group.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (section === "exams") url.searchParams.delete("section");
    else url.searchParams.set("section", section);
    window.history.replaceState(null, "", url);
  }, [section]);

  const changeSection = useCallback((next: string) => {
    if (isSection(next)) setSection(next);
  }, []);

  return (
    <SettingsGuardProvider section={section} onSectionChange={changeSection}>
      <div className="grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <SettingsNav section={section} />
        <div className="min-w-0">
          {section === "exams" && <ExamsPanel />}
          {section === "targets" && <TargetsPanel saveTarget={saveTarget} busy={busy} />}
          {section === "reminders" && <RemindersPanel />}
          {section === "appearance" && <AppearancePanel />}
          {section === "ai" && (
            <Panel
              dense
              icon="sparkles"
              title="AI provider"
              description="Optional. The tracker stays fully usable without it."
            >
              <div className="px-4 pb-5 pt-2 sm:px-5">
                <AiSettingsForm showHeading={false} />
              </div>
            </Panel>
          )}
          {section === "data" && (
            <DataPanel
              onDownload={onDownload}
              onChooseFile={onChooseFile}
              fileInput={fileInput}
              backup={backup}
              busy={busy}
              onOpenReplace={onOpenReplace}
            />
          )}
          {section === "about" && (
            <AboutPanel userName={userName} userEmail={userEmail} />
          )}
        </div>
      </div>
    </SettingsGuardProvider>
  );
}

function SettingsNav({ section }: { section: SettingsSection }) {
  const guard = useSettingsGuard();
  return (
    <>
      {/* Rail on desktop; a ruled tab strip on phones. Both are the same
          set of controls, and both actually change the panel. */}
      <nav
        aria-label="Settings sections"
        className="-mx-3 flex gap-1 overflow-x-auto border-b border-rule-soft px-3 pb-px lg:hidden"
      >
        {SETTINGS_SECTIONS.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => guard.requestSection(item.id)}
              className={cn(
                "-mb-px min-h-11 shrink-0 whitespace-nowrap border-b-2 px-3 text-[0.8125rem] font-medium transition-colors",
                active
                  ? "border-accent text-ink"
                  : "border-transparent text-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
      <nav
        aria-label="Settings sections"
        className="hidden h-fit lg:sticky lg:top-[calc(var(--app-header-h)+16px)] lg:block"
      >
        <ul className="flex flex-col gap-0.5">
          {SETTINGS_SECTIONS.map((item) => {
            const active = section === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => guard.requestSection(item.id)}
                  className={cn(
                    "w-full rounded-control px-3 py-2 text-left transition-colors",
                    active
                      ? "bg-ink text-paper"
                      : "text-muted hover:bg-soft hover:text-ink",
                  )}
                >
                  <span className="block text-[0.8125rem] font-medium">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[0.6875rem] leading-snug",
                      active ? "text-paper/70" : "text-muted",
                    )}
                  >
                    {item.hint}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/**
 * Rendered by SettingsView's parent so the dialog is never inside the
 * scrolling content column.
 */
export function SettingsDiscardDialog() {
  const guard = useSettingsGuard();
  const label =
    SETTINGS_SECTIONS.find((s) => s.id === guard.pendingSection)?.label ??
    "another section";
  return (
    <AlertDialog open={guard.confirming} onOpenChange={(open) => !open && guard.cancelDiscard()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have edits in this section that have not been saved. Moving to{" "}
            {label} will discard them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={guard.cancelDiscard}>
            Keep editing
          </AlertDialogCancel>
          <Button variant="destructive" onClick={guard.confirmDiscard} className="sm:order-last">
            <PlainIcon name="close" size={13} /> Discard and continue
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
