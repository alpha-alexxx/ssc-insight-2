import { createHash } from "node:crypto";
import {
  FULL_MOCK_MAX_SCORE,
  SECTIONS,
  SUBJECTS,
  sectionIds,
  subjectStats,
  totals,
  type AnalyticsAttempt,
  type SubjectId,
} from "../domain";
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
    const stats = subjectStats(subject);
    return {
      subject: subject.subjectId,
      qualifying: subject.subjectId === "computer",
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
    maxScore: FULL_MOCK_MAX_SCORE,
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

function sectionProfile(attempts: AnalyticsAttempt[]) {
  const rows = attempts.flatMap((attempt) => attempt.subjects);
  return sectionIds.map((sectionId) => {
    const section = SECTIONS[sectionId];
    const matching = rows.filter((subject) =>
      (section.subjectIds as readonly SubjectId[]).includes(subject.subjectId),
    );
    const correct = matching.reduce((sum, subject) => sum + subject.correct, 0);
    const incorrect = matching.reduce(
      (sum, subject) => sum + subject.incorrect,
      0,
    );
    const questions = matching.reduce(
      (sum, subject) => sum + subject.questions,
      0,
    );
    const score = matching.reduce(
      (sum, subject) => sum + subjectStats(subject).score,
      0,
    );
    return {
      section: sectionId,
      label: `${section.name} · ${section.description}`,
      results: matching.length,
      questions,
      score: round(score, 2),
      maxScore: questions * 3,
      percentage: questions ? round((score / (questions * 3)) * 100) : null,
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
) {
  const analytics = analyze(attempts, "all");
  const fullMocks = attempts.filter((attempt) => attempt.type === "full");
  const latest = recentFullMocks[0] ?? null;
  const targetPercentage =
    targetScore != null ? (targetScore / FULL_MOCK_MAX_SCORE) * 100 : null;
  const dates = attempts
    .map((attempt) => attempt.completedAt)
    .sort((a, b) => b.localeCompare(a));

  return {
    dataAsOf: dates[0] ?? null,
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
      fullMockMaxScore: FULL_MOCK_MAX_SCORE,
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
    sections: sectionProfile(attempts),
    recentFullMocks,
  };
}

/**
 * Compact, whitelisted context for the coach and chat. Names, IDs, notes,
 * source, and bookkeeping timestamps are deliberately absent.
 */
export function buildAiContext(
  attempts: AnalyticsAttempt[],
  targetScore: number | null,
) {
  const fullMocks = attempts
    .filter((attempt) => attempt.type === "full")
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, RECENT_FULL_MOCK_LIMIT);
  const recent = fullMocks.map(recentFullMock);
  let context = payload(attempts, targetScore, recent);
  while (
    context.recentFullMocks.length > 0 &&
    JSON.stringify(context).length > MAX_CONTEXT_CHARS
  ) {
    context = payload(
      attempts,
      targetScore,
      context.recentFullMocks.slice(0, -1),
    );
  }
  const serialized = JSON.stringify(context);
  const contextVersion = createHash("sha256").update(serialized).digest("hex");
  return { ...context, contextVersion };
}

export type AiContext = ReturnType<typeof buildAiContext>;
