"use client";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * SSC Insight dropdown menu — the shadcn DropdownMenu composition restyled
 * in the app's editorial-paper language: paper surface, hairline rule,
 * control radius, 12px items, soft hover, accent-free (tokens flip in dark
 * mode automatically). Exposes only the parts this app uses. Animation is
 * owned by the `.dropdown-content` CSS class (globals.css), matching how
 * dialogs/popovers/sheets are animated here.
 */

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export function DropdownMenuContent({
  className = "",
  sideOffset = 6,
  align = "end",
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={
          "dropdown-content z-50 min-w-[11rem] overflow-hidden rounded-control border border-rule bg-paper p-1 shadow-pop " +
          className
        }
        {...props}
        // Radix returns focus to the trigger on close by default; after an
        // item action (theme flip, sign out) the lingering ring reads wrong.
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  danger = false,
  children,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  /** Destructive entry: red border + tint, deeper red on hover/highlight. */
  danger?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-control px-2.5 py-2 text-xs font-medium outline-none transition-colors data-[highlighted]:bg-soft data-[highlighted]:text-ink",
        danger
          ? "border border-danger/40 bg-danger-soft/60 text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger-hover"
          : "text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownMenuSeparator({
  className = "",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={"-mx-1 my-1 h-px bg-rule-soft " + className}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className = "",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "px-2.5 py-1.5 text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-muted",
        className,
      )}
      {...props}
    />
  );
}
