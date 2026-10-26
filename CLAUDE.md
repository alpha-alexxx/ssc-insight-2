# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

SSC Insight is a private SSC CGL Tier 2 mock tracker. It records full, sectional, and subject mocks, derives performance views, and supports a portable JSON backup that can be imported into a different signed-in account.

The root route `/` is the authenticated dashboard; there is no separate `/dashboard` route. Authoritative product/design/setup docs:

- `PRODUCT.md` — product behavior, scope boundaries, private-account rules.
- `DESIGN.md` — paper-and-ink visual system, chart tokens, interaction rules.
- `README.md` — Neon/Vercel setup, environment variables, migrations, verification scripts.
- `AGENTS.md` — generated Next.js agent warning (see below).
- `docs/private-accounts.md`, `docs/neon-migration.md` — ownership and migration history.

## Commands

```bash
npm ci                 # install; postinstall runs prisma generate
npm run dev            # next dev --webpack --hostname 0.0.0.0
npm run build          # prisma generate && next build --webpack
npm run start          # production server
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm test               # tsx --test tests/*.test.ts
npm run db:generate    # prisma generate
npm run db:migrate     # prisma migrate deploy
npm run verify:neon    # authenticated QA; needs a running app + TEST_SESSION_COOKIE
```

Run one test file:

```bash
npx tsx --test tests/backup.test.ts
npx tsx --test --test-name-pattern "legacy v1" tests/backup.test.ts
```

Use Node 22.20+ (CI uses Node 22). The project intentionally uses webpack, not Turbopack.

CI (`.github/workflows/ci.yml`) runs: `npm ci`, `npx prisma generate`, `npx next typegen`, `typecheck`, `lint`, `test`, `build`.

Additional QA scripts (require disposable session cookies and a QA branch; never use production accounts):

```bash
TEST_SESSION_COOKIE=... node scripts/integration-check.mjs
TEST_SESSION_COOKIE=... TEST_OTHER_SESSION_COOKIE=... node scripts/verify-ownership.mjs
ALLOW_DESTRUCTIVE_REPLACE=1 TEST_SESSION_COOKIE=... TEST_OTHER_SESSION_COOKIE=... \
  node scripts/verify-backup-transfer.mjs
```

## Next.js constraints

`AGENTS.md` is generated and re-added by `next dev`; do not remove it. It requires reading the bundled docs under `node_modules/next/dist/docs/` before writing Next.js code — this Next 16 version differs from older conventions.

- App Router; server components by default. Client state lives behind `"use client"` boundaries.
- Cache Components are not enabled. Personalized APIs use `Cache-Control: private, no-store`; do not add shared caching or `revalidate` behavior to account data.
- Route handlers authenticate independently; page middleware (`src/proxy.ts`) covers only pages.
- The client JSON helper is `api()` in `src/components/mock-form.tsx`; it sets `cache: "no-store"` and unwraps `{ data }`.

## Request and ownership architecture

```
Browser client components
  -> /api/* route handler (src/app/api/**/route.ts)
  -> requireUser() (src/lib/auth/require-user.ts)
  -> repository (src/lib/repository.ts)
  -> Prisma + @prisma/adapter-neon
```

- Ownership is always the verified Neon Auth user ID from `requireUser()`. Never accept `userId` from a body, query, or backup.
- `src/lib/api.ts` centralizes `{ data }` / `{ error: { code, message } }`, `private, no-store`, same-origin write checks, JSON/body size limits, and Prisma error mapping. The backup GET is the exception: it returns a raw downloadable file.
- Foreign and nonexistent record IDs intentionally return the same 404.
- `src/components/private-workspace.tsx` re-verifies the session and unmounts private UI on mismatch; session failures hide data.
- `/sign-in` is the public landing page but remains a dynamic Server Component wrapper: it calls `requireUser()` with cookie caching disabled and redirects verified users to `/`. Keep the landing presentation separate from this authoritative server check; client `useSession()` is only a UI fallback.
- Auth uses Neon Auth with Google. The app stores no email/user row and has no ownership relation to Neon Auth tables. A different Google account is a separate workspace. Do not write to `neon_auth` or add a server-side owner-reassignment endpoint.

## Persistence and domain model

Prisma models (`prisma/schema.prisma`, PostgreSQL schema `ssc_insight`):

- `MockAttempt` — one saved attempt: type, date, optional overrides, rank/participants/percentile, notes, source, owner `userId`.
- `SubjectResult` — child rows keyed by `(attemptId, subjectId)`; ownership cascades from the attempt.
- `TrackerSettings` — one row per user; currently only nullable `targetScore` (0–390).

`src/generated/prisma` is generated output; do not edit it.

Domain rules live in `src/lib/domain.ts`:

- Subjects: `quant`, `reasoning`, `english`, `ga`, `computer`.
- Full mocks: the four main subjects with fixed counts (30/30/45/25), maximum 390. Optional Computer is scored separately and excluded from full totals, but its time contributes to overall time.
- Subject mocks: exactly one subject, custom counts.
- Sectionals: exactly Quant+Reasoning or English+GA, custom counts.
- Section I = Quant+Reasoning; Section II = English+GA. Sections are derived analytics, not database rows.
- Scoring is +3 correct / −1 incorrect. `subjectStats()` and `totals()` derive scores, accuracy, percentages, skipped counts, and time. Do not persist derived values.
- Legacy `scoreOverride` / `overallTimeSeconds` are supported; new form entries go through `src/lib/mock-entry.ts`.
- `attemptSchema` is the write/import validation contract. Reuse it rather than duplicating layout rules.
- No database seed: new users start empty.

## Dashboard analytics model

`src/lib/analytics.ts` is server-side and returns the complete dashboard payload. The four dashboard tabs are **analytical scopes**, not record filters:

| Scope | Projection |
| --- | --- |
| `full` | One point per saved full mock |
| `subject` | One point per `(attemptId, subjectId)` from full, sectional, and standalone subject mocks |
| `sectional` | Explicit sectional attempts (one section each) plus Section I/II derived from every full mock |
| `all` | One point per saved parent attempt, compared by percentage |

Critical invariants:

- Never union projections for All Mocks; one full mock must not count again as four subjects and two sections.
- Explicit sectionals produce one section point; full mocks produce two derived section points. Do not derive a second copy from an explicit sectional.
- Derived sections sum child results and do not inherit the full mock's score override, rank, percentile, or overall time.
- Subject/section charts show every populated series together. Missing values stay `null`, not zero.
- `whereYouStand` (radar) is global across mock types and should not change when switching dashboard tabs; platform/date/search constraints still apply.
- `AnswerStack` retains genuine saved-percentile provenance for analytics compatibility, but compact outcome cards always display score percentage (marks ÷ maximum). Parent full/sectional percentiles are never copied to subject slices or derived sections.
- One target (`targetScore / 390`) is shown as a percentage reference in every scope.
- `/api/analytics?view=full|subject|sectional|all` ignores parent `type`/`subject` filters; platform/date/search still apply. History/Compare use the persisted-record filters separately.

`Dashboard` keeps `scope` separate from `filters`. Clicking a dashboard tab changes scope; History/Compare change persisted-record filters.

## AI subsystem

AI is optional, read-only, and server-only. It must fail closed without breaking the tracker.

- **Config**: `src/lib/ai/config-core.ts` parses `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_JSON_MODE`, `AI_DAILY_REQUEST_LIMIT`, `AI_DAILY_TOKEN_LIMIT`, `AI_MAX_OUTPUT_TOKENS`, and `AI_TIMEOUT_MS`. `src/lib/ai/config.ts` adds `server-only`. Missing key/model returns `enabled:false` from `/api/ai/status`; data routes return `503 AI_NOT_CONFIGURED`.
- **Provider**: native `fetch` against an OpenAI-compatible `/chat/completions` endpoint in `src/lib/ai/provider.ts`; no provider SDK. JSON mode falls back once if a provider rejects `response_format`. One repair call is allowed for invalid JSON. Timeouts are below the route `maxDuration` of 60 seconds.
- **Read-only guarantee**: AI routes never call repository writes. Only `MockForm` save creates attempts. Coach/chat read; extraction returns a draft that the user must explicitly apply.
- **Context privacy**: `listAttemptsForAi` in `src/lib/repository.ts` uses Prisma `omit: { notes: true }`; `src/lib/ai/context.ts` whitelists aggregates, subjects/sections, target, and the latest 20 full mocks. It must never include notes, names, IDs, email, user ID, source, or per-attempt detail outside those latest 20 full mocks. `AnalyticsAttempt = Omit<Attempt, "notes">` is the widened analytics input type.
- **Quota**: `AiUsage` is an app-owned ledger (`userId`, IST `day`, feature, model, tokens, status, safe error code). `reserveAiUsage` checks request/token caps in a serializable transaction before context work; `settleAiUsage` is idempotent and charges conservatively after provider errors/aborts. The reservation transaction sets `maxWait: 10s` / `timeout: 15s`; Prisma's 2s default surfaces as P2028 on a cold Neon connection. Usage rows never contain prompts, responses, notes, or report text and are excluded from backups.
- **Routes**: `/api/ai/status`, `/api/ai/coach`, `/api/ai/chat` (NDJSON stream: `start`, `delta`, `done`, `error`), `/api/ai/extract`. All use `requireUser()`, `private, no-store`, and the normal `{data}`/`{error}` envelope before streaming. AI errors are mapped in `apiError` before the Prisma fallback, so they never become `DATABASE_UNAVAILABLE`.
- **Extraction contract**: `src/lib/ai/extraction.ts` returns an editable, nullable draft with reported evidence, deterministic derived-field markers, and field-level issues—not raw `AttemptInput`. Missing values remain distinct from explicit zero. Only a blocker-free user-reviewed draft converts to `AttemptInput`; the form remains the sole save path and sets `source: "paste"`.
- **UI state**: the coach card is presentational; status, insight, chat messages, and the abort controller live in `Dashboard` so they survive view switches. Chat is in-memory only — no sessionStorage/localStorage. The drawer aborts in-flight streams on close/unmount. AI controls are hidden/disabled when unconfigured.
- **Docs/tests**: `tests/ai.test.ts` covers config, quota, IST day keys, context privacy, extraction normalization, provider JSON/stream/repair/timeout paths, NDJSON decoding, and AI error mapping. Tests use fake fetch; CI makes no real provider calls.

## Backup and account transfer

`src/lib/backup.ts` is the browser-safe format/planning layer. `src/lib/repository.ts` owns database export/import.

- Current format: `format: "ssc-insight-backup"`, `formatVersion: 2`, `exportedAt`, `summary` (`attempts`, `subjectResults`, first/last completion), `settings.targetScore`, full attempts, warnings. No email, `userId`, or credentials.
- Legacy top-level v1 (`schemaVersion: 1`, attempts only) remains importable; it has no target.
- Import modes: `merge` (skip exact content duplicates, report coarse-key content conflicts, preserve existing data) and `replace` (delete all current attempts, then mirror the deduplicated file).
- Imports are transactional and chunked. New IDs and bookkeeping timestamps are generated; `completedAt` and `source` are preserved.
- A SHA-256 preview fingerprint covers destination content, incoming content, current/incoming target, mode, and `applyTarget`. Commits with a stale fingerprint return 409.
- Replace is client-gated by an explicit safety JSON download and a confirmation naming the signed-in account, and server-gated by `confirmReplace: true`.
- The import transport limit is 4 MB (Vercel request-body constraint); the attempt schema limit is 10,000. CSV is read-only and never importable.
- The target is applied only when `applyTarget` is set; a null incoming target clears the target only with that explicit choice.
- User-facing move flow: export JSON from the old account → sign out → sign in with the other Google account → import → merge or replace. This moves data, not the login identity.

## UI and charts

- `src/components/dashboard.tsx` is the client orchestrator: dashboard/history/compare/add/settings views, filters, dialogs, settings, and backup-transfer UI.
- `src/components/performance-overview.tsx` renders the dashboard cards; `src/components/ui/chart.tsx` is the local shadcn-style Recharts wrapper; `src/components/dashboard-panels.tsx` provides `Panel`/`EmptyChart`.
- `src/app/globals.css` + `src/lib/chart-theme.ts` define paper/ink/accent and semantic chart tokens. Preserve them.
- Design rules: warm paper surfaces, square corners, thin rules, serif headings, no shadows, disabled chart animation, reduced-motion support, visible legends/labels, and accessible data tables (`View data`). The reference-led outcome cards are the scoped exception: they use soft rounding and subject icons without changing surrounding dashboard geometry.
- “Make every attempt count” renders `analytics.radial` as responsive outcome cards across every scope. Cards show coverage, a score-centered answer-distribution ring, three outcome counts/shares and proportion bars, marks/max, accuracy, and genuine reported-percentile availability. Parent full/sectional percentiles are never copied to subject slices or derived sections; the ring center always shows score percentage (marks ÷ maximum).
- Charts use a single percentage axis; raw marks stay in tooltips/tables. Do not introduce dual-axis charts.
- Dates are displayed in Asia/Kolkata.

## Testing

Tests use the built-in `node:test` runner with `tsx`. There are no component, browser, or visual-regression tests. Key coverage:

- `tests/domain.test.ts`, `tests/mock-entry.test.ts` — scoring, IST dates, layouts, overrides.
- `tests/subject-performance.test.ts` — scope projections, no-double-counting, radar, outcome-card aggregates/percentile provenance, target helpers.
- `tests/backup.test.ts` — v1/v2 format, summary integrity, fingerprints, merge/replace planning, ownership stripping, limits.
- `tests/attempt-persistence.test.ts`, `tests/ownership.test.ts`, `tests/api.test.ts` — persistence mapping, forged ownership, response safety.

The authenticated scripts are integration checks, not unit tests; they require live QA sessions and should run against a disposable Neon branch with cleanup.

## Environment and deployment

- Copy `.env.example`; real values stay server-side. Required: `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (migrations), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `GOOGLE_AUTH_ENABLED`. Optional AI: `AI_API_KEY`, `AI_MODEL`, and the tuning variables documented above.
- The AI usage migration is `prisma/migrations/20261025000000_ai_usage`; apply it before deploying a revision that calls the AI routes. Backups remain unaffected.
- Migrations use the unpooled URL via `prisma.config.ts`. Never run `prisma migrate reset`, never target the Neon Auth schema, and do not apply migrations automatically in arbitrary builds.
- `.neon` is local/ignored; `neon.ts` declares services. `neon deploy` reconciles services and pulls env values.
- Vercel deployment uses the pooled URL; the backup import cap is 4 MB because Vercel request bodies are about 4.5 MB.
- Do not add scheduled backups/reminders; backups are manual by product decision.

## Documentation map

Change behavior in this order: update the implementation, then the relevant of `PRODUCT.md` (behavior), `DESIGN.md` (visual/chart rules), `README.md` (setup/API/verification). Keep `CLAUDE.md` focused on architecture and invariants rather than duplicating every product rule.
