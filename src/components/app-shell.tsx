"use client";
import Link from "next/link";
import { AuthControl } from "./auth-control";
import { DuotoneIcon, PlainIcon } from "./icon";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
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
} from "./ui/sidebar";
import { istTodayIso } from "@/lib/plan/view-model";

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
        className="data-[active=true]:bg-ink data-[active=true]:text-paper data-[active=true]:hover:bg-ink data-[active=true]:hover:text-paper"
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
            tone={active ? "paper" : "ink"}
          />
          <span className="group-data-[collapsible=icon]:hidden">
            {item.label}
          </span>
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
      <SidebarHeader className="border-b border-rule-soft px-2 py-3">
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-control px-2 text-ink"
            aria-label="SSC Insight dashboard"
            onClick={() => setOpenMobile(false)}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-control border border-rule-soft bg-canvas">
              <PlainIcon name="book" size={17} tone="accent" />
            </span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
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
            <SidebarGroupLabel className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {group.label}
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
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={view === "add"}
                      tooltip="Log a mock"
                      onClick={() => {
                        onAddMock();
                        setOpenMobile(false);
                      }}
                      className="data-[active=true]:bg-ink data-[active=true]:text-paper data-[active=true]:hover:bg-ink"
                    >
                      <PlainIcon
                        name="plus"
                        size={17}
                        tone={view === "add" ? "paper" : "ink"}
                      />
                      <span className="group-data-[collapsible=icon]:hidden">
                        Log a mock
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-rule-soft bg-canvas/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={view === "settings"}
              tooltip="Settings"
              className="data-[active=true]:bg-ink data-[active=true]:text-paper data-[active=true]:hover:bg-ink"
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
                  tone={view === "settings" ? "paper" : "ink"}
                />
                <span className="group-data-[collapsible=icon]:hidden">
                  Settings
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex min-w-0 items-center gap-2.5 px-2 py-1.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-semibold tracking-wide text-paper"
            aria-hidden="true"
          >
            {initials(userName)}
          </span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-medium">{userName || "My workspace"}</p>
            <p className="truncate text-[10px] text-muted">
              {userEmail || "Private account"}
            </p>
          </div>
        </div>
        <p className="px-2 pb-1 text-[10px] leading-relaxed text-muted group-data-[collapsible=icon]:hidden">
          SSC CGL Tier 2 · dates in IST
        </p>
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
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-rule bg-paper/95 px-3 backdrop-blur-sm md:px-5">
      <SidebarTrigger className="size-8 shrink-0" />
      <Separator orientation="vertical" className="mx-1 h-5 bg-rule-soft" />
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-muted sm:inline">
          Workspace
        </span>
        <span className="truncate text-xs font-medium text-ink">
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
