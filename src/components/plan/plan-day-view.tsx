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
import { cn } from "@/lib/utils";

/**
 * Daily study workspace (/plan/[date]) — the reference layout: a slim top
 * nav (previous day · calendar … add-record · next day), an eyebrow + big
 * "Day N" hero with the completion ring and counts, the Assignments card,
 * a right rail (checklist, revision, logged attempts), and the mistake
 * notebook. Results are per-task and never inferred; the plan is read-only.
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
  const checklistDone = current.checklist.filter((item) => item.done).length;

  return (
    <div className="mx-auto max-w-6xl">
      {/* ---- Top nav: prev · calendar … add record · next ---- */}
      <div className="mb-5 flex flex-wrap items-center justify-center gap-2 sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {previous && (
            <Link
              href={`/plan/${previous.date}`}
              className="inline-flex items-center gap-1.5 rounded-control px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-soft hover:text-ink"
            >
              <PlainIcon name="arrowLeft" size={15} /> Day {previous.day}
            </Link>
          )}
          <span className="h-5 w-px bg-rule-soft" aria-hidden="true" />
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 rounded-control px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-soft hover:text-ink"
          >
            <PlainIcon name="calendar" size={15} /> Calendar
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={() => onAddMock(current.date)}>
            <PlainIcon name="plus" size={13} /> Add mock record
          </Button>
          {next && (
            <Link
              href={`/plan/${next.date}`}
              className="inline-flex items-center gap-1.5 rounded-control px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-soft hover:text-ink"
            >
              Day {next.day} <PlainIcon name="arrowRight" size={15} />
            </Link>
          )}
        </div>
      </div>

      {/* ---- Hero: eyebrow · big Day N · type · ring + counts ---- */}
      <header className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          {phase?.name ?? `Phase ${current.phase}`} · {longDate(current.date)}
          {current.date === today
            ? " · today"
            : current.date < today
              ? " · past"
              : " · upcoming"}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="text-[44px] font-semibold leading-none tracking-[-0.03em] text-ink">
              Day {current.day}
            </h1>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
              {current.dayType}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <DayRing
              value={stats.total ? stats.completed / stats.total : 0}
              label={`${stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%`}
            />
            <div className="text-sm leading-snug" aria-live="polite">
              <p className="font-medium text-ink tabular">
                {stats.completed}/{stats.total} assignments
              </p>
              <p className="mt-0.5 text-muted tabular">
                {checklistDone}/{current.checklist.length} checklist
              </p>
              {stats.dayCompleted && (
                <p className="mt-0.5 text-xs font-medium text-positive">
                  Day complete
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ---- Assignments + right rail ---- */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <section className="panel min-w-0" aria-label="Assignments">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule-soft px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <h2 className="font-serif text-lg font-medium">Assignments</h2>
              <p className="mt-0.5 text-[11px] text-muted">
                Your planned tests for today. Complete and log after attempting.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-control border border-rule-soft px-2.5 py-1.5 text-[11px] font-medium text-muted">
              <PlainIcon name="trend" size={13} /> Record results after
              attempting
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

        <aside className="flex min-w-0 flex-col gap-5">
          <section className="panel p-4 sm:p-5" aria-label="Daily checklist">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-serif text-lg font-medium">Daily checklist</h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  The plan&apos;s four habits for every study day.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[10px] tabular text-muted">
                  {checklistDone}/{current.checklist.length}
                </span>
                <span className="h-1.5 w-16 overflow-hidden rounded-pill bg-soft">
                  <span
                    className="block h-full rounded-pill bg-accent transition-[width] duration-200"
                    style={{
                      width: `${
                        current.checklist.length
                          ? (checklistDone / current.checklist.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </span>
              </div>
            </div>
            <ul className="mt-3.5 flex flex-col gap-3">
              {current.checklist.map((item) => (
                <li key={item.id}>
                  <label className="check-row text-[13px]">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) =>
                        toggleChecklist(current.day, item.id, e.target.checked)
                      }
                    />
                    <span className={item.done ? "text-muted line-through" : ""}>
                      {item.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-4 sm:p-5" aria-label="Revision">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-serif text-lg font-medium">Revision</h2>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                  {plan.revisionMethod.rev1}
                </p>
              </div>
            </div>
            {current.revisionTasks.length === 0 ? (
              <div className="mt-3 flex items-start gap-2.5 rounded-control border border-accent/25 bg-accent-soft px-3.5 py-3">
                <PlainIcon
                  name="target"
                  size={15}
                  className="mt-0.5 shrink-0 text-accent"
                />
                <p className="text-xs leading-relaxed text-ink">
                  No extra revision block scheduled for this day. You can add
                  one from the calendar or quick actions.
                </p>
              </div>
            ) : (
              <ul className="mt-3 flex flex-col gap-2.5">
                {current.revisionTasks.map((label, index) => {
                  const done = current.revisionDone.includes(String(index));
                  return (
                    <li key={index}>
                      <label className="check-row items-start text-[13px]">
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
                        <span className={done ? "text-muted line-through" : ""}>
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
    <section className="panel p-4 sm:p-5" aria-label="Logged attempts">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-medium">Logged attempts</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
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
        <div className="mt-3 flex items-start gap-3 rounded-control border border-dashed border-rule px-4 py-4">
          <PlainIcon
            name="file"
            size={17}
            className="mt-0.5 shrink-0 text-muted"
          />
          <p className="text-[11px] leading-relaxed text-muted">
            Nothing logged for this date yet. A scheduled plan test stays in
            the plan; logging its score adds a tracker attempt without moving
            the schedule.
          </p>
        </div>
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

/** Day-completion ring shown beside the Day N display. */
function DayRing({ value, label }: { value: number; label: string }) {
  const radius = 15.915;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="relative size-[72px] shrink-0">
      <svg viewBox="0 0 40 40" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="3" style={{ stroke: "var(--soft)" }} />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            stroke: "var(--accent)",
            strokeDasharray: `${circumference * clamped} ${circumference}`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="font-serif text-lg leading-none tabular text-ink">{label}</p>
      </div>
    </div>
  );
}

function taskIcon(type: PlanTaskView["type"]) {
  if (isMockType(type)) return "file" as const;
  switch (type) {
    case "maths_sectional":
    case "maths_topic":
      return "quant" as const;
    case "reasoning_sectional":
      return "reasoning" as const;
    case "english_sectional":
      return "english" as const;
    case "gk_sectional":
      return "ga" as const;
    case "computer_mock":
    case "computer_pyq":
      return "computer" as const;
    default:
      return "fileCheck" as const;
  }
}

function taskTile(type: PlanTaskView["type"]): string {
  if (isMockType(type)) return "bg-accent-soft text-accent";
  if (type.endsWith("_sectional")) return "bg-positive-soft text-positive";
  if (type === "maths_topic") return "bg-warning-soft text-warning";
  return "bg-soft text-muted";
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
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex items-start gap-3">
        <CompleteToggle
          completed={task.completed}
          label={`Mark ${task.name} ${task.completed ? "incomplete" : "complete"}`}
          onToggle={() => {
            updateTask(task.key, { completed: !task.completed });
            setOpen(!task.completed);
          }}
        />
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-control border border-transparent",
            taskTile(task.type),
          )}
          aria-hidden="true"
        >
          <PlainIcon name={taskIcon(task.type)} size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={cn("text-[14px] font-medium", task.completed && "text-muted line-through")}>
              {task.name}
            </p>
            <CategoryChip type={task.type} />
          </div>
          <p className="mt-1 text-[11px] text-muted tabular">
            {task.questions} Q · {task.marks} marks
            {task.completed && task.score != null ? ` · scored ${task.score}` : ""}
            {task.completed && task.score == null ? " · result not recorded" : ""}
          </p>
        </div>
        {onLogResult && !task.completed && (
          <Button
            variant="outline"
            size="sm"
            onClick={onLogResult}
            className="shrink-0 text-accent"
          >
            Log attempt
          </Button>
        )}
        {!onLogResult && !task.completed && task.url && (
          <a href={task.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <Button variant="outline" size="sm" className="text-accent">
              Start <PlainIcon name="arrowUpRight" size={12} />
            </Button>
          </a>
        )}
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${task.name} on RBE`}
          className="shrink-0 p-1 text-muted transition-colors hover:text-accent"
          onClick={(e) => e.stopPropagation()}
        >
          <PlainIcon name="chevronRight" size={15} />
        </a>
      </div>
      {task.completed && (
        <div className="mt-2 ml-0 sm:ml-[52px]">
          <button
            type="button"
            aria-expanded={open}
            className="text-[10px] text-muted hover:text-accent transition-colors"
            onClick={() => setOpen(!open)}
          >
            {open ? "Hide result & revision" : "Record result & revision"}
          </button>
          {open && <ResultEditor task={task} planApi={planApi} />}
        </div>
      )}
      {!task.completed && task.notes && (
        <p className="mt-2 ml-0 sm:ml-[52px] text-[10px] text-muted">{task.notes}</p>
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
      <p className="mt-2 text-[10px] text-muted">
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
    <section className="panel mt-5 p-4 sm:p-5" aria-label="Day notes">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-control border border-danger/30 bg-danger-soft text-danger"
            aria-hidden="true"
          >
            <PlainIcon name="fileCheck" size={17} />
          </span>
          <div>
            <h2 className="font-serif text-lg font-medium">
              Weak areas &amp; mistake notebook
            </h2>
            <p className="text-[11px] text-muted">Day notes</p>
          </div>
        </div>
        {savedAt && (
          <span role="status" className="text-[11px] text-positive">
            Saved {savedAt}
          </span>
        )}
      </div>
      <label>
        <span className="sr-only">Day notes</span>
        <textarea
          rows={4}
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
