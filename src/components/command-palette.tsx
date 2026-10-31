"use client";

import { useRouter } from "next/navigation";

import {
  NAV_GROUPS,
  VIEW_META,
  planHref,
} from "@/components/app-shell";
import { PlainIcon } from "@/components/icon";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import type { Attempt } from "@/lib/domain";
import { shortDate } from "@/lib/format";
import type {
  PersonalTaskView,
  PlanPayload,
  PlanTaskStatus,
} from "@/lib/plan/view-model";

/**
 * Global search palette (⌘K). One dialog over data the shell already holds —
 * navigation from the sidebar config, quick actions, and the client-resident
 * work corpora (personal tasks, the 50-day plan, mock attempts). No fetches
 * of its own: everything arrives as props from WorkspaceShell, and every
 * result routes through real hrefs so the shell's URL mirror stays
 * authoritative.
 */

const TASK_STATUS_LABELS: Record<PlanTaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  completed: "Done",
  skipped: "Skipped",
};

/** How many list items a data group may render — palettes skim, not scroll. */
const MAX_GROUP_ITEMS = 100;

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanPayload | null;
  personalTasks: PersonalTaskView[];
  attempts: Attempt[];
  aiEnabled: boolean;
  onAddMock: () => void;
  onOpenAi: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  plan,
  personalTasks,
  attempts,
  aiEnabled,
  onAddMock,
  onOpenAi,
}: CommandPaletteProps) {
  const router = useRouter();

  // Every result closes the palette first so the view swap starts under the
  // exiting dialog instead of a stale overlay.
  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  // "New task" mirrors the `n` shortcut on My Tasks: focus the quick-add bar
  // via the shell event. When we have to navigate first, wait for the view
  // swap to paint so the listener exists before the event fires.
  const newTask = () => {
    const onTasks = window.location.pathname.startsWith("/my-tasks");
    if (!onTasks) router.push("/my-tasks");
    const dispatch = () =>
      window.dispatchEvent(new Event("ssc:tasks-quick-add"));
    if (onTasks) {
      dispatch();
    } else {
      requestAnimationFrame(() => requestAnimationFrame(dispatch));
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, tasks, plan days, mocks…" />
      <CommandList>
        <CommandEmpty>
          Nothing matches — try a page, task, plan day, or mock name.
        </CommandEmpty>

        {NAV_GROUPS.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.label} ${item.href}`}
                keywords={[VIEW_META[item.view].label]}
                onSelect={() => run(() => router.push(item.href))}
              >
                <PlainIcon
                  name={VIEW_META[item.view].icon}
                  size={16}
                  tone="muted"
                />
                <span className="truncate">{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        <CommandGroup heading="Actions">
          <CommandItem
            value="Log a mock"
            keywords={["add attempt", "new mock", "record score"]}
            onSelect={() => run(onAddMock)}
          >
            <PlainIcon name="plus" size={16} tone="accent" />
            <span>Log a mock</span>
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="New task"
            keywords={["add task", "quick add", "personal task"]}
            onSelect={() => run(newTask)}
          >
            <PlainIcon name="check" size={16} tone="accent" />
            <span>New task</span>
          </CommandItem>
          {aiEnabled && (
            <CommandItem
              value="Ask AI"
              keywords={["chat", "assistant", "coach"]}
              onSelect={() => run(onOpenAi)}
            >
              <PlainIcon name="sparkles" size={16} tone="accent" />
              <span>Ask AI</span>
            </CommandItem>
          )}
        </CommandGroup>

        {personalTasks.length > 0 && (
          <CommandGroup heading="My tasks">
            {personalTasks.slice(0, MAX_GROUP_ITEMS).map((task) => (
              <CommandItem
                key={task.id}
                value={task.title}
                keywords={[task.notes, task.category].filter(Boolean)}
                onSelect={() => run(() => router.push("/my-tasks"))}
              >
                <PlainIcon name="check" size={16} tone="muted" />
                <span className="min-w-0 truncate">{task.title}</span>
                <span className="ml-auto shrink-0 pl-2 text-xs text-muted">
                  {task.dueDate
                    ? shortDate(task.dueDate)
                    : TASK_STATUS_LABELS[task.status]}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {plan && (
          <CommandGroup heading="Plan days">
            {plan.days.map((day) => {
              const phase = plan.phases.find((p) => p.phase === day.phase);
              return (
                <CommandItem
                  key={day.day}
                  value={`Plan day ${day.day} ${day.weekday} ${shortDate(day.date)}`}
                  keywords={[
                    ...day.tasks.map((task) => task.name),
                    ...day.revisionTasks,
                    phase?.name ?? "",
                  ].filter(Boolean)}
                  onSelect={() => run(() => router.push(planHref(day.date)))}
                >
                  <PlainIcon name="calendar" size={16} tone="muted" />
                  <span className="min-w-0 truncate">
                    Day {day.day} · {day.weekday} {shortDate(day.date)}
                  </span>
                  <span className="ml-auto shrink-0 pl-2 text-xs text-muted">
                    {phase?.name}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {attempts.length > 0 && (
          <CommandGroup heading="Mock attempts">
            {attempts.slice(0, MAX_GROUP_ITEMS).map((attempt) => (
              <CommandItem
                key={attempt.id}
                value={`${attempt.name} ${attempt.platform}`}
                keywords={[shortDate(attempt.completedAt), attempt.type]}
                onSelect={() =>
                  run(() =>
                    router.push(
                      `/history?search=${encodeURIComponent(attempt.name)}`,
                    ),
                  )
                }
              >
                <PlainIcon name="history" size={16} tone="muted" />
                <span className="min-w-0 truncate">{attempt.name}</span>
                <span className="ml-auto shrink-0 pl-2 text-xs text-muted">
                  {attempt.platform} · {shortDate(attempt.completedAt)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
