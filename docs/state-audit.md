# Client State Architecture Audit — 2026-10-31

Scope: every client-side network call site, cache, and shared UI state owner in
the workspace. Purpose: baseline for the TanStack Query + Zustand architecture
migration. This document records what existed **before** the migration and the
roadmap that was executed.

## Baseline architecture

```
Browser hooks → api() (src/lib/api-client.ts) → /api routes → defineRoute
(src/lib/route-handler.ts: request-id → requireUser → rate limit) →
repository (src/lib/repository.ts) → Prisma + Neon adapter
```

- **No Server Actions.** Every mutation is a fetch to a JSON-envelope route.
- **Envelope** (`src/lib/api.ts`): success `{ data }`, error
  `{ error: { code, message } }`. SWR headers via `okCached` on read-heavy
  routes (analytics swr=5, attempts/search/detail swr=2, settings max-age=5
  swr=30, plan/tasks swr=5); everything else `private, no-store`.
- **Rate limits** (`src/lib/rate-limit.ts`): read bucket 120 (refill 2/s),
  write bucket 20 (refill 0.5/s) per user. `X-RateLimit-*` + `Retry-After` on
  every response. **The 4 AI streaming routes bypass `defineRoute` entirely**
  (`ai/chat`, `ai/coach`, `ai/extract`, `ai/status`) — protected only by the
  AI quota ledger (`AiUsage`); `/api/ai/status` has neither limiter nor quota.
- **Auth lifecycle:** `PrivateWorkspace` (keyed by `user.id`) guards the shell;
  `ssc:session-ended` (401) unmounts the workspace + redirects;
  `ssc:auth-unavailable` (503 `AUTH_UNAVAILABLE`) shows a guard screen.

### Call-site inventory (39 total)

| System | Sites | Files |
|---|---|---|
| TanStack Query (already) | 3 | `use-attempt-list.ts` (paged list `useQuery` + detail `useQueries`), `search/use-search.ts` (`useInfiniteQuery`) |
| Bespoke Map cache | 11 | `use-todos-data.tsx` cache consumed by `use-plan-data.ts`, `plan/personal-calendar.tsx`, `plan/personal-todos.tsx` (×3), `plan/plan-day-view.tsx`, `tasks/ai-composer.tsx`, `tasks/my-tasks-view.tsx` (×4) |
| useState + ref hooks | 12 | `use-workspace-data.ts` (analytics, attempts-all, settings ×2), `use-plan-data.ts` (plan GET + 4 progress POSTs + 3 task writes), `use-ai-workspace.ts` (status, coach) |
| Event-handler fetches | 9 | `mock-form.tsx` (×4), `ai-settings-form.tsx` (×5), `workspace-shell.tsx` (delete attempt, PUT settings), `use-backup-import.ts` (×2), `tasks/ai-composer.tsx` (×2) |
| Raw `fetch()` (bypass `api()`) | 4 | AI chat NDJSON stream (keep — streaming), backup blob download (keep), landing sheet status + extract (migrate to `api()`) |

## Findings

1. **Two caching systems in one tree.** The bespoke `useTodoQuery` Map cache
   (40-entry LRU, promise dedupe, revision counters instead of AbortSignal)
   runs beside TanStack Query under the same provider. Requests are never
   cancelled, only ignored; cached values never revalidate in the background.
2. **Duplicate requests.** `/api/settings` is fetched twice on shell mount
   (`use-workspace-data.ts` mount effect + `loadSettings` callable). The same
   todos endpoints are fetched under N distinct URL-string keys with no
   cross-key reuse.
3. **No request cancellation in the bespoke layer.** `useWorkspaceData` and
   `usePlanData` hand-roll requestId refs + AbortController; `useTodoQuery`
   only ignores stale responses. Superseded requests still consume the read
   bucket.
4. **429 exposure.** A todos mutation broadcasts `ssc:todos-changed`, clearing
   **all** cache entries and refetching every mounted key (~4–10 simultaneous
   GETs) against a 20/30s write bucket. No client backoff uses `Retry-After`.
5. **Envelope drift.** The 4 raw `fetch` sites re-implement the envelope and
   the two auth events; the landing sheet's status/extract calls silently
   swallow auth errors (no event dispatch). `api()`'s `response.json()` is
   unguarded — a non-JSON 500 (e.g. proxy HTML) throws a generic parse error.
6. **The shell is the de-facto UI store.** `workspace-shell.tsx` (1,186
   lines) owns ⌘K palette open, AI drawer open/tab, compare selection,
   editing/detail dialogs, planner date, add-prefill, busy flags — all as
   `useState`, threaded through props of memoized panels.
7. **Cross-component messaging by window events** (`ssc:todos-changed`,
   `ssc:tasks-quick-add`, `ssc:session-ended`, `ssc:auth-unavailable`) with 3
   separate emitters of the session events.
8. **Stale documentation.** AGENTS.md/CLAUDE.md still state the pre-query
   "no TanStack Query" decision while `use-attempt-list.ts` and
   `use-search.ts` already depend on it.
9. **Missing user-facing features the task anticipated:** question banks,
   notes/bookmarks pages, and a separate mock-test entity do not exist —
   subjects are a `SubjectId` enum, notes are fields on `MockAttempt`/plan
   tasks, and a mock test is a saved `MockAttempt`. Migration domains map to
   what exists (see roadmap).
10. **QueryClient config is inline** in `workspace-shell.tsx` with one global
    `staleTime: 30_000`, no error-type awareness, no devtools, and no
    cache-clear on session events (safe today only because the shell unmounts).

## Design decisions

- **In-memory only.** No `persistQueryClient`, no storage plugins. The
  workspace-scoped QueryClient dies with the shell on logout/account switch;
  `queryClient.clear()` on `ssc:session-ended` as defense in depth.
- **Client-only fetch model retained.** No dehydrate/HydrationBoundary: pages
  are client views under a `force-dynamic` auth-gated layout; nothing
  server-fetches per-user data, so there is nothing to hydrate and no risk of
  user data in RSC payloads or HTTP-shared caches.
- **Sidebar stays in shadcn `SidebarProvider`** (cookie-seeded server default,
  Radix-integrated). Zustand's footprint is the genuinely global shell state
  only: palette open, AI drawer open/tab, quick-add and planner-date handoffs.
- **AI chat streaming stays a raw fetch** with component-local state; it is a
  stream, not a cacheable resource. Only the drawer-open flag becomes global.
- **Invalidation granularity:** mutation hooks invalidate the narrowest key
  scope affected (`["todos"]`, `["plan"]`, `["analytics"]`,
  `["mock-attempts"]`…). `invalidateQueries` refetches only active observers,
  which matches today's mounted-key fan-out without broadening it.
- **`ApiError`** (status, code, message, retryAfterSeconds) becomes the single
  client error type; retry policy skips 401/403/404/422 and honors
  `Retry-After` on 429.

## Migration roadmap (executed order)

| # | Domain | Old system | New system | Risk |
|---|---|---|---|---|
| 0 | Tree hygiene | — | verify `npm run check` + tests, sync main | — |
| 1 | Audit doc | — | this file | — |
| 2 | Infrastructure | inline QueryClient | `lib/query-client.ts` + `components/query-provider.tsx` + dev-only devtools | low |
| 3 | API client + keys | `api()`, inline keys | `ApiError` in `api-client.ts`, `lib/queries/*` factories | low |
| 3a | Settings | useState | `useSettings`/`useUpdateTarget` (fixes double fetch) | low |
| 4 | Dashboard + attempts | `use-workspace-data.ts` fetch half | `useAnalytics`, `useAllAttempts`, `useDeleteAttempt` | medium |
| 5 | Plan | `use-plan-data.ts` | `usePlanQuery` + 4 optimistic mutations (onMutate snapshot rollback) | medium |
| 6 | Todos | `use-todos-data.tsx` (deleted) | `lib/queries/todos.ts` + `useTodoList`/`useTodoMutations` | high (11 keys, 13 event sites) |
| 7 | AI/backup/search | ad-hoc | `useAiStatus`, settings/backup mutations; search re-keyed | low |
| 8 | Zustand | shell useState + events | `stores/ui-store.ts` (no persistence) | medium |
| 9 | UX states | mixed | isPending/isPlaceholderData/isError driven | low |
| 10 | Verification | — | check + tests + browser checks + grep proofs | — |
| 11 | Docs + graphify | stale | AGENTS+CLAUDE, README, caching.md, `tools/graphify` | — |

## Standing gaps (out of scope, recorded)

- The 4 AI routes (`chat`, `coach`, `extract`, `status`) have no burst limiter;
  the client now dedupes/caches `/api/ai/status` (30s staleTime) but the
  server-side gap remains a known issue from the 2026-10-28 product scan.
- `ssc:session-ended` / `ssc:auth-unavailable` window events remain the
  auth-event channel (emitters: `api()`, `auth-control.tsx`, AI fetches,
  backup download); they are infrastructure, not state, and stay.
