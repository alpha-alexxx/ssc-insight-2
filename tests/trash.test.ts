import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TRASH_BULK_MAX,
  TRASH_EXPIRING_DAYS,
  TRASH_KINDS,
  TRASH_KIND_META,
  TRASH_KIND_ORDER,
  TRASH_RETENTION_DAYS,
  TRASH_RETENTION_MS,
  clampImportedDeletedAt,
  isTrashExpired,
  trashDaysLeft,
  trashExpiresAt,
  trashQuerySchema,
  trashSelectionSchema,
  uniqueSelection,
} from "../src/lib/trash-core";
import {
  EMPTY_TARGETS,
  pruneTargetsForExam,
  type TargetSettings,
} from "../src/lib/target-settings";
import { BUILT_IN_EXAMS, structureSignature } from "../src/lib/exams";

/**
 * Trash policy.
 *
 * The retention window is the product's promise, and the boundary it defines
 * is checked in three independent places (the list query, the restore path,
 * and the cleanup job). These tests pin the arithmetic once, so those three
 * can never drift apart: a record that the UI shows as recoverable must be
 * recoverable through the API at the same millisecond.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-11-01T06:30:00.000Z");

test("expiry is exactly the retention window after deletion", () => {
  const deletedAt = new Date(NOW - 3 * DAY);
  assert.equal(
    trashExpiresAt(deletedAt).getTime(),
    deletedAt.getTime() + TRASH_RETENTION_DAYS * DAY,
  );
  assert.equal(TRASH_RETENTION_MS, TRASH_RETENTION_DAYS * DAY);
});

test("days left rounds up and never goes negative", () => {
  // 14d 23h remaining is "15 days left" to a reader making a decision.
  assert.equal(trashDaysLeft(new Date(NOW - 1), NOW), TRASH_RETENTION_DAYS);
  assert.equal(trashDaysLeft(new Date(NOW - DAY), NOW), 14);
  // The final partial day still reads as one day, never zero.
  assert.equal(trashDaysLeft(new Date(NOW - TRASH_RETENTION_MS + 1), NOW), 1);
  // Past the edge, clamped rather than negative.
  assert.equal(trashDaysLeft(new Date(NOW - TRASH_RETENTION_MS - DAY), NOW), 0);
});

test("expiry flips at the boundary, inclusive, to the millisecond", () => {
  const deletedAt = new Date(NOW - TRASH_RETENTION_MS);
  const edge = deletedAt.getTime() + TRASH_RETENTION_MS;
  assert.equal(isTrashExpired(deletedAt, edge - 1), false);
  assert.equal(isTrashExpired(deletedAt, edge), true);
  assert.equal(isTrashExpired(deletedAt, edge + 1), true);
});

test("an imported deletion timestamp can never arrive already expired", () => {
  // A v5 backup exported before Trash existed carries real deletedAt values.
  const twoMonthsAgo = new Date(NOW - 60 * DAY).toISOString();
  const clamped = clampImportedDeletedAt(twoMonthsAgo, NOW);
  assert.ok(clamped);
  // Clamping lands on "deleted now", not on the expiry edge: the boundary is
  // inclusive, so the edge itself would import as already expired.
  assert.equal(clamped.getTime(), NOW);
  assert.equal(isTrashExpired(clamped, NOW), false);
  assert.equal(trashDaysLeft(clamped, NOW), TRASH_RETENTION_DAYS);
  // The import restarts the clock; it never shortens a fresher one.
  const recent = new Date(NOW - DAY).toISOString();
  assert.equal(clampImportedDeletedAt(recent, NOW)?.toISOString(), recent);
  // Absent or unparseable means "not deleted", never "deleted at epoch".
  assert.equal(clampImportedDeletedAt(null, NOW), null);
  assert.equal(clampImportedDeletedAt(undefined, NOW), null);
  assert.equal(clampImportedDeletedAt("not-a-date", NOW), null);
});

test("the list query defaults are the unfiltered first page", () => {
  const parsed = trashQuerySchema.parse({});
  assert.deepEqual(parsed, {
    kind: "all",
    q: "",
    status: "all",
    sort: "recent",
    page: 1,
    limit: 50,
  });
  // Query strings arrive as text; coercion is what makes ?page=2 work.
  assert.equal(trashQuerySchema.parse({ page: "3", limit: "10" }).page, 3);
  // Bounds are enforced, not silently clamped.
  assert.equal(trashQuerySchema.safeParse({ kind: "task" }).success, true);
  assert.equal(trashQuerySchema.safeParse({ kind: "everything" }).success, false);
  assert.equal(trashQuerySchema.safeParse({ page: "0" }).success, false);
  assert.equal(trashQuerySchema.safeParse({ limit: "101" }).success, false);
  assert.equal(trashQuerySchema.safeParse({ q: "x".repeat(201) }).success, false);});

test("a bulk selection is bounded and requires real ids", () => {
  const id = "0e3ff340-17b2-42b2-b537-d858eb6fa947";
  assert.equal(
    trashSelectionSchema.safeParse({ items: [{ kind: "attempt", id }] }).success,
    true,
  );
  assert.equal(trashSelectionSchema.safeParse({ items: [] }).success, false);
  assert.equal(
    trashSelectionSchema.safeParse({ items: [{ kind: "attempt", id: "1" }] })
      .success,
    false,
    "a primary key is a uuid, not an index",
  );
  assert.equal(
    trashSelectionSchema.safeParse({ items: [{ kind: "nothing", id }] }).success,
    false,
  );
  const tooMany = Array.from({ length: TRASH_BULK_MAX + 1 }, () => ({
    kind: "task" as const,
    id,
  }));
  assert.equal(
    trashSelectionSchema.safeParse({ items: tooMany }).success,
    false,
    "one request cannot exceed the write budget",
  );
});

test("a repeated selection is collapsed before any work is done", () => {
  const a = "0e3ff340-17b2-42b2-b537-d858eb6fa947";
  const b = "6c1c8f0e-2f2e-4e57-9b0b-1a2b3c4d5e6f";
  const unique = uniqueSelection([
    { kind: "attempt", id: a },
    { kind: "attempt", id: a },
    // Same id, different kind is a different record.
    { kind: "task", id: a },
    { kind: "task", id: b },
  ]);
  assert.deepEqual(unique, [
    { kind: "attempt", id: a },
    { kind: "task", id: a },
    { kind: "task", id: b },
  ]);
});

test("every trashable kind has a label and an address", () => {
  // The same completeness guard tests/routes.test.ts applies to views: a new
  // kind must not reach the list with an undefined label.
  for (const kind of TRASH_KINDS) {
    const meta = TRASH_KIND_META[kind];
    assert.ok(meta, `${kind} is missing TRASH_KIND_META`);
    assert.ok(meta.label.length > 0);
    assert.ok(meta.plural.length > 0);
    assert.ok(meta.module.length > 0);
  }
  assert.deepEqual([...TRASH_KIND_ORDER].sort(), [...TRASH_KINDS].sort());
  assert.equal(new Set(TRASH_KIND_ORDER).size, TRASH_KINDS.length);
  // "Expiring soon" must be a real slice of the window, not the whole of it.
  assert.ok(TRASH_EXPIRING_DAYS > 0);
  assert.ok(TRASH_EXPIRING_DAYS < TRASH_RETENTION_DAYS);
});

test("purging an exam drops its own targets but keeps a shared default", () => {
  const cglTier = BUILT_IN_EXAMS.find((exam) => exam.id === "cgl")!.tiers[0]!;
  const sharedSignature = structureSignature(cglTier);
  const customSignature = "m:quant7|q:|mk:2/0.5";
  const targets: TargetSettings = {
    ...EMPTY_TARGETS,
    percentiles: { cgl: 95, "custom-1": 80 },
    tierTargets: {
      "cgl:tier1": 150,
      "cgl:all": 155,
      "custom-1:a": 60,
    },
    tierDefaults: {
      // Shared with a surviving built-in paper — must survive this exam.
      [sharedSignature]: 160,
      // Only this exam had this paper — must go with it.
      [customSignature]: 50,
    },
  };
  const surviving = new Set(
    BUILT_IN_EXAMS.flatMap((exam) =>
      exam.tiers.map((tier) => structureSignature(tier)),
    ),
  );
  const pruned = pruneTargetsForExam(targets, "custom-1", surviving);

  assert.deepEqual(pruned.tierTargets, {
    "cgl:tier1": 150,
    "cgl:all": 155,
  });
  assert.deepEqual(pruned.percentiles, { cgl: 95 });
  assert.deepEqual(pruned.tierDefaults, { [sharedSignature]: 160 });
  // The envelope version is part of the contract; pruning is not a migration.
  assert.equal(pruned.version, targets.version);
  // The input is untouched — a partial failure must not corrupt the live row.
  assert.equal(targets.percentiles["custom-1"], 80);
  assert.equal(targets.tierDefaults[customSignature], 50);
});

test("pruning another account's exam id changes nothing", () => {
  const targets: TargetSettings = {
    ...EMPTY_TARGETS,
    percentiles: { cgl: 95 },
    tierTargets: { "cgl:tier1": 150 },
    tierDefaults: {},
  };
  const surviving = new Set<string>();
  const pruned = pruneTargetsForExam(targets, "someone-else", surviving);
  assert.deepEqual(pruned.percentiles, { cgl: 95 });
  assert.deepEqual(pruned.tierTargets, { "cgl:tier1": 150 });
});
