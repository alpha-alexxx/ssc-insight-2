"use client";
import { memo } from "react";
import { PlainIcon, DuotoneTile } from "./icon";
import { Button } from "./ui/button";
import { Panel } from "./dashboard-panels";
import { Skeleton } from "./ui/skeleton";
import { AttemptPagination } from "./attempt-pagination";
import { AttemptRecordCard } from "./attempt-outcome-card";
import {
  accuracyTone,
  scoreBarTone,
  typeChip,
} from "./attempt-display";
import { MetricCell } from "./metric-strip";
import {
  totals,
  formatNumber as n,
  formatTime,
  type Attempt,
  type AttemptStats,
  type PagedAttempts,
  type PageSize,
  type SortKey,
} from "@/lib/domain";
import { istTimeLabel, longDate, mockTypeLabel, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Mock history — a server-paged record list you can actually search.
 *
 * Two defects in the previous version are fixed structurally rather than
 * cosmetically:
 *
 *  1. The empty state keyed off the FILTERED total, so it was unreachable:
 *     a user with 200 mocks and a narrow filter was told to log their first
 *     one. It now distinguishes "nothing saved yet" (the returned
 *     `totalMocks` across the account) from "nothing matches these filters".
 *  2. The KPI "delta" slot rendered an absolute average under a green
 *     up-arrow. Each metric now carries its own honest reference.
 *
 * Below `lg` the table becomes the same `AttemptRecordCard` the dashboard
 * uses, instead of a nine-column horizontal scroll on a phone.
 */

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
        "inline-flex items-center gap-1 text-[0.6875rem] font-medium transition-colors hover:text-ink",
        active ? "text-ink" : "text-muted",
      )}
      aria-label={`Sort by ${label}${active ? (sort.dir === "asc" ? ", ascending" : ", descending") : ""}`}
    >
      {label}
      <span aria-hidden="true" className="text-[0.625rem] leading-none">
        {active ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </button>
  );
}

/** Memoized: the shell re-renders per chat token/keystroke; rows don't need to. */
export const HistoryPanel = memo(function HistoryPanel({
  data,
  isFetching,
  error,
  onRetry,
  sort,
  onSort,
  onPageChange,
  onPageSizeChange,
  search,
  onSearch,
  onOpen,
  onAdd,
  onCompare,
  accountTotal,
}: {
  /** The current server-paged page; undefined during first load. */
  data: PagedAttempts | undefined;
  isFetching: boolean;
  /** Present only when the list failed to load. */
  error?: Error | null;
  onRetry?: () => void;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  search: string;
  onSearch: (value: string) => void;
  onOpen: (attempt: Attempt) => void;
  onAdd: () => void;
  /** Adds one result to the compare selection. */
  onCompare: (attempt: Attempt) => void;
  /** Every saved result in the account, ignoring filters. Distinguishes
   * "nothing saved" from "nothing matches". */
  accountTotal: number;
}) {
  const items = data?.items ?? [];
  const firstLoad = data === undefined && !error;
  const stats = data?.stats;

  return (
    <div className="min-w-0">
      {stats && <HistoryStats stats={stats} />}

      <Panel
        icon="history"
        title="Mock history"
        description={
          error
            ? "Could not load your results."
            : `${n(data?.total ?? 0)} result${(data?.total ?? 0) === 1 ? "" : "s"} · sorted by ${sortLabel(sort.key)}`
        }
        action={
          <div className="relative">
            <PlainIcon
              name="search"
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
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
                className="tap-target absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <PlainIcon name="close" size={13} />
              </button>
            )}
          </div>
        }
      >
        {search.length === 1 && (
          <p className="border-b border-rule-soft px-4 py-2 text-[0.6875rem] text-muted">
            Keep typing — search starts at two characters.
          </p>
        )}

        {error ? (
          <div className="px-5 py-10 text-center" role="alert">
            <p className="font-serif text-[1.125rem]">
              Your results could not be loaded.
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted">
              {error.message || "Check your connection, then try again."}
            </p>
            {onRetry && (
              <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
                <PlainIcon name="refresh" size={13} /> Try again
              </Button>
            )}
          </div>
        ) : firstLoad ? (
          <div className="space-y-2 p-4" role="status" aria-label="Loading results">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length ? (
          <div
            className={cn(
              "transition-opacity",
              isFetching && !firstLoad && "opacity-60",
            )}
          >
            {/* Phones: the record card, not a nine-column scroll. */}
            <ul className="divide-y divide-rule-soft px-3 lg:hidden">
              {items.map((a) => (
                <li key={a.id} className="py-2.5">
                  <AttemptRecordCard attempt={a} onOpen={onOpen} />
                  <div className="mt-1.5 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCompare(a)}
                      aria-label={`Add ${a.name} to the comparison`}
                    >
                      <PlainIcon name="compare" size={13} /> Compare
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: the full table. */}
            <div className="table-scroll hidden lg:block">
              <table className="w-full whitespace-nowrap tabular">
                <caption className="sr-only">
                  Saved mock results, sortable by column
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="sticky-col">
                      <SortHeader label="Mock" sortKey="name" sort={sort} onSort={onSort} />
                    </th>
                    <th scope="col">
                      <SortHeader label="Type" sortKey="type" sort={sort} onSort={onSort} />
                    </th>
                    <th scope="col">
                      <SortHeader label="Platform" sortKey="platform" sort={sort} onSort={onSort} />
                    </th>
                    <th scope="col">
                      <SortHeader label="Attempt date" sortKey="date" sort={sort} onSort={onSort} />
                    </th>
                    <th scope="col">
                      <SortHeader label="Score" sortKey="score" sort={sort} onSort={onSort} />
                    </th>
                    <th scope="col">
                      <SortHeader label="Accuracy" sortKey="accuracy" sort={sort} onSort={onSort} />
                    </th>
                    <th scope="col">
                      <SortHeader label="Percentile" sortKey="percentile" sort={sort} onSort={onSort} />
                    </th>
                    <th scope="col">
                      <SortHeader label="Time" sortKey="time" sort={sort} onSort={onSort} />
                    </th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => {
                    const t = totals(a);
                    const pct = t.maxScore ? (t.score / t.maxScore) * 100 : 0;
                    return (
                      <tr key={a.id}>
                        <th scope="row" className="sticky-col text-left">
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
                              <span className="block max-w-56 truncate text-[0.8125rem] font-medium">
                                {a.name}
                              </span>
                              <span className="mt-0.5 block text-[0.6875rem] text-muted">
                                {mockTypeLabel(a.type)}
                              </span>
                            </span>
                          </button>
                        </th>
                        <td>
                          <span
                            className={cn(
                              "rounded-control px-2 py-1 text-[0.6875rem] font-medium",
                              typeChip(a.type),
                            )}
                          >
                            {mockTypeLabel(a.type)}
                          </span>
                        </td>
                        <td>
                          <span className="rounded-control bg-soft px-2 py-1 text-[0.6875rem] text-muted">
                            {a.platform}
                          </span>
                        </td>
                        <td className="text-xs text-muted">
                          <time
                            dateTime={a.completedAt}
                            title={longDate(a.completedAt)}
                            className="block"
                          >
                            {shortDate(a.completedAt)}
                          </time>
                          <span className="block text-[0.625rem]">
                            {istTimeLabel(a.completedAt)}
                          </span>
                        </td>
                        <td className="min-w-32">
                          <span className="text-[0.8125rem] font-medium">
                            {n(t.score)}
                            <span className="text-xs font-normal text-muted">
                              {" "}/ {t.maxScore}
                            </span>
                          </span>
                          <span className="mt-1 block h-[2px] w-24 bg-soft">
                            <span
                              className={cn("block h-full", scoreBarTone(pct))}
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
                            {t.accuracy == null ? "—" : `${n(t.accuracy)}%`}
                          </span>
                        </td>
                        <td className="text-xs text-muted">
                          {a.percentile == null ? "—" : `${n(a.percentile)}%`}
                        </td>
                        <td className="text-xs text-muted">
                          {formatTime(t.timeSeconds)}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              className="inline-flex size-8 tap-target items-center justify-center rounded-control border border-rule-soft text-muted transition-colors hover:border-accent/50 hover:text-accent"
                              aria-label={`Add ${a.name} to the comparison`}
                              onClick={() => onCompare(a)}
                            >
                              <PlainIcon name="compare" size={14} />
                            </button>
                            <button
                              className="inline-flex size-8 tap-target items-center justify-center rounded-control border border-rule-soft text-muted transition-colors hover:border-accent/50 hover:text-accent"
                              aria-label={`Open ${a.name}`}
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
            </div>
          </div>
        ) : accountTotal > 0 ? (
          // Filtered empty — the branch the old version could never reach.
          <div className="px-5 py-10 text-center">
            <DuotoneTile name="search" tile="ink" className="mx-auto mb-3" />
            <h3 className="font-serif text-[1.125rem] leading-snug">
              No results match these filters.
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted">
              You have {n(accountTotal)} saved result
              {accountTotal === 1 ? "" : "s"}. Widen the platform, subject or
              date range — or clear the search — to see them.
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
              <PlainIcon name="refresh" size={13} /> Reset filters
            </Button>
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <DuotoneTile name="history" tile="accent" className="mx-auto mb-3" />
            <h3 className="font-serif text-[1.25rem] leading-tight">
              Your next chapter starts with one mock.
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted">
              Add your first result to start building your track record.
            </p>
            <Button size="sm" className="mt-4" onClick={onAdd}>
              <PlainIcon name="plus" size={15} /> Log your first mock
            </Button>
          </div>
        )}

        {data && data.total > 0 && (
          <AttemptPagination
            page={data.page}
            pageCount={data.pageCount}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        )}
      </Panel>
    </div>
  );
});

function sortLabel(key: SortKey): string {
  const labels: Record<SortKey, string> = {
    name: "mock name",
    type: "type",
    platform: "platform",
    date: "attempt date",
    score: "score",
    accuracy: "accuracy",
    percentile: "percentile",
    time: "time taken",
  };
  return labels[key];
}

/**
 * The four KPI cells. Each states what it is: an absolute average is shown as
 * an average, and a change is shown as a change. The old strip put an average
 * percentage in a slot that always drew a green up-arrow.
 */
function HistoryStats({ stats }: { stats: AttemptStats }) {
  return (
    <div className="strip-frame mb-4">
      <div className="metric-strip">
        <MetricCell
          icon="history"
          label="Total mocks"
          value={n(stats.totalMocks)}
          hint={
            stats.newThisMonth
              ? `${stats.newThisMonth} added this month`
              : "None added this month"
          }
          pct={null}
        />
        <MetricCell
          icon="target"
          label="Average score"
          value={
            stats.avgScore != null
              ? n(Math.round(stats.avgScore * 100) / 100)
              : "—"
          }
          hint={
            stats.avgScoreMax != null
              ? `out of ${stats.avgScoreMax} · ${n(stats.avgScorePct)}%`
              : stats.avgScorePct != null
                ? `${n(stats.avgScorePct)}% average across mixed papers`
                : "No scored results yet"
          }
          pct={
            stats.avgScorePct != null ? stats.avgScorePct / 100 : null
          }
        />
        <MetricCell
          icon="success"
          label="Average accuracy"
          value={stats.avgAccuracy != null ? `${n(stats.avgAccuracy)}%` : "—"}
          hint={
            stats.accuracyDelta != null
              ? `${stats.accuracyDelta >= 0 ? "+" : ""}${n(stats.accuracyDelta)} pp vs earlier`
              : "No earlier window to compare"
          }
          pct={stats.avgAccuracy != null ? stats.avgAccuracy / 100 : null}
        />
        <MetricCell
          icon="clock"
          label="Average time"
          value={stats.avgTime != null ? formatTime(stats.avgTime) : "—"}
          hint={
            stats.timeDelta != null
              ? `${stats.timeDelta > 0 ? "+" : ""}${Math.round(stats.timeDelta * 100)}% vs earlier`
              : "No earlier window to compare"
          }
          pct={null}
        />
      </div>
    </div>
  );
}
