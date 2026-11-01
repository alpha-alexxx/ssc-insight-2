"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Radio group on the Radix umbrella package. Square indicators, ink fill for
 * the selected option — the Frame Rule keeps round for status dots and the
 * answer ring, so a selected radio is a filled square with an inner paper
 * mark rather than a dot.
 *
 * Radix supplies roving focus and arrow-key selection within the group.
 */
const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn("grid gap-2", className)}
    {...props}
  />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-rule bg-paper",
      "transition-colors duration-[var(--dur-quick)]",
      "data-[state=checked]:border-ink data-[state=checked]:bg-ink",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "relative after:absolute after:-inset-2.5 after:content-['']",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="block size-1.5 bg-paper" />
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
