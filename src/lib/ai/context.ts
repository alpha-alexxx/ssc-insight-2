import { createHash } from "node:crypto";
import {
  SUBJECTS,
  subjectStats,
  totals,
  type AnalyticsAttempt,
  type PatternShape,
} from "../domain";
import { patternMaxScore } from "../exams";
import { analyze } from "../analytics";
import { dayKey } from "./tokens";

const MAX_CONTEXT_CHARS = 36_000;
const RECENT_FULL_MOCK_LIMIT = 20;

function round(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function subjectProfile(attempt: AnalyticsAttempt) {
  return attempt.subjects.map((subject) => {
    const stats = subjectStats(subject, attempt.marking);
    return {
      subject: subject.subjectId,
      qualifying: subject.qualifying,
      questions: stats.questions,
      correct: stats.correct,
      incorrect: stats.incorrect,
      score: round(stats.score, 2),
      accuracy: round(stats.accuracy),
      timeSeconds: stats.timeSeconds ?? null,
    };
  });
}

function recentFullMock(attempt: AnalyticsAttempt) {
  const result = totals(attempt);
  return {
    date: dayKey(new Date(attempt.completedAt)),
    platform: attempt.platform,
    score: round(result.score, 2),
    maxScore: result.maxScore,
    percentage: round(result.percentage),
    accuracy: round(result.accuracy),
    rank: attempt.rank ?? null,
    participants: attempt.participants ?? null,
    percentile: attempt.percentile ?? null,
    timeSeconds: result.timeSeconds ?? null,
    subjects: subjectProfile(attempt),
  };
}

function fullMockProfile(fullMocks: AnalyticsAttempt[]) {
  const chronological = [...fullMocks].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  );
  const percentages = chronological.map(
    (attempt) => totals(attempt).percentage,
  );
  const correct = chronological.reduce(
    (sum, attempt) => sum + totals(attempt).correct,
    0,
  );
  const attempted = chronological.reduce(
    (sum, attempt) => sum + totals(attempt).attempted,
    0,
  );
  const recent = percentages.slice(-5);
  const previous = percentages.slice(-10, -5);
  const recentAverage = average(recent);
  const previousAverage = previous.length ? average(previous) : null;
  return {
    count: fullMocks.length,
    averagePercentage: round(average(percentages)),
    bestPercentage: percentages.length ? round(Math.max(...percentages)) : null,
    weightedAccuracy: attempted ? round((correct / attempted) * 100) : null,
    recentFiveAverage: round(recentAverage),
    previousFiveAverage: round(previousAverage),
    recentChange: round(
      recentAverage != null && previousAverage != null
        ? recentAverage - previousAverage
        : null,
    ),
  };
}

function sectionProfile(
  attempts: AnalyticsAttempt[],
  pattern: PatternShape,
) {
  // Sections are tier-specific data (only CGL and CHSL Tier 2 define them
  // today); aggregate only attempts of that tier so mixed-tier totals never
  // mix. A qualifying section is a gate, not merit, so it is reported only as
  // a pass/fail readiness note — never folded into the merit section rows.
  const tierAttempts = attempts.filter(
    (attempt) =>
      attempt.examId === pattern.examId && attempt.tierId === pattern.tierId,
  );
  const rows = tierAttempts.flatMap((attempt) =>
    attempt.subjects.map((subject) => ({ attempt, subject })),
  );
  return pattern.sections
    .filter((section) => !section.qualifying)
    .map((section) => {
    const matching = rows.filter(({ subject }) =>
      section.subjectIds.includes(subject.subjectId),
    );
    const correct = matching.reduce((sum, { subject }) => sum + subject.correct, 0);
    const incorrect = matching.reduce(
      (sum, { subject }) => sum + subject.incorrect,
      0,
    );
    const questions = matching.reduce(
      (sum, { subject }) => sum + subject.questions,
      0,
    );
    const score = matching.reduce(
      (sum, { attempt, subject }) =>
        sum + subjectStats(subject, attempt.marking).score,
      0,
    );
    return {
      section: section.id,
      label: `${section.name} · ${section.description}`,
      results: matching.length,
      questions,
      score: round(score, 2),
      maxScore: questions * pattern.marking.correct,
      percentage: questions ? round((score / (questions * pattern.marking.correct)) * 100) : null,
      accuracy:
        correct + incorrect
          ? round((correct / (correct + incorrect)) * 100)
          : null,
    };
  });
}

function payload(
  attempts: AnalyticsAttempt[],
  targetScore: number | null,
  recentFullMocks: ReturnType<typeof recentFullMock>[],
  pattern: PatternShape,
  examName: string,
) {
  const analytics = analyze(attempts, "all", patternMaxScore(pattern));
  const fullMocks = attempts.filter((attempt) => attempt.type === "full");
  const latest = recentFullMocks[0] ?? null;
  const targetMaxScore = patternMaxScore(pattern);
  const targetPercentage =
    targetScore != null ? (targetScore / targetMaxScore) * 100 : null;
  const dates = attempts
    .map((attempt) => attempt.completedAt)
    .sort((a, b) => b.localeCompare(a));

  return {
    dataAsOf: dates[0] ?? null,
    exam: {
      id: pattern.examId,
      name: examName,
      tierId: pattern.tierId,
    },
    coverage: {
      totalAttempts: attempts.length,
      fullMocks: fullMocks.length,
      subjectMocks: attempts.filter((attempt) => attempt.type === "subject")
        .length,
      sectionalMocks: attempts.filter((attempt) => attempt.type === "sectional")
        .length,
      recentFullMocksIncluded: recentFullMocks.length,
      recentFullMockLimit: RECENT_FULL_MOCK_LIMIT,
    },
    target: {
      score: targetScore,
      percentage: round(targetPercentage),
      fullMockMaxScore: targetMaxScore,
      latestFullMockPercentage: latest?.percentage ?? null,
      gapToTarget:
        latest?.percentage != null && targetPercentage != null
          ? round(latest.percentage - targetPercentage)
          : null,
    },
    overall: {
      averagePercentage: round(analytics.summary.averagePercentage),
      bestPercentage: round(analytics.summary.bestPercentage),
      weightedAccuracy: round(analytics.summary.weightedAccuracy),
      attemptRate: round(analytics.summary.attemptRate),
      correct: analytics.summary.correct,
      incorrect: analytics.summary.incorrect,
      unattempted: analytics.summary.unattempted,
      questions: analytics.summary.questions,
    },
    fullMocks: fullMockProfile(fullMocks),
    subjects: analytics.whereYouStand.map((row) => ({
      subject: row.subjectId,
      name: SUBJECTS[row.subjectId].short,
      qualifying: row.subjectId === "computer",
      averagePercentage: round(row.averagePercentage),
      weightedAccuracy: round(row.weightedAccuracy),
      resultCount: row.resultCount,
    })),
    sections: sectionProfile(attempts, pattern),
    recentFullMocks,
  };
}

/**
 * Compact, whitelisted context for the coach and chat. Names, IDs, notes,
 * source, and bookkeeping timestamps are deliberately absent. The pattern is
 * the active exam's primary tier — target math and section aggregates key
 * off it, while per-attempt scoring uses each attempt's own marking.
 */
export function buildAiContext(
  attempts: AnalyticsAttempt[],
  targetScore: number | null,
  pattern: PatternShape,
  examName = "SSC CGL",
) {
  const fullMocks = attempts
    .filter((attempt) => attempt.type === "full")
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, RECENT_FULL_MOCK_LIMIT);
  const recent = fullMocks.map(recentFullMock);
  let context = payload(attempts, targetScore, recent, pattern, examName);
  while (
    context.recentFullMocks.length > 0 &&
    JSON.stringify(context).length > MAX_CONTEXT_CHARS
  ) {
    context = payload(
      attempts,
      targetScore,
      context.recentFullMocks.slice(0, -1),
      pattern,
      examName,
    );
  }
  const serialized = JSON.stringify(context);
  const contextVersion = createHash("sha256").update(serialized).digest("hex");
  return { ...context, contextVersion };
}

export type AiContext = ReturnType<typeof buildAiContext>;
