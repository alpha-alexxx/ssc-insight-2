import {
  type Attempt,
  type Filters,
  subjectIds,
  SUBJECTS,
  subjectStats,
  totals,
} from "./domain";
const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export function filterAttempts(attempts: Attempt[], f: Filters) {
  return attempts.filter(
    (a) =>
      (!f.type || f.type === "all" || a.type === f.type) &&
      (!f.subject ||
        f.subject === "all" ||
        a.subjects.some((s) => s.subjectId === f.subject)) &&
      (!f.platform || f.platform === "all" || a.platform === f.platform) &&
      (!f.from ||
        new Date(a.completedAt).getTime() >=
          new Date(`${f.from}T00:00:00+05:30`).getTime()) &&
      (!f.to ||
        new Date(a.completedAt).getTime() <=
          new Date(`${f.to}T23:59:59.999+05:30`).getTime()) &&
      (!f.search ||
        `${a.name} ${a.platform}`
          .toLowerCase()
          .includes(f.search.toLowerCase())),
  );
}
export function analyze(
  attempts: Attempt[],
  subjectAttempts: Attempt[] = attempts,
) {
  const ordered = [...attempts].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  );
  const full = ordered.filter((a) => a.type === "full");
  const fullScores = full.map((a) => totals(a).score);
  const correct = ordered.reduce((n, a) => n + totals(a).correct, 0);
  const incorrect = ordered.reduce((n, a) => n + totals(a).incorrect, 0);
  const questions = ordered.reduce((n, a) => n + totals(a).questions, 0);
  const subjectOrdered = [...subjectAttempts].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  );
  const subjects = subjectIds.map((id) => {
    const rows = subjectOrdered.flatMap((a) =>
      a.subjects
        .filter((s) => s.subjectId === id)
        .map((s) => ({
          ...subjectStats(s),
          completedAt: a.completedAt,
          name: a.name,
          mockId: a.id,
          mockType: a.type,
        })),
    );
    return {
      id,
      name: SUBJECTS[id].short,
      color: SUBJECTS[id].color,
      count: rows.length,
      averageScore: average(rows.map((s) => s.score)),
      percentage: average(rows.map((s) => s.percentage)),
      accuracy: rows.reduce((n, s) => n + s.attempted, 0)
        ? (rows.reduce((n, s) => n + s.correct, 0) /
            rows.reduce((n, s) => n + s.attempted, 0)) *
          100
        : null,
      averageTime: average(
        rows.filter((s) => s.timeSeconds != null).map((s) => s.timeSeconds!),
      ),
      trend: rows.map((s, index) => ({
        date: s.completedAt,
        name: s.name,
        mockId: s.mockId,
        mockType: s.mockType,
        score: s.score,
        maxScore: s.maxScore,
        percentage: s.percentage,
        rollingAverage: average(
          rows
            .slice(Math.max(0, index - 4), index + 1)
            .map((row) => row.percentage),
        ),
        accuracy: s.accuracy,
        minutes: s.timeSeconds == null ? null : s.timeSeconds / 60,
      })),
    };
  });
  const signatures = new Set(
    ordered.map((a) =>
      a.subjects
        .filter((s) => a.type !== "full" || s.subjectId !== "computer")
        .map((s) => `${s.subjectId}:${s.questions}`)
        .sort()
        .join("|"),
    ),
  );
  const improvement =
    ordered.length >= 10 && signatures.size === 1
      ? average(ordered.slice(-5).map((a) => totals(a).percentage))! -
        average(ordered.slice(-10, -5).map((a) => totals(a).percentage))!
      : null;
  const trend = ordered.map((a, i) => {
    const t = totals(a);
    return {
      id: a.id,
      date: a.completedAt,
      name: a.name,
      score: t.score,
      percentage: t.percentage,
      rollingAverage: average(
        ordered
          .slice(Math.max(0, i - 4), i + 1)
          .map((x) => totals(x).percentage),
      ),
    };
  });
  return {
    count: ordered.length,
    averageFullScore: average(fullScores),
    bestFullScore: fullScores.length ? Math.max(...fullScores) : null,
    accuracy:
      correct + incorrect ? (correct / (correct + incorrect)) * 100 : null,
    improvement,
    correct,
    incorrect,
    unattempted: questions - correct - incorrect,
    trend,
    subjects,
    weakest:
      subjects
        .filter((s) => s.count && s.id !== "computer")
        .sort((a, b) => a.percentage! - b.percentage!)[0] ?? null,
  };
}
export type Analytics = ReturnType<typeof analyze>;
