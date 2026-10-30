"use client";

import { cn } from "@/lib/utils";
import {
  STATUS_META,
  StatusDot,
  nextStatus,
  statusOf,
  type PersonalTaskDisplayStatus,
} from "../plan/plan-shared";
import type { TaskStatus } from "./types";

/**
 * The three-state status control shared by list rows and board cards.
 * Clicking advances the task through its states (to do → in progress →
 * done → to do) using the same dot idiom as the study plan, so status is
 * recognizable everywhere. The visible status text on the row (never color
 * alone) carries the actual state for screen readers and glanceability.
 */
export function TaskStatusButton({
  task,
  today,
  pending = false,
  onCycle,
  className,
}: {
  task: { status: string; dueDate: string | null; title: string };
  today: string;
  pending?: boolean;
  onCycle: (next: TaskStatus) => void;
  className?: string;
}) {
  const display = statusOf(task, today) as PersonalTaskDisplayStatus;
  const next = nextStatus(display) as TaskStatus;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => onCycle(next)}
      aria-label={`Status: ${STATUS_META[display].label}. Activate to mark ${STATUS_META[next].label.toLowerCase()}.`}
      title={`Status: ${STATUS_META[display].label} — click for ${STATUS_META[next].label}`}
      className={cn(
        "relative flex size-7 shrink-0 items-center justify-center rounded-full transition-transform after:absolute after:-inset-2 after:content-[''] hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100",
        className,
      )}
    >
      <StatusDot status={display} size={16} />
    </button>
  );
}
