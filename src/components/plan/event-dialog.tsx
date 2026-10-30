"use client";
import { Dialog } from "radix-ui";
import { Button } from "../ui/button";
import { PlainIcon } from "../icon";
import { CategoryChip, ResultLine } from "./plan-shared";
import { longDate } from "@/lib/format";
import type { PlanDayView, PlanTaskView } from "@/lib/plan/view-model";

/**
 * Plan-event detail dialog, shared by the calendar, My Tasks, and the
 * dashboard's upcoming list. Shows the full source assignment (name,
 * category, questions/marks, completion, recorded result, revision flags)
 * plus the day's checklist, with actions to toggle completion, open the
 * original RBE test in a new tab, and open the daily workspace.
 */
export function EventDialog({
  task,
  day,
  onClose,
  onToggleComplete,
  onOpenPlanDay,
}: {
  task: PlanTaskView | null;
  day?: PlanDayView;
  onClose: () => void;
  onToggleComplete: (task: PlanTaskView) => void;
  onOpenPlanDay: (date: string) => void;
}) {
  return (
    <Dialog.Root open={!!task} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 bg-ink/40 z-40" />
        <Dialog.Content className="event-dialog dialog-content fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-paper border border-rule rounded-panel w-[calc(100%-32px)] max-w-lg max-h-[85vh] overflow-auto p-6 shadow-pop">
          {task && (
            <>
              <Dialog.Title className="font-serif text-2xl leading-tight pr-8">
                {task.name}
              </Dialog.Title>
              <Dialog.Description className="muted text-xs mt-2 flex flex-wrap items-center gap-2">
                <CategoryChip type={task.type} />
                <span>
                  {longDate(task.date)} · Plan day {task.day}
                </span>
                <span className="tabular">
                  {task.questions} Q · {task.marks} marks
                </span>
              </Dialog.Description>
              <Dialog.Close
                className="absolute top-5 right-5 muted hover:text-ink transition-colors"
                aria-label="Close event"
              >
                <PlainIcon name="close" size={20} />
              </Dialog.Close>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                <PlanDoneState completed={task.completed} />
                <ResultLine task={task} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <RevFlag label="Rev-1 same day" done={task.rev1} />
                <RevFlag label="Rev-2 weekly" done={task.rev2} />
                <RevFlag label="Rev-3 final" done={task.rev3} />
              </dl>

              {day && day.revisionTasks.length > 0 && (
                <div className="mt-4 border-t border-rule-soft pt-4">
                  <p className="section-label mb-2">Day revision</p>
                  <ul className="space-y-1 text-xs muted">
                    {day.revisionTasks.map((rt) => (
                      <li key={rt}>{rt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {day && (
                <div className="mt-4 border-t border-rule-soft pt-4">
                  <p className="section-label mb-2">Daily checklist</p>
                  <ul className="space-y-1.5 text-xs">
                    {day.checklist.map((item) => (
                      <li key={item.id} className="flex items-center gap-2">
                        <span
                          className={`flex size-4 items-center justify-center rounded-[3px] border ${
                            item.done
                              ? "border-positive bg-positive-soft text-positive"
                              : "border-rule"
                          }`}
                          aria-hidden="true"
                        >
                          {item.done && <PlainIcon name="check" size={9} />}
                        </span>
                        <span className={item.done ? "muted line-through" : ""}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenPlanDay(task.date)}
                >
                  Open daily plan
                </Button>
                <a href={task.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <PlainIcon name="arrowUpRight" size={13} />
                    {task.linkLabel}
                  </Button>
                </a>
                <Button size="sm" onClick={() => onToggleComplete(task)}>
                  {task.completed ? "Mark incomplete" : "Mark complete"}
                </Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PlanDoneState({ completed }: { completed: boolean }) {
  return completed ? (
    <span className="inline-flex items-center gap-1 rounded-pill border border-positive/40 bg-positive-soft px-2 py-0.5 text-[10px] font-medium text-positive">
      <PlainIcon name="check" size={10} /> Completed
    </span>
  ) : (
    <span className="inline-flex items-center rounded-pill border border-rule-soft bg-soft px-2 py-0.5 text-[10px] font-medium text-muted">
      Not done yet
    </span>
  );
}

function RevFlag({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      className={`rounded-control border px-2.5 py-1.5 ${
        done ? "border-positive/40 bg-positive-soft text-positive" : "border-rule-soft bg-canvas text-muted"
      }`}
    >
      <dt className="text-[10px] font-medium">{label}</dt>
      <dd className="text-[10px]">{done ? "Done" : "Pending"}</dd>
    </div>
  );
}
