import { z } from "zod";
import { defineRoute } from "@/lib/route-handler";
import { readBody, RequestError } from "@/lib/api";
import { database } from "@/lib/db";
export const PATCH = defineRoute<{ id: string }>(
  { kind: "write" },
  async ({ request, user, params }) => {
    const { name } = z
      .object({ name: z.string().trim().min(1).max(80) })
      .parse(await readBody(request));
    const r = await database().todoGroup.updateMany({
      where: { id: params.id, userId: user.id },
      data: { name },
    });
    if (!r.count) throw new RequestError("Group not found.", 404);
    return { data: { id: params.id, name } };
  },
);
export const DELETE = defineRoute<{ id: string }>(
  { kind: "write" },
  async ({ user, params }) => {
    await database().$transaction(async (tx) => {
      const group = await tx.todoGroup.findFirst({
        where: { id: params.id, userId: user.id },
      });
      if (!group) throw new RequestError("Group not found.", 404);
      await tx.personalTask.updateMany({
        where: { groupId: group.id, userId: user.id },
        data: { groupId: null, version: { increment: 1 } },
      });
      await tx.todoGroup.delete({ where: { id: group.id } });
    });
    return { data: { id: params.id } };
  },
);
