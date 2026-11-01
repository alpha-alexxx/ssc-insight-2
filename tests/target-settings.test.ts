import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_TARGETS,
  applyTargetEdit,
  applyTargetEdits,
  buildSignatureIndex,
  effectiveTarget,
  isCurrentTargetShape,
  legacyPrimaryTierFor,
  migrateLegacyExamTargets,
  parseTargetSettings,
  percentileFor,
  resolveWorkspaceTargets,
  validateTargetEdit,
  type TargetSettings,
} from "../src/lib/target-settings";
import { BUILT_IN_EXAMS, patternMaxScore, structureSignature } from "../src/lib/exams";
import type { TierPattern } from "../src/lib/exam-pattern";

/**
 * The target envelope is the piece most likely to hurt a user if it drifts:
 * a number attached to the wrong paper is silently wrong on every chart.
 * These tests pin the resolution precedence, the inheritance rule, the
 * migration from the pre-v2 map, and the ceiling validation.
 */

const index = buildSignatureIndex(BUILT_IN_EXAMS);

function tier(examId: string, tierId: string): TierPattern {
  const found = BUILT_IN_EXAMS.find((e) => e.id === examId)?.tiers.find(
    (t) => t.id === tierId,
  );
  assert.ok(found, `${examId}:${tierId}`);
  return found;
}

test("a legacy per-exam target pins to the frozen primary tier", () => {
  // CGL/CHSL were always measured on Tier 2; CPO on Paper I.
  assert.equal(legacyPrimaryTierFor("cgl"), "tier2");
  assert.equal(legacyPrimaryTierFor("chsl"), "tier2");
  assert.equal(legacyPrimaryTierFor("cpo"), "paper1");
  // Anything else — including a custom exam uuid — keeps the "main" tier.
  assert.equal(legacyPrimaryTierFor("0e3ff340-17b2-42b2-b537-d858eb6fa947"), "main");

  const migrated = migrateLegacyExamTargets({ cgl: 320, cpo: 90 });
  assert.deepEqual(migrated, {
    version: 2,
    percentiles: {},
    tierDefaults: {},
    tierTargets: { "cgl:tier2": 320, "cpo:paper1": 90 },
  });
});

test("legacy migration drops nulls and non-numbers", () => {
  const migrated = migrateLegacyExamTargets({
    cgl: null,
    chsl: 100,
    cpo: "bogus",
    0: 5,
  } as unknown as Record<string, unknown>);
  assert.deepEqual(migrated.tierTargets, { "chsl:tier2": 100 });
});

test("parseTargetSettings accepts both shapes and never throws", () => {
  // Current envelope round-trips.
  const current: TargetSettings = {
    version: 2,
    percentiles: { cgl: 95 },
    tierDefaults: {},
    tierTargets: { "cgl:tier2": 320 },
  };
  assert.deepEqual(parseTargetSettings(JSON.parse(JSON.stringify(current))), current);
  assert.equal(isCurrentTargetShape(current), true);

  // Legacy map migrates.
  assert.deepEqual(parseTargetSettings({ cgl: 250 }).tierTargets, {
    "cgl:tier2": 250,
  });

  // Garbage degrades to "no targets".
  for (const value of [null, undefined, "text", 42, [], { version: 9 }, { cgl: {} }])
    assert.deepEqual(parseTargetSettings(value), EMPTY_TARGETS, JSON.stringify(value));
});

test("resolution precedence is override → structure default → none", () => {
  const cglT1 = tier("cgl", "tier1");
  const signature = structureSignature(cglT1);

  // No default, no override: nothing.
  assert.deepEqual(
    pick(effectiveTarget(EMPTY_TARGETS, "cgl:tier1", cglT1, index)),
    { marks: null, source: "none", inherited: null, outOfRange: false },
  );

  // A structure default resolves on every peer of the same paper.
  const withDefault: TargetSettings = {
    ...EMPTY_TARGETS,
    tierDefaults: { [signature]: 150 },
  };
  for (const key of ["cgl:tier1", "chsl:tier1", "slpost:cbe"]) {
    const [examId, tierId] = key.split(":") as [string, string];
    const resolved = effectiveTarget(
      withDefault,
      key,
      tier(examId, tierId),
      index,
    );
    assert.equal(resolved.marks, 150, key);
    assert.equal(resolved.source, "tier-default", key);
    assert.equal(resolved.maxScore, 200, key);
  }

  // An override wins over the default.
  const withOverride: TargetSettings = {
    ...withDefault,
    tierTargets: { "cgl:tier1": 180 },
  };
  const resolved = effectiveTarget(withOverride, "cgl:tier1", cglT1, index);
  assert.equal(resolved.marks, 180);
  assert.equal(resolved.source, "override");

  // An explicit null override beats the default and means "no target".
  const withNull: TargetSettings = {
    ...withDefault,
    tierTargets: { "cgl:tier1": null },
  };
  const suppressed = effectiveTarget(withNull, "cgl:tier1", cglT1, index);
  assert.equal(suppressed.marks, null);
  assert.equal(suppressed.source, "override");
});

test("a structure default never crosses a different paper", () => {
  const signature = structureSignature(tier("cgl", "tier1"));
  const withDefault: TargetSettings = {
    ...EMPTY_TARGETS,
    tierDefaults: { [signature]: 150 },
  };
  // GD is also four parts at 2 marks, but the penalty differs.
  const gd = effectiveTarget(withDefault, "gd:cbe", tier("gd", "cbe"), index);
  assert.equal(gd.marks, null);
  assert.equal(gd.source, "none");
  // CPO Paper I has a different marking and maximum.
  const cpo = effectiveTarget(withDefault, "cpo:paper1", tier("cpo", "paper1"), index);
  assert.equal(cpo.source, "none");
});

test("resetting to inherited restores the default and is idempotent", () => {
  const cglT1 = tier("cgl", "tier1");
  const signature = structureSignature(cglT1);
  let targets: TargetSettings = {
    ...EMPTY_TARGETS,
    tierDefaults: { [signature]: 150 },
  };
  targets = applyTargetEdit(targets, {
    kind: "override",
    tierKey: "cgl:tier1",
    marks: 175,
  });
  assert.equal(effectiveTarget(targets, "cgl:tier1", cglT1, index).source, "override");

  targets = applyTargetEdit(targets, { kind: "inherit", tierKey: "cgl:tier1" });
  const restored = effectiveTarget(targets, "cgl:tier1", cglT1, index);
  assert.equal(restored.marks, 150);
  assert.equal(restored.source, "tier-default");

  // Applying it again changes nothing.
  const again = applyTargetEdit(targets, { kind: "inherit", tierKey: "cgl:tier1" });
  assert.deepEqual(again, targets);
});

test("percentile is independent of marks and never derived", () => {
  let targets: TargetSettings = { ...EMPTY_TARGETS };
  targets = applyTargetEdit(targets, {
    kind: "percentile",
    examId: "cgl",
    percentile: 95,
  });
  targets = applyTargetEdit(targets, {
    kind: "override",
    tierKey: "cgl:tier2",
    marks: 300,
  });
  assert.equal(percentileFor(targets, "cgl"), 95);

  // Clearing the marks target leaves the percentile untouched.
  targets = applyTargetEdit(targets, { kind: "inherit", tierKey: "cgl:tier2" });
  assert.equal(percentileFor(targets, "cgl"), 95);
  assert.equal(effectiveTarget(targets, "cgl:tier2", tier("cgl", "tier2"), index).marks, null);

  // Clearing the percentile leaves everything else untouched.
  targets = applyTargetEdit(targets, {
    kind: "percentile",
    examId: "cgl",
    percentile: null,
  });
  assert.equal(percentileFor(targets, "cgl"), null);
});

test("an override above the paper's maximum is rejected with the ceiling", () => {
  const resolve = (key: string) => {
    const [examId, tierId] = key.split(":") as [string, string];
    return resolveTier(examId, tierId);
  };
  const over = validateTargetEdit(
    { kind: "override", tierKey: "cpo:paper1", marks: 150 },
    resolve,
    index,
  );
  assert.ok(over);
  assert.equal(over.code, "TARGET_TOO_HIGH");
  assert.match(over.message, /100/);

  // Exactly the maximum is allowed.
  assert.equal(
    validateTargetEdit(
      { kind: "override", tierKey: "cpo:paper1", marks: 100 },
      resolve,
      index,
    ),
    null,
  );

  // Unknown tiers and unknown structures are rejected, never guessed.
  assert.equal(
    validateTargetEdit({ kind: "override", tierKey: "cgl:nope", marks: 10 }, resolve, index)
      ?.code,
    "UNKNOWN_TIER",
  );
  assert.equal(
    validateTargetEdit(
      { kind: "default", signature: "m:none|q:|mk:1/1", marks: 10 },
      resolve,
      index,
    )?.code,
    "UNKNOWN_STRUCTURE",
  );

  // Percentile bounds.
  assert.equal(
    validateTargetEdit(
      { kind: "percentile", examId: "cgl", percentile: 101 },
      resolve,
      index,
    )?.code,
    "INVALID_PERCENTILE",
  );
});

test("a legacy value above the corrected ceiling survives, flagged", () => {
  // The old CPO Paper I was 200 marks; the corrected paper is 100. A stored
  // 150 is the user's own goal and must not be silently dropped or clamped.
  const migrated = migrateLegacyExamTargets({ cpo: 150 });
  const resolved = effectiveTarget(
    migrated,
    "cpo:paper1",
    tier("cpo", "paper1"),
    index,
  );
  assert.equal(resolved.marks, 150);
  assert.equal(resolved.maxScore, 100);
  assert.equal(resolved.outOfRange, true);
});

test("a batch applies in order and stops at the first invalid edit", () => {
  const resolve = (key: string) => {
    const [examId, tierId] = key.split(":") as [string, string];
    return resolveTier(examId, tierId);
  };
  const ok = applyTargetEdits(
    { ...EMPTY_TARGETS },
    [
      { kind: "percentile", examId: "cgl", percentile: 90 },
      { kind: "override", tierKey: "cgl:tier2", marks: 350 },
    ],
    resolve,
    index,
  );
  assert.ok("next" in ok);
  assert.equal(ok.next.tierTargets["cgl:tier2"], 350);
  assert.equal(ok.next.percentiles.cgl, 90);

  const bad = applyTargetEdits(
    { ...EMPTY_TARGETS },
    [
      { kind: "override", tierKey: "cgl:tier2", marks: 350 },
      { kind: "override", tierKey: "cgl:tier2", marks: 9999 },
    ],
    resolve,
    index,
  );
  assert.ok("error" in bad);
  assert.equal(bad.error.code, "TARGET_TOO_HIGH");
});

test("resolveWorkspaceTargets covers every curated tier with its own max", () => {
  const workspace = resolveWorkspaceTargets(EMPTY_TARGETS, BUILT_IN_EXAMS);
  for (const exam of BUILT_IN_EXAMS)
    for (const tier of exam.tiers) {
      const key = `${exam.id}:${tier.id}`;
      const resolved = workspace.byTier[key];
      assert.ok(resolved, key);
      assert.equal(resolved.maxScore, patternMaxScore(tier), key);
      assert.equal(resolved.source, "none", key);
    }
  assert.equal(workspace.byExamPercentile.cgl, null);
});

test("peer lists name every tier sharing a paper", () => {
  const signature = structureSignature(tier("cgl", "tier1"));
  assert.deepEqual(index.peers(signature).sort(), [
    "cgl:tier1",
    "chsl:tier1",
    "slpost:cbe",
  ]);
});

function resolveTier(examId: string, tierId: string) {
  return (
    BUILT_IN_EXAMS.find((e) => e.id === examId)?.tiers.find((t) => t.id === tierId) ??
    null
  );
}

function pick(target: ReturnType<typeof effectiveTarget>) {
  return {
    marks: target.marks,
    source: target.source,
    inherited: target.inheritedFromTierKey,
    outOfRange: target.outOfRange,
  };
}
