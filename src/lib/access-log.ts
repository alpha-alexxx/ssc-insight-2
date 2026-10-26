/**
 * Structured HTTP access log — one JSON line per request on stdout, same
 * shape discipline as audit.ts (stable keys, PII-free) so the platform log
 * stream (Vercel/Neon/Docker) ships it with zero plumbing.
 *
 * Emitted from two places:
 * - src/proxy.ts for gate decisions made before the app runs
 *   (redirects, maintenance, CSRF rejections) via waitUntil.
 * - src/lib/route-handler.ts for every API route completion.
 *
 * Fields:
 *   ts     ISO timestamp
 *   evt    always "http"
 *   method HTTP method
 *   path   pathname only (never query strings — they can carry tokens)
 *   status response status
 *   ms     handler duration in milliseconds
 *   rid    request correlation id (x-request-id)
 *   uid    user id when known, "anon" otherwise
 *   where  "proxy" (edge gate) or "route" (route handler)
 *   note   short machine-readable reason for gate decisions
 */
import type { RouteClass } from "./middleware-utils";

export type AccessLogEvent = {
  method: string;
  path: string;
  status: number;
  ms: number;
  rid: string;
  uid?: string;
  where: "proxy" | "route";
  note?: string;
  cls?: RouteClass;
};

export function accessLog(event: AccessLogEvent): void {
  const line = {
    ts: new Date().toISOString(),
    evt: "http",
    method: event.method,
    path: event.path,
    status: event.status,
    ms: Math.round(event.ms),
    rid: event.rid,
    uid: event.uid ?? "anon",
    where: event.where,
    ...(event.note ? { note: event.note } : {}),
    ...(event.cls ? { area: event.cls.area, route: event.cls.route } : {}),
  };
  process.stdout.write(`${JSON.stringify(line)}\n`);
}
