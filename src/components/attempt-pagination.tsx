"use client";
import { memo, useState } from "react";
import { PlainIcon } from "./icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from "./ui/pagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { PAGE_SIZES, type PageSize } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * The shared pagination footer for the server-paged attempt lists
 * (/history table, /compare picker): a "Showing X–Y of N" line with the
 * per-page select, numbered pages with ellipsis from sm up, and on phones
 * a compact bar whose "Page X of Y" label opens a bottom-sheet page grid
 * for direct jumps. Built on the ui/pagination primitives.
 */

/** Windowed page numbers, same shape as the hand-rolled pager it replaces:
 * first, last, and the current page with one neighbor on each side. */
function windowedPages(page: number, pageCount: number): (number | "…")[] {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );
  const out: (number | "…")[] = [];
  for (const p of pages) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && p - prev > 1) out.push("…");
    out.push(p);
  }
  return out;
}

export const AttemptPagination = memo(function AttemptPagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  noun = "mocks",
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  noun?: string;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const [jumpOpen, setJumpOpen] = useState(false);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const through = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-rule-soft px-4 py-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs muted" aria-live="polite">
          Showing {from}–{through} of {total} {noun}
        </p>
        <label className="flex items-center gap-1.5 text-xs muted">
          <span className="hidden whitespace-nowrap sm:inline">Per page</span>
          <select
            aria-label="Rows per page"
            className="rounded-control py-1 pl-1.5 pr-6 text-xs"
            value={pageSize}
            onChange={(e) =>
              // The options are exactly PAGE_SIZES, so the value is one.
              onPageSizeChange(Number(e.target.value) as PageSize)
            }
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      {pageCount > 1 &&
        (isMobile ? (
          <Pagination className="flex-1 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  disabled={page === 1}
                  onClick={() => onPageChange(page - 1)}
                />
              </PaginationItem>
              <PaginationItem>
                <button
                  type="button"
                  onClick={() => setJumpOpen(true)}
                  aria-label={`Page ${page} of ${pageCount}. Jump to page.`}
                  className="inline-flex h-8 tap-target items-center gap-1 rounded-control border border-rule-soft px-3 text-xs font-medium tabular text-muted transition-colors hover:text-ink"
                >
                  Page {page} of {pageCount}
                  <PlainIcon name="chevronDown" size={12} />
                </button>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  disabled={page === pageCount}
                  onClick={() => onPageChange(page + 1)}
                />
              </PaginationItem>
            </PaginationContent>
            <Sheet open={jumpOpen} onOpenChange={setJumpOpen}>
              <SheetContent
                side="bottom"
                className="max-h-[85dvh] gap-0 pb-[max(6px,env(safe-area-inset-bottom))] shadow-none"
              >
                <SheetHeader className="px-4 pb-2 pt-4">
                  <SheetTitle className="text-lg">Jump to page</SheetTitle>
                  <SheetDescription className="mt-1">
                    {total} {noun} across {pageCount} page
                    {pageCount === 1 ? "" : "s"}
                  </SheetDescription>
                </SheetHeader>
                <div className="grid grid-cols-5 gap-2 overflow-y-auto px-4 pb-4">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map(
                    (p) => (
                      <PaginationPage
                        key={p}
                        isActive={p === page}
                        className="w-full"
                        onClick={() => {
                          onPageChange(p);
                          setJumpOpen(false);
                        }}
                      >
                        {p}
                      </PaginationPage>
                    ),
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </Pagination>
        ) : (
          <Pagination className="flex-1 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  disabled={page === 1}
                  onClick={() => onPageChange(page - 1)}
                />
              </PaginationItem>
              {windowedPages(page, pageCount).map((p, index) => (
                <PaginationItem key={`${p}-${index}`}>
                  {p === "…" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationPage
                      isActive={p === page}
                      onClick={() => onPageChange(p)}
                    >
                      {p}
                    </PaginationPage>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  disabled={page === pageCount}
                  onClick={() => onPageChange(page + 1)}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ))}
    </div>
  );
});
