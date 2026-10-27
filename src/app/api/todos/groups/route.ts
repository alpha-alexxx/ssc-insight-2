import { z } from "zod";
import { defineRoute } from "@/lib/route-handler";
import { readBody } from "@/lib/api";
import { database } from "@/lib/db";
export const GET = defineRoute({}, async ({ user }) => ({
  data: await database().todoGroup.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  }),
}));
export const POST = defineRoute(
  { kind: "write" },
  async ({ request, user }) => {
    const { name } = z
      .object({ name: z.string().trim().min(1).max(80) })
      .parse(await readBody(request));
    return {
      data: await database().todoGroup.create({
        data: { userId: user.id, name },
      }),
      status: 201,
    };
  },
);
