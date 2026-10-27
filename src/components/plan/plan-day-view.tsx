"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { AttemptRecordCard } from "../attempt-outcome-card";
import {
  CategoryChip,
  CompleteToggle,
  PlanErrorCard,
} from "./plan-shared";
import { usePlanData } from "../use-plan-data";
import { istDateKey, longDate } from "@/lib/format";
import {
  dayAssignmentStats,
  dayNeighbours,
  istTodayIso,
  isMockType,
  type PlanTaskView,
} from "@/lib/plan/view-model";
import type { Attempt } from "@/lib/domain";

/**
 * Daily study workspace (/plan/[date]) — everything for one plan day:
 * the original assignments with completion and recorded results, the daily
 * checklist, the day's revision blocks, and weak-area notes. Results are
 * per-task and never inferred; the plan content itself is read-only.
 */
export function PlanDayView({
  date,
  planApi,
  attempts,
  onAddMock,
  onOpenAttempt,
}: {
  date: string;
  planApi: ReturnType<typeof usePlanData>;
  attempts: Attempt[];
  onAddMock: (date: string, task?: PlanTaskView) => void;
  onOpenAttempt: (attempt: Attempt) => void;
}) {
  const { plan, loading, error, refresh, toggleChecklist, toggleDayRevision, saveDayNotes } =
    planApi;
  const today = istTodayIso();

  if (loading && !plan)
    return (
      <div className="panel p-6 animate-pulse" aria-busy="true">
        <div className="h-6 w-56 bg-rule-soft rounded mb-4" />
        <div className="h-40 w-full bg-rule-soft rounded" />
      </div>
    );
  if (!plan)
    return (
      <PlanErrorCard message={error || "The study plan could not load."} onRetry={() => void refresh()} />
    );

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return <PlanNotFound date={date} />;
  const { current, previous, next } = dayNeighbours(plan.days, date);
  if (!current || current.date !== date)
    return <PlanNotFound date={date} />;

  const stats = dayAssignmentStats(current);
  const phase = plan.phases.find((p) => p.phase === current.phase);

  const dayAttempts = attempts.filter(
    (attempt) => istDateKey(attempt.completedAt) === current.date,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {previous && (
            <Link
              href={`/plan/${previous.date}`}
              className="nav-button !w-auto px-2.5 py-1.5 text-[11px]"
            >
              <PlainIcon name="arrowLeft" size={12} /> Day {previous.day}
            </Link>
          )}
          {current.date !== today && (
            <Link
              href={`/plan/${today}`}
              className="nav-button !w-auto px-2.5 py-1.5 text-[11px]"
            >
              Today
            </Link>
          )}
          <Link
            href="/calendar"
            className="nav-button !w-auto px-2.5 py-1.5 text-[11px]"
          >
            <PlainIcon name="calendar" size={12} /> Calendar
          </Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" onClick={() => onAddMock(current.date)}>
            <PlainIcon name="plus" size={13} /> Add mock record
          </Button>
          {next && (
            <Link
              href={`/plan/${next.date}`}
              className="nav-button !w-auto px-2.5 py-1.5 text-[11px]"
            >
              Day {next.day} <PlainIcon name="arrowRight" size={12} />
            </Link>
          )}
        </div>
      </div>

      <header className="mb-5 border-b border-rule pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          {phase?.name ?? `Phase ${current.phase}`} · {longDate(current.date)}
          {current.date === today
            ? " · today"
            : current.date < today
              ? " · past"
              : " · upcoming"}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="workspace-title">Day {current.day}</h1>
          <p className="text-xs text-muted tabular" aria-live="polite">
            {stats.completed}/{stats.total} assignments ·{" "}
            {current.checklist.filter((item) => item.done).length}/
            {current.checklist.length} checklist
            {stats.dayCompleted ? " · day complete" : ""}
          </p>
        </div>
        <p className="mt-1 text-xs text-muted">{current.dayType}</p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
        <section className="panel min-w-0" aria-label="Assignments">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule-soft px-4 py-3">
            <h2 className="font-serif text-lg font-medium">Assignments</h2>
            <span className="text-[10px] text-muted">
              Record results after attempting
            </span>
          </div>
          <ul className="divide-y divide-rule-soft">
            {current.tasks.map((task) => (
              <PlanTaskRow
                key={task.key}
                task={task}
                planApi={planApi}
                onLogResult={
                  isMockType(task.type)
                    ? () => onAddMock(current.date, task)
                    : undefined
                }
              />
            ))}
          </ul>
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="panel p-4" aria-label="Daily checklist">
            <h2 className="font-serif text-lg font-medium">Daily checklist</h2>
            <p className="mb-3 mt-1 text-[10px] text-muted">
              The plan&apos;s four habits for every study day.
            </p>
            <ul className="flex flex-col gap-2.5">
              {current.checklist.map((item) => (
                <li key={item.id}>
                  <label className="check-row text-xs">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) =>
                        toggleChecklist(current.day, item.id, e.target.checked)
                      }
                    />
                    <span className={item.done ? "muted line-through" : ""}>
                      {item.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-4" aria-label="Revision">
            <h2 className="font-serif text-lg font-medium">Revision</h2>
            <p className="mb-3 mt-1 text-[10px] leading-relaxed text-muted">
              {plan.revisionMethod.rev1}
            </p>
            {current.revisionTasks.length === 0 ? (
              <p className="text-xs text-muted">
                No extra revision block scheduled for this day.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {current.revisionTasks.map((label, index) => {
                  const done = current.revisionDone.includes(String(index));
                  return (
                    <li key={index}>
                      <label className="check-row items-start text-xs">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={done}
                          onChange={(e) =>
                            toggleDayRevision(
                              current.day,
                              index,
                              e.target.checked,
                            )
                          }
                        />
                        <span className={done ? "muted line-through" : ""}>
                          {label}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <DayAttempts
            attempts={dayAttempts}
            onAdd={() => onAddMock(current.date)}
            onOpen={onOpenAttempt}
          />
        </aside>
      </div>

      <DayNotes
        day={current.day}
        initial={current.notes}
        onSave={saveDayNotes}
      />
    </div>
  );
}

function DayAttempts({
  attempts,
  onAdd,
  onOpen,
}: {
  attempts: Attempt[];
  onAdd: () => void;
  onOpen: (attempt: Attempt) => void;
}) {
  return (
    <section className="panel p-4" aria-label="Logged attempts">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-medium">Logged attempts</h2>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">
            Tracker results whose attempt date is this day.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <PlainIcon name="plus" size={12} /> Add
        </Button>
      </div>
      {attempts.length ? (
        <ul className="mt-3 flex flex-col gap-2">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <AttemptRecordCard attempt={attempt} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-control border border-rule-soft bg-canvas px-3 py-3 text-[10px] leading-relaxed text-muted">
          Nothing logged for this date yet. A scheduled plan test stays in the
          plan; logging its score adds a tracker attempt without moving the
          schedule.
        </p>
      )}
    </section>
  );
}

function PlanNotFound({ date }: { date: string }) {
  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <h1 className="font-serif text-3xl">No plan day for {date}</h1>
      <p className="muted text-sm mt-2 mb-5">
        The 50-day plan runs 26 October – 14 December 2026. Pick a date inside
        that window from the calendar.
      </p>
      <Link href="/calendar" className="nav-button !w-auto px-4 py-2 text-xs mx-auto">
        <PlainIcon name="calendar" size={14} /> Open the study calendar
      </Link>
    </div>
  );
}

function PlanTaskRow({
  task,
  planApi,
  onLogResult,
}: {
  task: PlanTaskView;
  planApi: ReturnType<typeof usePlanData>;
  onLogResult?: () => void;
}) {
  const { updateTask } = planApi;
  const [open, setOpen] = useState(false);
  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-2.5">
        <CompleteToggle
          completed={task.completed}
          label={`Mark ${task.name} ${task.completed ? "incomplete" : "complete"}`}
          onToggle={() => {
            updateTask(task.key, { completed: !task.completed });
            setOpen(!task.completed);
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={`text-[13px] font-medium ${task.completed ? "muted line-through" : ""}`}>
              {task.name}
            </p>
            <CategoryChip type={task.type} />
          </div>
          <p className="mt-1 text-[10px] muted tabular">
            {task.questions} Q · {task.marks} marks
            {task.completed && task.score != null ? ` · scored ${task.score}` : ""}
            {task.completed && task.score == null ? " · result not recorded" : ""}
          </p>
        </div>
        {onLogResult && !task.completed && (
          <button
            type="button"
            onClick={onLogResult}
            className="shrink-0 whitespace-nowrap text-[10px] font-medium text-accent hover:text-accent-hover"
          >
            Log attempt
          </button>
        )}
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${task.name} on RBE`}
          className="shrink-0 text-muted transition-colors hover:text-accent"
        >
          <PlainIcon name="arrowUpRight" size={14} />
        </a>
      </div>
      {task.completed && (
        <div className="mt-2 ml-0 sm:ml-8">
          <button
            type="button"
            aria-expanded={open}
            className="text-[10px] muted hover:text-accent transition-colors"
            onClick={() => setOpen(!open)}
          >
            {open ? "Hide result & revision" : "Record result & revision"}
          </button>
          {open && <ResultEditor task={task} planApi={planApi} />}
        </div>
      )}
      {!task.completed && task.notes && (
        <p className="mt-2 ml-0 sm:ml-8 text-[10px] muted">{task.notes}</p>
      )}
    </li>
  );
}

/** Score / wrong / unattempted / percentile / revision flags + task notes. */
function ResultEditor({
  task,
  planApi,
}: {
  task: PlanTaskView;
  planApi: ReturnType<typeof usePlanData>;
}) {
  const { updateTask } = planApi;
  const [score, setScore] = useState(task.score?.toString() ?? "");
  const [wrong, setWrong] = useState(task.wrong?.toString() ?? "");
  const [unattempted, setUnattempted] = useState(task.unattempted?.toString() ?? "");
  const [percentile, setPercentile] = useState(task.percentile?.toString() ?? "");
  const [notes, setNotes] = useState(task.notes);
  const saved = useRef(task);

  const commitNumber = (field: "score" | "wrong" | "unattempted" | "percentile", raw: string) => {
    const trimmed = raw.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    const current = task[field];
    if (value === current) return;
    if (value != null && Number.isNaN(value)) return;
    updateTask(task.key, { [field]: value });
  };

  return (
    <div className="mt-2 border border-rule-soft bg-canvas rounded-control p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            ["score", "Score", score, setScore],
            ["wrong", "Wrong", wrong, setWrong],
            ["unattempted", "Unattempted", unattempted, setUnattempted],
            ["percentile", "Percentile", percentile, setPercentile],
          ] as const
        ).map(([field, label, value, set]) => (
          <label key={field}>
            {label}
            <input
              type="number"
              className="no-spin"
              min={0}
              max={field === "percentile" ? 100 : task.marks}
              step={field === "percentile" ? "0.01" : "1"}
              value={value}
              placeholder="—"
              onChange={(e) => set(e.target.value)}
              onBlur={(e) => commitNumber(field, e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {(
          [
            ["rev1", "Rev-1 done"],
            ["rev2", "Rev-2 done"],
            ["rev3", "Rev-3 done"],
          ] as const
        ).map(([field, label]) => (
          <label key={field} className="check-row text-xs">
            <input
              type="checkbox"
              checked={task[field]}
              onChange={(e) => updateTask(task.key, { [field]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
      <label className="mt-3">
        Weak areas / notes for this test
        <textarea
          rows={2}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== saved.current.notes) {
              updateTask(task.key, { notes });
              saved.current = { ...saved.current, notes };
            }
          }}
          placeholder="Tricks, formulas, mistakes to revisit"
        />
      </label>
      <p className="mt-2 text-[10px] muted">
        Empty fields stay unknown — a blank score is never counted as zero.
      </p>
    </div>
  );
}

function DayNotes({
  day,
  initial,
  onSave,
}: {
  day: number;
  initial: string;
  onSave: (day: number, notes: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [savedValue, setSavedValue] = useState(initial);
  // Navigating to another plan day re-seeds the editor during render (the
  // React adjust-state pattern) — no effect, no extra pass.
  if (initial !== savedValue) {
    setSavedValue(initial);
    setValue(initial);
    setSavedAt(null);
  }
  return (
    <section className="panel mt-5 p-4 sm:p-6" aria-label="Day notes">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="panel-title text-lg">Weak areas &amp; mistake notebook</h2>
        {savedAt && (
          <span role="status" className="text-[11px] text-positive">
            Saved {savedAt}
          </span>
        )}
      </div>
      <label>
        Day notes
        <textarea
          rows={3}
          maxLength={2000}
          value={value}
          placeholder="What needs another look from today's work?"
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value !== savedValue) {
              setSavedValue(value);
              void onSave(day, value).then(() =>
                setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })),
              );
            }
          }}
        />
      </label>
    </section>
  );
}
