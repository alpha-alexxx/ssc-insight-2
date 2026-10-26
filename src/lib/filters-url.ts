import { dashboardScopeSchema, filtersSchema, type DashboardScope, type Filters } from "./domain";

/**
 * URL ⇄ filter-state mapping for the workspace views.
 *
 * The URL is a shareable mirror of the shell's filter/scope state, not the
 * source of truth. State changes are written to the address bar with
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
  platform: filtersSchema.shape.platform.catch(undefined),
  search: filtersSchema.shape.search.catch(undefined),
  from: filtersSchema.shape.from.catch(undefined),
  to: filtersSchema.shape.to.catch(undefined),
});

export type WorkspaceUrlState = { filters: Filters; scope: DashboardScope };

export function parseWorkspaceState(search: string): WorkspaceUrlState {
  const params = new URLSearchParams(search);
  const parsed = lenientFiltersSchema.parse(
    Object.fromEntries(params.entries()),
  );
  const filters: Filters = {};
  if (parsed.type) filters.type = parsed.type;
  if (parsed.subject) filters.subject = parsed.subject;
  if (parsed.platform) filters.platform = parsed.platform;
  if (parsed.search) filters.search = parsed.search;
  if (parsed.from) filters.from = parsed.from;
  if (parsed.to) filters.to = parsed.to;
  const scope = dashboardScopeSchema
    .catch("full")
    .parse(params.get("scope") ?? "full");
  return { filters, scope };
}

/** Serialize only non-default values so clean views keep clean URLs. */
export function serializeWorkspaceState(
  pathname: string,
  { filters, scope }: WorkspaceUrlState,
): string {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== "all") params.set("type", filters.type);
  if (filters.subject && filters.subject !== "all")
    params.set("subject", filters.subject);
  if (filters.platform && filters.platform !== "all")
    params.set("platform", filters.platform);
  if (filters.search) params.set("search", filters.search);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (scope !== "full") params.set("scope", scope);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
