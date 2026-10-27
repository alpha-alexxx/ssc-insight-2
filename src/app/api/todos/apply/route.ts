import { defineRoute } from "@/lib/route-handler";
import { readBody } from "@/lib/api";
import { applyTodos } from "@/lib/todos";
export const POST = defineRoute(
  { kind: "write" },
  async ({ request, user }) => ({
    data: await applyTodos(user.id, await readBody(request)),
  }),
);
