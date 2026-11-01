import { z } from "zod";
import { TRASH_KINDS } from "@/lib/trash-core";
import { getTrashDetail } from "@/lib/trash";
import { defineRoute } from "@/lib/route-handler";

const kindSchema = z.enum(TRASH_KINDS);
const idSchema = z.uuid();

export const runtime = "nodejs";

export const GET = defineRoute<{ kind: string; id: string }>(
  { kind: "read" },
  async ({ params, user }) => ({
    data: await getTrashDetail(
      user.id,
      kindSchema.parse(params.kind),
      idSchema.parse(params.id),
    ),
  }),
);
