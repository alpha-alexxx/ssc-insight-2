import { z } from "zod";
import {
  parseTierKey,
  patternMaxScore,
  structureSignature,
  type CustomExamDef,
  type StructureSignature,
  type TierPattern,
} from "./exam-pattern";

/**
 * Target configuration: three INDEPENDENT systems that must never be
 * conflated.
 *
 *  1. `percentiles` — one goal percentile per exam (0–100). It is a reported
 *     goal, never computed, never converted from marks, and never presented
 *     as a selection probability.
 *  2. `tierDefaults` — global marks defaults keyed by structure signature.
 *     Because the signature contains the question counts, qualifying flags
 *     and marking, a default can only ever be inherited by a tier with the
 *     identical paper — so no default can land on a different maximum.
 *  3. `tierTargets` — per-tier overrides. `number` = custom, `null` =
 *     explicitly no target. A MISSING key means "inherit", so the whole
 *     inherit / override / reset model is one map.
 *
 * Resolution precedence is override → structure default → none.
 *
 * Terminology kept distinct here and in the UI: target percentile · actual
 * percentile · target score · actual score · maximum marks · normalized
 * score · official cutoff · qualification status.
 */

export const TARGET_SETTINGS_VERSION = 2;

export type TargetSettings = {
  version: typeof TARGET_SETTINGS_VERSION;
  percentiles: Record<string, number>;
  tierDefaults: Record<StructureSignature, number>;
  tierTargets: Record<string, number | null>;
};

export const EMPTY_TARGETS: TargetSettings = {
  version: TARGET_SETTINGS_VERSION,
  percentiles: {},
  tierDefaults: {},
  tierTargets: {},
};

/**
 * The frozen map of which tier a pre-v2 target described. Legacy targets were
 * validated and displayed against the exam's PRIMARY tier, so an exported
 * value must land on that same tier. This is deliberately hardcoded rather
 * than read from the live catalog: correcting the catalog (CPO Paper I is now
 * 100 marks, not 200) must not silently move or reinterpret an old value.
 */
export const LEGACY_EXAM_PRIMARY_TIER: Record<string, string> = {
  cgl: "tier2",
  chsl: "tier2",
  cpo: "paper1",
};

const MAX_TARGET = 100_000;

/** Defensive cap on how many entries one account can store. */
const MAX_TIER_TARGETS = 300;
const MAX_TIER_DEFAULTS = 150;
const MAX_PERCENTILES = 60;

export const targetSettingsSchema = z
  .object({
    version: z.literal(TARGET_SETTINGS_VERSION),
    percentiles: z.record(
      z.string().min(1).max(40),
      z.number().finite().min(0).max(100),
    ),
    tierDefaults: z.record(
      z.string().min(8).max(400),
      z.number().finite().min(0).max(MAX_TARGET),
    ),
    tierTargets: z.record(
      z.string().min(3).max(81),
      z.number().finite().min(0).max(MAX_TARGET).nullable(),
    ),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Object.keys(value.percentiles).length > MAX_PERCENTILES)
      ctx.addIssue({ code: "custom", message: "Too many percentile targets" });
    if (Object.keys(value.tierDefaults).length > MAX_TIER_DEFAULTS)
      ctx.addIssue({ code: "custom", message: "Too many tier defaults" });
    if (Object.keys(value.tierTargets).length > MAX_TIER_TARGETS)
      ctx.addIssue({ code: "custom", message: "Too many tier targets" });
  });

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value == "object" && value !== null && !Array.isArray(value);
}

/** The legacy primary tier for one exam id, custom exams included. */
export function legacyPrimaryTierFor(examId: string): string {
  return LEGACY_EXAM_PRIMARY_TIER[examId] ?? "main";
}

/** Same shape `exams.ts` accepts for an exam id: a built-in slug or a uuid. */
const EXAM_ID = /^(?:[a-z][a-z0-9_-]{1,39}|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

/**
 * Convert the pre-v2 `{ examId: marks | null }` map. Each value becomes an
 * explicit override on that exam's frozen primary tier, reproducing exactly
 * what the user saw. It intentionally does NOT become a structure default —
 * that would leak the number onto other exams sharing the paper.
 *
 * Keys that are not an exam id shape are dropped: an old row can carry junk,
 * and inventing a `"0:main"` tier would put a target on nothing.
 */
export function migrateLegacyExamTargets(
  legacy: Record<string, unknown>,
): TargetSettings {
  const tierTargets: Record<string, number | null> = {};
  for (const [examId, value] of Object.entries(legacy)) {
    if (!EXAM_ID.test(examId)) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    tierTargets[`${examId}:${legacyPrimaryTierFor(examId)}`] = value;
  }
  return { ...EMPTY_TARGETS, tierTargets };
}

/**
 * Read a stored value in any supported shape. Never throws: a corrupt row
 * degrades to "no targets" rather than breaking the workspace.
 */
export function parseTargetSettings(value: unknown): TargetSettings {
  if (!isPlainObject(value)) return { ...EMPTY_TARGETS };

  if (value.version === TARGET_SETTINGS_VERSION) {
    const parsed = targetSettingsSchema.safeParse(value);
    if (parsed.success) return parsed.data;
    return { ...EMPTY_TARGETS };
  }

  // Pre-v2: a bare { examId: number | null } map, or an empty object.
  if (!("version" in value)) {
    const looksLegacy = Object.values(value).every(
      (entry) => entry === null || typeof entry === "number",
    );
    if (looksLegacy) return migrateLegacyExamTargets(value);
  }

  return { ...EMPTY_TARGETS };
}

/** True when the value is already in the current envelope. */
export function isCurrentTargetShape(value: unknown): boolean {
  return isPlainObject(value) && value.version === TARGET_SETTINGS_VERSION;
}

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

export type TargetSource = "override" | "tier-default" | "none";

export type EffectiveTarget = {
  /** The marks the user is actually working towards, or null. */
  marks: number | null;
  /** The maximum of THIS tier — the only denominator ever used with `marks`. */
  maxScore: number;
  signature: StructureSignature;
  source: TargetSource;
  /** The tier whose structure supplied an inherited default ("cgl:tier1"). */
  inheritedFromTierKey: string | null;
  /** Stored value exceeds this tier's current maximum (catalog correction). */
  outOfRange: boolean;
};

export type SignatureIndex = {
  maxFor(signature: StructureSignature): number | null;
  /** Every "examId:tierId" that carries this structure (curated + custom). */
  peers(signature: StructureSignature): string[];
  /** One stable example of the structure, for "inherited from …" copy. */
  representative(signature: StructureSignature): string | null;
};

/** Build the lookup once per request from the curated catalog + the user's
 * custom exams. Custom tiers participate so a custom exam can inherit too. */
export function buildSignatureIndex(
  exams: readonly {
    id: string;
    tiers: readonly TierPattern[];
  }[],
  customExams: readonly CustomExamDef[] = [],
): SignatureIndex {
  const bySignature = new Map<
    string,
    { max: number; peers: string[]; representative: string }
  >();
  const add = (examId: string, tier: TierPattern) => {
    const signature = structureSignature(tier);
    const max = patternMaxScore(tier);
    const key = `${examId}:${tier.id}`;
    const entry = bySignature.get(signature);
    if (entry) {
      entry.peers.push(key);
    } else {
      bySignature.set(signature, { max, peers: [key], representative: key });
    }
  };
  for (const exam of exams) for (const tier of exam.tiers) add(exam.id, tier);
  for (const exam of customExams)
    for (const tier of exam.tiers)
      add(exam.id, {
        id: tier.id,
        label: tier.label,
        subjects: tier.subjects,
        marking: tier.marking,
        sections: [],
      });

  return {
    maxFor: (signature) => bySignature.get(signature)?.max ?? null,
    peers: (signature) => bySignature.get(signature)?.peers ?? [],
    representative: (signature) =>
      bySignature.get(signature)?.representative ?? null,
  };
}

/**
 * Resolve one tier's effective target.
 *
 * `pattern` is the tier's own pattern, so `maxScore` is always the applicable
 * maximum — never an exam-wide or primary-tier figure.
 */
export function effectiveTarget(
  targets: TargetSettings,
  tierKey: string,
  pattern: Pick<TierPattern, "subjects" | "marking">,
  index: SignatureIndex,
): EffectiveTarget {
  const signature = structureSignature(pattern);
  const maxScore = patternMaxScore(pattern);

  if (Object.prototype.hasOwnProperty.call(targets.tierTargets, tierKey)) {
    const marks = targets.tierTargets[tierKey] ?? null;
    return {
      marks,
      maxScore,
      signature,
      source: "override",
      inheritedFromTierKey: null,
      outOfRange: marks != null && marks > maxScore,
    };
  }

  const fallback = targets.tierDefaults[signature];
  if (typeof fallback == "number" && Number.isFinite(fallback)) {
    return {
      marks: fallback,
      maxScore,
      signature,
      source: "tier-default",
      inheritedFromTierKey: index.representative(signature),
      outOfRange: fallback > maxScore,
    };
  }

  return {
    marks: null,
    maxScore,
    signature,
    source: "none",
    inheritedFromTierKey: null,
    outOfRange: false,
  };
}

export function percentileFor(
  targets: TargetSettings,
  examId: string,
): number | null {
  const value = targets.percentiles[examId];
  return typeof value == "number" && Number.isFinite(value) ? value : null;
}

/* ------------------------------------------------------------------ */
/* Edits                                                               */
/* ------------------------------------------------------------------ */

export type TargetEdit =
  | { kind: "inherit"; tierKey: string }
  | { kind: "override"; tierKey: string; marks: number | null }
  | { kind: "default"; signature: StructureSignature; marks: number | null }
  | { kind: "percentile"; examId: string; percentile: number | null };

export type TargetEditError = { code: string; message: string };

export type TargetResolver = (
  tierKey: string,
) => Pick<TierPattern, "subjects" | "marking"> | null;

/** Validate one edit against the live catalog. Returns an error instead of
 * throwing so pure callers and the route can both use it. */
export function validateTargetEdit(
  edit: TargetEdit,
  resolve: TargetResolver,
  index: SignatureIndex,
): TargetEditError | null {
  switch (edit.kind) {
    case "inherit":
      if (!resolve(edit.tierKey))
        return { code: "UNKNOWN_TIER", message: `Unknown exam tier: ${edit.tierKey}` };
      return null;
    case "override": {
      const pattern = resolve(edit.tierKey);
      if (!pattern)
        return { code: "UNKNOWN_TIER", message: `Unknown exam tier: ${edit.tierKey}` };
      if (edit.marks == null) return null;
      if (!Number.isFinite(edit.marks) || edit.marks < 0)
        return { code: "INVALID_TARGET", message: "Target must be zero or more" };
      const max = patternMaxScore(pattern);
      if (edit.marks > max)
        return {
          code: "TARGET_TOO_HIGH",
          message: `Target must be between 0 and ${max}`,
        };
      return null;
    }
    case "default": {
      const max = index.maxFor(edit.signature);
      if (max == null)
        return {
          code: "UNKNOWN_STRUCTURE",
          message: "That paper structure no longer exists",
        };
      if (edit.marks == null) return null;
      if (!Number.isFinite(edit.marks) || edit.marks < 0)
        return { code: "INVALID_TARGET", message: "Target must be zero or more" };
      if (edit.marks > max)
        return {
          code: "TARGET_TOO_HIGH",
          message: `Default target must be between 0 and ${max}`,
        };
      return null;
    }
    case "percentile":
      if (edit.percentile == null) return null;
      if (
        !Number.isFinite(edit.percentile) ||
        edit.percentile < 0 ||
        edit.percentile > 100
      )
        return {
          code: "INVALID_PERCENTILE",
          message: "Percentile must be between 0 and 100",
        };
      return null;
  }
}

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

/** Apply one edit immutably. Callers validate first. */
export function applyTargetEdit(
  current: TargetSettings,
  edit: TargetEdit,
): TargetSettings {
  switch (edit.kind) {
    case "inherit":
      return {
        ...current,
        tierTargets: withoutKey(current.tierTargets, edit.tierKey),
      };
    case "override":
      return {
        ...current,
        tierTargets: { ...current.tierTargets, [edit.tierKey]: edit.marks },
      };
    case "default":
      return {
        ...current,
        tierDefaults:
          edit.marks == null
            ? withoutKey(current.tierDefaults, edit.signature)
            : { ...current.tierDefaults, [edit.signature]: edit.marks },
      };
    case "percentile":
      return {
        ...current,
        percentiles:
          edit.percentile == null
            ? withoutKey(current.percentiles, edit.examId)
            : { ...current.percentiles, [edit.examId]: edit.percentile },
      };
  }
}

/** Apply a batch, stopping at the first invalid edit. */
export function applyTargetEdits(
  current: TargetSettings,
  edits: readonly TargetEdit[],
  resolve: TargetResolver,
  index: SignatureIndex,
): { next: TargetSettings } | { error: TargetEditError } {
  let next = current;
  for (const edit of edits) {
    const error = validateTargetEdit(edit, resolve, index);
    if (error) return { error };
    next = applyTargetEdit(next, edit);
  }
  return { next };
}

/** Every tier the caller can reach, resolved in one pass. */
export type WorkspaceTargets = {
  byTier: Record<string, EffectiveTarget>;
  byExamPercentile: Record<string, number | null>;
  peers: Record<StructureSignature, string[]>;
};

export function resolveWorkspaceTargets(
  targets: TargetSettings,
  exams: readonly { id: string; tiers: readonly TierPattern[] }[],
  customExams: readonly CustomExamDef[] = [],
): WorkspaceTargets {
  const index = buildSignatureIndex(exams, customExams);
  const byTier: Record<string, EffectiveTarget> = {};
  const peers: Record<StructureSignature, string[]> = {};

  const add = (examId: string, tier: TierPattern) => {
    const key = `${examId}:${tier.id}`;
    byTier[key] = effectiveTarget(targets, key, tier, index);
    const signature = structureSignature(tier);
    peers[signature] ??= index.peers(signature);
  };
  for (const exam of exams) for (const tier of exam.tiers) add(exam.id, tier);
  for (const exam of customExams)
    for (const tier of exam.tiers)
      add(exam.id, {
        id: tier.id,
        label: tier.label,
        subjects: tier.subjects,
        marking: tier.marking,
        sections: [],
      });

  const byExamPercentile: Record<string, number | null> = {};
  for (const exam of exams)
    byExamPercentile[exam.id] = percentileFor(targets, exam.id);
  for (const exam of customExams)
    byExamPercentile[exam.id] = percentileFor(targets, exam.id);

  return { byTier, byExamPercentile, peers };
}

/**
 * Remove everything a permanently deleted exam owned: its per-tier overrides,
 * its percentile goal, and any structure default no surviving tier still
 * carries.
 *
 * `survivingSignatures` is passed in rather than read from the catalog so this
 * stays a pure function of its inputs — the caller resolves the live catalog
 * (built-ins plus the account's remaining custom exams) once, and one call can
 * prune several exams without re-deriving the index per id.
 *
 * The structure-default rule is the subtle one: a default is keyed by the
 * PAPER's shape, not by the exam, so it survives whenever any other tier —
 * built-in or the user's own — still has that identical paper. Dropping it
 * because one exam died would silently reset a target the user never touched.
 */
export function pruneTargetsForExam(
  targets: TargetSettings,
  examId: string,
  survivingSignatures: ReadonlySet<StructureSignature>,
): TargetSettings {
  const tierTargets = Object.fromEntries(
    Object.entries(targets.tierTargets).filter(
      ([key]) => parseTierKey(key)?.examId !== examId,
    ),
  );
  const percentiles = Object.fromEntries(
    Object.entries(targets.percentiles).filter(([key]) => key !== examId),
  );
  const tierDefaults = Object.fromEntries(
    Object.entries(targets.tierDefaults).filter(([signature]) =>
      survivingSignatures.has(signature),
    ),
  );
  return { ...targets, tierTargets, percentiles, tierDefaults };
}
