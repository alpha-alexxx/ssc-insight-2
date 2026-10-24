import { database } from "./db";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { type AttemptInput, type Filters, duplicateKey } from "./domain";
import {
  attemptData,
  attemptInclude,
  attemptWhere,
  toAttempt,
} from "./attempt-persistence";
import { RequestError } from "./api";

export async function listAttempts(userId: string, filters: Filters = {}) {
  const rows = await database().mockAttempt.findMany({
    where: { ...attemptWhere(filters), userId },
    include: attemptInclude,
    orderBy: [{ completedAt: "desc" }, { id: "asc" }],
  });
  return rows.map(toAttempt);
}

export async function getAttempt(userId: string, id: string) {
  const row = await database().mockAttempt.findUnique({
    where: { id, userId },
    include: attemptInclude,
  });
  if (!row) throw new RequestError("Mock not found", 404);
  return toAttempt(row);
}

export async function createAttempt(userId: string, input: AttemptInput) {
  return toAttempt(
    await database().mockAttempt.create({
      data: { id: randomUUID(), ...attemptData(input), userId },
      include: attemptInclude,
    }),
  );
}

export async function updateAttempt(
  userId: string,
  id: string,
  input: AttemptInput,
) {
  const data = attemptData(input);
  return toAttempt(
    await database().mockAttempt.update({
      where: { id, userId },
      data: {
        ...data,
        subjects: { deleteMany: {}, create: data.subjects.create },
      },
      include: attemptInclude,
    }),
  );
}

export async function deleteAttempt(userId: string, id: string) {
  await database().mockAttempt.delete({ where: { id, userId } });
  return { id };
}

export async function getSettings(userId: string) {
  const row = await database().trackerSettings.findUnique({
    where: { userId },
  });
  return { targetScore: row?.targetScore ?? null };
}

export async function saveSettings(userId: string, targetScore: number | null) {
  const row = await database().trackerSettings.upsert({
    where: { userId },
    create: { userId, targetScore },
    update: { targetScore },
  });
  return { targetScore: row.targetScore };
}

export async function importAttempts(
  userId: string,
  attempts: AttemptInput[],
  preview: boolean,
) {
  // Preview and commit share the same duplicate policy; commit is all-or-nothing.
  return database().$transaction(
    async (tx) => {
      const existing = await tx.mockAttempt.findMany({
        where: { userId },
        include: attemptInclude,
      });
      const keys = new Set(existing.map((row) => duplicateKey(toAttempt(row))));
      const unique: AttemptInput[] = [];
      let duplicates = 0;
      for (const attempt of attempts) {
        const key = duplicateKey(attempt);
        if (keys.has(key)) duplicates++;
        else {
          keys.add(key);
          unique.push(attempt);
        }
      }
      if (preview)
        return {
          total: attempts.length,
          newRecords: unique.length,
          duplicates,
        };
      if (!unique.length) throw new RequestError("No new records to import");
      const rows = unique.map((attempt) => {
        const { subjects, ...data } = attemptData({
          ...attempt,
          source: "backup",
        });
        return { id: randomUUID(), data, subjects: subjects.create };
      });
      await tx.mockAttempt.createMany({
        data: rows.map(({ id, data }) => ({ id, ...data, userId })),
      });
      await tx.subjectResult.createMany({
        data: rows.flatMap(({ id, subjects }) =>
          subjects.map((subject) => ({
            ...subject,
            attemptId: id,
          })),
        ),
      });
      return { imported: unique.length, skipped: duplicates };
    },
    { maxWait: 10000, timeout: 60000 },
  );
}

export function filtersFrom(url: string): Filters {
  return z
    .object({
      type: z.enum(["all", "full", "subject", "sectional"]).optional(),
      subject: z
        .enum(["all", "quant", "reasoning", "english", "ga", "computer"])
        .optional(),
      platform: z.string().max(80).optional(),
      search: z.string().max(150).optional(),
      from: z.iso.date().or(z.literal("")).optional(),
      to: z.iso.date().or(z.literal("")).optional(),
    })
    .parse(Object.fromEntries(new URL(url).searchParams.entries()));
}
