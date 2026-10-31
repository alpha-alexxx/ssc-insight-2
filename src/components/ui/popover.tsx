"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * shadcn-style Popover primitive on the Radix umbrella package, styled with
 * the paper tokens. Radix supplies outside-click dismissal, Escape handling and
 * focus return; `.popover-content` in globals.css supplies the entrance motion
 * from the project's duration/easing tokens.
 *
 * Radix portals this at z-50 like every other overlay in the app, so a popover
 * must never be opened from inside a sheet, drawer or dialog — close the
 * overlay first. (The date-jump popover is a toolbar control for exactly this
 * reason; layer toggles are inline for the same reason.)
 */

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "start", sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "popover-content z-50 w-64 border border-rule bg-paper p-3 shadow-pop",
        "rounded-control text-ink outline-none",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

function PopoverClose({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Close>) {
  return <PopoverPrimitive.Close className={className} {...props} />;
}

export { Popover, PopoverAnchor, PopoverClose, PopoverContent, PopoverTrigger };
