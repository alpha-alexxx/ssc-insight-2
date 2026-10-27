import { defineRoute } from "@/lib/route-handler";
import { personalCalendar } from "@/lib/todos";

export const runtime = "nodejs";
export const GET = defineRoute({ kind: "read" }, async ({ request, user }) => ({
  data: await personalCalendar(user.id, request.nextUrl.searchParams),
}));
