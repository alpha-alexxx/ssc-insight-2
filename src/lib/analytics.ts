import {
  type AnalyticsAttempt,
  type Attempt,
  type DashboardScope,
  type Filters,
  type PatternSection,
  type SectionId,
  type SubjectId,
  SUBJECTS,
  sectionIds,
  subjectIds,
  sectionForSubjects,
  subjectStats,
  totals,
} from "./domain";
import { sectionsForAttempt } from "./exams";
const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
/* One shared IST day key. This module used to build its own
 * Intl.DateTimeFormat, identical to format.istDateKey — two formatters for one
 * concept is two places to get the boundary wrong. */
import { istDateKey } from "./format";
export function filterAttempts(attempts: AnalyticsAttempt[], f: Filters) {
  return attempts.filter(
    (a) =>
      (!f.type || f.type === "all" || a.type === f.type) &&
      (!f.subject ||
        f.subject === "all" ||
        a.subjects.some((s) => s.subjectId === f.subject)) &&
      (!f.platform || f.platform === "all" || a.platform === f.platform) &&
      (!f.tier || f.tier === "all" || a.tierId === f.tier) &&
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
  /** Wall-clock for the sitting; includes qualifying time. Not a pace input. */
  timeSeconds: number | null;
  /**
   * Seconds per attempted question over the SAME subjects the question count
   * covers. Null when timing is incomplete or came from a whole-sitting
   * override that cannot be decomposed — never zero, which would read as
   * instant. See totals().meritTimeSeconds.
   */
  paceSeconds: number | null;
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
  /** Points in this group (a full mock contributes one per subject). */
  count: number;
  /**
   * Distinct saved attempts behind the group — never `count`.
   *
   * A single full mock yields four subject points, so the point count
   * over-reports the evidence by 4× and is the wrong denominator for any
   * "based on N results" claim.
   */
  attemptCount: number;
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
  /** Seconds per attempted question, when timing was recorded. */
  averageTimeSeconds: number | null;
  /** How many of `attemptCount` results carried usable timing. */
  timedCount: number;
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

/**
 * Seconds per attempted question, over the same subject set as the count.
 *
 * Both halves must describe the same population: `meritTimeSeconds` excludes
 * qualifying subjects, and so does `attempted`. Dividing wall-clock time
 * (which includes Computer Knowledge) by merit questions would inflate pace on
 * exactly the papers with a qualifying section.
 */
const paceOf = (meritTimeSeconds: number | null, attempted: number) =>
  meritTimeSeconds != null && attempted > 0
    ? meritTimeSeconds / attempted
    : null;

const comparePoints = (a: PerformancePoint, b: PerformancePoint) =>
  a.date.localeCompare(b.date) ||
  a.sourceAttemptId.localeCompare(b.sourceAttemptId) ||
  a.entityId.localeCompare(b.entityId);
function parentPoint(
  attempt: AnalyticsAttempt,
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
    paceSeconds: paceOf(t.meritTimeSeconds, t.attempted),
    rank: attempt.rank ?? null,
    participants: attempt.participants ?? null,
    percentile: attempt.percentile ?? null,
  };
}
function derivedSectionPoint(
  attempt: AnalyticsAttempt,
  sections: readonly PatternSection[],
  sectionId: SectionId,
): PerformancePoint | null {
  const section = sections.find((s) => s.id === sectionId);
  if (!section) return null;
  // A qualifying section (CGL/CHSL Section III, Computer Knowledge) is a
  // pass/fail gate, not merit: it must never produce a sectional point, or a
  // full mock would contribute a third point and the merit series would mix
  // a qualifying paper into comparable section trends.
  if (section.qualifying) return null;
  const children = attempt.subjects.filter((subject) =>
    section.subjectIds.includes(subject.subjectId),
  );
  if (children.length !== section.subjectIds.length) return null;
  const stats = children.map((s) => subjectStats(s, attempt.marking));
  const correct = sum(stats.map((s) => s.correct));
  const incorrect = sum(stats.map((s) => s.incorrect));
  const questions = sum(stats.map((s) => s.questions));
  const score = sum(stats.map((s) => s.score));
  const attempted = correct + incorrect;
  const maxScore = questions * attempt.marking.correct;
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
    paceSeconds: paceOf(
      children.every((row) => row.timeSeconds != null)
        ? sum(children.map((row) => row.timeSeconds ?? 0))
        : null,
      attempted,
    ),
    // A full mock's rank and percentile describe the whole attempt, not a section.
    rank: null,
    participants: null,
    percentile: null,
  };
}
function explicitSectionPoint(attempt: AnalyticsAttempt): PerformancePoint | null {
  const sections = sectionsForAttempt(attempt.examId, attempt.tierId);
  const section = sectionForSubjects(attempt.subjects, sections);
  return section
    ? parentPoint(attempt, section.id, section.id, section.name)
    : null;
}
/* Uses the shared matcher rather than a private copy: this ran identical
 * logic to domain.sectionForSubjects, and two implementations of "is this the
 * same subject set" is how a section silently stops being recognised. */
function subjectPoints(attempt: AnalyticsAttempt): PerformancePoint[] {
  return attempt.subjects.map((subject) => {
    const stats = subjectStats(subject, attempt.marking);
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
      // A subject row is already a single subject, so its own time over its
      // own attempted questions is exact.
      paceSeconds: paceOf(stats.timeSeconds ?? null, stats.attempted),
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
  attempts: AnalyticsAttempt[],
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
          const sections = sectionsForAttempt(attempt.examId, attempt.tierId);
          return sectionIds
            .map((sectionId) => derivedSectionPoint(attempt, sections, sectionId))
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
    /* Time is WEIGHTED, not a mean of means: one long mock and one short mock
     * averaged per-point would let the short one pull the figure around. Total
     * seconds over total attempted questions is what "how long do I take per
     * question" actually means. */
    const timedRows = rows.filter((row) => row.paceSeconds != null);
    const timedCount = timedRows.length;
    const averageTimeSeconds =
      timedCount > 0
        ? sum(timedRows.map((row) => row.paceSeconds! * row.attempted)) /
          Math.max(
            1,
            sum(timedRows.map((row) => row.attempted)),
          )
        : null;
    return {
      id,
      label,
      count: rows.length,
      attemptCount: new Set(rows.map((row) => row.sourceAttemptId)).size,
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
      averageTimeSeconds,
      timedCount,
      percentile,
      percentileCount: percentileRows.length,
      centerMetric:
        percentile != null ? ("percentile" as const) : ("score" as const),
    };
  });
}
export function buildWhereYouStand(
  attempts: AnalyticsAttempt[],
): WhereYouStandRow[] {
  return subjectIds.map((subjectId) => {
    const rows = attempts.flatMap((attempt) =>
      attempt.subjects
        .filter((subject) => subject.subjectId === subjectId)
        .map((subject) => ({ attempt, subject })),
    );
    const correct = sum(rows.map(({ subject: row }) => row.correct));
    const attempted = sum(
      rows.map(({ subject: row }) => row.correct + row.incorrect),
    );
    return {
      subjectId,
      label: SUBJECTS[subjectId].short,
      averagePercentage: average(
        rows.map(({ attempt, subject: row }) =>
          subjectStats(row, attempt.marking).percentage,
        ),
      ),
      weightedAccuracy: attempted ? (correct / attempted) * 100 : null,
      resultCount: rows.length,
    };
  });
}
function deepDiveFor(
  attempts: AnalyticsAttempt[],
  scope: Exclude<DashboardScope, "subject">,
): DeepDiveSubject[] {
  const rows = attempts.flatMap((attempt) => {
    const isFull = attempt.type === "full";
    const include =
      scope === "all" ||
      (scope === "full" && isFull) ||
      (scope === "sectional" &&
        (attempt.type === "sectional" || isFull));
    if (!include) return [];
    // Sectional scope reads merit-bearing subjects only; qualifying papers
    // (CGL Tier 2 Computer) never appear there.
    return attempt.subjects
      .filter(
        (subject) =>
          scope !== "sectional" || !subject.qualifying,
      )
      .map((subject) => ({ attempt, subject }));
  });
  return subjectIds.flatMap((subjectId) => {
    const matching = rows.filter(
      (row) => row.subject.subjectId === subjectId,
    );
    if (!matching.length) return [];
    const stats = matching.map(({ attempt, subject: row }) => ({
      row,
      attempt,
      stats: subjectStats(row, attempt.marking),
    }));
    const correct = sum(stats.map(({ stats: s }) => s.correct));
    const attempted = sum(stats.map(({ stats: s }) => s.attempted));
    return [
      {
        id: subjectId,
        name: SUBJECTS[subjectId].short,
        qualifying: matching.some((row) => row.subject.qualifying),
        count: stats.length,
        percentage: average(stats.map(({ stats: s }) => s.percentage)),
        accuracy: attempted ? (correct / attempted) * 100 : null,
        averageTime: average(
          stats
            .filter(({ stats: s }) => s.timeSeconds != null)
            .map(({ stats: s }) => s.timeSeconds!),
        ),
        /* Ascending by attempt date, matching trend.points.
         *
         * This used to inherit the repository's DESC order, so the deep-dive
         * line charts plotted time backwards while every other chart on the
         * page ran forwards — the same mock sat at opposite ends of two axes. */
        trend: stats
          .map(({ attempt, stats: s }) => ({
            key: `${attempt.id}:${subjectId}`,
            date: attempt.completedAt,
            name: attempt.name,
            sourceAttemptId: attempt.id,
            sourceType: attempt.type,
            score: s.score,
            maxScore: s.maxScore,
            percentage: s.percentage,
            accuracy: s.accuracy,
            minutes: s.timeSeconds == null ? null : s.timeSeconds / 60,
            timeSeconds: s.timeSeconds ?? null,
          }))
          .sort(
            (a, b) =>
              a.date.localeCompare(b.date) ||
              a.sourceAttemptId.localeCompare(b.sourceAttemptId),
          ),
      },
    ];
  });
}
function targetSnapshots(points: PerformancePoint[]): TargetSnapshot[] {
  const groups = new Map<string, PerformancePoint[]>();
  for (const point of points) {
    const key = istDateKey(point.date);
    const group = groups.get(key);
    if (group) group.push(point);
    else groups.set(key, [point]);
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
/**
 * The target a chart is measured against, resolved on the server for the
 * SAME tier the analytics were scoped to. Keeping marks and their maximum
 * together is what stops a target set on a 100-mark paper being drawn
 * against a 390-mark axis (or vice versa). `label` names the tier so the UI
 * can say which paper the line describes.
 */
export type TargetReference = {
  marks: number | null;
  maxScore: number;
  /** Percentage of the paper, or null when no marks target is set. */
  percentage: number | null;
  /** The tier the reference was resolved on ("Tier 2 — Paper I"). */
  tierLabel: string | null;
  /** Below 1 means the paper mixes maxima, so one reference line is not
   * meaningful (e.g. the combined all-tiers view). */
  comparable: boolean;
};

export function analyze(
  allAttempts: AnalyticsAttempt[],
  scope: DashboardScope = "all",
  /**
   * The paper the target is measured against. A bare number keeps the
   * historical call site working; pass a TargetReference for a tier-matched
   * line; pass null when nothing resolves.
   *
   * There is deliberately NO default. This used to default to the legacy
   * CGL Tier 2 total (390), so a scope that resolved nothing — a fresh
   * account, a non-CGL exam, the combined all-tiers view — silently drew its
   * percentages and its target against the wrong paper's maximum. Omitting it
   * now means "no reference": the maximum falls back to the largest one the
   * scope actually contains, and no target line is drawn.
   */
  target?: number | TargetReference | null,
) {
  const reference: TargetReference | null =
    target == null
      ? null
      : typeof target == "number"
        ? {
            marks: null,
            maxScore: target,
            percentage: null,
            tierLabel: null,
            comparable: true,
          }
        : target;
  const points = projectPerformance(allAttempts, scope);
  /* Without a resolved reference, the honest maximum is the largest one the
   * scope actually contains — never an assumed paper size. Null when the
   * scope is empty, so the UI renders "no target" rather than "/390". */
  const observedMaxScore = points.length
    ? Math.max(...points.map((point) => point.maxScore))
    : null;
  const targetMaxScore = reference?.maxScore ?? observedMaxScore;
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
      /**
       * The paper maximum the target is expressed against. Renamed from
       * `fullMockMaxScore`, which implied the legacy 390 paper; it can be any
       * tier's maximum now, or null when the scope is empty.
       */
      maxScore: targetMaxScore,
      /**
       * @deprecated Alias of `maxScore`, kept for the existing readers in
       * performance-overview. Remove once they are migrated.
       */
      fullMockMaxScore: targetMaxScore,
      marks: reference?.marks ?? null,
      percentage: reference?.percentage ?? null,
      tierLabel: reference?.tierLabel ?? null,
      // No reference means nothing comparable to draw a line against.
      comparable: reference?.comparable ?? false,
    },
    radial: stacksFor(scope, points),
    whereYouStand: buildWhereYouStand(allAttempts),
    deepDive: scope === "subject" ? null : deepDiveFor(allAttempts, scope),
  };
}
export type Analytics = ReturnType<typeof analyze>;

/**
 * A target's share of its paper, in percent.
 *
 * Null when either side is unknown: a target with no paper cannot be expressed
 * as a percentage, and 0 would read as "no target set" all the same while
 * silently drawing a line at zero.
 */
export function targetPercentage(
  targetScore: number | null,
  maxScore: number | null,
) {
  return targetScore == null || maxScore == null || maxScore <= 0
    ? null
    : (targetScore / maxScore) * 100;
}
export function targetMarks(
  targetScore: number | null,
  patternMaxScore: number,
  displayMaxScore: number,
) {
  const percentage = targetPercentage(targetScore, patternMaxScore);
  return percentage == null ? null : (percentage / 100) * displayMaxScore;
}
