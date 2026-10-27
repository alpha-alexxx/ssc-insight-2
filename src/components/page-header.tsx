import { cn } from "@/lib/utils";

/**
 * Compact workspace page header. One title, one line of context, primary
 * actions — deliberately smaller than the landing-page display typography.
 */
export function PageHeader({
  title,
  description,
  meta,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  /** Optional contextual line (date, plan day, result count). */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="workspace-title">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted">
            {description}
          </p>
        )}
        {meta && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            {meta}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
