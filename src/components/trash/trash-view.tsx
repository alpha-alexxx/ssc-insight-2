"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Panel } from "../dashboard-panels";
import { PlainIcon } from "../icon";
import { Skeleton } from "../ui/skeleton";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "../toast";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from "../ui/pagination";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { TrashDetailSheet } from "./trash-detail-sheet";
import {
  TRASH_EXPIRING_DAYS,
  TRASH_KIND_META,
  TRASH_KIND_ORDER,
  TRASH_RETENTION_DAYS,
  type TrashItem,
  type TrashKind,
  type TrashOutcome,
} from "@/lib/trash-core";
import { longDate, shortDate } from "@/lib/format";
import {
  TRASH_INVALIDATE_SCOPES,
  emptyTrashRequest,
  purgeTrashRequest,
  restoreTrashRequest,
  trashListParams,
  trashListQueryOptions,
} from "@/lib/queries/trash";

/**
 * Trash — the one place deleted records recover.
 *
 * Four kinds (mocks, tasks, custom exams, task groups) share one server-paged
 * list so a search or a sort costs one round trip instead of one per module.
 * Every row states the same three things in the same order — what it was,
 * when it was deleted, how long is left — because the user is making one
 * decision per row: restore it, or spend the remaining days.
 *
 * The destructive paths (permanent delete, Empty Trash) never act on a click:
 * both open a confirmation that names the count and, for a group, the live
 * tasks that will lose their grouping.
 */

type KindFilter = TrashKind | "all";

/** Stable identity for a trashed row: the same shape the API accepts. */
const rowKey = (item: { kind: TrashKind; id: string }) => `${item.kind}:${item.id}`;
const toItemRef = (item: TrashItem) => ({ kind: item.kind, id: item.id });

export function TrashView() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [kind, setKind] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "expiring">("all");
  const [sort, setSort] = useState<"recent" | "expiring">("recent");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<{ kind: TrashKind; id: string } | null>(
    null,
  );
  const [confirm, setConfirm] = useState<
    | { mode: "purge"; items: { kind: TrashKind; id: string }[]; ungrouped: number }
    | { mode: "empty"; count: number }
    | null
  >(null);

  const debouncedSearch = useDebouncedValue(search, 350);
  const params = useMemo(
    () =>
      trashListParams({
        kind,
        q: debouncedSearch,
        status,
        sort,
        page,
      }),
    [kind, debouncedSearch, status, sort, page],
  );
  const list = useQuery(trashListQueryOptions(params));
  const data = list.data;
  // A fresh `?? []` every render would make it a new dependency for the
  // memos below and defeat them; the empty array is an identity here.
  const items = useMemo(() => data?.items ?? [], [data]);
  // Empty Trash removes every kind, so it must quote the ALL-kinds count, not
  // the currently filtered one.
  const allCount = data?.counts.all ?? 0;

  const invalidate = async () => {
    for (const scope of TRASH_INVALIDATE_SCOPES)
      await queryClient.invalidateQueries({ queryKey: scope });
  };

  /** Per-item failures are reported, never swallowed: a partial bulk
   * action must say which record did not move. */
  const report = (outcome: TrashOutcome, successTitle: string) => {
    if (outcome.failed.length) {
      toast.warning(
        `${successTitle} — ${outcome.done} done, ${outcome.failed.length} not`,
        outcome.failed[0]?.message,
      );
    } else {
      toast.success(successTitle, `${outcome.done} item${outcome.done === 1 ? "" : "s"}`);
    }
  };

  const restoreMut = useMutation({
    mutationFn: restoreTrashRequest,
    onSuccess: (outcome) => {
      report(outcome, "Restored");
      setSelected(new Set());
      void invalidate();
    },
    onError: (error: unknown) =>
      toast.error("Could not restore", messageOf(error)),
  });

  const purgeMut = useMutation({
    mutationFn: purgeTrashRequest,
    onSuccess: (outcome) => {
      report(outcome, "Permanently deleted");
      setConfirm(null);
      setSelected(new Set());
      void invalidate();
    },
    onError: (error: unknown) =>
      toast.error("Could not delete permanently", messageOf(error)),
  });

  const emptyMut = useMutation({
    mutationFn: emptyTrashRequest,
    onSuccess: (result) => {
      toast.success("Trash emptied", `${result.total} item${result.total === 1 ? "" : "s"} removed for good`);
      setConfirm(null);
      setSelected(new Set());
      void invalidate();
    },
    onError: (error: unknown) =>
      toast.error("Could not empty Trash", messageOf(error)),
  });

  const selectionItems = useMemo(
    () => items.filter((item) => selected.has(rowKey(item))).map(toItemRef),
    [items, selected],
  );

  const toggle = (item: TrashItem) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const key = rowKey(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleVisible = () =>
    setSelected((prev) => {
      const keys = items.map(rowKey);
      const allOn = keys.length > 0 && keys.every((key) => prev.has(key));
      const next = new Set(prev);
      for (const key of keys) {
        if (allOn) next.delete(key);
        else next.add(key);
      }
      return next;
    });

  const purgeItems = (
    refs: { kind: TrashKind; id: string }[],
    ungrouped: number,
  ) => setConfirm({ mode: "purge", items: refs, ungrouped });

  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit || 50)));
  const busy = restoreMut.isPending || purgeMut.isPending || emptyMut.isPending;

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-start gap-3 border border-rule-soft bg-canvas px-4 py-3">
        <PlainIcon name="clock" size={14} className="mt-0.5 shrink-0 text-muted" />
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted">
          Deleted records stay here for{" "}
          {data?.retentionDays ?? TRASH_RETENTION_DAYS} days, then are
          permanently and automatically removed. You can restore anything before
          that date, or delete it now.
        </p>
      </div>

      {/* Filter bar — type is a segment group (with live counts), the rest are
          plain controls so the row stays one line from phone to desktop. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="segment-group" role="group" aria-label="Filter by type">
          {(["all", ...TRASH_KIND_ORDER] as KindFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              className="segment tap-target"
              aria-pressed={kind === option}
              onClick={() => {
                setKind(option);
                setPage(1);
              }}
            >
              {option === "all"
                ? "All"
                : TRASH_KIND_META[option].plural}
              {data ? (
                <span className="text-[0.625rem] tabular opacity-70">
                  {data.counts[option]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="relative min-w-0 grow sm:grow-0">
          <PlainIcon
            name="search"
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            aria-label="Search deleted records"
            placeholder="Search deleted records…"
            className="py-2 pl-8 text-xs sm:w-56"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="tap-target absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            >
              <PlainIcon name="close" size={13} />
            </button>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-[0.6875rem] text-muted">
          <span className="sr-only sm:not-sr-only">Show</span>
          <select
            className="w-auto text-xs"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "all" | "expiring");
              setPage(1);
            }}
          >
            <option value="all">Everything</option>
            <option value="expiring">Expiring soon</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[0.6875rem] text-muted">
          <span className="sr-only sm:not-sr-only">Sort</span>
          <select
            className="w-auto text-xs"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as "recent" | "expiring");
              setPage(1);
            }}
          >
            <option value="recent">Recently deleted</option>
            <option value="expiring">Earliest expiration</option>
          </select>
        </label>
      </div>

      {!!selectionItems.length && (
        <div
          className="mb-3 flex flex-wrap items-center justify-between gap-3 border border-rule bg-paper px-4 py-2.5"
          aria-live="polite"
        >
          <p className="text-xs font-medium">
            {selectionItems.length} selected
            <span className="ml-2 text-muted font-normal">
              of {data?.total ?? 0}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => restoreMut.mutate(selectionItems)}
            >
              <PlainIcon name="refresh" size={13} /> Restore
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              className="text-danger hover:text-danger"
              onClick={() =>
                purgeItems(selectionItems, ungroupedCount(items, selected))
              }
            >
              <PlainIcon name="trash" size={13} /> Delete permanently
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <Panel
        icon="trash"
        title="Deleted records"
        description={
          list.isError
            ? "Could not load Trash."
            : `${data?.total ?? 0} item${(data?.total ?? 0) === 1 ? "" : "s"} recoverable`
        }
        action={
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !allCount}
            onClick={() => setConfirm({ mode: "empty", count: allCount })}
          >
            <PlainIcon name="trash" size={13} /> Empty Trash
          </Button>
        }
      >
        {list.isError ? (
          <div className="px-5 py-10 text-center" role="alert">
            <p className="font-serif text-[1.125rem]">
              Trash could not be loaded.
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted">
              {list.error instanceof Error
                ? list.error.message
                : "Check your connection, then try again."}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => void list.refetch()}
            >
              <PlainIcon name="refresh" size={13} /> Try again
            </Button>
          </div>
        ) : !data ? (
          <div className="space-y-2 p-4" role="status" aria-label="Loading Trash">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : items.length ? (
          <div
            className={cn(
              "transition-opacity",
              list.isFetching && !list.isPlaceholderData && "opacity-60",
            )}
          >
            <div className="flex items-center gap-3 border-b border-rule-soft px-4 py-2">
              <Checkbox
                id="trash-select-visible"
                checked={
                  items.length > 0 &&
                  items.every((item) => selected.has(rowKey(item)))
                }
                onCheckedChange={toggleVisible}
              />
              <label
                htmlFor="trash-select-visible"
                className="text-[0.6875rem] text-muted"
              >
                Select all {items.length} shown
              </label>
            </div>
            <ul className="divide-y divide-rule-soft">
              {items.map((item) => (
                <TrashRow
                  key={rowKey(item)}
                  item={item}
                  checked={selected.has(rowKey(item))}
                  busy={busy}
                  onToggle={() => toggle(item)}
                  onRestore={() => restoreMut.mutate([toItemRef(item)])}
                  onPurge={() =>
                    purgeItems([toItemRef(item)], item.affected ?? 0)
                  }
                  onOpen={() => setDetail({ kind: item.kind, id: item.id })}
                />
              ))}
            </ul>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="font-serif text-[1.25rem] leading-tight">
              Nothing is waiting here.
            </p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted">
              Deleted mocks, tasks, custom exams and groups appear in this list
              and stay recoverable for {data.retentionDays} days.
            </p>
          </div>
        )}

        {data && data.total > (data.limit || 50) && (
          <Pagination className="mt-2 border-t border-rule-soft px-4 py-3">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                // A small window around the current page; Trash lists are
                // short, so a full page-rail would be more chrome than use.
                const next = Math.max(1, Math.min(pageCount - 4, page - 2)) + i;
                return (
                  <PaginationItem key={next}>
                    <PaginationPage
                      isActive={next === page}
                      onClick={() => setPage(next)}
                      aria-label={`Page ${next}`}
                    >
                      {next}
                    </PaginationPage>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </Panel>

      <TrashDetailSheet
        kind={detail?.kind ?? null}
        id={detail?.id ?? ""}
        busy={busy}
        onClose={() => setDetail(null)}
        onRestore={() => {
          if (!detail) return;
          restoreMut.mutate([detail], { onSettled: () => setDetail(null) });
        }}
        onPurge={() => {
          if (!detail) return;
          setConfirm({ mode: "purge", items: [detail], ungrouped: 0 });
        }}
      />

      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.mode === "empty"
                ? "Empty Trash?"
                : "Delete permanently?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.mode === "empty"
                ? `This removes all ${confirm.count} deleted item${confirm.count === 1 ? "" : "s"} for good. There is no way back from here — export a backup first if you might want any of them.`
                : `This removes ${confirm?.items.length ?? 0} record${(confirm?.items.length ?? 0) === 1 ? "" : "s"} for good. It cannot be undone.`}
              {confirm?.mode === "purge" && confirm.ungrouped > 0 ? (
                <>
                  {" "}
                  {confirm.ungrouped} task
                  {confirm.ungrouped === 1 ? "" : "s"} will become ungrouped.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => {
                if (!confirm) return;
                if (confirm.mode === "empty") emptyMut.mutate();
                else purgeMut.mutate(confirm.items);
              }}
            >
              {confirm?.mode === "empty" ? "Empty Trash" : "Delete permanently"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TrashRow({
  item,
  checked,
  busy,
  onToggle,
  onRestore,
  onPurge,
  onOpen,
}: {
  item: TrashItem;
  checked: boolean;
  busy: boolean;
  onToggle: () => void;
  onRestore: () => void;
  onPurge: () => void;
  onOpen: () => void;
}) {
  const meta = TRASH_KIND_META[item.kind];
  const id = rowKey(item);
  const expiringSoon = item.daysLeft <= TRASH_EXPIRING_DAYS;
  return (
    <li className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-canvas/60">
      <Checkbox
        id={`trash-${id}`}
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-1"
        aria-label={`Select ${item.title}`}
      />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="block max-w-full text-left"
          aria-label={`View details of ${item.title}`}
        >
          <span className="block max-w-72 truncate text-[0.8125rem] font-medium">
            {item.title}
          </span>
        </button>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] text-muted">
          <span className="rounded-control bg-soft px-1.5 py-0.5">{meta.label}</span>
          {item.subtitle ? <span>{item.subtitle}</span> : null}
          {item.context ? (
            <span>
              {item.kind === "task" ? "due" : "mock date"}{" "}
              {shortDate(item.context)}
            </span>
          ) : null}
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-[0.6875rem] text-muted">
          Deleted {shortDate(item.deletedAt)}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[0.6875rem]",
            expiringSoon ? "text-warning" : "text-muted",
          )}
          title={`Expires ${longDate(item.expiresAt)}`}
        >
          {item.daysLeft} day{item.daysLeft === 1 ? "" : "s"} left
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${item.title}`}
            className="inline-flex size-8 tap-target shrink-0 items-center justify-center rounded-control border border-rule-soft text-muted transition-colors hover:border-accent/50 hover:text-accent"
          >
            <PlainIcon name="more" size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled={busy} onSelect={onRestore}>
            <PlainIcon name="refresh" size={13} /> Restore
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpen}>
            <PlainIcon name="file" size={13} /> View details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            danger
            disabled={busy}
            onSelect={onPurge}
          >
            <PlainIcon name="trash" size={13} /> Delete permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/** Live tasks that lose their grouping when the selected groups are purged. */
function ungroupedCount(items: TrashItem[], selected: Set<string>): number {
  return items
    .filter((item) => item.kind === "group" && selected.has(rowKey(item)))
    .reduce((sum, item) => sum + (item.affected ?? 0), 0);
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Try again in a moment.";
}
