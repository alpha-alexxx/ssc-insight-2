"use client";
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./toast";
import { api } from "@/lib/api-client";
import { useTodoQuery } from "./use-todos-data";
import {
  planKeys,
  planQueryOptions,
  postPlanProgress,
  type PlanPayloadWithToday,
  type TaskPatchInput,
} from "@/lib/queries/plan";
import type {
  PersonalTaskView,
  PlanPayload,
} from "@/lib/plan/view-model";

/**
 * Client owner of planner state: the merged 50-day plan + progress payload
 * and the user's personal tasks. The plan is one TanStack query; every
 * progress write patches the cached payload optimistically (onMutate
 * snapshot), rolls back on failure, and the calendar, My Tasks, the daily
 * workspace, and the dashboard sections all read one authoritative copy
 * (this hook — the shell mounts it once).
 */

// Kept exported from here (re-export) so existing imports keep working.
export type { TaskPatchInput } from "@/lib/queries/plan";

export type PersonalTaskInput = {
  title: string;
  notes?: string;
  dueDate?: string | null;
  /** Optional external link; the API validates strict http(s) before storing. */
  url?: string | null;
  category: string;
  priority: string;
  status: string;
};

function patchTaskInPlan<T extends PlanPayload>(
  plan: T,
  key: string,
  patch: TaskPatchInput,
): T {
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      tasks: day.tasks.map((task) =>
        task.key === key ? { ...task, ...patch } : task,
      ),
    })),
  };
}

function patchDayInPlan<T extends PlanPayload>(
  plan: T,
  day: number,
  patch: (day: PlanPayload["days"][number]) => PlanPayload["days"][number],
): T {
  return {
    ...plan,
    days: plan.days.map((d) => (d.day === day ? patch(d) : d)),
  };
}

/**
 * Shared optimistic plan mutation: cancel in-flight plan reads, snapshot
 * the payload, apply the local patch, then persist. A failure rolls back
 * to the snapshot, surfaces the toast, and refetches the authoritative
 * copy from the server.
 */
function usePlanOptimistic<TVars>(
  failureTitle: string,
  optimistic: (plan: PlanPayloadWithToday, vars: TVars) => PlanPayloadWithToday,
  request: (vars: TVars) => Promise<unknown>,
) {
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: planKeys.all });
      const previous = queryClient.getQueryData<PlanPayloadWithToday>(
        planKeys.current(),
      );
      queryClient.setQueryData<PlanPayloadWithToday>(
        planKeys.current(),
        (prev) => (prev ? optimistic(prev, vars) : prev),
      );
      return { previous };
    },
    onError: (error: unknown, _vars: TVars, context) => {
      if (context?.previous)
        queryClient.setQueryData(planKeys.current(), context.previous);
      toast.error(
        failureTitle,
        error instanceof Error ? error.message : "Could not save — retrying.",
      );
      void queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function usePlanData() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const planQuery = useQuery(planQueryOptions);
  const plan = planQuery.data ?? null;
  const taskQuery = useTodoQuery<PersonalTaskView[]>("/api/tasks");
  const personalTasks = taskQuery.data ?? [];

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: planKeys.all });
  }, [queryClient]);

  const updateTaskMut = usePlanOptimistic(
    "Couldn't update the task",
    (p, vars: { key: string; patch: TaskPatchInput }) =>
      patchTaskInPlan(p, vars.key, vars.patch),
    ({ key, patch }) => postPlanProgress({ kind: "task", key, patch }),
  );
  const toggleChecklistMut = usePlanOptimistic(
    "Couldn't update the checklist",
    (p, vars: { day: number; itemId: string; done: boolean }) =>
      patchDayInPlan(p, vars.day, (d) => ({
        ...d,
        checklist: d.checklist.map((item) =>
          item.id === vars.itemId ? { ...item, done: vars.done } : item,
        ),
      })),
    ({ day, itemId, done }) =>
      postPlanProgress({ kind: "checklist", day, itemId, done }),
  );
  const toggleDayRevisionMut = usePlanOptimistic(
    "Couldn't update the revision",
    (p, vars: { day: number; revisionIndex: number; done: boolean }) =>
      patchDayInPlan(p, vars.day, (d) => ({
        ...d,
        revisionDone: vars.done
          ? [...new Set([...d.revisionDone, String(vars.revisionIndex)])]
          : d.revisionDone.filter((v) => v !== String(vars.revisionIndex)),
      })),
    ({ day, revisionIndex, done }) =>
      postPlanProgress({ kind: "revision", day, revisionIndex, done }),
  );
  const saveDayNotesMut = usePlanOptimistic(
    "Couldn't save the notes",
    (p, vars: { day: number; notes: string }) =>
      patchDayInPlan(p, vars.day, (d) => ({ ...d, notes: vars.notes })),
    ({ day, notes }) => postPlanProgress({ kind: "day-notes", day, notes }),
  );

  // Same contract as before: the write starts immediately, errors are
  // surfaced as a toast + rollback, and the returned promise never rejects.
  const updateTask = useCallback(
    async (key: string, patch: TaskPatchInput) => {
      try {
        await updateTaskMut.mutateAsync({ key, patch });
      } catch {
        // Already surfaced by onError.
      }
    },
    [updateTaskMut],
  );
  const toggleChecklist = useCallback(
    async (day: number, itemId: string, done: boolean) => {
      try {
        await toggleChecklistMut.mutateAsync({ day, itemId, done });
      } catch {
        // Already surfaced by onError.
      }
    },
    [toggleChecklistMut],
  );
  const toggleDayRevision = useCallback(
    async (day: number, revisionIndex: number, done: boolean) => {
      try {
        await toggleDayRevisionMut.mutateAsync({ day, revisionIndex, done });
      } catch {
        // Already surfaced by onError.
      }
    },
    [toggleDayRevisionMut],
  );
  const saveDayNotes = useCallback(
    async (day: number, notes: string) => {
      try {
        await saveDayNotesMut.mutateAsync({ day, notes });
      } catch {
        // Already surfaced by onError.
      }
    },
    [saveDayNotesMut],
  );

  const createPersonalTask = useCallback(async (input: PersonalTaskInput) => {
    await api<PersonalTaskView>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    });
    window.dispatchEvent(new Event("ssc:todos-changed"));
  }, []);

  const updatePersonalTask = useCallback(
    async (id: string, patch: Partial<PersonalTaskInput>) => {
      await api<PersonalTaskView>(`/api/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      window.dispatchEvent(new Event("ssc:todos-changed"));
    },
    [],
  );

  const deletePersonalTask = useCallback(
    async (id: string) => {
      try {
        await api(`/api/tasks/${id}`, { method: "DELETE" });
        window.dispatchEvent(new Event("ssc:todos-changed"));
      } catch (e) {
        toast.error(
          "Couldn't delete the task",
          e instanceof Error ? e.message : undefined,
        );
        void refresh();
      }
    },
    [refresh, toast],
  );

  return {
    plan,
    today: plan?.today,
    personalTasks,
    loading: planQuery.isPending,
    error: planQuery.error?.message ?? "",
    refresh,
    updateTask,
    toggleChecklist,
    toggleDayRevision,
    saveDayNotes,
    createPersonalTask,
    updatePersonalTask,
    deletePersonalTask,
  };
}

export type PlanDataApi = ReturnType<typeof usePlanData>;
