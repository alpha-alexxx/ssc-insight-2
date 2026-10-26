export type AiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_QUOTA_EXCEEDED"
  | "AI_INPUT_TOO_LARGE"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_ERROR"
  | "AI_INVALID_OUTPUT"
  | "AI_ABORTED"
  | "AI_BUSY";

/**
 * Safe AI errors. Messages are written for the user and never include
 * provider responses, request headers, the base URL, or credentials.
 */
export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export function aiNotConfigured() {
  return new AiError(
    "AI_NOT_CONFIGURED",
    "AI is not configured on this server. Add AI_API_KEY and AI_MODEL, then redeploy.",
    503,
  );
}

export function aiQuotaExceeded(retryAfterSeconds: number) {
  return new AiError(
    "AI_QUOTA_EXCEEDED",
    "You have reached today's AI limit. It resets at midnight IST.",
    429,
    retryAfterSeconds,
  );
}

export function aiTimeout() {
  return new AiError(
    "AI_TIMEOUT",
    "The AI provider took too long to respond. Try again.",
    504,
  );
}

export function aiProviderError() {
  return new AiError(
    "AI_PROVIDER_ERROR",
    "The AI provider could not complete this request. Try again shortly.",
    502,
  );
}

export function aiInvalidOutput() {
  return new AiError(
    "AI_INVALID_OUTPUT",
    "The AI returned a response the app could not read. Try again, or use manual entry.",
    502,
  );
}

export function aiAborted() {
  return new AiError("AI_ABORTED", "The AI request was cancelled.", 499);
}

export function aiBusy() {
  return new AiError(
    "AI_BUSY",
    "The AI usage check is busy right now. Try again in a moment.",
    503,
  );
}
