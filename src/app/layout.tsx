import type { Metadata } from "next";
import "@fontsource-variable/dm-sans/index.css";
import "@fontsource-variable/source-serif-4/index.css";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "SSC Insight · Mock tracker",
  description: "A clear view of your SSC CGL Tier 2 preparation.",
};

/**
 * Inline theme-application script. Runs before paint so the correct palette
 * is applied immediately, preventing a flash of the wrong theme (FOUC).
 * Reads localStorage("ssc.theme"); falls back to prefers-color-scheme.
 *
 * Marked suppressHydrationWarning because <html data-theme> differs between
 * server (no attribute) and first client render (attribute set by this script).
 */
const themeScript = `(function(){try{var t=localStorage.getItem('ssc.theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ErrorBoundary>
          <ToastProvider>{children}</ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
