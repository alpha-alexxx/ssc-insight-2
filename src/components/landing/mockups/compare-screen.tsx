import type { ReactNode } from "react";
import { subjectStats, totals, SUBJECTS, type SubjectId } from "@/lib/domain";
import { shortDate } from "@/lib/format";
import { LANDING_FULL_MOCKS } from "../fixtures";
import { MockChip, accuracyTone } from "./data-parts";
import { MockPageHead, MockPanel, WorkspaceFrame } from "./workspace-frame";

/**
 * The compare mockup: two to four saved results side by side, as a ruled
 * ledger with a difference column. Compare has no charts by design — the
 * numbers are the point — so this screen is pure table.
 */

function duration(seconds: number | null) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds / 60) % 60;
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * "↑ 25 marks" / "↓ 3.3 pp". The arrow and the sign carry the direction, so
 * the colour is supplementary rather than the only signal. Marks are whole
 * numbers; percentages and minutes keep one decimal.
 */
function delta(value: number, suffix: string) {
  if (Math.abs(value) < 0.05) return <span className="text-muted">—</span>;
  const whole = suffix === "marks" || suffix === "questions" || suffix === "s";
  const magnitude = whole
    ? String(Math.round(Math.abs(value)))
    : Math.abs(value).toFixed(1);
  return (
    <span className={value > 0 ? "text-positive" : "text-danger"}>
      {value > 0 ? "↑" : "↓"} {magnitude} {suffix}
    </span>
  );
}

export function CompareScreen() {
  // Two full mocks, which is the only arrangement where the Difference column
  // exists in the real view. Mixing a sectional in would make the mark deltas
  // meaningless (different maxima), and that is exactly what the view guards
  // against by falling back to percentages.
  const columns = [
    LANDING_FULL_MOCKS[LANDING_FULL_MOCKS.length - 2]!,
    LANDING_FULL_MOCKS[LANDING_FULL_MOCKS.length - 1]!,
  ];
  const metrics = columns.map((attempt) => {
    const t = totals(attempt);
    return { attempt, totals: t };
  });
  const first = metrics[0]!;
  const last = metrics[metrics.length - 1]!;

  const perQuestion = (t: typeof first.totals) =>
    t.attempted && t.timeSeconds != null
      ? t.timeSeconds / t.attempted
      : null;

  const rows: { label: string; values: string[]; difference: ReactNode }[] = [
    {
      label: "Score",
      values: metrics.map((m) => `${m.totals.score} / ${m.totals.maxScore}`),
      difference: delta(last.totals.score - first.totals.score, "marks"),
    },
    {
      label: "Score percentage",
      values: metrics.map((m) => `${m.totals.percentage.toFixed(1)}%`),
      difference: delta(
        last.totals.percentage - first.totals.percentage,
        "pp",
      ),
    },
    {
      label: "Accuracy",
      values: metrics.map((m) =>
        m.totals.accuracy == null ? "—" : `${m.totals.accuracy.toFixed(1)}%`,
      ),
      difference: delta(
        (last.totals.accuracy ?? 0) - (first.totals.accuracy ?? 0),
        "pp",
      ),
    },
    {
      label: "Attempted",
      values: metrics.map(
        (m) => `${m.totals.attempted} / ${m.totals.questions}`,
      ),
      difference: delta(
        last.totals.attempted - first.totals.attempted,
        "questions",
      ),
    },
    {
      label: "Time taken",
      values: metrics.map((m) => duration(m.totals.timeSeconds)),
      difference: delta(
        ((last.totals.timeSeconds ?? 0) - (first.totals.timeSeconds ?? 0)) / 60,
        "min",
      ),
    },
    {
      label: "Time per question",
      values: metrics.map((m) => {
        const value = perQuestion(m.totals);
        return value == null ? "—" : `${Math.round(value)}s`;
      }),
      difference: delta(
        (perQuestion(last.totals) ?? 0) - (perQuestion(first.totals) ?? 0),
        "s",
      ),
    },
    {
      label: "Score change vs first",
      values: metrics.map((m) =>
        m === first
          ? "—"
          : `${m.totals.score - first.totals.score > 0 ? "+" : ""}${m.totals.score - first.totals.score}`,
      ),
      difference: <span className="text-muted">—</span>,
    },
    {
      label: "Accuracy change vs first",
      values: metrics.map((m) =>
        m === first || m.totals.accuracy == null || first.totals.accuracy == null
          ? "—"
          : `${(m.totals.accuracy - first.totals.accuracy).toFixed(1)} pp`,
      ),
      difference: <span className="text-muted">—</span>,
    },
  ];

  const subjectRows = (
    ["quant", "reasoning", "english", "ga"] as SubjectId[]
  ).map((subjectId) => {
    const cells = metrics.map((m) => {
      const subject = m.attempt.subjects.find((s) => s.subjectId === subjectId);
      if (!subject) return null;
      const stats = subjectStats(subject, m.attempt.marking);
      return { stats, percentage: stats.percentage };
    });
    const firstCell = cells[0];
    const lastCell = cells[cells.length - 1];
    return {
      subjectId,
      label: SUBJECTS[subjectId].short,
      cells,
      diff:
        firstCell && lastCell ? lastCell.percentage - firstCell.percentage : null,
    };
  });

  return (
    <WorkspaceFrame
      view="Compare mocks"
      active="Compare mocks"
      actions={
        <span className="rounded-control bg-accent px-[0.6em] py-[0.2em] text-[0.8em] font-medium text-paper">
          + Add mock
        </span>
      }
    >
      <MockPageHead
        title="Compare mocks"
        subtitle="Put up to four results side by side and find the difference behind the scores."
      />

      <div className="px-[1.1em] py-[0.9em]">
        <div className="flex flex-wrap items-center gap-[0.5em] rounded-control border border-rule-soft bg-paper px-[0.7em] py-[0.5em] text-[0.8em]">
          <span className="font-medium">{columns.length} mocks selected</span>
          {columns.map((attempt) => (
            <MockChip key={attempt.id}>{attempt.name}</MockChip>
          ))}
          <span className="ml-auto text-muted">Clear all</span>
        </div>

        <MockPanel
          className="mt-[0.75em]"
          title="Overall comparison"
          description="Read down a column for one result, across a row for the difference."
          bodyClassName="!px-0"
        >
          <div className="table-scroll px-[0.9em]">
            <table className="mock-table">
              <thead>
                <tr>
                  <th scope="col" className="sticky-col">
                    Metric
                  </th>
                  {metrics.map((m) => (
                    <th key={m.attempt.id} scope="col" className="text-right">
                      <span className="block text-ink">{m.attempt.name}</span>
                      <span className="block font-normal normal-case tracking-normal text-muted">
                        {shortDate(m.attempt.completedAt)} · {m.attempt.platform}
                      </span>
                    </th>
                  ))}
                  <th scope="col" className="text-right">
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="sticky-col text-left font-normal">
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td key={index} className="text-right tabular">
                        {value}
                      </td>
                    ))}
                    <td className="text-right tabular">{row.difference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MockPanel>

        <MockPanel
          className="mt-[0.7em]"
          title="Subject-wise comparison"
          description="Marks, percentage and accuracy for every subject."
          bodyClassName="!px-0"
        >
          <div className="table-scroll px-[0.9em]">
            <table className="mock-table">
              <thead>
                <tr>
                  <th scope="col" className="sticky-col">
                    Subject
                  </th>
                  {metrics.map((m) => (
                    <th key={m.attempt.id} scope="col" className="text-right">
                      {shortDate(m.attempt.completedAt)}
                    </th>
                  ))}
                  <th scope="col" className="text-right">
                    Score diff
                  </th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.map((row) => (
                  <tr key={row.subjectId}>
                    <th scope="row" className="sticky-col text-left font-normal">
                      <span className="flex items-center gap-[0.4em]">
                        <span
                          className="mock-dot"
                          style={{ background: `var(--chart-${row.subjectId})` }}
                          aria-hidden="true"
                        />
                        {row.label}
                      </span>
                    </th>
                    {row.cells.map((cell, index) => (
                      <td key={index} className="text-right align-top">
                        {cell ? (
                          <>
                            <span className="block font-medium">
                              {cell.stats.score} / {cell.stats.maxScore}
                            </span>
                            <span className="block text-[0.78em] text-muted">
                              {cell.percentage.toFixed(1)}% · {cell.stats.attempted}{" "}
                              attempted
                            </span>
                            <span className="mock-bar mt-[0.2em]">
                              <span
                                style={{
                                  width: `${Math.max(0, Math.min(100, cell.percentage))}%`,
                                  background: `var(--chart-${row.subjectId})`,
                                }}
                              />
                            </span>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    ))}
                    <td className="text-right tabular">
                      {row.diff == null
                        ? "—"
                        : delta(row.diff, "pp")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MockPanel>

        <div className="mt-[0.6em] flex flex-wrap items-center gap-[0.4em] text-[0.78em] text-muted">
          <MockChip tone={accuracyTone(last.totals.accuracy)}>
            {last.totals.accuracy?.toFixed(1)}% accuracy
          </MockChip>
          <span>
            Percentages are compared when the maximum marks differ; Time per
            question evens out shorter papers.
          </span>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
