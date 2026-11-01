import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The app's text-field primitive, styled by the base layer in globals.css
 * (paper fill, rule border, `--radius-control`, `--control-pad-*`, and the
 * unlayered 16px-on-phones rule that defeats iOS focus zoom).
 *
 * The previous file was stock shadcn (`rounded-md`, `shadow-sm`,
 * `bg-transparent`), which is why nothing used it — every field in the app
 * was a raw `<input>`. This version is the token-correct one so new work can
 * import a component instead of re-declaring the look.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input ref={ref} type={type} className={cn("block w-full", className)} {...props} />
  ),
);
Input.displayName = "Input";

export { Input };
