"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Progress on the Radix umbrella package, drawn as the project's 2px square
 * rule rather than a rounded bar — the same idiom as `MetricCell`, task
 * subtasks and plan completion. Radix supplies
 * `role="progressbar"`/`aria-valuenow`; `value` is 0–100.
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    /** Optional accessible description ("Mocks done this month"). */
    label?: string;
  }
>(({ className, value, label, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    aria-label={label}
    className={cn(
      "relative h-[2px] w-full overflow-hidden rounded-none bg-rule-soft",
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full bg-ink transition-[width] duration-[var(--dur-enter)]"
      style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
