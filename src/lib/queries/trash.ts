import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { analyticsKeys } from "./analytics";
import { attemptKeys } from "./attempts";
import { examsKeys } from "./exams";
import { planKeys } from "./plan";
import { todoKeys } from "./todos";
import {
  trashQuerySchema,
  type TrashDetail,
  type TrashKind,
  type TrashOutcome,
  type TrashPage,
} from "@/lib/trash-core";

/**
 * Trash domain keys, query options and writes.
 *
 * Key shape: ["trash", scope, …] — the paged list under one scope per filter
 * combination, one detail entry per (kind, id). A successful restore, purge
 * or empty is not a local edit: it changes what every other surface shows,
 * so the invalidation reaches the trash list plus every module the record can
 * reappear in (attempts, analytics, todos, plan, the exam catalog).
 */

export const trashKeys = {
  all: ["trash"] as const,
  lists: () => [...trashKeys.all, "list"] as const,
  list: (params: Partial<Record<string, string | number>>) =>
    [...trashKeys.lists(), params] as const,
  detail: (kind: TrashKind, id: string) =>
    [...trashKeys.all, "detail", kind, id] as const,
};

/** The params actually sent — defaults are stripped so the cache key mirrors the request. */
export function trashListParams(query: {
  kind: string;
  q: string;
  status: string;
  sort: string;
  page: number;
}): Record<string, string | number> {
  const parsed = trashQuerySchema.parse(query);
  const params: Record<string, string | number> = {
    page: parsed.page,
    limit: parsed.limit,
  };
  if (parsed.kind !== "all") params.kind = parsed.kind;
  if (parsed.q) params.q = parsed.q;
  if (parsed.status !== "all") params.status = parsed.status;
  if (parsed.sort !== "recent") params.sort = parsed.sort;
  return params;
}

function serialize(params: Record<string, string | number>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    search.set(key, String(value));
  return search.toString();
}

export function trashListQueryOptions(
  params: Record<string, string | number>,
) {
  return queryOptions({
    queryKey: trashKeys.list(params),
    // Paging and typing keep the current rows on screen instead of flashing
    // an empty list — the same rule the history list follows.
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      api<TrashPage>(`/api/trash?${serialize(params)}`, { signal }),
  });
}

export function trashDetailQueryOptions(kind: TrashKind | null, id: string) {
  return queryOptions({
    queryKey: trashKeys.detail(kind ?? "attempt", id),
    enabled: !!kind && !!id,
    queryFn: ({ signal }) =>
      api<TrashDetail>(`/api/trash/${kind}/${id}`, { signal }),
  });
}

export async function restoreTrashRequest(
  items: { kind: TrashKind; id: string }[],
) {
  return api<TrashOutcome>("/api/trash/restore", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function purgeTrashRequest(
  items: { kind: TrashKind; id: string }[],
) {
  return api<TrashOutcome>("/api/trash/purge", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function emptyTrashRequest() {
  return api<{
    attempts: number;
    tasks: number;
    exams: number;
    groups: number;
    total: number;
  }>("/api/trash/empty", {
    method: "POST",
    body: JSON.stringify({ confirm: true }),
  });
}

/**
 * Every cache a trash mutation can change. Restoring a mock moves it back into
 * analytics, history and the plan; restoring an exam changes the catalog; a
 * purge can ungroup live tasks. The list is narrow on purpose — these are the
 * five families the app owns, and a bulk action already costs a round trip.
 */
export const TRASH_INVALIDATE_SCOPES = [
  trashKeys.all,
  attemptKeys.all,
  analyticsKeys.all,
  todoKeys.all,
  planKeys.all,
  examsKeys.all,
] as const;
