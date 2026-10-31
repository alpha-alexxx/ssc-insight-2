import * as React from "react";
import { PlainIcon } from "../icon";
import { cn } from "@/lib/utils";

/**
 * shadcn pagination primitives, adapted to SSC Insight's paper design
 * system. Pages are plain buttons, not router links: the workspace shell is
 * a persistent client view and paging must never trigger a navigation, and
 * the component is static, so no globals.css motion classes are involved —
 * only the project's control tokens.
 */

const pageButtonBase =
  "inline-flex size-8 tap-target items-center justify-center rounded-control text-xs font-medium tabular transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

function PaginationItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return <li className={cn("", className)} {...props} />;
}

function PaginationPage({
  isActive,
  className,
  ...props
}: React.ComponentProps<"button"> & { isActive?: boolean }) {
  return (
    <button
      type="button"
      aria-current={isActive ? "page" : undefined}
      className={cn(
        pageButtonBase,
        isActive
          ? "bg-accent text-paper"
          : "border border-rule-soft text-muted hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label="Previous page"
      className={cn(
        pageButtonBase,
        "border border-rule-soft text-muted hover:text-ink",
        className,
      )}
      {...props}
    >
      <PlainIcon name="arrowLeft" size={13} />
    </button>
  );
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label="Next page"
      className={cn(
        pageButtonBase,
        "border border-rule-soft text-muted hover:text-ink",
        className,
      )}
      {...props}
    >
      <PlainIcon name="arrowRight" size={13} />
    </button>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 items-center justify-center text-xs muted",
        className,
      )}
      {...props}
    >
      …
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPage,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
