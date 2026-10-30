---
name: SSC Insight
description: A warm editorial workspace for SSC mock results.
colors:
  canvas: "#f4f1e8"
  paper: "#faf8f2"
  ink: "#25231f"
  muted: "#6b665e"
  rule: "#82796b"
  rule-soft: "#d5cec1"
  soft: "#eae5da"
  accent: "#b65335"
  accent-hover: "#934029"
  accent-soft: "#efe0d5"
  positive: "#535d37"
  positive-soft: "#e6e9db"
  warning: "#73551c"
  warning-soft: "#eee4cc"
  danger: "#962f28"
  danger-hover: "#75231e"
  danger-soft: "#f1dfd8"
  chart-average: "#656d4a"
  chart-time: "#567276"
  chart-quant: "#b65335"
  chart-reasoning: "#2a78d6"
  chart-english: "#1baf7a"
  chart-ga: "#eda100"
  chart-computer: "#767168"
  chart-section-1: "#b65335"
  chart-section-2: "#2a78d6"
  chart-target: "#6b665e"
typography:
  headline:
    fontFamily: '"Source Serif 4 Variable", Georgia, serif'
    fontSize: "clamp(32px, 3.2vw, 44px)"
    fontWeight: 450
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  title:
    fontFamily: '"Source Serif 4 Variable", Georgia, serif'
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 500
  metric:
    fontFamily: '"Source Serif 4 Variable", Georgia, serif'
    fontSize: "42px"
    fontWeight: 450
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  wordmark:
    fontFamily: '"Source Serif 4 Variable", Georgia, serif'
    fontSize: "31px"
    fontWeight: 550
    lineHeight: 1
    letterSpacing: "-0.035em"
rounded:
  square: "0px"
spacing:
  sm: "8px"
  md: "16px"
  panel: "20px"
  lg: "24px"
  page: "36px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    rounded: "{rounded.square}"
    height: "40px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "10px 12px"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.square}"
  nav-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.square}"
    padding: "12px 14px"
---

# Design System: SSC Insight

## Overview

The approved visual direction is warm editorial paper: cream canvas, paper surfaces, serif headings, quiet sans-serif controls, and terracotta actions. Thin rules organize the working dashboard with the clarity of a printed progress ledger. Anthropic was a visual reference, not a brand identity to reproduce.

**Key Characteristics:**
- Warm flat surfaces with square corners and thin rules.
- Expressive serif headings paired with compact sans-serif controls.
- A divided metric strip and coordinated earthy charts.

## Multi-theme system (palettes × styles)

Every visual decision flows from two data attributes on `<html>`, set before
paint by the ThemeStyleProvider script and persisted in localStorage
(`ssc.palette`, `ssc.style`) — defaults reproduce this document exactly, so
an absent or invalid stored value is always safe:

- **`data-palette`** — color identity: `orange` (the original terracotta,
  default), `blue`, `lime`, `violet`, `rose`. Each palette re-declares the
  same semantic tokens (canvas/paper/ink/muted/rule/soft + accent trio) with
  its own tinted paper family, and only its own chart hues: accent-derived
  series alias `--accent`, and the second/third/fourth categorical hues move
  per palette (the second hue shifts only when the accent owns that slot).
  Olive average, teal time, and warm-gray computer stay shared. Semantic
  positive/warning/danger colors are deliberately NOT re-tinted per palette.
- **`data-style`** — visual style: `vega` (the original editorial ledger —
  square, hairline rules, no shadows; default), `sera` (brutal: square,
  2px ink panel rules, hard offset `--elev-pop`, weight-600 display type,
  decisive 170ms motion), `mira` (compact: 6px radii, 34px controls, 10px
  table rows, tighter paddings, 140ms motion). Styles change geometry,
  density, elevation, and motion — never layout, content, or behavior.
  Density lives in CSS custom properties (`--control-height`, `--table-cell-*`,
  `--control-pad-*`, consumed by the base layer and component classes), so
  Tailwind utilities still win where a view deliberately opts out.

Rules across all 15 combinations: accent-on-paper button text ≥ 4.5:1 (all
palettes verified, light and dark); muted text ≥ 4.5:1 on canvas; focus
outlines and semantic status colors unchanged; chart animation stays
disabled; the outcome-card exception keeps `--radius-card` so sera squares
it and mira tightens it. `src/components/theme-style-provider.tsx` owns the
preference model; `src/components/appearance-panel.tsx` (Settings) is the
selection UI — palettes and styles are chosen independently and apply
instantly. Do not hardcode palette hexes in components; add new semantic
tokens to `globals.css` instead.

## Colors

Terracotta identifies primary actions and the score series. Charcoal ink carries text and selected navigation. Paper and cream create subtle surface separation without textures. Muted ink remains legible for units, labels, and descriptions.

Subject charts use terracotta for Quant, blue for Reasoning, aqua for English, ochre for General Awareness, and warm gray for the separately scored Computer context. Section I reuses terracotta and Section II reuses blue. Correct answers use olive, incorrect answers terracotta, and skipped answers the soft rule color. Timing uses teal and the target reference uses muted ink in a dashed rule. `src/lib/chart-theme.ts` maps entity identities to the CSS chart variables; preserve those semantic mappings. Subject hues are a fixed categorical order validated for adjacent-pair CVD and normal-vision separation against the paper surface. Do not color nominal series by value or cycle extra hues for additional results.

**The Meaning Rule.** Keep legends, units, and text labels alongside color; color alone must not carry a result's meaning. Every chart also exposes a square-bordered hover/focus tooltip and a "View data" table twin.

## Charts

- Score trends use the Shadcn/Recharts 3 `ChartContainer` composition with one percentage axis, 2px lines, light washes, visible dots, horizontal hairline gridlines, and a vertical hover rule. Multi-series subject and section charts show every populated series at once with a legend, sparse values stay absent rather than becoming zero, and the same colors follow each entity across filters.
- Where you stand is one radar on every dashboard tab, always built from the global cross-type subject profile on a 0–100 scale. Missing subjects are named below rather than drawn as zero; fewer than three populated subjects falls back to labelled bars.
- Make every attempt count uses 100% stacked radial rings (Correct, Incorrect, Unattempted) with square surface gaps between segments. Full Mocks keeps one ring card and All Mocks keeps one panel with rings by mock type. Subject Wise and Sectional Wise use one bordered card per subject/section instead of grouping rings: each card has its own ring, three-column colour key with counts and shares, marks/score line, and percentile provenance note.
- The ring center always shows score percentage (marks / maximum). Genuine saved percentiles appear separately with their provenance. A full or sectional mock’s percentile is never reused for its subject slices or derived sections. Accuracy remains available in the note and data table.
- My target shows the existing out-of-390 goal as a percentage reference, a dashed target line, a dated average snapshot trend, the latest gap, and explicit up/down/flat text with an arrow.
- Subject deep dive uses two aligned single-axis small multiples (accuracy percentage and minutes), never a dual-axis chart. It is omitted on Subject Wise.
- Charts keep animation disabled, respect reduced motion, size containers to include axis labels, and use the paper/ink/rule tokens rather than floating cards.

## Typography

Source Serif 4 Variable supplies page headings, panel titles, metrics, and the typographic wordmark. DM Sans Variable supplies body text, tables, forms, and navigation. Both fonts are self-hosted through Fontsource imports in the root layout. Use the declared fallbacks while fonts load.

Supporting text is generally 10–13px; section labels use 10px uppercase lettering, weight 600, and 0.12em tracking. Use tabular figures for comparison values and timings. Below 768px, metrics reduce to 35px and panel titles to 21px. The mobile wordmark uses 23px. Keep units in muted ink rather than reducing their contrast.

## Layout

The workspace follows shadcn sidebar-07 composition: header branding, navigation, and the footer account link use `SidebarMenu` / `SidebarMenuButton`, with the account row opening the existing account settings. At `md` and above it is a 15rem paper sidebar that collapses to a 3.5rem icon rail through shadcn's own state, with tooltips for icon-only items. Collapsed labels remain available to assistive technology but leave the flex layout, so the wordmark never wraps into a tall hidden block. Header and footer stay fixed in size while navigation scrolls on short screens. The workspace layout restores the saved sidebar cookie before rendering. Below `md`, the same navigation is a left Sheet opened from the header trigger; links close the Sheet and retain charcoal fill plus `aria-current="page"`. A 56px sticky header carries the trigger, current view, AI trigger, theme control, settings, and account action.

Main content is centered within a 1560px maximum width with 12–20px horizontal padding at small widths and 20px at desktop. The dashboard is composed as a compact overview strip followed by a primary/secondary two-column workspace at `xl`; both columns stack below that breakpoint. The planner uses calendar-plus-selected-day at `xl` and a single-column date/schedule flow on mobile.

The summary is one divided metric strip, not individual floating cards: soft rules, four columns on desktop, two below 768px, 13–15px cell padding, 23–28px serif values. Each cell is a single link target with a 2px square progress rule and a chevron that appears on hover or focus. The performance section keeps a quiet metadata row (labels, values, hairline dividers) and charts below the operational overview rather than repeating the headline metrics.

**The Frame Rule.** Rules, tracks, bars, and progress fills are square; only status dots and the answer-distribution ring are round. A percentage rule is never a pill, and a metric strip is never a row of separate rounded cards.

**The Readable Table Rule.** Keep wide tables inside their horizontal scroll container. Preserve comparable columns and nowrap values instead of squeezing them into unreadable cells.

## Elevation & Depth

Depth comes from cream-to-paper changes, thin rules, and spacing. Panels, menus, notifications, and dialogs avoid heavy shadows. The result dialog uses a translucent ink overlay, a ruled paper surface, a maximum width of 896px, and a scrollable maximum height of 85vh. Do not add paper textures or simulated physical shadows.

## Shapes

Panels, controls, selected navigation, badges, avatars, status markers, and dialogs use square corners. Charts retain the geometry needed to show their data, including the circular question breakdown. Thin one-pixel rules define boundaries and divisions.

## Components

Google sign-in starts from the public landing page, which is the only sign-in surface. Its masthead is a sticky 64px bar on canvas with a single hairline soft rule and a backdrop blur: the serif wordmark sits left (23px below 768px, 24px above), in-page section anchors sit centre from `md`, and a theme control, an outlined compact "Sign in with Google" button and (below `md`) a navigation Sheet sit right. A 2px accent reading-progress rule rides the bar's bottom edge. The accent fill is reserved for the hero and final call-to-action, so each section carries one bold action.

**The landing is a printed preparation ledger** (`src/components/landing/`). It alternates paper with two full-bleed **ink plates**: Plate I carries the product showcase, Plate II carries the optional AI coach and the privacy ledger. It runs 01 hero → 02 ledger facts → Plate I → 03 analytical scopes → 04 the 50-day plan → 05 compare → Plate II → 06 FAQ → 07 final CTA, with a numbered margin spine on `lg+`.

- **Plates never remap semantic tokens.** `--plate-bg/fg/muted/rule/rule-soft/surface/card` are the only variables a plate changes, and they compose from `--ink`/`--paper`/`--soft` so all five palettes resolve without per-palette rules. That is what lets a paper product mockup sit on a plate and still look exactly like the workspace: `--plate-bg` is `--ink` in light mode and the raised `--soft` in dark, with `--plate-card` = `--paper` so nested cards read recessed. Plates take 1px `--plate-rule` hairlines top and bottom; interactive content inside a plate uses `.focus-paper` because the accent ring sinks into charcoal.
- **Product mockups are code, not screenshots.** `mockups/` contains hook-free server components drawn entirely from design tokens (`WorkspaceFrame`, `BrowserFrame`, `MockMetricStrip`, `MockRing`, `MockTrend`, `MockRadar`, `MockTable`, and the dashboard/history/compare/planner/day-workspace screens). They reuse the real rules — the divided metric strip, the score band, square progress rules, the answer ring with score percentage centred — at mockup scale through container queries, so `sera` gives them 2px ink borders and `mira` tightens them exactly as the workspace does. All charts are inline SVG; **the landing never imports Recharts**. Each sits in a `BrowserFrame` whose inner tree is `aria-hidden`, with the real description in a sibling `<figcaption>` and an "Illustrative sample data" badge, so no fact may live only inside a mockup.
- **Copy and numbers are derived, not typed.** Hero, showroom and scope figures come from `fixtures.ts`, which runs the app's own `totals()`/`analyze()` over eight sample attempts; plan counts come from `plan-data.ts` reading the real study-plan JSON on the server (262 rows, never the export's declared 273). `tests/landing-fixtures.test.ts` and `tests/plan-facts.test.ts` fail the build if a mockup could show a number the product cannot produce.
- **Motion is CSS-first.** Scroll reveals (`.rise`) and the scope diagram's fan (`.scope-fan`) are scroll-driven animations layered over an always-visible base, so no observer can blank a section, no JavaScript is needed, and Firefox simply shows the static page. Hover, float (9s/11s/13s, never in unison) and the hero entrance are CSS keyframes; Motion is used only for the showcase's panel fade and the hero's pointer parallax (≤8px, fine pointers only, through motion values). `prefers-reduced-motion` disables all of it. The landing uses `--landing-lift` rather than a hard-coded shadow so elevation follows the active style.
- **The FAQ is a Radix accordion** from the `radix-ui` umbrella, styled by `.faq-*` with height keyframes on `--radix-accordion-content-height` (no `tw-animate-css`). Showcase tabs are Radix `Tabs` styled as a printed index (`.specimen-tab`), not as the app's `.segment` control.

The signed-in header shows the account and a compact outline sign-out control. Session errors hide and unmount the private workspace until verification succeeds; account changes remount it. Preserve square geometry and paper/ink tokens throughout.

Primary buttons use terracotta with paper text and a darker hover. Outline buttons use a rule border; ghost buttons gain a soft fill; destructive buttons use danger red. Standard and icon controls are 40px high; compact buttons are 32px. Disabled controls reduce opacity and block pointer interaction. Keyboard focus remains explicit with an accent outline and offset.

Fields use paper fill, rule borders, square corners, and 10px by 12px padding. Labels sit 7px above controls. Read-only fields use the soft fill. Checkboxes use ink. Selected mock filters and Manual/Paste toggles expose `aria-pressed`.

Panel headers use 24px horizontal padding, 20px top padding, and 12px bottom padding; compact dashboard panels use 16px by 14px. Tables use 11px muted headings on cream, a stronger header rule, and soft row rules. Cells have 15px by 18px padding, reducing to 13px by 12px below 768px. Row hover uses the soft fill. Accuracy badges use positive ink on the pale positive surface with square corners.

The AI panel is a right-side shadcn Sheet: roughly 520px on desktop, full width on mobile, a subtle ink overlay that leaves the workspace visible, compact keyboard-accessible tabs for Coach chat / Plan todos / Log a mock, an orientation-only context line in the header, an independently scrolling message log, and a composer in normal flex flow (no fixed height) so the mobile keyboard cannot cover it. The Sheet uses the project's data-state CSS animations rather than adding an animation dependency.

Tooltips are square paper boxes with rule borders and 12px text. Empty charts reserve at least 220px with centered explanatory text; single-point trends use a compact explicit summary instead of an empty plot. Chart animations are disabled. MotionConfig respects the user's reduced-motion preference, and global CSS minimizes animation and transition durations for that preference. Notifications use only a small vertical entrance.

Dashboard state changes use token-driven fades, never page-style transitions: a content swap (a new plan day, a new analytics scope) fades in over 4px with the style's `microMotion()` duration (110–180ms), progress rules transition width at `--dur-enter`, and hover/press states use `--dur-quick`. A swap has no exit animation and no height animation, because collapsing a tall panel would jump the scroll position. Under `prefers-reduced-motion` every one of these becomes an instant change, and hover affordances stay permanently visible rather than appearing on motion.

Theme switching is the one sanctioned global crossfade. The theme toggle is a circular ink disc carrying the glyph of the mode you will switch to (moon in light, sun in dark): disc `--ink`, glyph `--paper`, both token-inverted in dark mode so one rule set serves every palette and style with no `dark:` variants, and the glyph morphs with a rotate/scale/fade at `--disc-morph-dur`. Each click opens a one-shot `theme-animating` window on `<html>` (~480ms) during which token-driven colors — and only colors — ease at `--dur-view`; next-themes' `disableTransitionOnChange` is deliberately not set because it would inject a global `transition: none` kill-switch. Outside the window nothing transitions, so unrelated state changes stay instant, and reduced motion never opens the window at all.

## Status dots and personal-task conventions

Personal tasks (My Tasks, daily workspace, unified dashboard plan) use a 10px `StatusDot` instead of text badges. The four states map to theme-protected semantic tokens only — never palette hues: `todo` is a hollow ink-outline dot (`border-rule` on paper), `in_progress` is `--accent`, `completed` is `--positive`, and `overdue` is `--danger` with a soft `ring-danger-soft` halo. Because `[data-palette=…]` blocks never override `--positive/--warning/--danger/--accent/--muted` (they are defined only in `:root`/`.dark`), dots render identically across all 15 palette × style combinations. The dot is a button when status can cycle; it exposes "Status: {label}. Activate to change." and its hover grows only under `motion-reduce:` guards.

Personal month calendars live in My Tasks and Today's Plan, independent of the Study Calendar. Their date markers expose pending/completed counts to assistive technology; the selected date drives only the personal-task list.

## Do's and Don'ts

- Do keep labels, legends, and units visible beside metrics.
- Do preserve the divided stat strip and horizontal table scrolling.
- Do use semantic paper, ink, accent, and chart variables.
- Do keep one bold action per screen; secondary AI actions stay outline.
- Don't add rounded dashboard cards or colorful icon tiles.
- Don't repeat the headline metrics in a second stat strip further down a view.
- Don't introduce paper textures or heavy shadows.
- Don't animate charts or ignore reduced-motion preferences.

## Reference-led outcome cards

Make every attempt count follows the supplied `docs/images/card.png` reference: softly rounded paper cards, prominent serif subject headings, a subject icon, and an olive/terracotta/beige answer-distribution ring with score percentage at its center. A ruled answer ledger shows counts, shares, and proportion bars. A pale marks/score strip and a three-column accuracy, reported-percentile availability, and score-definition footer complete each card. The ring represents question shares; its center represents marks divided by maximum, not accuracy or percentile. These reference-specific rounded corners and icon treatments are scoped to the outcome cards; the surrounding dashboard keeps its existing geometry.

Outcome cards use semantic articles and definition lists with visible values, so color is supplementary. The grid uses three cards per row at desktop widths (1280px and above), two on tablets (768–1279px), and one on mobile. Card internals use container queries so type, answer labels, and footers adapt to each card’s width rather than just the viewport. Desktop cards are compact horizontal compositions: a small header, 84px ring, three-row answer ledger, and one metadata row; very narrow widths stack them. Missing accuracy uses a dash and missing percentile is explicit; inherited full-mock percentiles never describe a derived subject or section.

Dated saved attempts use the companion `AttemptRecordCard` in the same module. It is a compact horizontal row with a 62px score ring, a visible “Attempted” state, the actual attempt date, title, platform/type, score/max, accuracy, and a result action. Aggregate answer-stack cards never invent a single attempt date.

## Study Calendar

The calendar is a workspace view, not a dashboard, so it opens with the shared `PageHeader` (serif `workspace-title`, one hairline below, actions wrapping under the title on phones) rather than a display-size heading and a view-management card. Its summary is the same divided metric strip as the dashboard — four cells: next mock, plan completion, this week's load, and mocks done — with the same 2px square rule. Two of the four are static because they have no surface to open; that is the one sanctioned exception to "each cell is a link target", and inventing a destination would be worse than the exception.

One toolbar under the header owns both questions of calendar navigation: the mode `.segment` row on the left and the period controls (arrows, Today, date jump) on the right — one row from `sm`, two full-width rows on phones. Each surface's `.section-head` then states only the period title and a context line, and the title is the view's live region. The Today control appears only while it can do something, and the icon-only arrows carry tooltips. View state mirrors into the URL (`?view=&date=`, written with `history.replaceState` exactly as `filters-url.ts` mirrors the shared filters) so a refresh or shared link reopens the same period; `/plan/<date>` remains the addressable deep link for a day's workspace.

The month and week grids are one button per cell with a single border treatment per state (in plan, today, selected; the month also dims outside-month and outside-plan cells) — chips at `sm` and above, a category-dot row below, and the shared `CalendarLegend` under either grid. The agenda renders a bounded two-week window from the selected date (the arrows step the window; "Show remaining plan days" lifts the cap in place), so stepping backwards shows earlier work instead of stopping at an invisible today floor, and days before the window collapse into one disclosure. The day view is the shared `PlanTaskRow` list over a full-bleed (`flush`) surface — the checkbox completes the task on every surface — with the day's revision strings below, and empty states that offer the actions that exist (log a mock on a rest day, return to Day 1 outside the window). Below `xl` the selected-day panel follows the grid directly — a single-column date/schedule flow — and becomes a sticky rail at `xl`; on phones the same panel is the bottom sheet. Day completion is always the 2px square rule, never a ring. The calendar carries no personal tasks.

## Personal work and dashboard hierarchy

The dashboard sequence is Overview → Today's Plan → Study Calendar, followed by supporting panels and performance. Today's Plan presents structured assignments and personal tasks under explicit labels. The shared personal calendar and list use a primary work column with a 300px calendar rail on desktop; mobile places the compact calendar before the rows. Thin rules and typography organize content without enclosing every item in a card. Task summaries use real account-wide counts. Pending/completed calendar markers have accessible count labels; task completion, priority, and overdue state also have text or checkbox semantics.

The Today's Plan head is editorial, not a card: a 10px small-caps dateline (`Day 4 of 50 · Mock day`, the mock day type in accent) sits above the serif `.panel-title` section heading, and one hairline closes the head before the panes. It carries the plan position once — the Study Plan panel names its phase (`Phase 1 · Build`) instead of repeating the day and day type, and no section tile is shown because the panel below already leads with its own tile. Day stepping is a single bordered control group (two 32px arrow cells and the serif date divided by hairlines) aligned to the head's baseline; the `Today` chip renders inside the group only when the selected day is today, and stepping away swaps it for an accent date plus a `Back to today` text action beside the heading. Below `sm` the group's date cell flexes so the group fills the head's row rather than orphaning at half width; the Study/Personal segmented switch sits under it inside the head, full width until `lg` (where both panes fit side by side and the switch is hidden). The head's dateline is the section's only live region.

Task editing becomes a bottom-aligned dialog on mobile and a centered editor on desktop; secondary filters use a Sheet. These surfaces use semantic paper, ink, rule, and radius tokens. The AI composer uses safe-area spacing and the visual viewport when available, stays in flex flow, and exposes a focus-within ring. Assistant answers use plain readable blocks; user messages use a restrained soft surface. Streaming follows only readers already near the bottom, with an explicit jump-to-latest control otherwise. Retry replaces the failed exchange, and typed drafts remain editable during streaming.
