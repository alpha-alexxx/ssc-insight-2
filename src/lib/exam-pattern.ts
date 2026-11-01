import type { Marking, PatternSection, PatternShape, SubjectId } from "./domain";

/**
 * Shape layer for exam patterns — the part both the server and the browser
 * import. It carries no catalog DATA (see `exams.ts`, server-only) so a
 * client component can type and measure a tier without shipping the whole
 * exam table in its bundle.
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
  /** The official part name when it differs from the canonical slot name
   * ("Elementary Maths", "General Studies (Finance and Economics)"). */
  label?: string;
  /** A sectional timer on this part. When several parts carry one, they sum
   * to the tier's `durationMinutes` (CPO Paper I, Selection Post CBE). */
  timeMinutes?: number;
  /** "approximate" marks a slot that cannot faithfully hold the official
   * part — CGL Paper II Statistics in the Quant slot, Paper III Finance in
   * the GA slot. Subject analytics for such a tier are not merit-comparable. */
  slotFidelity?: "exact" | "approximate";
  slotNote?: string;
};

/** How a tier functions in the exam. Metadata only — never scored, and
 * deliberately excluded from the structure signature. */
export type TierRole = "screening" | "merit" | "specialisation";

export type TierPattern = {
  /** "tier1" | "tier2" | "paper1" | "paper2" | "session1" | "cbe" | custom ids. */
  id: string;
  label: string;
  subjects: readonly PatternSubject[];
  marking: Marking;
  /** Only patterns with real section splits define these. */
  sections: readonly PatternSection[];
  /** Light metadata for the UI and for prompt context. */
  role?: TierRole;
  /** Objective duration in minutes. */
  durationMinutes?: number;
  /** Which official cycle this shape describes ("CGL 2026"). */
  source?: string;
};

/**
 * A stage that produces no score: DEST, a typing test, dictation, PST/PET,
 * a medical, or document verification. It is never an attempt tier, has no
 * questions and no maximum, and therefore can never enter a target.
 */
export type ExamStage = {
  id: string;
  label: string;
  kind: "skill" | "physical" | "medical" | "document" | "descriptive";
  timing: "before" | "after";
  /** The tier this stage follows, when it follows one. */
  afterTierId?: string;
  durationMinutes?: number;
  /** Always qualifying; stated so a caller cannot score it by accident. */
  qualifying: true;
  note?: string;
};

/** Provenance for the numbers in a catalog entry. */
export type ExamSource = {
  /** Official cycle label, e.g. "CGL 2026". */
  cycle: string;
  /** Notice reference, when the notice gives one. */
  notice?: string;
  url: string;
  /** ISO date the numbers were read from the notice. */
  retrievedAt: string;
};

export type ExamDef = {
  id: string;
  name: string;
  /** The tier the user is ultimately preparing for; default scope for
   * analytics targets and AI context. */
  primaryTierId: string;
  /** The tier pre-selected when the exam is first enabled. Defaults to the
   * primary tier; MTS preselects Session I because that is what is sat first. */
  defaultTierId?: string;
  tiers: readonly TierPattern[];
  /** Non-objective stages, in the order they occur. */
  stages?: readonly ExamStage[];
  /** ISO date this cycle's pattern applies from. */
  effectiveFrom: string;
  source: ExamSource;
};

/** Bumped whenever the catalog's numbers change, so a stored target or a
 * backup can be explained against the cycle that produced it. */
export const CATALOG_VERSION = 3;

/** One user-defined tier of a custom exam: its own full pattern. */
export type CustomTierDef = {
  id: string;
  label: string;
  subjects: readonly PatternSubject[];
  marking: Marking;
};

/** A user-defined exam with one or more tiers. */
export type CustomExamDef = {
  id: string;
  name: string;
  tiers: readonly CustomTierDef[];
};

/** The first custom tier keeps the legacy id so attempts recorded before
 * multi-tier customs stay valid. */
export const CUSTOM_FIRST_TIER_ID = "main";
/** Combined pseudo-tier: every enabled tier of the active exam at once. */
export const ALL_TIERS_ID = "all";

export function customExamPattern(
  exam: CustomExamDef,
  tierId: string,
): TierPattern | null {
  const tier = exam.tiers.find((t) => t.id === tierId);
  if (!tier) return null;
  return {
    id: tier.id,
    label: tier.label,
    subjects: tier.subjects,
    marking: tier.marking,
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

/** "examId:tierId" — the enablement/identity key of one selectable tier. */
export function tierKey(examId: string, tierId: string): string {
  return `${examId}:${tierId}`;
}

export function parseTierKey(
  key: string,
): { examId: string; tierId: string } | null {
  const sep = key.indexOf(":");
  if (sep <= 0 || sep === key.length - 1) return null;
  const examId = key.slice(0, sep);
  const tierId = key.slice(sep + 1);
  if (examId.length > 40 || tierId.length > 40) return null;
  return { examId, tierId };
}

/** Merit maximum of a tier: qualifying subjects are excluded. */
export function patternMaxScore(pattern: {
  subjects: readonly PatternSubject[];
  marking: Marking;
}): number {
  return (
    pattern.subjects
      .filter((s) => !s.qualifying)
      .reduce((sum, s) => sum + s.questions, 0) * pattern.marking.correct
  );
}

/**
 * Deterministic, order-independent fingerprint of a tier's SCORING shape:
 * the merit subject/question multiset, the qualifying ones, and the marking.
 *
 * This is the key a global tier target default is stored under, so it
 * deliberately contains every component that decides `patternMaxScore`. Two
 * tiers can therefore never share a default while having different maxima —
 * that invariant is what makes inheritance safe. Duration, role, labels and
 * section splits are excluded: they describe the paper, not how it scores.
 *
 * Example: `m:english45,ga25,quant30,reasoning30|q:computer20|mk:3/1`
 */
export type StructureSignature = string;

export function structureSignature(
  pattern: Pick<TierPattern, "subjects" | "marking">,
): StructureSignature {
  const merit = pattern.subjects
    .filter((s) => !s.qualifying)
    .map((s) => `${s.subjectId}${s.questions}`)
    .sort()
    .join(",");
  const qualifying = pattern.subjects
    .filter((s) => s.qualifying)
    .map((s) => `${s.subjectId}${s.questions}`)
    .sort()
    .join(",");
  // Trim the float noise an override or a JSON round-trip can introduce.
  const correct = Number(pattern.marking.correct.toFixed(4));
  const incorrect = Number(pattern.marking.incorrect.toFixed(4));
  return `m:${merit}|q:${qualifying}|mk:${correct}/${incorrect}`;
}

/** True when two patterns score identically (and therefore share a maximum). */
export function sameStructure(
  a: Pick<TierPattern, "subjects" | "marking">,
  b: Pick<TierPattern, "subjects" | "marking">,
): boolean {
  return structureSignature(a) === structureSignature(b);
}

/** Flatten a resolved exam+tier into the shape the scoring/validation layer
 * (attemptSchemaFor, AI context) consumes. */
export function patternShape(resolved: ResolvedPattern): PatternShape {
  return {
    examId: resolved.examId,
    tierId: resolved.tier.id,
    subjects: resolved.tier.subjects,
    marking: resolved.tier.marking,
    sections: resolved.tier.sections,
    tierLabel: resolved.tier.label,
    durationMinutes: resolved.tier.durationMinutes ?? null,
  };
}
