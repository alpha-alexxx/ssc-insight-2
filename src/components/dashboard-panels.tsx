"use client";
import { DuotoneTile, type IconName } from "./icon";
import { cn } from "@/lib/utils";

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
  eyebrow,
  descriptionClassName,
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
  /** Small-caps label above the title (the mockup's "THIS WEEK"). */
  eyebrow?: string;
  /** Extra classes for the description line (e.g. hiding it at one width). */
  descriptionClassName?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div
        className={
          dense
            ? "flex items-start justify-between gap-3 px-4 pb-2.5 pt-3.5"
            : "flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-6 sm:pb-3 sm:pt-5"
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
            {eyebrow && <p className="section-label">{eyebrow}</p>}
            <h2
              className={
                dense
                  ? "font-serif text-[17px] font-medium leading-tight tracking-[-0.02em]"
                  : cn("panel-title", eyebrow && "mt-0.5")
              }
            >
              {title}
            </h2>
            {description && (
              <p
                className={cn(
                  dense ? "mt-1 text-[10px] text-muted" : "mt-1.5 text-xs text-muted",
                  descriptionClassName,
                )}
              >
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
