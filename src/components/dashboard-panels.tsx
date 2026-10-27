"use client";
import { DuotoneTile, type IconName } from "./icon";

export function EmptyChart({
  children = "Your progress will appear after your first mock.",
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="chart-empty">
      <DuotoneTile name="activity" tile="ink" className="mb-3" />
      <p>{children}</p>
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  icon,
  children,
  className = "",
  dense = false,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Optional duotone icon shown before the title. */
  icon?: IconName;
  children: React.ReactNode;
  className?: string;
  /** Compact dashboard header/body spacing. */
  dense?: boolean;
}) {
  return (
    <section className={`panel ${className}`}>
      <div
        className={
          dense
            ? "flex items-start justify-between gap-3 px-4 pb-2.5 pt-3.5"
            : "flex items-start justify-between gap-3 px-6 pb-3 pt-5"
        }
      >
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <DuotoneTile
              name={icon}
              size={dense ? 16 : 20}
              tile="accent"
              className={dense ? "size-8" : undefined}
            />
          )}
          <div className="min-w-0">
            <h2
              className={
                dense
                  ? "font-serif text-[17px] font-medium leading-tight tracking-[-0.02em]"
                  : "panel-title"
              }
            >
              {title}
            </h2>
            {description && (
              <p className={dense ? "mt-1 text-[10px] text-muted" : "mt-1.5 text-xs text-muted"}>
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
