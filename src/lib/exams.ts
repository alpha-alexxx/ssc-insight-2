import type { Marking, PatternSection, PatternShape, SubjectId } from "./domain";

/**
 * The exam catalog: every supported exam and the pattern (subjects, question
 * counts, marking scheme, sections) of each of its tiers/papers.
 *
 * One exam is the workspace scope — the user picks their exams in Settings
 * and the header switcher selects the active one. The tier/paper is chosen
 * per attempt and snapshots the pattern onto the saved record, so later
 * catalog corrections never rewrite history.
 *
 * Subject slots stay the five canonical SubjectIds across every exam
 * (built-in or custom) — colors, icons, aliases, and the DB enum depend on
 * them. Marking penalties may be fractional (CPO −0.25); scores can be too.
 */

export type PatternSubject = {
  subjectId: SubjectId;
  questions: number;
  /** Qualifying subjects are excluded from the merit total (CGL T2 Computer). */
  qualifying: boolean;
};

export type TierPattern = {
  /** "tier1" | "tier2" | "paper1" | "paper2" | "main" (custom exams). */
  id: string;
  label: string;
  subjects: readonly PatternSubject[];
  marking: Marking;
  /** Only patterns with real section splits define these (CGL Tier 2). */
  sections: readonly PatternSection[];
};

export type ExamDef = {
  id: string;
  name: string;
  /** The tier the user is ultimately preparing for; default scope for
   * analytics targets and AI context. */
  primaryTierId: string;
  tiers: readonly TierPattern[];
};

const subject = (
  subjectId: SubjectId,
  questions: number,
  qualifying = false,
): PatternSubject => ({ subjectId, questions, qualifying });

/** CGL Tier 2's two-section split — the only pattern with sections today. */
const CGL_T2_SECTIONS: readonly PatternSection[] = [
  {
    id: "section1",
    name: "Section I",
    description: "Quant + Reasoning",
    subjectIds: ["quant", "reasoning"],
  },
  {
    id: "section2",
    name: "Section II",
    description: "English + General Awareness",
    subjectIds: ["english", "ga"],
  },
];

export const BUILT_IN_EXAMS: readonly ExamDef[] = [
  {
    id: "cgl",
    name: "SSC CGL",
    primaryTierId: "tier2",
    tiers: [
      {
        id: "tier1",
        label: "Tier 1",
        subjects: [
          subject("quant", 25),
          subject("reasoning", 25),
          subject("english", 25),
          subject("ga", 25),
        ],
        marking: { correct: 2, incorrect: 0.5 },
        sections: [],
      },
      {
        id: "tier2",
        label: "Tier 2",
        subjects: [
          subject("quant", 30),
          subject("reasoning", 30),
          subject("english", 45),
          subject("ga", 25),
          subject("computer", 20, true),
        ],
        marking: { correct: 3, incorrect: 1 },
        sections: CGL_T2_SECTIONS,
      },
    ],
  },
  {
    id: "chsl",
    name: "SSC CHSL",
    primaryTierId: "tier2",
    tiers: [
      {
        id: "tier1",
        label: "Tier 1",
        subjects: [
          subject("quant", 25),
          subject("reasoning", 25),
          subject("english", 25),
          subject("ga", 25),
        ],
        marking: { correct: 2, incorrect: 0.5 },
        sections: [],
      },
      {
        id: "tier2",
        label: "Tier 2",
        subjects: [
          subject("quant", 30),
          subject("reasoning", 30),
          subject("english", 40),
          subject("ga", 20),
          subject("computer", 15, true),
        ],
        marking: { correct: 3, incorrect: 1 },
        sections: [],
      },
    ],
  },
  {
    id: "cpo",
    name: "SSC CPO",
    primaryTierId: "paper1",
    tiers: [
      {
        id: "paper1",
        label: "Paper 1",
        subjects: [
          subject("quant", 50),
          subject("reasoning", 50),
          subject("english", 50),
          subject("ga", 50),
        ],
        marking: { correct: 1, incorrect: 0.25 },
        sections: [],
      },
      {
        id: "paper2",
        label: "Paper 2",
        subjects: [subject("english", 200)],
        marking: { correct: 1, incorrect: 0.25 },
        sections: [],
      },
    ],
  },
];

/** A user-defined exam. One implicit tier ("main"); no sections in v1. */
export type CustomExamDef = {
  id: string;
  name: string;
  subjects: readonly PatternSubject[];
  marking: Marking;
};

export const CUSTOM_TIER_ID = "main";

export function customExamPattern(exam: CustomExamDef): TierPattern {
  return {
    id: CUSTOM_TIER_ID,
    label: "Main",
    subjects: exam.subjects,
    marking: exam.marking,
    sections: [],
  };
}

/** Everything the scoring/validation layer needs, resolved to one tier. */
export type ResolvedPattern = {
  examId: string;
  examName: string;
  /** Present for built-ins; custom exams omit (their row is the source). */
  exam: ExamDef | null;
  tier: TierPattern;
  /** True when the tier is the exam's primary one. */
  isPrimaryTier: boolean;
};

export function builtInExam(examId: string): ExamDef | null {
  return BUILT_IN_EXAMS.find((exam) => exam.id === examId) ?? null;
}

export function isBuiltInExamId(examId: string): boolean {
  return builtInExam(examId) != null;
}

/** uuid v4 — the only non-built-in examId shape the API accepts. */
export function isCustomExamId(examId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    examId,
  );
}

export function isValidExamId(examId: string): boolean {
  return isBuiltInExamId(examId) || isCustomExamId(examId);
}

/**
 * Resolve one exam+tier to its concrete pattern. Built-ins resolve from the
 * catalog; custom exams from the user's stored row (single "main" tier).
 * Returns null when the pair does not exist — callers turn that into 400.
 */
export function resolvePattern(
  examId: string,
  tierId: string,
  customExams: readonly CustomExamDef[],
): ResolvedPattern | null {
  const builtIn = builtInExam(examId);
  if (builtIn) {
    const tier = builtIn.tiers.find((t) => t.id === tierId);
    if (!tier) return null;
    return {
      examId,
      examName: builtIn.name,
      exam: builtIn,
      tier,
      isPrimaryTier: tier.id === builtIn.primaryTierId,
    };
  }
  const custom = customExams.find((exam) => exam.id === examId);
  if (!custom || tierId !== CUSTOM_TIER_ID) return null;
  return {
    examId,
    examName: custom.name,
    exam: null,
    tier: customExamPattern(custom),
    isPrimaryTier: true,
  };
}

/** Merit maximum of a tier: qualifying subjects are excluded. */
export function patternMaxScore(pattern: {
  subjects: readonly PatternSubject[];
  marking: Marking;
}): number {
  return pattern.subjects
    .filter((s) => !s.qualifying)
    .reduce((sum, s) => sum + s.questions, 0) * pattern.marking.correct;
}

/** Sections of a saved attempt's pattern. Custom exams carry none, so
 * section-derived analytics naturally skip them. */
export function sectionsForAttempt(examId: string, tierId: string) {
  return (
    builtInExam(examId)?.tiers.find((t) => t.id === tierId)?.sections ?? []
  );
}

/** The tier label for a saved attempt ("Tier 2", "Paper 1", "Main"). */
export function tierLabelFor(examId: string, tierId: string): string {
  return (
    builtInExam(examId)?.tiers.find((t) => t.id === tierId)?.label ??
    (tierId === CUSTOM_TIER_ID ? "Main" : tierId)
  );
}

/** Flatten a resolved exam+tier into the shape the scoring/validation
 * layer (attemptSchemaFor, AI context) consumes. */
export function patternShape(resolved: ResolvedPattern): PatternShape {
  return {
    examId: resolved.examId,
    tierId: resolved.tier.id,
    subjects: resolved.tier.subjects,
    marking: resolved.tier.marking,
    sections: resolved.tier.sections,
  };
}
