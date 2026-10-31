import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseCalendarState,
  serializeCalendarState,
  type CalendarUrlState,
} from "../src/lib/calendar-url";
import { DEFAULT_LAYERS } from "../src/lib/plan/calendar-entries";

const TODAY = "2026-11-04";

function roundTrip(state: {
  mode: CalendarUrlState["mode"];
  date: string;
  layers: readonly ("plan" | "tasks" | "mocks")[];
}) {
  return parseCalendarState(
    serializeCalendarState(state, { date: TODAY }).split("?")[1] ?? "",
  );
}

test("the default landing serializes to a clean /calendar", () => {
  assert.equal(
    serializeCalendarState(
      { mode: null, date: TODAY, layers: DEFAULT_LAYERS },
      { date: TODAY },
    ),
    "/calendar",
  );
});

test("an automatic view is never written to the address", () => {
  const url = serializeCalendarState(
    { mode: null, date: "2026-12-01", layers: DEFAULT_LAYERS },
    { date: TODAY },
  );
  assert.equal(url, "/calendar?date=2026-12-01");
  assert.equal(url.includes("view"), false);
});

test("an explicitly picked view is written and survives a round trip", () => {
  const state = roundTrip({ mode: "day", date: TODAY, layers: DEFAULT_LAYERS });
  assert.equal(state.mode, "day");
  assert.equal(state.date, null);
  assert.equal(state.layers, null);
});

test("all four views parse", () => {
  for (const mode of ["month", "week", "day", "agenda"] as const)
    assert.equal(parseCalendarState(`?view=${mode}`).mode, mode);
});

test("layers serialize in canonical order regardless of input order", () => {
  const url = serializeCalendarState(
    { mode: null, date: TODAY, layers: ["mocks", "plan"] },
    { date: TODAY },
  );
  assert.equal(url, "/calendar?layers=plan%2Cmocks");
  assert.deepEqual(roundTrip({ mode: null, date: TODAY, layers: ["mocks", "plan"] }).layers, ["plan", "mocks"]);
});

test("an all-layers list is the default and is not serialized", () => {
  const url = serializeCalendarState(
    { mode: null, date: TODAY, layers: ["mocks", "plan", "tasks"] },
    { date: TODAY },
  );
  assert.equal(url, "/calendar");
});

test("unknown layer names drop individually", () => {
  assert.deepEqual(parseCalendarState("?layers=plan,bogus,tasks").layers, [
    "plan",
    "tasks",
  ]);
  assert.deepEqual(parseCalendarState("?layers=bogus").layers, null);
  assert.deepEqual(parseCalendarState("?layers=").layers, null);
});

test("a bad view or date drops only itself", () => {
  assert.deepEqual(parseCalendarState("?view=nope&date=2026-12-01"), {
    mode: null,
    date: "2026-12-01",
    layers: null,
  });
  assert.deepEqual(parseCalendarState("?view=week&date=2026-02-30"), {
    mode: "week",
    date: null,
    layers: null,
  });
});

test("a date outside the plan window round-trips unchanged", () => {
  const url = serializeCalendarState(
    { mode: "agenda", date: "2027-06-01", layers: DEFAULT_LAYERS },
    { date: TODAY },
  );
  assert.equal(url, "/calendar?view=agenda&date=2027-06-01");
  assert.equal(parseCalendarState(url.split("?")[1]!).date, "2027-06-01");
});

test("parse(serialize(x)) is idempotent for every reachable state", () => {
  const cases: Parameters<typeof roundTrip>[0][] = [
    { mode: null, date: TODAY, layers: DEFAULT_LAYERS },
    { mode: "agenda", date: TODAY, layers: DEFAULT_LAYERS },
    { mode: "month", date: "2026-12-31", layers: ["plan"] },
    { mode: "week", date: "2027-01-15", layers: ["tasks", "mocks"] },
    { mode: "day", date: "2026-10-01", layers: ["plan", "mocks"] },
  ];
  for (const state of cases) {
    const first = roundTrip(state);
    const second = roundTrip({
      mode: first.mode,
      date: first.date ?? TODAY,
      layers: first.layers ?? DEFAULT_LAYERS,
    });
    assert.deepEqual(second, first, JSON.stringify(state));
  }
});
