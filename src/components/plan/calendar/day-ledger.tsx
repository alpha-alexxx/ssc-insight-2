"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { PlainIcon } from "../../icon";
import { Button } from "../../ui/button";
import { Panel } from "../../dashboard-panels";
import { ProgressRule } from "../plan-shared";
import { cn } from "@/lib/utils";
import { longDate, shortDate } from "@/lib/format";
import {
  dayTypeLabel,
  isoWeekdayName,
  type PlanDayView,
} from "@/lib/plan/view-model";
import type { CalendarEntry, EntryCounts } from "@/lib/plan/calendar-entries";
import { DaySections, type DayActions } from "./day-sections";

/**
 * The day ledger — the calendar's most characteristic surface.
 *
 * A printed timetable has a **margin**: the date sits in a narrow gutter with a
 * vertical rule, and the day's work runs beside it as ruled rows. That is the
 * structure here, rather than a stack of cards. The margin carries what
 * identifies the day (numeral, weekday, plan position); the body carries a
 * single load line and the four ruled sections.
 *
 * One implementation, three hosts: the Day surface body (`variant="surface"`),
 * the desktop rail (`"rail"`), and the phone drawer (`"drawer"`).
 */

export type DayLedgerProps = {
  date: string;
  day: PlanDayView | undefined;
  entries: readonly CalendarEntry[];
  counts: EntryCounts;
  today: string;
  planLength: number;
  planStart: string;
  planEnd: string;
  actions: DayActions;
  onAddMock: (date: string) => void;
  onAddPersonal: (date: string) => void;
  onMarkAllDone?: () => void;
  onGoToToday?: () => void;
  onGoToPlanStart?: () => void;
  variant?: "surface" | "rail" | "drawer";
  touchHandlers?: Pick<ComponentProps<"div">, "onTouchStart" | "onTouchEnd">;
};

export function DayLedger({
  date,
  day,
  entries,
  counts,
  today,
  planLength,
  planStart,
  planEnd,
  actions,
  onAddMock,
  onAddPersonal,
  onMarkAllDone,
  onGoToToday,
  onGoToPlanStart,
  variant = "surface",
  touchHandlers,
}: DayLedgerProps) {
  const inPlan = Boolean(day);
  const isToday = date === today;
  const nothingAtAll = entries.length === 0;
  const rail = variant === "rail";
  const emptyHint = inPlan
    ? "Nothing scheduled. The plan marks this a rest day — add a task or log a mock."
    : "Nothing on this date. Personal tasks and logged mocks work outside the plan window too.";

  const body = (
    <>
      <div className={cn("cal-ledger", rail && "cal-ledger-rail")}>
        {/* ---- margin: the date as a ledger entry ---- */}
        <div className="cal-margin">
          <span className="cal-margin-numeral font-serif tabular leading-none text-ink">
            {Number(date.slice(8))}
          </span>
          <span className="cal-margin-weekday text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            {isoWeekdayName(date).slice(0, 3)}
          </span>
        </div>

        {/* ---- body ---- */}
        <div className="cal-ledger-body min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="font-serif text-[1.375rem] font-medium leading-tight tracking-[-0.02em] text-ink">
              {isoWeekdayName(date)}, {longDate(date)}
            </h2>
            {isToday && (
              <span className="rounded-pill bg-ink px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-paper">
                Today
              </span>
            )}
          </div>

          <p className="mt-1 text-[11px] text-muted">
            {day ? (
              <>
                Day {day.day} of {planLength} · Phase {day.phase} ·{" "}
                {dayTypeLabel(day.dayType)}
              </>
            ) : (
              <>
                Outside the plan window · {shortDate(planStart)} –{" "}
                {shortDate(planEnd)}
              </>
            )}
          </p>

          {day && (
            <div className="mt-3 flex items-center gap-2">
              <ProgressRule
                done={counts.plan.done}
                total={counts.plan.total}
                label={`Day ${day.day}`}
                className="mt-0 flex-1"
              />
              <span className="shrink-0 text-[10px] tabular text-muted">
                {counts.plan.done}/{counts.plan.total} scheduled
              </span>
              {onMarkAllDone && counts.plan.done < counts.plan.total && (
                <button
                  type="button"
                  onClick={onMarkAllDone}
                  className="shrink-0 text-[10px] font-medium text-accent transition-colors hover:text-accent-hover"
                >
                  Mark all done
                </button>
              )}
            </div>
          )}

          <LoadLine counts={counts} />
        </div>
      </div>

      <DaySections
        entries={entries}
        counts={counts}
        actions={actions}
        attemptStyle={rail ? "card" : "stamp"}
        dense
        emptyHint={
          <EmptyActions
            date={date}
            inPlan={inPlan}
            onAddMock={onAddMock}
            onAddPersonal={onAddPersonal}
            hint={emptyHint}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule-soft px-4 py-3">
        <Button variant="outline" size="sm" onClick={() => onAddPersonal(date)}>
          <PlainIcon name="plus" size={13} /> Add task
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAddMock(date)}>
          <PlainIcon name="plus" size={13} /> Log mock
        </Button>
        {inPlan ? (
          <Link
            href={`/plan/${date}`}
            className="text-xs font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Open daily workspace →
          </Link>
        ) : (
          <span className="flex flex-wrap items-center gap-3 text-xs">
            {onGoToToday && (
              <button
                type="button"
                onClick={onGoToToday}
                className="font-medium text-accent hover:text-accent-hover"
              >
                Go to today
              </button>
            )}
            {onGoToPlanStart && (
              <button
                type="button"
                onClick={onGoToPlanStart}
                className="font-medium text-muted hover:text-ink"
              >
                Day 1 · {shortDate(planStart)}
              </button>
            )}
          </span>
        )}
      </div>
    </>
  );

  if (rail) {
    return (
      <Panel
        dense
        title="Selected day"
        description="Your schedule, tasks and results for this date."
      >
        <div {...touchHandlers}>{body}</div>
      </Panel>
    );
  }

  return (
    <section className="panel" aria-label={`Schedule for ${longDate(date)}`}>
      <div {...touchHandlers}>{body}</div>
      {nothingAtAll && null}
    </section>
  );
}

/** The one quiet load line: what the day holds, in words. */
function LoadLine({ counts }: { counts: EntryCounts }) {
  const parts: string[] = [];
  if (counts.rev.total) parts.push(`${counts.rev.done}/${counts.rev.total} revised`);
  if (counts.tasks.total)
    parts.push(
      `${counts.tasks.total} personal${counts.tasks.overdue ? ` (${counts.tasks.overdue} overdue)` : ""}`,
    );
  if (counts.mocks) parts.push(`${counts.mocks} logged`);
  if (!parts.length) return null;
  return (
    <p className="mt-2 border-t border-rule-soft pt-2 text-[11px] text-muted">
      {parts.join(" · ")}
    </p>
  );
}

function EmptyActions({
  date,
  inPlan,
  hint,
  onAddMock,
  onAddPersonal,
}: {
  date: string;
  inPlan: boolean;
  hint: string;
  onAddMock: (date: string) => void;
  onAddPersonal: (date: string) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-6">
      <p className="text-sm text-muted">{hint}</p>
      <div className="action-row">
        <Button variant="outline" size="sm" onClick={() => onAddPersonal(date)}>
          <PlainIcon name="plus" size={13} /> Add task
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAddMock(date)}>
          <PlainIcon name="plus" size={13} /> Log mock
        </Button>
      </div>
      <span className="sr-only">
        {inPlan ? "Rest day in the plan" : "No plan work on this date"}
      </span>
    </div>
  );
}
