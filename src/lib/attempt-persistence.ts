import type { Prisma } from "@/generated/prisma/client";
import type {
  AnalyticsAttempt,
  Attempt,
  AttemptInput,
  Filters,
  PatternShape,
} from "./domain";

export const attemptInclude = {
  subjects: { orderBy: { position: "asc" as const } },
} satisfies Prisma.MockAttemptInclude;

type StoredAttempt = Prisma.MockAttemptGetPayload<{
  include: typeof attemptInclude;
}>;

type StoredAnalyticsAttempt = Prisma.MockAttemptGetPayload<{
  include: typeof attemptInclude;
  omit: { notes: true };
}>;

function mapSubjects(row: {
  subjects: StoredAttempt["subjects"];
}): Attempt["subjects"] {
  return row.subjects.map((s) => ({
    subjectId: s.subjectId,
    questions: s.questions,
    correct: s.correct,
    incorrect: s.incorrect,
    qualifying: s.qualifying,
    scoreOverride: s.scoreOverride,
    timeSeconds: s.timeSeconds,
  }));
}

/** Keep database dates and relations behind the existing JSON contract. */
export function toAttempt(row: StoredAttempt): Attempt {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    completedAt: row.completedAt.toISOString(),
    type: row.type,
    examId: row.examId,
    tierId: row.tierId,
    marking: {
      correct: row.markingCorrect,
      incorrect: row.markingIncorrect,
    },
    scoreOverride: row.scoreOverride,
    overallTimeSeconds: row.overallTimeSeconds,
    rank: row.rank,
    participants: row.participants,
    percentile: row.percentile,
    notes: row.notes,
    source: row.source,
    schemaVersion: row.schemaVersion === 2 ? 2 : 1,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    subjects: mapSubjects(row),
  };
}

/**
 * AI analytics never receive note text. The query omits the column at the
 * database level; this mapper must not reconstruct it.
 */
export function toAnalyticsAttempt(row: StoredAnalyticsAttempt): AnalyticsAttempt {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    completedAt: row.completedAt.toISOString(),
    type: row.type,
    examId: row.examId,
    tierId: row.tierId,
    marking: {
      correct: row.markingCorrect,
      incorrect: row.markingIncorrect,
    },
    scoreOverride: row.scoreOverride,
    overallTimeSeconds: row.overallTimeSeconds,
    rank: row.rank,
    participants: row.participants,
    percentile: row.percentile,
    source: row.source,
    schemaVersion: row.schemaVersion === 2 ? 2 : 1,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    subjects: mapSubjects(row),
  };
}

/**
 * Prisma write shape for a validated attempt. When the resolved tier pattern
 * is given, its truth overrides the client on exam identity, marking, and
 * per-subject qualifying flags; backup import omits it and trusts the
 * backup's already-validated snapshot.
 */
export function attemptData(input: AttemptInput, pattern?: PatternShape) {
  const marking = pattern?.marking ?? input.marking;
  return {
    name: input.name,
    platform: input.platform,
    completedAt: new Date(input.completedAt),
    type: input.type,
    examId: pattern?.examId ?? input.examId,
    tierId: pattern?.tierId ?? input.tierId,
    markingCorrect: marking.correct,
    markingIncorrect: marking.incorrect,
    scoreOverride: input.scoreOverride ?? null,
    overallTimeSeconds: input.overallTimeSeconds ?? null,
    rank: input.rank ?? null,
    participants: input.participants ?? null,
    percentile: input.percentile ?? null,
    notes: input.notes,
    source: input.source,
    schemaVersion: 2,
    subjects: {
      create: input.subjects.map((s, position) => ({
        ...s,
        qualifying: pattern
          ? (pattern.subjects.find((p) => p.subjectId === s.subjectId)
              ?.qualifying ?? false)
          : s.qualifying,
        scoreOverride: s.scoreOverride ?? null,
        timeSeconds: s.timeSeconds ?? null,
        position,
      })),
    },
  } satisfies Omit<Prisma.MockAttemptCreateInput, "userId">;
}

export function attemptWhere(filters: Filters): Prisma.MockAttemptWhereInput {
  return {
    // Trash boundary. Every attempt read funnels through this builder, so a
    // trashed attempt cannot reach analytics, history, compare, the calendar,
    // the plan matcher, or the AI context.
    deletedAt: null,
    ...(filters.examId ? { examId: filters.examId } : {}),
    ...(filters.tier && filters.tier !== "all" ? { tierId: filters.tier } : {}),
    ...(filters.type && filters.type !== "all"
      ? { type: filters.type as Attempt["type"] }
      : {}),
    ...(filters.subject && filters.subject !== "all"
      ? {
          subjects: {
            some: {
              subjectId:
                filters.subject as Attempt["subjects"][number]["subjectId"],
            },
          },
        }
      : {}),
    ...(filters.platform && filters.platform !== "all"
      ? { platform: filters.platform }
      : {}),
    ...(filters.from || filters.to
      ? {
          completedAt: {
            ...(filters.from
              ? { gte: new Date(`${filters.from}T00:00:00+05:30`) }
              : {}),
            ...(filters.to
              ? { lte: new Date(`${filters.to}T23:59:59.999+05:30`) }
              : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            {
              name: {
                contains: escapeLike(filters.search),
                mode: "insensitive",
              },
            },
            {
              platform: {
                contains: escapeLike(filters.search),
                mode: "insensitive",
              },
            },
            {
              notes: {
                contains: escapeLike(filters.search),
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
}

// PostgreSQL contains uses LIKE; users expect literal substring searches.
// Shared with the unified search service (lib/search.ts) — every pattern
// match goes through this so % _ \ in a query stay literal.
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
