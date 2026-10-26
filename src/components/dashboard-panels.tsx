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
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Optional duotone icon shown before the title. */
  icon?: IconName;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
        <div className="flex items-start gap-4">
          {icon && <DuotoneTile name={icon} size={20} tile="accent" />}
          <div>
            <h2 className="panel-title">{title}</h2>
            {description && <p className="muted text-xs mt-1.5">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
