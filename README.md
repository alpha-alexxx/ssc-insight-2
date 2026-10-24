# SSC Insight

A warm-paper SSC CGL Tier 2 mock tracker built with Next.js 16, React 19, TypeScript, Tailwind CSS, Radix components, Recharts, and Motion. Opens directly to the dashboard.

**Access is public and shared.** Google sign-in is optional and does not restrict records or create private workspaces. Guests can read, add, edit, export, and delete the same records as signed-in users.

## Design

Cream paper, charcoal ink, Source Serif 4 headings, DM Sans controls, square panels, and terracotta actions. See [DESIGN.md](DESIGN.md) and [PRODUCT.md](PRODUCT.md).

![Dashboard with illustrative test data](docs/images/dashboard-desktop.jpg)

[Mobile preview](docs/images/dashboard-mobile.jpg). These previews use illustrative data; the app does not seed mock attempts.

## Database and Auth

The database is **PostgreSQL on Neon**, accessed only through Prisma 7.10.1 and the Neon serverless adapter in Next.js Node route handlers. Application data lives in the `ssc_insight` schema: `MockAttempt`, ordered `SubjectResult` rows, and singleton `TrackerSettings`. Neon manages Auth in its own schema, which our migrations never manage.

- Organization: `org-old-hill-05909567`
- Project: `lingering-mode-47457333` (`ssc-insight`)
- Branch: `production`
- Existing site: https://sscinsight-lovat.vercel.app/

This migration starts with empty application tables. Firebase records and configuration remain untouched; no Firebase records are copied automatically. Existing version-1 JSON backups can still be reviewed and imported manually.

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
| `GOOGLE_AUTH_ENABLED` | Set to `true` after configuring a production Google OAuth client; otherwise the dashboard shows guest access |

Keep every variable server-side; none needs a `NEXT_PUBLIC_` prefix. The client talks to the same-origin `/api/auth` proxy. Missing Auth configuration does not prevent anonymous mock tracking. Build and client generation do not connect to the database or require live secrets.

### Migrations

```powershell
npm run db:generate
npm run db:migrate
```

`prisma.config.ts` loads Next.js environment files and uses the unpooled connection. Do not run `prisma migrate reset`, target Neon's managed Auth schema, or apply schema changes automatically in arbitrary Vercel builds. Test new SQL migrations on an expiring branch first. Apply reviewed migrations explicitly before deploying the matching app revision.

## Optional Google sign-in

Use Neon Auth's Google provider with your own Google OAuth **Web application** credentials in production. Shared Neon keys are for development. Register the managed Auth URL plus `/callback/google` as Google's authorized redirect URI. Allow `https://sscinsight-lovat.vercel.app` in Neon Auth's trusted domains; allow localhost while testing locally.

Use the Neon Console to enter the client secret directly, or run the local masked-input helper:

```powershell
.\scripts\configure-google-oauth.ps1
```

The helper targets the selected production project/branch, sends the credentials over stdin, and does not save or print the secret. Confirm `neon neon-auth oauth-provider list` reports `google standard` with your client ID. Then set `GOOGLE_AUTH_ENABLED=true` and rebuild/redeploy.

The app uses the pinned `@neondatabase/auth` Next.js SDK for Google redirects, signed session cookies, and sign-out. Only `/auth/complete` uses session middleware to finish OAuth; the dashboard and mock APIs remain public. The sign-in page always offers guest access. Authentication does not grant ownership protection.

## Vercel

Use the existing `sscinsight` project in `alphaalexxxs-projects`. Configure runtime database and Auth variables in its Production environment, marking the database URL and cookie secret as sensitive. Migrations use the direct URL locally or in controlled release jobs; the production runtime only needs the pooled URL.

Redeploy after environment changes. Do not upload personal Firebase CLI credentials or local Google service-account files. `.gitignore` and `.vercelignore` exclude local credentials, environment files, generated output, and temporary review data. Preserve previous deployment/configuration for rollback.

## Tracker behavior

- Full mocks: Quant 30, Reasoning 30, English 45, GA 25; 390 marks. Optional Computer is separate from the 390-mark statistics.
- Section I: Quant + Reasoning, 180 marks. Section II: English + GA, 210 marks. Subject and sectional practice support shorter custom counts.
- Correct/incorrect counts calculate scores live at +3/-1. Three time blocks sum to the overall time; omitted blocks become zero. Legacy score/time overrides remain compatible with existing backups.
- Completion dates and filters use IST. Platform presets include Testbook, RBE, Oliveboard, Pundits, Test Ranking, and Others with a custom input.
- Paste Report extracts supported fields locally and always opens an editable review form.
- Subject score/accuracy/time series combine full, sectional, and subject mocks; date/platform/search filters apply. Mock-type/subject summary filters do not restrict those series. Percentages allow comparison across different maxima.
- Accuracy is total correct divided by total attempted. Full averages exclude Computer. Recent improvement requires ten comparable mocks. Unknown metrics display a dash.
- Compare two to four mocks. JSON backups use schema version 1; restore previews duplicates and adds records atomically with new IDs. CSV exports per-subject results.

## API

Routes retain `{data}` / `{error: {code, message}}` response envelopes, validation, same-origin writes, and request-size limits. JSON backups and CSV use downloadable responses.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/mock-attempts` | GET, POST | Filter/list; add |
| `/api/mock-attempts/:id` | GET, PUT, DELETE | Inspect; edit; confirmed deletion |
| `/api/analytics` | GET | Filtered summaries and cross-type subject series |
| `/api/settings` | GET, PUT | Shared target score |
| `/api/backup` | GET, POST | Export, preview, atomic restore |
| `/api/auth/*` | SDK methods | Same-origin Neon Auth proxy |

List/analytics filters: `type`, `subject`, `platform`, `from`, `to`, `search`. Literal substring search escapes PostgreSQL wildcard characters. Date ranges are inclusive IST dates. Domain calculations run on the server; filters run through Prisma.

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

`verify:neon` runs against localhost unless `APP_URL` is supplied. It creates explicitly disposable mock records, verifies persisted CRUD/subject replacement, the 245/390 report, Computer exclusion, cross-type analytics, literal filters, backups/import duplicates, shared settings, validation, and the anonymous Auth session endpoint. Its `finally` block removes its records and restores the prior target setting. Run against a QA branch first.

A passing session endpoint is not proof of Google login. Browser verification must additionally complete Google consent, reload to confirm the session, and sign out. Report Google login as pending if user participation or provider configuration prevents that check.

## Agent tooling

The user-installed `neon-postgres` Codex plugin bundles the Neon skills and OAuth MCP endpoint `https://mcp.neon.tech/mcp`. Do not duplicate it with separate skills/MCP entries. The CLI is preferred for this project's operations. The linked `.neon` file is local and ignored; `neon.ts` declares only the requested services.

References: [Neon skill](https://neon.com/.well-known/agent-skills/neon/SKILL.md), [Prisma on Neon](https://neon.com/docs/guides/prisma), [Neon Auth](https://neon.com/docs/auth/overview).
