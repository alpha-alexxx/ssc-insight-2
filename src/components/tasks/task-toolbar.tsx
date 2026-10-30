"use client";

import { useState, type RefObject } from "react";
import { Search } from "lucide-react";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { PlainIcon } from "../icon";
import { cn } from "@/lib/utils";
import type {
  TaskFilters,
  TaskLayout,
  TaskSort,
  TaskStatusFilter,
} from "./use-tasks-view-state";
import type { TaskGroup } from "./types";

const SORT_LABELS: Record<TaskSort, string> = {
  priority: "Priority",
  date: "Due date",
  newest: "Newest first",
  title: "Title",
};
const STATUS_LABELS: Record<TaskStatusFilter, string> = {
  all: "Any status",
  todo: "To do",
  in_progress: "In progress",
  completed: "Done",
};
const PRIORITY_LABELS: Record<string, string> = {
  all: "Any priority",
  high: "High",
  normal: "Normal",
  low: "Low",
};

function MenuOption({
  active,
  onSelect,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className={cn("justify-between", active && "font-medium text-ink")}
    >
      <span>{children}</span>
      {active && <PlainIcon name="check" size={13} className="text-accent" />}
    </DropdownMenuItem>
  );
}

export function filterCount(filters: TaskFilters): number {
  return (
    (filters.status !== "all" ? 1 : 0) +
    (filters.priority !== "all" ? 1 : 0) +
    (filters.group !== "all" ? 1 : 0)
  );
}

/**
 * Search, sort, filters, layout, and select mode in one control row.
 * Desktop uses labeled dropdowns; below md the filter controls collapse
 * into a single "Filters (n)" bottom sheet with the same options.
 */
export function TaskToolbar({
  tab,
  layout,
  filters,
  groups,
  search,
  onSearch,
  onPatchFilters,
  onClearFilters,
  onLayout,
  selecting,
  hasItems,
  onToggleSelect,
  searchRef,
}: {
  tab: string;
  layout: TaskLayout;
  filters: TaskFilters;
  groups: TaskGroup[];
  search: string;
  onSearch: (value: string) => void;
  onPatchFilters: (patch: Partial<TaskFilters>) => void;
  onClearFilters: () => void;
  onLayout: (layout: TaskLayout) => void;
  selecting: boolean;
  hasItems: boolean;
  onToggleSelect: () => void;
  searchRef?: RefObject<HTMLInputElement | null>;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = filterCount(filters);

  const filtersMenu = (
    <DropdownMenuContent align="end" className="w-52">
      {tab === "all" && (
        <>
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          {(
            [
              "all",
              "todo",
              "in_progress",
              "completed",
            ] as TaskStatusFilter[]
          ).map((value) => (
            <MenuOption
              key={value}
              active={filters.status === value}
              onSelect={() => onPatchFilters({ status: value })}
            >
              {STATUS_LABELS[value]}
            </MenuOption>
          ))}
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuLabel>Priority</DropdownMenuLabel>
      {(["all", "high", "normal", "low"] as const).map((value) => (
        <MenuOption
          key={value}
          active={filters.priority === value}
          onSelect={() => onPatchFilters({ priority: value })}
        >
          {PRIORITY_LABELS[value]}
        </MenuOption>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Group</DropdownMenuLabel>
      <div className="max-h-52 overflow-y-auto">
        <MenuOption
          active={filters.group === "all"}
          onSelect={() => onPatchFilters({ group: "all" })}
        >
          All groups
        </MenuOption>
        <MenuOption
          active={filters.group === "ungrouped"}
          onSelect={() => onPatchFilters({ group: "ungrouped" })}
        >
          Ungrouped
        </MenuOption>
        {groups.map((group) => (
          <MenuOption
            key={group.id}
            active={filters.group === group.id}
            onSelect={() => onPatchFilters({ group: group.id })}
          >
            {group.name}
          </MenuOption>
        ))}
      </div>
      {active > 0 && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onClearFilters}>
            Clear all filters
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );

  const layoutSegment = (
    <div role="group" aria-label="Layout" className="segment-group shrink-0">
      <button
        type="button"
        aria-pressed={layout === "list"}
        className="segment"
        onClick={() => onLayout("list")}
      >
        List
      </button>
      <button
        type="button"
        aria-pressed={layout === "board"}
        className="segment"
        onClick={() => onLayout("board")}
      >
        Board
      </button>
    </div>
  );

  const selectButton = hasItems ? (
    <Button
      type="button"
      variant={selecting ? "default" : "outline"}
      size="sm"
      aria-pressed={selecting}
      onClick={onToggleSelect}
      title="Select mode (S)"
    >
      <PlainIcon name="check" size={13} />
      Select
    </Button>
  ) : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-52">
          <Search
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            ref={searchRef}
            aria-label="Search tasks"
            value={search}
            maxLength={200}
            placeholder="Search tasks…"
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9!"
          />
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Sort: {SORT_LABELS[filters.sort]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {(["priority", "date", "newest", "title"] as TaskSort[]).map(
                (value) => (
                  <MenuOption
                    key={value}
                    active={filters.sort === value}
                    onSelect={() => onPatchFilters({ sort: value })}
                  >
                    {SORT_LABELS[value]}
                  </MenuOption>
                ),
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Filters
                {active > 0 && (
                  <span className="rounded-pill bg-accent px-1.5 text-[0.625rem] font-semibold leading-4 text-paper">
                    {active}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            {filtersMenu}
          </DropdownMenu>
          {selectButton}
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSheetOpen(true)}
          >
            Filters
            {active > 0 && (
              <span className="rounded-pill bg-accent px-1.5 text-[0.625rem] font-semibold leading-4 text-paper">
                {active}
              </span>
            )}
          </Button>
          {selectButton}
        </div>
        {layoutSegment}
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] gap-0 overflow-y-auto pb-[max(12px,env(safe-area-inset-bottom))]"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-pill bg-rule-soft" aria-hidden="true" />
          <SheetHeader className="pr-12">
            <SheetTitle>Filters &amp; sorting</SheetTitle>
            <SheetDescription>
              Applied to the current list immediately.
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            {tab === "all" && (
              <label className="text-xs">
                Status
                <select
                  aria-label="Status filter"
                  value={filters.status}
                  onChange={(e) =>
                    onPatchFilters({ status: e.target.value as TaskStatusFilter })
                  }
                >
                  {(
                    ["all", "todo", "in_progress", "completed"] as TaskStatusFilter[]
                  ).map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs">
              Priority
              <select
                aria-label="Priority filter"
                value={filters.priority}
                onChange={(e) => onPatchFilters({ priority: e.target.value as TaskFilters["priority"] })}
              >
                {(["all", "high", "normal", "low"] as const).map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              Group
              <select
                aria-label="Group filter"
                value={filters.group}
                onChange={(e) => onPatchFilters({ group: e.target.value })}
              >
                <option value="all">All groups</option>
                <option value="ungrouped">Ungrouped</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              Sort
              <select
                aria-label="Sort"
                value={filters.sort}
                onChange={(e) => onPatchFilters({ sort: e.target.value as TaskSort })}
              >
                {(["priority", "date", "newest", "title"] as TaskSort[]).map(
                  (value) => (
                    <option key={value} value={value}>
                      {SORT_LABELS[value]}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <div className="flex justify-between gap-2 px-4 pb-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={active === 0}
              onClick={onClearFilters}
            >
              Clear all
            </Button>
            <Button type="button" size="sm" onClick={() => setSheetOpen(false)}>
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
