import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attemptPhaseWhere,
  decodeSearchCursors,
  encodeSearchCursors,
  matchTier,
  normalizeSearchQuery,
  parseSearchTypes,
  searchRequestSchema,
  takeFrom,
  taskPhaseWhere,
} from "../src/lib/search-core";

/**
 * Pure plumbing of the unified search system: query normalization, request
 * validation with clamps, the opaque per-type cursor round-trip, relevance
 * tiers, and plan-list pagination.
 */

test("normalizeSearchQuery collapses whitespace and clamps length", () => {
  assert.equal(normalizeSearchQuery("  Percentage   increase  "), "Percentage increase");
  assert.equal(normalizeSearchQuery("tab\tand\nnewline"), "tab and newline");
  assert.equal(normalizeSearchQuery("ok"), "ok");
  // Control characters become spaces, then collapse.
  assert.equal(normalizeSearchQuery("a\u0000b"), "a b");
  const long = normalizeSearchQuery("x".repeat(200));
  assert.equal(long.length, 150);
});

test("parseSearchTypes filters unknown values and de-duplicates", () => {
  assert.deepEqual(parseSearchTypes(null), [
    "attempts",
    "tasks",
    "groups",
    "plan",
  ]);
  assert.deepEqual(parseSearchTypes("plan,attempts"), ["plan", "attempts"]);
  assert.deepEqual(parseSearchTypes("plan,plan,bogus"), ["plan"]);
  assert.deepEqual(parseSearchTypes(""), ["attempts", "tasks", "groups", "plan"]);
});

test("searchRequestSchema enforces the documented bounds", () => {
  const ok = searchRequestSchema.parse({ q: "percentage" });
  assert.equal(ok.limit, 15); // default page size
  assert.deepEqual(ok.types, ["attempts", "tasks", "groups", "plan"]);
  // Too-short queries are the caller's debounce contract, enforced server-side.
  assert.throws(() => searchRequestSchema.parse({ q: "p" }));
  // Page size clamps at the strict maximum.
  // Page size clamps at the strict maximum.
  const clamped = searchRequestSchema.parse({ q: "percentage", limit: "999" });
  assert.equal(clamped.limit, 50);
  const floored = searchRequestSchema.parse({ q: "percentage", limit: "0" });
  assert.equal(floored.limit, 1);
});

test("search cursor round-trips per type and degrades gracefully", () => {
  const cursors = {
    attempts: { p: 1, at: "2026-10-30T00:00:00.000Z", id: "a1" },
    plan: { p: 0, i: 15 },
  };
  const encoded = encodeSearchCursors(cursors);
  assert.equal(typeof encoded, "string");
  assert.equal(encoded.includes("{"), false); // not raw JSON on the wire
  assert.deepEqual(decodeSearchCursors(encoded), cursors);

  // Malformed values degrade to page 1 instead of failing the search.
  assert.deepEqual(decodeSearchCursors(undefined), {});
  assert.deepEqual(decodeSearchCursors("!!!not-base64!!!"), {});
  assert.deepEqual(
    decodeSearchCursors(Buffer.from("not json").toString("base64url")),
    {},
  );
  assert.deepEqual(
    decodeSearchCursors(Buffer.from(JSON.stringify({ attempts: "junk" })).toString("base64url")),
    {},
  );
});

test("matchTier implements the exact → prefix → contains ladder", () => {
  assert.equal(matchTier("Percentage", "percentage"), "exact");
  assert.equal(matchTier("Percentage increase", "percentage"), "prefix");
  assert.equal(matchTier("Percentage increase", "percent"), "prefix");
  assert.equal(matchTier("Ratio and Percentage", "percent"), "contains");
  assert.equal(matchTier("Ratio and Proportion", "percent"), null);
  assert.equal(matchTier("PERCENTAGE", "percentage"), "exact");
});

test("takeFrom paginates an ordered list by position", () => {
  const items = Array.from({ length: 35 }, (_, i) => i);
  const first = takeFrom(items, 0, 15);
  assert.equal(first.page.length, 15);
  assert.equal(first.next, 15);
  const second = takeFrom(items, first.next ?? 0, 15);
  assert.equal(second.page[0], 15);
  assert.equal(second.next, 30);
  const third = takeFrom(items, 30, 15);
  assert.equal(third.page.length, 5);
  assert.equal(third.next, null); // exhausted — no cursor
  assert.deepEqual(takeFrom(items, -5, 3).page, [0, 1, 2]);
});

test("relevance phases translate to non-overlapping where fragments", () => {
  const q = "50\\%_x"; // already escapeLike()d — builders treat it literally
  const exact = attemptPhaseWhere(0, q);
  assert.deepEqual(exact, { name: { equals: q, mode: "insensitive" } });

  const prefix = attemptPhaseWhere(1, q);
  assert.deepEqual(prefix, {
    AND: [
      { name: { startsWith: q, mode: "insensitive" } },
      { NOT: { name: { equals: q, mode: "insensitive" } } },
    ],
  });

  // Contains sweeps platform + notes too, and excludes everything the
  // prefix phase already claimed.
  const contains = attemptPhaseWhere(2, q);
  assert.deepEqual(contains, {
    AND: [
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { platform: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      },
      { NOT: { name: { startsWith: q, mode: "insensitive" } } },
    ],
  });

  const taskPhases = [0, 1, 2].map((tier) => taskPhaseWhere(tier, "ratio"));
  assert.deepEqual(taskPhases[0], {
    title: { equals: "ratio", mode: "insensitive" },
  });
  assert.deepEqual(taskPhases[2], {
    AND: [
      {
        OR: [
          { title: { contains: "ratio", mode: "insensitive" } },
          { notes: { contains: "ratio", mode: "insensitive" } },
        ],
      },
      { NOT: { title: { startsWith: "ratio", mode: "insensitive" } } },
    ],
  });
});
