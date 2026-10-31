import {
  BACKUP_REQUEST_MAX_BYTES,
  BackupError,
  parseImportRequest,
} from "@/lib/backup";
import {
  exportBackup,
  importBackup,
  invalidateSettings,
} from "@/lib/repository";
import { ok, privateHeaders, readBody, RequestError } from "@/lib/api";
import { defineRoute } from "@/lib/route-handler";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = defineRoute({ kind: "read" }, async ({ request, user }) => {
  const backup = await exportBackup(user.id);
  const date = new Date().toISOString().slice(0, 10);
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
        "Exam",
        "Tier",
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
      ...backup.attempts.flatMap((a) =>
        a.subjects.map((s) => [
          a.name,
          a.platform,
          a.completedAt,
          a.type,
          a.examId,
          a.tierId,
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
          "Content-Disposition": `attachment; filename="ssc-insight-export-${date}.csv"`,
        },
      },
    );
  }
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      ...privateHeaders,
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ssc-insight-backup-${date}.json"`,
    },
  });
});

export const POST = defineRoute(
  { kind: "write" },
  async ({ request, user, startedAt }) => {
    const body = await readBody(request, BACKUP_REQUEST_MAX_BYTES);
    let parsed: ReturnType<typeof parseImportRequest>;
    try {
      parsed = parseImportRequest(body);
    } catch (error) {
      if (error instanceof BackupError)
        throw new RequestError(error.message, 400);
      throw error;
    }
    const result = await importBackup(
      user.id,
      parsed.backup,
      parsed.options,
    );
    // Import may have changed TrackerSettings; drop the cached row so the
    // next /api/settings read reflects the new target.
    if (!parsed.options.preview) invalidateSettings(user.id);
    audit("backup.import", user.id, {
      ms: Date.now() - startedAt,
      meta: {
        mode: parsed.options.mode,
        preview: parsed.options.preview ? 1 : 0,
      },
    });
    if (parsed.options.legacyRequest && parsed.options.preview)
      return ok({
        ...result,
        total: "total" in result ? result.total : undefined,
        newRecords: "importable" in result ? result.importable : undefined,
        duplicates:
          "skippedDuplicates" in result ? result.skippedDuplicates : undefined,
      });
    return { data: result };
  },
);
