import { trashQuerySchema } from "@/lib/trash-core";
import { listTrash } from "@/lib/trash";
import { defineRoute } from "@/lib/route-handler";

export const runtime = "nodejs";

export const GET = defineRoute({ kind: "read" }, async ({ request, user }) => {
  const query = trashQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  return { data: await listTrash(user.id, query) };
});
