# Private accounts release

The application now requires Google sign-in. Every data route independently verifies Neon Auth, bypassing the SDK's five-minute cookie cache so revoked sessions cannot authorize requests. Missing/expired sessions return `401 UNAUTHENTICATED`; verification failures return sanitized `503 AUTH_UNAVAILABLE`. Personalized responses and downloads are `private, no-store`.

## Ownership

`MockAttempt.userId` is required and indexed with completion date, platform, and mock type. `TrackerSettings.userId` is the primary key. Subject results inherit ownership from their parent. Repository functions require a session-derived owner argument; body/query/import ownership fields are ignored and never mapped. Foreign and missing IDs return matching 404 responses. Version-1 backups remain portable and import into the current user's account with new record IDs.

The explicit migration targets only `ssc_insight`. It reads the managed Auth user table to find exactly one email-verified `ankitinter9@gmail.com` identity; no Auth schema or user records are changed. The approved two shared mocks and original target setting are assigned to that stable ID. It never claims records for the first visitor. Production release preflight requires exactly two mocks; SQL also aborts on any unexpected nonzero count. Fresh empty installations can migrate without the named account.

## Verification

- Isolated branch: `ssc-private-qa-20261024` (`br-curly-wave-b4h76c9h`), expires October 26.
- Migration: two original mocks and five subject rows preserved exactly.
- 31 unit tests, lint, TypeScript and production build pass.
- `scripts/verify-neon.mjs`: authenticated CRUD, ordered subject replacement, 245/390 sample, weighted accuracy, Computer exclusion, cross-type analytics, IST/literal filters, CSV/JSON backup round trip, duplicates, settings, safe errors and anonymous redirect.
- `scripts/verify-ownership.mjs`: two real Neon Auth sessions against the same isolated database; foreign-ID GET/PUT/DELETE, forged ownership, per-user analytics/settings/exports, duplicate preview/import, all anonymous data APIs, sign-in/page redirects, and revoked-token rejection.
- Test accounts and records exist only on the expiring QA branch; only explicitly marked disposable records are removed. No demonstration data is seeded in production.

## Controlled release and rollback

Before applying production SQL, save a private ignored data backup, verify the owner and exactly two shared mocks, and preserve the previous commit/configuration. Build/deploy the guarded app, then apply the reviewed migration explicitly and move the existing `sscinsight-lovat.vercel.app` alias. Never migrate during arbitrary builds.

Vercel Standard Protection is enabled (`all_except_custom_domains`); the previous generated deployment URL was checked anonymously and redirects to Vercel SSO. Ensure every public project alias points to the private app before declaring release complete. Do not expose an old unscoped deployment.

The previous public commit is `c9e9592`. The ignored `.local/private-production-backup.json` preserves pre-migration records/settings and the verified owner ID. Keep it local. Rolling the application alone back to the public revision is unsafe and incompatible with the new settings/required owner schema. Prefer a forward fix while retaining the private guard, or restore a backup into an isolated branch for investigation. Any destructive production restore needs a new reviewed release and must preserve later private-account records. Firebase remains untouched.
