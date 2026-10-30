import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Token-only display primitives for the landing page's product mockups.
 *
 * These are deliberately not the workspace's own components: the mockups are
 * static illustrations with their own sample data, and coupling them to the
 * live components would drag hooks, fetches and client state onto the public
 * page. What they DO share is the design language — the same divided metric
 * strip, the same chip grammar, the same chart tokens, the same square rules.
 *
 * Everything here is a server component with no hooks. Numbers arrive already
 * derived from `fixtures.ts`; nothing in this file computes or invents a
 * value.
 */

/* ---------- chips ---------- */

export type ChipTone = "neutral" | "accent" | "positive" | "warning";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "border-rule-soft bg-[var(--soft)] text-muted",
  accent: "border-[color-mix(in_oklab,var(--accent)_28%,transparent)] bg-accent-soft text-accent",
  positive:
    "border-[color-mix(in_oklab,var(--positive)_28%,transparent)] bg-positive-soft text-positive",
  warning:
    "border-[color-mix(in_oklab,var(--warning)_28%,transparent)] bg-warning-soft text-warning",
};

export function MockChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: ChipTone;
}) {
  return <span className={cn("mock-chip", CHIP_TONES[tone])}>{children}</span>;
}

/** Accuracy reads on a semantic ramp, never on a palette hue. */
export function accuracyTone(value: number | null): ChipTone {
  if (value == null) return "neutral";
  if (value >= 70) return "positive";
  if (value >= 50) return "neutral";
  return "warning";
}

/* ---------- figures ---------- */

export function MockStat({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: "danger";
}) {
  return (
    <div className="min-w-0">
      <p className="mock-label truncate">{label}</p>
      <p className="mock-figure mt-1 flex items-baseline gap-1">
        <span className={tone === "danger" ? "text-danger" : undefined}>
          {value}
        </span>
        {unit ? (
          <span className="font-sans text-[0.62em] font-medium tracking-normal text-muted">
            {unit}
          </span>
        ) : null}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[0.78em] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** The real divided-strip grammar: ink rules, hairline dividers, no cards. */
export function MockMetricStrip({
  cells,
  five = false,
}: {
  cells: { label: string; value: string; unit?: string; hint?: string; pct?: number }[];
  /** A five-cell band (the score ledger with a target) instead of four. */
  five?: boolean;
}) {
  return (
    <div className={five ? "mock-strip is-five" : "mock-strip"}>
      {cells.map((cell) => (
        <div key={cell.label} className="mock-strip-cell">
          <p className="mock-label truncate">{cell.label}</p>
          <p className="mock-figure mt-0.5 flex items-baseline gap-1">
            {cell.value}
            {cell.unit ? (
              <span className="font-sans text-[0.55em] font-medium tracking-normal text-muted">
                {cell.unit}
              </span>
            ) : null}
          </p>
          {cell.hint ? (
            <p className="mt-0.5 truncate text-[0.75em] text-muted">{cell.hint}</p>
          ) : null}
          {cell.pct != null ? (
            <span className="mock-bar mt-1.5" aria-hidden="true">
              <span style={{ width: `${Math.max(0, Math.min(100, cell.pct))}%` }} />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ---------- the answer-distribution ring ---------- */

/**
 * Three-segment ring: correct (olive), incorrect (accent), unattempted
 * (beige). The centre always shows score percentage — marks divided by the
 * maximum — never accuracy and never a borrowed percentile.
 */
export function MockRing({
  size = 96,
  stroke = 11,
  correct,
  incorrect,
  unattempted,
  centre,
  caption = "score",
}: {
  size?: number;
  stroke?: number;
  /** Answer shares in questions; they are normalised here. */
  correct: number;
  incorrect: number;
  unattempted: number;
  centre: string;
  caption?: string;
}) {
  const total = correct + incorrect + unattempted || 1;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 1.5;
  const segments = [
    { value: correct / total, color: "var(--chart-average)" },
    { value: incorrect / total, color: "var(--accent)" },
    { value: unattempted / total, color: "var(--outcome-unattempted)" },
  ].filter((segment) => segment.value > 0);

  let offset = 0;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        aria-hidden="true"
        className="block"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--soft)"
          strokeWidth={stroke}
        />
        {segments.map((segment, index) => {
          const length = segment.value * circumference;
          const dash = Math.max(0, length - gap);
          const element = (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          );
          offset += length;
          return element;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="mock-ring-label text-[1.35em]">{centre}</span>
        <span className="mock-label mt-0.5 text-[0.72em]">{caption}</span>
      </div>
    </div>
  );
}

/* ---------- charts (inline SVG; the landing never imports Recharts) ---------- */

type Point = { percentage: number; label?: string };

const CHART = { width: 320, height: 120, padX: 6, padY: 10 };

/**
 * A percentage trend with optional target reference. One axis only, a 2px
 * line, a light wash beneath it, hairline gridlines and a haloed final dot —
 * the same grammar as the dashboard's area chart, at mockup scale.
 */
export function MockTrend({
  points,
  target,
  color = "var(--chart-score)",
  className,
  showGrid = true,
}: {
  points: Point[];
  target?: number;
  color?: string;
  className?: string;
  showGrid?: boolean;
}) {
  const { width, height, padX, padY } = CHART;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const values = points.map((point) => point.percentage);
  if (target != null) values.push(target);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const y = (value: number) =>
    padY + innerH - ((value - min) / Math.max(1, max - min)) * innerH;
  const x = (index: number) =>
    points.length === 1
      ? padX + innerW / 2
      : padX + (index / (points.length - 1)) * innerW;

  const coords = points.map((point, index) => [x(index), y(point.percentage)] as const);
  const line = coords
    .map(([cx, cy], index) => `${index === 0 ? "M" : "L"}${cx.toFixed(1)} ${cy.toFixed(1)}`)
    .join(" ");
  const area =
    coords.length > 1
      ? `${line} L${coords.at(-1)![0].toFixed(1)} ${height - padY} L${coords[0]![0].toFixed(1)} ${height - padY} Z`
      : "";
  const last = coords.at(-1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("block h-full w-full", className)}
    >
      {showGrid
        ? [0, 25, 50, 75, 100].map((tick) => (
            <line
              key={tick}
              x1={padX}
              x2={width - padX}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--rule-soft)"
              strokeWidth="0.75"
            />
          ))
        : null}
      {target != null ? (
        <line
          x1={padX}
          x2={width - padX}
          y1={y(target)}
          y2={y(target)}
          stroke="var(--chart-target)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ) : null}
      {area ? <path d={area} fill={color} opacity="0.1" /> : null}
      {coords.length > 1 ? (
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {coords.map(([cx, cy], index) => (
        <circle
          key={index}
          cx={cx}
          cy={cy}
          r="2.2"
          fill="var(--paper)"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {last ? (
        <>
          <circle cx={last[0]} cy={last[1]} r="6" fill={color} opacity="0.18" />
          <circle cx={last[0]} cy={last[1]} r="3.2" fill={color} />
        </>
      ) : null}
    </svg>
  );
}

/**
 * The subject radar: one polygon over every populated subject on a 0–100
 * scale. Missing subjects are named in text beside it rather than drawn as
 * zero, matching the dashboard's rule.
 */
export function MockRadar({
  rows,
  size = 150,
}: {
  rows: { label: string; value: number | null }[];
  size?: number;
}) {
  const filled = rows.filter(
    (row): row is { label: string; value: number } => row.value != null,
  );
  const centre = size / 2;
  const radius = centre - 18;
  const angle = (index: number) => (Math.PI * 2 * index) / rows.length - Math.PI / 2;
  const pointAt = (index: number, value: number) => {
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return [centre + Math.cos(angle(index)) * r, centre + Math.sin(angle(index)) * r];
  };
  const polygon = rows
    .map((row, index) => pointAt(index, row.value ?? 0))
    .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
    .join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        aria-hidden="true"
        className="block"
      >
        {[25, 50, 75, 100].map((ring) => (
          <polygon
            key={ring}
            points={rows
              .map((_, index) => pointAt(index, ring))
              .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke="var(--rule-soft)"
            strokeWidth="0.75"
          />
        ))}
        {rows.map((_, index) => {
          const [px, py] = pointAt(index, 100);
          return (
            <line
              key={index}
              x1={centre}
              y1={centre}
              x2={px}
              y2={py}
              stroke="var(--rule-soft)"
              strokeWidth="0.75"
            />
          );
        })}
        {filled.length >= 3 ? (
          <polygon
            points={polygon}
            fill="var(--accent)"
            fillOpacity="0.12"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        ) : null}
        {filled.map((row) => {
          const index = rows.indexOf(row);
          const [px, py] = pointAt(index, row.value);
          return (
            <circle key={row.label} cx={px} cy={py} r="2" fill="var(--accent)" />
          );
        })}
      </svg>
      {/* The value legend. Labelled rows rather than axis text at the
          polygon's vertices, which would collide at narrow container widths. */}
      <dl className="mt-2 grid w-full grid-cols-2 gap-x-4 gap-y-1 text-[0.72em]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-2">
            <dt className="min-w-0 truncate text-muted">{row.label}</dt>
            <dd className="shrink-0 font-medium tabular">
              {row.value == null ? "—" : `${Math.round(row.value)}%`}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * The answer ledger beside a ring: colour dot, label, count, share and a
 * proportion bar. Values are printed, so colour is supplementary.
 */
export function MockLedger({
  rows,
}: {
  rows: { label: string; count: number; share: number; color: string }[];
}) {
  return (
    <dl className="flex min-w-0 flex-1 flex-col justify-center gap-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-baseline gap-1.5">
            <span
              className="mock-dot"
              style={{ background: row.color }}
              aria-hidden="true"
            />
            <dt className="flex-1 truncate text-[0.85em] text-muted">{row.label}</dt>
            <span className="mock-figure text-[1.05em]">{row.count}</span>
            <span className="w-[2.6em] text-right text-[0.78em] text-muted tabular">
              {row.share.toFixed(1)}%
            </span>
          </div>
          <span className="mock-bar mt-1" aria-hidden="true">
            <span style={{ width: `${Math.max(0, Math.min(100, row.share))}%`, background: row.color }} />
          </span>
        </div>
      ))}
    </dl>
  );
}

/* ---------- table ---------- */

/**
 * A ruled mockup table in its own scroll container. The first column sticks
 * on narrow frames, matching the workspace's `.sticky-col` behavior.
 */
export function MockTable({
  columns,
  rows,
  caption,
}: {
  columns: { key: string; label: string; align?: "right" }[];
  rows: {
    key: string;
    cells: Record<string, ReactNode>;
    sticky?: ReactNode;
  }[];
  caption?: string;
}) {
  return (
    <div className="table-scroll -mx-px">
      <table className="mock-table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align === "right" ? "text-right" : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {columns.map((column) =>
                column.key === "name" && row.sticky ? (
                  <th
                    key={column.key}
                    scope="row"
                    className="sticky-col text-left font-normal"
                  >
                    {row.sticky}
                  </th>
                ) : (
                  <td
                    key={column.key}
                    className={cn(
                      column.align === "right" && "text-right",
                      column.key === "name" && "font-medium",
                    )}
                  >
                    {row.cells[column.key]}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
