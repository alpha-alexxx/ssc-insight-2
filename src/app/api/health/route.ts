import { database } from "@/lib/db";
import { healthSnapshot } from "@/lib/audit";
import { defineRoute } from "@/lib/route-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthStatus = "ok" | "degraded" | "down";

/**
 * Liveness + readiness check.
 *
 * - GET /api/health         — liveness only (process up, version, uptime)
 * - GET /api/health?deep=1  — also pings the database
 *
 * Returns 200 on ok/degraded, 503 on down. Public and never rate limited so
 * load balancers and uptime monitors can call it; the proxy also keeps it
 * reachable during maintenance mode.
 */
export const GET = defineRoute(
  { auth: "public", rateLimit: false, kind: "read" },
  async ({ request }) => {
    const deep = new URL(request.url).searchParams.get("deep") === "1";

    const status: HealthStatus = "ok";
    const checks: Record<
      string,
      { ok: boolean; latencyMs?: number; error?: string }
    > = {};

    if (deep) {
      try {
        const start = Date.now();
        await database().$queryRaw`SELECT 1`;
        checks.database = { ok: true, latencyMs: Date.now() - start };
      } catch (error) {
        checks.database = {
          ok: false,
          error: error instanceof Error ? error.message : "unknown",
        };
      }
      const anyDown = Object.values(checks).some((c) => !c.ok);
      if (anyDown) {
        return Response.json(
          { status: "down", ...healthSnapshot(), checks },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    return Response.json(
      { status, ...healthSnapshot(), ...(deep ? { checks } : {}) },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  },
);
