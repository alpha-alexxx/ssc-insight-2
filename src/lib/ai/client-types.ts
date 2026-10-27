import type { ExtractionDraft } from "./extraction";
import type { CoachInsight } from "./schemas";

export type AiUsageSummary = {
  day: string;
  requests: number;
  tokens: number;
  limits: { requests: number; tokens: number };
  resetAt: string;
  retryAfterSeconds: number;
};

export type AiStatus = {
  enabled: boolean;
  model: string | null;
  usage: AiUsageSummary | null;
};

export type CoachMeta = {
  contextVersion: string;
  dataAsOf: string | null;
  coverage: {
    totalAttempts: number;
    fullMocks: number;
    subjectMocks: number;
    sectionalMocks: number;
    recentFullMocksIncluded: number;
    recentFullMockLimit: number;
  };
};

export type AiResponseUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimated: boolean;
  providerCalls: number;
};

export type CoachResponse = {
  insight: CoachInsight;
  meta: CoachMeta;
  usage: AiResponseUsage;
};

export type ExtractResponse = {
  draft: ExtractionDraft;
  usage: AiResponseUsage;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export const AI_VIEWS = [
  "dashboard",
  "calendar",
  "tasks",
  "plan",
  "history",
  "compare",
  "settings",
] as const;
export type AiView = (typeof AI_VIEWS)[number];

/** Orientation only: never includes attempt content, notes, IDs, or identity. */
export type AiScreenContext = {
  view: AiView;
  date?: string;
};
