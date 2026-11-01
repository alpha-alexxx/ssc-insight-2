"use client";

import { useCallback, useState } from "react";

/** View state for the My Tasks workspace: the active tab, list/board layout,
 * and the filter set. Persisted in localStorage (ssc.* pattern, like
 * ssc.palette / ssc.style) so a refresh restores where the user was. Search
 * is deliberately transient — it is a query, not a place. */

export type TaskViewTab = "myday" | "upcoming" | "all" | "completed";
export type TaskLayout = "list" | "board";
export type TaskStatusFilter = "all" | "todo" | "in_progress" | "completed";
export type TaskSort = "priority" | "date" | "newest" | "title";

export type TaskFilters = {
  /** Only offered on the All tab; the other tabs imply their status. */
  status: TaskStatusFilter;
  priority: "all" | "high" | "normal" | "low";
  group: string;
  sort: TaskSort;
};

export const DEFAULT_FILTERS: TaskFilters = {
  status: "all",
  priority: "all",
  group: "all",
  sort: "priority",
};

const STORAGE_KEY = "ssc.tasks.view";

type StoredState = {
  tab: TaskViewTab;
  layout: TaskLayout;
  filters: TaskFilters;
};

const TABS: TaskViewTab[] = ["myday", "upcoming", "all", "completed"];
const LAYOUTS: TaskLayout[] = ["list", "board"];
const STATUS_FILTERS: TaskStatusFilter[] = [
  "all",
  "todo",
  "in_progress",
  "completed",
];
const PRIORITIES = ["all", "high", "normal", "low"];
const SORTS: TaskSort[] = ["priority", "date", "newest", "title"];

function asString<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function loadStored(): StoredState {
  const fallback: StoredState = {
    tab: "myday",
    layout: "list",
    filters: DEFAULT_FILTERS,
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const rawFilters = (parsed.filters ?? {}) as Partial<TaskFilters>;
    return {
      tab: asString(parsed.tab, TABS, fallback.tab),
      layout: asString(parsed.layout, LAYOUTS, fallback.layout),
      filters: {
        status: asString(
          rawFilters.status,
          STATUS_FILTERS,
          DEFAULT_FILTERS.status,
        ),
        priority: asString(
          rawFilters.priority,
          PRIORITIES,
          DEFAULT_FILTERS.priority,
        ) as TaskFilters["priority"],
        group:
          typeof rawFilters.group === "string"
            ? rawFilters.group
            : DEFAULT_FILTERS.group,
        sort: asString(rawFilters.sort, SORTS, DEFAULT_FILTERS.sort),
      },
    };
  } catch {
    return fallback;
  }
}

export function useTasksViewState() {
  const [state, setState] = useState<StoredState>(() =>
    typeof window === "undefined"
      ? { tab: "myday", layout: "list", filters: DEFAULT_FILTERS }
      : loadStored(),
  );

  const persist = useCallback((next: StoredState) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private mode); the view still works.
    }
  }, []);

  const setTab = useCallback(
    (tab: TaskViewTab) => {
      setState((current) => {
        const next = { ...current, tab };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setLayout = useCallback(
    (layout: TaskLayout) => {
      setState((current) => {
        const next = { ...current, layout };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const patchFilters = useCallback(
    (patch: Partial<TaskFilters>) => {
      setState((current) => {
        const next = { ...current, filters: { ...current.filters, ...patch } };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearFilters = useCallback(() => {
    setState((current) => {
      const next = { ...current, filters: DEFAULT_FILTERS };
      persist(next);
      return next;
    });
  }, [persist]);

  return {
    tab: state.tab,
    layout: state.layout,
    filters: state.filters,
    setTab,
    setLayout,
    patchFilters,
    clearFilters,
  };
}

/** Active-filter chips derivable from the filter state (search handled
 * separately). Empty array when everything is at its default. */
export function activeFilterEntries(filters: TaskFilters): {
  key: keyof TaskFilters;
  value: string;
  label: string;
}[] {
  const entries: {
    key: keyof TaskFilters;
    value: string;
    label: string;
  }[] = [];
  if (filters.status !== "all") {
    entries.push({
      key: "status",
      value: filters.status,
      label:
        filters.status === "in_progress" ? "In progress" : filters.status === "todo" ? "To do" : "Done",
    });
  }
  if (filters.priority !== "all") {
    entries.push({
      key: "priority",
      value: filters.priority,
      label: `${filters.priority} priority`,
    });
  }
  if (filters.group !== "all") {
    entries.push({
      key: "group",
      value: filters.group,
      label: filters.group === "ungrouped" ? "Ungrouped" : "Group",
    });
  }
  return entries;
}
