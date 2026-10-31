"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatternShape } from "@/lib/domain";
import { examsQueryOptions } from "@/lib/queries/exams";
import {
  activeExamPattern,
  examTierLabel,
  resolvePatternFrom,
  type ExamsResponse,
} from "@/lib/queries/exams";

/**
 * The workspace's exam scope: one query (/api/exams) backing the active
 * exam+tier, its pattern, and label resolution for any saved attempt's
 * exam+tier. Provided once around the workspace shell so every view — add
 * form, history, analytics, settings — reads the same scope without prop
 * drilling.
 */

export type ExamScope = {
  /** Null only on first load; the shell renders its loading state. */
  exams: ExamsResponse | null;
  activeExamId: string;
  /** The active tier id, or "all" for the combined view. */
  activeTierId: string;
  /** "examId:tierId" (or "examId:all") of the active scope. */
  activeScopeKey: string;
  /** The active tier's pattern (primary-tier anchor when combined). */
  activeShape: PatternShape | null;
  resolveShape: (examId: string, tierId: string) => PatternShape | null;
  examLabel: (examId: string, tierId: string) => string;
  targetFor: (examId: string) => number | null;
  refresh: () => void;
};

const ExamScopeContext = createContext<ExamScope | null>(null);

export function ExamScopeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data } = useQuery(examsQueryOptions);

  const value: ExamScope = {
    exams: data ?? null,
    activeExamId: data?.activeExamId ?? "cgl",
    activeTierId: data?.activeTierId ?? "tier2",
    activeScopeKey: data
      ? `${data.activeExamId}:${data.activeTierId}`
      : "cgl:tier2",
    activeShape: data ? activeExamPattern(data) : null,
    resolveShape: (examId, tierId) =>
      data ? resolvePatternFrom(data, examId, tierId) : null,
    examLabel: (examId, tierId) =>
      data
        ? examTierLabel(data, examId, tierId)
        : tierLabelFallback(tierId),
    targetFor: (examId) => data?.examTargets[examId] ?? null,
    refresh: () => {
      void queryClient.invalidateQueries({ queryKey: examsQueryOptions.queryKey });
    },
  };

  return (
    <ExamScopeContext.Provider value={value}>
      {children}
    </ExamScopeContext.Provider>
  );
}

function tierLabelFallback(tierId: string) {
  return tierId === "main" ? "Main" : tierId;
}

export function useExamScope(): ExamScope {
  const value = useContext(ExamScopeContext);
  if (!value) throw new Error("useExamScope must be used within ExamScopeProvider");
  return value;
}
