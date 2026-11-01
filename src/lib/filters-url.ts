import { z } from "zod";
import {
  ATTEMPT_SORT_KEYS,
  dashboardScopeSchema,
  filtersSchema,
  type DashboardScope,
  type Filters,
  type PageSize,
  type SortKey,
} from "./domain";

/**
 * URL ⇄ filter-state mapping for the workspace views.
 *
 * The URL is a shareable mirror of the shell's filter/scope/list state, not
 * the source of truth. State changes are written to the address bar with
 * history.replaceState — no Next.js navigation, no RSC round-trip, and no
 * history entry per keystroke. A hard load of a shared URL restores the
 * state once on mount (after hydration, so there is no mismatch). Browser
 * Back therefore changes routes, not filters — a deliberate trade-off for a
 * private tracker where filters are ephemeral view state.
 */

// Malformed deep links degrade to defaults instead of erroring: one bad
// param drops only its own filter, not the whole state.
const lenientFiltersSchema = filtersSchema.extend({
  type: filtersSchema.shape.type.catch(undefined),
  subject: filtersSchema.shape.subject.catch(undefined),
  tier: filtersSchema.shape.tier.catch(undefined),
  platform: filtersSchema.shape.platform.catch(undefined),
  search: filtersSchema.shape.search.catch(undefined),
  from: filtersSchema.shape.from.catch(undefined),
  to: filtersSchema.shape.to.catch(undefined),
});

// List-state mirror (page/pageSize/sort/dir). One `page` param serves both
// /history and /compare — each view owns its own page state and only the
// active view's is written, matching how filters reset on navigation.
const lenientPageSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(100_000)
  .optional()
  .catch(undefined);
const lenientPageSizeSchema = z.coerce
  .number()
  .int()
  .pipe(z.union([z.literal(10), z.literal(20), z.literal(50), z.literal(100)]))
  .optional()
  .catch(undefined);
const lenientSortSchema = z.enum(ATTEMPT_SORT_KEYS).optional().catch(undefined);
const lenientDirSchema = z.enum(["asc", "desc"]).optional().catch(undefined);

/** Server-paged list state mirrored alongside the filters. */
/** The scope a clean URL means. `/performance` opens on every mock type. */
export const DEFAULT_SCOPE: DashboardScope = "all";

export type WorkspaceListState = {
  page: number;
  pageSize: PageSize;
  sort: SortKey;
  dir: "asc" | "desc";
};

export const defaultListState: WorkspaceListState = {
  page: 1,
  pageSize: 10,
  sort: "date",
  dir: "desc",
};

export type WorkspaceUrlState = {
  filters: Filters;
  scope: DashboardScope;
  list: WorkspaceListState;
  /** Compare selection, in selection order. Max four; ids are opaque. */
  ids?: string[];
};

/** Compare accepts at most four results, mirroring the picker's own rule. */
export const MAX_COMPARE_IDS = 4;
const COMPARE_ID = /^[A-Za-z0-9_-]{6,64}$/;

function parseCompareIds(value: string | null): string[] {
  if (!value) return [];
  const ids: string[] = [];
  for (const raw of value.split(",")) {
    const id = raw.trim();
    if (!COMPARE_ID.test(id) || ids.includes(id)) continue;
    ids.push(id);
    if (ids.length === MAX_COMPARE_IDS) break;
  }
  return ids;
}

/** Views whose address bar mirrors the shared filter/scope state. */
export function mirrorsWorkspaceState(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname === "/history" ||
    pathname === "/compare" ||
    // The analytical workspace mirrors its scope and filters, so a filtered
    // analysis is shareable and survives a reload.
    pathname === "/performance"
  );
}

/**
 * Only same-app destinations may be used as an Add Mock return target.
 * Accepts a plan day or one of the stable planner/result routes.
 */
export function safeWorkspaceReturnTo(value: string | null): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value, "https://ssc-insight.local");
  } catch {
    return null;
  }
  if (url.origin !== "https://ssc-insight.local") return null;
  const allowed =
    url.pathname.startsWith("/plan/") ||
    url.pathname === "/calendar" ||
    url.pathname === "/my-tasks" ||
    url.pathname === "/dashboard" ||
    url.pathname === "/history" ||
    url.pathname === "/performance" ||
    // A comparison is a place, not a transient mode: logging a mock from it
    // must be able to return to it.
    url.pathname === "/compare";
  return allowed ? `${url.pathname}${url.search}` : null;
}

export function parseWorkspaceState(search: string): WorkspaceUrlState {
  const params = new URLSearchParams(search);
  const parsed = lenientFiltersSchema.parse(
    Object.fromEntries(params.entries()),
  );
  const filters: Filters = {};
  if (parsed.type) filters.type = parsed.type;
  if (parsed.subject) filters.subject = parsed.subject;
  if (parsed.tier) filters.tier = parsed.tier;
  if (parsed.platform) filters.platform = parsed.platform;
  if (parsed.search) filters.search = parsed.search;
  if (parsed.from) filters.from = parsed.from;
  if (parsed.to) filters.to = parsed.to;
  const scope = dashboardScopeSchema
    .catch(DEFAULT_SCOPE)
    .parse(params.get("scope") ?? DEFAULT_SCOPE);
  const list: WorkspaceListState = {
    page: lenientPageSchema.parse(params.get("page")) ?? defaultListState.page,
    pageSize:
      lenientPageSizeSchema.parse(params.get("pageSize")) ??
      defaultListState.pageSize,
    sort: lenientSortSchema.parse(params.get("sort")) ?? defaultListState.sort,
    dir: lenientDirSchema.parse(params.get("dir")) ?? defaultListState.dir,
  };
  return { filters, scope, list, ids: parseCompareIds(params.get("ids")) };
}

/** Serialize only non-default values so clean views keep clean URLs. */
export function serializeWorkspaceState(
  pathname: string,
  { filters, scope, list, ids }: WorkspaceUrlState,
): string {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== "all") params.set("type", filters.type);
  if (filters.subject && filters.subject !== "all")
    params.set("subject", filters.subject);
  if (filters.tier && filters.tier !== "all") params.set("tier", filters.tier);
  if (filters.platform && filters.platform !== "all")
    params.set("platform", filters.platform);
  if (filters.search) params.set("search", filters.search);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  // Neither default is worth a query param: "full" is /performance's initial
  // scope and "all" is the dashboard's fixed one.
  if (scope !== DEFAULT_SCOPE) params.set("scope", scope);
  if (list.page > 1) params.set("page", String(list.page));
  if (list.pageSize !== 10) params.set("pageSize", String(list.pageSize));
  if (list.sort !== "date") params.set("sort", list.sort);
  if (list.dir !== "desc") params.set("dir", list.dir);
  // The selection only means something on /compare. The comma list is
  // appended by hand so a shared link keeps readable commas (URLSearchParams
  // would percent-encode them) — ids are already restricted to a safe charset.
  const selection =
    pathname === "/compare" && ids?.length
      ? `ids=${ids.slice(0, MAX_COMPARE_IDS).join(",")}`
      : null;
  const query = [params.toString(), selection].filter(Boolean).join("&");
  return query ? `${pathname}?${query}` : pathname;
}
