import { readBody, RequestError } from "@/lib/api";
import { trashSelectionSchema } from "@/lib/trash-core";
import { restoreTrash } from "@/lib/trash";
import { defineRoute } from "@/lib/route-handler";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = defineRoute(
  {
    kind: "write",
    onError: (error, userId, startedAt) => {
      audit("trash.restore", userId, {
        outcome:
          error instanceof RequestError && error.status === 429
            ? "denied"
            : "error",
        ms: Date.now() - startedAt,
      });
    },
  },
  async ({ request, user }) => {
    const selection = trashSelectionSchema.parse(await readBody(request));
    const outcome = await restoreTrash(user.id, selection.items);
    audit("trash.restore", user.id, {
      outcome: outcome.failed.length ? "error" : "ok",
      meta: { done: outcome.done, failed: outcome.failed.length },
    });
    return { data: outcome };
  },
);
