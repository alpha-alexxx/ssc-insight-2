"use client";
import { PlainIcon, DuotoneTile } from "./icon";
import { Button } from "./ui/button";
import { Panel } from "./dashboard-panels";
import { totals, formatNumber as n, formatTime, type Attempt } from "@/lib/domain";

/**
 * Mock history / recent mocks panel (Phase 6 + 11).
 * Improvements over the extracted original: search field with a clear
 * affordance and visible shortcut hint, row action alignment, and a
 * duotone-tile empty state consistent with the rest of the app.
 */

const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
const typeName = (type: string) =>
  type === "full" ? "Full mock" : type === "sectional" ? "Sectional" : "Subject";
/**
 * Accuracy reads best when the tone carries meaning, not decoration:
 * ≥70% positive, 50–70% neutral, below 50% warning. The value itself is
 * always printed, so state never rides on color alone (Phase 7).
 */
function accuracyTone(accuracy: number | null) {
  if (accuracy == null) return "bg-soft text-muted";
  if (accuracy >= 70) return "bg-positive-soft text-positive";
  if (accuracy >= 50) return "bg-soft text-muted";
  return "bg-warning-soft text-warning";
}

export function HistoryPanel({
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
  const visible =
    mode === "dashboard" ? attempts.slice(0, 5) : attempts;
  return (
    <Panel
      icon="history"
      title={mode === "dashboard" ? "Recent mocks" : "Mock history"}
      description={
        mode === "dashboard"
          ? `${sourceCount} saved attempt${sourceCount === 1 ? "" : "s"} contribute to this view.`
          : `${totalCount} result${totalCount === 1 ? "" : "s"} in this view`
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
          <div className="relative">
            <PlainIcon
              name="search"
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 muted pointer-events-none"
            />
            <input
              aria-label="Search mocks"
              placeholder="Search mocks…  /"
              className="pl-8 py-2 text-xs w-44 sm:w-56"
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
                className="absolute right-2 top-1/2 -translate-y-1/2 muted hover:text-ink"
              >
                <PlainIcon name="close" size={13} />
              </button>
            )}
          </div>
        )
      }
    >
      <div className="table-scroll">
        {visible.length ? (
          <table className="w-full whitespace-nowrap tabular">
            <thead>
              <tr>
                <th className="sticky-col">Mock name</th>
                <th>Date</th>
                <th>Score</th>
                <th>Accuracy</th>
                <th>Percentile</th>
                <th>Time taken</th>
                <th>
                  <span className="sr-only">View result</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => {
                const t = totals(a);
                return (
                  <tr key={a.id}>
                    <td className="sticky-col">
                      <button
                        onClick={() => onOpen(a)}
                        className="text-left"
                        title={`Open ${a.name}`}
                      >
                        <span className="text-[13px] font-medium hover:text-accent transition-colors">
                          {a.name}
                        </span>
                        <span className="block text-[11px] muted mt-1">
                          {a.platform} <span className="mx-1">·</span>{" "}
                          {typeName(a.type)}
                        </span>
                      </button>
                    </td>
                    <td className="text-xs muted">{dateLabel(a.completedAt)}</td>
                    <td className="font-medium text-[13px]">
                      {n(t.score)}
                      <span className="muted font-normal text-xs">
                        {" "}
                        / {t.maxScore}
                      </span>
                    </td>
                    <td className="text-xs">
                      <span
                        className={`rounded-control px-2 py-1 ${accuracyTone(t.accuracy)}`}
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
                      <button
                        className="text-muted hover:text-accent transition-colors"
                        aria-label={`View ${a.name}`}
                        onClick={() => onOpen(a)}
                      >
                        <PlainIcon name="arrowUpRight" size={16} />
                      </button>
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
    </Panel>
  );
}
