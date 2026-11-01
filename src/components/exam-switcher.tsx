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
  examsKeys,
  putScopeRequest,
  switcherEntries,
  type SwitcherEntry,
} from "@/lib/queries/exams";
import { attemptKeys } from "@/lib/queries/attempts";
import { analyticsKeys } from "@/lib/queries/analytics";
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
        className="inline-flex size-11 shrink-0 items-center rounded-control bg-soft/40 sm:h-8 sm:w-20"
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
      // Scope-only write: the server keeps the target envelope and
      // preferences exactly as they are, so switching tiers can never
      // overwrite a target edited elsewhere. The response is the full fresh
      // workspace, patched straight into the one cache.
      const fresh = await putScopeRequest({
        activeExamId: entry.examId,
        activeTierId: entry.tierId,
        enabledTiers: exams.enabledTiers,
      });
      queryClient.setQueryData(examsKeys.current(), fresh);
      // Attempts and analytics are tier-scoped, so the new scope invalidates
      // both (paged lists, the detail cache and the dashboard payload).
      await queryClient.invalidateQueries({ queryKey: attemptKeys.all });
      await queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
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
