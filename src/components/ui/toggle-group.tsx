"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Multi-select toggle group on the Radix umbrella, styled as the project's
 * existing `.segment-group` / `.segment` pattern so it inherits every palette,
 * style and breakpoint rule — including the 44px phone hit area and the phone
 * `--segment-pad-x` tightening.
 *
 * Used for the calendar's layer toggles. It is deliberately **inline** rather
 * than a popover or dropdown: overlays all portal at z-50, and the layer
 * control must stay reachable while a drawer is open.
 */

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("segment-group", className)}
    {...props}
  />
));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

/**
 * One option. `aria-pressed` is what `.segment` styles, and Radix sets
 * `data-state="on"` on the pressed item, so both selectors agree.
 */
const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn("segment", className)}
    {...props}
  />
));
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
