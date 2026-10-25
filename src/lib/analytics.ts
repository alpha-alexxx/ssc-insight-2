import {
  type Attempt,
  type DashboardScope,
  type Filters,
  type SectionId,
  type SubjectId,
  FULL_MOCK_MAX_SCORE,
  SECTIONS,
  SUBJECTS,
  sectionForSubjects,
  sectionIds,
  subjectIds,
  subjectStats,
  totals,
} from "./domain";
const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const istDateKey = (date: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(date),
  );
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

export type PerformancePoint = {
  key: string;
  sourceAttemptId: string;
  sourceType: Attempt["type"];
  origin: "attempt" | "full-derived";
  entityId: string;
  seriesId: string;
  seriesLabel: string;
  date: string;
  name: string;
  platform: string;
  score: number;
  maxScore: number;
  percentage: number;
  correct: number;
  incorrect: number;
  attempted: number;
  unattempted: number;
  questions: number;
  accuracy: number | null;
  timeSeconds: number | null;
  rank: number | null;
  participants: number | null;
  percentile: number | null;
};
export type TrendSeries = {
  id: string;
  label: string;
  pointCount: number;
};
export type AnswerStack = {
  id: string;
  label: string;
  count: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  total: number;
  correctPercentage: number;
  incorrectPercentage: number;
  unattemptedPercentage: number;
  accuracy: number | null;
  score: number;
  maxScore: number;
  scorePercentage: number;
  percentile: number | null;
  percentileCount: number;
  centerMetric: "percentile" | "score";
};
export type WhereYouStandRow = {
  subjectId: SubjectId;
  label: string;
  averagePercentage: number | null;
  weightedAccuracy: number | null;
  resultCount: number;
};
export type TargetSnapshot = {
  key: string;
  date: string;
  percentage: number;
  pointCount: number;
};
export type DeepDiveSubject = {
  id: SubjectId;
  name: string;
  qualifying: boolean;
  count: number;
  percentage: number | null;
  accuracy: number | null;
  averageTime: number | null;
  trend: {
    key: string;
    date: string;
    name: string;
    sourceAttemptId: string;
    sourceType: Attempt["type"];
    score: number;
    maxScore: number;
    percentage: number;
    accuracy: number | null;
    minutes: number | null;
    timeSeconds: number | null;
  }[];
};

const comparePoints = (a: PerformancePoint, b: PerformancePoint) =>
  a.date.localeCompare(b.date) ||
  a.sourceAttemptId.localeCompare(b.sourceAttemptId) ||
  a.entityId.localeCompare(b.entityId);
function parentPoint(
  attempt: Attempt,
  entityId: string,
  seriesId: string,
  seriesLabel: string,
): PerformancePoint {
  const t = totals(attempt);
  return {
    key: attempt.id,
    sourceAttemptId: attempt.id,
    sourceType: attempt.type,
    origin: "attempt",
    entityId,
    seriesId,
    seriesLabel,
    date: attempt.completedAt,
    name: attempt.name,
    platform: attempt.platform,
    score: t.score,
    maxScore: t.maxScore,
    percentage: t.percentage,
    correct: t.correct,
    incorrect: t.incorrect,
    attempted: t.attempted,
    unattempted: t.unattempted,
    questions: t.questions,
    accuracy: t.accuracy,
    timeSeconds: t.timeSeconds,
    rank: attempt.rank ?? null,
    participants: attempt.participants ?? null,
    percentile: attempt.percentile ?? null,
  };
}
function derivedSectionPoint(
  attempt: Attempt,
  sectionId: SectionId,
): PerformancePoint | null {
  const section = SECTIONS[sectionId];
  const children = attempt.subjects.filter((subject) =>
    (section.subjectIds as readonly SubjectId[]).includes(subject.subjectId),
  );
  if (children.length !== section.subjectIds.length) return null;
  const stats = children.map(subjectStats);
  const correct = sum(stats.map((s) => s.correct));
  const incorrect = sum(stats.map((s) => s.incorrect));
  const questions = sum(stats.map((s) => s.questions));
  const score = sum(stats.map((s) => s.score));
  const attempted = correct + incorrect;
  const maxScore = questions * 3;
  return {
    key: `${attempt.id}:${sectionId}`,
    sourceAttemptId: attempt.id,
    sourceType: attempt.type,
    origin: "full-derived",
    entityId: sectionId,
    seriesId: sectionId,
    seriesLabel: section.name,
    date: attempt.completedAt,
    name: attempt.name,
    platform: attempt.platform,
    score,
    maxScore,
    percentage: maxScore ? (score / maxScore) * 100 : 0,
    correct,
    incorrect,
    attempted,
    unattempted: questions - attempted,
    questions,
    accuracy: attempted ? (correct / attempted) * 100 : null,
    timeSeconds: children.every((s) => s.timeSeconds != null)
      ? sum(children.map((s) => s.timeSeconds ?? 0))
      : null,
    // A full mock's rank and percentile describe the whole attempt, not a section.
    rank: null,
    participants: null,
    percentile: null,
  };
}
function explicitSectionPoint(attempt: Attempt): PerformancePoint | null {
  const sectionId =
    sectionForSubjects(attempt.subjects) ??
    (attempt.subjects.some((s) => s.subjectId === "quant")
      ? "section1"
      : "section2");
  return parentPoint(attempt, sectionId, sectionId, SECTIONS[sectionId].name);
}
function subjectPoints(attempt: Attempt): PerformancePoint[] {
  return attempt.subjects.map((subject) => {
    const stats = subjectStats(subject);
    return {
      key: `${attempt.id}:${subject.subjectId}`,
      sourceAttemptId: attempt.id,
      sourceType: attempt.type,
      origin: "attempt" as const,
      entityId: subject.subjectId,
      seriesId: subject.subjectId,
      seriesLabel: SUBJECTS[subject.subjectId].short,
      date: attempt.completedAt,
      name: attempt.name,
      platform: attempt.platform,
      score: stats.score,
      maxScore: stats.maxScore,
      percentage: stats.percentage,
      correct: stats.correct,
      incorrect: stats.incorrect,
      attempted: stats.attempted,
      unattempted: stats.unattempted,
      questions: stats.questions,
      accuracy: stats.accuracy,
      timeSeconds: stats.timeSeconds ?? null,
      rank: attempt.rank ?? null,
      participants: attempt.participants ?? null,
      // A full or sectional percentile describes the whole paper, not this
      // individual subject result. Only standalone subject attempts own one.
      percentile:
        attempt.type === "subject" ? (attempt.percentile ?? null) : null,
    };
  });
}

export function projectPerformance(
  attempts: Attempt[],
  scope: DashboardScope,
): PerformancePoint[] {
  const points = attempts.flatMap((attempt) => {
    switch (scope) {
      case "full":
        return attempt.type === "full"
          ? [parentPoint(attempt, "full", "full", "Full mocks")]
          : [];
      case "subject":
        return subjectPoints(attempt);
      case "sectional":
        if (attempt.type === "sectional") {
          const point = explicitSectionPoint(attempt);
          return point ? [point] : [];
        }
        if (attempt.type === "full") {
          return sectionIds
            .map((sectionId) => derivedSectionPoint(attempt, sectionId))
            .filter((point): point is PerformancePoint => point != null);
        }
        return [];
      case "all": {
        const label =
          attempt.type === "full"
            ? "Full mock"
            : attempt.type === "sectional"
              ? "Sectional"
              : "Subject";
        return [parentPoint(attempt, attempt.type, "all", label)];
      }
    }
  });
  return points.sort(comparePoints);
}

function trendSeriesFor(
  scope: DashboardScope,
  points: PerformancePoint[],
): TrendSeries[] {
  if (scope === "full") {
    return [{ id: "full", label: "Full mocks", pointCount: points.length }];
  }
  if (scope === "all") {
    return [
      { id: "all", label: "All mocks", pointCount: points.length },
    ];
  }
  const ids =
    scope === "subject"
      ? subjectIds
      : (sectionIds as readonly string[]);
  return ids.flatMap((id) => {
    const matching = points.filter((point) => point.seriesId === id);
    if (!matching.length) return [];
    return [
      {
        id,
        label: matching[0].seriesLabel,
        pointCount: matching.length,
      },
    ];
  });
}
function stacksFor(
  scope: DashboardScope,
  points: PerformancePoint[],
): AnswerStack[] {
  if (!points.length) return [];
  const groups =
    scope === "full"
      ? [{ id: "full", label: "Full mocks", points }]
      : scope === "all"
        ? (["full", "sectional", "subject"] as const).flatMap((type) => {
            const matching = points.filter(
              (point) => point.sourceType === type,
            );
            return matching.length
              ? [
                  {
                    id: type,
                    label:
                      type === "full"
                        ? "Full mocks"
                        : type === "sectional"
                          ? "Sectional"
                          : "Subject",
                    points: matching,
                  },
                ]
              : [];
          })
        : (scope === "subject"
            ? subjectIds
            : (sectionIds as readonly string[])
          ).flatMap((id) => {
            const matching = points.filter((point) => point.entityId === id);
            return matching.length
              ? [
                  {
                    id,
                    label: matching[0].seriesLabel,
                    points: matching,
                  },
                ]
              : [];
          });
  return groups.map(({ id, label, points: rows }) => {
    const correct = sum(rows.map((row) => row.correct));
    const incorrect = sum(rows.map((row) => row.incorrect));
    const unattempted = sum(rows.map((row) => row.unattempted));
    const total = correct + incorrect + unattempted;
    const score = sum(rows.map((row) => row.score));
    const maxScore = sum(rows.map((row) => row.maxScore));
    // Exam percentile belongs to saved attempts, not to derived subject or
    // section slices. Use only values that genuinely describe this group.
    const percentileRows = rows.filter((row) => {
      if (row.percentile == null) return false;
      if (scope === "subject") return row.sourceType === "subject";
      if (scope === "sectional") return row.origin === "attempt";
      return true;
    });
    const percentile = average(
      percentileRows.map((row) => row.percentile!),
    );
    return {
      id,
      label,
      count: rows.length,
      correct,
      incorrect,
      unattempted,
      total,
      correctPercentage: total ? (correct / total) * 100 : 0,
      incorrectPercentage: total ? (incorrect / total) * 100 : 0,
      unattemptedPercentage: total ? (unattempted / total) * 100 : 0,
      accuracy:
        correct + incorrect ? (correct / (correct + incorrect)) * 100 : null,
      score,
      maxScore,
      scorePercentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
      percentile,
      percentileCount: percentileRows.length,
      centerMetric:
        percentile != null ? ("percentile" as const) : ("score" as const),
    };
  });
}
export function buildWhereYouStand(
  attempts: Attempt[],
): WhereYouStandRow[] {
  return subjectIds.map((subjectId) => {
    const rows = attempts.flatMap((attempt) =>
      attempt.subjects.filter((subject) => subject.subjectId === subjectId),
    );
    const correct = sum(rows.map((row) => row.correct));
    const attempted = sum(rows.map((row) => row.correct + row.incorrect));
    return {
      subjectId,
      label: SUBJECTS[subjectId].short,
      averagePercentage: average(rows.map((row) => subjectStats(row).percentage)),
      weightedAccuracy: attempted ? (correct / attempted) * 100 : null,
      resultCount: rows.length,
    };
  });
}
function deepDiveFor(
  attempts: Attempt[],
  scope: Exclude<DashboardScope, "subject">,
): DeepDiveSubject[] {
  const includeComputer = scope !== "sectional";
  const rows = attempts.flatMap((attempt) => {
    const isFull = attempt.type === "full";
    const include =
      scope === "all" ||
      (scope === "full" && isFull) ||
      (scope === "sectional" &&
        (attempt.type === "sectional" || isFull));
    if (!include) return [];
    return attempt.subjects
      .filter((subject) => includeComputer || subject.subjectId !== "computer")
      .map((subject) => ({ attempt, subject }));
  });
  return subjectIds.flatMap((subjectId) => {
    const matching = rows.filter(
      (row) => row.subject.subjectId === subjectId,
    );
    if (!matching.length) return [];
    const stats = matching.map((row) => ({
      row,
      stats: subjectStats(row.subject),
    }));
    const correct = sum(stats.map(({ stats: s }) => s.correct));
    const attempted = sum(stats.map(({ stats: s }) => s.attempted));
    return [
      {
        id: subjectId,
        name: SUBJECTS[subjectId].short,
        qualifying: subjectId === "computer",
        count: stats.length,
        percentage: average(stats.map(({ stats: s }) => s.percentage)),
        accuracy: attempted ? (correct / attempted) * 100 : null,
        averageTime: average(
          stats
            .filter(({ stats: s }) => s.timeSeconds != null)
            .map(({ stats: s }) => s.timeSeconds!),
        ),
        trend: stats.map(({ row, stats: s }) => ({
          key: `${row.attempt.id}:${subjectId}`,
          date: row.attempt.completedAt,
          name: row.attempt.name,
          sourceAttemptId: row.attempt.id,
          sourceType: row.attempt.type,
          score: s.score,
          maxScore: s.maxScore,
          percentage: s.percentage,
          accuracy: s.accuracy,
          minutes: s.timeSeconds == null ? null : s.timeSeconds / 60,
          timeSeconds: s.timeSeconds ?? null,
        })),
      },
    ];
  });
}
function targetSnapshots(points: PerformancePoint[]): TargetSnapshot[] {
  const groups = new Map<string, PerformancePoint[]>();
  for (const point of points) {
    const key = istDateKey(point.date);
    groups.set(key, [...(groups.get(key) ?? []), point]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rows]) => ({
      key,
      date: rows.map((row) => row.date).sort()[0],
      percentage: average(rows.map((row) => row.percentage))!,
      pointCount: rows.length,
    }));
}
export function analyze(allAttempts: Attempt[], scope: DashboardScope = "all") {
  const points = projectPerformance(allAttempts, scope);
  const sourceAttemptIds = [...new Set(points.map((p) => p.sourceAttemptId))];
  const correct = sum(points.map((p) => p.correct));
  const incorrect = sum(points.map((p) => p.incorrect));
  const questions = sum(points.map((p) => p.questions));
  const snapshots = targetSnapshots(points);
  const latest = snapshots[snapshots.length - 1] ?? null;
  const previous = snapshots[snapshots.length - 2] ?? null;
  return {
    scope,
    sourceAttemptIds,
    sourceAttemptCount: sourceAttemptIds.length,
    pointCount: points.length,
    summary: {
      averagePercentage: average(points.map((p) => p.percentage)),
      bestPercentage: points.length
        ? Math.max(...points.map((p) => p.percentage))
        : null,
      weightedAccuracy:
        correct + incorrect ? (correct / (correct + incorrect)) * 100 : null,
      attemptRate: questions ? ((correct + incorrect) / questions) * 100 : null,
      latestSnapshotPercentage: latest?.percentage ?? null,
      previousSnapshotPercentage: previous?.percentage ?? null,
      correct,
      incorrect,
      unattempted: questions - correct - incorrect,
      questions,
    },
    trend: {
      series: trendSeriesFor(scope, points),
      points,
    },
    target: {
      snapshots,
      fullMockMaxScore: FULL_MOCK_MAX_SCORE,
    },
    radial: stacksFor(scope, points),
    whereYouStand: buildWhereYouStand(allAttempts),
    deepDive: scope === "subject" ? null : deepDiveFor(allAttempts, scope),
  };
}
export type Analytics = ReturnType<typeof analyze>;

export function targetPercentage(targetScore: number | null) {
  return targetScore == null
    ? null
    : (targetScore / FULL_MOCK_MAX_SCORE) * 100;
}
export function targetMarks(targetScore: number | null, maxScore: number) {
  const percentage = targetPercentage(targetScore);
  return percentage == null ? null : (percentage / 100) * maxScore;
}
