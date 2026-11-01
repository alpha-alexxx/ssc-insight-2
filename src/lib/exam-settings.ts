import { database } from "./db";
import type {
  CustomExamDef,
  CustomTierDef,
  PatternSubject,
  ResolvedPattern,
} from "./exams";
import {
  ALL_TIERS_ID,
  BUILT_IN_EXAMS,
  CUSTOM_FIRST_TIER_ID,
  builtInExam,
  patternMaxScore,
  patternShape,
  parseTierKey,
  resolvePattern,
} from "./exams";
import type { PatternShape } from "./domain";
import { LruCache } from "./cache";
import { RequestError } from "./api";
import {
  EMPTY_TARGETS,
  buildSignatureIndex,
  effectiveTarget,
  parseTargetSettings,
  percentileFor,
  type EffectiveTarget,
  type TargetSettings,
} from "./target-settings";

/**
 * Server-side exam context: the per-user workspace scope (TrackerSettings)
 * plus the user's custom exams. Every route that touches attempts resolves
 * its pattern through here so validation, scoring, and AI prompts all see
 * the same exam+tier truth.
 *
 * Scope is tier-level: enabledTiers holds "examId:tierId" keys, and the
 * active context is one tier — or ALL_TIERS_ID for an exam's combined view.
 */

/** In-app-only preferences. There is no push, email or background delivery
 * anywhere in this app, so every flag here drives an on-screen signal. */
export type ReminderPreferences = {
  /** Emphasise overdue personal tasks in the shell. */
  overdueEmphasis: boolean;
  /** Show a "mock scheduled today" note on the plan surfaces. */
  mockDueToday: boolean;
  /** Keep a quiet gap-to-target note visible on performance views. */
  targetGap: boolean;
  /** Suppress transient toasts during the quiet window. */
  quietHours: { enabled: boolean; start: string; end: string };
};

export const DEFAULT_PREFERENCES: ReminderPreferences = {
  overdueEmphasis: true,
  mockDueToday: true,
  targetGap: true,
  quietHours: { enabled: false, start: "22:00", end: "07:00" },
};

export type TrackerSettingsShape = {
  activeExamId: string;
  /** Tier id of the active exam, or ALL_TIERS_ID for the combined view. */
  activeTierId: string;
  /** Enabled selectable tiers as "examId:tierId" keys. */
  enabledTiers: string[];
  /** Versioned target envelope — percentiles, structure defaults, overrides. */
  targets: TargetSettings;
  /** In-app reminder preferences. */
  preferences: ReminderPreferences;
};

export const DEFAULT_SETTINGS: TrackerSettingsShape = {
  activeExamId: "cgl",
  activeTierId: "tier2",
  // New accounts pick their exams — the workspace stays in an empty state
  // until the Exams settings panel has something enabled.
  enabledTiers: [],
  targets: { ...EMPTY_TARGETS },
  preferences: { ...DEFAULT_PREFERENCES },
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


/** Read preferences defensively — an unknown key or a bad value falls back
 * to the default rather than disabling the surface. */
function parsePreferences(value: unknown): ReminderPreferences {
  if (value == null || typeof value !== "object" || Array.isArray(value))
    return { ...DEFAULT_PREFERENCES };
  const raw = value as Record<string, unknown>;
  const flag = (key: keyof ReminderPreferences, fallback: boolean) =>
    typeof raw[key] === "boolean" ? (raw[key] as boolean) : fallback;
  const quietRaw =
    raw.quietHours != null && typeof raw.quietHours === "object"
      ? (raw.quietHours as Record<string, unknown>)
      : {};
  const time = (key: "start" | "end", fallback: string) =>
    typeof quietRaw[key] === "string" && /^\d{2}:\d{2}$/.test(quietRaw[key] as string)
      ? (quietRaw[key] as string)
      : fallback;
  return {
    overdueEmphasis: flag("overdueEmphasis", true),
    mockDueToday: flag("mockDueToday", true),
    targetGap: flag("targetGap", true),
    quietHours: {
      enabled: typeof quietRaw.enabled === "boolean" ? quietRaw.enabled : false,
      start: time("start", DEFAULT_PREFERENCES.quietHours.start),
      end: time("end", DEFAULT_PREFERENCES.quietHours.end),
    },
  };
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
        targets: true,
        preferences: true,
      },
    });
    if (!row) return { ...DEFAULT_SETTINGS };
    return {
      activeExamId: row.activeExamId || "cgl",
      activeTierId: row.activeTierId || "tier2",
      enabledTiers: parseTierKeys(row.enabledTiers),
      targets: parseTargetSettings(row.targets),
      preferences: parsePreferences(row.preferences),
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
      targets: settings.targets,
      preferences: settings.preferences,
    },
    update: {
      activeExamId: settings.activeExamId,
      activeTierId: settings.activeTierId,
      enabledTiers: settings.enabledTiers,
      targets: settings.targets,
      preferences: settings.preferences,
    },
    select: {
      activeExamId: true,
      activeTierId: true,
      enabledTiers: true,
      targets: true,
      preferences: true,
    },
  });
  const saved: TrackerSettingsShape = {
    activeExamId: row.activeExamId,
    activeTierId: row.activeTierId,
    enabledTiers: parseTierKeys(row.enabledTiers),
    targets: parseTargetSettings(row.targets),
    preferences: parsePreferences(row.preferences),
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

/** An exam's primary-tier pattern: the tier the user is preparing for.
 * Reads `primaryTierId` directly — the old implementation probed "tier2"
 * first and therefore returned null for every exam whose primary tier has
 * another id (CPO's Paper I, MTS's Session II, every "cbe" exam). */
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
  const exam = builtInExam(examId);
  if (!exam) return null;
  return resolvePattern(examId, exam.primaryTierId, ctx.customExams);
}

/**
 * The tier the active scope is actually about: the explicit active tier, or
 * the exam's default/primary tier for the combined "all" view. Null when
 * nothing resolves — callers must not invent a shape from another exam.
 */
export function activeResolved(ctx: ExamContext): ResolvedPattern | null {
  if (ctx.activeTierId !== ALL_TIERS_ID)
    return resolvePattern(ctx.activeExamId, ctx.activeTierId, ctx.customExams);

  const exam = builtInExam(ctx.activeExamId);
  const anchor = exam?.defaultTierId ?? exam?.primaryTierId;
  return (
    (anchor ? resolvePattern(ctx.activeExamId, anchor, ctx.customExams) : null) ??
    resolvePrimary(ctx, ctx.activeExamId)
  );
}

/** PatternShape of the active tier. The combined "all" view anchors on the
 * exam's primary tier — target math and AI context need one concrete
 * pattern, while attempt lists stay unfiltered across tiers.
 *
 * Returns null when the scope does not resolve (a fresh account with nothing
 * enabled). Callers degrade gracefully; they must never fall back to another
 * exam's pattern, which would tell the user their CGL paper is a CPO one. */
export function activeShape(ctx: ExamContext): PatternShape | null {
  const resolved = activeResolved(ctx);
  return resolved ? patternShape(resolved) : null;
}

/** Legacy alias kept for existing callers. */
export const activePrimaryShape = activeShape;

/** Target marks for one tier of an exam, resolved through the versioned
 * envelope (override → structure default → none). */
export function targetForTier(
  ctx: ExamContext,
  examId: string,
  tierId: string,
): EffectiveTarget | null {
  const resolved = resolvePattern(examId, tierId, ctx.customExams);
  if (!resolved) return null;
  const index = buildSignatureIndex(BUILT_IN_EXAMS, ctx.customExams);
  return effectiveTarget(
    ctx.targets,
    `${examId}:${tierId}`,
    resolved.tier,
    index,
  );
}

/** The effective target for whichever tier the workspace is scoped to. */
export function targetForActive(ctx: ExamContext): EffectiveTarget | null {
  const resolved = activeResolved(ctx);
  if (!resolved) return null;
  const index = buildSignatureIndex(BUILT_IN_EXAMS, ctx.customExams);
  return effectiveTarget(
    ctx.targets,
    `${resolved.examId}:${resolved.tier.id}`,
    resolved.tier,
    index,
  );
}

/** Percentile goal for one exam (never derived from marks). */
export function percentileForExam(
  ctx: ExamContext,
  examId: string,
): number | null {
  return percentileFor(ctx.targets, examId);
}

/**
 * The tier an attempt write uses when the caller does not state one: the
 * active tier, or the exam's primary tier when the combined view is active.
 * Throws rather than guessing when the exam resolves to no tier at all.
 */
export function defaultWriteTierId(ctx: ExamContext, examId?: string): string {
  const effective = examId ?? ctx.activeExamId;
  if (effective === ctx.activeExamId && ctx.activeTierId !== ALL_TIERS_ID)
    return ctx.activeTierId;
  const primary = resolvePrimary(ctx, effective);
  if (!primary)
    throw new RequestError(
      "Choose an exam tier in Settings before logging a mock",
      400,
    );
  return primary.tier.id;
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
