"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatternShape } from "@/lib/domain";
import { examsQueryOptions } from "@/lib/queries/exams";
import {
  activeExamPattern,
  examTierLabel,
  resolvePatternFrom,
  type EffectiveTargetDto,
  type ExamsResponse,
} from "@/lib/queries/exams";

/**
 * The workspace's exam scope: one query (`/api/exams`) backing the active
 * exam+tier, its pattern, every tier's resolved target, and label
 * resolution for any saved attempt's exam+tier. Provided once around the
 * workspace shell so every view — add form, history, analytics, settings —
 * reads the same scope without prop drilling.
 *
 * There is deliberately no second settings query: the payload carries the
 * scope AND the resolved targets, so a write can never leave half of the
 * workspace stale.
 */

export type ExamScope = {
  /** Null only on first load; the shell renders its loading state. */
  exams: ExamsResponse | null;
  /** True when the first load failed — distinct from "still loading". */
  failed: boolean;
  activeExamId: string;
  /** The active tier id, or "all" for the combined view. */
  activeTierId: string;
  /** "examId:tierId" (or "examId:all") of the active scope. */
  activeScopeKey: string;
  /** The active tier's pattern (anchor tier for the combined view). */
  activeShape: PatternShape | null;
  resolveShape: (examId: string, tierId: string) => PatternShape | null;
  examLabel: (examId: string, tierId: string) => string;
  /** The resolved target for one tier ("examId:tierId"), or null. */
  targetForTier: (tierKey: string) => EffectiveTargetDto | null;
  /** The resolved target for the active scope. */
  activeTarget: EffectiveTargetDto | null;
  /** The percentile goal for one exam. */
  percentileFor: (examId: string) => number | null;
  /** Tiers that share one structure signature (who a default applies to). */
  peersFor: (signature: string) => string[];
  refresh: () => void;
};

const ExamScopeContext = createContext<ExamScope | null>(null);

export function ExamScopeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isError } = useQuery(examsQueryOptions);

  const activeExamId = data?.activeExamId ?? "cgl";
  const activeTierId = data?.activeTierId ?? "tier2";
  const activeTierForTarget =
    activeTierId === "all"
      ? (data?.builtIn.find((exam) => exam.id === activeExamId)?.defaultTierId ??
        data?.builtIn.find((exam) => exam.id === activeExamId)?.primaryTierId ??
        data?.customExams.find((exam) => exam.id === activeExamId)?.tiers[0]
          ?.id ??
        activeTierId)
      : activeTierId;

  const value: ExamScope = {
    exams: data ?? null,
    failed: isError,
    activeExamId,
    activeTierId,
    activeScopeKey: `${activeExamId}:${activeTierId}`,
    activeShape: data ? activeExamPattern(data) : null,
    resolveShape: (examId, tierId) =>
      data ? resolvePatternFrom(data, examId, tierId) : null,
    examLabel: (examId, tierId) =>
      data ? examTierLabel(data, examId, tierId) : tierLabelFallback(tierId),
    targetForTier: (tierKey) => data?.resolvedTargets[tierKey] ?? null,
    activeTarget:
      data?.resolvedTargets[`${activeExamId}:${activeTierForTarget}`] ?? null,
    percentileFor: (examId) => data?.percentiles[examId] ?? null,
    peersFor: (signature) => data?.targetPeers[signature] ?? [],
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
