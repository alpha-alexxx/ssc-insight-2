import { defineRoute } from "@/lib/route-handler";
import { getPlanPayload } from "@/lib/plan/progress";
import { istTodayIso } from "@/lib/plan/view-model";

export const runtime = "nodejs";

/** The full 50-day plan merged with the signed-in user's progress. The
 * static plan shape is identical for every user; only the progress overlay
 * varies, so the response is private but cheap to rebuild. */
export const GET = defineRoute({ kind: "read" }, async ({ user }) => {
  const payload = await getPlanPayload(user.id);
  return {
    data: { ...payload, today: istTodayIso() },
    cache: { maxAgeSec: 0, swrSec: 5 },
  };
});
