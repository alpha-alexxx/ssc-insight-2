import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PersonalTaskView } from "@/lib/plan/view-model";

/**
 * Personal-tasks domain keys and query options.
 *
 * Key shape: ["todos", scope, …]. The three read shapes — the planner's
 * full task list (GET /api/tasks), the filtered/paged list views
 * (GET /api/todos?view=…), and the calendar range (GET /api/todos/calendar)
 * — each get their own scope so a mutation can invalidate `["todos"]` (all
 * mounted task data, matching the old event broadcast) or one exact key.
 */

/** Query-string parameters for GET /api/todos (view, date, search, page,
 * limit, completion, priority, group, sort). A plain record so the cache
 * key mirrors exactly what the server sees. */
export type TodoListParams = Record<string, string | number | undefined>;

export type CalendarRange = { from: string; to: string };

export const todoKeys = {
  all: ["todos"] as const,
  /** GET /api/tasks — the planner's full personal-task list. */
  tasks: () => [...todoKeys.all, "tasks"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (params: TodoListParams) => [...todoKeys.lists(), params] as const,
  calendar: (range: CalendarRange) =>
    [...todoKeys.all, "calendar", range] as const,
  groups: () => [...todoKeys.all, "groups"] as const,
};

function serialize(params: TodoListParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== "") search.set(key, String(value));
  return search.toString();
}

export function todoListQueryOptions<T = unknown>(params: TodoListParams) {
  return queryOptions({
    queryKey: todoKeys.list(params),
    queryFn: ({ signal }) => api<T>(`/api/todos?${serialize(params)}`, { signal }),
  });
}

export const todoTasksQueryOptions = queryOptions({
  queryKey: todoKeys.tasks(),
  staleTime: 30_000,
  queryFn: ({ signal }) =>
    api<PersonalTaskView[]>("/api/tasks", { signal }),
});

export function todoCalendarQueryOptions(range: CalendarRange) {
  return queryOptions({
    queryKey: todoKeys.calendar(range),
    queryFn: ({ signal }) =>
      api<unknown>(
        `/api/todos/calendar?from=${range.from}&to=${range.to}`,
        { signal },
      ),
  });
}

/** Personal-task writes (the /api/tasks family the planner uses). */
export async function createTaskRequest(input: unknown) {
  return api<PersonalTaskView>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTaskRequest(id: string, patch: unknown) {
  return api<PersonalTaskView>(`/api/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteTaskRequest(id: string) {
  return api(`/api/tasks/${id}`, { method: "DELETE" });
}
