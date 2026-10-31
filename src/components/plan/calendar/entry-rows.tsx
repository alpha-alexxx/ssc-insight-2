"use client";
import type { ReactNode } from "react";
import { PlainIcon } from "../../icon";
import { cn } from "@/lib/utils";
import { CategoryChip, CompleteToggle, ResultLine } from "../plan-shared";
import { PlanTaskRow } from "../plan-task-row";
import {
  PLAN_CATEGORIES,
  isMockType,
  type PlanTaskView,
} from "@/lib/plan/view-model";
import { mockTypeLabel } from "@/lib/format";
import type { Attempt } from "@/lib/domain";
import type { CalendarEntry, PersonalEntry } from "@/lib/plan/calendar-entries";
import { planRowClass } from "./visuals";

/**
 * The three entry row forms. One component per layer, because the layers are
 * deliberately different kinds of ink:
 *
 * - `PlanEntryRow` reuses the shared `PlanTaskRow` (the same row as the daily
 *   workspace and My Tasks) so completion, the detail dialog and "Log attempt"
 *   behave identically everywhere.
 * - `PersonalEntryRow` is a margin note: outlined, a status dot, no tint.
 * - `AttemptEntryRow` is a stamp: neutral, with the score as a serif figure.
 */

export function PlanEntryRow({
  task,
  onOpen,
  onToggle,
  onLogAttempt,
  dense,
}: {
  task: PlanTaskView;
  onOpen: () => void;
  onToggle?: (next: boolean) => void;
  onLogAttempt?: () => void;
  dense?: boolean;
}) {
  return (
    <PlanTaskRow
      task={task}
      density={dense ? "compact" : "row"}
      onOpen={onOpen}
      onToggleCompleted={onToggle}
      onLogAttempt={onLogAttempt}
    />
  );
}

/** Personal status dot — square is wrong here; the Frame Rule reserves round
 * for status dots, and this is exactly one. */
export function StatusDot({ status }: { status: PersonalEntry["status"] }) {
  const cls =
    status === "completed"
      ? "bg-positive border-positive"
      : status === "overdue"
        ? "bg-danger border-danger ring-2 ring-danger-soft"
        : status === "in_progress"
          ? "bg-accent border-accent"
          : "bg-paper border-rule";
  return (
    <span
      aria-hidden="true"
      className={cn("mt-1 inline-block size-2.5 shrink-0 rounded-full border-2", cls)}
    />
  );
}

export function PersonalEntryRow({
  entry,
  onOpen,
  onToggle,
}: {
  entry: PersonalEntry;
  onOpen: () => void;
  onToggle: (next: boolean) => void;
}) {
  const completed = entry.status === "completed";
  return (
    <li className="border-l-2 border-l-transparent px-4 py-2.5 transition-colors hover:bg-soft">
      <div className="flex items-start gap-2.5">
        <CompleteToggle
          completed={completed}
          label={`Mark ${entry.task.title} ${completed ? "incomplete" : "complete"}`}
          onToggle={() => onToggle(!completed)}
        />
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
          aria-label={`${entry.task.title} — edit task`}
        >
          <StatusDot status={entry.status} />
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block break-words text-[13px] font-medium leading-snug",
                completed ? "text-muted line-through" : "text-ink",
              )}
            >
              {entry.task.title}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted">
              {entry.overdue && <span className="text-danger">Overdue</span>}
              {entry.task.priority !== "normal" && (
                <span className="capitalize">{entry.task.priority} priority</span>
              )}
              {entry.task.notes && (
                <span className="truncate">{entry.task.notes}</span>
              )}
            </span>
          </span>
          <PlainIcon name="chevronRight" size={13} className="mt-0.5 shrink-0 text-muted" />
        </button>
      </div>
    </li>
  );
}

/**
 * Logged attempt, as a stamp. The score is the serif figure at the right edge;
 * the name and platform are the operational line. The full `AttemptRecordCard`
 * is used where there is room (the day ledger); this compact form is for the
 * agenda groups and week columns.
 */
export function AttemptEntryRow({
  attempt,
  scorePct,
  dense,
  onOpen,
}: {
  attempt: Attempt;
  scorePct: number;
  dense?: boolean;
  onOpen: () => void;
}) {
  return (
    <li className="border-l-2 border-l-ink/60 px-4 py-2">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 text-left"
        aria-label={`${attempt.name}, ${scorePct} percent — open result`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-snug text-ink">
            {attempt.name}
          </span>
          <span className="mt-0.5 block truncate text-[10px] text-muted">
            {attempt.platform} · {mockTypeLabel(attempt.type)}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 font-serif tabular leading-none text-ink",
            dense ? "text-base" : "text-xl",
          )}
          aria-hidden="true"
        >
          {scorePct}
          <span className="ml-0.5 text-[10px] text-muted">%</span>
        </span>
        <PlainIcon name="chevronRight" size={13} className="shrink-0 text-muted" />
      </button>
    </li>
  );
}

/** A day-level revision line with its real completion toggle. */
export function RevisionEntryRow({
  label,
  done,
  onToggle,
}: {
  label: string;
  done: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <li className="flex items-start gap-2.5 px-4 py-2">
      <CompleteToggle
        completed={done}
        label={`Mark revision ${done ? "incomplete" : "complete"}`}
        onToggle={() => onToggle(!done)}
      />
      <span
        className={cn(
          "min-w-0 flex-1 break-words text-[12px] leading-snug",
          done ? "text-muted line-through" : "text-ink",
        )}
      >
        {label}
      </span>
    </li>
  );
}

/** A section head with a written count — never colour alone. */
export function SectionHead({
  label,
  count,
  action,
}: {
  label: string;
  count?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-t border-rule-soft px-4 pb-1 pt-3">
      <h3 className="section-label flex items-baseline gap-1.5">
        <span>{label}</span>
        {count != null && (
          <span className="tabular text-muted normal-case tracking-normal">
            {count}
          </span>
        )}
      </h3>
      {action}
    </div>
  );
}

/** Category label used in compact contexts (week columns, agenda). */
export function categoryLabel(task: PlanTaskView): string {
  return PLAN_CATEGORIES[task.type].short;
}

/** The one plan-row adapter used by every surface. */
export function entryPlanRow(entry: Extract<CalendarEntry, { kind: "plan-task" }>, opts: {
  onOpen: () => void;
  onToggle?: (next: boolean) => void;
  onLogAttempt?: () => void;
  dense?: boolean;
}) {
  return (
    <PlanEntryRow
      task={entry.task}
      onOpen={opts.onOpen}
      onToggle={opts.onToggle}
      onLogAttempt={
        opts.onLogAttempt && isMockType(entry.task.type) && !entry.task.completed
          ? opts.onLogAttempt
          : undefined
      }
      dense={opts.dense}
    />
  );
}

/** Shared "quiet day" line for agenda gaps. */
export function QuietDays({ count }: { count: number }) {
  return (
    <p className="flex items-center justify-center gap-2 border-y border-rule-soft/60 py-2 text-[10px] text-muted">
      <span aria-hidden="true">· · ·</span>
      {count} quiet {count === 1 ? "day" : "days"}
      <span aria-hidden="true">· · ·</span>
    </p>
  );
}

export { CategoryChip, ResultLine, planRowClass };
