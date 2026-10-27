import { z } from "zod";
import { readBody } from "@/lib/api";
import { defineRoute } from "@/lib/route-handler";
import {
  deletePersonalTask,
  personalTaskUpdate,
  updatePersonalTask,
} from "@/lib/plan/progress";

const idSchema = z.string().uuid();
export const runtime = "nodejs";

export const PUT = defineRoute<{ id: string }>(
  { kind: "write" },
  async ({ request, params, user }) => {
    const id = idSchema.parse(params.id);
    const input = personalTaskUpdate.parse(await readBody(request));
    const task = await updatePersonalTask(user.id, id, input);
    return { data: task };
  },
);

export const DELETE = defineRoute<{ id: string }>(
  { kind: "write" },
  async ({ params, user }) => {
    const id = idSchema.parse(params.id);
    const result = await deletePersonalTask(user.id, id);
    return { data: result };
  },
);
