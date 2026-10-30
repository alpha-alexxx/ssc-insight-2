/** Shared shapes for the /my-tasks workspace. These mirror the /api/todos
 * contract (lib/todos.ts) — the API returns every PersonalTask column, and
 * the UI only surfaces what it renders. */

export type Subtask = { id: string; title: string; completed: boolean };

export type TaskGroup = { id: string; name: string };

/** Stored status. "in_progress" is a first-class working state; "overdue"
 * is derived from the due date and never stored. */
export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "high" | "normal" | "low";

export type Task = {
  id: string;
  title: string;
  /** ISO date (yyyy-mm-dd), no time-of-day anywhere in this domain. */
  dueDate: string | null;
  notes: string | null;
  priority: string;
  status: string;
  groupId: string | null;
  subtasks: Subtask[];
  /** Optimistic-concurrency token; every PATCH must carry it. */
  version: number;
  deletedAt: string | null;
  url?: string | null;
  /** Todos API always stores "other"; only the AI review flow can differ. */
  category?: string;
};

export type TaskListResponse = {
  items: Task[];
  groups: TaskGroup[];
  total: number;
  page: number;
  limit: number;
  counts: {
    today: number;
    overdue: number;
    upcoming: number;
    all: number;
    needsdate: number;
    trash: number;
    completed: number;
    pending: number;
    inProgress: number;
  };
};

/** Create/edit payload — the editable subset of Task sent to the API. */
export type TaskDraft = {
  title?: string;
  dueDate?: string;
  notes?: string;
  url?: string;
  priority?: string;
  groupId?: string | null;
  subtasks?: Subtask[];
  completed?: boolean;
  status?: TaskStatus;
  restore?: boolean;
};

/** Group row with a live task count (computed client-side for the rail). */
export type GroupWithCount = TaskGroup & { count: number };
