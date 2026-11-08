
# 📜 SSC Insight

> A warm-paper SSC CGL Tier 2 mock tracker built with modern web technologies. Opens to a public landing page; signed-in visitors go straight to their private dashboard.

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=for-the-badge&logo=postgresql)](https://neon.tech/)

[![Live Demo](https://img.shields.io/badge/Live_Demo-sscinsight--lovat.vercel.app-000000?style=for-the-badge&logo=vercel)](https://sscinsight-lovat.vercel.app/)

</div>

---

## 📑 Table of Contents
- [🎨 Design Philosophy](#-design-philosophy)
- [🗄️ Database & Authentication](#️-database--authentication)
- [💻 Run Locally](#-run-locally)
- [🔐 Environment Variables](#-environment-variables)
- [🗜️ Migrations](#️-migrations)
- [🔑 Google Sign-In Setup](#-google-sign-in-setup)
- [🚀 Vercel Deployment](#-vercel-deployment)
- [📊 Tracker Behavior](#-tracker-behavior)
- [🤖 AI Coach & Assisted Entry](#-ai-coach--assisted-entry)
- [✅ Personal Todos](#-personal-todos)
- [💾 Backup & Account Transfer](#-backup--account-transfer)
- [⚙️ Client Data Layer](#️-client-data-layer)
- [🌐 API Reference](#-api-reference)
- [🛡️ Verification & Testing](#️-verification--testing)
- [🤖 Agent Tooling](#-agent-tooling)

---

## 🎨 Design Philosophy
- **Aesthetic**: Cream paper, charcoal ink, and terracotta actions.
- **Typography**: Source Serif 4 for headings, DM Sans for controls.
- **Layout**: Square panels, clean borders, and mobile-first responsive previews.
- **Documentation**: See `DESIGN.md` and `PRODUCT.md` for detailed guidelines.

> [!NOTE]
> Mobile previews in the repository use illustrative data. The application does **not** seed mock attempts by default.

---

## 🗄️ Database & Authentication
The database is **PostgreSQL on Neon**, accessed exclusively through Prisma and the Neon serverless adapter in Next.js Node route handlers. 

- **Application Schema**: `ssc_insight` (contains `MockAttempt`, ordered `SubjectResult` rows, and per-user `TrackerSettings`).
- **Auth Schema**: Managed entirely by Neon. Application migrations never touch the Auth schema.

> [!WARNING]
> The private-account migration assigns existing shared mocks to a verified admin identity. Firebase records remain untouched and are not copied automatically. Legacy JSON backups (v1–v4) remain importable; new exports use format v5.

---

## 💻 Run Locally
Requires **Node.js 22.20+** or **Node.js 24**. Prisma Client generates automatically on installation.

```powershell
# 1. Install dependencies
npm ci

# 2. Authenticate and link to Neon
neon login
neon link --org-id <YOUR_ORG_ID> --project-id <YOUR_PROJECT_ID> --branch production -y

# 3. Deploy local services and pull env vars
neon deploy

# 4. Start development server
npm run dev
```

> [!SECURITY]
> Open `http://localhost:3000` in your browser. While the dev server can bind to `0.0.0.0` for network access, **always use `http://localhost:3000`** (or your machine's specific LAN address) to ensure OAuth callbacks and redirects preserve the correct `Host` header and normalize safely. Avoid exposing the dev server to untrusted networks.

---

## 🔐 Environment Variables
Copy `.env.example` or use Neon's environment pull. **Never commit real values to version control.**

| Variable | Purpose |
| :--- | :--- |
| `DATABASE_URL` | Pooled PostgreSQL runtime connection. |
| `DATABASE_URL_UNPOOLED` | Direct connection used *only* by Prisma migration commands. |
| `NEON_AUTH_BASE_URL` | Managed Auth URL ending in `/auth`. |
| `NEON_AUTH_COOKIE_SECRET` | Cryptographically random secret (≥32 characters). |
| `GOOGLE_AUTH_ENABLED` | Set to `true` after configuring a production Google OAuth client. |
| `AI_BASE_URL` | Optional OpenAI-compatible base URL (defaults to `https://api.openai.com/v1`). |
| `AI_API_KEY` | Server-only provider key. Blank disables AI. |
| `AI_MODEL` | Provider model ID. Required to enable AI. |
| `AI_JSON_MODE` | `true` by default. Set `false` if the provider rejects `response_format`. |
| `AI_DAILY_REQUEST_LIMIT` | AI requests per user per IST day (default: `30`). |
| `AI_DAILY_TOKEN_LIMIT` | Charged tokens per user per IST day (default: `300000`). |
| `AI_MAX_OUTPUT_TOKENS` | Per-call output cap (default: `1200`). |
| `AI_TIMEOUT_MS` | Provider timeout below the 60-second route limit (default: `45000`). |
| `AI_CREDENTIAL_SECRET` | Encrypts user-entered API keys (AES-256-GCM). 64 hex chars or ≥32-char passphrase. |
| `CRON_SECRET` | Bearer token for `/api/cron/trash-cleanup`. Generate via `openssl rand -hex 32`. |

> [!TIP]
> Keep every variable server-side. None require a `NEXT_PUBLIC_` prefix. Missing Auth configuration fails closed; private records are never returned anonymously.

---

## 🗜️ Migrations
```powershell
npm run db:generate
npm run db:migrate
```
`prisma.config.ts` loads Next.js environment files and uses the unpooled connection. 

> [!CAUTION]
> - Do **not** run `prisma migrate reset`.
> - Do **not** target Neon's managed Auth schema.
> - Test new SQL migrations on an expiring branch first.
> - The Trash migration (`20261103000000_trash`) is **additive but order-sensitive**. Apply it *before* deploying the matching app revision to prevent query failures or accidental hard-deletes during rollbacks.

---

## 🔑 Google Sign-In Setup
Use Neon Auth's Google provider with your own Google OAuth **Web application** credentials in production.

### OAuth Setup Checklist
- [ ] Register `{NEON_AUTH_BASE_URL}/callback/google` (no trailing slash) as an **Authorized redirect URI** in Google Cloud Console.
- [ ] Add **Authorized JavaScript origins**: App origin (`https://sscinsight-lovat.vercel.app`, `http://localhost:3000`) + Auth base URL origin.
- [ ] Add Neon Auth **trusted domains** for every origin used as a `callbackURL`.
- [ ] Configure credentials per branch via Neon Console, CLI (`neon neon-auth oauth-provider add`), or the local helper:
  ```powershell
  .\scripts\configure-google-oauth.ps1
  ```
- [ ] Configure Google consent screen (app name, support email, authorized domain). *Note: "Testing" status requires listed test users.*
- [ ] Set `GOOGLE_AUTH_ENABLED=true` and rebuild/redeploy.

---

## 🚀 Vercel Deployment
Use the existing `sscinsight` project. Configure runtime database and Auth variables in the Production environment, marking sensitive values appropriately. 
- Migrations use the direct URL locally or in controlled release jobs.
- Production runtime only needs the pooled URL.
- `.gitignore` and `.vercelignore` exclude local credentials, environment files, and temporary review data.

---

## 📊 Tracker Behavior
- **Exam Patterns**: Transcribed from official ssc.gov.in notices (CGL, CHSL, MTS, CPO, GD Constable, Stenographer, Selection Post, + custom exams). Marking is per **TIER**, not global.
- **Scoring**: Live calculation at the tier's own marking (e.g., CGL Tier 2: +3/−1). Three time blocks sum to overall time.
- **Dashboard Scopes**: 
  - *Full Mocks*: Saved full mocks only.
  - *Subject Wise*: Every subject result from full, sectional, and subject mocks.
  - *Sectional Wise*: Explicit sectionals + Section I/II derived from full mocks.
  - *All Mocks*: Each saved attempt exactly once (no double-counting).
- **Targets**: Configured under Settings → Targets. Includes percentile goals (reported, not computed), marks targets per tier, and structure defaults.
- **Accuracy**: Total correct ÷ total attempted. Full averages exclude Computer.

---

## 🤖 AI Coach & Assisted Entry
AI is **optional** and **read-only** for coaching/extraction. It cannot save, edit, delete, or schedule a mock without explicit user review.

### Features
- **Coach Card**: Manual "Generate insight" action returning structured read of saved data. Never runs automatically.
- **Chat Drawer**: Follow-up questions stream one answer at a time. History is ephemeral (in-memory only).
- **AI-Assisted Paste**: Sends up to 20,000 characters to the server for editable extraction review. Required blockers must be resolved before values are copied to the form.
- **Todo Assistance**: Proposes changes to personal todos. Apply is transactional, version-checked, user-scoped, and idempotent (max 25 operations/batch).

### Security & Privacy
- **Endpoint Safety**: The server refuses loopback, private (RFC1918), link-local, cloud-metadata (`169.254.169.254`), CGNAT, multicast, and reserved addresses. **DNS-rebinding mitigation**: The server re-resolves the hostname immediately before every provider call and rejects domains with suspiciously low TTLs. HTTP is refused except for explicitly opted-in local providers.
- **Data Sent**: Aggregate analytics, subject/section profile, target progress, and latest 20 full mocks. **Mock notes, email, user ID, auth data, and per-attempt detail outside the latest 20 are NEVER sent.**
- **Key Storage**: User-entered keys are encrypted with AES-256-GCM under `AI_CREDENTIAL_SECRET`. Plaintext is never returned to the browser, logged, or exported.
- **Usage Limits**: Enforced via `AiUsage` table per IST day. Over-limit responses return `429 AI_QUOTA_EXCEEDED`.

---

## ✅ Personal Todos
- **My Tasks**: Full personal-task workspace. Combines today's structured assignments and personal tasks.
- **Groups & Subtasks**: Reusable across dates. Parent checkbox actions complete/reopen all subtasks together.
- **Trash**: Soft deletion with a **15-day recovery window** (`TRASH_RETENTION_DAYS`). Restoring preserves original state/date. Trash is excluded from active counts and AI context.
- **Migration**: `20261029000000_personal_todos` extends tasks with groups, subtasks, versioned updates, and soft deletion. Apply explicitly to the intended environment before deploying matching code.

---

## 💾 Backup & Account Transfer
- **JSON Backup (v5)**: Portable, restorable file containing all mocks, results, settings, custom exams, and planner work. Contains **no** email, `userId`, or auth credentials.
- **CSV**: Read-only per-subject export for spreadsheets (cannot be imported).
- **Import Modes**: 
  - *Merge*: Preserves existing records, skips exact duplicates.
  - *Replace*: Deletes all current mocks and mirrors the backup (requires explicit safety-backup download and confirmation).
- **Limits**: 4 MB (≈10,000 attempts) to stay within deployment request-body limits.

---

## ⚙️ Client Data Layer
- **TanStack Query**: All server state goes through a single in-memory cache per session (nothing persisted to storage). `stale-while-revalidate` headers remain for non-app consumers, but the client always fetches `no-store` at the HTTP layer.
- **Zustand**: A small store (`src/stores/ui-store.ts`) carries only global UI state (⌘K palette, AI drawer, planner date, quick-add handoff).
- **Architecture**: Query keys and caching policies live in `src/lib/queries/` (see `docs/caching.md` and `AGENTS.md`).

---

## 🌐 API Reference
Routes retain `{data}` / `{error: {code, message}}` response envelopes, validation, same-origin writes, and request-size limits.

| Endpoint | Methods | Purpose |
| :--- | :---: | :--- |
| `/api/mock-attempts` | GET, POST | Filter/list; add |
| `/api/mock-attempts/:id` | GET, PUT, DELETE | Inspect; edit; confirmed deletion |
| `/api/analytics` | GET | Scope projection, radar profile, target snapshots |
| `/api/settings` | GET, PUT, PATCH | Workspace scope and target edits |
| `/api/backup` | GET, POST | GET v5 JSON/CSV; POST merge/replace preview and commit |
| `/api/todos` | GET, POST | Paginated/filterable personal todos; create dated todo |
| `/api/todos/:id` | PATCH, DELETE | Version-checked edits, completion, or soft deletion |
| `/api/ai/coach` | POST | Structured coach insight from aggregate context |
| `/api/ai/extract` | POST | Form-shaped draft from pasted report (never writes) |
| `/api/trash` | GET | Owner-scoped deleted records with search/filters |
| `/api/trash/restore` | POST | Restore selected records (409 if past 15-day window) |
| `/api/cron/trash-cleanup`| GET | Scheduled physical removal. Requires `Authorization: Bearer $CRON_SECRET` |

> [!IMPORTANT]
> **Trash & Retention**: Every read filters `deletedAt: null`. The 15-day window is enforced twice: `GET /api/trash` hides expired rows, and `POST /api/trash/restore` rejects them with `409`. The daily cron route only reclaims storage; a missed run costs disk space, never correctness.

---

## 🛡️ Verification & Testing
```powershell
npx next typegen
npm run typecheck
npm run lint
npm test
npm run build
npm run start
npm run verify:neon
```

### Verification Scripts
- `verify:neon`: Creates disposable mock records, verifies CRUD, analytics, filters, and anonymous redirects. Cleans up in `finally` block.
- `scripts/verify-ownership.mjs`: Tests isolation, forged ownership, cross-account merge, and revoked sessions (requires `TEST_SESSION_COOKIE` and `TEST_OTHER_SESSION_COOKIE`).
- `scripts/verify-trash.mjs`: Covers delete → hide → list → restore → purge lifecycle plus cleanup idempotency (requires `TEST_CRON_SECRET`).
- `scripts/verify-backup-transfer.mjs`: Guarded destructive replace check (requires `ALLOW_DESTRUCTIVE_REPLACE=1`).

> [!CAUTION]
> **None of these scripts may run against a production account.** They create and destroy records. Run them exclusively on an expiring Neon QA branch.

### Browser UI Checks
Driven via headless Chrome over CDP to report horizontal overflow, `prefers-reduced-motion` transitions, and keyboard focus rings.
```powershell
npm run dev
chrome --headless=new --remote-debugging-port=9222 --user-data-dir="$env:TEMP\dsh-cdp-profile" about:blank
node tools/ui-check.mjs --width 1440
node tools/ui-check.mjs --width 390 --height 844
```

---

## 🤖 Agent Tooling
The user-installed `neon-postgres` Codex plugin bundles the Neon skills and OAuth MCP endpoint (`https://mcp.neon.tech/mcp`). 
- Do not duplicate with separate skills/MCP entries.
- The CLI is preferred for this project's operations.
- The linked `.neon` file is local and git-ignored; `neon.ts` declares only the requested services.

---

<div align="center">
  <sub>Built with ❤️ for SSC aspirants. Maintain privacy, verify migrations, and deploy safely.</sub>
</div>
