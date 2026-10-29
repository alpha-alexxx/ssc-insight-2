# Caching and revalidation policy

SSC Insight is a single-user-per-account tracker where every workspace payload
is personalized. The caching posture is therefore **conservative by default**:
nothing user-specific is ever shared across users, and anything that must
reflect a mutation immediately is not cached at all. This document is the
authoritative matrix (Phase 8 of the 2026-10 architecture overhaul); update it
whenever a data source's policy changes.

## Mechanisms in use (Next.js 16, Cache Components NOT enabled)

| Mechanism | Where | Role |
| --- | --- | --- |
| `Cache-Control: private, no-store` | every `/api/*` response by default (`ok()` in `src/lib/api.ts`) | Baseline for personalized data: no browser/proxy storage. |
| `Cache-Control: private, max-age=N, stale-while-revalidate=M` | opt-in per GET via `okCached()` (`cache:` option in `defineRoute` results) | Allows non-app consumers (QA scripts, future prefetch) to reuse/stale-serve private responses briefly. |
| In-process LRU (`src/lib/cache.ts`) | `getSettings`/`saveSettings` in `src/lib/repository.ts` | Saves one DB roundtrip per settings read; 60 s TTL, write-through on save. |
| Client `fetch(..., { cache: "no-store" })` | `api()` in `src/lib/api-client.ts` | The workspace always fetches fresh so post-mutation refreshes are correct. |
| React request memoization | automatic (Next.js) | Deduplicates identical reads within one server request. |
| URL state mirror (`src/lib/filters-url.ts`) | workspace shell | Not a cache: filters/scope are mirrored to the address bar with `history.replaceState` so shared links reload the same view. No RSC round-trip per keystroke. |

## Cache-policy matrix

| Data source | Scope | Change frequency | Policy | Invalidated by | Consistency notes |
| --- | --- | --- | --- | --- | --- |
| Mock attempts (list, detail) | per-user | on user mutation | HTTP `private, max-age=0, swr=2`; client fetches `no-store` | n/a (client never reuses) | Mutations trigger a full client `refresh()`; no stale window in the app itself. |
| Analytics projections (`/api/analytics`) | per-user | on attempts change | HTTP `private, max-age=0, swr=5`; client `no-store` | n/a | Derived server-side per request; never persisted. |
| TrackerSettings (target) | per-user | explicit user action | Server LRU 60 s TTL, write-through; HTTP `private, max-age=5, swr=30` | `saveSettings` write-through; `invalidateSettings()` for out-of-band writes (backup import) | A second tab can lag up to 60 s behind a target change; acceptable for a single-user preference. Per-process cache — multi-instance deployments would need shared storage (documented in `cache.ts`). |
| AI status (`/api/ai/status`) | per-user (quota usage) | per AI request | `private, no-store`; client loads on mount and after each AI call | refreshed after coach/chat/extract calls | Quota display may lag a request by one refresh; deliberate. |
| AI coach / chat / extract | per-user | never cached | `private, no-store` (chat is an NDJSON stream) | — | Read-only subsystem; nothing persisted. |
| Backup export (`GET /api/backup`) | per-user | on attempts change | raw file response, no-store | — | The one envelope exception: returns a downloadable file. |
| Health (`/api/health`) | public | constant | not cached by the app; probe freshness controlled by the prober | — | Rate-limit-exempt infrastructure endpoint. |
| Landing `/` (the only sign-in surface), maintenance | public / auth-adjacent | — | `force-dynamic` server pages; `requireUser()` decides the redirect | — | No caching: an anonymous/signed-in flip must render immediately. `/` also reads `?error` for its failure toast, so a cached document would show a stale or missing message. |

## Deliberate decisions

1. **The app client does not consume the SWR windows.** `api()` sends
   `cache: "no-store"`, so the `max-age`/`stale-while-revalidate` headers on
   GET routes exist for non-app consumers only. Raising them would speed up
   scripts but risks post-mutation staleness inside the workspace; the
   tracker's charts must reflect the last save immediately, so the
   correctness-first choice stays.
2. **No shared/CDN caching anywhere.** All responses are `private`. There is
   no `revalidate`/Data Cache usage, no `unstable_cache`, no cache tags —
   adding any would require a documented per-source policy change here first.
3. **Server-side caching is limited to the settings LRU** because it is the
   only read-hot, rarely-changing, write-through-invalidatable store. Attempt
   data is never cached server-side: it changes through user mutations that
   must be visible on the next request.
4. **Eventual consistency windows**, explicitly accepted: settings LRU ≤ 60 s
   (per process), AI status until the next refresh, SWR windows for non-app
   consumers only.
