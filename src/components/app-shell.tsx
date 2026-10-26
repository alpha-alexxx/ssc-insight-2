"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { AuthControl } from "./auth-control";
import { DuotoneIcon, PlainIcon } from "./icon";
import { ThemeToggle } from "./theme-toggle";

/**
 * Application shell — sidebar, header, mobile navigation (Phase 4).
 *
 * Design decisions:
 * - Sidebar (≥1024px): 224px paper column, ledger nav with duotone icons,
 *   live user identity (real initials/name/email), one quiet note card.
 * - Header: breadcrumb context, theme toggle on every viewport (previously
 *   hidden on mobile), help entry, auth control.
 * - Mobile nav: icon+label pills with ≥40px touch targets.
 */

export type AppView = "dashboard" | "history" | "compare" | "add" | "settings";

export const VIEW_META: Record<AppView, { label: string; icon: Parameters<typeof DuotoneIcon>[0]["name"] }> = {
  dashboard: { label: "Dashboard", icon: "dashboard" },
  history: { label: "Mock history", icon: "history" },
  compare: { label: "Compare mocks", icon: "compare" },
  add: { label: "Log a mock", icon: "add" },
  settings: { label: "Settings", icon: "settings" },
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ME";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? parts.at(-1)![0] ?? "" : "";
  return (first + last).toUpperCase() || "ME";
}

export function AppSidebar({
  view,
  onNavigate,
  userName,
  userEmail,
}: {
  view: AppView;
  onNavigate: (view: AppView) => void;
  userName: string;
  userEmail: string;
}) {
  const reduced = useReducedMotion();
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[224px] bg-paper border-r border-rule hidden lg:flex flex-col z-20">
      <Link href="/" className="flex items-center px-6 h-24" aria-label="SSC Insight home">
        <span className="wordmark">
          ssc<span className="text-accent">insight</span>
          <span className="text-accent">.</span>
          <span className="block font-sans text-[9px] tracking-[.03em] muted font-normal mt-2">
            Your preparation, clearer
          </span>
        </span>
      </Link>
      <div className="px-4 mt-6">
        <p className="section-label px-3 mb-3">Workspace</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {(
            [
              "dashboard",
              "history",
              "compare",
            ] as const
          ).map((id) => (
            <button
              key={id}
              className={`nav-button ${view === id ? "active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => onNavigate(id)}
            >
              <DuotoneIcon
                name={VIEW_META[id].icon}
                size={18}
                tone={view === id ? "paper" : "ink"}
              />
              {VIEW_META[id].label}
              {view === id && (
                <motion.span
                  layoutId="nav-dot"
                  transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 35 }}
                  className="ml-auto size-1.5 rounded-pill bg-accent"
                />
              )}
            </button>
          ))}
        </nav>
        <p className="section-label px-3 mb-3 mt-10">Preferences</p>
        <button
          className={`nav-button ${view === "settings" ? "active" : ""}`}
          aria-current={view === "settings" ? "page" : undefined}
          onClick={() => onNavigate("settings")}
        >
          <DuotoneIcon
            name="settings"
            size={18}
            tone={view === "settings" ? "paper" : "ink"}
          />
          Settings &amp; backup
        </button>
      </div>
      <div className="mt-auto mx-5 mb-5 p-4 rounded-control bg-canvas">
        <DuotoneIcon name="book" size={22} tone="accent" className="mb-3" />
        <p className="font-medium text-xs">One mock at a time.</p>
        <p className="text-xs muted leading-relaxed mt-1">
          Consistency is your biggest advantage. Keep showing up.
        </p>
      </div>
      <div className="px-6 py-5 border-t border-rule-soft flex gap-3 items-center min-w-0">
        <span
          className="size-9 bg-ink text-paper rounded-card flex items-center justify-center text-xs font-semibold tracking-wide shrink-0"
          aria-hidden="true"
        >
          {initials(userName)}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{userName || "My workspace"}</p>
          <p className="text-[11px] muted truncate">
            {userEmail || "Private · your account"}
          </p>
        </div>
      </div>
    </aside>
  );
}

export function AppHeader({
  view,
  onNavigate,
  authEnabled,
}: {
  view: AppView;
  onNavigate: (view: AppView) => void;
  authEnabled: boolean;
}) {
  return (
    <header className="h-[72px] px-5 md:px-9 bg-paper border-b border-rule flex justify-between items-center gap-3">
      <div className="flex items-center gap-3 text-xs muted min-w-0">
        <span className="lg:hidden wordmark-mobile text-ink">
          sscinsight<span className="text-accent">.</span>
        </span>
        <span className="hidden lg:inline">My workspace</span>
        <PlainIcon name="chevronRight" size={13} className="hidden lg:block" />
        <span className="text-ink font-medium hidden sm:inline">
          {VIEW_META[view].label}
        </span>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="hidden xl:flex items-center gap-2 text-xs muted">
          <span className="size-1.5 rounded-pill bg-accent" />
          SSC CGL Tier 2
        </span>
        <span className="h-5 w-px bg-rule-soft hidden xl:block" />
        <ThemeToggle />
        <button
          title="Settings, backup and about"
          aria-label="Settings, backup and about"
          onClick={() => onNavigate("settings")}
          className="muted hover:text-accent transition-colors"
        >
          <PlainIcon name="help" size={19} />
        </button>
        <AuthControl enabled={authEnabled} />
      </div>
    </header>
  );
}

export function MobileNav({
  view,
  onNavigate,
}: {
  view: AppView;
  onNavigate: (view: AppView) => void;
}) {
  const items = [
    "dashboard",
    "history",
    "compare",
    "settings",
  ] as const;
  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden flex gap-1 px-3 py-2 bg-paper border-b overflow-x-auto"
    >
      {items.map((v) => (
        <button
          onClick={() => onNavigate(v)}
          aria-current={view === v ? "page" : undefined}
          key={v}
          className={`flex items-center gap-1.5 min-h-11 px-3 whitespace-nowrap rounded-control text-xs transition-colors ${
            view === v ? "bg-ink text-paper" : "muted hover:bg-soft"
          }`}
        >
          <DuotoneIcon name={VIEW_META[v].icon} size={15} tone={view === v ? "paper" : "muted"} />
          {VIEW_META[v].label}
        </button>
      ))}
    </nav>
  );
}
