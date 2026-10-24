# SSC Insight

A personal SSC CGL Tier 2 mock tracker. Opens directly to the dashboard, with no sign-in. Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn-style Radix components, Recharts, and Motion.

## Design

Warm cream paper, charcoal typography, Source Serif 4 headings, DM Sans controls, square panels, and terracotta actions. See [the design system](DESIGN.md) for tokens, components, and accessibility conventions, and [the product specification](PRODUCT.md) for behavior and analytics definitions.

The following preview uses illustrative test data; no sample records are included in the database or seeded by the app.

![SSC Insight desktop dashboard with illustrative subject performance data](docs/images/dashboard-desktop.jpg)

[View the mobile dashboard preview](docs/images/dashboard-mobile.jpg).

## Run locally

Use Node.js 22 or newer.

```powershell
npm ci
node scripts/setup-local-db.mjs
npm run dev
```

Open [localhost:3000](http://localhost:3000). The dev/build scripts use webpack because Turbopack's CSS subprocess crashes in this Windows environment.

The local database connection has been configured and verified against Firebase project `ssc-insight-ankit-20261020`, Enterprise database `insight`, Mumbai (`asia-south1`). No existing database configuration or unrelated collections were changed.

### Server credentials

The existing database has **MongoDB compatibility enabled and native Firestore access disabled**. The server uses the official MongoDB driver, TLS, load balancing, disabled retryable writes, and a pooled connection. A Firebase browser API key cannot authenticate this connection.

The local setup helper reuses your existing Firebase CLI sign-in. It creates an ignored `.local/google-credentials.json` and `.env.local`; it does not create an application user or change IAM permissions. These files contain credentials and must remain local. Run `firebase login --reauth` if the CLI session expires, remove the local credential file, then rerun the helper.

For another machine, copy `.env.example` to `.env.local` and supply Google Application Default Credentials with database access, or set a MongoDB SCRAM connection URI created through the Firebase console. On hosted infrastructure, use a service account/workload identity with the minimum database access needed. Do not deploy personal CLI credentials. The OIDC allowlist intentionally permits only the selected Firebase database host; update it if changing databases.

Reference: [Firebase connection documentation](https://firebase.google.com/docs/firestore/enterprise/connect).

```powershell
node scripts/check-db.mjs
```

## Using the tracker

- **Add mock:** choose full, subject, or sectional. Full mocks use Quant (30), Reasoning (30), English (45), and GA (25), for 390 marks. Optionally include Computer Knowledge (20 questions), scored separately; Computer can also be logged as a subject mock. Subject and sectional practice support custom question counts. Select Testbook, RBE, Oliveboard, Pundits, Test Ranking, or Others with a custom platform name.
- **Paste report:** paste result-page text with subject headings and score/question summaries. Review all extracted values, provide the missing name/platform/date, and save. Unknown layouts require manual correction; screenshots and AI extraction are not supported.
- **Scoring and time:** +3 correct, −1 incorrect, updated live from the question counts. Subject scores and overall time are read-only. Each subject has separate hour/minute/second blocks; unfilled blocks become `00`. Overall time sums all included subjects, including Computer. New and edited form entries recalculate scores/time; legacy override fields remain supported for older records and backups.
- **Dates:** enter only the completion date. The server-compatible timestamp represents midnight IST; dashboard dates and date filters also use IST. Existing records need no migration.
- **History:** open any result for the subject table, notes, editing, comparison, or confirmed deletion.
- **Compare:** select two to four mocks. Score percentages permit comparison across different question counts; raw score deltas appear only when maximum marks match.
- **Settings:** set an optional full-mock target; download JSON backups or per-subject CSV. JSON restore previews duplicates, adds new records, and preserves existing ones. Duplicate detection uses normalized mock name/platform, completion timestamp, and mock type.

No sample attempts are seeded. Test-only attempts created for verification are removed afterward.

### Analytics definitions

The default summary/history view shows full mocks across all dates. Subject performance, subject averages and subject accuracy/time charts combine each subject’s rows from **all mock types**, regardless of the summary’s mock-type/subject filters. Date, platform and search filters still apply. Choose a subject in the performance chart; missing subjects do not add zero-score points. Subject scores use percentages to compare different question counts, and their rolling average uses the last five subject results. Section I combines Quant + Reasoning (180 standard marks); Section II combines English + General Awareness (210 standard marks).

Full-mock averages and personal bests only include full mocks; Computer never contributes to those metrics. The overall accuracy is weighted: total correct / total attempted, not an average of percentages. Subject score percentages are averaged per included subject result. Unknown metrics show a dash; unknown time is not treated as zero. Recent improvement requires ten attempts sharing subject IDs and question counts, and compares the latest five with the preceding five.

## API and storage

All database access stays on the server. The dedicated collections are `sscMockAttempts` and `sscTrackerSettings`. Each mock includes embedded subject rows, optional reported score/time, rank/percentile, notes, import source, schema version, and creation/update timestamps. ID values are UUID strings.

| Endpoint                 | Methods          | Purpose                                  |
| ------------------------ | ---------------- | ---------------------------------------- |
| `/api/mock-attempts`     | GET, POST        | Filter records; add a validated attempt  |
| `/api/mock-attempts/:id` | GET, PUT, DELETE | Read, replace editable fields, or delete |
| `/api/analytics`         | GET              | Statistics for matching records          |
| `/api/settings`          | GET, PUT         | Optional `targetScore` (0–390 or null)   |
| `/api/backup`            | GET, POST        | JSON/CSV export; preview/restore JSON    |

List and analytics queries accept `type`, `subject`, `platform`, `from`, `to`, and `search`. JSON responses use `{data}` or `{error: {code, message}}`. Backup GET returns a downloadable `{schemaVersion: 1, exportedAt, attempts}` document; `?format=csv` exports CSV. Restore POST accepts `{schemaVersion: 1, attempts, preview: true|false}`; preview defaults to true. DELETE requires an empty JSON object body. Request bodies are limited to 64 KiB, or 2 MiB for backup import (maximum 2,000 attempts).

Database aggregation handles filtering/sorting; domain calculations run on the server. The application loads all matching records for complete personal analytics; it is intended for a personal tracker, not a multi-user high-volume reporting system.

This is intentionally a **shared, unauthenticated** workspace: anyone who can reach the application can read, edit, export, or delete its records. Same-origin checks and input validation are not ownership controls. Public deployment was not part of this build.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

With the development server running, the integration script checks actual Firebase writes, edits, analytics, exports, restore, validation, and origin enforcement. It temporarily retains two clearly labeled QA attempts for browser inspection. Always clean them up when finished:

```powershell
node scripts/integration-check.mjs
node scripts/integration-check.mjs --cleanup
```

Focused tests cover the supplied 245/390 report, 90 correct / 25 incorrect / 15 skipped, 78.26% accuracy, 1:31:17 time, zero attempts, negative scores, overrides, custom counts, Computer exclusion, weighted accuracy, IST boundaries, duplicate matching, malformed reports, request limits, and recoverable database errors.
