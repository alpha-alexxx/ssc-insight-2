import { z } from "zod";
import { readBody, RequestError } from "@/lib/api";
import { emptyTrash } from "@/lib/trash";
import { defineRoute } from "@/lib/route-handler";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = defineRoute(
  {
    kind: "write",
    onError: (error, userId, startedAt) => {
      audit("trash.empty", userId, {
        outcome:
          error instanceof RequestError && error.status === 429
            ? "denied"
            : "error",
        ms: Date.now() - startedAt,
      });
    },
  },
  async ({ request, user }) => {
    // Server-side gate as well as the dialog: Empty Trash is irreversible, so
    // a request without the explicit flag is refused rather than obeyed.
    z.object({ confirm: z.literal(true) }).parse(await readBody(request));
    const result = await emptyTrash(user.id);
    audit("trash.empty", user.id, { meta: { total: result.total } });
    return { data: result };
  },
);
