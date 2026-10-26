import { attemptSchema } from "@/lib/domain";
import { readBody, RequestError } from "@/lib/api";
import {
  createAttempt,
  LIST_ATTEMPTS_MAX,
  listAttempts,
} from "@/lib/repository";
import { defineRoute } from "@/lib/route-handler";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = defineRoute({ kind: "read" }, async ({ user }) => {
  const items = await listAttempts(user.id);
  const headers: Record<string, string> = {};
  if (items.length >= LIST_ATTEMPTS_MAX) {
    headers["X-List-Truncated"] = "true";
    headers["X-List-Max"] = String(LIST_ATTEMPTS_MAX);
  }
  return { data: items, cache: { maxAgeSec: 0, swrSec: 2 }, headers };
});

export const POST = defineRoute(
  {
    kind: "write",
    onError: (error, userId, startedAt) => {
      audit("mock.create", userId, {
        outcome:
          error instanceof RequestError && error.status === 429
            ? "denied"
            : "error",
        ms: Date.now() - startedAt,
      });
    },
  },
  async ({ request, user, startedAt }) => {
    const input = attemptSchema.parse(await readBody(request));
    const attempt = await createAttempt(user.id, input);
    audit("mock.create", user.id, {
      sid: attempt.id,
      ms: Date.now() - startedAt,
      meta: { type: attempt.type, platform: attempt.platform },
    });
    return { data: attempt, status: 201 };
  },
);
