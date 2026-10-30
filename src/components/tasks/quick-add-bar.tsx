"use client";

import { useRef, useState, type RefObject } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import { PlainIcon } from "../icon";
import { shortDate } from "@/lib/format";

/**
 * The always-visible capture bar: type a title, press Enter, and the task is
 * created with sensible defaults (due on the shown date, normal priority).
 * "Details" opens the full editor for subtasks, links, and groups.
 */
export function QuickAddBar({
  date,
  disabled = false,
  inputRef,
  onAdd,
  onDetails,
}: {
  /** ISO date the task will be due on (today, or the calendar-selected day). */
  date: string;
  disabled?: boolean;
  /** Ref forwarded so the N shortcut can focus the input. */
  inputRef?: RefObject<HTMLInputElement | null>;
  onAdd: (title: string) => Promise<boolean>;
  onDetails: () => void;
}) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    const ok = await onAdd(value);
    setBusy(false);
    if (ok) {
      setTitle("");
      ref.current?.focus();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex items-center gap-1.5 rounded-control border border-rule bg-paper p-1.5 transition-colors focus-within:border-accent"
    >
      <PlainIcon
        name="plus"
        size={15}
        className="ml-2 shrink-0 text-muted"
        aria-hidden="true"
      />
      <input
        ref={ref}
        value={title}
        maxLength={200}
        aria-label="New task title"
        placeholder={`Add a task for ${shortDate(date)}…`}
        disabled={disabled || busy}
        onChange={(e) => setTitle(e.target.value)}
        className="min-w-0 flex-1 border-0 bg-transparent px-1.5 shadow-none"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={onDetails}
        aria-label="Open the full task editor"
        title="More options: subtasks, link, notes, group"
      >
        <SlidersHorizontal size={13} />
        <span className="hidden sm:inline">Details</span>
      </Button>
      <Button type="submit" size="sm" disabled={disabled || busy || !title.trim()}>
        <Plus size={14} />
        Add
      </Button>
    </form>
  );
}
