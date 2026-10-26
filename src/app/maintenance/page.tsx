import type { Metadata } from "next";
import Link from "next/link";
import { Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "Brief maintenance · SSC Insight",
  robots: { index: false, follow: false },
};

/**
 * Maintenance interstitial. Shown by the proxy (307 redirect) whenever
 * MAINTENANCE_MODE is on for any page outside the maintenance bypass list.
 * Static, dependency-free and theme-aware (root layout applies the saved
 * palette before paint), so it renders even while the database is offline.
 *
 * The duotone tile is inlined rather than reusing <DuotoneTile>: that
 * component is a client component, and icon component references cannot be
 * passed from a server page across the RSC boundary. This page must render
 * with zero client JS while the app is offline.
 */
export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ retryAfter?: string }>;
}) {
  const { retryAfter } = await searchParams;
  const seconds = Math.max(0, Number(retryAfter ?? "") || 3600);
  const minutes = Math.round(seconds / 60);
  const backIn =
    seconds >= 90
      ? `about ${minutes} minutes`
      : "less than a minute";

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-16 text-ink">
      <div className="w-full max-w-lg rounded-card border border-rule-soft bg-paper p-8 shadow-pop sm:p-10">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="duotone-tile inline-flex size-11 items-center justify-center rounded-card border bg-accent-soft border-accent/30"
          >
            <span className="duotone relative inline-flex shrink-0">
              <Wrench
                size={26}
                strokeWidth={1.6}
                aria-hidden="true"
                className="duotone-echo absolute left-0 top-0 text-accent"
              />
              <Wrench
                size={26}
                strokeWidth={1.9}
                aria-hidden="true"
                className="relative text-accent"
              />
            </span>
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Scheduled maintenance
            </p>
            <h1 className="font-serif text-2xl leading-tight text-ink">
              We&apos;re polishing the scoreboard
            </h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-muted">
          SSC Insight is briefly offline while we run upkeep on the service.
          Your mocks, subject results and settings are untouched and safe —
          nothing is being written or changed during this window.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          This page will return automatically. The work is expected to finish
          in {backIn}; you can head back and retry whenever you like.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-control bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-accent-hover"
          >
            Try again
          </Link>
          <span className="inline-flex items-center gap-2 rounded-pill border border-rule-soft bg-soft px-3.5 py-1.5 text-xs font-medium text-muted">
            <span
              aria-hidden
              className="inline-block size-2 rounded-pill bg-warning"
            />
            Usually back within {backIn}
          </span>
        </div>
      </div>
    </main>
  );
}
