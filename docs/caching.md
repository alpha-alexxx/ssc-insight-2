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
| Client `fetch(..., { cache: "no-store" })` | `api()` in `src/lib/api-client.ts` | The workspace always fetches fresh at the HTTP layer so post-mutation refreshes are correct. |
| TanStack Query cache (in-memory) | `src/lib/query-client.ts`, mounted by `components/query-provider.tsx` | The client-side reuse layer: dedupes identical requests, caches per resource with per-resource `staleTime`, aborts superseded requests, and garbage-collects unused entries. Never persisted; dies with the workspace session. |
| React request memoization | automatic (Next.js) | Deduplicates identical reads within one server request. |
| URL state mirror (`src/lib/filters-url.ts`) | workspace shell | Not a cache: filters/scope are mirrored to the address bar with `history.replaceState` so shared links reload the same view. No RSC round-trip per keystroke. |

## Cache-policy matrix

| Data source | Scope | Change frequency | Policy | Invalidated by | Consistency notes |
| --- | --- | --- | --- | --- | --- |
| Mock attempts (list, detail) | per-user | on user mutation | HTTP `private, max-age=0, swr=2`; client fetches `no-store` | n/a (client never reuses) | Mutations invalidate the `["mock-attempts"]` key family in the client query cache; no stale window at the HTTP layer. |
| Analytics projections (`/api/analytics`) | per-user | on attempts change | HTTP `private, max-age=0, swr=5`; client `no-store` | n/a | Derived server-side per request; never persisted. |
| TrackerSettings (target) | per-user | explicit user action | Server LRU 60 s TTL, write-through; HTTP `private, max-age=5, swr=30` | `saveSettings` write-through; `invalidateSettings()` for out-of-band writes (backup import) | A second tab can lag up to 60 s behind a target change; acceptable for a single-user preference. Per-process cache — multi-instance deployments would need shared storage (documented in `cache.ts`). |
| AI status (`/api/ai/status`) | per-user (quota usage) | per AI request | `private, no-store`; client loads on mount and after each AI call | refreshed after coach/chat/extract calls | Quota display may lag a request by one refresh; deliberate. |
| AI coach / chat / extract | per-user | never cached | `private, no-store` (chat is an NDJSON stream) | — | Read-only subsystem; nothing persisted. |
| Backup export (`GET /api/backup`) | per-user | on attempts change | raw file response, no-store | — | The one envelope exception: returns a downloadable file. |
| Health (`/api/health`) | public | constant | not cached by the app; probe freshness controlled by the prober | — | Rate-limit-exempt infrastructure endpoint. |
| Landing `/` (the only sign-in surface), maintenance | public / auth-adjacent | — | `force-dynamic` server pages; `requireUser()` decides the redirect | — | No caching: an anonymous/signed-in flip must render immediately. `/` also reads `?error` for its failure toast, so a cached document would show a stale or missing message. |

## Client query cache (TanStack Query, 2026-10-31)

The HTTP layer stays `no-store`; reuse inside the workspace session now comes
from the in-memory query cache. Keys are hierarchical factories in
`src/lib/queries/*`; mutations invalidate by key prefix, and `invalidateQueries`
refetches only mounted (active) observers — the same fan-out the old
`ssc:todos-changed` broadcast produced.

| Query key | staleTime | Revalidated by | Notes |
| --- | --- | --- | --- |
| `["settings","current"]` | 10 min | write-through on save; invalidate on backup import | The target changes only through explicit user actions. |
| `["plan","current"]` | 10 min | optimistic `onMutate` patch; invalidate on failure and backup import | One entry; calendar/day/dashboard all read it. |
| `["mock-attempts","full"]` | 30 s (default) | attempt mutations (`attemptKeys.all`) | Unfiltered lookup list for joins/duplicate checks. |
| `["mock-attempts","list",params]` | 30 s (default) | attempt mutations | `keepPreviousData` holds the previous page while filters/page change. |
| `["mock-attempts","detail",id]` | 30 s (default) | attempt mutations; `removeQueries` on delete | |
| `["analytics","view",scope,filters]` | 30 s (default) | attempt mutations | Debounced 350 ms behind the filters; `keepPreviousData`. |
| `["todos","tasks"|"list",params]` / `["todos","calendar",range]` | 30 s (default) | every todo mutation invalidates `["todos"]` | Only active observers refetch (the old event fan-out). |
| `["ai","status"]` | 60 s | invalidated after coach/chat completion | A failure keeps status `null` (AI reads as disabled) — soft-fail. |
| `["search",q,limit]` (infinite) | 30 s | — | Normalized query is the key; cursor pages accumulate. |

Defaults for everything else: `staleTime: 30s`, `gcTime: 5min`,
`refetchOnWindowFocus: false`, one retry that skips 401/403/404/413/415/422 and
aborted requests, and a 429 `Retry-After`-aware `retryDelay`. **Never persist
the query cache** — no storage plugins; the cache dies with the workspace
session (unmount on logout) and `queryClient.clear()` on `ssc:session-ended`.

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
