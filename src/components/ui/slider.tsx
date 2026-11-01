"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Slider on the Radix umbrella package. The track and range follow the Frame
 * Rule — square ends, a 2px rule that fills with ink — and the thumb is a
 * square handle tall enough to grab. It is paired with a numeric input in the
 * percentile editor, because a slider alone cannot express an exact goal and
 * is hard to use precisely without a mouse.
 */
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center py-2",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-none bg-soft">
      <SliderPrimitive.Range className="absolute h-full bg-ink" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        "block h-5 w-3 rounded-[2px] border border-ink bg-paper",
        "transition-colors duration-[var(--dur-quick)] hover:bg-soft",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:opacity-50",
        // Touch floor without growing the visual handle.
        "relative after:absolute after:-inset-3 after:content-['']",
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
