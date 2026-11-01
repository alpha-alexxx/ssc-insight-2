"use client";
import { memo, useMemo } from "react";
import { PlainIcon } from "./icon";
import { Button } from "./ui/button";
import { Panel } from "./dashboard-panels";
import { Skeleton } from "./ui/skeleton";
import { AttemptPagination } from "./attempt-pagination";
import {
  Delta,
  accuracyTone,
  comparablePercentage,
  scoreBarTone,
  typeChip,
} from "./attempt-display";
import {
  SUBJECTS,
  sectionIds,
  subjectIds,
  subjectStats,
  totals,
  formatNumber as n,
  formatTime,
  type Attempt,
  type PagedAttempts,
  type PageSize,
  type SectionId,
} from "@/lib/domain";
import { sectionsForAttempt } from "@/lib/exams";
import type { PatternSection } from "@/lib/domain";
import { istTimeLabel, mockTypeLabel, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Compare — a picker, a selection bar, and an insight stack.
 *
 * The ledger answers three questions the old version never asked:
 *   · Where did this result land against the target for its own paper?
 *   · How did it move from the previous attempt?
 *   · How does it sit against the filtered average?
 *
 * Deltas are measured on percentages, because the selected mocks may have
 * different maxima; raw marks are only compared when the maxima match, and
 * the table says so when they do not.
 */

const dateLabel = shortDate;
const typeName = mockTypeLabel;

export type CompareReference = {
  /** Target for a tier, keyed "examId:tierId". */
  targetFor: (attempt: Attempt) => { marks: number; maxScore: number } | null;
  /** Average percentage across the current filtered set, when available. */
  averagePercentage: number | null;
  averageCount: number | null;
};

/** Memoized: the shell re-renders per chat token/keystroke; the ledger doesn't. */
export const CompareView = memo(function CompareView({
  data,
  isFetching,
  error,
  onRetry,
  onPageChange,
  onPageSizeChange,
  compared,
  selected,
  onToggle,
  onClear,
  onOpen,
  reference,
}: {
  /** The current server-paged picker page; undefined during first load. */
  data: PagedAttempts | undefined;
  isFetching: boolean;
  /** Present only when the picker page failed to load. */
  error?: Error | null;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  compared: Attempt[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  /** Opens the attempt detail dialog from a picker row. */
  onOpen?: (attempt: Attempt) => void;
  reference?: CompareReference;
}) {
  const attempts = data?.items ?? [];
  const firstLoad = data === undefined && !error;
  const comparison = useMemo(
    () => buildComparison(compared, reference),
    [compared, reference],
  );

  return (
    <>
      <Panel
        icon="compare"
        title={`Choose your mocks (${compared.length}/4)`}
        description="Select two to four results. Filters and search narrow the list."
      >
        {error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : (
          <>
            <div
              className={cn(
                "divide-y divide-rule-soft transition-opacity",
                isFetching && !firstLoad && "opacity-60",
              )}
            >
              {firstLoad ? (
                <div className="space-y-2 p-4" role="status" aria-label="Loading mocks">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : attempts.length ? (
                attempts.map((a) => (
                  <PickerRow
                    key={a.id}
                    attempt={a}
                    checked={selected.includes(a.id)}
                    disabled={selected.length >= 4 && !selected.includes(a.id)}
                    onToggle={() => onToggle(a.id)}
                    onOpen={onOpen}
                  />
                ))
              ) : (
                <div className="py-10 px-5 text-center">
                  <p className="font-serif text-[1.125rem] leading-snug">
                    No mocks match these filters.
                  </p>
                  <p className="mt-1.5 text-xs text-muted">
                    Widen the platform, subject or date range to find the
                    results you want to compare.
                  </p>
                </div>
              )}
            </div>
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
          </>
        )}
      </Panel>

      {selected.length > 0 && (
        <SelectionBar
          compared={compared}
          onToggle={onToggle}
          onClear={onClear}
        />
      )}

      {compared.length >= 2 ? (
        <ComparisonLedger comparison={comparison} />
      ) : (
        <div className="mt-4 panel px-5 py-10 text-center">
          <p className="font-serif text-[1.125rem]">
            {compared.length === 1
              ? "One more to go."
              : "Pick two mocks to compare."}
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted">
            Comparing shows the score against each paper&apos;s target, the move
            from the previous attempt, and a subject-by-subject breakdown —
            with percentages wherever the maxima differ.
          </p>
        </div>
      )}
    </>
  );
});

function PickerRow({
  attempt,
  checked,
  disabled,
  onToggle,
  onOpen,
}: {
  attempt: Attempt;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  onOpen?: (attempt: Attempt) => void;
}) {
  const t = totals(attempt);
  const pct = comparablePercentage(t);
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 px-4 py-3 transition-colors sm:px-6 lg:flex-nowrap",
        checked ? "bg-accent-soft/50" : "hover:bg-canvas",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        aria-label={`Select ${attempt.name} for comparison`}
      />
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-control",
          typeChip(attempt.type),
        )}
        aria-hidden="true"
      >
        <PlainIcon name="file" size={15} />
      </span>
      <span className="min-w-0 flex-1 basis-40">
        <span className="block truncate text-sm font-medium text-ink">
          {attempt.name}
        </span>
        <span className="block truncate text-[0.6875rem] text-muted">
          {attempt.platform} · {dateLabel(attempt.completedAt)} ·{" "}
          {istTimeLabel(attempt.completedAt)} · {typeName(attempt.type)}
        </span>
      </span>
      <span className="hidden sm:inline">
        <span
          className={cn(
            "rounded-control px-2 py-1 text-[0.6875rem] font-medium",
            typeChip(attempt.type),
          )}
        >
          {typeName(attempt.type)}
        </span>
      </span>
      <span className="w-28 shrink-0">
        <span className="block text-[0.8125rem] font-medium tabular text-ink">
          {n(t.score)}
          <span className="text-xs font-normal text-muted"> / {t.maxScore}</span>
        </span>
        <span className="mt-1 block h-[2px] w-full bg-soft">
          <span
            className={cn("block h-full", scoreBarTone(pct))}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </span>
      </span>
      <span className="hidden md:inline">
        <span
          className={cn(
            "rounded-control px-2 py-1 text-[0.6875rem]",
            accuracyTone(t.accuracy),
          )}
        >
          {t.accuracy == null ? "—" : `${n(t.accuracy)}%`}
        </span>
      </span>
      {onOpen && (
        <Button
          variant="outline"
          size="sm"
          aria-label={`View ${attempt.name}`}
          onClick={() => onOpen(attempt)}
        >
          <PlainIcon name="search" size={12} /> View
        </Button>
      )}
    </div>
  );
}

function SelectionBar({
  compared,
  onToggle,
  onClear,
}: {
  compared: Attempt[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="panel mt-4 flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {compared.length} of 4 selected
        </p>
        <p className="text-[0.6875rem] text-muted">
          Add up to two more results to widen the comparison.
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {compared.map((a) => (
          <span
            key={a.id}
            className="inline-flex max-w-64 items-center gap-2 rounded-control border border-rule-soft bg-canvas px-2.5 py-1.5 text-xs"
          >
            <span className="truncate font-medium text-ink">{a.name}</span>
            <button
              type="button"
              aria-label={`Remove ${a.name} from the comparison`}
              onClick={() => onToggle(a.id)}
              className="tap-target text-muted transition-colors hover:text-danger"
            >
              <PlainIcon name="close" size={12} />
            </button>
          </span>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear all
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The comparison model                                                */
/* ------------------------------------------------------------------ */

type ComparisonRow = {
  key: string;
  label: string;
  hint?: string;
  /** One rendered value per compared attempt, aligned to `attempts`. */
  values: string[];
  /** Numeric value used for the difference column (percentage units). */
  numeric: (number | null)[];
  unit: string;
  /** Lower is better (pace). */
  better?: "up" | "down";
  diffable: boolean;
};

type Comparison = {
  attempts: Attempt[];
  totals: ReturnType<typeof totals>[];
  /** True when every selected attempt has the same maximum. */
  sameMax: boolean;
  rows: ComparisonRow[];
  subjectRows: {
    id: string;
    label: string;
    /** One cell per selected attempt, aligned by index; null means that mock
     * did not include this subject. */
    values: ({
      score: number;
      maxScore: number;
      percentage: number;
      accuracy: number | null;
      attempted: number;
    } | null)[];
    qualifying: boolean;
  }[];
  sectionRows: { id: string; label: string; values: (number | null)[] }[];
  previousIndex: number;
  targetHint: string | null;
};

function buildComparison(
  attempts: Attempt[],
  reference?: CompareReference,
): Comparison {
  const tt = attempts.map((a) => totals(a));
  const sameMax =
    attempts.length > 0 && tt.every((t) => t.maxScore === tt[0]!.maxScore);
  const pct = tt.map(comparablePercentage);

  const targetRows: (number | null)[] = attempts.map((a) => {
    const target = reference?.targetFor(a);
    if (!target || target.maxScore === 0) return null;
    return (target.marks / target.maxScore) * 100;
  });
  const hasTarget = targetRows.some((v) => v != null);

  // "Previous" is the attempt immediately before this one in attempt-date
  // order, so the delta describes real progression rather than column order.
  const byDate = [...attempts].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  );
  const previousIndex = attempts.length
    ? Math.max(
        0,
        byDate.findIndex((a) => a.id === attempts[attempts.length - 1]!.id) - 1,
      )
    : 0;

  const rows: ComparisonRow[] = [
    {
      key: "score",
      label: "Score",
      hint: sameMax ? undefined : "Different papers — read the percentage",
      values: tt.map((t) => `${n(t.score)} / ${t.maxScore}`),
      numeric: tt.map((t) => t.score),
      unit: "marks",
      diffable: sameMax,
    },
    {
      key: "percentage",
      label: "Score percentage",
      hint: "Score ÷ maximum",
      values: tt.map((t) => `${n(t.percentage)}%`),
      numeric: pct,
      unit: "pp",
      diffable: true,
    },
    ...(hasTarget
      ? [
          {
            key: "vs-target",
            label: "Against target",
            hint: "Target for the attempt's own paper",
            values: attempts.map((a, i) => {
              const target = targetRows[i];
              return target == null
                ? "—"
                : `${pct[i]! >= target ? "+" : "−"}${n(Math.abs(pct[i]! - target))} pp · ${n(target)}% target`;
            }),
            numeric: attempts.map((_, i) =>
              targetRows[i] == null ? null : pct[i]! - targetRows[i]!,
            ),
            unit: "pp",
            diffable: false,
          } satisfies ComparisonRow,
        ]
      : []),
    {
      key: "accuracy",
      label: "Accuracy",
      hint: "Correct ÷ attempted",
      values: tt.map((t) => (t.accuracy == null ? "—" : `${n(t.accuracy)}%`)),
      numeric: tt.map((t) => t.accuracy),
      unit: "pp",
      diffable: true,
    },
    {
      key: "attempted",
      label: "Attempted",
      values: tt.map((t) => `${n(t.attempted)} / ${n(t.questions)}`),
      numeric: tt.map((t) =>
        t.questions ? (t.attempted / t.questions) * 100 : null,
      ),
      unit: "pp",
      diffable: true,
    },
    {
      key: "unattempted",
      label: "Left blank",
      hint: "Unattempted questions",
      values: tt.map((t) => n(t.unattempted)),
      numeric: tt.map((t) =>
        t.questions ? (t.unattempted / t.questions) * 100 : null,
      ),
      unit: "pp",
      diffable: true,
      better: "down",
    },
    {
      key: "time",
      label: "Time taken",
      values: tt.map((t) => formatTime(t.timeSeconds)),
      numeric: tt.map((t) => t.timeSeconds),
      unit: "s",
      diffable: true,
      better: "down",
    },
    {
      key: "pace",
      label: "Pace",
      hint: "Minutes per attempted question",
      values: tt.map((t) =>
        t.attempted && t.timeSeconds != null
          ? `${n(t.timeSeconds / 60 / t.attempted)} min`
          : "—",
      ),
      numeric: tt.map((t) =>
        t.attempted && t.timeSeconds != null
          ? t.timeSeconds / 60 / t.attempted
          : null,
      ),
      unit: "min",
      diffable: true,
      better: "down",
    },
    {
      key: "percentile",
      label: "Reported percentile",
      hint: "Only shown when the result sheet reported one",
      values: attempts.map((a) =>
        a.percentile == null ? "—" : `${n(a.percentile)}%`,
      ),
      numeric: attempts.map((a) => a.percentile ?? null),
      unit: "pp",
      diffable: false,
    },
  ];

  if (reference?.averagePercentage != null) {
    rows.push({
      key: "vs-average",
      label: "Against your average",
      hint: `Filtered average over ${reference.averageCount ?? 0} mock${reference.averageCount === 1 ? "" : "s"}`,
      values: pct.map(
        (value) =>
          `${value >= reference.averagePercentage! ? "+" : "−"}${n(
            Math.abs(value - reference.averagePercentage!),
          )} pp`,
      ),
      numeric: pct.map((value) => value - reference.averagePercentage!),
      unit: "pp",
      diffable: false,
    });
  }

  // Subject rows use the SAME rule as the Score row: qualifying subjects are
  // excluded, so subject marks add up to the merit total above them.
  // Every selected attempt gets a cell, aligned by index — a mock that does
  // not contain the subject shows "—" rather than shifting its neighbour's
  // value into the wrong column.
  const subjectRows = subjectIds
    .map((id) => {
      const values = attempts.map((a) => {
        const row = a.subjects.find((s) => s.subjectId === id);
        if (!row) return null;
        const stats = subjectStats(row, a.marking);
        return {
          score: stats.score,
          maxScore: stats.maxScore,
          percentage: stats.percentage,
          accuracy: stats.accuracy,
          attempted: stats.attempted,
          qualifying: row.qualifying,
        };
      });
      const present = values.filter(
        (v): v is NonNullable<(typeof values)[number]> => v != null,
      );
      if (!present.length) return null;
      return {
        id,
        label: SUBJECTS[id].short,
        values,
        // A subject is only a qualifying context when EVERY attempt that
        // scored it marked it qualifying.
        qualifying: present.every((v) => v.qualifying),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const sectionRows = buildSectionRows(attempts);

  return {
    attempts,
    totals: tt,
    sameMax,
    rows,
    subjectRows,
    sectionRows,
    previousIndex,
    targetHint: hasTarget ? null : "No target set for these papers.",
  };
}

/** Section points for tiers that declare sections. Only merit sections are
 * compared (a qualifying Section III is a gate, not a score). */
function buildSectionRows(attempts: Attempt[]) {
  const perAttempt = attempts.map((attempt) => {
    const sections: readonly PatternSection[] = sectionsForAttempt(
      attempt.examId,
      attempt.tierId,
    );
    return sections
      .filter((section) => !section.qualifying)
      .flatMap((section) => {
        const children = attempt.subjects.filter((s) =>
          section.subjectIds.includes(s.subjectId),
        );
        if (children.length !== section.subjectIds.length) return [];
        const stats = children.map((s) => subjectStats(s, attempt.marking));
        const maxScore = stats.reduce((sum, s) => sum + s.maxScore, 0);
        const score = stats.reduce((sum, s) => sum + s.score, 0);
        return [
          {
            id: section.id as SectionId,
            label: section.name,
            percentage: maxScore ? (score / maxScore) * 100 : null,
          },
        ];
      });
  });
  return sectionIds
    .map((id) => {
      const values = perAttempt.map(
        (rows) => rows.find((row) => row.id === id)?.percentage ?? null,
      );
      if (values.every((v) => v == null)) return null;
      const label =
        perAttempt
          .flat()
          .find((row) => row.id === id)?.label ?? id;
      return { id, label, values };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
}

function ComparisonLedger({ comparison }: { comparison: Comparison }) {
  const { attempts, rows, sameMax } = comparison;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(["percentage", "accuracy", "vs-target", "pace"] as const).map(
          (key) => {
            const row = rows.find((r) => r.key === key);
            if (!row) return null;
            return (
              <div
                key={key}
                className="rounded-panel border border-rule-soft bg-paper p-4"
              >
                <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">
                  {row.label}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {attempts.map((a, i) => (
                    <li key={a.id} className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-[0.6875rem] text-muted">
                        {a.platform}
                      </span>
                      <span className="shrink-0 font-serif text-base leading-none tabular text-ink">
                        {row.values[i]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          },
        )}
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-3 pt-4">
          <h2 className="font-serif text-lg font-medium">Attempt comparison</h2>
          {!sameMax && (
            <p className="text-[0.6875rem] text-muted">
              These mocks have different maxima, so percentages carry the
              comparison.
            </p>
          )}
        </div>
        <div className="table-scroll">
          <table className="w-full tabular">
            <caption className="sr-only">
              Selected mock results compared side by side
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sticky-col text-left text-xs font-medium text-muted">
                  Metric
                </th>
                {attempts.map((a) => (
                  <th key={a.id} scope="col" className="min-w-40 text-left">
                    <span className="block text-xs font-semibold text-ink">
                      {a.name}
                    </span>
                    <span className="text-[0.625rem] font-normal text-muted">
                      {typeName(a.type)} · {dateLabel(a.completedAt)}
                    </span>
                  </th>
                ))}
                <th scope="col" className="min-w-28 text-left text-xs font-medium text-muted">
                  Change
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="sticky-col text-left text-xs font-normal text-muted">
                    {row.label}
                    {row.hint && (
                      <span className="mt-0.5 block text-[0.625rem] text-muted/80">
                        {row.hint}
                      </span>
                    )}
                  </th>
                  {attempts.map((a, i) => (
                    <td key={a.id} className="text-[0.8125rem]">
                      {row.values[i]}
                    </td>
                  ))}
                  <td>
                    <ChangeCell
                      row={row}
                      firstIndex={0}
                      secondIndex={attempts.length - 1}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <h2 className="px-5 pb-3 pt-4 font-serif text-lg font-medium">
          Subject comparison
        </h2>
        <div className="table-scroll">
          <table className="w-full tabular">
            <caption className="sr-only">
              Subject-wise comparison for the selected mocks
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sticky-col text-left text-xs font-medium text-muted">
                  Subject
                </th>
                {attempts.map((a) => (
                  <th key={a.id} scope="col" className="min-w-36 text-left">
                    <span className="block text-xs font-semibold text-ink">
                      {a.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.subjectRows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="sticky-col text-left text-xs font-medium">
                    {row.label}
                    {row.qualifying && (
                      <span className="ml-1.5 text-[0.625rem] font-normal uppercase tracking-wide text-muted">
                        qualifying
                      </span>
                    )}
                  </th>
                  {row.values.map((value, index) => (
                    <td key={attempts[index]!.id} className="min-w-36">
                      {value == null ? (
                        <span className="text-xs text-muted">
                          Not in this mock
                        </span>
                      ) : (
                        <>
                          <p className="text-[0.8125rem]">
                            <span className="font-medium">
                              {n(value.score)} / {n(value.maxScore)}
                            </span>{" "}
                            <span className="text-xs text-muted">
                              ({n(value.percentage)}%)
                            </span>
                          </p>
                          <span className="mt-1 block h-[2px] w-24 bg-soft">
                            <span
                              className={cn("block h-full", scoreBarTone(value.percentage))}
                              style={{ width: `${Math.min(100, Math.max(0, value.percentage))}%` }}
                            />
                          </span>
                          <p className="mt-1 text-[0.625rem] text-muted">
                            {n(value.attempted)} attempted ·{" "}
                            {value.accuracy == null ? "—" : `${n(value.accuracy)}% accuracy`}
                          </p>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {comparison.sectionRows.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-5 pb-3 pt-4">
            <h2 className="font-serif text-lg font-medium">Section comparison</h2>
            <p className="mt-0.5 text-[0.6875rem] text-muted">
              Section I and II are summed from each full mock&apos;s subject
              results. A qualifying section is never included.
            </p>
          </div>
          <div className="table-scroll">
            <table className="w-full tabular">
              <caption className="sr-only">
                Section-wise score percentages for the selected mocks
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky-col text-left text-xs font-medium text-muted">
                    Section
                  </th>
                  {attempts.map((a) => (
                    <th key={a.id} scope="col" className="text-left text-xs font-semibold text-ink">
                      {a.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.sectionRows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row" className="sticky-col text-left text-xs font-normal">
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td key={attempts[index]!.id} className="text-[0.8125rem]">
                        {value == null ? "—" : `${n(value)}%`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[0.6875rem] leading-relaxed text-muted">
        {attempts.length === 2
          ? `Change compares ${attempts[1]!.name} with ${attempts[0]!.name}.`
          : `Change compares the last selected mock (${attempts[attempts.length - 1]!.name}) with the first (${attempts[0]!.name}).`}
      </p>
    </div>
  );
}

function ChangeCell({
  row,
  firstIndex,
  secondIndex,
}: {
  row: ComparisonRow;
  firstIndex: number;
  secondIndex: number;
}) {
  // Two-way compares first vs second; a wider selection compares the FIRST
  // and LAST columns, which is the overall movement across the comparison.
  // Rendering "\u2014" for every 3-4 way row made the column look broken.
  if (!row.diffable) return <span className="text-xs text-muted">\u2014</span>;
  const a = row.numeric[firstIndex];
  const b = row.numeric[secondIndex];
  if (a == null || b == null) return <span className="text-xs text-muted">\u2014</span>;
  const value = row.unit === "s" ? (b - a) / 60 : b - a;
  const unit = row.unit === "s" ? "min" : row.unit;
  return <Delta value={value} unit={unit} better={row.better ?? "up"} />;
}

function ErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <div className="px-5 py-10 text-center" role="alert">
      <p className="font-serif text-[1.125rem]">
        The mock list could not be loaded.
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
  );
}
