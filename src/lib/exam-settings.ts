import { database } from "./db";
import type {
  CustomExamDef,
  PatternSubject,
  ResolvedPattern,
} from "./exams";
import {
  customExamPattern,
  patternMaxScore,
  patternShape,
  resolvePattern,
} from "./exams";
import type { Marking, PatternShape } from "./domain";
import { LruCache } from "./cache";
import { RequestError } from "./api";

/**
 * Server-side exam context: the per-user workspace scope (TrackerSettings)
 * plus the user's custom exams. Every route that touches attempts resolves
 * its pattern through here so validation, scoring, and AI prompts all see
 * the same exam+tier truth.
 */

export type TrackerSettingsShape = {
  activeExamId: string;
  /** Enabled built-in exam ids; custom exams are always enabled. */
  enabledExams: string[];
  /** Target score per exam id, against that exam's primary tier maximum. */
  examTargets: Record<string, number | null>;
};

export const DEFAULT_SETTINGS: TrackerSettingsShape = {
  activeExamId: "cgl",
  enabledExams: ["cgl"],
  examTargets: {},
};

/** Per-user settings cache. One row per user, read on every page load,
 * written only from the settings panel. 60s TTL with write-through. */
const settingsCache = new LruCache<string, TrackerSettingsShape>({
  ttlMs: 60_000,
  maxBytes: 256_000,
});

function parseEnabled(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 40)
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
      select: { activeExamId: true, enabledExams: true, examTargets: true },
    });
    if (!row) return { ...DEFAULT_SETTINGS };
    const enabled = parseEnabled(row.enabledExams);
    return {
      activeExamId: row.activeExamId || "cgl",
      enabledExams: enabled.length ? enabled : ["cgl"],
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
      enabledExams: settings.enabledExams,
      examTargets: settings.examTargets,
    },
    update: {
      activeExamId: settings.activeExamId,
      enabledExams: settings.enabledExams,
      examTargets: settings.examTargets,
    },
    select: { activeExamId: true, enabledExams: true, examTargets: true },
  });
  const saved: TrackerSettingsShape = {
    activeExamId: row.activeExamId,
    enabledExams: parseEnabled(row.enabledExams),
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

export function toCustomExamDef(row: {
  id: string;
  name: string;
  subjects: unknown;
  marking: unknown;
}): CustomExamDef | null {
  if (typeof row.name !== "string" || !row.name.trim()) return null;
  if (!Array.isArray(row.subjects) || row.subjects.length === 0) return null;
  if (row.marking == null || typeof row.marking !== "object") return null;
  const m = row.marking as Record<string, unknown>;
  if (typeof m.correct !== "number" || typeof m.incorrect !== "number")
    return null;
  const subjects: PatternSubject[] = [];
  for (const entry of row.subjects) {
    if (entry == null || typeof entry !== "object") return null;
    const e = entry as Record<string, unknown>;
    if (
      typeof e.subjectId !== "string" ||
      typeof e.questions !== "number" ||
      e.questions < 1
    )
      return null;
    subjects.push({
      subjectId: e.subjectId as PatternSubject["subjectId"],
      questions: e.questions,
      qualifying: e.qualifying === true,
    });
  }
  return {
    id: row.id,
    name: row.name,
    subjects,
    marking: { correct: m.correct, incorrect: m.incorrect } satisfies Marking,
  };
}

export async function listCustomExams(
  userId: string,
): Promise<CustomExamDef[]> {
  const rows = await database().customExam.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, subjects: true, marking: true },
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
 * Targets and AI context anchor here; per-attempt data carries its own tier. */
export function resolvePrimary(
  ctx: ExamContext,
  examId: string,
): ResolvedPattern | null {
  const custom = ctx.customExams.find((exam) => exam.id === examId);
  if (custom)
    return {
      examId: custom.id,
      examName: custom.name,
      exam: null,
      tier: customExamPattern(custom),
      isPrimaryTier: true,
    };
  const resolved = resolvePattern(examId, "tier2", ctx.customExams);
  if (!resolved?.exam) return null;
  return resolvePattern(examId, resolved.exam.primaryTierId, ctx.customExams);
}

/** PatternShape of the active exam's primary tier (AI context, targets). */
export function activePrimaryShape(ctx: ExamContext): PatternShape {
  return patternShape(
    resolvePrimary(ctx, ctx.activeExamId) ??
      // The stored activeExamId no longer resolves (deleted custom exam):
      // fall back to CGL Tier 2 so prompts and targets always have a shape.
      resolvePattern("cgl", "tier2", [])!,
  );
}

/** Target score for an exam against its primary tier maximum. */
export function targetForExam(
  ctx: ExamContext,
  examId: string,
): number | null {
  const target = ctx.examTargets[examId];
  return typeof target === "number" ? target : null;
}

/**
 * Validate + resolve the exam/tier pair an incoming attempt body claims.
 * The tier defaults to the exam's primary one; an unknown tier id falls back
 * to the primary tier so slightly-stale clients keep working. Throws 400
 * when the exam does not exist for this user.
 */
export function requirePattern(
  ctx: ExamContext,
  examId?: string,
  tierId?: string,
): { resolved: ResolvedPattern; shape: PatternShape; maxScore: number } {
  const effectiveExam = examId ?? ctx.activeExamId;
  const resolved = resolvePrimary(ctx, effectiveExam);
  if (!resolved)
    throw new RequestError("Unknown exam", 400);
  if (!tierId || tierId === resolved.tier.id)
    return {
      resolved,
      shape: patternShape(resolved),
      maxScore: patternMaxScore(resolved.tier),
    };
  const wanted =
    resolvePattern(effectiveExam, tierId, ctx.customExams) ??
    resolved;
  return {
    resolved: wanted,
    shape: patternShape(wanted),
    maxScore: patternMaxScore(wanted.tier),
  };
}
