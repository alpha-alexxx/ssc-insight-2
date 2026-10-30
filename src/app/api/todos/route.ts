import { defineRoute } from "@/lib/route-handler";
import { readBody } from "@/lib/api";
import { database } from "@/lib/db";
import { createTodo, listTodos, trashTodosById, trashTodosByScope } from "@/lib/todos";
import { todoBulkTrashSchema } from "@/lib/todos-core";
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
export const DELETE = defineRoute(
  { kind: "write" },
  async ({ request, user }) => {
    const parsed = todoBulkTrashSchema.parse(await readBody(request));
    return {
      data:
        "ids" in parsed
          ? await trashTodosById(user.id, parsed.ids)
          : await trashTodosByScope(user.id, request.nextUrl.searchParams),
    };
  },
);
