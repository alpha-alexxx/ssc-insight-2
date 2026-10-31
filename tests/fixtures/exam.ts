import { patternShape, resolvePattern } from "../../src/lib/exams";
import type { AttemptInput, Marking } from "../../src/lib/domain";

/** Resolved CGL Tier 2 pattern — the legacy single-exam shape most fixtures
 * were written against. Multi-exam-specific tests resolve their own. */
export const T2 = patternShape(resolvePattern("cgl", "tier2", [])!);
export const T1 = patternShape(resolvePattern("cgl", "tier1", [])!);
export const MARKING: Marking = T2.marking;

/** Add the exam identity fields every attempt now carries (CGL Tier 2). */
export function withExam<T extends Record<string, unknown>>(input: T): T {
  return {
    ...input,
    examId: "cgl",
    tierId: "tier2",
    marking: MARKING,
  };
}

/** A stored-attempt factory input with the exam fields applied. */
export type AttemptSeed = Record<string, unknown> & Partial<AttemptInput>;
