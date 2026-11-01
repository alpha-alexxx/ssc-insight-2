"use client";
import { PlainIcon, type IconName } from "./icon";
import { DateRangeFilter } from "./date-range-filter";
import { useExamScope } from "./exam-context";
import { SUBJECTS, subjectIds, type DashboardScope, type Filters } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * The analytical control row, shared by `/performance` and the record views.
 *
 * Two ways to read "which mocks am I looking at", and they must not be
 * confused:
 *
 *  - `mode="scope"` (`/performance`) — the four segments pick an ANALYTICAL
 *    SCOPE. One saved full mock yields one point, four subject points or two
 *    section points depending on the scope; it is never four mocks. Drives
 *    `setScope`.
 *  - `mode="type"` (`/history`, `/compare`) — the same four labels act as a
 *    RECORD FILTER over the paged list. Drives `changeFilter("type", …)`.
 *
 * One component so the two surfaces cannot drift apart visually; the mode
 * makes the different meaning explicit rather than hiding it behind a
 * `view === "dashboard"` branch.
 */

const SCOPES: { id: DashboardScope; label: string; icon: IconName }[] = [
  { id: "full", label: "Full mocks", icon: "file" },
  { id: "subject", label: "Subject wise", icon: "book" },
  { id: "sectional", label: "Sectional wise", icon: "layers" },
  { id: "all", label: "All mocks", icon: "history" },
];

export function ScopeFilters({
  mode,
  scope,
  setScope,
  filters,
  setFilters,
  changeFilter,
  platforms,
  onReset,
}: {
  mode: "scope" | "type";
  scope: DashboardScope;
  setScope: (scope: DashboardScope) => void;
  filters: Filters;
  /** Function-form-only filter writer; resets the paged lists' pages. */
  setFilters: (updater: (prev: Filters) => Filters) => void;
  changeFilter: (key: keyof Filters, value: string) => void;
  platforms: string[];
  /** Clears the non-scope filters; only rendered when something is active. */
  onReset?: () => void;
}) {
  const examScope = useExamScope();
  const activeExam = examScope.exams
    ? examScope.exams.builtIn.find(
        (exam) => exam.id === examScope.activeExamId,
      )
    : null;
  const tiers = activeExam?.tiers ?? [];
  const filterActive = !!(
    (filters.platform && filters.platform !== "all") ||
    (filters.from ?? "") ||
    (filters.to ?? "") ||
    (mode === "type" && filters.subject && filters.subject !== "all") ||
    (mode === "type" && filters.tier && filters.tier !== "all")
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
        {/* The four scope options share one row from sm up; on phones they
            become a 2×2 pill grid (.scope-tabs) so every option stays visible
            with no scrolling and no ragged wrap point. */}
        <div
          role="group"
          aria-label={
            mode === "scope" ? "Analytical scope" : "Filter by mock type"
          }
          className="segment-group scope-tabs w-full sm:w-auto"
        >
          {SCOPES.map((option) => {
            const active =
              mode === "scope"
                ? scope === option.id
                : (filters.type ?? "all") === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                className="segment"
                onClick={() =>
                  mode === "scope"
                    ? setScope(option.id)
                    : changeFilter("type", option.id)
                }
              >
                <PlainIcon
                  name={option.icon}
                  size={14}
                  className={active ? "" : "text-muted"}
                />
                {option.label}
              </button>
            );
          })}
        </div>
        {/* Filters close the control group: one full-width row per filter on
            phones. A 2-up grid was the earlier choice, but a 16px field font
            plus the chevron padding no longer fits "All platforms" in half of
            a 375px panel — stacking keeps the label readable and the target
            full width. Right-aligned inline from sm up. */}
        <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:ml-auto sm:flex sm:w-auto sm:justify-end">
          <select
            aria-label="Filter by platform"
            className="w-full min-w-0 truncate rounded-control py-[9px] pl-3 pr-7 text-xs sm:w-auto sm:max-w-[11.5rem]"
            value={filters.platform ?? "all"}
            onChange={(e) => changeFilter("platform", e.target.value)}
          >
            <option value="all">All platforms</option>
            {platforms.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          {mode === "type" && (
            <select
              aria-label="Filter by subject"
              className="w-full min-w-0 truncate rounded-control py-[9px] pl-3 pr-7 text-xs sm:w-auto sm:max-w-[11.5rem]"
              value={filters.subject ?? "all"}
              onChange={(e) => changeFilter("subject", e.target.value)}
            >
              <option value="all">All subjects</option>
              {subjectIds.map((id) => (
                <option key={id} value={id}>
                  {SUBJECTS[id].short}
                </option>
              ))}
            </select>
          )}
          {tiers.length > 1 && mode === "type" && (
            <select
              aria-label="Filter by tier"
              className="w-full min-w-0 truncate rounded-control py-[9px] pl-3 pr-7 text-xs sm:w-auto sm:max-w-[11.5rem]"
              value={filters.tier ?? "all"}
              onChange={(e) => changeFilter("tier", e.target.value)}
            >
              <option value="all">All tiers</option>
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.label}
                </option>
              ))}
            </select>
          )}
          <div
            className={cn(
              "min-w-0 [&>button]:w-full sm:[&>button]:w-auto",
              mode === "type" && "max-sm:col-span-2",
            )}
          >
            <DateRangeFilter
              from={filters.from ?? ""}
              to={filters.to ?? ""}
              onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
            />
          </div>
        </div>
      </div>
      {/* Active filters stay visible and reversible: a figure the user cannot
          explain is worse than no figure. */}
      {filterActive && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-muted">
          <span>Filtered</span>
          {[
            filters.platform && filters.platform !== "all"
              ? filters.platform
              : null,
            filters.from ? `from ${filters.from}` : null,
            filters.to ? `to ${filters.to}` : null,
            mode === "type" && filters.subject && filters.subject !== "all"
              ? SUBJECTS[filters.subject as keyof typeof SUBJECTS]?.short ?? null
              : null,
            mode === "type" && filters.tier && filters.tier !== "all"
              ? filters.tier
              : null,
          ]
            .filter(Boolean)
            .map((label) => (
              <span
                key={String(label)}
                className="rounded-control border border-rule-soft bg-soft px-2 py-0.5 text-ink"
              >
                {label}
              </span>
            ))}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="font-medium text-accent underline decoration-accent/40 underline-offset-[3px] transition-colors hover:decoration-accent motion-reduce:transition-none"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
