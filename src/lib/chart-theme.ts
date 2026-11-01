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
  // Section III is the qualifying Computer Knowledge test on CGL/CHSL
  // Tier 2 — it reuses the Computer hue so it reads as the same material,
  // and Section IV exists for tiers that declare it (none today).
  section3: "var(--chart-computer)",
  section4: "var(--chart-average)",
};
export const targetColor = "var(--chart-target)";
