import { defineRoute } from "@/lib/route-handler";
import { readBody } from "@/lib/api";
import { database } from "@/lib/db";
import { mutateTodo } from "@/lib/todos";
export const runtime = "nodejs";
export const PATCH = defineRoute<{ id: string }>(
  { kind: "write" },
  async ({ request, user, params }) => {
    const input = await readBody(request);
    return {
      data: await database().$transaction((tx) =>
        mutateTodo(tx, user.id, params.id, input),
      ),
    };
  },
);
export const DELETE = defineRoute<{ id: string }>(
  { kind: "write" },
  async ({ request, user, params }) => {
    const input = await readBody(request);
    return {
      data: await database().$transaction((tx) =>
        mutateTodo(tx, user.id, params.id, input, true),
      ),
    };
  },
);
