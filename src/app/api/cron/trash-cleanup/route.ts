import { timingSafeEqual } from "node:crypto";
import { defineRoute } from "@/lib/route-handler";
import { RequestError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { purgeExpiredTrash, type CleanupResult } from "@/lib/trash";

export const runtime = "nodejs";
/** The loop below is bounded by this, not by the batch count. */
export const maxDuration = 60;

/**
 * Reclaim the disk behind expired Trash rows.
 *
 * Two things this job is deliberately NOT:
 *
 *  - It is not the retention rule. `/api/trash` already hides expired rows and
 *    `restoreTrash` rejects them, so logical expiry holds whether or not this
 *    ever runs. A missed run only delays freeing the bytes.
 *  - It is not a public endpoint. The scheduler authenticates with a bearer
 *    token compared against `CRON_SECRET`; with no secret configured the route
 *    fails closed (503) rather than running unauthenticated.
 *
 * Work is drained in batches so a large backlog cannot turn one invocation
 * into an unbounded transaction burst. `purgeExpiredTrash` isolates failures
 * per kind, so one bad table never blocks the other three.
 */

const BATCH_SIZE = 500;
/** Leave headroom inside `maxDuration` for the final audit write. */
const TIME_BUDGET_MS = 45_000;
const MAX_BATCHES = 20;

/**
 * Constant-time comparison that tolerates unequal lengths.
 * `timingSafeEqual` throws when the buffers differ in size, and that throw
 * would itself leak which half of the comparison failed.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? "";
}

export const GET = defineRoute(
  {
    auth: "public",
    rateLimit: false,
    kind: "read",
    onError: (error, _userId, startedAt) => {
      audit("trash.cleanup", undefined, {
        outcome:
          error instanceof RequestError && error.status === 429
            ? "denied"
            : "error",
        ms: Date.now() - startedAt,
      });
    },
  },
  async ({ request, startedAt }) => {
    const expected = (process.env.CRON_SECRET ?? "").trim();
    // Fail closed. An unset secret must never mean "open to the internet".
    if (!expected)
      throw new RequestError(
        "Cleanup is not configured on this deployment.",
        503,
      );
    if (!secretMatches(bearerToken(request), expected))
      throw new RequestError("Unauthorized", 401);

    const totals: CleanupResult = {
      attempts: 0,
      tasks: 0,
      exams: 0,
      groups: 0,
      total: 0,
      backlog: 0,
    };
    let batches = 0;
    for (; batches < MAX_BATCHES; batches += 1) {
      const pass = await purgeExpiredTrash(BATCH_SIZE);
      totals.attempts += pass.attempts;
      totals.tasks += pass.tasks;
      totals.exams += pass.exams;
      totals.groups += pass.groups;
      totals.total += pass.total;
      totals.backlog = pass.backlog;
      // Fully drained, or nothing left that this pass could remove.
      if (pass.backlog === 0 || pass.total === 0) break;
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
    }

    audit("trash.cleanup", undefined, {
      ms: Date.now() - startedAt,
      meta: {
        batches: String(batches + 1),
        removed: String(totals.total),
        backlog: String(totals.backlog),
      },
    });
    return { data: { ...totals, batches: batches + 1 } };
  },
);
