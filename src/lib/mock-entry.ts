import type { AttemptInput } from "./domain";
import { istDateKey } from "./format";

export const MOCK_PLATFORMS = [
  "Testbook",
  "RBE",
  "Oliveboard",
  "Pundits",
  "Test Ranking",
] as const;

export function platformSelection(platform: string) {
  if (!platform.trim()) return "";
  return (
    MOCK_PLATFORMS.find(
      (p) => p.toLowerCase() === platform.trim().toLowerCase(),
    ) ?? "other"
  );
}

export function completionDate(completedAt: string) {
  return istDateKey(completedAt);
}

export function completionTimestamp(date: string) {
  return new Date(`${date}T00:00:00+05:30`).toISOString();
}

export function durationSeconds(parts: readonly string[]) {
  return (
    Number(parts[0] || 0) * 3600 +
    Number(parts[1] || 0) * 60 +
    Number(parts[2] || 0)
  );
}

// New and edited form entries always derive scores/time from the subject rows.
// Legacy reports/backups retain their override fields until explicitly edited.
export function calculatedEntry(input: AttemptInput): AttemptInput {
  const subjects = input.subjects.map((s) => ({
    ...s,
    scoreOverride: null,
    timeSeconds: s.timeSeconds ?? 0,
  }));
  return {
    ...input,
    subjects,
    scoreOverride: null,
    overallTimeSeconds: subjects.reduce((sum, s) => sum + s.timeSeconds, 0),
  };
}
