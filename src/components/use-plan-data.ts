"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "./toast";
import { api } from "@/lib/api-client";
import { useTodoQuery } from "./use-todos-data";
import type {
  PersonalTaskView,
  PlanPayload,
  PlanTaskView,
} from "@/lib/plan/view-model";

/**
 * Client owner of planner state: the merged 50-day plan + progress payload
 * and the user's personal tasks. Mutations patch local state optimistically
 * and persist through the API; a failed call reverts by refetching, so the
 * calendar, My Tasks, the daily workspace, and the dashboard sections all
 * read one authoritative copy (this hook — the shell mounts it once).
 */

export type TaskPatchInput = Partial<
  Pick<
    PlanTaskView,
    | "completed"
    | "score"
    | "percentile"
    | "wrong"
    | "unattempted"
    | "rev1"
    | "rev2"
    | "rev3"
    | "notes"
  >
>;

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

type PlanApi = PlanPayload & { today: string };

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

export function usePlanData() {
  const toast = useToast();
  const [plan, setPlan] = useState<PlanApi | null>(null);
  const taskQuery = useTodoQuery<PersonalTaskView[]>("/api/tasks");
  const personalTasks = taskQuery.data ?? [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const planPayload = await api<PlanApi>("/api/plan");
      if (id !== requestId.current) return;
      setPlan(planPayload);
      setError("");
    } catch (e) {
      if (id === requestId.current)
        setError(e instanceof Error ? e.message : "Could not load the plan");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred like the tracker's refresh effect: the fetch starts on the
    // next tick so the effect body itself performs no synchronous updates.
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const mutate = useCallback(
    async (
      optimistic: () => void,
      request: () => Promise<unknown>,
      failureTitle: string,
    ) => {
      optimistic();
      try {
        await request();
      } catch (e) {
        toast.error(
          failureTitle,
          e instanceof Error ? e.message : "Could not save — retrying.",
        );
        void refresh();
      }
    },
    [refresh, toast],
  );

  const updateTask = useCallback(
    (key: string, patch: TaskPatchInput) =>
      mutate(
        () =>
          setPlan((prev) => (prev ? patchTaskInPlan(prev, key, patch) : prev)),
        () =>
          api("/api/plan/progress", {
            method: "POST",
            body: JSON.stringify({ kind: "task", key, patch }),
          }),
        "Couldn't update the task",
      ),
    [mutate],
  );

  const toggleChecklist = useCallback(
    (day: number, itemId: string, done: boolean) =>
      mutate(
        () =>
          setPlan((prev) =>
            prev
              ? patchDayInPlan(prev, day, (d) => ({
                  ...d,
                  checklist: d.checklist.map((item) =>
                    item.id === itemId ? { ...item, done } : item,
                  ),
                }))
              : prev,
          ),
        () =>
          api("/api/plan/progress", {
            method: "POST",
            body: JSON.stringify({ kind: "checklist", day, itemId, done }),
          }),
        "Couldn't update the checklist",
      ),
    [mutate],
  );

  const toggleDayRevision = useCallback(
    (day: number, revisionIndex: number, done: boolean) =>
      mutate(
        () =>
          setPlan((prev) =>
            prev
              ? patchDayInPlan(prev, day, (d) => ({
                  ...d,
                  revisionDone: done
                    ? [...new Set([...d.revisionDone, String(revisionIndex)])]
                    : d.revisionDone.filter((v) => v !== String(revisionIndex)),
                }))
              : prev,
          ),
        () =>
          api("/api/plan/progress", {
            method: "POST",
            body: JSON.stringify({
              kind: "revision",
              day,
              revisionIndex,
              done,
            }),
          }),
        "Couldn't update the revision",
      ),
    [mutate],
  );

  const saveDayNotes = useCallback(
    (day: number, notes: string) =>
      mutate(
        () =>
          setPlan((prev) =>
            prev ? patchDayInPlan(prev, day, (d) => ({ ...d, notes })) : prev,
          ),
        () =>
          api("/api/plan/progress", {
            method: "POST",
            body: JSON.stringify({ kind: "day-notes", day, notes }),
          }),
        "Couldn't save the notes",
      ),
    [mutate],
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
    loading,
    error,
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
