"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * shadcn/ui dark-mode setup: a client wrapper around next-themes so the
 * provider can be used from the server root layout. The class strategy is
 * configured at the call site in layout.tsx.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
