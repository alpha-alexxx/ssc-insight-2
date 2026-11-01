import type { PatternSection, PatternShape, SubjectId } from "./domain";
import {
  CUSTOM_FIRST_TIER_ID,
  customExamPattern,
  patternMaxScore,
  patternShape,
  structureSignature,
  type CustomExamDef,
  type ExamDef,
  type ResolvedPattern,
} from "./exam-pattern";

/**
 * The exam catalog: every supported exam and the pattern (subjects, question
 * counts, marking scheme, sections) of each of its tiers/papers.
 *
 * The workspace scope is TIER-level: the user enables individual tiers
 * ("cgl:tier1", "cgl:tier2", …) and the switcher activates one, or the
 * special combined "all" pseudo-tier of an exam. The tier of each attempt is
 * still chosen per attempt and snapshots the pattern onto the saved record,
 * so later catalog corrections never rewrite history.
 *
 * Shape types live in `exam-pattern.ts` (client-safe); this module holds the
 * DATA and is server-side, so the browser never bundles the whole table.
 *
 * Numbers come from the official notices published on ssc.gov.in — each exam
 * entry records the cycle, notice and retrieval date it was read from. The
 * patterns are NOT stable across cycles (CPO moved from 50 questions per
 * Paper I part to 25 between 2025 and 2026), so a corrected pattern is a new
 * catalog version, and nothing here may be guessed or "rounded" to fit.
 */

export * from "./exam-pattern";

const subject = (
  subjectId: SubjectId,
  questions: number,
  extra: Partial<{
    qualifying: boolean;
    label: string;
    timeMinutes: number;
    slotFidelity: "exact" | "approximate";
    slotNote: string;
  }> = {},
): {
  subjectId: SubjectId;
  questions: number;
  qualifying: boolean;
  label?: string;
  timeMinutes?: number;
  slotFidelity?: "exact" | "approximate";
  slotNote?: string;
} => ({ subjectId, questions, qualifying: false, ...extra });

/**
 * The two-section split shared by CGL and CHSL Tier 2. Section I is
 * Quant + Reasoning, Section II is English + GA; every tier that declares
 * these also runs a qualifying Section III (Computer Knowledge) which is
 * modelled as a section rather than a subject so its question count stays
 * with the other sectional timing.
 */
const TIER2_SECTIONS: readonly PatternSection[] = [
  {
    id: "section1",
    name: "Section I",
    description: "Quant + Reasoning",
    subjectIds: ["quant", "reasoning"],
    durationMinutes: 60,
  },
  {
    id: "section2",
    name: "Section II",
    description: "English + General Awareness",
    subjectIds: ["english", "ga"],
    durationMinutes: 60,
  },
  {
    id: "section3",
    name: "Section III",
    description: "Computer Knowledge Test · qualifying",
    subjectIds: ["computer"],
    durationMinutes: 15,
    qualifying: true,
  },
];

/** The four-part objective paper most SSC exams use, with the four
 * merit-bearing subjects ordered as the notice lists them. */
const fourPart = (
  quant: number,
  reasoning: number,
  english: number,
  ga: number,
  marking: { correct: number; incorrect: number },
): { subjects: readonly ReturnType<typeof subject>[]; marking: typeof marking } => ({
  subjects: [
    subject("reasoning", reasoning),
    subject("ga", ga),
    subject("quant", quant),
    subject("english", english),
  ],
  marking,
});

const NOTICES = {
  cgl: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2026.pdf",
  chsl: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsl_2026.pdf",
  mts: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_mts_2025.pdf",
  cpo: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_capf_2026.pdf",
  gd: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_CTGD_2026.pdf",
  steno:
    "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_steno_2025.pdf",
  slpost:
    "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_RHQ_2026_phase_xiv.pdf",
} as const;

export const BUILT_IN_EXAMS: readonly ExamDef[] = [
  {
    id: "cgl",
    name: "SSC CGL",
    primaryTierId: "tier2",
    effectiveFrom: "2026-01-01",
    source: {
      cycle: "CGL 2026",
      notice: "Notice of Combined Graduate Level Examination, 2026",
      url: NOTICES.cgl,
      retrievedAt: "2026-11-01",
    },
    stages: [
      {
        id: "dest",
        label: "Data Entry Speed Test",
        kind: "skill",
        timing: "after",
        afterTierId: "tier2",
        durationMinutes: 15,
        qualifying: true,
        note: "One task of about 2,000 key depressions in 15 minutes; qualifying.",
      },
    ],
    tiers: [
      {
        id: "tier1",
        label: "Tier 1",
        role: "screening",
        ...fourPart(25, 25, 25, 25, { correct: 2, incorrect: 0.5 }),
        sections: [],
        durationMinutes: 60,
        source: "CGL 2026 · para 13.7",
      },
      {
        id: "tier2",
        label: "Tier 2 — Paper I",
        role: "merit",
        subjects: [
          subject("quant", 30),
          subject("reasoning", 30),
          subject("english", 45),
          subject("ga", 25),
          subject("computer", 20, { qualifying: true }),
        ],
        marking: { correct: 3, incorrect: 1 },
        sections: TIER2_SECTIONS,
        durationMinutes: 135,
        source: "CGL 2026 · para 13.8",
      },
      {
        id: "paper2",
        label: "Paper II — Statistics (JSO)",
        role: "specialisation",
        subjects: [
          subject("quant", 100, {
            label: "Statistics",
            slotFidelity: "approximate",
            slotNote:
              "Statistics is not Quantitative Aptitude; subject analytics for this paper are not merit-comparable.",
          }),
        ],
        marking: { correct: 2, incorrect: 0.5 },
        sections: [],
        durationMinutes: 120,
        source: "CGL 2026 · para 13.8",
      },
      {
        id: "paper3",
        label: "Paper III — Finance & Economics (AAO)",
        role: "specialisation",
        subjects: [
          subject("ga", 100, {
            label: "General Studies (Finance and Economics)",
            slotFidelity: "approximate",
            slotNote:
              "Finance & Economics is not General Awareness; subject analytics for this paper are not merit-comparable.",
          }),
        ],
        marking: { correct: 2, incorrect: 0.5 },
        sections: [],
        durationMinutes: 120,
        source: "CGL 2026 · para 13.8",
      },
    ],
  },
  {
    id: "chsl",
    name: "SSC CHSL",
    primaryTierId: "tier2",
    effectiveFrom: "2026-01-01",
    source: {
      cycle: "CHSL 2026",
      notice: "Notice of Combined Higher Secondary (10+2) Level Examination, 2026",
      url: NOTICES.chsl,
      retrievedAt: "2026-11-01",
    },
    stages: [
      {
        id: "skill",
        label: "Skill Test / Typing Test",
        kind: "skill",
        timing: "after",
        afterTierId: "tier2",
        qualifying: true,
        note: "DEO skill test (15 min) or LDC/JSA typing test (10 min); qualifying.",
      },
    ],
    tiers: [
      {
        id: "tier1",
        label: "Tier 1",
        role: "screening",
        // The notice numbers the parts English, GI, Quant, GA; the slots are
        // ordered the same way the app has always shown them.
        subjects: [
          subject("english", 25),
          subject("reasoning", 25),
          subject("quant", 25),
          subject("ga", 25),
        ],
        marking: { correct: 2, incorrect: 0.5 },
        sections: [],
        durationMinutes: 60,
        source: "CHSL 2026 · para 13.7",
      },
      {
        id: "tier2",
        label: "Tier 2",
        role: "merit",
        subjects: [
          subject("quant", 30),
          subject("reasoning", 30),
          subject("english", 40),
          subject("ga", 20),
          subject("computer", 15, { qualifying: true }),
        ],
        marking: { correct: 3, incorrect: 1 },
        sections: TIER2_SECTIONS,
        durationMinutes: 135,
        source: "CHSL 2026 · para 13.8",
      },
    ],
  },
  {
    id: "mts",
    name: "SSC MTS",
    primaryTierId: "session2",
    defaultTierId: "session1",
    effectiveFrom: "2025-01-01",
    source: {
      cycle: "MTS & Havaldar 2025",
      notice: "Notice of Multi-Tasking (Non-Technical) Staff & Havaldar Examination, 2025",
      url: NOTICES.mts,
      retrievedAt: "2026-11-01",
    },
    stages: [
      {
        id: "pst_pet",
        label: "Physical Efficiency Test",
        kind: "physical",
        timing: "after",
        afterTierId: "session2",
        qualifying: true,
        note: "Havaldar posts only.",
      },
    ],
    tiers: [
      {
        id: "session1",
        label: "Session I",
        role: "merit",
        subjects: [
          subject("quant", 20, { label: "Numerical and Mathematical Ability" }),
          subject("reasoning", 20, { label: "Reasoning Ability and Problem Solving" }),
        ],
        // No negative marking in Session I — the only SSC session with none.
        marking: { correct: 3, incorrect: 0 },
        sections: [],
        durationMinutes: 45,
        source: "MTS 2025 · para 14.5",
      },
      {
        id: "session2",
        label: "Session II",
        role: "merit",
        subjects: [subject("ga", 25), subject("english", 25)],
        marking: { correct: 3, incorrect: 1 },
        sections: [],
        durationMinutes: 45,
        source: "MTS 2025 · para 14.5",
      },
    ],
  },
  {
    id: "cpo",
    name: "SSC CPO",
    primaryTierId: "paper1",
    effectiveFrom: "2026-01-01",
    source: {
      cycle: "CPO 2026",
      notice:
        "Notice of Sub-Inspector in Delhi Police and Central Armed Police Forces Examination, 2026",
      url: NOTICES.cpo,
      retrievedAt: "2026-11-01",
    },
    stages: [
      {
        id: "pst_pet",
        label: "PST / PET",
        kind: "physical",
        timing: "after",
        afterTierId: "paper1",
        qualifying: true,
      },
      {
        id: "dme",
        label: "Detailed Medical Examination",
        kind: "medical",
        timing: "after",
        afterTierId: "paper2",
        qualifying: true,
      },
    ],
    tiers: [
      {
        id: "paper1",
        label: "Paper I",
        role: "screening",
        // Each part runs its own 15-minute sectional timer; the tier's
        // sections would add no grouping (every part is one subject), so the
        // timers live on the parts.
        subjects: [
          subject("reasoning", 25, { label: "General Intelligence and Reasoning", timeMinutes: 15 }),
          subject("ga", 25, { label: "General Knowledge and General Awareness", timeMinutes: 15 }),
          subject("quant", 25, { label: "Quantitative Aptitude", timeMinutes: 15 }),
          subject("english", 25, { label: "English Comprehension", timeMinutes: 15 }),
        ],
        marking: { correct: 1, incorrect: 0.25 },
        sections: [],
        durationMinutes: 60,
        source: "CPO 2026 · para 12.1",
      },
      {
        id: "paper2",
        label: "Paper II",
        role: "merit",
        // The 2026 notice restructured Paper II into four parts; English
        // carries 100 of the 160 questions. The 2025 pattern (English-only,
        // 200 questions) is superseded.
        subjects: [
          subject("reasoning", 20, { label: "General Intelligence and Reasoning", timeMinutes: 20 }),
          subject("ga", 20, { label: "General Knowledge and General Awareness", timeMinutes: 20 }),
          subject("quant", 20, { label: "Quantitative Aptitude", timeMinutes: 20 }),
          subject("english", 100, { label: "English Comprehension" }),
        ],
        marking: { correct: 2, incorrect: 0.5 },
        sections: [],
        durationMinutes: 60,
        source: "CPO 2026 · para 12.1",
      },
    ],
  },
  {
    id: "gd",
    name: "SSC GD Constable",
    primaryTierId: "cbe",
    effectiveFrom: "2026-01-01",
    source: {
      cycle: "GD Constable 2026",
      notice: "Notice of Constable (General Duty) Examination, 2026",
      url: NOTICES.gd,
      retrievedAt: "2026-11-01",
    },
    stages: [
      {
        id: "pst_pet",
        label: "PST / PET",
        kind: "physical",
        timing: "after",
        afterTierId: "cbe",
        qualifying: true,
      },
      {
        id: "dme",
        label: "Detailed Medical Examination",
        kind: "medical",
        timing: "after",
        afterTierId: "cbe",
        qualifying: true,
      },
      {
        id: "dv",
        label: "Document Verification",
        kind: "document",
        timing: "after",
        afterTierId: "cbe",
        qualifying: true,
      },
    ],
    tiers: [
      {
        id: "cbe",
        label: "CBE",
        role: "merit",
        ...fourPart(20, 20, 20, 20, { correct: 2, incorrect: 0.25 }),
        sections: [],
        durationMinutes: 60,
        source: "GD 2026 · para 12.1",
      },
    ],
  },
  {
    id: "steno",
    name: "SSC Stenographer",
    primaryTierId: "cbe",
    effectiveFrom: "2025-01-01",
    source: {
      cycle: "Stenographer 2025",
      notice: "Notice of Stenographer Grade ‘C’ and ‘D’ Examination, 2025",
      url: NOTICES.steno,
      retrievedAt: "2026-11-01",
    },
    stages: [
      {
        id: "skill",
        label: "Skill Test in Stenography",
        kind: "skill",
        timing: "after",
        afterTierId: "cbe",
        durationMinutes: 10,
        qualifying: true,
        note:
          "One 10-minute dictation at 100 wpm (Grade C) or 80 wpm (Grade D), transcribed on computer.",
      },
    ],
    tiers: [
      {
        id: "cbe",
        label: "CBE",
        role: "merit",
        // Only three of the five slots carry questions; the model never
        // requires all five.
        subjects: [
          subject("reasoning", 50, { label: "General Intelligence & Reasoning" }),
          subject("ga", 50, { label: "General Awareness" }),
          subject("english", 100, { label: "English Language and Comprehension" }),
        ],
        marking: { correct: 1, incorrect: 0.25 },
        sections: [],
        durationMinutes: 120,
        source: "Stenographer 2025 · para 13.1",
      },
    ],
  },
  {
    id: "slpost",
    name: "SSC Selection Post",
    primaryTierId: "cbe",
    effectiveFrom: "2026-01-01",
    source: {
      cycle: "Selection Post Phase XIV (2026)",
      notice:
        "Notice of Selection Post Examination, Phase-XIV, 2026 (Matriculation / Higher Secondary / Graduation level)",
      url: NOTICES.slpost,
      retrievedAt: "2026-11-01",
    },
    stages: [
      {
        id: "skill",
        label: "Skill Test",
        kind: "skill",
        timing: "after",
        afterTierId: "cbe",
        qualifying: true,
        note: "Where prescribed for the post; qualifying.",
      },
    ],
    tiers: [
      {
        id: "cbe",
        label: "CBE",
        role: "merit",
        // One pattern serves all three educational-qualification levels; the
        // level is a property of the post, not of the paper.
        subjects: [
          subject("reasoning", 25, { label: "General Intelligence", timeMinutes: 15 }),
          subject("ga", 25, { label: "General Awareness", timeMinutes: 15 }),
          subject("quant", 25, { label: "Quantitative Aptitude (Basic Arithmetic Skill)", timeMinutes: 15 }),
          subject("english", 25, { label: "English Language (Basic Knowledge)", timeMinutes: 15 }),
        ],
        marking: { correct: 2, incorrect: 0.5 },
        sections: [],
        durationMinutes: 60,
        source: "Selection Post XIV 2026 · para 15.1",
      },
    ],
  },
];

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
 * catalog; custom exams from the user's stored row (per-tier patterns).
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
  if (!custom) return null;
  const tier = customExamPattern(custom, tierId);
  if (!tier) return null;
  return {
    examId,
    examName: custom.name,
    exam: null,
    tier,
    isPrimaryTier: tier.id === custom.tiers[0]?.id,
  };
}

/** Sections of a saved attempt's pattern. Custom exams carry none, so
 * section-derived analytics naturally skip them. */
export function sectionsForAttempt(examId: string, tierId: string) {
  return (
    builtInExam(examId)?.tiers.find((t) => t.id === tierId)?.sections ?? []
  );
}

/** The stages of an exam, in occurrence order. */
export function stagesForExam(examId: string) {
  return builtInExam(examId)?.stages ?? [];
}

/** The tier label for a saved attempt ("Tier 2 — Paper I", "CBE", "Main"). */
export function tierLabelFor(examId: string, tierId: string): string {
  return (
    builtInExam(examId)?.tiers.find((t) => t.id === tierId)?.label ??
    (tierId === CUSTOM_FIRST_TIER_ID ? "Main" : tierId)
  );
}

/** `patternShape` for a resolved tier, narrowed to the built-in/flat form. */
export { patternShape };

/**
 * Catalog invariants. Called at module load outside production and asserted
 * by tests, so a bad edit fails loudly instead of silently producing a target
 * with the wrong ceiling.
 */
export function validateCatalog(
  exams: readonly ExamDef[] = BUILT_IN_EXAMS,
): string[] {
  const problems: string[] = [];
  const examIds = new Set<string>();
  for (const exam of exams) {
    if (examIds.has(exam.id)) problems.push(`duplicate exam id: ${exam.id}`);
    examIds.add(exam.id);
    const tierIds = new Set<string>();
    for (const tier of exam.tiers) {
      if (tierIds.has(tier.id))
        problems.push(`${exam.id}: duplicate tier id ${tier.id}`);
      tierIds.add(tier.id);
      const subjectIds = new Set(tier.subjects.map((s) => s.subjectId));
      if (subjectIds.size !== tier.subjects.length)
        problems.push(`${exam.id}:${tier.id}: duplicate subject slot`);
      if (tier.subjects.length < 1 || tier.subjects.length > 5)
        problems.push(`${exam.id}:${tier.id}: needs 1–5 subject slots`);
      if (tier.subjects.some((s) => !Number.isInteger(s.questions) || s.questions < 1))
        problems.push(`${exam.id}:${tier.id}: question counts must be positive integers`);
      if (tier.marking.correct <= 0)
        problems.push(`${exam.id}:${tier.id}: marks per correct must be positive`);
      const merit = tier.subjects.filter((s) => !s.qualifying);
      if (!merit.length)
        problems.push(`${exam.id}:${tier.id}: needs at least one merit subject`);

      for (const section of tier.sections) {
        if (
          section.subjectIds.some((id) => !subjectIds.has(id))
        )
          problems.push(
            `${exam.id}:${tier.id}: section ${section.id} names a subject the tier does not declare`,
          );
      }
      const sectionMinutes = tier.sections.reduce(
        (sum, section) => sum + (section.durationMinutes ?? 0),
        0,
      );
      if (
        tier.durationMinutes != null &&
        tier.sections.every((s) => s.durationMinutes != null) &&
        tier.sections.length > 0 &&
        sectionMinutes !== tier.durationMinutes
      )
        problems.push(
          `${exam.id}:${tier.id}: section timers total ${sectionMinutes}m, tier says ${tier.durationMinutes}m`,
        );

      const partMinutes = tier.subjects.reduce(
        (sum, s) => sum + (s.timeMinutes ?? 0),
        0,
      );
      if (
        tier.durationMinutes != null &&
        tier.subjects.some((s) => s.timeMinutes != null) &&
        partMinutes !== tier.durationMinutes
      )
        problems.push(
          `${exam.id}:${tier.id}: part timers total ${partMinutes}m, tier says ${tier.durationMinutes}m`,
        );
    }
    if (!tierIds.has(exam.primaryTierId))
      problems.push(`${exam.id}: primaryTierId ${exam.primaryTierId} does not exist`);
    if (exam.defaultTierId && !tierIds.has(exam.defaultTierId))
      problems.push(`${exam.id}: defaultTierId ${exam.defaultTierId} does not exist`);
    for (const stage of exam.stages ?? []) {
      if (!stage.qualifying) problems.push(`${exam.id}: stage ${stage.id} must be qualifying`);
      if (stage.afterTierId && !tierIds.has(stage.afterTierId))
        problems.push(`${exam.id}: stage ${stage.id} follows an unknown tier`);
    }
    if (!exam.source?.url) problems.push(`${exam.id}: missing source url`);
  }

  // A signature must map to exactly one maximum, or a shared default could
  // describe two different papers.
  const maxBySignature = new Map<string, number>();
  for (const exam of exams) {
    for (const tier of exam.tiers) {
      const signature = structureSignature(tier);
      const max = patternMaxScore(tier);
      const seen = maxBySignature.get(signature);
      if (seen != null && seen !== max)
        problems.push(
          `${exam.id}:${tier.id}: signature ${signature} maps to both ${seen} and ${max}`,
        );
      maxBySignature.set(signature, max);
    }
  }
  return problems;
}

/** Development safety net: fail loudly on a malformed catalog edit. */
if (process.env.NODE_ENV !== "production") {
  const problems = validateCatalog();
  if (problems.length) {
    throw new Error(
      `Exam catalog is invalid:\n- ${problems.join("\n- ")}`,
    );
  }
}

export type { PatternShape };
