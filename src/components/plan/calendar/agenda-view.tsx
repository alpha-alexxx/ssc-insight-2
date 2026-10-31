"use client";
import { useState, type ComponentProps } from "react";
import { PlainIcon } from "../../icon";
import { Button } from "../../ui/button";
import { ProgressRule } from "../plan-shared";
import { cn } from "@/lib/utils";
import { longDate, shortDate } from "@/lib/format";
import {
  addIsoDays,
  dayTypeLabel,
  isoWeekdayName,
} from "@/lib/plan/view-model";
import {
  adjacentEntryDate,
  countEntries,
  datesBetween,
  entriesFor,
  type CalendarIndex,
  type CalendarLayer,
} from "@/lib/plan/calendar-entries";
import { DaySections, type DayActions } from "./day-sections";
import { QuietDays } from "./entry-rows";
import { AGENDA_WINDOW } from "./visuals";
import { CalendarSurface } from "./calendar-surface";

/**
 * The agenda: dates, not plan days, over a bounded window from the selection.
 *
 * Iterating dates is the fix that makes the unified calendar work — a personal
 * task on a Sunday outside the plan, or a mock logged in June, still appears.
 * Quiet stretches collapse into one line instead of a wall of empty days, and
 * "Show more days" grows the window in place.
 */
export function AgendaView({
  index,
  layers,
  selected,
  today,
  planStart,
  planEnd,
  actions,
  onAddMock,
  onAddPersonal,
  onGoToDate,
  touchHandlers,
}: {
  index: CalendarIndex;
  layers: readonly CalendarLayer[];
  selected: string;
  today: string;
  planStart: string;
  planEnd: string;
  actions: DayActions;
  onAddMock: (date: string) => void;
  onAddPersonal: (date: string) => void;
  onGoToDate: (iso: string) => void;
  touchHandlers?: Pick<ComponentProps<"div">, "onTouchStart" | "onTouchEnd">;
}) {
  /* Expansion belongs to the window being viewed; a period step (a new
     `selected`) opens a fresh window. Derived from the window identity, so no
     state-sync effect is needed. */
  const [windowState, setWindowState] = useState({
    start: selected,
    days: AGENDA_WINDOW,
  });
  const days = windowState.start === selected ? windowState.days : AGENDA_WINDOW;

  const to = addIsoDays(selected, days - 1);
  const active = datesBetween(index, selected, to, layers);
  const earlier = index.dates.filter(
    (date) => date < selected && entriesFor(index, date, layers).length > 0,
  );
  const nextActivity = adjacentEntryDate(index, to, 1, layers);
  const startDay = index.planDayByDate.get(selected);

  return (
    <CalendarSurface
      meta={
        active.length
          ? `${active.length} day${active.length === 1 ? "" : "s"} with work · through ${shortDate(to)}`
          : `No work in this window · through ${shortDate(to)}`
      }
      touchHandlers={touchHandlers}
    >
      {active.length ? (
        <AgendaGroups
          index={index}
          layers={layers}
          dates={active}
          today={today}
          actions={actions}
          onAddMock={onAddMock}
          onAddPersonal={onAddPersonal}
          onGoToDate={onGoToDate}
        />
      ) : (
        <div className="flex flex-col items-start gap-3 border-t border-rule-soft px-1 py-6">
          <p className="text-sm text-muted">
            Nothing scheduled from {shortDate(selected)} to {shortDate(to)}.
            {startDay ? "" : " This date is outside the plan window."}
          </p>
          <div className="action-row">
            {nextActivity && (
              <Button
                size="sm"
                onClick={() => onGoToDate(nextActivity)}
              >
                Jump to next activity · {shortDate(nextActivity)}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGoToDate(today)}
            >
              Go to today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddMock(selected)}
            >
              <PlainIcon name="plus" size={13} /> Log mock
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-rule-soft pt-3">
        <Button
          variant="outline"
          size="sm"
          className="border-dashed"
          onClick={() =>
            setWindowState({ start: selected, days: days + AGENDA_WINDOW })
          }
        >
          Show {AGENDA_WINDOW} more days
        </Button>
        <span className="text-[10px] text-muted">
          through {shortDate(addIsoDays(selected, days - 1))}
        </span>
      </div>

      {earlier.length > 0 && (
        <EarlierRanges
          index={index}
          layers={layers}
          dates={earlier}
          onGoToDate={onGoToDate}
        />
      )}

      {!startDay && (
        <p className="mt-3 border-t border-rule-soft pt-3 text-[11px] text-muted">
          The study plan runs {shortDate(planStart)} – {shortDate(planEnd)}.
          Personal tasks and logged mocks work outside that window.
        </p>
      )}
    </CalendarSurface>
  );
}

function AgendaGroups({
  index,
  layers,
  dates,
  today,
  actions,
  onAddMock,
  onAddPersonal,
  onGoToDate,
}: {
  index: CalendarIndex;
  layers: readonly CalendarLayer[];
  dates: readonly string[];
  today: string;
  actions: DayActions;
  onAddMock: (date: string) => void;
  onAddPersonal: (date: string) => void;
  onGoToDate: (iso: string) => void;
}) {
  /* Gaps: the number of empty dates between consecutive active dates, so a
     quiet stretch is one line, not four blank groups. */
  const gaps: number[] = dates.map((date, at) => {
    if (at === 0) return 0;
    const previous = dates[at - 1]!;
    let empty = 0;
    for (
      let cursor = addIsoDays(previous, 1);
      cursor < date;
      cursor = addIsoDays(cursor, 1)
    )
      empty += 1;
    return empty;
  });

  return (
    <ul aria-label={`Agenda from ${shortDate(dates[0] ?? today)}`}>
      {dates.map((date, at) => {
        const day = index.planDayByDate.get(date);
        const entries = entriesFor(index, date, layers);
        const counts = countEntries(entries);
        const isToday = date === today;
        return (
          <li key={date} className="first:border-t-0">
            {gaps[at]! > 0 && (
              <QuietDays count={gaps[at]!} />
            )}
            <div
              className={cn(
                "border-t border-rule-soft py-3 first:border-t-0",
                isToday && "bg-accent-soft/30",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
                <h3 className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {isoWeekdayName(date).slice(0, 3)} {shortDate(date)}
                  </span>
                  {day && (
                    <span className="text-[10px] text-muted">Day {day.day}</span>
                  )}
                  {isToday && (
                    <span className="rounded-pill bg-ink px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-paper">
                      Today
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => onGoToDate(date)}
                  className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-accent"
                  aria-label={`Open ${longDate(date)}`}
                >
                  Open
                  <PlainIcon name="chevronRight" size={11} />
                </button>
              </div>
              {day && (
                <>
                  <p className="mt-0.5 px-1 text-[11px] text-muted">
                    {dayTypeLabel(day.dayType)}
                  </p>
                  <ProgressRule
                    done={counts.plan.done}
                    total={counts.plan.total}
                    label={`Day ${day.day}`}
                    className="mt-2"
                  />
                </>
              )}
              <DaySections
                entries={entries}
                counts={counts}
                actions={actions}
                attemptStyle="stamp"
                dense
              />
              {!day && (
                <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddPersonal(date)}
                  >
                    <PlainIcon name="plus" size={12} /> Add task
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddMock(date)}
                  >
                    <PlainIcon name="plus" size={12} /> Log mock
                  </Button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function EarlierRanges({
  index,
  layers,
  dates,
  onGoToDate,
}: {
  index: CalendarIndex;
  layers: readonly CalendarLayer[];
  dates: readonly string[];
  onGoToDate: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? dates : dates.slice(-3).reverse();
  return (
    <div className="mt-4 border-t border-rule-soft pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted transition-colors hover:text-ink"
      >
        <PlainIcon
          name="chevronRight"
          size={12}
          className={cn("transition-transform", open && "rotate-90")}
        />
        Earlier days ({dates.length})
      </button>
      <ul className="mt-2">
        {shown.map((date) => {
          const entries = entriesFor(index, date, layers);
          const counts = countEntries(entries);
          return (
            <li key={date}>
              <button
                type="button"
                onClick={() => onGoToDate(date)}
                className="flex w-full justify-between gap-3 border-b border-rule-soft py-1.5 text-left text-[11px] last:border-0 hover:bg-soft"
              >
                <span className="text-muted">
                  {isoWeekdayName(date).slice(0, 3)} {shortDate(date)}
                </span>
                <span className="tabular text-muted">
                  {counts.plan.total
                    ? `${counts.plan.done}/${counts.plan.total} plan`
                    : ""}
                  {counts.plan.total && (counts.tasks.total || counts.mocks)
                    ? " · "
                    : ""}
                  {counts.tasks.total ? `${counts.tasks.total} tasks` : ""}
                  {(counts.tasks.total || counts.plan.total) && counts.mocks
                    ? " · "
                    : ""}
                  {counts.mocks ? `${counts.mocks} logged` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {dates.length > 3 && !open && (
        <span className="mt-1 block text-[10px] text-muted">
          {dates.length - 3} older
        </span>
      )}
    </div>
  );
}
