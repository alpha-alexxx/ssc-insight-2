# Phase 15 — Final Consistency Audit & Handover

The 15-phase UI/UX overhaul is complete. This document is the handover
record: what the design system is, where it lives, and what to know when
extending it.

## 1. System map

| Concern | Source of truth |
|---|---|
| Color tokens (light + dark) | `src/app/globals.css` `:root` + dark blocks |
| Geometry (radius), elevation (`--elev-pop`), motion durations/easing | `globals.css` tokens; Tailwind utilities via `@theme inline` (`rounded-control/card`, `shadow-pop`) |
| Element defaults (inputs, labels, tables, focus) | `globals.css` `@layer base` — utilities override without `!important` |
| Component classes | `globals.css` `@layer components`: `.panel`, `.page-title`, `.panel-title`, `.stat-strip/-cell/-value`, `.nav-button`, `.segment-group/.segment`, `.table-scroll/.sticky-col`, `.dialog/.popover` animations, `.icon-duo` tints, `.skip-link`, landing helpers |
| Icons | `src/components/icon.tsx` — `IconName` semantic map; Duo first, Lucide fallback; `DuotoneIcon` (echo), `DuotoneTile`, `PlainIcon`; canonical sizes 14/16/18/22/28 |
| Shell | `src/components/app-shell.tsx` (sidebar/header/mobile nav), `dashboard.tsx` (orchestrator + view transitions) |
| Panels & views | `dashboard-panels.tsx` (Panel/EmptyChart), `history-panel.tsx`, `compare-view.tsx`, `settings-panels.tsx`, `performance-overview.tsx`, `ai-insights.tsx` |
| Overlays | Radix Dialog/AlertDialog/Popover + CSS data-state animations |
| Feedback | `toast.tsx` (tones, aria-live), skeletons, ErrorBoundary |

## 2. Conventions to keep

1. **Identity is the ledger**: structural dashboard geometry stays square;
   4px belongs to controls, 10px to expressive cards, pills to dots/bars.
2. **One segmented-control pattern** (`.segment-group`); never restyle
   option buttons ad hoc.
3. **Icons** go through `icon.tsx` with a semantic name. Adding a glyph =
   one entry in `ICONS` (Duo first, Lucide fallback). No raw
   `lucide-react` imports in feature components.
4. **Accuracy/validity color is semantic** (positive ≥70, neutral ≥50,
   warning below) and always paired with the printed value.
5. **Motion**: CSS 140ms hover / 220ms enter / 240ms view-swap; stagger
   70ms ≤6 children; charts never animate; every new motion path must be
   reduced-motion aware (`useReducedMotion` or CSS data-state).
6. **Tables** in scroll containers use `.table-scroll` + `.sticky-col` on
   the identity column.
7. **Copy**: sentence case, en-IN numbers/IST dates, deployment-neutral
   product copy.

## 3. Verification status at handover

- `tsc --noEmit`, `eslint .`: clean. Tests: 59/59.
- Browser-verified routes: `/` (landing + workspace gate), dashboard
  (4 scopes), history (+ filters/search/dialog/delete), compare
  (picker + ledger), add/edit mock (form, paste mode, sticky bar),
  settings (target, backup preview/merge/replace flow), `/maintenance`.
- Responsive: 375 / 768 / 1440 clean in both themes; no horizontal
  overflow; touch targets ≥40px; sticky column + wrapped segments on
  narrow screens.
- Accessibility: skip link moves focus; keyboard-complete; labels and
  live regions verified; contrast preserved from the audited tokens.

## 4. Known limitations / future items

1. `@duo-icons/react` emits a dev-only `fill-rule` prop warning
   (library-internal); rendering is correct. Upstream fix or a lint-rule
   suppression would silence it.
2. Native selects and date inputs keep platform UI (intentional: reliable
   on touch); a custom listbox would be the only reason to revisit.
3. Recharts logs a transient 0-size warning on first mount in dev;
   harmless and production-invisible.
4. Insight list staggers once per mount; a "new results" re-stagger was
   deliberately skipped (restraint over spectacle).
5. The dev-tools overlay can overlap the viewport bottom in development
   only — not part of the product UI.
