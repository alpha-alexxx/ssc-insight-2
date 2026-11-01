import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SCOPE,
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
  // A restored state always carries the (empty) compare selection.
  assert.deepEqual(parseWorkspaceState(url.slice(url.indexOf("?"))), {
    ...state,
    ids: [],
  });
});

test("default values keep the URL bare", () => {
  const url = serializeWorkspaceState("/dashboard", {
    filters: { type: "all", subject: "all", platform: "all", search: "" },
    scope: DEFAULT_SCOPE,
    list: defaultListState,
  });
  assert.equal(url, "/dashboard");
});

test("paged list state round-trips and non-defaults serialize", () => {
  const state = {
    filters: {},
    scope: DEFAULT_SCOPE,
    list: { page: 3, pageSize: 50, sort: "score", dir: "asc" } as const,
  };
  const url = serializeWorkspaceState("/history", state);
  assert.equal(url, "/history?page=3&pageSize=50&sort=score&dir=asc");
  assert.deepEqual(parseWorkspaceState(url.slice(url.indexOf("?"))), {
    ...state,
    ids: [],
  });
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
  assert.equal(state.scope, "all");
});

test("over-long platform and search values are dropped, not errors", () => {
  const state = parseWorkspaceState(`?platform=${"x".repeat(81)}&search=${"s".repeat(151)}`);
  assert.equal(state.filters.platform, undefined);
  assert.equal(state.filters.search, undefined);
});

test("parse tolerates empty and absent query strings", () => {
  assert.deepEqual(parseWorkspaceState(""), {
    filters: {},
    scope: DEFAULT_SCOPE,
    list: defaultListState,
    ids: [],
  });
  // "all" is the default, so it is absent from a clean URL and parsed back
  // only when explicitly present.
  assert.equal(parseWorkspaceState("?scope=all").scope, DEFAULT_SCOPE);
  assert.equal(parseWorkspaceState("?scope=sectional").scope, "sectional");
});

test("planner/Add Mock routes are excluded from the filter URL mirror", () => {
  assert.equal(mirrorsWorkspaceState("/dashboard"), true);
  assert.equal(mirrorsWorkspaceState("/history"), true);
  assert.equal(mirrorsWorkspaceState("/compare"), true);
  assert.equal(mirrorsWorkspaceState("/performance"), true);
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
  // A comparison can be returned to after logging a mock from it.
  assert.equal(safeWorkspaceReturnTo("/compare"), "/compare");
  assert.equal(safeWorkspaceReturnTo("/performance"), "/performance");
  assert.equal(safeWorkspaceReturnTo("/compare?ids=abc123,def456"), "/compare?ids=abc123,def456");
});

test("a compare selection round-trips and is capped at four", () => {
  const ids = ["aaa111", "bbb222", "ccc333", "ddd444"];
  const url = serializeWorkspaceState("/compare", {
    filters: {},
    scope: DEFAULT_SCOPE,
    list: defaultListState,
    ids,
  });
  assert.equal(url, "/compare?ids=aaa111,bbb222,ccc333,ddd444");
  assert.deepEqual(parseWorkspaceState(url.slice(url.indexOf("?"))).ids, ids);

  // A fifth id is ignored; a shared link cannot widen the comparison.
  const tooMany = parseWorkspaceState("?ids=aaa111,bbb222,ccc333,ddd444,eee555");
  assert.deepEqual(tooMany.ids, ids);

  // Malformed entries are dropped, and duplicates collapse.
  assert.deepEqual(
    parseWorkspaceState("?ids=aaa111,!!,aaa111,bbb222").ids,
    ["aaa111", "bbb222"],
  );

  // The selection is only serialized on /compare — it means nothing elsewhere.
  assert.equal(
    serializeWorkspaceState("/history", {
      filters: {},
      scope: DEFAULT_SCOPE,
      list: defaultListState,
      ids,
    }),
    "/history",
  );
});

test("shared strict schema (analytics API contract) rejects bad params, allows empty dates", () => {
  assert.throws(() => filtersSchema.parse({ type: "bogus" }));
  assert.deepEqual(filtersSchema.parse({ type: "full", from: "", search: "alpha" }), {
    type: "full",
    from: "",
    search: "alpha",
  });
});
