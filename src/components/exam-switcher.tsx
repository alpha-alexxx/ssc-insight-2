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
import { saveScopeRequest, type ExamsResponse } from "@/lib/queries/exams";
import { settingsKeys, type TrackerSettings } from "@/lib/queries/settings";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

/**
 * The header exam switcher: every enabled exam (built-ins + the user's
 * custom exams) with the active one checked. Switching persists the scope
 * (PUT /api/settings), and the whole workspace — dashboard, history, add
 * form, analytics — re-scopes through the exam context.
 */
export function ExamSwitcher({
  onManageExams,
}: {
  onManageExams: () => void;
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
  const options = examOptions(exams);
  const active = options.find((exam) => exam.id === scope.activeExamId);

  const switchExam = async (examId: string) => {
    if (examId === scope.activeExamId || busy) return;
    setBusy(true);
    try {
      const current =
        queryClient.getQueryData<TrackerSettings>(settingsKeys.current()) ??
        null;
      const settings: TrackerSettings = {
        activeExamId: examId,
        enabledExams: current?.enabledExams ?? exams.enabledExams,
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
          aria-label={`Active exam: ${active?.name ?? "exam"}. Switch exam.`}
          className={cn(
            "h-8 max-w-[9rem] gap-1.5 px-2.5 sm:max-w-[13rem]",
            "data-[state=open]:ring-2 data-[state=open]:ring-rule",
          )}
        >
          <PlainIcon name="layers" size={14} tone="accent" aria-hidden="true" />
          <span className="truncate text-sm font-medium">{active?.name}</span>
          <PlainIcon name="chevronDown" size={12} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[13rem]">
        <DropdownMenuLabel className="normal-case tracking-normal">
          Your exams
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((exam) => (
          <DropdownMenuItem
            key={exam.id}
            onSelect={() => void switchExam(exam.id)}
            className={cn(exam.id === scope.activeExamId && "bg-soft/70")}
          >
            <span className="flex-1 truncate">
              {exam.name}
              {exam.isCustom ? (
                <span className="ml-1.5 text-[0.625rem] uppercase tracking-wide text-muted">
                  custom
                </span>
              ) : null}
            </span>
            {exam.id === scope.activeExamId && (
              <PlainIcon name="check" size={13} tone="accent" aria-hidden="true" />
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

type ExamOption = { id: string; name: string; isCustom: boolean };

function examOptions(exams: ExamsResponse): ExamOption[] {
  const enabled = new Set(exams.enabledExams);
  const builtIn = exams.builtIn
    .filter((exam) => enabled.has(exam.id) || exam.id === exams.activeExamId)
    .map((exam) => ({ id: exam.id, name: exam.name, isCustom: false }));
  const custom = exams.customExams.map((exam) => ({
    id: exam.id,
    name: exam.name,
    isCustom: true,
  }));
  return [...builtIn, ...custom];
}
