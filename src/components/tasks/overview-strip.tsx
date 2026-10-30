"use client";

import { MetricCell } from "../metric-strip";
import type { TaskViewTab } from "./use-tasks-view-state";

/**
 * The page's overview: one divided metric strip in the dashboard idiom
 * (label, serif figure, quiet hint, 2px rule). Each cell is a button that
 * opens the matching view — the strip is the summary and the navigation.
 */
export function OverviewStrip({
  counts,
  onOpen,
}: {
  counts: {
    overdue: number;
    today: number;
    upcoming: number;
    completed: number;
    all: number;
  };
  onOpen: (tab: TaskViewTab) => void;
}) {
  const done = counts.completed;
  const total = counts.all;
  return (
    <div className="metric-strip metric-strip-scroll" role="group" aria-label="Task overview">
      <MetricCell
        icon="warning"
        label="Overdue"
        value={String(counts.overdue)}
        hint="Past due — act or reschedule"
        pct={null}
        tone={counts.overdue > 0 ? "danger" : undefined}
        onClick={() => onOpen("myday")}
      />
      <MetricCell
        icon="target"
        label="Due today"
        value={String(counts.today)}
        hint="Scheduled for today"
        pct={null}
        onClick={() => onOpen("myday")}
      />
      <MetricCell
        icon="calendar"
        label="Upcoming"
        value={String(counts.upcoming)}
        hint="Scheduled after today"
        pct={null}
        onClick={() => onOpen("upcoming")}
      />
      <MetricCell
        icon="success"
        label="Done"
        value={String(done)}
        hint={total ? `${Math.round((done / total) * 100)}% of all tasks` : "Nothing completed yet"}
        pct={total ? done / total : null}
        onClick={() => onOpen("completed")}
      />
    </div>
  );
}
