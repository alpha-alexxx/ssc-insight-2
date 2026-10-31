"use client";
import { memo, useMemo, useState } from "react";
import { PlainIcon, DuotoneTile } from "./icon";
import { Button } from "./ui/button";
import { Panel } from "./dashboard-panels";
import { totals, formatNumber as n, formatTime, type Attempt } from "@/lib/domain";
import { longDate, mockTypeLabel, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Mock history / recent mocks panel. History mode: KPI cards computed from
 * the filtered attempts (with this-month deltas), sortable columns, score
 * bars, and client-side pagination. Dashboard mode: the compact recent-5
 * table. The value itself is always printed, so state never rides on color
 * alone.
 */

function accuracyTone(accuracy: number | null) {
  if (accuracy == null) return "bg-soft text-muted";
  if (accuracy >= 70) return "bg-positive-soft text-positive";
  if (accuracy >= 50) return "bg-soft text-muted";
  return "bg-warning-soft text-warning";
}

function typeChip(type: string) {
  if (type === "full") return "bg-accent-soft text-accent";
  if (type === "subject") return "bg-positive-soft text-positive";
  if (type === "sectional") return "bg-warning-soft text-warning";
  return "bg-soft text-muted";
}

function scoreBarTone(pct: number) {
  if (pct >= 70) return "bg-positive";
  if (pct >= 50) return "bg-accent";
  return "bg-warning";
}

function attemptTime(completedAt: string): string {
  return new Date(completedAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

type SortKey =
  | "name"
  | "type"
  | "platform"
  | "date"
  | "score"
  | "accuracy"
  | "percentile"
  | "time";

const SORTERS: Record<SortKey, (a: Attempt, b: Attempt) => number> = {
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

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium transition-colors hover:text-ink",
        active ? "text-ink" : "muted",
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <span aria-hidden="true" className="text-[0.625rem] leading-none">
        {active ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </button>
  );
}

/** This-month vs earlier split for the KPI deltas; null when either side is empty. */
function monthSplit(attempts: Attempt[]) {
  const month = new Date().toISOString().slice(0, 7);
  const current = attempts.filter((a) => a.completedAt.slice(0, 7) === month);
  const earlier = attempts.filter((a) => a.completedAt.slice(0, 7) < month);
  return { current, earlier };
}

function KpiCard({
  icon,
  tile,
  label,
  value,
  suffix,
  delta,
}: {
  icon: "history" | "target" | "success" | "clock";
  tile: string;
  label: string;
  value: string;
  suffix?: string;
  delta?: { text: string; good: boolean } | null;
}) {
  return (
    <div className="metric-cell">
      <span className="metric-head">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-control",
            tile,
          )}
          aria-hidden="true"
        >
          <PlainIcon name={icon} size={13} />
        </span>
        <span className="metric-label truncate">{label}</span>
      </span>
      <span className="metric-figure">
        <span className="metric-value">{value}</span>
        {suffix && (
          <span className="text-xs font-normal text-muted">{suffix}</span>
        )}
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[0.6875rem] font-normal",
              delta.good ? "text-positive" : "text-warning",
            )}
          >
            <PlainIcon
              name={delta.good ? "arrowUpRight" : "arrowDownRight"}
              size={11}
            />
            {delta.text}
          </span>
        )}
      </span>
    </div>
  );
}

/** Memoized: the shell re-renders per chat token/keystroke; rows don't need to. */
export const HistoryPanel = memo(function HistoryPanel({
  mode,
  attempts,
  totalCount,
  sourceCount,
  search,
  onSearch,
  onViewAll,
  onOpen,
  onAdd,
}: {
  /** "dashboard" shows the 5 most recent; "history" shows everything. */
  mode: "dashboard" | "history";
  attempts: Attempt[];
  totalCount: number;
  sourceCount: number;
  search: string;
  onSearch: (value: string) => void;
  onViewAll: () => void;
  onOpen: (attempt: Attempt) => void;
  onAdd: () => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc",
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const sorted = useMemo(() => {
    const result = [...attempts].sort(SORTERS[sort.key]);
    return sort.dir === "desc" ? result.reverse() : result;
  }, [attempts, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible =
    mode === "dashboard"
      ? [...attempts]
          .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
          .slice(0, 5)
      : sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" || key === "type" || key === "platform" ? "asc" : "desc" },
    );

  /* KPI aggregates over the filtered attempts, split by month for deltas. */
  const { current, earlier } = useMemo(() => monthSplit(attempts), [attempts]);
  const avg = (list: Attempt[], pick: (t: ReturnType<typeof totals>) => number) =>
    list.length
      ? list.reduce((sum, a) => sum + pick(totals(a)), 0) / list.length
      : null;
  const avgScore = avg(attempts, (t) => t.score);
  const avgPct = avg(attempts, (t) => (t.maxScore ? (t.score / t.maxScore) * 100 : 0));
  const accOf = (list: Attempt[]) => {
    const correct = list.reduce((sum, a) => sum + totals(a).correct, 0);
    const attempted = list.reduce(
      (sum, a) => sum + totals(a).correct + totals(a).incorrect,
      0,
    );
    return attempted ? (correct / attempted) * 100 : null;
  };
  const timeOf = (list: Attempt[]) =>
    avg(list.filter((a) => totals(a).timeSeconds != null), (t) => t.timeSeconds!);
  const avgAccuracy = accOf(attempts);
  const accuracyDelta =
    current.length && earlier.length
      ? accOf(current)! - accOf(earlier)!
      : null;
  const avgTime = timeOf(attempts);
  const timeDelta =
    current.length && earlier.length && timeOf(earlier)
      ? (timeOf(current)! - timeOf(earlier)!) / timeOf(earlier)!
      : null;
  const newThisMonth = current.length;

  return (
    <div className="min-w-0">
      {mode === "history" && (
        <div className="strip-frame mb-4">
          <div className="metric-strip">
          <KpiCard
            icon="history"
            tile="bg-accent-soft text-accent"
            label="Total mocks"
            value={n(sourceCount)}
            delta={
              newThisMonth
                ? { text: `+${newThisMonth} this month`, good: true }
                : null
            }
          />
          <KpiCard
            icon="target"
            tile="bg-positive-soft text-positive"
            label="Average score"
            value={avgScore != null ? n(Math.round(avgScore)) : "—"}
            suffix={avgScore != null ? "/ 390" : undefined}
            delta={
              avgPct != null ? { text: `${n(avgPct)}%`, good: true } : null
            }
          />
          <KpiCard
            icon="success"
            tile="bg-accent-soft text-accent"
            label="Average accuracy"
            value={avgAccuracy != null ? `${n(avgAccuracy)}%` : "—"}
            delta={
              accuracyDelta != null
                ? {
                    text: `${accuracyDelta > 0 ? "+" : ""}${n(accuracyDelta)}%`,
                    good: accuracyDelta >= 0,
                  }
                : null
            }
          />
          <KpiCard
            icon="clock"
            tile="bg-warning-soft text-warning"
            label="Average time"
            value={avgTime != null ? formatTime(avgTime) : "—"}
            delta={
              timeDelta != null
                ? {
                    text: `${timeDelta > 0 ? "+" : ""}${Math.round(timeDelta * 100)}%`,
                    good: timeDelta <= 0,
                  }
                : null
            }
          />
          </div>
        </div>
      )}
      <Panel
        icon="history"
        title={mode === "dashboard" ? "Recent mocks" : "Mock history"}
        description={
          mode === "dashboard"
            ? `${sourceCount} saved attempt${sourceCount === 1 ? "" : "s"} contribute to this view.`
            : `${totalCount} result${totalCount === 1 ? "" : "s"} · sorted by ${sort.key === "date" ? "attempt date" : sort.key}`
        }
        action={
          mode === "dashboard" ? (
            <button
              onClick={onViewAll}
              className="flex items-center gap-1 text-accent text-xs font-medium whitespace-nowrap hover:text-accent-hover transition-colors"
            >
              View all <PlainIcon name="arrowRight" size={13} />
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <PlainIcon
                  name="search"
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 muted pointer-events-none"
                />
                <input
                  aria-label="Search mocks"
                  placeholder="Search mocks…  /"
                  className="w-full py-2 pl-8 text-xs sm:w-56"
                  value={search}
                  onChange={(e) => onSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && search) {
                      e.stopPropagation();
                      onSearch("");
                    }
                  }}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => onSearch("")}
                    className="tap-target absolute right-2 top-1/2 -translate-y-1/2 muted hover:text-ink"
                  >
                    <PlainIcon name="close" size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        }
      >
        <div className="table-scroll">
          {visible.length ? (
            <table className="w-full whitespace-nowrap tabular">
              <thead>
                <tr>
                  {mode === "history" ? (
                    <>
                      <th className="sticky-col">
                        <SortHeader label="Mock name" sortKey="name" sort={sort} onSort={onSort} />
                      </th>
                      <th>
                        <SortHeader label="Type" sortKey="type" sort={sort} onSort={onSort} />
                      </th>
                      <th>
                        <SortHeader label="Platform" sortKey="platform" sort={sort} onSort={onSort} />
                      </th>
                      <th>
                        <SortHeader label="Attempt date" sortKey="date" sort={sort} onSort={onSort} />
                      </th>
                      <th>
                        <SortHeader label="Score" sortKey="score" sort={sort} onSort={onSort} />
                      </th>
                      <th>
                        <SortHeader label="Accuracy" sortKey="accuracy" sort={sort} onSort={onSort} />
                      </th>
                      <th>
                        <SortHeader label="Percentile" sortKey="percentile" sort={sort} onSort={onSort} />
                      </th>
                      <th>
                        <SortHeader label="Time taken" sortKey="time" sort={sort} onSort={onSort} />
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="sticky-col">Mock name</th>
                      <th>Attempt date</th>
                      <th>Score</th>
                      <th>Accuracy</th>
                      <th>Percentile</th>
                      <th>Time taken</th>
                    </>
                  )}
                  <th>
                    <span className="sr-only">View result</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => {
                  const t = totals(a);
                  const pct = t.maxScore ? (t.score / t.maxScore) * 100 : 0;
                  return (
                    <tr key={a.id}>
                      <td className="sticky-col">
                        <button
                          onClick={() => onOpen(a)}
                          className="flex items-center gap-2.5 text-left"
                          title={`Open ${a.name}`}
                        >
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-control",
                              typeChip(a.type),
                            )}
                            aria-hidden="true"
                          >
                            <PlainIcon name="file" size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-56 truncate text-[13px] font-medium transition-colors group-hover:text-accent">
                              {a.name}
                            </span>
                            <span className="block text-[11px] muted mt-0.5">
                              {mockTypeLabel(a.type)}
                            </span>
                          </span>
                        </button>
                      </td>
                      {mode === "history" && (
                        <>
                          <td>
                            <span
                              className={cn(
                                "rounded-control px-2 py-1 text-[11px] font-medium",
                                typeChip(a.type),
                              )}
                            >
                              {mockTypeLabel(a.type)}
                            </span>
                          </td>
                          <td>
                            <span className="rounded-control bg-soft px-2 py-1 text-[11px] muted">
                              {a.platform}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="text-xs muted">
                        <time
                          dateTime={a.completedAt}
                          title={longDate(a.completedAt)}
                          className="block"
                        >
                          {shortDate(a.completedAt)}
                        </time>
                        <span className="block text-[10px]">
                          {attemptTime(a.completedAt)}
                        </span>
                      </td>
                      <td className="min-w-32">
                        <span className="font-medium text-[13px]">
                          {n(t.score)}
                          <span className="muted font-normal text-xs">
                            {" "}
                            / {t.maxScore}
                          </span>
                        </span>
                        <span className="mt-1 block h-1 w-24 overflow-hidden rounded-pill bg-soft">
                          <span
                            className={cn(
                              "block h-full rounded-pill",
                              scoreBarTone(pct),
                            )}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </span>
                      </td>
                      <td className="text-xs">
                        <span
                          className={cn(
                            "rounded-control px-2 py-1",
                            accuracyTone(t.accuracy),
                          )}
                        >
                          {n(t.accuracy)}
                          {t.accuracy != null ? "%" : ""}
                        </span>
                      </td>
                      <td className="text-xs muted">
                        {n(a.percentile)}
                        {a.percentile != null ? "%" : ""}
                      </td>
                      <td className="text-xs muted">{formatTime(t.timeSeconds)}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            className="inline-flex size-8 tap-target items-center justify-center rounded-control border border-rule-soft text-muted transition-colors hover:border-accent/50 hover:text-accent"
                            aria-label={`View ${a.name}`}
                            onClick={() => onOpen(a)}
                          >
                            <PlainIcon name="search" size={14} />
                          </button>
                          <button
                            className="inline-flex size-8 tap-target items-center justify-center rounded-control border border-rule-soft text-muted transition-colors hover:border-accent/50 hover:text-accent"
                            aria-label={`Open details for ${a.name}`}
                            onClick={() => onOpen(a)}
                          >
                            <PlainIcon name="arrowRight" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 px-5 text-center">
              <DuotoneTile name="history" tile="accent" className="mx-auto mb-4" />
              <h3 className="font-serif text-[22px] leading-tight">
                Your next chapter starts with one mock.
              </h3>
              <p className="text-xs muted mt-2 mb-5">
                {totalCount
                  ? "No results match these filters. Try another view."
                  : "Add your first result to start building your track record."}
              </p>
              <Button size="sm" onClick={onAdd}>
                <PlainIcon name="plus" size={15} /> Log your first mock
              </Button>
            </div>
          )}
        </div>
        {mode === "history" && sorted.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule-soft px-4 py-3">
            <p className="text-xs muted">
              Showing{" "}
              {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}{" "}
              mocks
            </p>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={safePage === 1}
                  onClick={() => setPage(safePage - 1)}
                  className="inline-flex size-8 tap-target items-center justify-center rounded-control border border-rule-soft text-muted transition-colors hover:text-ink disabled:opacity-40"
                >
                  <PlainIcon name="arrowLeft" size={13} />
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === pageCount ||
                      Math.abs(p - safePage) <= 1,
                  )
                  .map((p, index, list) => (
                    <span key={p} className="flex items-center gap-1">
                      {index > 0 && list[index - 1]! < p - 1 && (
                        <span className="px-0.5 text-xs muted">…</span>
                      )}
                      <button
                        type="button"
                        aria-current={p === safePage ? "page" : undefined}
                        onClick={() => setPage(p)}
                        className={cn(
                          "inline-flex size-8 tap-target items-center justify-center rounded-control text-xs font-medium tabular transition-colors",
                          p === safePage
                            ? "bg-accent text-paper"
                            : "border border-rule-soft text-muted hover:text-ink",
                        )}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={safePage === pageCount}
                  onClick={() => setPage(safePage + 1)}
                  className="inline-flex size-8 tap-target items-center justify-center rounded-control border border-rule-soft text-muted transition-colors hover:text-ink disabled:opacity-40"
                >
                  <PlainIcon name="arrowRight" size={13} />
                </button>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
});
