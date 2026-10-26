import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found · SSC Insight",
  robots: { index: false, follow: false },
};

/**
 * 404 for unknown page routes (unknown /api/* paths answer with the JSON
 * envelope via the catch-all route handler instead). Server-rendered with
 * zero client JS, mirroring the maintenance page's paper card so every
 * edge-of-app surface shares the same design system.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-16 text-ink">
      <div className="w-full max-w-lg rounded-card border border-rule-soft bg-paper p-8 shadow-pop sm:p-10">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="duotone-tile inline-flex size-11 items-center justify-center rounded-card border bg-accent-soft border-accent/30"
          >
            <span className="duotone relative inline-flex shrink-0">
              <Compass
                size={26}
                strokeWidth={1.6}
                aria-hidden="true"
                className="duotone-echo absolute left-0 top-0 text-accent"
              />
              <Compass
                size={26}
                strokeWidth={1.9}
                aria-hidden="true"
                className="relative text-accent"
              />
            </span>
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              404 · Page not found
            </p>
            <h1 className="font-serif text-2xl leading-tight text-ink">
              This page isn&apos;t on the scorecard
            </h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-muted">
          The address doesn&apos;t match any page in SSC Insight. Your saved
          mocks and settings are untouched — nothing was changed by this
          visit.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-control bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-accent-hover"
          >
            Back to SSC Insight
          </Link>
          <span className="inline-flex items-center gap-2 rounded-pill border border-rule-soft bg-soft px-3.5 py-1.5 text-xs font-medium text-muted">
            Signed-in visitors land on the dashboard
          </span>
        </div>
      </div>
    </main>
  );
}
