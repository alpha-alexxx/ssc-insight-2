import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyticsKeys,
  serializeAnalyticsParams,
} from "../src/lib/queries/analytics";
import type { Filters } from "../src/lib/domain";

/**
 * The analytics cache key IS the request.
 *
 * Two filter objects that produce the same URL must share one cache entry, and
 * two that produce different URLs must never share one. The old key was built
 * from the filter object while the URL dropped `type`/`subject`/`search`, so
 * the pair disagreed — harmless while a single surface asked, wrong the moment
 * the dashboard and /performance request different scopes from the same state.
 */

test("the key is derived from the request string", () => {
  const params = serializeAnalyticsParams("all", {});
  assert.deepEqual(analyticsKeys.request(params), [
    "analytics",
    "request",
    params,
  ]);
});

test("filters the request ignores do not fragment the cache", () => {
  const a: Filters = { platform: "Testbook" };
  const b: Filters = {
    platform: "Testbook",
    type: "full",
    subject: "quant",
    search: "mock",
  };
  // type/subject/search belong to the paged lists, not to analytics.
  assert.equal(
    serializeAnalyticsParams("all", a),
    serializeAnalyticsParams("all", b),
  );
});

test("filters the request honours do fragment it", () => {
  const base = serializeAnalyticsParams("all", {});
  for (const patch of [
    { platform: "Testbook" } as Filters,
    { tier: "tier2" } as Filters,
    { from: "2026-10-01" } as Filters,
    { to: "2026-10-31" } as Filters,
  ]) {
    assert.notEqual(serializeAnalyticsParams("all", patch), base);
  }
});

test("scope always distinguishes requests — one mock, four readings", () => {
  const seen = new Set(
    (["full", "subject", "sectional", "all"] as const).map((scope) =>
      serializeAnalyticsParams(scope, {}),
    ),
  );
  assert.equal(seen.size, 4);
});

test("equal filters serialize byte-identically regardless of key order", () => {
  const a: Filters = { platform: "RBE", from: "2026-10-01", tier: "tier2" };
  const b: Filters = { tier: "tier2", from: "2026-10-01", platform: "RBE" };
  assert.equal(
    serializeAnalyticsParams("subject", a),
    serializeAnalyticsParams("subject", b),
  );
});

test("an explicit all/exam-id never reaches the request", () => {
  // "all" is the absent value, and examId is server-derived — accepting it
  // from the client would be a scope-smuggling path.
  const params = serializeAnalyticsParams("all", {
    platform: "all",
    tier: "all",
    examId: "chsl",
  });
  assert.equal(params, "view=all");
});
