import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { devAuthBypassActive } from "@/lib/auth/dev-bypass";
import { accessLog } from "@/lib/access-log";
import { publicOrigin } from "@/lib/public-url";
import {
  UNSAFE_METHODS,
  bypassesMaintenance,
  classifyPath,
  maintenanceActive,
  maintenanceRetryAfter,
  newRequestId,
  sameOrigin,
} from "@/lib/middleware-utils";

/**
 * Edge-of-app proxy (Next.js 16 middleware, Node.js runtime).
 *
 * Runs before every page and API route (static assets are excluded in the
 * matcher) and provides the cross-cutting concerns a real-world deployment
 * needs:
 *
 *  1. Request correlation — every request gets an `x-request-id`, forwarded
 *     downstream to route handlers and echoed on the response, so proxy
 *     logs, route logs and audit events can be tied together.
 *  2. Maintenance mode — MAINTENANCE_MODE=1 answers API calls with 503 and
 *     sends browsers to /maintenance, while keeping /api/health, the auth
 *     flow and the landing (the only sign-in surface) reachable.
 *  3. CSRF defense in depth — cross-origin state-changing API calls are
 *     rejected at the edge (route handlers re-check when they read bodies).
 *  4. Authentication — private pages go through the Neon Auth middleware;
 *     anonymous visitors are sent to the landing (the only sign-in surface).
 *  5. Structured access logging — gate decisions are logged via waitUntil
 *     so they never delay the response.
 *
 * Dev binding: `next dev --hostname 0.0.0.0` makes the middleware request
 * URL and OAuth exchange resolve to 0.0.0.0; every request is re-written
 * onto the public origin first (see withPublicUrl) so redirects and the
 * auth flow keep working in local development.
 *
 * API routes keep their own session checks (proxy coverage must never be
 * the only line of defense — Server Functions and direct handler calls can
 * bypass the matcher).
 */

/**
 * The landing is the only sign-in surface, so it is also the Neon Auth login
 * URL. The SDK matches the login path exactly (not as a prefix), so private
 * routes stay protected while "/" passes through.
 */
const LOGIN_URL = "/";

/**
 * Next dev binds to 0.0.0.0, so the middleware's request URL and OAuth
 * exchange can otherwise redirect the browser to http://0.0.0.0:3000.
 */
function withPublicUrl(request: NextRequest) {
  const origin = publicOrigin(request);
  const internal = new URL(request.url);
  if (origin === internal.origin) return request;
  const url = new URL(request.url);
  const publicBase = new URL(origin);
  url.protocol = publicBase.protocol;
  url.host = publicBase.host;
  return new NextRequest(url, {
    method: request.method,
    headers: request.headers,
    signal: request.signal,
  });
}

function withPublicLocation(response: NextResponse, request: NextRequest) {
  const location = response.headers.get("location");
  if (!location) return response;
  try {
    const target = new URL(location, request.url);
    const internal = new URL(request.url);
    const rewrite =
      target.origin === internal.origin ||
      target.hostname === "0.0.0.0" ||
      target.hostname === "[::]" ||
      target.hostname === "::";
    if (!rewrite) return response;
    response.headers.set(
      "location",
      new URL(
        `${target.pathname}${target.search}${target.hash}`,
        publicOrigin(request),
      ).toString(),
    );
  } catch {
    // Leave malformed or external redirects untouched.
  }
  return response;
}

/** JSON error envelope that matches the route layer's shape (src/lib/api.ts). */
function jsonError(
  status: number,
  code: string,
  message: string,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "private, no-store", ...extraHeaders } },
  );
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const forwarded = withPublicUrl(request);
  const requestId = forwarded.headers.get("x-request-id") ?? newRequestId();
  const started = Date.now();
  const { pathname } = forwarded.nextUrl;
  const method = forwarded.method;
  const cls = classifyPath(pathname);

  // Forward the correlation id to route handlers; echo it on the response.
  const downstreamHeaders = new Headers(forwarded.headers);
  downstreamHeaders.set("x-request-id", requestId);

  const finish = (response: NextResponse, note?: string): NextResponse => {
    response.headers.set("x-request-id", requestId);
    const ms = Date.now() - started;
    const evt = {
      method,
      path: pathname,
      status: response.status,
      ms,
      rid: requestId,
      where: "proxy" as const,
      ...(note ? { note } : {}),
      cls,
    };
    event.waitUntil(Promise.resolve(accessLog(evt)));
    return response;
  };

  /** Terminal gate decision (redirect/maintenance/403) — stamps proxy
   *  timing. Pass-through responses deliberately DON'T set Server-Timing:
   *  Next applies proxy response headers after the route handler runs, so
   *  it would clobber the handler's `app;dur` entry. */
  const gate = (response: NextResponse, note: string): NextResponse => {
    response.headers.set("Server-Timing", `proxy;dur=${Date.now() - started}`);
    return finish(response, note);
  };

  const passThrough = (note?: string) =>
    finish(
      NextResponse.next({ request: { headers: downstreamHeaders } }),
      note,
    );

  // ── 1. Maintenance gate ────────────────────────────────────────────────
  if (maintenanceActive() && !bypassesMaintenance(pathname)) {
    const retryAfter = String(maintenanceRetryAfter());
    if (cls.area === "api") {
      return gate(
        jsonError(
          503,
          "MAINTENANCE_MODE",
          "The tracker is briefly offline for scheduled maintenance. Your data is safe — try again shortly.",
          { "Retry-After": retryAfter },
        ),
        "maintenance",
      );
    }
    const target = new URL("/maintenance", forwarded.url);
    target.searchParams.set("retryAfter", retryAfter);
    return gate(NextResponse.redirect(target, 307), "maintenance");
  }

  // ── 2. CSRF defense in depth for state-changing API calls ─────────────
  // Auth endpoints are excluded: the Neon Auth handler validates its own
  // requests, and blocking it at the edge could break callback flows.
  if (
    cls.area === "api" &&
    cls.route !== "auth" &&
    cls.route !== "health" &&
    UNSAFE_METHODS.has(method)
  ) {
    const origin = forwarded.headers.get("origin");
    const host = forwarded.headers.get("host") ?? forwarded.nextUrl.host;
    if (!sameOrigin(origin, host)) {
      return gate(
        jsonError(
          403,
          "CROSS_ORIGIN_BLOCKED",
          "Cross-origin changes are not allowed",
        ),
        "csrf",
      );
    }
  }

  // ── 3. Local development bypass ───────────────────────────────────────
  // Same contract as require-user.ts: the flag is only honored outside
  // production. Route handlers still enforce their own auth, so API
  // behavior matches production minus the network round-trips.
  if (devAuthBypassActive()) return passThrough("dev-bypass");

  // ── 4. Ungated endpoints ──────────────────────────────────────────────
  // Health probes and the auth API own their complete request lifecycle.
  if (cls.area === "api" && (cls.route === "health" || cls.route === "auth")) {
    return passThrough();
  }

  // ── 5. Auth flow page: always through the Neon Auth middleware ────────
  if (cls.route === "auth") {
    try {
      return finish(
        withPublicLocation(
          await auth().middleware({ loginUrl: LOGIN_URL })(forwarded),
          forwarded,
        ),
      );
    } catch {
      return gate(
        NextResponse.redirect(
          new URL(`${LOGIN_URL}?error=unavailable`, forwarded.url),
        ),
        "auth-flow-unavailable",
      );
    }
  }

  // ── 6. Public landing page (also the login URL): always reachable ─────
  // The page itself verifies the session (requireUser), bounces signed-in
  // visitors to "/dashboard", and renders the Google sign-in affordance for
  // everyone else. So the proxy never needs to probe here. Neon Auth's
  // middleware always ALLOWS the login path (it special-cases the loginUrl),
  // so probing it can never distinguish anonymous from signed-in visitors —
  // doing so previously bounced every login-path request back to itself, an
  // infinite loop. Keep this pass-through ABOVE the private-page gate.
  if (pathname === LOGIN_URL) return passThrough("landing");

  // ── 7. Private pages: session guard ───────────────────────────────────
  try {
    return finish(
      withPublicLocation(
        await auth().middleware({ loginUrl: LOGIN_URL })(forwarded),
        forwarded,
      ),
    );
  } catch {
    return gate(
      NextResponse.redirect(
        new URL(`${LOGIN_URL}?error=unavailable`, forwarded.url),
      ),
      "auth-unavailable",
    );
  }
}

/**
 * Run on everything except Next.js internals and static assets.
 * `_next/data` is intentionally NOT excluded: the proxy keeps covering it
 * so a protected page can never be bypassed via its data route.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml|woff2?|ttf|otf|eot)$).*)",
  ],
};
