"use client";

import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";

/**
 * Collapsible on the Radix umbrella package. Used for "advanced" disclosure
 * inside a panel — the content stays mounted so form state inside it
 * survives, and Radix keeps `aria-expanded`/`aria-controls` correct.
 */
const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.Trigger;
const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.Content ref={ref} className={className} {...props} />
));
CollapsibleContent.displayName = CollapsiblePrimitive.Content.displayName;

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
