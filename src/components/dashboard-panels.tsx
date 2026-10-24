import { Activity } from "lucide-react";
export function EmptyChart({
  children = "Your progress will appear after your first mock.",
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="chart-empty">
      <Activity className="text-rule mb-2" size={30} />
      <p>{children}</p>
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
        <div>
          <h2 className="panel-title">{title}</h2>
          {description && <p className="muted text-xs mt-1.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
