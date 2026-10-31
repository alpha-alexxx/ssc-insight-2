"use client";

import { useRef, useState } from "react";
import {
  CalendarClock,
  ChevronRight,
  Info,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Button } from "../ui/button";
import { api } from "@/lib/api-client";
import { addIsoDays, istTodayIso } from "@/lib/plan/view-model";
import { cn } from "@/lib/utils";
import { useInvalidateTodos, useTodoList } from "../use-todos-data";
import type { Task, TaskDraft, TaskListResponse, Subtask } from "./types";

type Proposal = {
  type: "create" | "update" | "delete";
  id?: string;
  version?: number;
  data?: TaskDraft;
};
type DraftResponse = {
  needsDates: boolean;
  question?: string;
  operations: Proposal[];
  before?: Record<string, Task>;
  contextTruncated?: boolean;
};

/** The same explicit-date, review-before-write workflow in planner and AI sheet.
 * Extracted from plan/personal-todos.tsx so the My Tasks workspace, the AI
 * sheet tab, and any future host share one implementation. */
export function TodoAiComposer({
  onChanged,
  compact = false,
}: {
  onChanged?: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(compact),
    [prompt, setPrompt] = useState(""),
    [date, setDate] = useState(""),
    [endDate, setEndDate] = useState("");
  const [draft, setDraft] = useState<DraftResponse | null>(null),
    [selected, setSelected] = useState<number[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const token = useRef(crypto.randomUUID());
  const reference = useTodoList<TaskListResponse>("limit=100&view=all");
  const invalidateTodos = useInvalidateTodos();
  const groups = reference.data?.groups ?? [];
  const existingTodos = reference.data?.items ?? [];
  const duplicateLookupTruncated =
    (reference.data?.total ?? 0) > existingTodos.length;
  const loadTodoReference = reference.refresh;
  async function generate() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await api<DraftResponse>("/api/ai/todos", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          date: date || undefined,
          endDate: endDate || undefined,
        }),
      });
      setDraft(result);
      setSelected(result.operations.map((_, i) => i));
      token.current = crypto.randomUUID();
      void loadTodoReference();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not prepare todos. Your existing todos are unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }
  function changeOperation(index: number, patch: TaskDraft) {
    setDraft((current) =>
      current
        ? {
            ...current,
            operations: current.operations.map((op, i) =>
              i === index ? { ...op, data: { ...op.data, ...patch } } : op,
            ),
          }
        : null,
    );
    token.current = crypto.randomUUID();
  }
  function proposedValue(op: Proposal, before: Task | null) {
    const rawSubtasks: Subtask[] = op.data?.subtasks ?? before?.subtasks ?? [];
    const explicitCompletion = op.data?.completed;
    const completed =
      explicitCompletion !== undefined
        ? explicitCompletion
        : rawSubtasks.length
          ? rawSubtasks.every((subtask) => subtask.completed)
          : before?.status === "completed";
    const subtasks =
      explicitCompletion === undefined
        ? rawSubtasks
        : rawSubtasks.map((subtask) => ({
            ...subtask,
            completed: explicitCompletion,
          }));
    return {
      title: op.data?.title ?? before?.title ?? "",
      dueDate: op.data?.dueDate ?? before?.dueDate ?? "",
      subtasks,
      completed,
    };
  }
  function duplicateWarning(index: number, op: Proposal, before: Task | null) {
    if (op.type === "delete") return "";
    const value = proposedValue(op, before);
    const title = value.title.trim().toLocaleLowerCase();
    if (!title || !value.dueDate) return "";
    const existing = existingTodos.some(
      (todo) =>
        todo.id !== op.id &&
        todo.dueDate === value.dueDate &&
        todo.title.trim().toLocaleLowerCase() === title,
    );
    const proposed = draft?.operations.some((other, otherIndex) => {
      if (otherIndex === index || other.type === "delete") return false;
      const otherBefore = other.id ? (draft.before?.[other.id] ?? null) : null;
      const otherValue = proposedValue(other, otherBefore);
      return (
        otherValue.dueDate === value.dueDate &&
        otherValue.title.trim().toLocaleLowerCase() === title
      );
    });
    return existing || proposed
      ? "Likely duplicate: another todo has the same title and date. You can still apply it."
      : "";
  }
  async function apply() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/todos/apply", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: token.current,
          operations: draft.operations.filter((_, i) => selected.includes(i)),
        }),
      });
      await invalidateTodos();
      onChanged?.();
      setDraft(null);
      setSelected([]);
      setSuccess("Your selected changes were applied.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not apply your changes. Your draft is still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={cn("flex flex-col gap-5", !compact && "panel p-4")}
      aria-label="AI todo assistant"
    >
      {compact && (
        <>
          <div>
            <h3 className="font-serif text-2xl font-medium leading-tight">
              Plan your study todos
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Create revision todos, add new tasks, or reschedule unfinished
              work based on your plan and progress.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-card bg-accent-soft p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-paper text-accent">
              <CalendarClock size={23} />
            </span>
            <div className="min-w-0">
              <h4 className="text-sm font-medium">Set your plan</h4>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Choose dates and tell the coach what you want to plan. Review
                the proposed todos before applying changes.
              </p>
            </div>
          </div>
        </>
      )}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-xl">Plan with AI</h3>
            <p className="mt-1 text-xs text-muted">
              Describe the work. Review every change before it is saved.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            {open ? "Close assistant" : "Create with AI"}
          </Button>
        </div>
      )}
      {open && (
        <>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void generate();
            }}
          >
            <label>
              What would you like to plan?
              <textarea
                required
                maxLength={4000}
                rows={compact ? 5 : 3}
                className={
                  compact
                    ? "mt-2 resize-y rounded-card text-sm leading-relaxed"
                    : undefined
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Create revision todos for my weaker subjects, or reschedule unfinished work…"
                disabled={busy}
              />
              {compact && (
                <span className="mt-1 block text-right text-xs font-normal tabular-nums text-muted">
                  {prompt.length.toLocaleString("en-IN")} / 4,000
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                Start date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label>
                End date (optional)
                <input
                  type="date"
                  min={date || undefined}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>
            {compact && (
              <div className="rounded-card bg-soft p-4">
                <div className="flex items-start gap-2.5">
                  <Zap size={19} className="mt-0.5 shrink-0 text-accent" />
                  <div>
                    <h4 className="text-sm font-medium">Quick options</h4>
                    <p className="mt-1 text-xs text-muted">
                      Use a template to get started faster.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setDate(istTodayIso());
                      setEndDate(addIsoDays(istTodayIso(), 6));
                      setPrompt(
                        "Plan my study todos for the next 7 days based on my progress and unfinished work.",
                      );
                    }}
                  >
                    Next 7 days
                  </Button>
                  {[
                    [
                      "Revision plan",
                      "Create revision todos based on my study plan and recent mock performance.",
                    ],
                    [
                      "Weak topics",
                      "Create practice and revision todos for my weaker subjects and topics.",
                    ],
                    [
                      "Finish backlog",
                      "Review my unfinished todos and propose a manageable rescheduling plan.",
                    ],
                  ].map(([label, value]) => (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => setPrompt(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted">
              Choose the dates explicitly. AI can use your mock performance,
              study plan, and personal todo notes and subtasks. This context is
              sent to your configured provider; credentials and account identity
              are excluded.
            </p>
            <Button
              className={
                compact ? "relative min-h-11 w-full justify-center gap-2 px-10" : undefined
              }
              disabled={busy || !prompt.trim()}
            >
              {compact && <Sparkles size={18} />}
              {busy
                ? "Working…"
                : draft
                  ? "Generate new draft"
                  : "Prepare draft"}
              {compact && <ChevronRight size={17} className="absolute right-3" />}
            </Button>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
              {compact && <Info size={16} className="mt-0.5 shrink-0" />}
              <span>
                Generating does not save anything. Manual todo entry works
                without AI.
              </span>
            </p>
          </form>
          {draft?.needsDates && (
            <p
              role="status"
              className="border border-warning bg-warning-soft p-3 text-sm text-warning"
            >
              {draft.question ??
                "Which date or date range should these todos use?"}{" "}
              Choose the dates above, then prepare the draft again.
            </p>
          )}
          {draft && !draft.needsDates && (
            <div className="space-y-4 border-t border-rule-soft pt-4">
              <div>
                <h4 className="font-serif text-lg">Review proposed changes</h4>
                <p className="mt-1 text-xs text-muted">
                  Only selected changes will be applied. Deletions move todos to
                  Trash.
                </p>
                {draft.contextTruncated && (
                  <p className="mt-2 text-xs text-warning">
                    Only part of your task history fitted in the AI context.
                    Review suggestions against the rest of your planner.
                  </p>
                )}
              </div>
              {!draft.operations.length && (
                <p className="text-sm text-muted">
                  No changes proposed. Try a more specific instruction.
                </p>
              )}
              {draft.operations.map((op, index) => {
                const before = op.id ? draft.before?.[op.id] : null;
                const after = proposedValue(op, before ?? null);
                const duplicate = duplicateWarning(index, op, before ?? null);
                return (
                  <article
                    key={index}
                    className={cn(
                      "space-y-3 border p-3",
                      op.type === "delete"
                        ? "border-danger bg-danger-soft"
                        : "border-rule-soft bg-paper",
                    )}
                  >
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={selected.includes(index)}
                        disabled={busy}
                        onChange={(e) => {
                          setSelected(
                            e.target.checked
                              ? [...selected, index]
                              : selected.filter((i) => i !== index),
                          );
                          token.current = crypto.randomUUID();
                        }}
                      />
                      <span className="text-sm font-medium">
                        {op.type === "create"
                          ? "Add todo"
                          : op.type === "delete"
                            ? "Move to Trash"
                            : "Update todo"}
                      </span>
                    </label>
                    {before && (
                      <div className="space-y-1 text-xs text-muted">
                        <p className="font-medium text-ink">Before</p>
                        <p className="break-words">
                          {before.title} · {before.dueDate ?? "Needs date"} ·{" "}
                          {before.priority} priority · {before.status} ·{" "}
                          {groups.find((group) => group.id === before.groupId)
                            ?.name ?? "Ungrouped"}
                        </p>
                        {before.notes && (
                          <p className="whitespace-pre-wrap break-words">
                            {before.notes}
                          </p>
                        )}
                        {before.subtasks?.length > 0 && (
                          <p>
                            {before.subtasks
                              .map(
                                (s) =>
                                  `${s.completed ? "Done: " : ""}${s.title}`,
                              )
                              .join("; ")}
                          </p>
                        )}
                      </div>
                    )}
                    {op.type !== "delete" && (
                      <div className="space-y-3">
                        <p className="text-xs font-medium">
                          {before ? "After" : "New todo"}
                        </p>
                        <label>
                          Title
                          <input
                            required
                            maxLength={200}
                            value={op.data?.title ?? before?.title ?? ""}
                            onChange={(e) =>
                              changeOperation(index, { title: e.target.value })
                            }
                            disabled={busy}
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            Date
                            <input
                              type="date"
                              required
                              value={op.data?.dueDate ?? before?.dueDate ?? ""}
                              onChange={(e) =>
                                changeOperation(index, {
                                  dueDate: e.target.value,
                                })
                              }
                              disabled={busy}
                            />
                          </label>
                          <label>
                            Priority
                            <select
                              value={
                                op.data?.priority ??
                                before?.priority ??
                                "normal"
                              }
                              onChange={(e) =>
                                changeOperation(index, {
                                  priority: e.target.value,
                                })
                              }
                              disabled={busy}
                            >
                              <option value="high">High</option>
                              <option value="normal">Normal</option>
                              <option value="low">Low</option>
                            </select>
                          </label>
                        </div>
                        <label>
                          Group
                          <select
                            value={
                              op.data?.groupId !== undefined
                                ? (op.data.groupId ?? "")
                                : (before?.groupId ?? "")
                            }
                            disabled={busy}
                            onChange={(event) =>
                              changeOperation(index, {
                                groupId: event.target.value || null,
                              })
                            }
                          >
                            <option value="">Ungrouped</option>
                            {groups.map((group) => (
                              <option key={group.id} value={group.id}>
                                {group.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Notes
                          <textarea
                            rows={2}
                            maxLength={2000}
                            value={op.data?.notes ?? before?.notes ?? ""}
                            onChange={(e) =>
                              changeOperation(index, { notes: e.target.value })
                            }
                            disabled={busy}
                          />
                        </label>
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={after.completed}
                            disabled={busy}
                            onChange={(event) => {
                              const completed = event.target.checked;
                              changeOperation(index, {
                                completed,
                                subtasks: after.subtasks.map((subtask) => ({
                                  ...subtask,
                                  completed,
                                })),
                              });
                            }}
                          />
                          <span>Complete todo and all subtasks</span>
                        </label>
                        {after.subtasks.map((sub, i) => (
                          <div
                            key={sub.id ?? i}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              aria-label={`Complete proposed subtask ${i + 1}`}
                              checked={sub.completed}
                              disabled={busy}
                              onChange={(event) =>
                                changeOperation(index, {
                                  subtasks: after.subtasks.map((item, n) =>
                                    n === i
                                      ? {
                                          ...item,
                                          completed: event.target.checked,
                                        }
                                      : item,
                                  ),
                                  completed: undefined,
                                })
                              }
                            />
                            <label className="min-w-0 flex-1">
                              Subtask {i + 1}
                              <input
                                maxLength={200}
                                value={sub.title}
                                disabled={busy}
                                onChange={(event) =>
                                  changeOperation(index, {
                                    subtasks: after.subtasks.map((item, n) =>
                                      n === i
                                        ? {
                                            ...item,
                                            title: event.target.value,
                                          }
                                        : item,
                                    ),
                                    completed: undefined,
                                  })
                                }
                              />
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={busy}
                              aria-label={`Remove proposed subtask ${i + 1}`}
                              onClick={() =>
                                changeOperation(index, {
                                  subtasks: after.subtasks.filter(
                                    (_, n) => n !== i,
                                  ),
                                  completed: undefined,
                                })
                              }
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            changeOperation(index, {
                              subtasks: [
                                ...after.subtasks,
                                {
                                  id: crypto.randomUUID(),
                                  title: "",
                                  completed: false,
                                },
                              ],
                              completed: undefined,
                            })
                          }
                        >
                          Add subtask
                        </Button>
                        {duplicate && (
                          <p
                            role="status"
                            className="border border-warning bg-warning-soft p-2 text-xs text-warning"
                          >
                            {duplicate}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
              {duplicateLookupTruncated && (
                <p className="text-xs text-muted">
                  Duplicate hints compare this draft with the first 100 active
                  todos. Review older todos in All if needed.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={
                    busy ||
                    !selected.length ||
                    draft.operations.some(
                      (op, i) =>
                        selected.includes(i) &&
                        op.type !== "delete" &&
                        (!(
                          op.data?.title ?? draft.before?.[op.id ?? ""]?.title
                        )?.trim() ||
                          !(
                            op.data?.dueDate ??
                            draft.before?.[op.id ?? ""]?.dueDate
                          ) ||
                          (op.data?.subtasks ?? []).some(
                            (sub) => !sub.title.trim(),
                          )),
                    )
                  }
                  onClick={() => void apply()}
                >
                  Confirm {selected.length}{" "}
                  {selected.length === 1 ? "change" : "changes"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setDraft(null);
                    setSelected([]);
                  }}
                >
                  Discard draft
                </Button>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm leading-relaxed text-danger">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-sm text-positive">
              {success}
            </p>
          )}
        </>
      )}
    </section>
  );
}
