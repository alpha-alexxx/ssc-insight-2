import { database } from "./db";
import type {
  CustomExamDef,
  CustomTierDef,
  PatternSubject,
  ResolvedPattern,
} from "./exams";
import {
  ALL_TIERS_ID,
  CUSTOM_FIRST_TIER_ID,
  patternMaxScore,
  patternShape,
  parseTierKey,
  resolvePattern,
} from "./exams";
import type { PatternShape } from "./domain";
import { LruCache } from "./cache";
import { RequestError } from "./api";

/**
 * Server-side exam context: the per-user workspace scope (TrackerSettings)
 * plus the user's custom exams. Every route that touches attempts resolves
 * its pattern through here so validation, scoring, and AI prompts all see
 * the same exam+tier truth.
 *
 * Scope is tier-level: enabledTiers holds "examId:tierId" keys, and the
 * active context is one tier — or ALL_TIERS_ID for an exam's combined view.
 */

export type TrackerSettingsShape = {
  activeExamId: string;
  /** Tier id of the active exam, or ALL_TIERS_ID for the combined view. */
  activeTierId: string;
  /** Enabled selectable tiers as "examId:tierId" keys. */
  enabledTiers: string[];
  /** Target score per EXAM id (against its primary tier maximum). */
  examTargets: Record<string, number | null>;
};

export const DEFAULT_SETTINGS: TrackerSettingsShape = {
  activeExamId: "cgl",
  activeTierId: "tier2",
  // New accounts pick their exams — the workspace stays in an empty state
  // until the Exams settings panel has something enabled.
  enabledTiers: [],
  examTargets: {},
};

/** Per-user settings cache. One row per user, read on every page load,
 * written only from the settings panel. 60s TTL with write-through. */
const settingsCache = new LruCache<string, TrackerSettingsShape>({
  ttlMs: 60_000,
  maxBytes: 256_000,
});

function parseTierKeys(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (key): key is string =>
          typeof key === "string" && parseTierKey(key) != null,
      )
    : [];
}

function parseExamTargets(value: unknown): Record<string, number | null> {
  if (value == null || typeof value !== "object" || Array.isArray(value))
    return {};
  const out: Record<string, number | null> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>))
    if (typeof entry === "number" && Number.isFinite(entry) && entry >= 0)
      out[key] = entry;
    else if (entry === null) out[key] = null;
  return out;
}

export async function getTrackerSettings(
  userId: string,
): Promise<TrackerSettingsShape> {
  return settingsCache.getOrLoad(userId, async () => {
    const row = await database().trackerSettings.findUnique({
      where: { userId },
      select: {
        activeExamId: true,
        activeTierId: true,
        enabledTiers: true,
        examTargets: true,
      },
    });
    if (!row) return { ...DEFAULT_SETTINGS };
    return {
      activeExamId: row.activeExamId || "cgl",
      activeTierId: row.activeTierId || "tier2",
      enabledTiers: parseTierKeys(row.enabledTiers),
      examTargets: parseExamTargets(row.examTargets),
    };
  });
}

export async function saveTrackerSettings(
  userId: string,
  settings: TrackerSettingsShape,
): Promise<TrackerSettingsShape> {
  const row = await database().trackerSettings.upsert({
    where: { userId },
    create: {
      userId,
      activeExamId: settings.activeExamId,
      activeTierId: settings.activeTierId,
      enabledTiers: settings.enabledTiers,
      examTargets: settings.examTargets,
    },
    update: {
      activeExamId: settings.activeExamId,
      activeTierId: settings.activeTierId,
      enabledTiers: settings.enabledTiers,
      examTargets: settings.examTargets,
    },
    select: {
      activeExamId: true,
      activeTierId: true,
      enabledTiers: true,
      examTargets: true,
    },
  });
  const saved: TrackerSettingsShape = {
    activeExamId: row.activeExamId,
    activeTierId: row.activeTierId,
    enabledTiers: parseTierKeys(row.enabledTiers),
    examTargets: parseExamTargets(row.examTargets),
  };
  // Write-through: refresh the cache immediately so the next read is a hit.
  settingsCache.set(userId, saved);
  return saved;
}

/**
 * Drop the cached settings row for a user. Call this whenever a code path
 * writes TrackerSettings or CustomExam outside saveTrackerSettings() (e.g.
 * backup import, custom exam CRUD).
 */
export function invalidateSettings(userId: string) {
  settingsCache.invalidate(userId);
}

function toPatternSubject(entry: unknown): PatternSubject | null {
  if (entry == null || typeof entry !== "object") return null;
  const e = entry as Record<string, unknown>;
  if (
    typeof e.subjectId !== "string" ||
    typeof e.questions !== "number" ||
    e.questions < 1
  )
    return null;
  return {
    subjectId: e.subjectId as PatternSubject["subjectId"],
    questions: e.questions,
    qualifying: e.qualifying === true,
  };
}

export function toCustomExamDef(row: {
  id: string;
  name: string;
  tiers: unknown;
}): CustomExamDef | null {
  if (typeof row.name !== "string" || !row.name.trim()) return null;
  if (!Array.isArray(row.tiers) || row.tiers.length === 0) return null;
  const tiers: CustomTierDef[] = [];
  for (const entry of row.tiers) {
    if (entry == null || typeof entry !== "object") return null;
    const t = entry as Record<string, unknown>;
    if (typeof t.id !== "string" || typeof t.label !== "string") return null;
    if (!Array.isArray(t.subjects) || t.subjects.length === 0) return null;
    const marking = t.marking;
    if (marking == null || typeof marking !== "object") return null;
    const m = marking as Record<string, unknown>;
    if (typeof m.correct !== "number" || typeof m.incorrect !== "number")
      return null;
    const subjects: PatternSubject[] = [];
    for (const raw of t.subjects) {
      const parsed = toPatternSubject(raw);
      if (!parsed) return null;
      subjects.push(parsed);
    }
    tiers.push({
      id: t.id,
      label: t.label,
      subjects,
      marking: { correct: m.correct, incorrect: m.incorrect },
    });
  }
  return { id: row.id, name: row.name, tiers };
}

export async function listCustomExams(
  userId: string,
): Promise<CustomExamDef[]> {
  const rows = await database().customExam.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, tiers: true },
  });
  return rows
    .map(toCustomExamDef)
    .filter((exam): exam is CustomExamDef => exam != null);
}

/** Settings + custom exams in one round of queries — what most routes need. */
export type ExamContext = TrackerSettingsShape & {
  customExams: CustomExamDef[];
};

export async function loadExamContext(userId: string): Promise<ExamContext> {
  const [settings, customExams] = await Promise.all([
    getTrackerSettings(userId),
    listCustomExams(userId),
  ]);
  return { ...settings, customExams };
}

/** An exam's primary-tier pattern: the tier the user is preparing for. */
export function resolvePrimary(
  ctx: ExamContext,
  examId: string,
): ResolvedPattern | null {
  const custom = ctx.customExams.find((exam) => exam.id === examId);
  if (custom)
    return resolvePattern(
      examId,
      custom.tiers[0]?.id ?? CUSTOM_FIRST_TIER_ID,
      ctx.customExams,
    );
  const resolved = resolvePattern(examId, "tier2", ctx.customExams);
  if (!resolved?.exam) return null;
  return resolvePattern(examId, resolved.exam.primaryTierId, ctx.customExams);
}

/** PatternShape of the ACTIVE tier. The combined "all" view anchors on the
 * exam's primary tier — target math and AI context need one concrete
 * pattern, while attempt lists stay unfiltered across tiers. */
export function activeShape(ctx: ExamContext): PatternShape {
  const tierId =
    ctx.activeTierId === ALL_TIERS_ID
      ? (resolvePrimary(ctx, ctx.activeExamId)?.tier.id ?? ctx.activeTierId)
      : ctx.activeTierId;
  return patternShape(
    resolvePattern(ctx.activeExamId, tierId, ctx.customExams) ??
      // Nothing enabled / stale scope: fall back to CGL Tier 2 so prompts
      // and targets always have a shape.
      resolvePattern("cgl", "tier2", [])!,
  );
}

/** Legacy alias kept for existing callers. */
export const activePrimaryShape = activeShape;

/** Target score for an exam (against its primary tier maximum). */
export function targetForExam(
  ctx: ExamContext,
  examId: string,
): number | null {
  const target = ctx.examTargets[examId];
  return typeof target === "number" ? target : null;
}

/**
 * The tier an attempt write uses when the caller does not state one: the
 * active tier, or the exam's primary tier when the combined view is active.
 */
export function defaultWriteTierId(ctx: ExamContext, examId?: string): string {
  const effective = examId ?? ctx.activeExamId;
  if (effective === ctx.activeExamId && ctx.activeTierId !== ALL_TIERS_ID)
    return ctx.activeTierId;
  return resolvePrimary(ctx, effective)?.tier.id ?? "tier2";
}

/**
 * Validate + resolve the exam/tier pair an incoming attempt body claims.
 * The tier defaults to the active one; an unknown tier id falls back to the
 * active/primary tier so slightly-stale clients keep working. Throws 400
 * when the exam does not exist for this user.
 */
export function requirePattern(
  ctx: ExamContext,
  examId?: string,
  tierId?: string,
): { resolved: ResolvedPattern; shape: PatternShape; maxScore: number } {
  const effectiveExam = examId ?? ctx.activeExamId;
  const fallbackTier = defaultWriteTierId(ctx, effectiveExam);
  const resolved =
    (tierId
      ? resolvePattern(effectiveExam, tierId, ctx.customExams)
      : null) ??
    resolvePattern(effectiveExam, fallbackTier, ctx.customExams) ??
    resolvePrimary(ctx, effectiveExam);
  if (!resolved) throw new RequestError("Unknown exam or tier", 400);
  return {
    resolved,
    shape: patternShape(resolved),
    maxScore: patternMaxScore(resolved.tier),
  };
}

/** True when the tier key resolves for this user (built-in or custom). */
export function tierKeyResolves(ctx: ExamContext, key: string): boolean {
  const parsed = parseTierKey(key);
  if (!parsed) return false;
  return resolvePattern(parsed.examId, parsed.tierId, ctx.customExams) != null;
}

/** The "examId:tierId" keys enabled for one exam. */
export function enabledTierIdsFor(
  ctx: ExamContext,
  examId: string,
): string[] {
  return ctx.enabledTiers.filter(
    (key) => parseTierKey(key)?.examId === examId,
  );
}
