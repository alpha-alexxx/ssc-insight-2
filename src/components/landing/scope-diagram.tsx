import { LANDING_SCOPES, LANDING_SUMMARY } from "./fixtures";

/**
 * The analytical-scope diagram: one saved record fanning into four readings.
 *
 * This is the least obvious and most important idea in the product, so it gets
 * its own drawing rather than a card grid. The counts are `analyze()` output —
 * the app's own projection counts — never typed by hand.
 *
 * Deliberately static markup. The connectors draw themselves with a
 * scroll-driven CSS animation (`.scope-fan` in `globals.css`) that only runs
 * where the browser supports `animation-timeline: view()` and the reader
 * allows motion; everywhere else the lines are simply drawn. A diagram that
 * explains the core idea must never depend on an observer firing.
 */

const ORDER = ["full", "subject", "sectional", "all"] as const;

const NOTES: Record<(typeof ORDER)[number], string> = {
  full: "one point per saved full mock",
  subject: "one point per subject result, incl. Computer",
  sectional: "explicit sectionals + two derived per full mock",
  all: "one point per saved attempt, compared by percentage",
};

export function ScopeDiagram() {
  const source = LANDING_SUMMARY;

  return (
    <div className="relative">
      {/* The source record. */}
      <div className="mx-auto w-full max-w-sm rounded-card border border-ink bg-paper p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="section-label">One saved record</p>
          <p className="text-[0.6875rem] text-muted tabular">
            {source.latestScore} / {source.latestMax}
          </p>
        </div>
        <p className="mt-1.5 font-serif text-lg leading-tight tracking-[-0.02em]">
          Testbook Full Mock 2
        </p>
        <p className="mt-0.5 text-xs text-muted">
          25 Oct · 130 questions · 124 min
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2 border-t border-rule-soft pt-2.5">
          {source.whereYouStand
            .filter((row) => row.subjectId !== "computer")
            .map((row) => (
              <div key={row.subjectId}>
                <p className="truncate text-[0.625rem] text-muted">{row.label}</p>
                <span className="mt-1 block h-0.5 bg-soft" aria-hidden="true">
                  <span
                    className="block h-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, row.averagePercentage ?? 0))}%`,
                      background: `var(--chart-${row.subjectId})`,
                    }}
                  />
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Fan: one line per scope. */}
      <svg
        viewBox="0 0 400 64"
        preserveAspectRatio="none"
        className="mx-auto block h-14 w-full max-w-3xl"
        aria-hidden="true"
      >
        {ORDER.map((scope, index) => (
          <path
            key={scope}
            className="scope-fan"
            d={`M200 0 C200 30, ${50 + index * 100} 24, ${50 + index * 100} 64`}
            fill="none"
            stroke="var(--rule)"
            strokeWidth="1"
            pathLength={1}
            style={{ animationDelay: `${index * 70}ms` }}
          />
        ))}
      </svg>

      {/* Four readings of the same record. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((scope) => {
          const data = LANDING_SCOPES[scope];
          return (
            <div
              key={scope}
              className="rounded-control border border-rule-soft bg-paper p-4"
            >
              <p className="section-label">{data.label}</p>
              <p className="mt-1 font-serif text-[2rem] leading-none tracking-[-0.03em] tabular">
                {data.pointCount}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {data.pointCount === 1 ? "point" : "points"}
              </p>
              <p className="mt-2 border-t border-rule-soft pt-2 text-[0.6875rem] leading-snug text-muted">
                {NOTES[scope]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
