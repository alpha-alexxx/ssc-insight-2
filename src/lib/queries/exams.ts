import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ExamDef } from "@/lib/exams";
import type { PatternShape, SubjectId } from "@/lib/domain";
import type { TrackerSettingsShape } from "@/lib/exam-settings";

/**
 * Exams domain: the built-in catalog, the user's custom exams, and the
 * workspace scope (active exam, enabled exams, per-exam targets). One query
 * feeds the switcher, the add form, and the settings panel.
 */

export type CustomExamDto = {
  id: string;
  name: string;
  subjects: { subjectId: SubjectId; questions: number; qualifying: boolean }[];
  marking: { correct: number; incorrect: number };
  tierId: string;
  maxScore: number;
};

export type ExamsResponse = {
  builtIn: ExamDef[];
  customExams: CustomExamDto[];
  activeExamId: string;
  enabledExams: string[];
  examTargets: Record<string, number | null>;
};

export type CustomExamInput = {
  id?: string;
  name: string;
  subjects: { subjectId: SubjectId; questions: number; qualifying: boolean }[];
  marking: { correct: number; incorrect: number };
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

/** Persist the workspace scope (switch + enablement + targets) in one PUT. */
export async function saveScopeRequest(settings: TrackerSettingsShape) {
  return api<TrackerSettingsShape>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

/** The active exam's primary-tier shape, from the /api/exams payload. */
export function activeExamPattern(response: ExamsResponse): PatternShape | null {
  const builtIn = response.builtIn.find(
    (exam) => exam.id === response.activeExamId,
  );
  if (builtIn) {
    const tier = builtIn.tiers.find((t) => t.id === builtIn.primaryTierId)!;
    return {
      examId: builtIn.id,
      tierId: tier.id,
      subjects: tier.subjects,
      marking: tier.marking,
      sections: tier.sections,
    };
  }
  const custom = response.customExams.find(
    (exam) => exam.id === response.activeExamId,
  );
  if (!custom) return null;
  return {
    examId: custom.id,
    tierId: custom.tierId,
    subjects: custom.subjects,
    marking: custom.marking,
    sections: [],
  } satisfies PatternShape;
}

/** Resolve any exam+tier the user can reach to its concrete pattern. */
export function resolvePatternFrom(
  response: ExamsResponse,
  examId: string,
  tierId?: string,
): PatternShape | null {
  const builtIn = response.builtIn.find((exam) => exam.id === examId);
  if (builtIn) {
    const tier =
      builtIn.tiers.find((t) => t.id === tierId) ??
      builtIn.tiers.find((t) => t.id === builtIn.primaryTierId);
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
  if (!custom) return null;
  return {
    examId: custom.id,
    tierId: custom.tierId,
    subjects: custom.subjects,
    marking: custom.marking,
    sections: [],
  };
}

/** "SSC CGL · Tier 2" / "My Exam · Main" for any attempt's exam+tier. */
export function examTierLabel(
  response: ExamsResponse,
  examId: string,
  tierId: string,
): string {
  const builtIn = response.builtIn.find((exam) => exam.id === examId);
  const tierLabel =
    builtIn?.tiers.find((t) => t.id === tierId)?.label ??
    (tierId === "main" ? "Main" : tierId);
  const examName =
    builtIn?.name ?? response.customExams.find((exam) => exam.id === examId)?.name;
  return examName ? `${examName} · ${tierLabel}` : tierLabel;
}
