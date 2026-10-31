import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Pure search plumbing shared by the /api/search route and its tests: query
 * normalization, request validation, per-type keyset cursors, and the
 * exact→prefix→contains relevance tiers. No database or server-only imports
 * here — everything that touches Prisma or the plan module lives in
 * lib/search.ts so this file stays unit-testable.
 */

export const SEARCH_TYPES = ["attempts", "tasks", "groups", "plan"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

/** Where a result lives across pages, per type. Attempts/tasks/groups keyset
 *  on (timestamp, id) inside their relevance phase; the plan tiers are
 *  ordered lists keyed by position. Phase 0 = exact, 1 = prefix, 2 =
 *  contains (groups have no prefix phase). */
export type SearchCursors = Partial<
  Record<
    SearchType,
    { p: number; at?: string; id?: string; i?: number }
  >
>;

export const SEARCH_LIMIT_DEFAULT = 15;
export const SEARCH_LIMIT_MAX = 50;
export const SEARCH_QUERY_MIN = 2;
export const SEARCH_QUERY_MAX = 150;

/** Normalize before validating: collapse whitespace, drop control characters,
 *  clamp length. The normalized form is both the search term and the cache
 *  key, so "Percentage" and "  percentage  " share one cache entry. */
export function normalizeSearchQuery(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEARCH_QUERY_MAX);
}

export const searchRequestSchema = z.object({
  q: z
    .string()
    .min(SEARCH_QUERY_MIN)
    .max(SEARCH_QUERY_MAX),
  types: z
    .array(z.enum(SEARCH_TYPES))
    .nonempty()
    .catch([...SEARCH_TYPES]),
  limit: z.coerce
    .number()
    .int()
    .transform((n) => Math.min(Math.max(n, 1), SEARCH_LIMIT_MAX))
    .catch(SEARCH_LIMIT_DEFAULT),
  cursor: z.string().max(1024).optional().catch(undefined),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

/** Parse `types=attempts,plan` style CSV from the query string. Unknown
 *  values drop silently; an empty result means "search everything". */
export function parseSearchTypes(raw: string | null): SearchType[] {
  if (!raw) return [...SEARCH_TYPES];
  const wanted = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is SearchType =>
      (SEARCH_TYPES as readonly string[]).includes(part),
    );
  return [...new Set(wanted)];
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

/** Opaque cursor: one entry per requested type so each surface paginates
 *  independently. Malformed cursors degrade to page 1 — one bad value must
 *  not fail the whole search. */
export function encodeSearchCursors(cursors: SearchCursors): string {
  return toBase64Url(JSON.stringify(cursors));
}

export function decodeSearchCursors(
  value: string | undefined,
): SearchCursors {
  if (!value) return {};
  const json = fromBase64Url(value);
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: SearchCursors = {};
    for (const type of SEARCH_TYPES) {
      const entry = (parsed as Record<string, unknown>)[type];
      if (typeof entry !== "object" || entry === null) continue;
      const rec = entry as Record<string, unknown>;
      const decoded: NonNullable<SearchCursors[SearchType]> = {
        p: typeof rec.p === "number" ? rec.p : 0,
      };
      // Only present keys survive the round-trip — spurious undefined fields
      // would make cursors compare unequal to their decoded form.
      if (typeof rec.at === "string") decoded.at = rec.at;
      if (typeof rec.id === "string") decoded.id = rec.id;
      if (typeof rec.i === "number") decoded.i = rec.i;
      out[type] = decoded;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * The relevance tier of `name` against the normalized query — the ordering
 * contract every searcher implements in the database (phases 0/1/2) and the
 * plan searcher implements in memory. `null` = no match at all.
 */
export function matchTier(
  name: string,
  q: string,
): "exact" | "prefix" | "contains" | null {
  const haystack = name.toLowerCase();
  const needle = q.toLowerCase();
  if (haystack === needle) return "exact";
  if (haystack.startsWith(needle)) return "prefix";
  if (haystack.includes(needle)) return "contains";
  return null;
}

/** In-memory pagination for the plan searcher: slice one tier's ordered
 *  list from a position cursor, returning the page and the next position. */
export function takeFrom<T>(
  items: T[],
  position: number,
  limit: number,
): { page: T[]; next: number | null } {
  const start = Number.isFinite(position) && position > 0 ? position : 0;
  const page = items.slice(start, start + limit);
  const next = start + page.length;
  return { page, next: page.length < limit ? null : next };
}

/**
 * Relevance phase → where fragment. The `q` argument must already be
 * escapeLike()d — these builders stay pure so the tests can assert the
 * exact fragments the searchers send. Tier 0 = exact, 1 = prefix,
 * 2 = contains-minus-prefix (contains also sweeps the secondary fields).
 */
export function attemptPhaseWhere(
  tier: number,
  q: string,
): Prisma.MockAttemptWhereInput {
  const nameEquals = { name: { equals: q, mode: "insensitive" as const } };
  const namePrefix = { name: { startsWith: q, mode: "insensitive" as const } };
  if (tier === 0) return nameEquals;
  if (tier === 1) {
    return { AND: [namePrefix, { NOT: nameEquals }] };
  }
  return {
    AND: [
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { platform: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      },
      { NOT: namePrefix },
    ],
  };
}

export function taskPhaseWhere(
  tier: number,
  q: string,
): Prisma.PersonalTaskWhereInput {
  const titleEquals = { title: { equals: q, mode: "insensitive" as const } };
  const titlePrefix = { title: { startsWith: q, mode: "insensitive" as const } };
  if (tier === 0) return titleEquals;
  if (tier === 1) {
    return { AND: [titlePrefix, { NOT: titleEquals }] };
  }
  return {
    AND: [
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      },
      { NOT: titlePrefix },
    ],
  };
}
