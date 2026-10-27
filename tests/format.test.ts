import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isIsoDate,
  istDateKey,
  longDate,
  shortDate,
} from "../src/lib/format";

test("IST attempt date is stable across UTC midnight", () => {
  assert.equal(istDateKey("2026-10-23T18:30:00.000Z"), "2026-10-24");
  assert.equal(istDateKey("2026-10-24T18:29:59.999Z"), "2026-10-24");
  assert.equal(istDateKey("2026-10-24T18:30:00.000Z"), "2026-10-25");
  assert.equal(istDateKey("2026-10-24"), "2026-10-24");
});

test("invalid legacy dates render safely without inventing a date", () => {
  assert.equal(istDateKey("not-a-date"), "");
  assert.equal(shortDate("not-a-date"), "—");
  assert.equal(longDate("not-a-date"), "—");
});

test("ISO date validation rejects datetime strings and impossible dates", () => {
  assert.equal(isIsoDate("2026-10-27"), true);
  assert.equal(isIsoDate("2026-10-27T00:00:00Z"), false);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2026-02-28"), true);
  assert.equal(isIsoDate("27-10-2026"), false);
});
