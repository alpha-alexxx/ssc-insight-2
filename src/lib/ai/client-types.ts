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
  /** Where the active configuration came from. */
  source?: "user" | "env" | null;
  /** False when the server has no AI_CREDENTIAL_SECRET, so keys cannot be saved. */
  storageAvailable?: boolean;
  credential?: AiCredentialSummary | null;
};

/**
 * Client-safe view of a stored credential. Deliberately has NO apiKey field:
 * the key is write-only and the server returns only a 4-character hint.
 */
export type AiCredentialSummary = {
  configured: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  keyHint: string | null;
  jsonMode: boolean;
  allowHttp: boolean;
  allowPrivate: boolean;
  updatedAt: string | null;
};

export type AiSettingsResponse = {
  storageAvailable: boolean;
  credential: AiCredentialSummary | null;
};

export type AiModelsResponse = {
  models: { id: string; name: string }[];
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
  "performance",
  "settings",
] as const;
export type AiView = (typeof AI_VIEWS)[number];

/** Orientation only: never includes attempt content, notes, IDs, or identity. */
export type AiScreenContext = {
  view: AiView;
  date?: string;
};
