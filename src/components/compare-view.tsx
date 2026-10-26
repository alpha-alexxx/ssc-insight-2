"use client";
import { memo, useMemo } from "react";
import { DuotoneIcon } from "./icon";
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
import { mockTypeLabel, shortDate } from "@/lib/format";

/**
 * Compare view — picker + side-by-side ledger (Phase 6).
 * Extracted from dashboard.tsx; picker rows gained a proper selected state,
 * the table keeps horizontal scroll per the Readable Table Rule.
 */

const dateLabel = shortDate;
const typeName = mockTypeLabel;

/** Memoized: the shell re-renders per chat token/keystroke; the ledger doesn't. */
export const CompareView = memo(function CompareView({
  attempts,
  compared,
  selected,
  onToggle,
  onClear,
}: {
  attempts: Attempt[];
  compared: Attempt[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  // One totals() reduction per compared attempt, not ~10 per metric row.
  const totalsByAttempt = useMemo(
    () => new Map(compared.map((a) => [a.id, totals(a)])),
    [compared],
  );
  const t = (a: Attempt) => totalsByAttempt.get(a.id) ?? totals(a);
  return (
    <>
      <Panel
        icon="compare"
        title={`Choose your mocks (${compared.length}/4)`}
        description="Select two to four records below. Filters help you find them."
        action={
          selected.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear selection
            </Button>
          ) : undefined
        }
      >
        <div className="divide-y divide-rule-soft max-h-72 overflow-auto">
          {attempts.length ? (
            attempts.map((a) => {
              const checked = selected.includes(a.id);
              return (
                <label
                  key={a.id}
                  className={`flex flex-row items-center gap-3 px-6 py-3 cursor-pointer transition-colors ${
                    checked ? "bg-accent-soft/50 hover:bg-accent-soft" : "hover:bg-canvas"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={selected.length >= 4 && !checked}
                    onChange={() => onToggle(a.id)}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-ink truncate">
                      {a.name}
                    </span>
                    <span className="text-[11px] muted">
                      {a.platform} · {dateLabel(a.completedAt)} ·{" "}
                      {typeName(a.type)}
                    </span>
                  </span>
                  <span className="text-ink tabular whitespace-nowrap">
                    {n(totals(a).score)} / {totals(a).maxScore}
                  </span>
                </label>
              );
            })
          ) : (
            <EmptyChart>No mocks match these filters.</EmptyChart>
          )}
        </div>
      </Panel>
      {compared.length >= 2 ? (
        <div className="panel mt-6 overflow-auto">
          <table className="w-full tabular">
            <thead>
              <tr>
                <th>Comparison</th>
                {compared.map((a) => (
                  <th key={a.id} className="min-w-48">
                    <span className="block font-semibold text-ink">
                      {a.name}
                    </span>
                    <span className="text-[10px]">
                      {a.platform} · {dateLabel(a.completedAt)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "Score",
                  get: (a: Attempt) => `${n(t(a).score)} / ${t(a).maxScore}`,
                },
                {
                  label: "Score percentage",
                  get: (a: Attempt) => `${n(t(a).percentage)}%`,
                },
                {
                  label: "Difference vs first",
                  get: (a: Attempt) =>
                    `${n(t(a).percentage - t(compared[0]!).percentage)} pp`,
                },
                {
                  label: "Accuracy",
                  get: (a: Attempt) =>
                    t(a).accuracy == null ? "—" : `${n(t(a).accuracy)}%`,
                },
                {
                  label: "Accuracy change vs first",
                  get: (a: Attempt) =>
                    t(a).accuracy == null || t(compared[0]!).accuracy == null
                      ? "—"
                      : `${n(t(a).accuracy! - t(compared[0]!).accuracy!)} pp`,
                },
                {
                  label: "Score change vs first",
                  get: (a: Attempt) =>
                    t(a).maxScore === t(compared[0]!).maxScore
                      ? `${n(t(a).score - t(compared[0]!).score)} marks`
                      : "Different maximum · compare %",
                },
                {
                  label: "Attempted",
                  get: (a: Attempt) => `${t(a).attempted} / ${t(a).questions}`,
                },
                {
                  label: "Time taken",
                  get: (a: Attempt) => formatTime(t(a).timeSeconds),
                },
                {
                  label: "Attempt change vs first",
                  get: (a: Attempt) =>
                    `${t(a).attempted - t(compared[0]!).attempted} questions`,
                },
                {
                  label: "Time change vs first",
                  get: (a: Attempt) =>
                    t(a).timeSeconds == null || t(compared[0]!).timeSeconds == null
                      ? "—"
                      : `${n((t(a).timeSeconds! - t(compared[0]!).timeSeconds!) / 60)} min`,
                },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="text-xs muted">{row.label}</td>
                  {compared.map((a) => (
                    <td key={a.id}>{row.get(a)}</td>
                  ))}
                </tr>
              ))}
              {subjectIds.map((id) => (
                <tr key={id}>
                  <td className="text-xs font-medium">{SUBJECTS[id].short}</td>
                  {compared.map((a) => {
                    const s = a.subjects.find((s) => s.subjectId === id);
                    const base = compared[0]!.subjects.find(
                      (s) => s.subjectId === id,
                    );
                    const t = s ? subjectStats(s) : null;
                    return (
                      <td key={a.id}>
                        {t ? (
                          <>
                            <p>
                              {n(t.score)} / {t.maxScore}{" "}
                              <span className="text-xs muted">
                                ({n(t.percentage)}%)
                              </span>
                            </p>
                            <p className="text-[11px] muted mt-1">
                              {n(t.accuracy)}% accuracy · {t.attempted}{" "}
                              attempted · {formatTime(t.timeSeconds)}
                            </p>
                            {base && (
                              <p className="flex items-center gap-1 text-[10px] mt-1 text-accent">
                                <DuotoneIcon
                                  name="trend"
                                  size={11}
                                  tone="accent"
                                />
                                {n(
                                  t.percentage - subjectStats(base).percentage,
                                )}{" "}
                                pp vs first
                              </p>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyChart>
          Select at least two mocks to compare their results.
        </EmptyChart>
      )}
    </>
  );
});
