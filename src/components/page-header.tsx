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
  icon,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  /** Optional contextual line (date, plan day, result count). */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** Optional tile rendered before the title block. */
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="shrink-0 pt-0.5">{icon}</div>}
        <div className="min-w-0">
          <h1 className="workspace-title">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted">
              {description}
            </p>
          )}
          {meta && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-muted">
              {meta}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
