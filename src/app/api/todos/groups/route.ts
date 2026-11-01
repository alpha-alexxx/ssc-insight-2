import { z } from "zod";
import { defineRoute } from "@/lib/route-handler";
import { readBody, RequestError } from "@/lib/api";
import { database } from "@/lib/db";
export const GET = defineRoute({}, async ({ user }) => ({
  data: await database().todoGroup.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
  }),
}));
export const POST = defineRoute(
  { kind: "write" },
  async ({ request, user }) => {
    const { name } = z
      .object({ name: z.string().trim().min(1).max(80) })
      .parse(await readBody(request));
    // A trashed group keeps its name (that is what makes restore
    // conflict-free), so creating the same name would fail on the unique
    // constraint with an opaque P2002. Name both ways out instead.
    const trashed = await database().todoGroup.findFirst({
      where: { userId: user.id, name, deletedAt: { not: null } },
      select: { id: true },
    });
    if (trashed)
      throw new RequestError(
        `A group named “${name}” is in Trash. Restore it or delete it permanently first.`,
        409,
      );
    return {
      data: await database().todoGroup.create({
        data: { userId: user.id, name },
      }),
      status: 201,
    };
  },
);
