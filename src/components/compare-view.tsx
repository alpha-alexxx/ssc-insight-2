"use client";
import { memo, useMemo } from "react";
import { PlainIcon, DuotoneIcon } from "./icon";
import { Button } from "./ui/button";
import { EmptyChart, Panel } from "./dashboard-panels";
import {
  SUBJECTS,
  subjectIds,
  subjectStats,
  totals,
  formatNumber as n,
  formatTime,
  type Attempt,
} from "@/lib/domain";
import { longDate, mockTypeLabel, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Compare view — picker, selection bar, and side-by-side ledger.
 * The picker rows carry type/platform chips, score bars, and a View action;
 * the ledger pairs KPI cards with an overall comparison table (with a
 * difference column for two-mock comparisons) and a subject-wise table.
 */

const dateLabel = shortDate;
const typeName = mockTypeLabel;

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

function Diff({ value, unit = "pp" }: { value: number; unit?: string }) {
  const good = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular",
        good ? "text-positive" : "text-danger",
      )}
    >
      {good ? "↑" : "↓"} {value > 0 ? "+" : ""}
      {n(value)} {unit}
    </span>
  );
}

/** Memoized: the shell re-renders per chat token/keystroke; the ledger doesn't. */
export const CompareView = memo(function CompareView({
  attempts,
  compared,
  selected,
  onToggle,
  onClear,
  onOpen,
}: {
  attempts: Attempt[];
  compared: Attempt[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  /** Opens the attempt detail dialog from a picker row. */
  onOpen?: (attempt: Attempt) => void;
}) {
  // One totals() reduction per compared attempt, not ~10 per metric row.
  const totalsByAttempt = useMemo(
    () => new Map(compared.map((a) => [a.id, totals(a)])),
    [compared],
  );
  const t = (a: Attempt) => totalsByAttempt.get(a.id) ?? totals(a);
  const twoWay = compared.length === 2;
  const overallRows: {
    label: string;
    get: (a: Attempt) => string;
    diff?: () => number | null;
    diffUnit?: string;
  }[] = [
    { label: "Score", get: (a) => `${n(t(a).score)} / ${t(a).maxScore}` },
    {
      label: "Score percentage",
      get: (a) => `${n(t(a).percentage)}%`,
      diff: () =>
        twoWay ? t(compared[1]!).percentage - t(compared[0]!).percentage : null,
    },
    {
      label: "Accuracy",
      get: (a) => (t(a).accuracy == null ? "—" : `${n(t(a).accuracy)}%`),
      diff: () => {
        if (!twoWay) return null;
        const a = t(compared[0]!).accuracy;
        const b = t(compared[1]!).accuracy;
        return a == null || b == null ? null : b - a;
      },
    },
    {
      label: "Attempted",
      get: (a) => `${n(t(a).attempted)} / ${n(t(a).questions)}`,
    },
    {
      label: "Time taken",
      get: (a) => formatTime(t(a).timeSeconds),
    },
    {
      label: "Time per question",
      get: (a) =>
        t(a).attempted && t(a).timeSeconds != null
          ? `${n(t(a).timeSeconds! / 60 / t(a).attempted)} min`
          : "—",
      diff: () => {
        if (!twoWay) return null;
        const a = t(compared[0]!);
        const b = t(compared[1]!);
        if (
          a.timeSeconds == null ||
          b.timeSeconds == null ||
          !a.attempted ||
          !b.attempted
        )
          return null;
        return b.timeSeconds! / 60 / b.attempted - a.timeSeconds! / 60 / a.attempted;
      },
      diffUnit: "min",
    },
    {
      label: "Score change vs first",
      get: (a) =>
        t(a).maxScore === t(compared[0]!).maxScore
          ? `${n(t(a).score - t(compared[0]!).score)} marks`
          : "Different maximum · compare %",
    },
    {
      label: "Accuracy change vs first",
      get: (a) =>
        t(a).accuracy == null || t(compared[0]!).accuracy == null
          ? "—"
          : `${n(t(a).accuracy! - t(compared[0]!).accuracy!)} pp`,
    },
  ];
  const kpiCards = [
    {
      icon: "award" as const,
      tile: "bg-accent-soft text-accent",
      label: "Score",
      values: compared.map((a) => `${n(t(a).score)} / ${t(a).maxScore}`),
    },
    {
      icon: "target" as const,
      tile: "bg-warning-soft text-warning",
      label: "Score %",
      values: compared.map((a) => `${n(t(a).percentage)}%`),
    },
    {
      icon: "success" as const,
      tile: "bg-positive-soft text-positive",
      label: "Accuracy",
      values: compared.map((a) =>
        t(a).accuracy == null ? "—" : `${n(t(a).accuracy)}%`,
      ),
    },
    {
      icon: "clock" as const,
      tile: "bg-accent-soft text-accent",
      label: "Time taken",
      values: compared.map((a) => formatTime(t(a).timeSeconds)),
    },
  ];
  return (
    <>
      <Panel
        icon="compare"
        title={`Choose your mocks (${compared.length}/4)`}
        description="Select two to four records below. Filters help you find them."
      >
        <div className="divide-y divide-rule-soft">
          <div className="flex items-start gap-2.5 bg-accent-soft/50 px-6 py-3">
            <PlainIcon
              name="info"
              size={14}
              className="mt-0.5 shrink-0 text-accent"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-ink">
              Select at least two mocks to compare their results.
            </p>
          </div>
          {attempts.length ? (
            attempts.map((a) => {
              const checked = selected.includes(a.id);
              const tt = totals(a);
              const pct = tt.maxScore ? (tt.score / tt.maxScore) * 100 : 0;
              return (
                <label
                  key={a.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 cursor-pointer transition-colors sm:flex-nowrap sm:px-6 ${
                    checked ? "bg-accent-soft/50 hover:bg-accent-soft" : "hover:bg-canvas"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={selected.length >= 4 && !checked}
                    onChange={() => onToggle(a.id)}
                    aria-label={`Select ${a.name}`}
                  />
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-control",
                      typeChip(a.type),
                    )}
                    aria-hidden="true"
                  >
                    <PlainIcon name="file" size={15} />
                  </span>
                  <span className="min-w-0 flex-1 basis-40">
                    <span className="block truncate text-sm font-medium text-ink">
                      {a.name}
                    </span>
                    <span className="block truncate text-[11px] muted">
                      {a.platform} · {dateLabel(a.completedAt)} ·{" "}
                      {typeName(a.type)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "hidden rounded-control px-2 py-1 text-[11px] font-medium sm:inline",
                      typeChip(a.type),
                    )}
                  >
                    {typeName(a.type)}
                  </span>
                  <span className="hidden rounded-control bg-soft px-2 py-1 text-[11px] muted sm:inline">
                    {a.platform}
                  </span>
                  <span className="hidden text-xs muted sm:block">
                    <time
                      dateTime={a.completedAt}
                      title={longDate(a.completedAt)}
                      className="block"
                    >
                      {dateLabel(a.completedAt)}
                    </time>
                    <span className="block text-[10px]">
                      {new Date(a.completedAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      })}
                    </span>
                  </span>
                  <span className="w-28 shrink-0">
                    <span className="block text-[13px] font-medium tabular text-ink">
                      {n(tt.score)}
                      <span className="muted font-normal text-xs">
                        {" "}
                        / {tt.maxScore}
                      </span>
                    </span>
                    <span className="mt-1 block h-1 w-full overflow-hidden rounded-pill bg-soft">
                      <span
                        className={cn(
                          "block h-full rounded-pill",
                          scoreBarTone(pct),
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </span>
                  </span>
                  <span
                    className={cn(
                      "hidden rounded-control px-2 py-1 text-[11px] md:inline",
                      tt.accuracy == null
                        ? "bg-soft text-muted"
                        : tt.accuracy >= 70
                          ? "bg-positive-soft text-positive"
                          : tt.accuracy >= 50
                            ? "bg-soft text-muted"
                            : "bg-warning-soft text-warning",
                    )}
                  >
                    {tt.accuracy == null ? "—" : `${n(tt.accuracy)}%`}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {onOpen && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          onOpen(a);
                        }}
                      >
                        <PlainIcon name="search" size={12} /> View
                      </Button>
                    )}
                  </span>
                </label>
              );
            })
          ) : (
            <EmptyChart>No mocks match these filters.</EmptyChart>
          )}
        </div>
      </Panel>

      {selected.length > 0 && (
        <div className="panel mt-4 flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent"
              aria-hidden="true"
            >
              <DuotoneIcon name="compare" size={17} tone="accent" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {compared.length} mock{compared.length === 1 ? "" : "s"} selected
              </p>
              <p className="text-[11px] text-muted">
                You can select up to 4 mocks to compare.
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {compared.map((a) => (
              <span
                key={a.id}
                className="inline-flex max-w-64 items-center gap-2 rounded-control border border-rule-soft bg-canvas px-2.5 py-1.5 text-xs"
              >
                <span className="truncate font-medium text-ink">{a.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${a.name} from comparison`}
                  onClick={() => onToggle(a.id)}
                  className="tap-target text-muted transition-colors hover:text-danger"
                >
                  <PlainIcon name="close" size={12} />
                </button>
              </span>
            ))}
            {compared.length < 4 && (
              <span className="inline-flex items-center gap-1.5 rounded-control border border-dashed border-rule px-3 py-1.5 text-xs text-muted">
                <PlainIcon name="plus" size={12} /> Add another mock
              </span>
            )}
          </div>
          <div className="action-row shrink-0 gap-2 sm:w-auto">
            <Button
              size="sm"
              disabled={compared.length < 2}
              onClick={() =>
                document
                  .getElementById("compare-ledger")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              Compare mocks <PlainIcon name="arrowRight" size={13} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear all
            </Button>
          </div>
        </div>
      )}

      {compared.length >= 2 ? (
        <div id="compare-ledger" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {kpiCards.map((card) => (
              <div
                key={card.label}
                className="rounded-panel border border-rule-soft bg-paper p-4"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-control",
                      card.tile,
                    )}
                    aria-hidden="true"
                  >
                    <PlainIcon name={card.icon} size={16} />
                  </span>
                  <p className="text-xs text-muted">{card.label}</p>
                </div>
                <div className="mt-2.5 space-y-1">
                  {card.values.slice(0, 2).map((value, index) => (
                    <p
                      key={index}
                      className="flex items-baseline justify-between gap-2 font-serif text-lg leading-none tabular text-ink"
                    >
                      {value}
                      <span className="text-[10px] font-normal text-muted">
                        {compared[index]!.platform}
                      </span>
                    </p>
                  ))}
                  {card.values.length > 2 && (
                    <p className="text-[10px] text-muted">
                      +{card.values.length - 2} more mock
                      {card.values.length - 2 === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="panel overflow-auto">
            <h2 className="px-5 pb-3 pt-4 font-serif text-lg font-medium">
              Overall comparison
            </h2>
            <table className="w-full tabular">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium muted">Metric</th>
                  {compared.map((a) => (
                    <th key={a.id} className="min-w-44 text-left">
                      <span className="block text-xs font-semibold text-ink">
                        {a.name}
                      </span>
                      <span className="text-[10px] font-normal muted">
                        {typeName(a.type)} · {dateLabel(a.completedAt)}
                      </span>
                    </th>
                  ))}
                  {twoWay && (
                    <th className="text-left text-xs font-medium muted">
                      Difference
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {overallRows.map((row) => (
                  <tr key={row.label}>
                    <td className="text-xs muted">{row.label}</td>
                    {compared.map((a) => (
                      <td key={a.id} className="text-[13px]">
                        {row.get(a)}
                      </td>
                    ))}
                    {twoWay && (
                      <td>
                        {row.diff == null
                          ? "—"
                          : (() => {
                              const value = row.diff();
                              return value == null ? (
                                "—"
                              ) : (
                                <Diff
                                  value={Math.round(value * 10) / 10}
                                  unit={row.diffUnit}
                                />
                              );
                            })()}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel overflow-auto">
            <h2 className="px-5 pb-3 pt-4 font-serif text-lg font-medium">
              Subject-wise comparison
            </h2>
            <table className="w-full tabular">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium muted">Subject</th>
                  {compared.map((a) => (
                    <th key={a.id} className="min-w-48 text-left">
                      <span className="block text-xs font-semibold text-ink">
                        {a.name}
                      </span>
                      <span className="text-[10px] font-normal muted">
                        Score (Acc.) · {dateLabel(a.completedAt)}
                      </span>
                    </th>
                  ))}
                  <th className="text-left text-xs font-medium muted">
                    Score diff
                  </th>
                </tr>
              </thead>
              <tbody>
                {subjectIds.map((id) => (
                  <tr key={id}>
                    <td className="text-xs font-medium">
                      {SUBJECTS[id].short}
                    </td>
                    {compared.map((a) => {
                      const s = a.subjects.find((s) => s.subjectId === id);
                      const stats = s ? subjectStats(s) : null;
                      const pct =
                        stats && stats.maxScore
                          ? (stats.score / stats.maxScore) * 100
                          : 0;
                      return (
                        <td key={a.id} className="min-w-44">
                          {stats ? (
                            <>
                              <p className="text-[13px]">
                                <span className="font-medium">
                                  {n(stats.score)} / {n(stats.maxScore)}
                                </span>{" "}
                                <span className="text-xs muted">
                                  ({n(stats.percentage)}%)
                                </span>
                              </p>
                              <p className="mt-1 block h-1 w-28 overflow-hidden rounded-pill bg-soft">
                                <span
                                  className={cn(
                                    "block h-full rounded-pill",
                                    scoreBarTone(pct),
                                  )}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </p>
                              <p className="mt-1 text-[10px] muted">
                                {n(stats.attempted)} attempted ·{" "}
                                {n(stats.accuracy)}% accuracy
                              </p>
                            </>
                          ) : (
                            <span className="text-xs muted">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      {(() => {
                        const statsList = compared.map(
                          (a) =>
                            a.subjects.find((s) => s.subjectId === id) ?? null,
                        );
                        const first = statsList[0]
                          ? subjectStats(statsList[0])
                          : null;
                        const second = statsList[1]
                          ? subjectStats(statsList[1])
                          : null;
                        if (
                          !twoWay ||
                          !first ||
                          !second ||
                          first.maxScore !== second.maxScore
                        )
                          return <span className="text-xs muted">—</span>;
                        return (
                          <Diff
                            value={second.score - first.score}
                            unit="marks"
                          />
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <EmptyChart>
            Select at least two mocks to compare their results.
          </EmptyChart>
        </div>
      )}
    </>
  );
});
