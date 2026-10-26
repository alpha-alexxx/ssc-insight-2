"use client";

/**
 * Skeleton primitives for the dashboard. Mirrors the panel/heading/stat-strip
 * rhythm of the real UI so loading states don't shift layout when content
 * arrives — preventing CLS on slow connections.
 */

export function PanelSkeleton({ title = true }: { title?: boolean }) {
  return (
    <section className="panel p-6 animate-pulse" aria-busy="true" aria-hidden="true">
      {title && (
        <div className="mb-5">
          <div className="h-2.5 w-16 bg-rule-soft rounded mb-2" />
          <div className="h-5 w-1/3 bg-rule-soft rounded" />
        </div>
      )}
      <div className="h-32 w-full bg-rule-soft rounded" />
    </section>
  );
}

export function StatStripSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 border-y border-ink my-7 animate-pulse" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="p-6 animate-pulse">
          <div className="h-2 w-12 bg-rule-soft rounded mb-2" />
          <div className="h-9 w-20 bg-rule-soft rounded" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-2/3 bg-rule-soft rounded animate-pulse" />
      <StatStripSkeleton />
      <div className="grid lg:grid-cols-2 gap-6">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
      <PanelSkeleton />
    </div>
  );
}
