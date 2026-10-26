import "server-only";

/**
 * Structured audit log for write operations (mock create/update/delete,
 * settings change, backup import). Each entry is a single JSON line written
 * to stdout so it ships with the platform log stream (Vercel, Neon, etc.)
 * with no extra plumbing.
 *
 * PII minimization: only the user id (already a stable identifier in this
 * app) and a stable operation code are logged. Mock names, scores, notes,
 * and request bodies are never logged.
 */

export type AuditEvent = {
  /** ISO timestamp. */
  ts: string;
  /** Stable operation code, e.g. "mock.create", "settings.save". */
  op: string;
  /** User id (or "anon" if unauthenticated — should never happen for writes). */
  uid: string;
  /** Outcome: "ok" | "error" | "denied". */
  outcome: "ok" | "error" | "denied";
  /** Optional stable subject id (mock id, etc.) — never PII. */
  sid?: string;
  /** Optional duration in ms. */
  ms?: number;
  /** Optional safe metadata (no PII, no user content). */
  meta?: Record<string, string | number | boolean | null>;
};

const startedAt = Date.now();

/** Structured error logger — same single-line JSON shape as audit events. */
export function logError(
  op: string,
  userId: string | undefined,
  error: unknown,
) {
  const prismaCode =
    error && typeof error === "object" && "code" in error ? error.code : null;
  const evt: AuditEvent = {
    ts: new Date().toISOString(),
    op,
    uid: userId ?? "anon",
    outcome: "error",
    meta: {
      name: error instanceof Error ? error.name : "UnknownError",
      code:
        typeof prismaCode === "string" && /^P\d{4}$/.test(prismaCode)
          ? prismaCode
          : "UNKNOWN",
    },
  };
  // Stable JSON ordering for grep-ability.
  process.stdout.write(`${JSON.stringify(evt)}\n`);
}

export function audit(
  op: string,
  userId: string | undefined,
  opts: { outcome?: "ok" | "error" | "denied"; sid?: string; ms?: number; meta?: AuditEvent["meta"] } = {},
) {
  const evt: AuditEvent = {
    ts: new Date().toISOString(),
    op,
    uid: userId ?? "anon",
    outcome: opts.outcome ?? "ok",
    sid: opts.sid,
    ms: opts.ms,
    meta: opts.meta,
  };
  process.stdout.write(`${JSON.stringify(evt)}\n`);
}

/** Process-level health snapshot for /api/health. */
export function healthSnapshot() {
  const mem = process.memoryUsage();
  return {
    uptimeMs: Date.now() - startedAt,
    pid: process.pid,
    nodeVersion: process.version,
    rssBytes: mem.rss,
    heapUsedBytes: mem.heapUsed,
    heapTotalBytes: mem.heapTotal,
    timestamp: new Date().toISOString(),
  };
}
