"use client";
import type { ReactNode } from "react";
import { AttemptRecordCard } from "../../attempt-outcome-card";
import type { Attempt } from "@/lib/domain";
import type {
  CalendarEntry,
  EntryCounts,
  PersonalEntry,
} from "@/lib/plan/calendar-entries";
import type { PlanDayView, PlanTaskView } from "@/lib/plan/view-model";
import {
  AttemptEntryRow,
  PersonalEntryRow,
  PlanEntryRow,
  RevisionEntryRow,
  SectionHead,
} from "./entry-rows";

/**
 * The one renderer for a day's contents. The Day surface, the agenda's day
 * blocks and the desktop rail all mount this, so a behavioural change (a new
 * action, a new empty rule) lands once instead of three times.
 *
 * Sections are fixed in the order the plan itself uses — scheduled work, then
 * revision, then personal work, then evidence — and empty sections are
 * omitted. The caller decides whether attempts use the full record card (a
 * wide ledger) or the compact stamp (an agenda group).
 */

export type DayActions = {
  onOpenPlanTask: (task: PlanTaskView, day: PlanDayView) => void;
  onTogglePlanTask: (task: PlanTaskView, next: boolean) => void;
  onLogAttemptForTask: (task: PlanTaskView) => void;
  onToggleRevision: (day: PlanDayView, index: number, next: boolean) => void;
  onOpenPersonal: (entry: PersonalEntry) => void;
  onTogglePersonal: (entry: PersonalEntry, next: boolean) => void;
  onOpenAttempt: (attempt: Attempt) => void;
};

export function DaySections({
  entries,
  counts,
  actions,
  attemptStyle = "card",
  dense,
  emptyHint,
}: {
  entries: readonly CalendarEntry[];
  counts: EntryCounts;
  actions: DayActions;
  /** "card" uses the full AttemptRecordCard; "stamp" the compact score row. */
  attemptStyle?: "card" | "stamp";
  dense?: boolean;
  /** One quiet line shown when the day holds nothing at all. */
  emptyHint?: ReactNode;
}) {
  const plan = entries.filter(
    (entry): entry is Extract<CalendarEntry, { kind: "plan-task" }> =>
      entry.kind === "plan-task",
  );
  const revisions = entries.filter(
    (entry): entry is Extract<CalendarEntry, { kind: "revision" }> =>
      entry.kind === "revision",
  );
  const personal = entries.filter(
    (entry): entry is PersonalEntry => entry.kind === "personal",
  );
  const attempts = entries.filter(
    (entry): entry is Extract<CalendarEntry, { kind: "attempt" }> =>
      entry.kind === "attempt",
  );

  if (!entries.length) {
    return emptyHint ? <div className="px-4 py-6 text-sm text-muted">{emptyHint}</div> : null;
  }

  return (
    <div>
      {plan.length > 0 && (
        <section aria-label="Scheduled">
          <SectionHead label="Scheduled" count={plan.length} />
          <ul className="border-t border-rule-soft">
            {plan.map((entry) => (
              <PlanEntryRow
                key={entry.id}
                task={entry.task}
                dense={dense}
                onOpen={() => actions.onOpenPlanTask(entry.task, entry.day)}
                onToggle={(next) => actions.onTogglePlanTask(entry.task, next)}
                onLogAttempt={() => actions.onLogAttemptForTask(entry.task)}
              />
            ))}
          </ul>
        </section>
      )}

      {revisions.length > 0 && (
        <section aria-label="Revision">
          <SectionHead
            label="Revision"
            count={`${counts.rev.done}/${counts.rev.total}`}
          />
          <ul className="border-t border-rule-soft">
            {revisions.map((entry) => (
              <RevisionEntryRow
                key={entry.id}
                label={entry.label}
                done={entry.done}
                onToggle={(next) =>
                  actions.onToggleRevision(entry.day, entry.dayRevisionIndex, next)
                }
              />
            ))}
          </ul>
        </section>
      )}

      {personal.length > 0 && (
        <section aria-label="Personal tasks">
          <SectionHead label="Personal" count={personal.length} />
          <ul className="border-t border-rule-soft">
            {personal.map((entry) => (
              <PersonalEntryRow
                key={entry.id}
                entry={entry}
                onOpen={() => actions.onOpenPersonal(entry)}
                onToggle={(next) => actions.onTogglePersonal(entry, next)}
              />
            ))}
          </ul>
        </section>
      )}

      {attempts.length > 0 && (
        <section aria-label="Logged results">
          <SectionHead label="Logged" count={attempts.length} />
          <ul className="flex flex-col gap-2 border-t border-rule-soft px-4 py-3">
            {attempts.map((entry) =>
              attemptStyle === "card" ? (
                <li key={entry.id}>
                  <AttemptRecordCard
                    attempt={entry.attempt}
                    onOpen={actions.onOpenAttempt}
                  />
                </li>
              ) : (
                <AttemptEntryRow
                  key={entry.id}
                  attempt={entry.attempt}
                  scorePct={entry.scorePct}
                  dense={dense}
                  onOpen={() => actions.onOpenAttempt(entry.attempt)}
                />
              ),
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
