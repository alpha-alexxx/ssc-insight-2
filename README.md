# SSC Insight

A warm-paper SSC CGL Tier 2 mock tracker built with Next.js 16, React 19, TypeScript, Tailwind CSS, Radix components, Recharts, and Motion. Opens directly to the dashboard.

**Google sign-in is required.** Each account has private mocks, analytics, comparisons, settings, and exports. New users start empty. There is no sharing or administrator access.

## Design

Cream paper, charcoal ink, Source Serif 4 headings, DM Sans controls, square panels, and terracotta actions. See [DESIGN.md](DESIGN.md) and [PRODUCT.md](PRODUCT.md).

![Dashboard with illustrative test data](docs/images/dashboard-desktop.jpg)

[Mobile preview](docs/images/dashboard-mobile.jpg). These previews use illustrative data; the app does not seed mock attempts.

## Database and Auth

The database is **PostgreSQL on Neon**, accessed only through Prisma 7.10.1 and the Neon serverless adapter in Next.js Node route handlers. Application data lives in the `ssc_insight` schema: `MockAttempt`, ordered `SubjectResult` rows, and per-user `TrackerSettings`. Neon manages Auth in its own schema, which our migrations never manage.

- Organization: `org-old-hill-05909567`
- Project: `lingering-mode-47457333` (`ssc-insight`)
- Branch: `production`
- Existing site: https://sscinsight-lovat.vercel.app/

The original Neon migration started with empty application tables. The private-account migration assigns the two existing shared mocks to the verified `ankitinter9@gmail.com` Auth identity; see [release notes](docs/private-accounts.md). Firebase records and configuration remain untouched; no Firebase records are copied automatically. Existing version-1 JSON backups remain importable; new exports use the portable version-2 format with the target score.

## Run locally

Use Node.js 22.20+ or Node.js 24. Prisma Client generates on installation. Next's webpack build is used for reliable Windows operation.

```powershell
npm ci
neon login
neon link --org-id org-old-hill-05909567 --project-id lingering-mode-47457333 --branch production -y
neon deploy
npm run dev
```

Open http://localhost:3000. `neon deploy` reconciles the services in `neon.ts` and pulls their variables into `.env.local` (or `.env` if present). It does not deploy the Next.js application to Vercel. Linking is not required for a machine already configured with the environment variables.

### Environment variables

Copy `.env.example` for the names, or use Neon's environment pull. Never commit real values.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL runtime connection |
| `DATABASE_URL_UNPOOLED` | Direct connection used only by Prisma migration commands |
| `NEON_AUTH_BASE_URL` | Managed Auth URL ending in `/auth` |
| `NEON_AUTH_COOKIE_SECRET` | Cryptographically random secret of at least 32 characters |
| `GOOGLE_AUTH_ENABLED` | Set to `true` after configuring a production Google OAuth client; otherwise sign-in is unavailable |

Keep every variable server-side; none needs a `NEXT_PUBLIC_` prefix. The client talks to the same-origin `/api/auth` proxy. Missing or unavailable Auth configuration fails closed; private records are never returned anonymously. Build and client generation do not connect to the database or require live secrets.

### Migrations

```powershell
npm run db:generate
npm run db:migrate
```

`prisma.config.ts` loads Next.js environment files and uses the unpooled connection. Do not run `prisma migrate reset`, target Neon's managed Auth schema, or apply schema changes automatically in arbitrary Vercel builds. Test new SQL migrations on an expiring branch first. Apply reviewed migrations explicitly before deploying the matching app revision.

## Google sign-in

Use Neon Auth's Google provider with your own Google OAuth **Web application** credentials in production. Shared Neon keys are for development. Register the managed Auth URL plus `/callback/google` as Google's authorized redirect URI. Allow `https://sscinsight-lovat.vercel.app` in Neon Auth's trusted domains; allow localhost while testing locally.

Use the Neon Console to enter the client secret directly, or run the local masked-input helper:

```powershell
.\scripts\configure-google-oauth.ps1
```

The helper targets the selected production project/branch, sends the credentials over stdin, and does not save or print the secret. Confirm `neon neon-auth oauth-provider list` reports `google standard` with your client ID. Then set `GOOGLE_AUTH_ENABLED=true` and rebuild/redeploy.

The app uses the pinned `@neondatabase/auth` Next.js SDK for Google redirects, signed session cookies, and sign-out. The dashboard and OAuth completion route use session middleware, with an independent server session guard on the page and every data API. Missing sessions receive `401 UNAUTHENTICATED`; verification outages receive `503 AUTH_UNAVAILABLE`. The server obtains ownership exclusively from the verified session. Foreign record IDs return the same 404 as nonexistent IDs. Personalized responses and downloads use `Cache-Control: private, no-store`. Sign-out, session failures, and account changes unmount private dashboard state.

## Vercel

Use the existing `sscinsight` project in `alphaalexxxs-projects`. Configure runtime database and Auth variables in its Production environment, marking the database URL and cookie secret as sensitive. Migrations use the direct URL locally or in controlled release jobs; the production runtime only needs the pooled URL.

Redeploy after environment changes. Do not upload personal Firebase CLI credentials or local Google service-account files. `.gitignore` and `.vercelignore` exclude local credentials, environment files, generated output, and temporary review data. Preserve previous deployment/configuration for rollback.

## Tracker behavior

- Full mocks: Quant 30, Reasoning 30, English 45, GA 25; 390 marks. Optional Computer is separate from the 390-mark statistics.
- Section I: Quant + Reasoning, 180 marks. Section II: English + GA, 210 marks. Subject and sectional practice support shorter custom counts.
- Correct/incorrect counts calculate scores live at +3/-1. Three time blocks sum to the overall time; omitted blocks become zero. Legacy score/time overrides remain compatible with existing backups.
- Completion dates and filters use IST. Platform presets include Testbook, RBE, Oliveboard, Pundits, Test Ranking, and Others with a custom input.
- Paste Report extracts supported fields locally and always opens an editable review form.
- Dashboard tabs are analytical scopes, not database type filters: Full Mocks projects saved full mocks; Subject Wise projects every subject result from full, sectional, and subject mocks; Sectional Wise projects explicit sectionals plus Section I/II derived from each full mock; All Mocks projects each saved attempt exactly once. Date, platform, and search filters apply to every scope.
- A full mock is never counted again as four subject rows or two section rows in All Mocks. Derived sections sum their child results and do not inherit the parent score override, rank, percentile, or overall time.
- Where you stand is one global subject radar built from all mock types. Make every attempt count shows Correct/Incorrect/Unattempted stacks for the selected scope. Subject Wise and Sectional Wise use one separate card per subject/section; Full Mocks keeps one ring card and All Mocks keeps rings grouped by mock type. Each ring center shows a genuine saved exam percentile when one exists, otherwise score percentage (marks ÷ maximum); parent percentiles are never borrowed for subjects or derived sections. Subject deep dive is available on every tab except Subject Wise.
- One target score out of 390 is configured under Settings and applied as a percentage reference on every scope.
- Accuracy is total correct divided by total attempted. Full averages exclude Computer. Unknown metrics display a dash; negative marks remain visible.
- Compare two to four mocks.

## Backup and account transfer

- **JSON backup (format version 2)** is the portable, restorable file. It includes every mock and subject result, notes, rank/participants/percentile, score/time overrides, completion dates, source, the target score, and a summary/manifest. It contains no email, `userId`, or auth credentials.
- **CSV** is a separate read-only per-subject export for spreadsheets. It cannot be imported.
- Import into the currently signed-in account. **Merge** preserves existing records, skips exact duplicates, and reports content conflicts. **Replace** deletes all current mocks and mirrors the backup after an explicit safety-backup download and confirmation naming the signed-in account.
- The target is applied only when checked; a backup with no target can clear the current target only through an explicit clear option. Legacy v1 backups are attempts-only, so no target is applied.
- Imported records receive new IDs and bookkeeping timestamps; `completedAt` and `source` are preserved. All writes are one transaction, so a failure leaves the destination unchanged.
- The import limit is 4 MB (10,000 attempts) to stay within the deployment request-body limit. Export warns when a file is too large or contains records that cannot validate; such a file may not be importable.
- A different Google account is a new Neon Auth workspace, so export/import is the supported move. A same-identity email change keeps the workspace and needs no import. Neon Auth tables stay read-only; the app never reassigns ownership server-side.
- Backups are manual only: no scheduled jobs, reminders, email, or ZIP archive.

## API

Routes retain `{data}` / `{error: {code, message}}` response envelopes, validation, same-origin writes, and request-size limits. JSON backups and CSV use downloadable responses.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/mock-attempts` | GET, POST | Filter/list; add |
| `/api/mock-attempts/:id` | GET, PUT, DELETE | Inspect; edit; confirmed deletion |
| `/api/analytics` | GET | Scope projection (`view=full\|subject\|sectional\|all`), radar profile, target snapshots |
| `/api/settings` | GET, PUT | Private target score out of 390 |
| `/api/backup` | GET, POST | GET v2 JSON backup or read-only CSV; POST merge/replace preview and atomic commit |
| `/api/auth/*` | SDK methods | Same-origin Neon Auth proxy |

List/analytics filters: `type`, `subject`, `platform`, `from`, `to`, `search`. `type` and `subject` filter Mock history and Compare; dashboard scopes ignore them. Literal substring search escapes PostgreSQL wildcard characters. Date ranges are inclusive IST dates. Domain calculations run on the server; filters run through Prisma.

## Verification

```powershell
npx next typegen
npm run typecheck
npm run lint
npm test
npm run build
npm run start
npm run verify:neon
```

`verify:neon` runs against localhost unless `APP_URL` is supplied. It creates explicitly disposable mock records, verifies persisted CRUD/subject replacement, the 245/390 report, Computer exclusion, cross-type analytics, literal filters, v2 backup/merge duplicates/target import, private settings, validation, and anonymous redirects. Its `finally` block removes its records and restores the prior target setting. Set `TEST_SESSION_COOKIE` from a real disposable QA session and run against a QA branch first. Never paste session cookies into chat or commit them. `node scripts/verify-ownership.mjs` additionally requires `TEST_OTHER_SESSION_COOKIE` for a second real account and tests isolation, forged ownership, cross-account v2 merge/target transfer, stale-preview rejection, exports, and revoked sessions. `scripts/verify-backup-transfer.mjs` is a guarded destructive replace check and requires `ALLOW_DESTRUCTIVE_REPLACE=1` plus two disposable accounts.

A passing session endpoint is not proof of Google login. Browser verification must additionally complete Google consent, reload to confirm the session, and sign out. Report Google login as pending if user participation or provider configuration prevents that check.

## Agent tooling

The user-installed `neon-postgres` Codex plugin bundles the Neon skills and OAuth MCP endpoint `https://mcp.neon.tech/mcp`. Do not duplicate it with separate skills/MCP entries. The CLI is preferred for this project's operations. The linked `.neon` file is local and ignored; `neon.ts` declares only the requested services.

References: [Neon skill](https://neon.com/.well-known/agent-skills/neon/SKILL.md), [Prisma on Neon](https://neon.com/docs/guides/prisma), [Neon Auth](https://neon.com/docs/auth/overview).
