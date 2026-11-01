import { test } from "node:test";
import assert from "node:assert/strict";
import {
  patternMaxScore,
  sameStructure,
  structureSignature,
} from "../src/lib/exam-pattern";
import {
  BUILT_IN_EXAMS,
  builtInExam,
  resolvePattern,
  sectionsForAttempt,
  stagesForExam,
  tierLabelFor,
  validateCatalog,
} from "../src/lib/exams";

/**
 * The catalog is a transcription of official SSC notices, so these tests are
 * the guard against a "helpful" edit that quietly changes a paper's shape.
 * Every number below was read from the notice named in the exam's `source`.
 */

function maxOf(examId: string, tierId: string): number {
  const exam = builtInExam(examId);
  const tier = exam?.tiers.find((t) => t.id === tierId);
  assert.ok(exam && tier, `${examId}:${tierId} must exist`);
  return patternMaxScore(tier);
}

test("every supported SSC examination is present", () => {
  assert.deepEqual(
    BUILT_IN_EXAMS.map((exam) => exam.id).sort(),
    ["cgl", "chsl", "cpo", "gd", "mts", "slpost", "steno"],
  );
});

test("catalog invariants hold", () => {
  assert.deepEqual(validateCatalog(), []);
});

test("official maxima match the notices", () => {
  // CGL 2026: Tier 1 200, Tier 2 Paper I 390 merit, Papers II/III 200 each.
  assert.equal(maxOf("cgl", "tier1"), 200);
  assert.equal(maxOf("cgl", "tier2"), 390);
  assert.equal(maxOf("cgl", "paper2"), 200);
  assert.equal(maxOf("cgl", "paper3"), 200);

  // CHSL 2026: Tier 1 200; Tier 2 is 360 merit (English 40 + GA 20, not 45/25).
  assert.equal(maxOf("chsl", "tier1"), 200);
  assert.equal(maxOf("chsl", "tier2"), 360);

  // MTS 2025: two mandatory sessions with separate marking.
  assert.equal(maxOf("mts", "session1"), 120);
  assert.equal(maxOf("mts", "session2"), 150);

  // CPO 2026 restructured Paper I to 100 and Paper II to four parts (320).
  assert.equal(maxOf("cpo", "paper1"), 100);
  assert.equal(maxOf("cpo", "paper2"), 320);

  assert.equal(maxOf("gd", "cbe"), 160);
  assert.equal(maxOf("steno", "cbe"), 200);
  assert.equal(maxOf("slpost", "cbe"), 200);
});

test("MTS Session I has no negative marking", () => {
  const tier = builtInExam("mts")?.tiers.find((t) => t.id === "session1");
  assert.ok(tier);
  assert.equal(tier.marking.incorrect, 0);
  assert.equal(tier.marking.correct, 3);
});

test("qualifying subjects are excluded from every merit total", () => {
  const cglT2 = builtInExam("cgl")?.tiers.find((t) => t.id === "tier2");
  assert.ok(cglT2);
  const computer = cglT2.subjects.find((s) => s.subjectId === "computer");
  assert.equal(computer?.qualifying, true);
  // 30 + 30 + 45 + 25 = 130 merit questions × 3 = 390, Computer excluded.
  assert.equal(patternMaxScore(cglT2), 390);
});

test("CGL and CHSL Tier 2 both declare the Tier 2 section split", () => {
  for (const examId of ["cgl", "chsl"] as const) {
    const sections = sectionsForAttempt(examId, "tier2");
    assert.deepEqual(
      sections.map((s) => s.id),
      ["section1", "section2", "section3"],
      `${examId} Tier 2 section ids`,
    );
    assert.deepEqual(sections[0]?.subjectIds, ["quant", "reasoning"]);
    assert.deepEqual(sections[1]?.subjectIds, ["english", "ga"]);
    // Section III is the qualifying Computer Knowledge test.
    assert.equal(sections[2]?.qualifying, true);
    assert.deepEqual(sections[2]?.subjectIds, ["computer"]);
  }
  // Tiers without a split stay empty rather than inventing one.
  assert.deepEqual(sectionsForAttempt("cgl", "tier1"), []);
  assert.deepEqual(sectionsForAttempt("gd", "cbe"), []);
});

test("section timers sum to the tier duration", () => {
  for (const examId of ["cgl", "chsl"] as const) {
    const tier = builtInExam(examId)?.tiers.find((t) => t.id === "tier2");
    assert.ok(tier);
    const total = tier.sections.reduce(
      (sum, section) => sum + (section.durationMinutes ?? 0),
      0,
    );
    assert.equal(total, tier.durationMinutes);
  }
});

test("part-level sectional timers sum to the tier duration", () => {
  // CPO Paper I and the Selection Post CBE run a per-part timer instead of
  // tier sections; the sum still has to reach the paper's stated duration.
  for (const [examId, tierId] of [
    ["cpo", "paper1"],
    ["cpo", "paper2"],
    ["slpost", "cbe"],
  ] as const) {
    const tier = builtInExam(examId)?.tiers.find((t) => t.id === tierId);
    assert.ok(tier);
    const total = tier.subjects.reduce(
      (sum, s) => sum + (s.timeMinutes ?? 0),
      0,
    );
    assert.equal(total, tier.durationMinutes, `${examId}:${tierId} part timers`);
  }
});

test("non-objective stages are metadata and always qualifying", () => {
  const cglStages = stagesForExam("cgl");
  assert.deepEqual(
    cglStages.map((s) => s.id),
    ["dest"],
  );
  assert.equal(cglStages[0]?.qualifying, true);

  assert.deepEqual(
    stagesForExam("gd").map((s) => s.id),
    ["pst_pet", "dme", "dv"],
  );
  assert.deepEqual(
    stagesForExam("cpo").map((s) => s.id),
    ["pst_pet", "dme"],
  );
  const steno = stagesForExam("steno");
  assert.equal(steno[0]?.durationMinutes, 10);
  assert.match(steno[0]?.note ?? "", /100 wpm/);
  assert.match(steno[0]?.note ?? "", /80 wpm/);

  for (const exam of BUILT_IN_EXAMS)
    for (const stage of exam.stages ?? []) {
      assert.equal(stage.qualifying, true, `${exam.id}:${stage.id}`);
      // A stage is never reachable as an attempt tier.
      assert.equal(
        exam.tiers.some((tier) => tier.id === stage.id),
        false,
        `${exam.id}:${stage.id} must not be a tier`,
      );
    }
});

test("every exam records where its numbers came from", () => {
  for (const exam of BUILT_IN_EXAMS) {
    assert.ok(exam.effectiveFrom, `${exam.id} effectiveFrom`);
    assert.match(exam.source.url, /^https:\/\/ssc\.gov\.in\//);
    assert.ok(exam.source.cycle.length > 0);
    assert.match(exam.source.retrievedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("structure signature ignores presentation and ignores source", () => {
  const tier = builtInExam("cgl")?.tiers.find((t) => t.id === "tier2");
  assert.ok(tier);
  const signature = structureSignature(tier);
  assert.equal(signature, structureSignature({ ...tier }));
  // Role and duration are descriptive metadata, not scoring inputs.
  assert.equal(
    structureSignature(tier),
    structureSignature({ subjects: tier.subjects, marking: tier.marking }),
  );
  assert.equal(
    signature,
    structureSignature({ subjects: [...tier.subjects].reverse(), marking: tier.marking }),
  );
});

test("structure signature changes when the paper's scoring changes", () => {
  const tier = builtInExam("cgl")?.tiers.find((t) => t.id === "tier2");
  assert.ok(tier);
  const signature = structureSignature(tier);

  const questionsChanged = {
    ...tier,
    subjects: tier.subjects.map((s) =>
      s.subjectId === "english" ? { ...s, questions: s.questions - 1 } : s,
    ),
  };
  assert.notEqual(structureSignature(questionsChanged), signature);

  const markingChanged = {
    ...tier,
    marking: { ...tier.marking, incorrect: 0.5 },
  };
  assert.notEqual(structureSignature(markingChanged), signature);

  const qualifyingChanged = {
    ...tier,
    subjects: tier.subjects.map((s) =>
      s.subjectId === "computer" ? { ...s, qualifying: false } : s,
    ),
  };
  assert.notEqual(structureSignature(qualifyingChanged), signature);
});

test("a signature never spans two different maxima", () => {
  const seen = new Map<string, number>();
  for (const exam of BUILT_IN_EXAMS)
    for (const tier of exam.tiers) {
      const signature = structureSignature(tier);
      const max = patternMaxScore(tier);
      const previous = seen.get(signature);
      if (previous != null) assert.equal(previous, max, signature);
      seen.set(signature, max);
    }
});

test("the only shared structure is the 200-mark four-part screening paper", () => {
  // This collision is intentional: CGL Tier 1, CHSL Tier 1 and the Selection
  // Post CBE are the same paper, so one structure default can serve all three.
  const target = builtInExam("cgl")?.tiers.find((t) => t.id === "tier1");
  assert.ok(target);
  const peers: string[] = [];
  for (const exam of BUILT_IN_EXAMS)
    for (const tier of exam.tiers)
      if (sameStructure(tier, target)) peers.push(`${exam.id}:${tier.id}`);
  assert.deepEqual(peers.sort(), ["cgl:tier1", "chsl:tier1", "slpost:cbe"]);

  // GD is also four parts at 2 marks, but its penalty differs, so it must
  // never inherit the 200-mark default.
  const gd = builtInExam("gd")?.tiers.find((t) => t.id === "cbe");
  assert.ok(gd);
  assert.equal(sameStructure(gd, target), false);
});

test("resolvePattern covers every declared tier and refuses unknown pairs", () => {
  for (const exam of BUILT_IN_EXAMS)
    for (const tier of exam.tiers) {
      const resolved = resolvePattern(exam.id, tier.id, []);
      assert.ok(resolved, `${exam.id}:${tier.id}`);
      assert.equal(resolved.examName, exam.name);
    }
  assert.equal(resolvePattern("cgl", "paper9", []), null);
  assert.equal(resolvePattern("nope", "tier1", []), null);
});

test("primary and default tiers exist and default sensibly", () => {
  for (const exam of BUILT_IN_EXAMS) {
    const primary = exam.tiers.find((t) => t.id === exam.primaryTierId);
    assert.ok(primary, `${exam.id} primary tier`);
    if (exam.defaultTierId)
      assert.ok(
        exam.tiers.some((t) => t.id === exam.defaultTierId),
        `${exam.id} default tier`,
      );
  }
  // MTS preselects Session I even though Session II is the merit anchor.
  assert.equal(builtInExam("mts")?.defaultTierId, "session1");
  // CPO's primary tier is Paper I, not "tier2" — the case the old resolver
  // got wrong.
  assert.equal(builtInExam("cpo")?.primaryTierId, "paper1");
});

test("tier labels are human names, not ids", () => {
  assert.equal(tierLabelFor("cgl", "tier2"), "Tier 2 — Paper I");
  assert.equal(tierLabelFor("cpo", "paper1"), "Paper I");
  assert.equal(tierLabelFor("gd", "cbe"), "CBE");
  assert.equal(tierLabelFor("cgl", "unknown"), "unknown");
});

test("approximate slots are flagged and carry a note", () => {
  const papers = ["paper2", "paper3"].map((id) =>
    builtInExam("cgl")?.tiers.find((t) => t.id === id),
  );
  for (const tier of papers) {
    assert.ok(tier);
    const slot = tier.subjects[0];
    assert.equal(slot?.slotFidelity, "approximate");
    assert.ok((slot?.slotNote ?? "").length > 0);
  }
  // No ordinary paper is marked approximate.
  const gd = builtInExam("gd")?.tiers[0];
  assert.ok(gd?.subjects.every((s) => s.slotFidelity !== "approximate"));
});
