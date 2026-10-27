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
- The ring center shows the average saved exam percentile where genuine percentiles exist; otherwise it shows score percentage (marks ÷ maximum) explicitly labelled “score”. A full or sectional mock’s percentile is never reused for its subject slices or derived sections. Accuracy remains available in the note and data table.
- My target shows the existing out-of-390 goal as a percentage reference, a dashed target line, a dated average snapshot trend, the latest gap, and explicit up/down/flat text with an arrow.
- Subject deep dive uses two aligned single-axis small multiples (accuracy percentage and minutes), never a dual-axis chart. It is omitted on Subject Wise.
- Charts keep animation disabled, respect reduced motion, size containers to include axis labels, and use the paper/ink/rule tokens rather than floating cards.

## Typography

Source Serif 4 Variable supplies page headings, panel titles, metrics, and the typographic wordmark. DM Sans Variable supplies body text, tables, forms, and navigation. Both fonts are self-hosted through Fontsource imports in the root layout. Use the declared fallbacks while fonts load.

Supporting text is generally 10–13px; section labels use 10px uppercase lettering, weight 600, and 0.12em tracking. Use tabular figures for comparison values and timings. Below 768px, metrics reduce to 35px and panel titles to 21px. The mobile wordmark uses 23px. Keep units in muted ink rather than reducing their contrast.

## Layout

The workspace uses the official shadcn sidebar composition. At `md` and above it is a 15rem paper sidebar that collapses to a 3rem icon rail through shadcn's own state, with tooltips for icon-only items. Below `md`, the same navigation is a left Sheet opened from the header trigger; links close the Sheet and retain charcoal fill plus `aria-current="page"`. A 56px sticky header carries the trigger, current view, AI trigger, theme control, settings, and account action.

Main content is centered within a 1560px maximum width with 12–20px horizontal padding at small widths and 20px at desktop. The dashboard is composed as a compact overview strip followed by a primary/secondary two-column workspace at `xl`; both columns stack below that breakpoint. The planner uses calendar-plus-selected-day at `xl` and a single-column date/schedule flow on mobile.

The summary is one divided metric strip, not individual floating cards: soft rules, four columns on desktop, two below 768px, 13–15px cell padding, 23–28px serif values. The performance section keeps a quiet metadata row and charts below the operational overview rather than repeating the headline metrics.

**The Readable Table Rule.** Keep wide tables inside their horizontal scroll container. Preserve comparable columns and nowrap values instead of squeezing them into unreadable cells.

## Elevation & Depth

Depth comes from cream-to-paper changes, thin rules, and spacing. Panels, menus, notifications, and dialogs avoid heavy shadows. The result dialog uses a translucent ink overlay, a ruled paper surface, a maximum width of 896px, and a scrollable maximum height of 85vh. Do not add paper textures or simulated physical shadows.

## Shapes

Panels, controls, selected navigation, badges, avatars, status markers, and dialogs use square corners. Charts retain the geometry needed to show their data, including the circular question breakdown. Thin one-pixel rules define boundaries and divisions.

## Components

Google sign-in is required through a serif-led paper sign-in page. The signed-in header shows the account and a compact outline sign-out control. Session errors hide and unmount the private workspace until verification succeeds; account changes remount it. Preserve square geometry and paper/ink tokens throughout.

Primary buttons use terracotta with paper text and a darker hover. Outline buttons use a rule border; ghost buttons gain a soft fill; destructive buttons use danger red. Standard and icon controls are 40px high; compact buttons are 32px. Disabled controls reduce opacity and block pointer interaction. Keyboard focus remains explicit with an accent outline and offset.

Fields use paper fill, rule borders, square corners, and 10px by 12px padding. Labels sit 7px above controls. Read-only fields use the soft fill. Checkboxes use ink. Selected mock filters and Manual/Paste toggles expose `aria-pressed`.

Panel headers use 24px horizontal padding, 20px top padding, and 12px bottom padding; compact dashboard panels use 16px by 14px. Tables use 11px muted headings on cream, a stronger header rule, and soft row rules. Cells have 15px by 18px padding, reducing to 13px by 12px below 768px. Row hover uses the soft fill. Accuracy badges use positive ink on the pale positive surface with square corners.

The AI panel is a right-side shadcn Sheet: roughly 460px on desktop, full width on mobile, a subtle ink overlay that leaves the workspace visible, a fixed header/context chip, an independently scrolling message log, and a composer in normal flex flow (no fixed height) so the mobile keyboard cannot cover it. The Sheet uses the project's data-state CSS animations rather than adding an animation dependency.

Tooltips are square paper boxes with rule borders and 12px text. Empty charts reserve at least 220px with centered explanatory text; single-point trends use a compact explicit summary instead of an empty plot. Chart animations are disabled. MotionConfig respects the user's reduced-motion preference, and global CSS minimizes animation and transition durations for that preference. Notifications use only a small vertical entrance.

## Do's and Don'ts

- Do keep labels, legends, and units visible beside metrics.
- Do preserve the divided stat strip and horizontal table scrolling.
- Do use semantic paper, ink, accent, and chart variables.
- Don't add rounded dashboard cards or colorful icon tiles.
- Don't introduce paper textures or heavy shadows.
- Don't animate charts or ignore reduced-motion preferences.

## Reference-led outcome cards

Make every attempt count follows the supplied `docs/images/card.png` reference: softly rounded paper cards, prominent serif subject headings, a subject icon, and an olive/terracotta/beige answer-distribution ring with score percentage at its center. A ruled answer ledger shows counts, shares, and proportion bars. A pale marks/score strip and a three-column accuracy, reported-percentile availability, and score-definition footer complete each card. The ring represents question shares; its center represents marks divided by maximum, not accuracy or percentile. These reference-specific rounded corners and icon treatments are scoped to the outcome cards; the surrounding dashboard keeps its existing geometry.

Outcome cards use semantic articles and definition lists with visible values, so color is supplementary. The grid uses three cards per row at desktop widths (1280px and above), two on tablets (768–1279px), and one on mobile. Card internals use container queries so type, answer labels, and footers adapt to each card’s width rather than just the viewport. Desktop cards are compact horizontal compositions: a small header, 84px ring, three-row answer ledger, and one metadata row; very narrow widths stack them. Missing accuracy uses a dash and missing percentile is explicit; inherited full-mock percentiles never describe a derived subject or section.

Dated saved attempts use the companion `AttemptRecordCard` in the same module. It is a compact horizontal row with a 62px score ring, a visible “Attempted” state, the actual attempt date, title, platform/type, score/max, accuracy, and a result action. Aggregate answer-stack cards never invent a single attempt date.
