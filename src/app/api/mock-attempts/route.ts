import { attemptListSchema, attemptSchemaFor, type Filters } from "@/lib/domain";
import { readBody, RequestError } from "@/lib/api";
import {
  createAttempt,
  LIST_ATTEMPTS_MAX,
  listAttempts,
  listAttemptsPaged,
} from "@/lib/repository";
import { loadExamContext, requirePattern } from "@/lib/exam-settings";
import { defineRoute } from "@/lib/route-handler";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = defineRoute({ kind: "read" }, async ({ request, user }) => {
  // Filters (type/subject/platform/date-range/search) flow back through the
  // same attemptWhere builder /history and /compare were always meant to
  // use. A request without `page` stays the unpaged full list the dashboard,
  // calendar, plan views, and the shell's caches depend on; `page` opts into
  // the server-paged envelope { items, total, page, pageSize, pageCount }
  // (plus `stats` KPI aggregates for /history) with optional sort/dir.
  const list = attemptListSchema.parse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  // Attempts are always scoped to the user's active tier — the switcher
  // decides the scope (the combined "all" view leaves the tier open), and
  // filters refine within it.
  const ctx = await loadExamContext(user.id);
  const filters: Filters = {
    examId: ctx.activeExamId,
    type: list.type,
    subject: list.subject,
    platform: list.platform,
    from: list.from,
    to: list.to,
    search: list.search,
    // attemptWhere skips "all", so the combined view stays unfiltered.
    tier: list.tier ?? ctx.activeTierId,
  };
  if (list.page != null) {
    const data = await listAttemptsPaged(user.id, filters, {
      page: list.page,
      pageSize: list.pageSize ?? 10,
      sort: list.sort ?? "date",
      dir: list.dir ?? "desc",
      withStats: list.stats === "1",
    });
    return { data, cache: { maxAgeSec: 0, swrSec: 2 } };
  }
  const items = await listAttempts(user.id, filters);
  const headers: Record<string, string> = {};
  if (items.length >= LIST_ATTEMPTS_MAX) {
    headers["X-List-Truncated"] = "true";
    headers["X-List-Max"] = String(LIST_ATTEMPTS_MAX);
  }
  return { data: items, cache: { maxAgeSec: 0, swrSec: 2 }, headers };
});

export const POST = defineRoute(
  {
    kind: "write",
    onError: (error, userId, startedAt) => {
      audit("mock.create", userId, {
        outcome:
          error instanceof RequestError && error.status === 429
            ? "denied"
            : "error",
        ms: Date.now() - startedAt,
      });
    },
  },
  async ({ request, user, startedAt }) => {
    const body = await readBody(request);
    // Resolve the claimed exam/tier to its concrete pattern first, then
    // validate the body against that pattern (counts, marking, sections).
    const claim = body as { examId?: unknown; tierId?: unknown };
    const ctx = await loadExamContext(user.id);
    const { resolved, shape } = requirePattern(
      ctx,
      typeof claim.examId === "string" ? claim.examId : undefined,
      typeof claim.tierId === "string" ? claim.tierId : undefined,
    );
    const input = attemptSchemaFor(shape).parse(body);
    const attempt = await createAttempt(user.id, input, shape);
    audit("mock.create", user.id, {
      sid: attempt.id,
      ms: Date.now() - startedAt,
      meta: {
        type: attempt.type,
        platform: attempt.platform,
        exam: resolved.examId,
        tier: resolved.tier.id,
      },
    });
    return { data: attempt, status: 201 };
  },
);
