import { z } from "zod";
import { randomUUID } from "crypto";
import { attemptSchema, duplicateKey } from "@/lib/domain";
import { listAttempts } from "@/lib/repository";
import { database, type StoredAttempt } from "@/lib/db";
import { apiError, ok, readBody, RequestError } from "@/lib/api";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const attempts = await listAttempts();
    if (new URL(request.url).searchParams.get("format") === "csv") {
      const quote = (s: unknown) => {
        const text = String(s ?? "");
        return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`;
      };
      const rows = [
        [
          "Mock",
          "Platform",
          "Completed at",
          "Type",
          "Subject",
          "Questions",
          "Correct",
          "Incorrect",
          "Score override",
          "Seconds",
          "Overall score override",
          "Overall seconds",
          "Rank",
          "Participants",
          "Percentile",
          "Notes",
        ],
        ...attempts.flatMap((a) =>
          a.subjects.map((s) => [
            a.name,
            a.platform,
            a.completedAt,
            a.type,
            s.subjectId,
            s.questions,
            s.correct,
            s.incorrect,
            s.scoreOverride,
            s.timeSeconds,
            a.scoreOverride,
            a.overallTimeSeconds,
            a.rank,
            a.participants,
            a.percentile,
            a.notes,
          ]),
        ),
      ];
      return new Response(
        rows.map((r) => r.map(quote).join(",")).join("\r\n"),
        {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": 'attachment; filename="ssc-insight.csv"',
          },
        },
      );
    }
    return new Response(
      JSON.stringify(
        { schemaVersion: 1, exportedAt: new Date().toISOString(), attempts },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition":
            'attachment; filename="ssc-insight-backup.json"',
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const body = z
      .object({
        schemaVersion: z.literal(1),
        attempts: z.array(attemptSchema).max(2000),
        preview: z.boolean().default(true),
      })
      .parse(await readBody(request, 2 * 1024 * 1024));
    const existing = await listAttempts();
    const keys = new Set(existing.map(duplicateKey));
    const unique = [];
    let duplicates = 0;
    for (const a of body.attempts) {
      const key = duplicateKey(a);
      if (keys.has(key)) duplicates++;
      else {
        keys.add(key);
        unique.push(a);
      }
    }
    if (body.preview)
      return ok({
        total: body.attempts.length,
        newRecords: unique.length,
        duplicates,
      });
    if (!unique.length) throw new RequestError("No new records to import");
    const now = new Date().toISOString();
    await (
      await database()
    )
      .collection<StoredAttempt>("sscMockAttempts")
      .insertMany(
        unique.map((a) => {
          const id = randomUUID();
          return {
            ...a,
            source: "backup" as const,
            id,
            _id: id,
            schemaVersion: 1 as const,
            createdAt: now,
            updatedAt: now,
          };
        }),
      );
    return ok({ imported: unique.length, skipped: duplicates });
  } catch (e) {
    return apiError(e);
  }
}
