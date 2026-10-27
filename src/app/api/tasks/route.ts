import { readBody } from "@/lib/api";
import { defineRoute } from "@/lib/route-handler";
import {
  createPersonalTask,
  listPersonalTasks,
  personalTaskCreate,
} from "@/lib/plan/progress";

export const runtime = "nodejs";

export const GET = defineRoute({ kind: "read" }, async ({ user }) => {
  const items = await listPersonalTasks(user.id);
  return { data: items, cache: { maxAgeSec: 0, swrSec: 5 } };
});

export const POST = defineRoute({ kind: "write" }, async ({ request, user }) => {
  const input = personalTaskCreate.parse(await readBody(request));
  const task = await createPersonalTask(user.id, input);
  return { data: task, status: 201 };
});
