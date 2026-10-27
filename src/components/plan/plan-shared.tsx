"use client";
import { PlainIcon } from "../icon";
import {
  PLAN_CATEGORIES,
  isMockType,
  type PlanTaskView,
} from "@/lib/plan/view-model";
import type { PlanTaskType } from "@/lib/plan/schema";

/** Shared planner atoms — category chips, completion toggles, states. */

export function CategoryChip({ type }: { type: PlanTaskType }) {
  const mock = isMockType(type);
  return (
    <span
      className={`inline-flex items-center rounded-pill border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${
        mock
          ? "border-accent/40 bg-accent-soft text-accent"
          : "border-rule-soft bg-soft text-muted"
      }`}
    >
      {PLAN_CATEGORIES[type].short}
    </span>
  );
}

export function CompleteToggle({
  completed,
  onToggle,
  label,
}: {
  completed: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={completed}
      aria-label={label}
      onClick={onToggle}
      className={`mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
        completed
          ? "border-positive bg-positive-soft text-positive"
          : "border-rule bg-paper hover:border-ink"
      }`}
    >
      {completed && <PlainIcon name="check" size={12} />}
    </button>
  );
}

export function PlanStatusChip({ task }: { task: PlanTaskView }) {
  if (task.completed)
    return (
      <span className="inline-flex items-center gap-1 rounded-pill border border-positive/40 bg-positive-soft px-2 py-0.5 text-[10px] font-medium text-positive">
        <PlainIcon name="check" size={10} /> Done
      </span>
    );
  return null;
}

export function ResultLine({ task }: { task: PlanTaskView }) {
  const parts: string[] = [];
  if (task.score != null) parts.push(`${task.score} / ${task.marks}`);
  if (task.percentile != null) parts.push(`${task.percentile}%ile`);
  if (task.wrong != null) parts.push(`${task.wrong} wrong`);
  if (task.unattempted != null) parts.push(`${task.unattempted} skipped`);
  if (!parts.length) return null;
  return <span className="text-[11px] muted tabular">{parts.join(" · ")}</span>;
}

export function PlanErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mb-5 flex flex-wrap gap-3 justify-between items-center bg-warning-soft text-warning border border-warning rounded-control px-5 py-4"
    >
      <div>
        <p className="font-medium text-sm">The study plan could not load</p>
        <p className="text-xs mt-1 max-w-2xl">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="border border-warning rounded-control px-3 py-2 text-xs font-medium hover:bg-warning/10 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
