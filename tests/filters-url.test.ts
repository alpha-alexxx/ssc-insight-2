import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWorkspaceState, serializeWorkspaceState } from "../src/lib/filters-url";
import { filtersSchema } from "../src/lib/domain";

test("workspace url state round-trips through serialize and parse", () => {
  const state = {
    filters: {
      type: "full",
      subject: "quant",
      platform: "Testbook",
      search: "mock 12",
      from: "2026-01-01",
      to: "2026-02-01",
    },
    scope: "sectional" as const,
  };
  const url = serializeWorkspaceState("/history", state);
  assert.equal(url, "/history?type=full&subject=quant&platform=Testbook&search=mock+12&from=2026-01-01&to=2026-02-01&scope=sectional");
  assert.deepEqual(parseWorkspaceState(url.slice(url.indexOf("?"))), state);
});

test("default values keep the URL bare", () => {
  const url = serializeWorkspaceState("/dashboard", {
    filters: { type: "all", subject: "all", platform: "all", search: "" },
    scope: "full",
  });
  assert.equal(url, "/dashboard");
});

test("malformed deep-link params fall back to defaults per field", () => {
  const state = parseWorkspaceState("?type=bogus&scope=nope&from=not-a-date&platform=Testbook");
  assert.equal(state.filters.type, undefined);
  assert.equal(state.filters.from, undefined);
  assert.equal(state.filters.platform, "Testbook");
  assert.equal(state.scope, "full");
});

test("over-long platform and search values are dropped, not errors", () => {
  const state = parseWorkspaceState(`?platform=${"x".repeat(81)}&search=${"s".repeat(151)}`);
  assert.equal(state.filters.platform, undefined);
  assert.equal(state.filters.search, undefined);
});

test("parse tolerates empty and absent query strings", () => {
  assert.deepEqual(parseWorkspaceState(""), { filters: {}, scope: "full" });
  assert.deepEqual(parseWorkspaceState("?scope=all"), { filters: {}, scope: "all" });
});

test("shared strict schema (analytics API contract) rejects bad params, allows empty dates", () => {
  assert.throws(() => filtersSchema.parse({ type: "bogus" }));
  assert.deepEqual(filtersSchema.parse({ type: "full", from: "", search: "alpha" }), {
    type: "full",
    from: "",
    search: "alpha",
  });
});
