# SSC Insight

A warm-paper SSC CGL Tier 2 mock tracker built with Next.js 16, React 19, TypeScript, Tailwind CSS, Radix components, Recharts, and Motion. Opens to a public landing page; signed-in visitors go straight to the dashboard.

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

Use `http://localhost:3000` (or the machine's LAN address), not `http://0.0.0.0:3000`, in the browser. The dev server binds `0.0.0.0` for network access; OAuth callbacks and redirects preserve the browser's `Host` header and normalize the bind address to `localhost`.

### Environment variables

Copy `.env.example` for the names, or use Neon's environment pull. Never commit real values.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL runtime connection |
| `DATABASE_URL_UNPOOLED` | Direct connection used only by Prisma migration commands |
| `NEON_AUTH_BASE_URL` | Managed Auth URL ending in `/auth` |
| `NEON_AUTH_COOKIE_SECRET` | Cryptographically random secret of at least 32 characters |
| `GOOGLE_AUTH_ENABLED` | Set to `true` after configuring a production Google OAuth client; otherwise sign-in is unavailable |
| `AI_BASE_URL` | Optional OpenAI-compatible base URL; defaults to `https://api.openai.com/v1` |
| `AI_API_KEY` | Server-only provider key; blank disables AI |
| `AI_MODEL` | Provider model id; required to enable AI |
| `AI_JSON_MODE` | `true` by default; set `false` if the provider rejects `response_format` |
| `AI_DAILY_REQUEST_LIMIT` | AI requests per user per IST day; default `30` |
| `AI_DAILY_TOKEN_LIMIT` | Charged tokens per user per IST day; default `300000` |
| `AI_MAX_OUTPUT_TOKENS` | Per-call output cap; default `1200` |
| `AI_TIMEOUT_MS` | Provider timeout below the 60-second route limit; default `45000` |
| `AI_CREDENTIAL_SECRET` | Encrypts user-entered API keys (AES-256-GCM). 64 hex chars or a ≥32-char passphrase. Blank disables in-app key storage only |

Keep every variable server-side; none needs a `NEXT_PUBLIC_` prefix. The client talks to the same-origin `/api/auth` proxy. Missing or unavailable Auth configuration fails closed; private records are never returned anonymously. Build and client generation do not connect to the database or require live secrets. AI is optional: when `AI_API_KEY` or `AI_MODEL` is blank, the coach is hidden, AI-assisted paste is disabled, and the rest of the tracker works normally.

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

The public `/sign-in` route performs an authoritative server-side `requireUser()` check with cookie caching disabled and redirects an already verified account to `/dashboard`; the client Google control only starts OAuth or offers a fallback workspace link after its own session hook resolves. Failed OAuth flows return to `/sign-in?error=oauth` through the sign-in call's `errorCallbackURL`.

The app uses the pinned `@neondatabase/auth` Next.js SDK for Google redirects, signed session cookies, and sign-out. The dashboard and OAuth completion route use session middleware, with an independent server session guard on the page and every data API. Missing sessions receive `401 UNAUTHENTICATED`; verification outages receive `503 AUTH_UNAVAILABLE`. The server obtains ownership exclusively from the verified session. Foreign record IDs return the same 404 as nonexistent IDs. Personalized responses and downloads use `Cache-Control: private, no-store`. Sign-out, session failures, and account changes unmount private dashboard state.

### OAuth setup checklist

Follows the [Neon Auth OAuth guide](https://neon.com/docs/auth/guides/setup-oauth):

- Register `{NEON_AUTH_BASE_URL}/callback/google` (no trailing slash) as an **Authorized redirect URI** in the Google Cloud Console Web-application client, once per branch/environment you sign in from. The `callbackURL` passed to `signIn.social()` (our `/auth/complete`) is where users land after the flow — it is not the URI registered with Google.
- Add **Authorized JavaScript origins**: each app origin (`https://sscinsight-lovat.vercel.app`, `http://localhost:3000` while testing) plus the Auth base URL origin.
- Add Neon Auth **trusted domains** for every origin used as a `callbackURL`: the production domain, `localhost`, and a wildcard for Vercel preview deployments if previews should sign in.
- Configure credentials per branch — each Neon branch has its own Auth base URL. Use the Console (branch → Settings → Auth → OAuth providers), the CLI (`neon neon-auth oauth-provider add`), or `.\scripts\configure-google-oauth.ps1`.
- Google consent screen: set the app name, support email, and authorized domain. Apps in "Testing" status only work for listed test users; publishing and verification are required for public use.
- Set `GOOGLE_AUTH_ENABLED=true` and rebuild/redeploy.

## Vercel

Use the existing `sscinsight` project in `alphaalexxxs-projects`. Configure runtime database and Auth variables in its Production environment, marking the database URL and cookie secret as sensitive. Migrations use the direct URL locally or in controlled release jobs; the production runtime only needs the pooled URL.

Redeploy after environment changes. Configure the optional `AI_*` variables in the same environment if the coach should be enabled; the API key is server-only. Do not upload personal Firebase CLI credentials or local Google service-account files. `.gitignore` and `.vercelignore` exclude local credentials, environment files, generated output, and temporary review data. Preserve previous deployment/configuration for rollback.

## Tracker behavior

- Full mocks: Quant 30, Reasoning 30, English 45, GA 25; 390 marks. Optional Computer is separate from the 390-mark statistics.
- Section I: Quant + Reasoning, 180 marks. Section II: English + GA, 210 marks. Subject and sectional practice support shorter custom counts.
- Correct/incorrect counts calculate scores live at +3/-1. Three time blocks sum to the overall time; omitted blocks become zero. Legacy score/time overrides remain compatible with existing backups.
- Completion dates and filters use IST. Platform presets include Testbook, RBE, Oliveboard, Pundits, Test Ranking, and Others with a custom input.
- Paste Report extracts supported fields locally and always opens an editable review form.
- Dashboard tabs are analytical scopes, not database type filters: Full Mocks projects saved full mocks; Subject Wise projects every subject result from full, sectional, and subject mocks; Sectional Wise projects explicit sectionals plus Section I/II derived from each full mock; All Mocks projects each saved attempt exactly once. Date, platform, and search filters apply to every scope.
- A full mock is never counted again as four subject rows or two section rows in All Mocks. Derived sections sum their child results and do not inherit the parent score override, rank, percentile, or overall time.
- Where you stand is one global subject radar built from all mock types. Make every attempt count uses responsive outcome cards for every scope: one aggregate Full Mocks card, one card per populated subject or section, and parent attempts grouped by mock type for All Mocks. Each card shows attempts/questions, a score-centered answer-distribution ring, Correct/Incorrect/Unattempted counts and shares, aggregate marks/max, accuracy, and only genuinely reported percentile data; it never copies parent percentiles into subjects or derived sections. Subject deep dive is available on every tab except Subject Wise.
- One target score out of 390 is configured under Settings and applied as a percentage reference on every scope.
- Accuracy is total correct divided by total attempted. Full averages exclude Computer. Unknown metrics display a dash; negative marks remain visible.
- Compare two to four mocks.

## AI coach and assisted entry

AI is optional. Ordinary coaching and report extraction remain **read-only**; neither can save, edit, delete, or schedule a mock. A separate todo-assistance mode proposes changes to personal todos, which are applied only after explicit user review and confirmation.

- **Coach card** (dashboard): a manual **Generate insight** action returns a structured read of the saved data: headline, summary, strengths, focus areas, next actions, and caveats. It never runs automatically.
- **Chat drawer**: follow-up questions stream one answer at a time. History lives only in the mounted dashboard, so it disappears on reload, sign-out, account change, or session failure. There is no sessionStorage or localStorage copy.
- **AI-assisted paste**: in Log a mock → Paste report, **Arrange with AI** sends up to 20,000 pasted characters to the server and opens an editable extraction review. Reported values, safely derived SSC counts, missing fields, and contradictions are shown before anything is copied. The user can correct mock details, every subject row, time, rank, participants, and percentile; required blockers must be resolved before **Use reviewed values** copies the draft into the normal form. Nothing is saved until the user clicks Save. The deterministic **Review extracted result** path still works without AI and accepts longer reports.
- **Todo assistance**: available from Personal todos and the AI panel. Supply instructions and an explicit date or date range; without dates, the app asks which dates to use before generating. Review selectable proposals to create, edit, reschedule, complete/reopen, or move personal todos to Trash. Edit proposed details and compare existing versus proposed values before applying. Generation never saves records. Apply is transactional, version-checked, user-scoped, and idempotent; stale targets require refreshed review. Up to 25 operations are allowed per batch, without an artificial total todo-count cap. Mock records and built-in plan assignments are never mutation targets.
- **Provider**: any OpenAI-compatible Chat Completions endpoint. Two ways to configure it: the server environment variables above (shared by everyone), or **Settings → AI provider** / the AI panel's setup form, where each signed-in user can pick a preset provider (OpenAI, OpenRouter, Groq, Together, DeepSeek, local Ollama) or a custom endpoint and enter their own API key. A user credential takes precedence over the server environment. The endpoint must accept `model`, `messages`, and `max_tokens`; streaming is preferred but a non-streaming JSON response is also accepted. The app uses native `fetch`, sends JSON mode when JSON mode is on, retries once without it if the provider rejects `response_format`, and allows one JSON-repair call for coach/extraction output. A localhost base URL works for local development but is not reachable from Vercel.
- **Setup flow**: choose a provider (and base URL for a custom endpoint), enter a key, then **Fetch models**, search the returned catalog, and select a model. Discovery runs on the server using the draft connection; it does not save settings. Preset suggestions are not a live availability check. **Enter model ID** remains available when discovery is unsupported, fails, or omits a model. **Test connection** tests the current draft before **Save AI settings**: it sends one tiny completion without tracker context, may incur a small provider charge, and never saves changes. Saving is a separate action and does not require a successful test.
- **Storing user keys**: keys entered in the app are encrypted with AES-256-GCM under `AI_CREDENTIAL_SECRET` before they are written to `AiCredential`. The plaintext is never returned to a browser (only a 4-character hint is shown), never logged, and never included in a JSON backup or CSV export. A blank key field reuses the saved personal key only when the provider and endpoint match (ignoring a trailing slash); changing either requires a new key. Draft discovery and testing never fall back to the shared server key. The reveal control shows only a newly entered key, never the saved key. Leaving `AI_CREDENTIAL_SECRET` blank keeps AI working from the server key and allows draft discovery/testing, but disables saving personal credentials. Rotating that secret makes existing stored keys unreadable; users re-enter them.
- **Endpoint safety**: because a user may type a base URL, the server refuses loopback, private (RFC1918), link-local and cloud-metadata (`169.254.169.254`), CGNAT, multicast, reserved, and equivalent IPv6 addresses, and re-resolves the hostname immediately before every provider call. HTTP is refused except for an explicitly opted-in local provider, redirects are not followed, and credentials, query strings, or fragments in the URL are rejected. This blocks the practical server-side-request-forgery paths; it does not fully defeat a DNS-rebinding race, so treat the base URL field as a trusted-user feature.
- **Data sent to the provider**: aggregate analytics, the subject/section profile, target progress, and the latest 20 full mocks (date, platform, scores, rank/percentile, time, subject counts). **Mock notes, email, user ID, auth data, and per-attempt detail outside those latest 20 full mocks are never sent.** The pasted report text is sent only for extraction and is treated as untrusted data. Todo assistance additionally sends bounded active personal todo titles/dates/statuses/notes/subtasks, reusable group labels, and the requested study-plan window. Personal todo notes are included only in this explicitly invoked mode; Trash is excluded. Context truncation is reported in the proposal response.
- **Usage limit**: every coach, chat, extraction, and dated todo-generation request creates a row in `AiUsage` for the current IST day. Request and token caps are checked before context work; over-limit responses are `429 AI_QUOTA_EXCEEDED` with a reset time. Usage rows contain feature, model, token counts, status, and safe error codes — never prompts, responses, notes, or report text.
- **Privacy**: selecting a provider means its operator can see the aggregate context described above. Configure only a provider you trust. Server-configured keys stay in the environment; user-entered keys are stored encrypted and are never returned to the browser.
- **Failure behavior**: missing config → AI hidden; provider timeout/error/invalid JSON → a readable error, with deterministic parsing and manual entry still available. AI responses and usage are `Cache-Control: private, no-store`.

The AI schema migrations are `prisma/migrations/20261025000000_ai_usage` (usage ledger) and `prisma/migrations/20261028000000_ai_credential` (per-user encrypted credentials). Apply both explicitly on a QA branch before deploying the matching app revision. The credential migration is additive and creates one new table.

## Personal todos

**My Tasks** opens the full personal-task workspace directly. The dashboard combines today's structured assignments and personal tasks before a separate **Study Calendar**. Personal calendars select dates independently of the study schedule. Add a title on a selected date, then optionally edit notes, priority, group, and subtasks. New todos require one date and no time. Existing undated records are preserved in **Needs date**.

Groups are reusable across dates. Deleting a group moves its todos to Ungrouped. Parent checkbox actions complete/reopen all subtasks together; all subtasks complete the parent, and unchecking one reopens it. Subtasks share the parent date. Unfinished items retain their dates and become overdue, with priority ordering above completed items. A month calendar, filters, search, sorting, and pagination keep larger lists manageable.

Deletion moves a todo and its subtasks to **Trash**, which supports restoration without automatic expiry. Restoring preserves its original state/date and uses Ungrouped when its former group no longer exists. Trash is excluded from active counts and AI context. Recurrence, reminders, and autonomous actions are outside this version.

The additive migration `prisma/migrations/20261029000000_personal_todos` extends existing personal tasks with groups, subtasks, versioned updates, soft deletion, idempotent batch receipts, and the todo AI-usage feature. It has been tested against the disposable local database only; this does **not** mean it was applied to QA or production. Apply reviewed migrations explicitly to the intended environment before deploying matching code. Existing mock-plan assignments remain unchanged.

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
| `/api/todos` | GET, POST | Paginated/filterable personal todos and aggregate counts/groups; create a dated todo |
| `/api/todos/:id` | PATCH, DELETE | Version-checked edits, completion/subtasks, restoration, or soft deletion to Trash |
| `/api/todos/groups` | GET, POST | List/create private reusable groups |
| `/api/todos/groups/:id` | PATCH, DELETE | Rename/delete a group while preserving its todos as Ungrouped |
| `/api/todos/apply` | POST | Atomically apply selected reviewed operations with ownership/version checks and an idempotency key |
| `/api/ai/todos` | POST | Ask for missing dates or generate bounded personal-todo proposals and before snapshots; never applies changes |
| `/api/ai/status` | GET | AI enabled flag, model, and today's request/token usage |
| `/api/ai/coach` | POST | Structured coach insight from aggregate context |
| `/api/ai/chat` | POST | Streamed NDJSON coach chat (`start`, `delta`, `done`, `error`) |
| `/api/ai/extract` | POST | Form-shaped draft from one pasted report; never writes |
| `/api/ai/settings` | GET, PUT, DELETE | Per-user provider/model/base URL and encrypted key; returns only a key hint |
| `/api/ai/models` | POST | Server-side catalog discovery from a draft provider/base URL/key; returns model IDs/names without saving |
| `/api/ai/test` | POST | With a JSON settings draft: one tiny completion to test before saving; with no request body: tests the resolved saved personal/server configuration. May incur a small provider charge; never saves |
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

### Personal-task calendar and queries

`GET /api/todos/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` returns `{ data: { from, to, days: { [date]: { pending, completed } } } }`. The inclusive range is limited to 42 days. Calendar counts aggregate all active records for the verified user, independently of list pagination and filters; Trash and undated records are excluded.

`GET /api/todos` additionally supports `completion=all|pending|completed`, `priority=all|high|normal|low`, `group=all|ungrouped|<group-id>`, `sort=priority|date|newest|title`, and `excludeDate=YYYY-MM-DD`. Existing defaults remain unchanged, and `view=completed` is supported. `counts.pending`, `counts.completed`, and `counts.overdue` are account-wide and ignore active list filters. Sorts apply within the UI's date/group buckets. Versioned writes continue through `/api/todos/[id]`; `/api/tasks` remains compatible. No new migration is needed for this UI and query overhaul.

The shell-scoped todo query cache deduplicates identical in-flight reads and invalidates lists, legacy task views, AI reference data, and calendar summaries after `ssc:todos-changed`. Study-plan progress is fetched separately. Browser verification without disposable session cookies must be reported as fixture-based rather than authenticated integration verification.
