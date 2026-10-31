"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { PlainIcon } from "./icon";
import { useExamScope } from "./exam-context";
import {
  saveScopeRequest,
  switcherEntries,
  type SwitcherEntry,
} from "@/lib/queries/exams";
import { settingsKeys, type TrackerSettings } from "@/lib/queries/settings";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

/**
 * The header exam switcher: one entry per enabled tier ("SSC CGL · Tier 2")
 * plus a combined "· All tiers" entry when an exam has two or more enabled
 * tiers. Switching persists the full scope (PUT /api/settings), and the
 * workspace — dashboard, history, add form, analytics — re-scopes through
 * the exam context.
 */
export function ExamSwitcher({
  onManageExams,
  // Compact rendering for tight headers (mobile pass); cosmetic only.
  compact = false,
}: {
  onManageExams: () => void;
  compact?: boolean;
}) {
  const scope = useExamScope();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  if (!scope.exams) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-8 w-20 shrink-0 items-center rounded-control bg-soft/60"
      />
    );
  }

  const { exams } = scope;
  const entries = switcherEntries(exams);
  const activeKey = `${exams.activeExamId}:${exams.activeTierId}`;
  const active = entries.find((entry) => entry.key === activeKey);

  const switchScope = async (entry: SwitcherEntry) => {
    if (entry.key === activeKey || busy) return;
    setBusy(true);
    try {
      const current =
        queryClient.getQueryData<TrackerSettings>(settingsKeys.current()) ??
        null;
      const settings: TrackerSettings = {
        activeExamId: entry.examId,
        activeTierId: entry.tierId,
        enabledTiers: current?.enabledTiers ?? exams.enabledTiers,
        examTargets: current?.examTargets ?? exams.examTargets,
      };
      const fresh = await saveScopeRequest(settings);
      queryClient.setQueryData(settingsKeys.current(), fresh);
      // The exam payload carries the scope too; refresh it plus every
      // exam-scoped data domain (attempts, analytics, paged lists).
      scope.refresh();
      await queryClient.invalidateQueries({ queryKey: ["mock-attempts"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          aria-label={`Active scope: ${active?.label ?? "exam"}. Switch exam or tier.`}
          className={cn(
            "h-8 max-w-[10rem] gap-1.5 px-2.5 sm:max-w-[16rem]",
            compact && "max-w-8 px-0 sm:max-w-[16rem] sm:px-2.5",
            "data-[state=open]:ring-2 data-[state=open]:ring-rule",
          )}
        >
          <PlainIcon name="layers" size={14} tone="accent" aria-hidden="true" />
          <span className="truncate text-sm font-medium">
            {compact ? null : active?.label}
          </span>
          {compact ? null : (
            <PlainIcon name="chevronDown" size={12} aria-hidden="true" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="normal-case tracking-normal">
          Your exam tiers
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {entries.length === 0 && (
          <DropdownMenuItem disabled>No tiers enabled yet</DropdownMenuItem>
        )}
        {entries.map((entry) => (
          <DropdownMenuItem
            key={entry.key}
            onSelect={() => void switchScope(entry)}
            className={cn(entry.key === activeKey && "bg-soft/70")}
          >
            <span className="flex-1 truncate">
              {entry.label}
              {entry.isCustom ? (
                <span className="ml-1.5 text-[0.625rem] uppercase tracking-wide text-muted">
                  custom
                </span>
              ) : null}
            </span>
            {entry.key === activeKey && (
              <PlainIcon
                name="check"
                size={13}
                tone="accent"
                aria-hidden="true"
              />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onManageExams}>
          Manage exams
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
