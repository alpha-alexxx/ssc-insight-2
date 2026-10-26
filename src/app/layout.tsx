import type { Metadata } from "next";
import "@fontsource-variable/dm-sans/index.css";
import "@fontsource-variable/source-serif-4/index.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "SSC Insight · Mock tracker",
  description: "A clear view of your SSC CGL Tier 2 preparation.",
};

/**
 * Theme handling is next-themes (the shadcn/ui dark-mode setup): the provider
 * persists the choice under localStorage("ssc.theme"), applies it to <html
 * class> via its own before-paint script, and re-evaluates "system" when the
 * OS theme changes. suppressHydrationWarning is required because the server
 * renders <html> without the class next-themes' script adds.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          storageKey="ssc.theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <ToastProvider>{children}</ToastProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
