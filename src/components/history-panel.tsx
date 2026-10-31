"use client";
import { memo } from "react";
import { PlainIcon, DuotoneTile } from "./icon";
import { Button } from "./ui/button";
import { Panel } from "./dashboard-panels";
import { AttemptPagination } from "./attempt-pagination";
import {
  totals,
  formatNumber as n,
  formatTime,
  type Attempt,
  type PagedAttempts,
  type PageSize,
  type SortKey,
} from "@/lib/domain";
import { longDate, mockTypeLabel, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Mock history panel: server-paged table of the filtered attempts with the
 * KPI strip (whole-filtered-set aggregates from the paged endpoint), server
 * sort keys, score bars, and the shared AttemptPagination footer. Sorting
 * and paging happen in the API; the panel renders one page at a time and
 * keeps the previous page visible (dimmed) while the next one loads.
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
  data,
  isFetching,
  sort,
  onSort,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
  search,
  onSearch,
  onOpen,
  onAdd,
}: {
  /** The current server-paged page; undefined only on the first load. */
  data: PagedAttempts | undefined;
  isFetching: boolean;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: PageSize) => void;
  search: string;
  onSearch: (value: string) => void;
  onOpen: (attempt: Attempt) => void;
  onAdd: () => void;
}) {
  const items = data?.items ?? [];
  const firstLoad = data === undefined;
  const stats = data?.stats;

  return (
    <div className="min-w-0">
      {stats && (
        <div className="strip-frame mb-4">
          <div className="metric-strip">
          <KpiCard
            icon="history"
            tile="bg-accent-soft text-accent"
            label="Total mocks"
            value={n(stats.totalMocks)}
            delta={
              stats.newThisMonth
                ? { text: `+${stats.newThisMonth} this month`, good: true }
                : null
            }
          />
          <KpiCard
            icon="target"
            tile="bg-positive-soft text-positive"
            label="Average score"
            value={stats.avgScore != null ? n(Math.round(stats.avgScore)) : "—"}
            suffix={stats.avgScore != null ? "/ 390" : undefined}
            delta={
              stats.avgScorePct != null
                ? { text: `${n(stats.avgScorePct)}%`, good: true }
                : null
            }
          />
          <KpiCard
            icon="success"
            tile="bg-accent-soft text-accent"
            label="Average accuracy"
            value={stats.avgAccuracy != null ? `${n(stats.avgAccuracy)}%` : "—"}
            delta={
              stats.accuracyDelta != null
                ? {
                    text: `${stats.accuracyDelta > 0 ? "+" : ""}${n(stats.accuracyDelta)}%`,
                    good: stats.accuracyDelta >= 0,
                  }
                : null
            }
          />
          <KpiCard
            icon="clock"
            tile="bg-warning-soft text-warning"
            label="Average time"
            value={stats.avgTime != null ? formatTime(stats.avgTime) : "—"}
            delta={
              stats.timeDelta != null
                ? {
                    text: `${stats.timeDelta > 0 ? "+" : ""}${Math.round(stats.timeDelta * 100)}%`,
                    good: stats.timeDelta <= 0,
                  }
                : null
            }
          />
          </div>
        </div>
      )}
      <Panel
        icon="history"
        title="Mock history"
        description={`${data?.total ?? 0} result${(data?.total ?? 0) === 1 ? "" : "s"} · sorted by ${sort.key === "date" ? "attempt date" : sort.key}`}
        action={
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
        }
      >
        <div
          className={cn(
            "table-scroll transition-opacity",
            isFetching && !firstLoad && "opacity-60",
          )}
        >
          {firstLoad ? (
            <div className="space-y-2 p-4" role="status" aria-label="Loading results">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-control bg-soft"
                  style={{ opacity: 1 - i * 0.12 }}
                />
              ))}
            </div>
          ) : items.length ? (
            <table className="w-full whitespace-nowrap tabular">
              <thead>
                <tr>
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
                  <th>
                    <span className="sr-only">View result</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => {
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
                {data?.total
                  ? "No results match these filters. Try another view."
                  : "Add your first result to start building your track record."}
              </p>
              <Button size="sm" onClick={onAdd}>
                <PlainIcon name="plus" size={15} /> Log your first mock
              </Button>
            </div>
          )}
        </div>
        {data && data.total > 0 && (
          <AttemptPagination
            page={page}
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
