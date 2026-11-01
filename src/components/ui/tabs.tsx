"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Tabs on the Radix umbrella package, rendered as the project's own
 * `.segment-group` / `.segment` control so a tabbed surface looks identical
 * to the scope tabs, the calendar layer toggles and the AI panel's documents
 * — one segmented-control grammar across the app instead of a second, and
 * instead of ad-hoc buttons.
 *
 * Radix supplies the roving tabindex, arrow-key navigation, `aria-selected`
 * and the tabpanel wiring. `.segment` styles `aria-selected`, so the active
 * thumb styling comes from the existing CSS rather than new rules.
 */

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("segment-group max-w-full", className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

/** A one-line ruled explanation under a tab set. */
function TabsCaption({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn("mt-2 text-[0.6875rem] leading-relaxed text-muted", className)}
      {...props}
    />
  );
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn("segment", className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsCaption, TabsContent, TabsList, TabsTrigger };
