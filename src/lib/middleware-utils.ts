/**
 * Pure routing utilities shared by src/proxy.ts and the API route layer.
 *
 * Everything here is dependency-free on purpose: no "server-only" imports,
 * no Next runtime calls, no ambient request state. That keeps the edge
 * policy decision table unit-testable (see tests/middleware-utils.test.ts)
 * and reusable from both the proxy and route handlers.
 */

/** Methods that can change server state — these get origin checks at the edge. */
export const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** A fresh correlation id for tracing one request across proxy → route → logs. */
export function newRequestId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Same-origin check used for CSRF defense in depth.
 *
 * Compares the `Origin` header against the request `Host`. The Origin header
 * is set by browsers on cross-site and same-site fetches alike, so requiring
 * an exact host match (when the header is present) blocks cross-origin form
 * posts and fetches from other sites while leaving first-party traffic and
 * non-browser clients (curl, LB probes — no Origin header) untouched.
 */
export function sameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return true; // Non-browser clients may omit Origin entirely.
  if (!host) return false;
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(originUrl.protocol)) return false;
  return originUrl.host === host;
}

export type RouteArea = "page" | "api";
export type RouteAccess = "private" | "public" | "auth" | "health";

export type RouteClass = {
  /** Page (document) request vs API (JSON) request — drives error format. */
  area: RouteArea;
  /**
   * private — requires a signed-in session (dashboard, data APIs).
   * public  — reachable unauthenticated (the landing, maintenance).
   * auth    — part of the auth flow itself (Neon Auth handler/complete).
   * health  — liveness probe, must never be gated.
   */
  route: RouteAccess;
};

/**
 * Static policy table for the whole app. The proxy reads this to decide
 * maintenance bypass, CSRF enforcement and auth guards; keep it the single
 * source of truth so routes and proxy never disagree.
 */
export function classifyPath(pathname: string): RouteClass {
  // API surface
  if (pathname === "/api/health" || pathname.startsWith("/api/health/"))
    return { area: "api", route: "health" };
  if (pathname.startsWith("/api/auth/"))
    return { area: "api", route: "auth" };
  if (pathname.startsWith("/api/"))
    return { area: "api", route: "private" };

  // Auth flow pages (handled by the Neon Auth middleware, never gated)
  if (pathname === "/auth/complete" || pathname.startsWith("/auth/complete/"))
    return { area: "page", route: "auth" };

  // Public pages. "/" is the landing and the only sign-in surface, so it is
  // public even though every other unmatched page is a private workspace
  // route. (The retired "/sign-in" path is a next.config redirect and falls
  // through to the private class on its way out.)
  if (pathname === "/") return { area: "page", route: "public" };
  if (pathname === "/maintenance" || pathname.startsWith("/maintenance/"))
    return { area: "page", route: "public" };

  // Everything else is the private workspace
  return { area: "page", route: "private" };
}

const TRUTHY = new Set(["1", "true", "yes", "on"]);

/** Minimal env shape so callers (and tests) can pass partial overrides. */
type EnvLike = Record<string, string | undefined>;

/**
 * Maintenance mode flag. Read per-request (cheap) so ops can flip the env
 * var and the next request honors it without a redeploy on platforms that
 * support live env updates.
 */
export function maintenanceActive(env: EnvLike = process.env): boolean {
  return TRUTHY.has((env.MAINTENANCE_MODE ?? "").trim().toLowerCase());
}

/** Retry-After hint advertised while maintenance is active (seconds). */
export function maintenanceRetryAfter(env: EnvLike = process.env): number {
  const raw = Number(env.MAINTENANCE_RETRY_AFTER ?? "");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 3600;
}

/**
 * Paths that stay reachable during maintenance: the maintenance page itself,
 * the health probe (LBs must be able to see the app is in maintenance),
 * the auth flow (a user mid sign-in must not be trapped), and the landing —
 * which is the only place to start sign-in, so gating it would leave no way
 * back in. The workspace itself stays gated.
 */
export function bypassesMaintenance(pathname: string): boolean {
  return (
    pathname === "/maintenance" ||
    pathname.startsWith("/maintenance/") ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/health/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/auth/complete" ||
    pathname.startsWith("/auth/complete/") ||
    pathname === "/"
  );
}

const NEXT_PARAM_MAX = 512;

/**
 * Validate a post-login redirect target ("?next=") so it can never become an
 * open redirect. Only root-relative paths are accepted: must start with "/",
 * must not start with "//" or "/\\" (protocol-relative), no scheme, no
 * backslashes anywhere, and bounded length.
 *
 * Returns the sanitized path or null when the input is absent/unsafe.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value || value.length > NEXT_PARAM_MAX) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\"))
    return null;
  if (value.includes("\\") || value.includes("://")) return null;
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}
