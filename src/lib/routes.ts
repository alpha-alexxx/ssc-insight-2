/**
 * The workspace route registry — one list, three derivations.
 *
 * Everything that needs to know "which views exist" reads this module:
 *
 *  - `AppView` is derived from `VIEW_PATH`, so a view cannot exist without an
 *    address. The previous shape (a hand-written union plus a separate
 *    `Record<string, AppView>` lookup) made a missing path a *non*-error: the
 *    resolver fell through to the dashboard and rendered the wrong surface.
 *  - `PATH_VIEW` is the inverse map, built from the same object rather than
 *    restated.
 *  - `viewForPathname` owns the one dynamic case (`/plan/...`).
 *
 * Kept free of React and of any component import so `tests/routes.test.ts` can
 * assert the registry without loading the shell's CSS modules.
 */

export const VIEW_PATH = {
  dashboard: "/dashboard",
  calendar: "/calendar",
  tasks: "/my-tasks",
  plan: "/plan",
  history: "/history",
  compare: "/compare",
  performance: "/performance",
  add: "/add",
  trash: "/trash",
  settings: "/settings",
} as const;

export type AppView = keyof typeof VIEW_PATH;

/** Address for a view. Identical to `VIEW_PATH`, kept as the older name. */
export const VIEW_HREF: Record<AppView, `/${string}`> = VIEW_PATH;

/** Path → view. Unknown paths are absent here; the resolver owns the fallback. */
export const PATH_VIEW: Record<string, AppView> = Object.fromEntries(
  Object.entries(VIEW_PATH).map(([view, path]) => [path, view]),
) as Record<string, AppView>;

/** Every routable view, in registry order. */
export const APP_VIEWS = Object.keys(VIEW_PATH) as AppView[];

/**
 * Resolve a pathname to its view.
 *
 * `/plan` and `/plan/<date>` and `/plan/week/<date>` all belong to the plan
 * view. The bare `/plan` renders the day view for a moment while the shell
 * rewrites the URL to `/plan/<today>`; treating it as the dashboard would
 * flash the wrong surface first.
 */
export function viewForPathname(pathname: string): AppView {
  if (pathname === "/plan" || pathname.startsWith("/plan/")) return "plan";
  return PATH_VIEW[pathname] ?? "dashboard";
}
