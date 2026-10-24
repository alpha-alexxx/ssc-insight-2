import type { SubjectId } from "./domain";

// Semantic CSS variables keep SVG charts aligned with the paper interface.
export const subjectColors: Record<SubjectId, string> = {
  quant: "var(--chart-quant)",
  reasoning: "var(--chart-reasoning)",
  english: "var(--chart-english)",
  ga: "var(--chart-ga)",
  computer: "var(--chart-computer)",
};
