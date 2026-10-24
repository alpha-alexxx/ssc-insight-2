import { database } from "./db";
import { z } from "zod";
import { type Attempt, type Filters } from "./domain";
export async function listAttempts(filters: Filters = {}) {
  const match: Record<string, unknown> = {};
  if (filters.type && filters.type !== "all") match.type = filters.type;
  if (filters.subject && filters.subject !== "all")
    match["subjects.subjectId"] = filters.subject;
  if (filters.platform && filters.platform !== "all")
    match.platform = filters.platform;
  if (filters.from || filters.to)
    match.completedAt = {
      ...(filters.from
        ? { $gte: new Date(`${filters.from}T00:00:00+05:30`).toISOString() }
        : {}),
      ...(filters.to
        ? { $lte: new Date(`${filters.to}T23:59:59.999+05:30`).toISOString() }
        : {}),
    };
  if (filters.search) {
    const regex = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    match.$or = [
      { name: { $regex: regex, $options: "i" } },
      { platform: { $regex: regex, $options: "i" } },
    ];
  }
  const db = await database();
  const rows = await db
    .collection<Attempt & { _id: string }>("sscMockAttempts")
    .aggregate<Attempt & { _id: string }>([
      { $match: match },
      { $sort: { completedAt: -1 } },
    ])
    .toArray();
  return rows.map(({ _id, ...a }) => ({ ...a, id: _id }));
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
