"use client";
import type { SparklinePoint } from "@/lib/performance-metrics";

/**
 * A 44px trend line for the dashboard's performance preview.
 *
 * Inline SVG, not Recharts, for two reasons: DESIGN.md reserves chart
 * chrome (axes, tooltips, a "View data" twin) for real charts, and importing
 * Recharts here would pull the whole library back into the dashboard bundle
 * that moving the analytics page just removed.
 *
 * It is decoration for a reader who already has the numbers beside it, so it
 * is `aria-hidden` — the four `ScoreBand` figures are its data and
 * "View performance" is its twin. The Meaning Rule is satisfied by the text,
 * never by the colour of the line.
 */
export function Sparkline({
  points,
  target,
  className,
}: {
  points: SparklinePoint[];
  /** Drawn as a dashed reference when the target is comparable. */
  target?: number | null;
  className?: string;
}) {
  if (points.length < 2) return null;

  const width = 240;
  const height = 44;
  const padX = 2;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  // A fixed 0–100 domain keeps two visits comparable; an auto-fitted domain
  // would make a 4-point wobble look like a collapse.
  const values = points.map((point) => point.percentage);
  if (target != null) values.push(target);
  const min = Math.max(0, Math.min(...values, 100) - 5);
  const max = Math.min(100, Math.max(...values, 0) + 5);
  const span = Math.max(1, max - min);

  const x = (index: number) => padX + (index / (points.length - 1)) * innerW;
  const y = (value: number) =>
    padY + innerH - ((value - min) / span) * innerH;

  const coords = points.map((point, index) => [x(index), y(point.percentage)]);
  const line = coords
    .map(([cx, cy], index) => `${index === 0 ? "M" : "L"}${cx.toFixed(1)} ${cy.toFixed(1)}`)
    .join(" ");
  const last = coords[coords.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {target != null && (
        <line
          x1={padX}
          x2={width - padX}
          y1={y(target)}
          y2={y(target)}
          stroke="var(--chart-target)"
          strokeDasharray="3 3"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={line}
        fill="none"
        stroke="var(--chart-score)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={2.5}
        fill="var(--chart-score)"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
