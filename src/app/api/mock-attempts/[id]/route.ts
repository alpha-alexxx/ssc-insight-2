import { z } from "zod";
import { attemptSchema } from "@/lib/domain";
import { readBody, RequestError } from "@/lib/api";
import { deleteAttempt, getAttempt, updateAttempt } from "@/lib/repository";
import { defineRoute } from "@/lib/route-handler";
import { audit } from "@/lib/audit";

const idSchema = z.uuid();
export const runtime = "nodejs";

export const GET = defineRoute<{ id: string }>(
  { kind: "read" },
  async ({ params, user }) => {
    const attempt = await getAttempt(user.id, idSchema.parse(params.id));
    return { data: attempt, cache: { maxAgeSec: 0, swrSec: 2 } };
  },
);

export const PUT = defineRoute<{ id: string }>(
  {
    kind: "write",
    onError: (error, userId, startedAt) => {
      audit("mock.update", userId, {
        outcome: error instanceof RequestError && error.status === 429 ? "denied" : "error",
        ms: Date.now() - startedAt,
      });
    },
  },
  async ({ request, params, user, startedAt }) => {
    const id = idSchema.parse(params.id);
    const input = attemptSchema.parse(await readBody(request));
    const attempt = await updateAttempt(user.id, id, input);
    audit("mock.update", user.id, {
      sid: id,
      ms: Date.now() - startedAt,
      meta: { type: attempt.type },
    });
    return { data: attempt };
  },
);

export const DELETE = defineRoute<{ id: string }>(
  {
    kind: "write",
    onError: (error, userId, startedAt) => {
      audit("mock.delete", userId, {
        outcome: error instanceof RequestError && error.status === 429 ? "denied" : "error",
        ms: Date.now() - startedAt,
      });
    },
  },
  async ({ request, params, user, startedAt }) => {
    const id = idSchema.parse(params.id);
    await readBody(request); // CSRF/size checks happen while draining the body
    const result = await deleteAttempt(user.id, id);
    audit("mock.delete", user.id, { sid: id, ms: Date.now() - startedAt });
    return { data: result };
  },
);
