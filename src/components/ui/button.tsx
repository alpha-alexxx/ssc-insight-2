import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva(
  "inline-flex touch-manipulation items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px motion-reduce:active:translate-y-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-paper hover:bg-accent-hover",
        outline: "border border-rule bg-paper hover:bg-canvas text-ink",
        ghost: "hover:bg-soft text-muted hover:text-ink",
        destructive: "bg-danger text-paper hover:bg-danger-hover",
      },
      size: {
        default: "h-[var(--control-height)] px-4",
        sm: "h-[var(--control-height-sm)] px-3 text-xs",
        icon: "size-[var(--control-height)]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
