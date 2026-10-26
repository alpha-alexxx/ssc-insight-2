import { defineRoute } from "@/lib/route-handler";
import { RequestError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Catch-all for unknown /api/* paths.
 *
 * API clients should never receive the HTML 404 page: every unknown API
 * endpoint answers with the same JSON envelope the rest of the API uses,
 * so client error handling stays uniform. More specific routes (health,
 * auth, mock-attempts, …) always win over this catch-all.
 */
export const GET = defineRoute<{ path: string[] }>(
  { auth: "public", kind: "read" },
  async () => {
    throw new RequestError("Unknown API endpoint", 404);
  },
);

// State-changing methods get the same answer (the write limiter applies,
// so unknown-endpoint probing costs the attacker the same budget as before).
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
