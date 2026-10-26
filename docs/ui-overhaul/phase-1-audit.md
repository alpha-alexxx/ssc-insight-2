# Phase 1 — Project Audit & Baseline Assessment

Scope: all routes (`/`, `/sign-in`, `/maintenance`), all in-app views (dashboard, history, compare, add, settings), shared components, tokens, dependencies. Baseline screenshots: `download/ui-baseline/`.

## 1. Stack & dependency inventory (no changes made)

| Area | Present | Verdict |
|---|---|---|
| Framework | Next.js 16.4.3 (webpack dev), React 19.2, TS 5.9 | keep |
| Styling | Tailwind CSS 4 (`@theme inline` tokens), CSS-variable palette (light + dark) | keep, extend |
| shadcn/ui | `components.json`, `ui/button.tsx` (cva+Radix Slot), `ui/chart.tsx` (Recharts 3 composition) | keep, extend ui/ primitives |
| Animation | `motion@12` (used in 6 files), `@react-spring/web@10` (landing/sign-in) | keep both, no duplicates |
| Charts | Recharts 3 + ChartContainer/ChartTooltip wrappers | keep |
| Icons | lucide-react only; app-specific `DuotoneIcon`/`DuotoneTile` echo wrapper | extend with `@duo-icons/react@1.0.1` (91 icons, two CSS-tintable layers, `IconProps extends SVGProps + size`) — **installed** |
| Validation | zod 4 (`attemptSchema`) | keep |

## 2. Findings (prioritized)

### P1 — Consistency / dead code
1. **Dead code** `dashboard.tsx`: `{false && notice && …}` block + `notice` state + its effect (≈ L113, 170, 1500) — legacy of the replaced toast system.
2. **Native `confirm()`** for mock deletion — off-identity, blocks main thread, not themable; Radix Dialog used elsewhere.
3. **No radius system**: DESIGN.md mandates square corners, but reality is mixed — maintenance page `rounded-2xl/full`, outcome cards 10px, skeletons `rounded` (4px), landing tiles/blobs pill-shaped, everything else `rounded-none`. No tokens.
4. **Icon inconsistencies**: 14 different ad-hoc icon sizes (13–26px); Lucide line icons everywhere; user mandate is Duo-icons-first with Lucide fallback.
5. **Shadow drift**: maintenance card uses a heavy soft shadow (violates DESIGN.md elevation rules); toasts `shadow-md`.
6. **`!important` scatter**: `!w-auto !py-2 !flex !pl-8` patches fighting the global `label{display:grid}` / `input{width:100%}` rules.
7. **Focus ring**: global `outline-offset: 4px` too wide for compact controls; no per-context ring tokens.
8. **Hardcoded identity**: sidebar avatar initials "MY" + "My workspace" — ignores real user name/email available via props.
9. **Theme toggle hidden on mobile** (`hidden sm:inline-flex`) — mobile users cannot switch themes in-app.
10. **Placeholder link**: landing wordmark `<a href="#">`.

### P2 — UX / responsive
11. Date-range filter uses bare `<details>` — no outside-click/Escape close, no animation, clips over content.
12. Search input has no clear affordance; no visible shortcut hint.
13. Mock form: error strip renders at the *bottom* (off-viewport on failure); no sticky save bar on long form; number inputs show native spinners.
14. "Add mock" empty state uses a plain square + raw Lucide instead of the `DuotoneTile` used by `EmptyChart` — two empty-state languages.
15. Mobile nav pills are 32px tall (below 44px touch target guidance); no icons.
16. Sidebar footer card + header + footer repeat "SSC CGL · Tier 2" three times.
17. Settings "About" panel claims data lives in "Neon Postgres" (deployment-specific copy).
18. AI insights panel lacks an icon; tone chips rely on color+label (label present — OK).

### P3 — Maintainability / performance
19. `dashboard.tsx` is **1721 lines** mixing shell, settings, history, compare, dialogs — split required.
20. `api()` fetch helper lives in `mock-form.tsx` (wrong boundary; imported by dashboard).
21. Re-render audit: ToastProvider holds children stable (viewport is sibling) — OK. Heavy subtrees (PerformanceOverview) keyed on `analytics` — OK.
22. `landing-blob` blur(90px) ×3 on mobile — acceptable but noted; `overflow-x-clip` guards blowout.

### P4 — Accessibility
23. Contrast verified: muted #6b665e on paper #faf8f2 = 5.6:1 (AA ok); rule-soft is decorative only. Dark mode muted #9a9489 on #221f1b = 6.9:1.
24. Dialogs use Radix (focus trap OK); delete confirm lacks a themable dialog (see #2).
25. Keyboard shortcuts exist but help is a toast only — acceptable, documented.
26. `prefers-reduced-motion` handled globally (CSS + MotionConfig + react-spring gates) — good.

## 3. Constraints carried forward
- DESIGN.md identity (warm paper, serif headlines, thin rules, semantic chart palette, chart animation off, data-table twins) is a **hard constraint**; the user's "moderately rounded corners" directive is honored via a *tokenized* radius scale applied to controls and already-rounded surfaces, not by rounding the dashboard's structural geometry.
- All 59 tests, lint, typecheck must stay green after every phase.

## 4. Phase plan (order of execution)
3 tokens → 4 shell → 5 responsive → 7 components (with 6 pages) → 6 pages → 8 icons → 9 motion → 10 charts → 11 forms/tables → 12 a11y → 13 perf/maintainability → 14 QA → 15 polish/handover.
