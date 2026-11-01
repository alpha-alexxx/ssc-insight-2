"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Skeleton } from "../ui/skeleton";
import { PlainIcon } from "../icon";
import { TRASH_KIND_META, type TrashKind } from "@/lib/trash-core";
import { trashDetailQueryOptions } from "@/lib/queries/trash";

/**
 * Read-only record detail for one trashed item.
 *
 * A Sheet rather than a route: the list must stay where the user left it —
 * selection, filters and page are all live state — and the detail is a
 * decision aid ("is this the mock I meant?"), not a destination. The server
 * formats every field, so this component renders strings and cannot invent a
 * number the product would not produce elsewhere.
 */
export function TrashDetailSheet({
  kind,
  id,
  onClose,
  onRestore,
  onPurge,
  busy,
}: {
  kind: TrashKind | null;
  id: string;
  onClose: () => void;
  onRestore: () => void;
  onPurge: () => void;
  busy: boolean;
}) {
  const query = useQuery(trashDetailQueryOptions(kind, id));
  const detail = query.data;

  return (
    <Sheet
      open={!!kind}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b border-rule pr-12">
          <p className="section-label">
            {kind ? TRASH_KIND_META[kind].module : "Trash"}
          </p>
          <SheetTitle className="truncate">
            {detail?.item.title ?? "Deleted record"}
          </SheetTitle>
          <SheetDescription>
            Recoverable until it expires — then it is gone for good.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5">
          {query.isError ? (
            <p role="alert" className="py-6 text-xs text-danger">
              This record could not be loaded.
            </p>
          ) : !detail ? (
            <div className="space-y-2 pt-2" role="status" aria-label="Loading details">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <>
              <dl className="divide-y divide-rule-soft border-y border-rule-soft">
                {detail.fields.map((field) => (
                  <div
                    key={field.label}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
                  >
                    <dt className="text-[0.6875rem] uppercase tracking-[0.08em] text-muted">
                      {field.label}
                    </dt>
                    <dd className="max-w-full min-w-0 text-right text-xs break-words">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {detail.subjects?.length ? (
                <div className="mt-5">
                  <p className="section-label mb-2">Subjects</p>
                  <table className="w-full text-xs tabular">
                    <caption className="sr-only">
                      Subject-level results for this deleted mock
                    </caption>
                    <thead>
                      <tr className="text-left text-[0.6875rem] text-muted">
                        <th scope="col" className="py-1 font-medium">
                          Subject
                        </th>
                        <th scope="col" className="py-1 text-right font-medium">
                          Questions
                        </th>
                        <th scope="col" className="py-1 text-right font-medium">
                          Correct
                        </th>
                        <th scope="col" className="py-1 text-right font-medium">
                          Wrong
                        </th>
                        <th scope="col" className="py-1 text-right font-medium">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule-soft">
                      {detail.subjects.map((subject) => (
                        <tr key={subject.subject}>
                          <th scope="row" className="py-1.5 text-left font-normal">
                            {subject.subject}
                          </th>
                          <td className="py-1.5 text-right">{subject.questions}</td>
                          <td className="py-1.5 text-right">{subject.correct}</td>
                          <td className="py-1.5 text-right">{subject.incorrect}</td>
                          <td className="py-1.5 text-right">{subject.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          )}
        </div>

        <SheetFooter className="border-t border-rule">
          <Button
            variant="outline"
            size="sm"
            onClick={onPurge}
            disabled={busy || !detail}
            className="text-danger hover:text-danger"
          >
            <PlainIcon name="trash" size={13} /> Delete permanently
          </Button>
          <Button size="sm" onClick={onRestore} disabled={busy || !detail}>
            <PlainIcon name="refresh" size={13} /> Restore
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
