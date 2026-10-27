import { defineRoute } from "@/lib/route-handler";
import { readBody } from "@/lib/api";
import { database } from "@/lib/db";
import { createTodo, listTodos } from "@/lib/todos";
export const runtime = "nodejs";
export const GET = defineRoute({ kind: "read" }, async ({ request, user }) => ({
  data: await listTodos(user.id, request.nextUrl.searchParams),
}));
export const POST = defineRoute(
  { kind: "write" },
  async ({ request, user }) => {
    const input = await readBody(request);
    return {
      data: await database().$transaction((tx) =>
        createTodo(tx, user.id, input),
      ),
      status: 201,
    };
  },
);
