"use client";
import Link from "next/link";
import { AuthControl } from "./auth-control";
import { DuotoneIcon, PlainIcon } from "./icon";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
  COLLAPSED_ICON_BUTTON,
  COLLAPSED_TEXT_SPAN,
} from "./ui/sidebar";
import { istTodayIso } from "@/lib/plan/view-model";
import { cn } from "@/lib/utils";

/**
 * Application shell — official shadcn sidebar composition adapted to the
 * real workspace routes. The sidebar owns expanded/collapsed and the mobile
 * Sheet; the shell keeps route intent, auth, and view labels.
 */

export type AppView =
  | "dashboard"
  | "calendar"
  | "tasks"
  | "plan"
  | "history"
  | "compare"
  | "add"
  | "settings";

/** Plan-day route for "today" (IST) — computed per render, not at module load. */
export function planHref(dateIso?: string): `/${string}` {
  return `/plan/${dateIso ?? istTodayIso()}`;
}

export const VIEW_HREF: Record<AppView, `/${string}`> = {
  dashboard: "/dashboard",
  calendar: "/calendar",
  tasks: "/my-tasks",
  plan: "/plan",
  history: "/history",
  compare: "/compare",
  add: "/add",
  settings: "/settings",
};

export const VIEW_META: Record<
  AppView,
  { label: string; icon: Parameters<typeof DuotoneIcon>[0]["name"] }
> = {
  dashboard: { label: "Dashboard", icon: "dashboard" },
  calendar: { label: "Study calendar", icon: "calendar" },
  tasks: { label: "My tasks", icon: "check" },
  plan: { label: "Daily plan", icon: "layers" },
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

/** Route-aware shell wrapper. Kept here so the workspace layout imports one
 * component for both the sidebar provider and the page frame. */
export function AppFrame({
  view,
  userName,
  userEmail,
  authEnabled,
  aiEnabled,
  onRouteIntent,
  onAddMock,
  onOpenAi,
  children,
}: {
  view: AppView;
  userName: string;
  userEmail: string;
  authEnabled: boolean;
  aiEnabled: boolean;
  onRouteIntent: (view: AppView) => void;
  onAddMock: () => void;
  onOpenAi: () => void;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar
        view={view}
        userName={userName}
        userEmail={userEmail}
        onRouteIntent={onRouteIntent}
        onAddMock={onAddMock}
      />
      <SidebarInset
        id="main-content"
        tabIndex={-1}
        className="min-w-0 bg-canvas focus:outline-none"
      >
        <AppHeader
          view={view}
          authEnabled={authEnabled}
          aiEnabled={aiEnabled}
          onOpenAi={onOpenAi}
        />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

const NAV_GROUPS: {
  label: string;
  items: { view: AppView; label: string; href: string }[];
}[] = [
  {
    label: "Study planner",
    items: [
      { view: "dashboard", label: "Dashboard", href: VIEW_HREF.dashboard },
      { view: "calendar", label: "Study calendar", href: VIEW_HREF.calendar },
      { view: "plan", label: "Today's plan", href: planHref() },
      { view: "tasks", label: "My tasks", href: VIEW_HREF.tasks },
    ],
  },
  {
    label: "Results",
    items: [
      { view: "history", label: "Mock history", href: VIEW_HREF.history },
      { view: "compare", label: "Compare mocks", href: VIEW_HREF.compare },
    ],
  },
];

function NavItem({
  item,
  active,
  onRouteIntent,
}: {
  item: { view: AppView; label: string; href: string };
  active: boolean;
  onRouteIntent: (view: AppView) => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.label}
        className="data-[active=true]:bg-accent-soft data-[active=true]:text-accent data-[active=true]:hover:bg-accent-soft data-[active=true]:hover:text-accent"
      >
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={() => {
            onRouteIntent(item.view);
            setOpenMobile(false);
          }}
        >
          <PlainIcon
            name={VIEW_META[item.view].icon}
            size={17}
            tone={active ? "accent" : "ink"}
          />
          <span className={cn(COLLAPSED_TEXT_SPAN)}>{item.label}</span>
          {active && (
            <PlainIcon
              name="chevronRight"
              size={13}
              tone="accent"
              className="ml-auto shrink-0 group-data-[collapsible=icon]:hidden"
            />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({
  view,
  userName,
  userEmail,
  onRouteIntent,
  onAddMock,
}: {
  view: AppView;
  userName: string;
  userEmail: string;
  onRouteIntent: (view: AppView) => void;
  onAddMock: () => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon" className="border-r border-rule">
      <SidebarHeader className="border-b border-rule-soft px-2 py-3 group-data-[collapsible=icon]:px-0">
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-control px-2 text-ink group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0"
            aria-label="SSC Insight dashboard"
            onClick={() => setOpenMobile(false)}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-control border border-rule-soft bg-canvas">
              <PlainIcon name="book" size={17} tone="accent" />
            </span>
            <span
              className={cn(
                "min-w-0",
                COLLAPSED_TEXT_SPAN,
              )}
            >
              <span className="block font-serif text-[21px] font-semibold leading-none tracking-[-0.035em]">
                ssc<span className="text-accent">insight</span>
                <span className="text-accent">.</span>
              </span>
              <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.12em] text-muted">
                Mock workspace
              </span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpenMobile(false)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted hover:bg-soft hover:text-ink md:hidden"
          >
            <PlainIcon name="close" size={16} />
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="flex items-center gap-2.5 overflow-hidden px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted group-data-[collapsible=icon]:px-0">
              <span className={cn("shrink-0", COLLAPSED_TEXT_SPAN)}>
                {group.label}
              </span>
              <span className="h-px flex-1 bg-rule-soft" aria-hidden="true" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavItem
                    key={item.view}
                    item={item}
                    active={view === item.view}
                    onRouteIntent={onRouteIntent}
                  />
                ))}
                {group.label === "Results" && (
                  <SidebarMenuItem className="px-1.5 pt-1.5 group-data-[collapsible=icon]:px-0">
                    <button
                      type="button"
                      onClick={() => {
                        onAddMock();
                        setOpenMobile(false);
                      }}
                      className={cn(
                        "flex min-h-10 w-full items-center gap-2.5 rounded-control bg-accent px-2.5 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent-hover",
                        COLLAPSED_ICON_BUTTON,
                      )}
                    >
                      <PlainIcon name="plus" size={16} tone="paper" />
                      <span className={cn(COLLAPSED_TEXT_SPAN)}>
                        Log a mock
                      </span>
                      <PlainIcon
                        name="chevronRight"
                        size={13}
                        tone="paper"
                        className="ml-auto shrink-0 group-data-[collapsible=icon]:hidden"
                      />
                    </button>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-rule-soft bg-canvas/60 group-data-[collapsible=icon]:px-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={view === "settings"}
              tooltip="Settings"
              className="data-[active=true]:bg-accent-soft data-[active=true]:text-accent data-[active=true]:hover:bg-accent-soft"
            >
              <Link
                href={VIEW_HREF.settings}
                aria-current={view === "settings" ? "page" : undefined}
                onClick={() => {
                  onRouteIntent("settings");
                  setOpenMobile(false);
                }}
              >
                <PlainIcon
                  name="settings"
                  size={17}
                  tone={view === "settings" ? "accent" : "ink"}
                />
                <span className={cn(COLLAPSED_TEXT_SPAN)}>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <div className="flex min-h-10 w-full items-center justify-between gap-2 rounded-control px-2.5 py-1.5 text-sm text-ink">
              <span className="flex items-center gap-2.5">
                <PlainIcon name="moon" size={16} tone="ink" />
                Dark mode
              </span>
              <ThemeToggle className="size-7" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="mx-2 mb-1 rounded-panel border border-rule-soft bg-paper px-2.5 py-2.5 group-data-[collapsible=icon]:mx-0 group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0">
          <div className="flex min-w-0 items-center justify-center gap-2.5 group-data-[collapsible=icon]:gap-0">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-semibold tracking-wide text-paper"
              aria-hidden="true"
            >
              {initials(userName)}
            </span>
            <div
              className={cn(
                "min-w-0 flex-1",
                COLLAPSED_TEXT_SPAN,
              )}
            >
              <p className="truncate text-xs font-medium">{userName || "My workspace"}</p>
              <p className="truncate text-[10px] text-muted">
                {userEmail || "Private account"}
              </p>
            </div>
            <PlainIcon
              name="chevronRight"
              size={13}
              className="shrink-0 text-muted group-data-[collapsible=icon]:hidden"
            />
          </div>
          <p className="mt-2 flex items-center gap-1.5 border-t border-rule-soft pt-2 text-[10px] leading-relaxed text-muted group-data-[collapsible=icon]:hidden">
            <PlainIcon name="calendar" size={11} />
            SSC CGL Tier 2 · dates in IST
          </p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppHeader({
  view,
  authEnabled,
  aiEnabled,
  onOpenAi,
}: {
  view: AppView;
  authEnabled: boolean;
  aiEnabled: boolean;
  onOpenAi: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 mx-3 mt-3 flex h-13 shrink-0 items-center gap-2 rounded-panel border border-rule-soft bg-paper/95 px-3 py-2.5 backdrop-blur-sm md:mx-5 md:px-4">
      <SidebarTrigger className="size-8 shrink-0" />
      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-muted sm:inline">
          Workspace
        </span>
        <PlainIcon
          name="chevronRight"
          size={12}
          className="hidden shrink-0 text-muted sm:inline"
          aria-hidden="true"
        />
        <span className="truncate text-sm font-semibold text-ink">
          {VIEW_META[view].label}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {aiEnabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAi}
            className="h-8 px-2.5"
            aria-label="Open AI coach"
          >
            <PlainIcon name="sparkles" size={15} tone="accent" />
            <span className="hidden md:inline">Ask coach</span>
          </Button>
        )}
        <ThemeToggle className="size-8" />
        <Link
          href={VIEW_HREF.settings}
          aria-label="Settings and account"
          title="Settings and account"
          className="inline-flex size-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-soft hover:text-ink"
        >
          <PlainIcon name="settings" size={17} />
        </Link>
        <AuthControl enabled={authEnabled} />
      </div>
    </header>
  );
}
