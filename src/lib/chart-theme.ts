import type { SectionId, SubjectId } from "./domain";

// Semantic CSS variables keep SVG charts aligned with the paper interface.
// Subject hues are validated as an adjacent-pair categorical palette against
// the paper surface; Computer is a de-emphasised qualifying context series.
export const subjectColors: Record<SubjectId, string> = {
  quant: "var(--chart-quant)",
  reasoning: "var(--chart-reasoning)",
  english: "var(--chart-english)",
  ga: "var(--chart-ga)",
  computer: "var(--chart-computer)",
};
export const sectionColors: Record<SectionId, string> = {
  section1: "var(--chart-section-1)",
  section2: "var(--chart-section-2)",
};
export const targetColor = "var(--chart-target)";
