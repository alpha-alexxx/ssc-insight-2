"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

/**
 * shadcn-style Drawer primitive built on vaul, adapted to SSC Insight's paper
 * design system.
 *
 * The Sheet primitive (`ui/sheet.tsx`) slides a Radix dialog from an edge but
 * has no drag physics. A drawer is the right surface for a phone day schedule
 * and for editing a personal task: it is dismissible with a thumb, it follows
 * the finger, and it keeps the calendar visible behind it.
 *
 * Motion uses the project's own tokens through `.drawer-overlay` /
 * `.drawer-content` in globals.css, exactly as the Sheet uses `sheet-*`, and
 * obeys the global `prefers-reduced-motion` rule. `tw-animate-css` is not
 * installed and must not be added.
 */

/** vaul renders a Radix dialog; every drawer needs a title for a11y. */
const Drawer = ({
  shouldScaleBackground = false,
  fixed = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    fixed={fixed}
    {...props}
  />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("drawer-overlay fixed inset-0 z-50 bg-ink/25", className)}
    {...props}
  />
));
DrawerOverlay.displayName = "DrawerOverlay";

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "drawer-content fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col",
        "border-t border-rule bg-paper",
        /* The panel's own radius token, top corners only: a bottom drawer
           meets the viewport edge squarely. */
        "rounded-t-[var(--radius-panel)]",
        "pb-[max(12px,env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    >
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

/**
 * The drag handle. `.drawer-handle` gives it the 44px row vaul needs for a
 * comfortable grab area without drawing a 44px bar.
 */
function DrawerHandle({ className }: { className?: string }) {
  return (
    <div className={cn("drawer-handle shrink-0")} aria-hidden="true">
      <DrawerPrimitive.Handle className={cn("drawer-handle-bar", className)} />
    </div>
  );
}

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1 px-4 pb-2", className)} {...props} />
);

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-auto flex flex-col-reverse gap-2 border-t border-rule-soft px-4 pt-3 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("font-serif text-xl font-medium text-ink", className)}
    {...props}
  />
));
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-xs text-muted", className)}
    {...props}
  />
));
DrawerDescription.displayName = "DrawerDescription";

/** The one scroll region inside a drawer: header and footer stay put. */
const DrawerBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "drawer-body-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain",
      className,
    )}
    {...props}
  />
);

export {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHandle,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
