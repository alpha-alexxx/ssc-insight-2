# Phase 2 — Design Direction & Visual Strategy

Product personality: **"The printed progress ledger"** — a calm, editorial workspace that treats exam preparation like a record worth keeping. Warm, precise, quietly confident. Every addition must feel typeset, not decorated.

## 1. Identity constraints (non-negotiable)
- Palette: the existing warm-paper tokens (canvas/paper/ink/muted/rule/soft + terracotta accent + positive/warning/danger) are preserved verbatim in both themes. Chart hues are frozen (DESIGN.md categorical order).
- Typography: Source Serif 4 Variable for headlines/metrics, DM Sans Variable for everything operational. Existing scale and the 10px section-label convention stay.
- Structural geometry: dashboard panels, stat strip, tables, dialogs and nav remain **square** — the ledger identity. The user's "moderately rounded" directive is satisfied by the radius scale below, applied to controls and expressive cards only.

## 2. Radius scale (tokenized, new)
| Token | Value | Applied to |
|---|---|---|
| `--radius-panel` | `0px` | panels, stat strip, tables, dialogs, nav fills |
| `--radius-control` | `4px` | buttons, inputs, selects, checkboxes wrap, tooltips, toasts, tags, filter chips |
| `--radius-card` | `10px` | outcome cards, landing feature cards/tiles, maintenance card, avatar squares |
| `--radius-pill` | `999px` | status dots, answer-share bars, ring segments |

## 3. Elevation & layering
- Level 0 — flat: panels on canvas; separation via 1px `--rule-soft` rules and surface change only.
- Level 1 — lifted (new token `--shadow-pop`): `0 1px 2px rgba(37,35,31,.05), 0 16px 40px -20px rgba(37,35,31,.22)` — popovers, toasts, dialogs, command surfaces. Ink-tinted, never gray-on-cream.
- Hover lift for interactive *cards* uses a 1px rule darkening + 2px translate — no shadows on hover.
- The maintenance card's heavy blur shadow is removed in favor of `--shadow-pop`.

## 4. Typography rules
- Page title clamp(32→44), panel title 22/21, metric 42/35 — unchanged.
- Body 14, secondary 13, metadata 12, captions 11, section labels 10/600/0.12em — unchanged.
- Tabular figures everywhere numbers align in a column (existing `.tabular`).
- Numeric suffix units (/390, %) always muted, never smaller than 12px.

## 5. Icon system (details in Phase 8)
- Sizes: **14** micro glyph · **16** inline control · **18** nav/row action · **22** tile default · **28** large tile. No ad-hoc sizes.
- `@duo-icons/react` first (primary layer ink, secondary layer accent wash — CSS-tinted to app tokens); Lucide fallback.
- Lucide icons in duotone contexts use the existing echo treatment; in micro contexts plain 1.75 stroke.
- Icon-only controls always carry `aria-label`; decorative icons `aria-hidden`.

## 6. Component treatments (summary — full matrix in Phase 7)
- **Primary action**: terracotta fill, paper text, darker hover, `--radius-control`, 40px (32px compact). One primary action per view.
- **Secondary**: rule border + paper fill; **tertiary**: ghost; **destructive**: danger fill reserved to confirm steps.
- **Inputs**: paper fill, rule border, `--radius-control`, 10×12 padding; read-only soft fill; focus = accent 2px outline offset 2px; error = danger border + message with `role="alert"`.
- **Cards**: `--radius-card` only for expressive (outcome/landing) cards; dashboard cards stay `.panel`.
- **Tables**: unchanged ledger style; row hover soft; sticky header inside scroll containers where >8 rows.
- **Toasts/dialogs/popovers**: `--radius-control`/`--radius-panel`, `--shadow-pop`, entrance per motion rules.

## 7. Motion language (restrained)
- Hover/color: CSS transition 140ms ease.
- Enter/exit: 220ms cubic-bezier(.22,1,.36,1) or spring(stiffness≈120–150, damping≈16–20).
- View switches (dashboard tabs/history/compare): 240ms fade + 8px rise; no horizontal slides.
- Dialogs: overlay fade 160ms; content fade+scale .98 200ms; exit 150ms.
- Toasts: 12px rise + fade 200ms; auto-dismiss unchanged.
- Stagger: 70ms, max 6 children, once.
- **Charts never animate** (DESIGN.md). No parallax inside the app shell (landing keeps its hero parallax).
- `prefers-reduced-motion`: global CSS clamp (existing) + `MotionConfig reducedMotion="user"` + react-spring gates — all retained; new motion must be `useReducedMotion`-aware or CSS-driven.

## 8. State matrix (applies to every interactive component)
hover · focus-visible · active/pressed · selected · disabled · loading · empty · error · success. Every state must be perceivable without color alone (label, icon, or position change accompanies it).

## 9. Content & copy rules
- Sentence-case headlines with the established voice ("Your preparation, in perspective.").
- Numbers over 3 digits use `en-IN` formatting; dates in IST with `en-IN` locale.
- Deployment-neutral copy in product surfaces (no "Neon Postgres" inside user-facing settings).
