import { totals, type Attempt, type AttemptStats, type SortKey } from "./domain";
import { mockTypeLabel } from "./format";

/**
 * Shared attempt-list ordering and list-level aggregates.
 *
 * The comparators are the exact ones /history used client-side before
 * pagination moved server-side: the API sorts by the same keys so column
 * order matches what the UI has always shown. Score, accuracy, and time are
 * not stored columns — they derive from totals() — so for those keys the
 * repository evaluates the comparator in JS over a minimal projection
 * (AttemptSortRow) of the filtered set and pages by the resulting id order.
 */

export type AttemptSortRow = Pick<
  Attempt,
  | "id"
  | "name"
  | "type"
  | "platform"
  | "completedAt"
  | "percentile"
  | "scoreOverride"
  | "overallTimeSeconds"
  | "subjects"
>;

/** Ascending comparators, one per sortable column. Direction is applied by
 * the caller (the historical client behavior sorts asc then reverses). */
const ASC_SORTERS: Record<SortKey, (a: AttemptSortRow, b: AttemptSortRow) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  type: (a, b) => mockTypeLabel(a.type).localeCompare(mockTypeLabel(b.type)),
  platform: (a, b) => a.platform.localeCompare(b.platform),
  date: (a, b) => a.completedAt.localeCompare(b.completedAt),
  score: (a, b) => {
    const ta = totals(a);
    const tb = totals(b);
    return ta.score / Math.max(1, ta.maxScore) - tb.score / Math.max(1, tb.maxScore);
  },
  accuracy: (a, b) => (totals(a).accuracy ?? -1) - (totals(b).accuracy ?? -1),
  percentile: (a, b) => (a.percentile ?? -1) - (b.percentile ?? -1),
  time: (a, b) => (totals(a).timeSeconds ?? 0) - (totals(b).timeSeconds ?? 0),
};

/**
 * Deterministic comparator for the computed keys: ties break by id so a
 * page slice is stable across requests (the projection query has no DB
 * orderBy, so row order is otherwise unspecified).
 */
export function attemptComparator(
  key: SortKey,
): (a: AttemptSortRow, b: AttemptSortRow) => number {
  const base = ASC_SORTERS[key];
  return (a, b) =>
    base(a, b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** This-month vs earlier split for the KPI deltas; null when either side is empty. */
function monthSplit<T extends { completedAt: string }>(rows: T[]) {
  const month = new Date().toISOString().slice(0, 7);
  const current = rows.filter((r) => r.completedAt.slice(0, 7) === month);
  const earlier = rows.filter((r) => r.completedAt.slice(0, 7) < month);
  return { current, earlier };
}

/**
 * List-level aggregates for the /history KPI strip, computed server-side
 * over the whole filtered set (pagination means the client only ever holds
 * one page). The math is lifted verbatim from the previous client-side
 * computation so the strip reads identically.
 */
export function buildAttemptStats(rows: AttemptSortRow[]): AttemptStats {
  const { current, earlier } = monthSplit(rows);
  const avg = (
    list: AttemptSortRow[],
    pick: (t: ReturnType<typeof totals>) => number,
  ) =>
    list.length
      ? list.reduce((sum, r) => sum + pick(totals(r)), 0) / list.length
      : null;
  const avgScore = avg(rows, (t) => t.score);
  const avgPct = avg(rows, (t) => (t.maxScore ? (t.score / t.maxScore) * 100 : 0));
  const accOf = (list: AttemptSortRow[]) => {
    const correct = list.reduce((sum, r) => sum + totals(r).correct, 0);
    const attempted = list.reduce(
      (sum, r) => sum + totals(r).correct + totals(r).incorrect,
      0,
    );
    return attempted ? (correct / attempted) * 100 : null;
  };
  const timeOf = (list: AttemptSortRow[]) =>
    avg(
      list.filter((r) => totals(r).timeSeconds != null),
      (t) => t.timeSeconds!,
    );
  const avgAccuracy = accOf(rows);
  const accuracyDelta =
    current.length && earlier.length ? accOf(current)! - accOf(earlier)! : null;
  const avgTime = timeOf(rows);
  const timeDelta =
    current.length && earlier.length && timeOf(earlier)
      ? (timeOf(current)! - timeOf(earlier)!) / timeOf(earlier)!
      : null;
  return {
    totalMocks: rows.length,
    avgScore,
    avgScorePct: avgPct,
    avgAccuracy,
    accuracyDelta,
    avgTime,
    timeDelta,
    newThisMonth: current.length,
  };
}
