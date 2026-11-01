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
    // A trashed group holds its name (see the create route), so renaming onto
    // it would surface a raw P2002 instead of a recoverable message.
    const trashed = await database().todoGroup.findFirst({
      where: {
        userId: user.id,
        name,
        deletedAt: { not: null },
        id: { not: params.id },
      },
      select: { id: true },
    });
    if (trashed)
      throw new RequestError(
        `A group named “${name}” is in Trash. Restore it or delete it permanently first.`,
        409,
      );
    const r = await database().todoGroup.updateMany({
      where: { id: params.id, userId: user.id, deletedAt: null },
      data: { name },
    });
    if (!r.count) throw new RequestError("Group not found.", 404);
    return { data: { id: params.id, name } };
  },
);
export const DELETE = defineRoute<{ id: string }>(
  { kind: "write" },
  async ({ user, params }) => {
    // Soft delete. Tasks keep their groupId so a restore returns membership
    // intact; while the group is trashed they render ungrouped because the
    // group list excludes it.
    const r = await database().todoGroup.updateMany({
      where: { id: params.id, userId: user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!r.count) throw new RequestError("Group not found.", 404);
    return { data: { id: params.id } };
  },
);
