"use client";
import { Dialog, AlertDialog } from "radix-ui";
import { PlainIcon } from "./icon";
import { Button } from "./ui/button";
import {
  SUBJECTS,
  subjectStats,
  totals,
  formatNumber as n,
  formatTime,
  type Attempt,
} from "@/lib/domain";
import { longDate, mockTypeLabel } from "@/lib/format";

/**
 * Result detail dialog + delete confirmation (Phase 6 + 11).
 * The native window.confirm() is replaced by a themable Radix AlertDialog:
 * focus is trapped, Escape cancels, and the destructive action requires an
 * explicit activation. Dialog enter/exit run on CSS data-state animations.
 */

const typeName = mockTypeLabel;

export function MockDetailDialog({
  attempt,
  onClose,
  onEdit,
  onCompare,
  onDelete,
  busy,
}: {
  attempt: Attempt | null;
  onClose: () => void;
  onEdit: (attempt: Attempt) => void;
  onCompare: (attempt: Attempt) => void;
  /** Confirm deletion. The dialog itself only opens the confirm step. */
  onDelete: (attempt: Attempt) => void;
  busy: boolean;
}) {
  const detail = attempt;
  return (
    <Dialog.Root
      open={!!detail}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 bg-ink/40 z-40" />
        <Dialog.Content className="dialog-content fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-paper border border-rule rounded-panel w-[calc(100%-32px)] max-w-4xl max-h-[85vh] overflow-auto p-6 md:p-8 shadow-pop">
          <Dialog.Title className="font-serif text-3xl leading-tight pr-8">
            {detail?.name}
          </Dialog.Title>
          <Dialog.Description className="muted text-xs mt-2">
            {detail &&
              `${detail.platform} · ${typeName(detail.type)} · attempted ${longDate(detail.completedAt)}${
                detail.createdAt ? ` · logged ${longDate(detail.createdAt)}` : ""
              }`}
          </Dialog.Description>
          <Dialog.Close
            className="absolute top-5 right-5 muted hover:text-ink transition-colors"
            aria-label="Close result"
          >
            <PlainIcon name="close" size={20} />
          </Dialog.Close>
          {detail && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 py-7 tabular">
                {[
                  {
                    label: "Score",
                    value: `${n(totals(detail).score)} / ${totals(detail).maxScore}`,
                  },
                  {
                    label: "Accuracy",
                    value:
                      totals(detail).accuracy == null
                        ? "—"
                        : `${n(totals(detail).accuracy, 2)}%`,
                  },
                  {
                    label: "Rank",
                    value: detail.rank
                      ? `${n(detail.rank)} / ${n(detail.participants)}`
                      : "—",
                  },
                  {
                    label: "Percentile",
                    value:
                      detail.percentile != null
                        ? `${n(detail.percentile, 2)}%`
                        : "—",
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xs muted mb-1">{s.label}</p>
                    <p className="font-serif text-2xl">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-auto">
                <table className="w-full text-xs tabular">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Score</th>
                      <th>Correct</th>
                      <th>Incorrect</th>
                      <th>Skipped</th>
                      <th>Accuracy</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.subjects.map((s) => {
                      const t = subjectStats(s, detail.marking);
                      return (
                        <tr key={s.subjectId}>
                          <td>{SUBJECTS[s.subjectId].short}</td>
                          <td>
                            {n(t.score)} / {t.maxScore}
                          </td>
                          <td>{s.correct}</td>
                          <td>{s.incorrect}</td>
                          <td>{t.unattempted}</td>
                          <td>
                            {n(t.accuracy)}
                            {t.accuracy != null ? "%" : ""}
                          </td>
                          <td>{formatTime(s.timeSeconds)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs muted">
                Overall: {totals(detail).attempted} attempted ·{" "}
                {formatTime(totals(detail).timeSeconds)}
              </p>
              {detail.notes && (
                <p className="text-sm mt-5 p-4 bg-canvas rounded-control whitespace-pre-wrap">
                  {detail.notes}
                </p>
              )}
              <div className="flex flex-wrap justify-between gap-3 mt-7">
                <DeleteMockButton attempt={detail} onDelete={onDelete} disabled={busy} />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCompare(detail)}
                  >
                    Compare
                  </Button>
                  <Button size="sm" onClick={() => onEdit(detail)}>
                    Edit result
                  </Button>
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Destructive zone of the detail dialog: opens the confirm AlertDialog. */
function DeleteMockButton({
  attempt,
  onDelete,
  disabled,
}: {
  attempt: Attempt;
  onDelete: (attempt: Attempt) => void;
  disabled: boolean;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <Button variant="destructive" size="sm" disabled={disabled}>
          Move to Trash
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay fixed inset-0 bg-ink/40 z-50" />
        <AlertDialog.Content className="dialog-content fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-paper border border-rule rounded-panel w-[calc(100%-32px)] max-w-md p-6 shadow-pop">
          <AlertDialog.Title className="font-serif text-2xl leading-tight">
            Move “{attempt.name}” to Trash?
          </AlertDialog.Title>
          <AlertDialog.Description className="muted text-sm mt-2 leading-relaxed">
            The result leaves your charts, averages and insights right away, and
            stays recoverable in Trash for 15 days.
          </AlertDialog.Description>
          <div className="flex justify-end gap-2 mt-6">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" size="sm">
                Keep mock
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(attempt)}
              >
                Move to Trash
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
