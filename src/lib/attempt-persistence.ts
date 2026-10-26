import type { Prisma } from "@/generated/prisma/client";
import type {
  AnalyticsAttempt,
  Attempt,
  AttemptInput,
  Filters,
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
    scoreOverride: row.scoreOverride,
    overallTimeSeconds: row.overallTimeSeconds,
    rank: row.rank,
    participants: row.participants,
    percentile: row.percentile,
    notes: row.notes,
    source: row.source,
    schemaVersion: 1,
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
    scoreOverride: row.scoreOverride,
    overallTimeSeconds: row.overallTimeSeconds,
    rank: row.rank,
    participants: row.participants,
    percentile: row.percentile,
    source: row.source,
    schemaVersion: 1,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    subjects: mapSubjects(row),
  };
}

export function attemptData(input: AttemptInput) {
  return {
    name: input.name,
    platform: input.platform,
    completedAt: new Date(input.completedAt),
    type: input.type,
    scoreOverride: input.scoreOverride ?? null,
    overallTimeSeconds: input.overallTimeSeconds ?? null,
    rank: input.rank ?? null,
    participants: input.participants ?? null,
    percentile: input.percentile ?? null,
    notes: input.notes,
    source: input.source,
    subjects: {
      create: input.subjects.map((s, position) => ({
        ...s,
        scoreOverride: s.scoreOverride ?? null,
        timeSeconds: s.timeSeconds ?? null,
        position,
      })),
    },
  } satisfies Omit<Prisma.MockAttemptCreateInput, "userId">;
}

export function attemptWhere(filters: Filters): Prisma.MockAttemptWhereInput {
  return {
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
          ],
        }
      : {}),
  };
}

// PostgreSQL contains uses LIKE; users expect literal substring searches.
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
