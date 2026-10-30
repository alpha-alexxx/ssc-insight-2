import type { ReactNode } from "react";
import { DuotoneIcon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * The signed-in workspace, drawn at mockup scale.
 *
 * This is the shell every product mockup sits inside: a 15rem paper sidebar
 * collapsing to a header-only layout in narrow frames, the 56px sticky
 * header strip, and a content column on canvas with a page head. It mirrors
 * `app-shell.tsx` / `page-header.tsx` closely enough to be recognisable, but
 * it is static and hook-free — no sidebar state, no routing, no session.
 *
 * Geometry comes from the same density tokens as the app, so switching to
 * `mira` tightens the mockup and `sera` squares it exactly as the real
 * workspace does.
 */

const NAV: { label: string; icon: IconName }[] = [
  { label: "Dashboard", icon: "dashboard" },
  { label: "Study calendar", icon: "calendar" },
  { label: "Today's plan", icon: "layers" },
  { label: "My tasks", icon: "check" },
];

const RESULTS: { label: string; icon: IconName }[] = [
  { label: "Mock history", icon: "history" },
  { label: "Compare mocks", icon: "compare" },
];

function NavItem({
  label,
  icon,
  active,
}: {
  label: string;
  icon: IconName;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-[0.55em] rounded-control px-[0.6em] py-[0.42em] text-[0.9em]",
        active
          ? "bg-ink font-medium text-paper"
          : "text-muted",
      )}
    >
      <DuotoneIcon name={icon} size={12} tone={active ? "paper" : "muted"} />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function MockSidebar({ active }: { active: string }) {
  return (
    <aside className="hidden w-[9.5em] shrink-0 flex-col border-r border-rule bg-paper px-[0.7em] py-[0.9em] @[600px]:flex">
      <div className="px-[0.6em] pb-[0.9em]">
        <p className="mock-title text-[1.25em] leading-none">
          ssc<span className="text-accent">insight</span>
          <span className="text-accent">.</span>
        </p>
        <p className="mock-label mt-1 text-[0.72em]">Mock workspace</p>
      </div>
      <p className="mock-label px-[0.6em] pb-[0.35em]">Study planner</p>
      <div className="flex flex-col gap-[0.1em]">
        {NAV.map((item) => (
          <NavItem key={item.label} {...item} active={item.label === active} />
        ))}
      </div>
      <p className="mock-label mt-[0.9em] px-[0.6em] pb-[0.35em]">Results</p>
      <div className="flex flex-col gap-[0.1em]">
        {RESULTS.map((item) => (
          <NavItem key={item.label} {...item} active={item.label === active} />
        ))}
      </div>
      <div className="mt-[0.9em] rounded-control bg-accent px-[0.6em] py-[0.45em] text-center text-[0.85em] font-medium text-paper">
        + Log a mock
      </div>
      <div className="mt-auto pt-[1em]">
        <div className="flex items-center gap-[0.5em] px-[0.6em] text-[0.82em] text-muted">
          <span className="size-[1.4em] rounded-full bg-ink text-center text-[0.72em] leading-[1.4em] text-paper">
            LD
          </span>
          <span className="truncate">Local Developer</span>
        </div>
        <p className="mock-label mt-[0.5em] px-[0.6em] text-[0.68em]">
          SSC CGL Tier 2 · dates in IST
        </p>
      </div>
    </aside>
  );
}

export function MockTopBar({
  view,
  actions,
}: {
  view: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex h-[2.8em] items-center gap-[0.8em] border-b border-rule-soft bg-paper px-[1em]">
      <div className="flex min-w-0 items-center gap-[0.45em]">
        <span aria-hidden="true" className="flex w-[1em] flex-col gap-[2px]">
          <span className="h-px bg-ink" />
          <span className="h-px bg-ink" />
          <span className="h-px bg-ink" />
        </span>
        <span className="mock-label truncate">Workspace</span>
        <span className="text-muted">›</span>
        <span className="truncate text-[0.9em] font-medium">{view}</span>
      </div>
      <div className="ml-auto flex items-center gap-[0.6em]">
        <span className="hidden items-center gap-[0.35em] rounded-control border border-rule-soft px-[0.5em] py-[0.2em] text-[0.8em] text-muted @[520px]:flex">
          Search…
          <span className="rounded-[2px] border border-rule-soft px-[0.25em] text-[0.85em]">
            ⌘K
          </span>
        </span>
        <span className="hidden text-[0.82em] text-muted @[420px]:inline">Ask coach</span>
        {actions}
        <span className="size-[1.35em] rounded-full bg-accent-soft text-center text-[0.68em] leading-[1.35em] text-accent">
          LD
        </span>
      </div>
    </div>
  );
}

/** The content head: serif title, muted subtitle, one hairline, actions. */
export function MockPageHead({
  title,
  subtitle,
  meta,
  actions,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b border-rule px-[1.1em] pb-[0.7em] pt-[1.1em]">
      <div className="flex flex-wrap items-start justify-between gap-[0.6em]">
        <div className="min-w-0">
          <h3 className="mock-title text-[1.75em] font-[450] tracking-[-0.03em]">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-[0.2em] text-[0.85em] text-muted">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-[0.4em]">{actions}</div>
        ) : null}
      </div>
      {meta ? <p className="mock-label mt-[0.55em]">{meta}</p> : null}
    </div>
  );
}

export function MockPanel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("mock-panel", className)}>
      {title ? (
        <div className="flex items-start justify-between gap-[0.6em] px-[0.9em] pb-[0.4em] pt-[0.75em]">
          <div className="min-w-0">
            <h4 className="mock-title text-[1.1em]">{title}</h4>
            {description ? (
              <p className="mt-[0.15em] text-[0.78em] text-muted">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0 text-[0.8em]">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn("px-[0.9em] pb-[0.9em]", !title && "pt-[0.9em]", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

/**
 * The full frame: sidebar + top bar + a content column. `children` render
 * inside the canvas area, below whatever page head the screen provides.
 */
export function WorkspaceFrame({
  view,
  active,
  children,
  actions,
}: {
  view: string;
  /** The sidebar row to highlight. */
  active: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="@container flex min-h-[22em] bg-canvas">
      <MockSidebar active={active} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MockTopBar view={view} actions={actions} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
