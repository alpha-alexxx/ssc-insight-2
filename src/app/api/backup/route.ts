import { requireUser } from "@/lib/auth/require-user";
import { z } from "zod";
import { attemptSchema } from "@/lib/domain";
import { importAttempts, listAttempts } from "@/lib/repository";
import { apiError, ok, readBody, privateHeaders } from "@/lib/api";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { id: userId } = await requireUser();
    const attempts = await listAttempts(userId);
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
            ...privateHeaders,
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
          ...privateHeaders,
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
    const { id: userId } = await requireUser();
    const body = z
      .object({
        schemaVersion: z.literal(1),
        attempts: z.array(attemptSchema).max(2000),
        preview: z.boolean().default(true),
      })
      .parse(await readBody(request, 2 * 1024 * 1024));
    return ok(await importAttempts(userId, body.attempts, body.preview));
  } catch (e) {
    return apiError(e);
  }
}
