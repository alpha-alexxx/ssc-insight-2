import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultListState,
  mirrorsWorkspaceState,
  parseWorkspaceState,
  safeWorkspaceReturnTo,
  serializeWorkspaceState,
} from "../src/lib/filters-url";
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
    list: defaultListState,
  };
  const url = serializeWorkspaceState("/history", state);
  assert.equal(url, "/history?type=full&subject=quant&platform=Testbook&search=mock+12&from=2026-01-01&to=2026-02-01&scope=sectional");
  assert.deepEqual(parseWorkspaceState(url.slice(url.indexOf("?"))), state);
});

test("default values keep the URL bare", () => {
  const url = serializeWorkspaceState("/dashboard", {
    filters: { type: "all", subject: "all", platform: "all", search: "" },
    scope: "full",
    list: defaultListState,
  });
  assert.equal(url, "/dashboard");
});

test("paged list state round-trips and non-defaults serialize", () => {
  const state = {
    filters: {},
    scope: "full" as const,
    list: { page: 3, pageSize: 50, sort: "score", dir: "asc" } as const,
  };
  const url = serializeWorkspaceState("/history", state);
  assert.equal(url, "/history?page=3&pageSize=50&sort=score&dir=asc");
  assert.deepEqual(parseWorkspaceState(url.slice(url.indexOf("?"))), state);
});

test("malformed list params fall back to defaults per field", () => {
  const state = parseWorkspaceState("?page=bogus&pageSize=17&sort=nope&dir=sideways&page=0");
  assert.deepEqual(state.list, defaultListState);
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
  assert.deepEqual(parseWorkspaceState(""), {
    filters: {},
    scope: "full",
    list: defaultListState,
  });
  assert.deepEqual(parseWorkspaceState("?scope=all"), {
    filters: {},
    scope: "all",
    list: defaultListState,
  });
});

test("planner/Add Mock routes are excluded from the filter URL mirror", () => {
  assert.equal(mirrorsWorkspaceState("/dashboard"), true);
  assert.equal(mirrorsWorkspaceState("/history"), true);
  assert.equal(mirrorsWorkspaceState("/compare"), true);
  assert.equal(mirrorsWorkspaceState("/add"), false);
  assert.equal(mirrorsWorkspaceState("/calendar"), false);
  assert.equal(mirrorsWorkspaceState("/plan/2026-10-27"), false);
  assert.equal(mirrorsWorkspaceState("/my-tasks"), false);
  assert.equal(mirrorsWorkspaceState("/settings"), false);
});

test("Add Mock return targets are same-app planner/result routes only", () => {
  assert.equal(safeWorkspaceReturnTo("/plan/2026-10-27"), "/plan/2026-10-27");
  assert.equal(safeWorkspaceReturnTo("/calendar"), "/calendar");
  assert.equal(safeWorkspaceReturnTo("https://evil.example/plan/2026-10-27"), null);
  assert.equal(safeWorkspaceReturnTo("//evil.example/calendar"), null);
  assert.equal(safeWorkspaceReturnTo("/settings"), null);
  assert.equal(safeWorkspaceReturnTo("/add"), null);
});

test("shared strict schema (analytics API contract) rejects bad params, allows empty dates", () => {
  assert.throws(() => filtersSchema.parse({ type: "bogus" }));
  assert.deepEqual(filtersSchema.parse({ type: "full", from: "", search: "alpha" }), {
    type: "full",
    from: "",
    search: "alpha",
  });
});
