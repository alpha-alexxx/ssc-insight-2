"use client";
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  todoCalendarQueryOptions,
  todoKeys,
  todoListQueryOptions,
  todoTasksQueryOptions,
  type CalendarRange,
  type TodoListParams,
} from "@/lib/queries/todos";

/**
 * Personal-tasks data layer, on TanStack Query.
 *
 * This replaces the bespoke shell-lifetime Map cache: keys are structured
 * (["todos", scope, params]) so mutations invalidate by prefix, requests
 * carry AbortSignals, identical param sets deduplicate, and the QueryClient
 * garbage-collects entries five minutes after their last observer instead
 * of an LRU cap. The old `ssc:todos-changed` broadcast maps to
 * `invalidateQueries({ queryKey: todoKeys.all })` — it refetches exactly
 * the mounted (active) queries, which is the fan-out the event produced.
 *
 * Result shapes ({data, error, loading, refresh}) match the previous hooks
 * so view code is unchanged; `loading` is true only before the first data
 * arrives, and `refresh` revalidates one key.
 */

/** The query-string part of GET /api/todos (everything after "?"). */
export function useTodoList<T>(query: string) {
  const queryClient = useQueryClient();
  // The params object IS the cache key: identical param sets deduplicate,
  // and invalidation can target one list or the whole todos family.
  const params = Object.fromEntries(
    new URLSearchParams(query),
  ) as TodoListParams;
  const result = useQuery(todoListQueryOptions<T>(params));
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: todoKeys.list(params) }),
    [queryClient, params],
  );
  return {
    data: result.data,
    error: result.error?.message ?? "",
    loading: result.isPending,
    refresh,
  };
}

/** GET /api/tasks — the planner's full personal-task list. */
export function useTodoTasks() {
  const queryClient = useQueryClient();
  const result = useQuery(todoTasksQueryOptions);
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: todoKeys.tasks() }),
    [queryClient],
  );
  return {
    data: result.data,
    error: result.error?.message ?? "",
    loading: result.isPending,
    refresh,
  };
}

/** GET /api/todos/calendar — per-day pending/completed counts for a range. */
export function useTodoCalendar<T>(range: CalendarRange) {
  const queryClient = useQueryClient();
  const result = useQuery(todoCalendarQueryOptions<T>(range));
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: todoKeys.calendar(range) }),
    [queryClient, range],
  );
  return {
    data: result.data,
    error: result.error?.message ?? "",
    loading: result.isPending,
    refresh,
  };
}

/**
 * Todo writes: same (path, method, body) call signature as before, but the
 * post-success invalidation is a scoped cache operation instead of a window
 * event. Every mounted todos query refetches; unmounted keys turn stale.
 */
export function useTodoMutations() {
  const queryClient = useQueryClient();
  const mutateTodoRequest = useCallback(
    async <T = unknown,>(
      path: string,
      method: string,
      body?: unknown,
    ): Promise<T> => {
      const result = await api<T>(path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: todoKeys.all });
      return result;
    },
    [queryClient],
  );
  return { mutateTodoRequest };
}

/** Invalidate the whole todos family — the direct replacement for firing
 * `ssc:todos-changed` (conflict resolution, AI apply, retry buttons). */
export function useInvalidateTodos() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
    [queryClient],
  );
}
