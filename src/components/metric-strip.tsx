"use client";
import Link from "next/link";
import { PlainIcon, type IconName } from "./icon";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * One cell of a `.metric-strip`. Shared by the dashboard overview and the study
 * calendar so both strips are literally the same component: a label, one
 * figure, one quiet hint line, and a 2px progress rule. A cell is a link, a
 * button, or plain content depending on whether it has a destination — static
 * cells suppress the chevron and the hover fill.
 */
export function MetricCell({
  label,
  icon,
  value,
  hint,
  pct,
  tone,
  delta,
  onClick,
  href,
}: {
  label: string;
  icon: IconName;
  value: string;
  hint: string;
  /** 0–1 progress for the rule; null renders a decorative empty rule. */
  pct: number | null;
  /** Semantic tone for the figure itself (danger when work is overdue). */
  tone?: "danger";
  delta?: { tone: string; label: string } | null;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      <span className="metric-head">
        <PlainIcon name={icon} size={13} className="shrink-0 text-accent" />
        <span className="metric-label truncate">{label}</span>
        <PlainIcon
          name="chevronRight"
          size={13}
          className="metric-go ml-auto shrink-0 text-muted"
        />
      </span>
      <span className="metric-figure">
        <span className={cn("metric-value", tone === "danger" && "text-danger")}>
          {value}
        </span>
        {delta && (
          <span className={cn("metric-delta", delta.tone)}>{delta.label}</span>
        )}
      </span>
      <span className="metric-hint block truncate">{hint}</span>
      <span
        className="metric-rule block"
        role={pct != null ? "progressbar" : undefined}
        aria-label={pct != null ? `${label} progress` : undefined}
        aria-valuemin={pct != null ? 0 : undefined}
        aria-valuemax={pct != null ? 100 : undefined}
        aria-valuenow={pct != null ? Math.round(pct * 100) : undefined}
        aria-hidden={pct == null ? true : undefined}
      >
        <span style={{ width: `${Math.round((pct ?? 0) * 100)}%` }} />
      </span>
    </>
  );
  const className = cn("metric-cell", !href && !onClick && "cursor-default");
  if (href) {
    return (
      <Link
        href={href}
        className={className}
        aria-label={`${label}: ${value}. ${hint}`}
      >
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        aria-label={`${label}: ${value}. ${hint}`}
      >
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}

/** Loading placeholder matching the real strip's cell rhythm. */
export function MetricStripSkeleton({ label }: { label: string }) {
  return (
    <div className="metric-strip" aria-busy="true" aria-label={label}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="metric-cell">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mt-2.5 h-8 w-20" />
          <Skeleton className="mt-2 h-2.5 w-24" />
          <Skeleton className="mt-3 h-0.5 w-full" />
        </div>
      ))}
    </div>
  );
}
