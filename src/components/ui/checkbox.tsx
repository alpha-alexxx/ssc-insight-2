"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Checkbox on the Radix umbrella package, square and ink-filled when on —
 * the same geometry as the plan's completion toggles and the native
 * `input[type=checkbox]` styling in the base layer, so a Radix checkbox and a
 * native one never look like different products.
 *
 * Radix supplies the indeterminate state, keyboard handling and
 * `aria-checked`; `data-state` drives the visuals.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-rule bg-paper",
      "transition-colors duration-[var(--dur-quick)]",
      "data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-paper",
      "data-[state=indeterminate]:border-ink data-[state=indeterminate]:bg-ink data-[state=indeterminate]:text-paper",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Touch floor without growing the visual box.
      "relative after:absolute after:-inset-2.5 after:content-['']",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      <Check size={10} strokeWidth={3} aria-hidden="true" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
