import type { SearchCursors } from "@/lib/search-core";
import {
  decodeSearchCursors,
  encodeSearchCursors,
  normalizeSearchQuery,
  parseSearchTypes,
  searchRequestSchema,
} from "@/lib/search-core";
import { runSearch, type SearchResponse } from "@/lib/search";
import { defineRoute } from "@/lib/route-handler";

export const runtime = "nodejs";

/**
 * Unified server-side search: one authenticated endpoint over mock attempts,
 * personal tasks, groups and the static study plan. Every surface is
 * user-scoped, relevance-phased (exact → prefix → contains) and keyset
 * paginated — the client never receives a table dump, and the per-type
 * cursors come back as one opaque blob it simply echoes to load more.
 */
export const GET = defineRoute({ kind: "read" }, async ({ request, user }) => {
  const params = request.nextUrl.searchParams;
  const parsed = searchRequestSchema.parse({
    q: normalizeSearchQuery(params.get("q") ?? ""),
    types: parseSearchTypes(params.get("types")),
    limit: params.get("limit") ?? undefined,
    cursor: params.get("cursor") ?? undefined,
  });
  const cursors = decodeSearchCursors(parsed.cursor);
  const response = await runSearch(parsed, cursors, user.id);
  return {
    data: {
      ...response,
      // The client treats this as opaque and echoes it back verbatim.
      nextCursor: response.hasMore
        ? encodeSearchCursors(collectCursors(response.results))
        : undefined,
    },
    cache: { maxAgeSec: 0, swrSec: 2 },
  };
});

function collectCursors(results: SearchResponse["results"]): SearchCursors {
  const out: SearchCursors = {};
  for (const [type, result] of Object.entries(results)) {
    if (result?.cursor) {
      out[type as keyof SearchCursors] = result.cursor;
    }
  }
  return out;
}
