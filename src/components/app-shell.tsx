"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthControl } from "./auth-control";
import { ExamSwitcher } from "./exam-switcher";
import { useExamScope } from "./exam-context";
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

/** Platform check for the search kbd hint — the shortcut itself accepts both. */
const IS_APPLE_PLATFORM =
  typeof navigator !== "undefined" &&
  /Mac|iP(hone|ad|od)/.test(navigator.userAgent);

/** Route-aware shell wrapper. Kept here so the workspace layout imports one
 * component for both the sidebar provider and the page frame. */
export function AppFrame({
  view,
  userName,
  userEmail,
  userImage,
  authEnabled,
  aiEnabled,
  onRouteIntent,
  onAddMock,
  onOpenAi,
  onOpenSearch,
  children,
  defaultSidebarOpen = true,
}: {
  view: AppView;
  userName: string;
  userEmail: string;
  userImage: string;
  authEnabled: boolean;
  aiEnabled: boolean;
  onRouteIntent: (view: AppView) => void;
  onAddMock: () => void;
  onOpenAi: () => void;
  onOpenSearch: () => void;
  children: React.ReactNode;
  defaultSidebarOpen?: boolean;
}) {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar
        view={view}
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
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          authEnabled={authEnabled}
          aiEnabled={aiEnabled}
          onRouteIntent={onRouteIntent}
          onOpenAi={onOpenAi}
          onOpenSearch={onOpenSearch}
        />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

/**
 * Navigation groups. The plan entry's href is deliberately NOT baked in here:
 * a module-level `planHref()` froze yesterday's IST date into the sidebar for
 * as long as the tab stayed open. `navGroups()` resolves it per render.
 */
export const NAV_GROUPS: {
  label: string;
  items: { view: AppView; label: string; href: string | (() => string) }[];
}[] = [
  {
    label: "Study planner",
    items: [
      { view: "dashboard", label: "Dashboard", href: VIEW_HREF.dashboard },
      { view: "calendar", label: "Study calendar", href: VIEW_HREF.calendar },
      { view: "plan", label: "Today's plan", href: planHref },
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
  onRouteIntent,
  onAddMock,
}: {
  view: AppView;
  onRouteIntent: (view: AppView) => void;
  onAddMock: () => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-rule-soft py-[var(--sidebar-header-pad-y)]">
        <div className="flex items-center gap-1">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                tooltip="SSC Insight dashboard"
                className="h-10 gap-2.5 rounded-control"
              >
                <Link
                  href="/dashboard"
                  aria-label="SSC Insight dashboard"
                  onClick={() => {
                    onRouteIntent("dashboard");
                    setOpenMobile(false);
                  }}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-control border border-rule-soft bg-canvas">
                    <PlainIcon name="book" size={17} tone="accent" />
                  </span>
                  <span
                    className={cn(
                      "grid min-w-0 flex-1 text-left",
                      COLLAPSED_TEXT_SPAN,
                    )}
                  >
                    <span className="truncate font-serif text-[1.3125rem] font-semibold leading-none tracking-[-0.035em]">
                      ssc<span className="text-accent">insight.</span>
                    </span>
                    <span className="mt-1 truncate text-[0.5625rem] font-medium uppercase tracking-[0.12em] text-muted">
                      Mock workspace
                    </span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpenMobile(false)}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-control text-muted hover:bg-soft hover:text-ink md:hidden"
          >
            <PlainIcon name="close" size={16} />
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="flex items-center gap-2.5 overflow-hidden px-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted group-data-[collapsible=icon]:px-0">
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
                    /* The href may be a function so a date-bearing route
                       (today's plan) stays current without a reload. */
                    item={{
                      ...item,
                      href:
                        typeof item.href === "function"
                          ? item.href()
                          : item.href,
                    }}
                    active={view === item.view}
                    onRouteIntent={onRouteIntent}
                  />
                ))}
                {group.label === "Results" && (
                  <SidebarMenuItem className="px-1.5 pt-1.5 group-data-[collapsible=icon]:px-0">
                    <SidebarMenuButton
                      tooltip="Log a mock"
                      type="button"
                      onClick={() => {
                        onAddMock();
                        setOpenMobile(false);
                      }}
                      className={cn(
                        "sidebar-cta flex min-h-10 w-full items-center gap-2.5 rounded-control bg-accent px-2.5 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent-hover",
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
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-rule-soft bg-canvas/60">
        <ActiveExamFooterNote />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/** Sidebar footer note: the active scope ("SSC CGL · Tier 2"). */
function ActiveExamFooterNote() {
  const scope = useExamScope();
  const label = scope.exams
    ? scope.examLabel(scope.activeExamId, scope.activeTierId)
    : "SSC CGL";
  return (
    <p className="mx-2 flex items-center gap-1.5 py-2.5 text-[0.625rem] leading-relaxed text-muted group-data-[collapsible=icon]:hidden">
      <PlainIcon name="calendar" size={11} />
      {label} · dates in IST
    </p>
  );
}

/** Props for {@link AppHeader}. */
export interface AppHeaderProps {
  view: AppView;
  userName: string;
  userEmail: string;
  userImage: string;
  authEnabled: boolean;
  aiEnabled: boolean;
  onRouteIntent: (view: AppView) => void;
  onOpenAi: () => void;
  onOpenSearch: () => void;
}

/**
 * Top-of-app navigation bar. Full-bleed: pinned to the top, left, and right
 * of the viewport with no surrounding margin. Only the bottom edge carries a
 * hairline — the other three edges are the viewport itself.
 *
 * **Five controls on phones.** Six controls plus a breadcrumb cannot fit in
 * 375px, so below `sm` the bar keeps the trigger, the (truncating) page title,
 * search, theme and the account avatar. Ask AI lives in the sidebar and the
 * ⌘K palette; the exam switcher collapses to its icon. From `sm` every
 * control returns with its label and the search becomes the full pill.
 */
export function AppHeader({
  view,
  userName,
  userEmail,
  userImage,
  authEnabled,
  aiEnabled,
  onRouteIntent,
  onOpenAi,
  onOpenSearch,
}: AppHeaderProps) {
  const router = useRouter();
  const { label } = VIEW_META[view];

  const openSettings = () => {
    onRouteIntent("settings");
    router.push(VIEW_HREF.settings);
  };

  return (
    <header
      className="
        app-header sticky inset-x-0 top-0 z-30
        flex h-[var(--app-header-h)] w-full shrink-0 items-center gap-1.5
        border-b border-rule-soft
        bg-paper/95 px-3 backdrop-blur-sm
        sm:gap-2 sm:px-4 md:px-6
      "
    >
      <SidebarTrigger className="size-11 shrink-0 sm:size-8" />

      <HeaderLocation label={label} />

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Phones: a square icon. From sm: the pill with the shortcut hint. */}
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className="
            inline-flex size-11 shrink-0 items-center justify-center
            rounded-control border border-rule-soft bg-paper text-muted
            transition-colors hover:border-rule hover:text-ink
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
            sm:h-8 sm:w-auto sm:justify-start sm:gap-2 sm:rounded-pill sm:px-3
          "
        >
          <PlainIcon name="search" size={15} />
          <span className="hidden sm:inline">Search</span>
          <kbd
            aria-hidden="true"
            className="hidden font-sans text-[0.6875rem] font-medium tracking-wide text-muted md:inline"
          >
            {IS_APPLE_PLATFORM ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>

        {/* Ask AI is a phone-sidebar and ⌘K destination; the header carries it
            only where there is room for the label to be honest. */}
        {aiEnabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAi}
            className="hidden h-8 px-2.5 sm:inline-flex"
            aria-label="Ask AI"
          >
            <PlainIcon
              name="sparkles"
              size={15}
              tone="accent"
              aria-hidden="true"
            />
            <span className="hidden md:inline">Ask AI</span>
          </Button>
        )}

        <ExamSwitcher onManageExams={openSettings} compact />

        <ThemeToggle className="size-11 sm:size-8" />

        <AuthControl
          enabled={authEnabled}
          name={userName}
          email={userEmail}
          imageUrl={userImage}
          onSettings={openSettings}
        />
      </div>
    </header>
  );
}

/**
 * Current-location indicator. Rendered as a breadcrumb landmark so assistive
 * technologies announce it consistently with the rest of the app.
 */
function HeaderLocation({ label }: { label: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-[3.25rem] flex-1 items-center gap-2 overflow-hidden sm:min-w-0 sm:flex-none"
    >
      <span className="hidden shrink-0 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted sm:inline">
        Workspace
      </span>
      <PlainIcon
        name="chevronRight"
        size={12}
        className="hidden shrink-0 text-muted sm:inline"
        aria-hidden="true"
      />
      {/* The leaf title is the one thing that must survive a narrow bar. */}
      <span
        className="min-w-0 truncate text-sm font-semibold text-ink"
        aria-current="page"
      >
        {label}
      </span>
    </nav>
  );
}
