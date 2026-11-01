"use client";

import { CalendarClock, Check, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

/**
 * Select-mode toolbar: bulk status, reschedule, and trash for the selection,
 * plus the "everything matching the current filters" scope action tucked
 * behind the ⋯ menu (confirm-gated by the parent) instead of sitting
 * permanently in the page as a red button.
 *
 * Restoring is deliberately absent: deleted tasks are recovered from /trash,
 * which is the only surface that lists them.
 */
export function BulkBar({
  selectedCount,
  pageTotal,
  busy,
  scopeTotal,
  onSelectAll,
  onClear,
  onComplete,
  onInProgress,
  onReschedule,
  onTrash,
  onScopeTrash,
}: {
  selectedCount: number;
  pageTotal: number;
  busy: boolean;
  /** Total matching the current view/filters (for the scope action). */
  scopeTotal: number;
  onSelectAll: () => void;
  onClear: () => void;
  onComplete?: () => void;
  onInProgress?: () => void;
  onReschedule?: () => void;
  onTrash?: () => void;
  onScopeTrash?: () => void;
}) {
  const has = selectedCount > 0;
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center gap-2 rounded-control border border-accent/30 bg-accent-soft/50 px-3 py-2"
    >
      <span className="text-xs font-medium tabular-nums text-ink">
        {selectedCount} selected
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {selectedCount < pageTotal && (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onSelectAll}>
            Select all on page
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" disabled={busy || !has} onClick={onClear}>
          Clear
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy || !has} onClick={onComplete}>
          <Check size={13} />
          Complete
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy || !has} onClick={onInProgress}>
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          In progress
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy || !has} onClick={onReschedule}>
          <CalendarClock size={13} />
          Reschedule
        </Button>
        <Button type="button" variant="destructive" size="sm" disabled={busy || !has} onClick={onTrash}>
          <Trash2 size={13} />
          Trash
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="More selection actions"
              disabled={busy}
            >
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {selectedCount < pageTotal && (
              <DropdownMenuItem onSelect={onSelectAll}>
                Select all on page
              </DropdownMenuItem>
            )}
            {onScopeTrash && scopeTotal > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem danger onSelect={onScopeTrash}>
                  <Trash2 size={13} />
                  Trash all matching ({scopeTotal})…
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
