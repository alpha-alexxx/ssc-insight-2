"use client";

import { useState, type CSSProperties } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "../ui/button";
import { useOverlayFocus, useOverlayViewport } from "../use-overlay-viewport";
import { safeHttpUrlCore } from "@/lib/plan/view-model";
import { cn } from "@/lib/utils";
import type {
  Subtask,
  Task,
  TaskDraft,
  TaskGroup,
  TaskPriority,
  TaskStatus,
} from "./types";

const PRIORITIES: { id: TaskPriority; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "High" },
];
const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Done" },
];

/**
 * Create/edit dialog with progressive disclosure: title, date, and priority
 * are always visible; group, link, notes, and subtasks live under
 * "More options". `onSave` resolves true when persisted, so "Save & add
 * another" can reset the form. Renders as a bottom sheet on phones via the
 * shared .task-editor-dialog CSS.
 */
export function TaskEditor({
  todo,
  groups,
  busy = false,
  error = "",
  onSave,
  onCreateGroup,
  onClose,
}: {
  todo: Task;
  groups: TaskGroup[];
  busy?: boolean;
  /** Parent-level error (e.g. a 409 from a stale save). */
  error?: string;
  onSave: (draft: TaskDraft) => Promise<boolean>;
  /** Inline group creation; resolves the new group id, or null on failure. */
  onCreateGroup?: (name: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const viewport = useOverlayViewport(true);
  const overlayFocus = useOverlayFocus();
  const editing = Boolean(todo.id);
  const [title, setTitle] = useState(todo.title);
  const [date, setDate] = useState(todo.dueDate ?? "");
  const [priority, setPriority] = useState<TaskPriority>(
    (todo.priority as TaskPriority) || "normal",
  );
  const [status, setStatus] = useState<TaskStatus>(
    (todo.status as TaskStatus) || "todo",
  );
  const [groupId, setGroupId] = useState(todo.groupId ?? "");
  const [url, setUrl] = useState(todo.url ?? "");
  const [notes, setNotes] = useState(todo.notes ?? "");
  const [subtasks, setSubtasks] = useState<Subtask[]>(todo.subtasks);
  const [newSub, setNewSub] = useState("");
  const hasMore = Boolean(
    todo.groupId || todo.url || todo.notes || todo.subtasks.length,
  );
  const [moreOpen, setMoreOpen] = useState(editing && hasMore);
  const [groupForm, setGroupForm] = useState<string | null>(null);
  const [groupError, setGroupError] = useState("");
  const [localError, setLocalError] = useState("");

  const urlProblem =
    url && !safeHttpUrlCore(url)
      ? "Use a full link starting with https:// or http://"
      : "";

  function addSubtask() {
    const value = newSub.trim();
    if (!value) return;
    setSubtasks((list) => [
      ...list,
      { id: crypto.randomUUID(), title: value, completed: false },
    ]);
    setNewSub("");
  }

  function buildDraft(): TaskDraft | null {
    if (!title.trim()) {
      setLocalError("Give the task a title.");
      return null;
    }
    if (!date) {
      setLocalError("Choose a due date.");
      return null;
    }
    setLocalError("");
    const draft: TaskDraft = {
      title: title.trim(),
      dueDate: date,
      priority,
      notes,
      url,
      groupId: groupId || null,
      subtasks: subtasks
        .map((sub) => ({ ...sub, title: sub.title.trim() }))
        .filter((sub) => sub.title),
    };
    if (editing) draft.status = status;
    else if (status === "completed") draft.completed = true;
    return draft;
  }

  async function save(keepOpen: boolean) {
    const draft = buildDraft();
    if (!draft) return;
    const ok = await onSave(draft);
    if (!ok) return;
    if (keepOpen) {
      onClose();
      return;
    }
    // Save & add another: keep the date and group, clear everything else.
    setTitle("");
    setSubtasks([]);
    setNotes("");
    setUrl("");
    setPriority("normal");
    setStatus("todo");
    setMoreOpen(Boolean(groupId) || groupForm !== null);
  }

  async function createGroup() {
    if (!onCreateGroup || !groupForm?.trim()) return;
    setGroupError("");
    const id = await onCreateGroup(groupForm.trim());
    if (id) {
      setGroupId(id);
      setGroupForm(null);
    } else {
      setGroupError("Could not create the group. Try again.");
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content
          {...overlayFocus}
          style={
            viewport
              ? ({
                  "--task-viewport-height": `${viewport.height}px`,
                  "--task-viewport-top": `${viewport.top}px`,
                } as CSSProperties)
              : undefined
          }
          aria-describedby="task-editor-description"
          className="task-editor-dialog"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="font-serif text-2xl">
                {editing ? "Edit task" : "Add task"}
              </Dialog.Title>
              <Dialog.Description
                id="task-editor-description"
                className="mt-1 text-xs text-muted"
              >
                {editing
                  ? "Update the details below; status also cycles from the list."
                  : "Start with the essentials — subtasks and links can be added anytime."}
              </Dialog.Description>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close editor"
              disabled={busy}
              onClick={onClose}
            >
              <X size={18} />
            </Button>
          </div>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save(true);
            }}
          >
            <label>
              Task
              <input
                value={title}
                maxLength={200}
                required
                placeholder="e.g. Revise algebra — chapter 4"
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <label>
                Due date
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <fieldset>
                <legend className="mb-[var(--label-gap)] text-xs font-medium text-muted">
                  Priority
                </legend>
                <div
                  role="group"
                  aria-label="Priority"
                  className="segment-group w-full"
                >
                  {PRIORITIES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={priority === item.id}
                      className="segment flex-1 justify-center"
                      onClick={() => setPriority(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            {editing && (
              <fieldset>
                <legend className="mb-[var(--label-gap)] text-xs font-medium text-muted">
                  Status
                </legend>
                <div
                  role="group"
                  aria-label="Status"
                  className="segment-group w-full"
                >
                  {STATUSES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={status === item.id}
                      className="segment flex-1 justify-center"
                      onClick={() => setStatus(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              aria-expanded={moreOpen}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
            >
              <ChevronDown
                size={14}
                className={cn(
                  "transition-transform motion-reduce:transition-none",
                  moreOpen && "rotate-180",
                )}
              />
              More options
              {hasMore && !moreOpen && (
                <span
                  className="size-1.5 rounded-full bg-accent"
                  aria-hidden="true"
                />
              )}
            </button>
            {moreOpen && (
              <div className="space-y-4 rounded-card border border-rule-soft bg-canvas/50 p-3.5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label>
                    Group
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                    >
                      <option value="">Ungrouped</option>
                      {groups
                        .filter((group) => group.id)
                        .map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="min-w-0">
                    {onCreateGroup && groupForm === null ? (
                      <button
                        type="button"
                        onClick={() => setGroupForm("")}
                        className="mt-[calc(1rem+var(--label-gap))] inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                      >
                        <Plus size={12} /> New group
                      </button>
                    ) : onCreateGroup && groupForm !== null ? (
                      <div>
                        <label>
                          New group name
                          <input
                            autoFocus
                            value={groupForm}
                            maxLength={80}
                            placeholder="e.g. Maths revision"
                            onChange={(e) => setGroupForm(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void createGroup();
                              }
                            }}
                          />
                        </label>
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy || !groupForm.trim()}
                            onClick={() => void createGroup()}
                          >
                            Create
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setGroupForm(null);
                              setGroupError("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                        {groupError && (
                          <p role="alert" className="mt-1 text-xs text-danger">
                            {groupError}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
                <label>
                  External link
                  <input
                    type="url"
                    value={url}
                    maxLength={2048}
                    placeholder="https://…"
                    onChange={(e) => setUrl(e.target.value)}
                    aria-invalid={Boolean(urlProblem)}
                  />
                </label>
                {urlProblem && (
                  <p role="alert" className="text-xs text-danger">
                    {urlProblem}
                  </p>
                )}
                <label>
                  Notes
                  <textarea
                    value={notes}
                    maxLength={2000}
                    rows={3}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                <fieldset className="space-y-2.5">
                  <legend className="mb-2 text-sm font-medium">
                    Subtasks
                  </legend>
                  <p className="text-xs text-muted">
                    Subtasks share this task&apos;s date. Completing all of
                    them marks the task done.
                  </p>
                  {subtasks.map((sub, index) => (
                    <div key={sub.id} className="flex items-center gap-2">
                      <input
                        aria-label={`Complete subtask ${sub.title}`}
                        type="checkbox"
                        checked={sub.completed}
                        onChange={(e) =>
                          setSubtasks(
                            subtasks.map((item, n) =>
                              n === index
                                ? { ...item, completed: e.target.checked }
                                : item,
                            ),
                          )
                        }
                      />
                      <input
                        aria-label={`Subtask ${index + 1}`}
                        value={sub.title}
                        required
                        maxLength={200}
                        className="min-w-0 flex-1"
                        onChange={(e) =>
                          setSubtasks(
                            subtasks.map((item, n) =>
                              n === index
                                ? { ...item, title: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove subtask ${sub.title}`}
                        onClick={() =>
                          setSubtasks(subtasks.filter((_, n) => n !== index))
                        }
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      aria-label="New subtask"
                      placeholder="Add a subtask and press Enter…"
                      value={newSub}
                      maxLength={200}
                      className="min-w-0 flex-1"
                      onChange={(e) => setNewSub(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSubtask();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!newSub.trim()}
                      onClick={addSubtask}
                    >
                      Add
                    </Button>
                  </div>
                </fieldset>
              </div>
            )}
            {(localError || error) && (
              <p role="alert" className="text-sm text-danger">
                {localError || error}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t border-rule-soft pt-4">
              {!editing && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void save(false)}
                >
                  Save &amp; add another
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save changes" : "Add task"}
                </Button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
