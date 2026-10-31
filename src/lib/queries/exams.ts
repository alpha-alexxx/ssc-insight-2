import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ExamDef } from "@/lib/exams";
import type { PatternShape, SubjectId } from "@/lib/domain";
import type { TrackerSettingsShape } from "@/lib/exam-settings";
import { ALL_TIERS_ID } from "@/lib/exams";

/**
 * Exams domain: the built-in catalog, the user's custom exams (per-tier
 * patterns), and the tier-level workspace scope (enabled "examId:tierId"
 * keys, active exam+tier, per-exam targets). One query feeds the switcher,
 * the add form, and the settings panel.
 */

export type CustomTierDto = {
  id: string;
  label: string;
  subjects: { subjectId: SubjectId; questions: number; qualifying: boolean }[];
  marking: { correct: number; incorrect: number };
  maxScore: number;
};

export type CustomExamDto = {
  id: string;
  name: string;
  tiers: CustomTierDto[];
};

export type ExamsResponse = {
  builtIn: ExamDef[];
  customExams: CustomExamDto[];
  activeExamId: string;
  activeTierId: string;
  enabledTiers: string[];
  examTargets: Record<string, number | null>;
};

export type CustomTierInput = {
  id?: string;
  label: string;
  subjects: { subjectId: SubjectId; questions: number; qualifying: boolean }[];
  marking: { correct: number; incorrect: number };
};

export type CustomExamInput = {
  id?: string;
  name: string;
  tiers: CustomTierInput[];
};

export const examsKeys = {
  all: ["exams"] as const,
  current: () => [...examsKeys.all, "current"] as const,
};

export const examsQueryOptions = queryOptions({
  queryKey: examsKeys.current(),
  staleTime: 10 * 60_000,
  queryFn: ({ signal }) => api<ExamsResponse>("/api/exams", { signal }),
});

export async function createCustomExamRequest(input: CustomExamInput) {
  return api<{ id: string }>("/api/exams", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCustomExamRequest(input: CustomExamInput & { id: string }) {
  return api<{ id: string }>("/api/exams", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteCustomExamRequest(id: string) {
  return api<{ id: string }>("/api/exams", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

/** Persist the workspace scope (active exam+tier, enablement, targets). */
export async function saveScopeRequest(settings: TrackerSettingsShape) {
  return api<TrackerSettingsShape>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

/** Resolve any exam+tier the user can reach to its concrete pattern. */
export function resolvePatternFrom(
  response: ExamsResponse,
  examId: string,
  tierId: string,
): PatternShape | null {
  const builtIn = response.builtIn.find((exam) => exam.id === examId);
  if (builtIn) {
    const tier = builtIn.tiers.find((t) => t.id === tierId);
    if (!tier) return null;
    return {
      examId: builtIn.id,
      tierId: tier.id,
      subjects: tier.subjects,
      marking: tier.marking,
      sections: tier.sections,
    };
  }
  const custom = response.customExams.find((exam) => exam.id === examId);
  const tier = custom?.tiers.find((t) => t.id === tierId);
  if (!custom || !tier) return null;
  return {
    examId: custom.id,
    tierId: tier.id,
    subjects: tier.subjects,
    marking: tier.marking,
    sections: [],
  };
}

/** The active tier's pattern; the combined "all" view anchors on the
 * exam's primary tier. */
export function activeExamPattern(response: ExamsResponse): PatternShape | null {
  const tierId =
    response.activeTierId === ALL_TIERS_ID
      ? (response.builtIn.find((exam) => exam.id === response.activeExamId)
          ?.primaryTierId ??
        response.customExams.find((exam) => exam.id === response.activeExamId)
          ?.tiers[0]?.id ??
        response.activeTierId)
      : response.activeTierId;
  return resolvePatternFrom(response, response.activeExamId, tierId);
}

/** "SSC CGL · Tier 2" / "My Exam · Mains" for any attempt's exam+tier. */
export function examTierLabel(
  response: ExamsResponse,
  examId: string,
  tierId: string,
): string {
  const examName =
    response.builtIn.find((exam) => exam.id === examId)?.name ??
    response.customExams.find((exam) => exam.id === examId)?.name;
  if (tierId === ALL_TIERS_ID)
    return examName ? `${examName} · All tiers` : "All tiers";
  const builtIn = response.builtIn.find((exam) => exam.id === examId);
  const tierLabel =
    builtIn?.tiers.find((t) => t.id === tierId)?.label ??
    (builtIn
      ? null
      : response.customExams
          .find((exam) => exam.id === examId)
          ?.tiers.find((t) => t.id === tierId)?.label) ??
    (tierId === "main" ? "Main" : tierId);
  return examName ? `${examName} · ${tierLabel}` : tierLabel;
}

/** One selectable switcher entry: a concrete enabled tier, or the combined
 * "All tiers" view of an exam with two or more enabled tiers. */
export type SwitcherEntry = {
  examId: string;
  /** Concrete tier id, or ALL_TIERS_ID for the combined view. */
  tierId: string;
  /** Stable scope key ("examId:tierId" or "examId:all"). */
  key: string;
  label: string;
  isCustom: boolean;
};

export function switcherEntries(response: ExamsResponse): SwitcherEntry[] {
  const enabledByExam = new Map<string, string[]>();
  for (const key of response.enabledTiers) {
    const sep = key.indexOf(":");
    if (sep <= 0) continue;
    const examId = key.slice(0, sep);
    const tierId = key.slice(sep + 1);
    enabledByExam.set(examId, [...(enabledByExam.get(examId) ?? []), tierId]);
  }
  const entries: SwitcherEntry[] = [];
  const pushExam = (examId: string, examName: string, isCustom: boolean) => {
    const tierIds = enabledByExam.get(examId) ?? [];
    const nameFor = (tierId: string) =>
      isCustom
        ? (response.customExams
            .find((exam) => exam.id === examId)
            ?.tiers.find((t) => t.id === tierId)?.label ?? tierId)
        : (response.builtIn
            .find((exam) => exam.id === examId)
            ?.tiers.find((t) => t.id === tierId)?.label ?? tierId);
    for (const tierId of tierIds)
      entries.push({
        examId,
        tierId,
        key: `${examId}:${tierId}`,
        label: `${examName} · ${nameFor(tierId)}`,
        isCustom,
      });
    if (tierIds.length >= 2)
      entries.push({
        examId,
        tierId: ALL_TIERS_ID,
        key: `${examId}:${ALL_TIERS_ID}`,
        label: `${examName} · All tiers`,
        isCustom,
      });
  };
  for (const exam of response.builtIn)
    pushExam(exam.id, exam.name, false);
  for (const exam of response.customExams)
    pushExam(exam.id, exam.name, true);
  return entries;
}
