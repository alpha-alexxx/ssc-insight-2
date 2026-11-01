import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { AI_VIEWS } from "../src/lib/ai/client-types";
import { VIEW_META } from "../src/components/app-shell";
import {
  APP_VIEWS,
  PATH_VIEW,
  VIEW_HREF,
  viewForPathname,
  type AppView,
} from "../src/lib/routes";

/**
 * Route-registry guards.
 *
 * These are the failures that do not show up in `tsc`: a view missing from the
 * path map used to fall back to the dashboard silently, and the AI chat route
 * carried its own copy of the view list, so a new view compiled fine and then
 * returned 400 at runtime. Both are now single-sourced, and these tests keep
 * them that way.
 */

const ALL_VIEWS: AppView[] = APP_VIEWS;

/**
 * Views that exist only as overlay subtrees (the mock form is pushed, never
 * linked as a sidebar destination) still own a real address, so every view
 * must resolve. This list exists to document the intent, not to exempt any.
 */
const OVERLAY_VIEWS: AppView[] = [];

test("every view resolves to itself through the path map", () => {
  for (const view of ALL_VIEWS) {
    if (OVERLAY_VIEWS.includes(view)) continue;
    const path = VIEW_HREF[view];
    assert.equal(
      viewForPathname(path),
      view,
      `${path} should resolve to "${view}"`,
    );
  }
});

test("the path map is a bijection — no two views share an address", () => {
  const paths = Object.values(VIEW_HREF);
  assert.equal(new Set(paths).size, paths.length);
});

test("PATH_VIEW is the inverse of VIEW_HREF", () => {
  for (const view of ALL_VIEWS) {
    assert.equal(PATH_VIEW[VIEW_HREF[view]], view);
  }
});

test("every view has display metadata", () => {
  for (const view of ALL_VIEWS) {
    assert.ok(VIEW_META[view], `${view} is missing VIEW_META`);
    assert.ok(VIEW_META[view].label.length > 0);
    assert.ok(VIEW_META[view].icon.length > 0);
  }
});

test("every AI screen-context view is a real workspace view", () => {
  // The interesting direction is this one: AI_VIEWS feeds the chat route's
  // zod schema, so a stale entry there would advertise a view that no longer
  // exists. The reverse (every view being an AI view) is NOT required — the
  // shell sends no context for views the coach has no orientation for, and
  // narrows through AI_VIEWS rather than asserting a cast.
  const routable = new Set<string>(ALL_VIEWS);
  for (const view of AI_VIEWS) {
    assert.ok(
      routable.has(view),
      `AI_VIEWS lists "${view}", which is not a workspace view`,
    );
  }
  // Screens that genuinely carry orientation must be covered.
  for (const view of ["dashboard", "performance", "history", "compare"] as const) {
    assert.ok(
      (AI_VIEWS as readonly string[]).includes(view),
      `AI_VIEWS is missing "${view}"`,
    );
  }
});

test("dynamic plan routes resolve to the plan view", () => {
  assert.equal(viewForPathname("/plan"), "plan");
  assert.equal(viewForPathname("/plan/2026-11-01"), "plan");
  assert.equal(viewForPathname("/plan/week/2026-11-01"), "plan");
});

test("unknown paths still fall back to the dashboard", () => {
  assert.equal(viewForPathname("/somewhere-else"), "dashboard");
});

test("every workspace view has a real route file", () => {
  const missing: string[] = [];
  for (const view of ALL_VIEWS) {
    if (view === "plan") continue; // plan owns a nested dynamic route
    const path = VIEW_HREF[view];
    const file = join(
      process.cwd(),
      "src",
      "app",
      "(workspace)",
      path.replace(/^\//, ""),
      "page.tsx",
    );
    if (!existsSync(file)) missing.push(`${view} -> ${path}`);
  }
  assert.deepEqual(missing, [], `views without a route file: ${missing.join(", ")}`);
});
