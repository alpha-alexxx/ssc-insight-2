"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/stores/ui-store";

import {
  NAV_GROUPS,
  VIEW_META,
  planHref,
} from "@/components/app-shell";
import { PlainIcon } from "@/components/icon";
import { Highlight } from "@/components/search/highlight";
import {
  collectResultsByType,
  searchHasMore,
  useSearch,
} from "@/components/search/use-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { normalizeForSearch } from "@/components/search/use-search";

/**
 * Global search palette (⌘K). Pages and quick actions are static client
 * data and render instantly; everything else is a query against the
 * server-side search API (`/api/search`) — 350ms debounce, two-character
 * minimum, abortable, cached by TanStack Query, keyset-paginated with a
 * Load-more action. Nothing here filters an in-memory table dump.
 */

const RECENT_KEY = "ssc.search.recent";
const RECENT_MAX = 8;
const DEBOUNCE_MS = 350;

type RecentAction = {
  label: string;
  keywords?: string[];
  icon: Parameters<typeof PlainIcon>[0]["name"];
  shortcut?: string;
  run: () => void;
};

/** Recent queries persist under the app's ssc.* convention. The query text
 *  itself stays transient (it is a question, not a place) — this list is the
 *  shortcut back to questions worth asking again. */
function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(RECENT_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.filter(
          (entry): entry is string =>
            typeof entry === "string" &&
            entry.trim().length >= 2 &&
            entry.length <= 80,
        ),
      ),
    ].slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function persistRecentSearches(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Private modes may refuse writes; the list is a convenience, not data.
  }
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiEnabled: boolean;
  onAddMock: () => void;
  onOpenAi: () => void;
}

/** Wrapper only: Radix unmounts the dialog content while closed, so the
 *  stateful body below remounts on every open — a fresh query, a re-read of
 *  recent searches, and no close-time reset effects. */
export function CommandPalette(props: CommandPaletteProps) {
  return (
    <CommandDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      shouldFilter={false}
    >
      <PaletteBody {...props} />
    </CommandDialog>
  );
}

function PaletteBody({
  onOpenChange,
  aiEnabled,
  onAddMock,
  onOpenAi,
}: CommandPaletteProps) {
  const router = useRouter();
  // Guarded for the SSR prerender pass — the palette body only mounts in the
  // browser, but the module still evaluates server-side.
  const [raw, setRaw] = useState("");
  const debounced = useDebouncedValue(raw, DEBOUNCE_MS);
  const query = normalizeForSearch(debounced);
  const searching = query.length >= 2;

  const search = useSearch({ query, enabled: true });
  const grouped = collectResultsByType(search.data?.pages);
  const hasMore = searchHasMore(search.data?.pages);
  const resultCount =
    grouped.attempts.length +
    grouped.tasks.length +
    grouped.groups.length +
    grouped.plan.length;

  const [recent, setRecent] = useState<string[]>(loadRecentSearches);

  const remember = (value: string) => {
    const normalized = normalizeForSearch(value);
    if (normalized.length < 2) return;
    const next = [
      normalized,
      ...loadRecentSearches().filter(
        (entry) => entry.toLowerCase() !== normalized.toLowerCase(),
      ),
    ].slice(0, RECENT_MAX);
    persistRecentSearches(next);
    setRecent(next);
  };

  const clearRecent = () => {
    persistRecentSearches([]);
    setRecent([]);
  };

  // Every result closes the palette first so the view swap starts under the
  // exiting dialog instead of a stale overlay.
  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  // "New task" mirrors the `n` shortcut on My Tasks: bump the quick-add
  // request in the UI store. The view consumes the request whenever it is
  // (or becomes) mounted, so no timing dance is needed for navigation.
  const newTask = () => {
    if (!window.location.pathname.startsWith("/my-tasks"))
      router.push("/my-tasks");
    useUiStore.getState().requestQuickAdd();
  };

  const pageActions: { label: string; action: RecentAction }[] = [];
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      pageActions.push({
        label: item.label,
        action: {
          label: item.label,
          keywords: [VIEW_META[item.view].label, group.label],
          icon: VIEW_META[item.view].icon,
          run: () => router.push(item.href),
        },
      });
    }
  }
  pageActions.push(
    {
      label: "Log a mock",
      action: {
        label: "Log a mock",
        keywords: ["add attempt", "new mock", "record score"],
        icon: "plus",
        shortcut: "N",
        run: onAddMock,
      },
    },
    {
      label: "New task",
      action: {
        label: "New task",
        keywords: ["add task", "quick add", "personal task"],
        icon: "check",
        run: newTask,
      },
    },
  );
  if (aiEnabled) {
    pageActions.push({
      label: "Ask AI",
      action: {
        label: "Ask AI",
        keywords: ["chat", "assistant", "coach"],
        icon: "sparkles",
        run: onOpenAi,
      },
    });
  }

  const needle = query.toLowerCase();
  const matchesStatic = (action: RecentAction) =>
    !searching ||
    action.label.toLowerCase().includes(needle) ||
    (action.keywords ?? []).some((k) => k.toLowerCase().includes(needle));
  const visiblePages = pageActions.filter((entry) =>
    matchesStatic(entry.action),
  );

  const loadingFirstPage = searching && search.isPending;
  const searchFailed = searching && search.isError;
  const empty =
    searching &&
    !loadingFirstPage &&
    !searchFailed &&
    resultCount === 0 &&
    visiblePages.length === 0;

  return (
    <>
      <CommandInput
        value={raw}
        onValueChange={setRaw}
        placeholder="Search pages, tasks, plan days, mocks…"
      />
      <CommandList className="max-sm:max-h-none max-sm:flex-1">
        {/* Recent searches — only while the input is empty. */}
        {!searching && recent.length > 0 && (
          <CommandGroup heading="Recent searches">
            {recent.map((entry) => (
              <CommandItem
                key={entry}
                value={`recent:${entry}`}
                onSelect={() => setRaw(entry)}
              >
                <PlainIcon name="history" size={16} tone="muted" />
                <span className="min-w-0 truncate">{entry}</span>
              </CommandItem>
            ))}
            <CommandItem
              value="Clear search history"
              onSelect={clearRecent}
              className="text-muted"
            >
              <PlainIcon name="close" size={16} tone="muted" />
              <span>Clear history</span>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Pages & quick actions — static, instant, no fetch. */}
        {visiblePages.length > 0 && (
          <CommandGroup
            heading={searching ? "Pages & actions" : "Pages"}
          >
            {visiblePages.map(({ label, action }) => (
              <CommandItem
                key={`${label}:${action.icon}`}
                value={`page:${label}`}
                onSelect={() => {
                  remember(query);
                  run(() => action.run());
                }}
              >
                <PlainIcon
                  name={action.icon}
                  size={16}
                  tone={action.shortcut ? "accent" : "muted"}
                />
                <span className="truncate">{action.label}</span>
                {action.shortcut && (
                  <CommandShortcut>{action.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {loadingFirstPage && <SearchingSkeleton />}

        {searchFailed && (
          <div role="alert" className="px-4 py-6 text-center">
            <p className="text-sm text-ink">Search could not load.</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted">
              {search.error instanceof Error
                ? search.error.message
                : "The connection dropped before results arrived."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void search.refetch()}
            >
              <PlainIcon name="refresh" size={13} /> Retry
            </Button>
          </div>
        )}

        {searching && grouped.attempts.length > 0 && (
          <CommandGroup heading="Mock history">
            {grouped.attempts.map((item) => (
              <CommandItem
                key={item.id}
                value={`attempt:${item.id}`}
                onSelect={() =>
                  run(() => {
                    remember(query);
                    // The URL param is the handoff: use-workspace-data
                    // re-reads the address bar whenever the view changes, so
                    // /history?search=… restores the filter and the mirror
                    // keeps it shareable.
                    router.push(
                      `/history?search=${encodeURIComponent(item.title)}`,
                    );
                  })
                }
              >
                <PlainIcon name="history" size={16} tone="muted" />
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={item.title} query={query} />
                </span>
                <span className="ml-auto shrink-0 pl-2 text-xs text-muted">
                  {item.subtitle}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {searching && grouped.tasks.length > 0 && (
          <CommandGroup heading="Your tasks">
            {grouped.tasks.map((item) => (
              <CommandItem
                key={item.id}
                value={`task:${item.id}`}
                onSelect={() =>
                  run(() => {
                    remember(query);
                    router.push("/my-tasks");
                  })
                }
              >
                <PlainIcon name="check" size={16} tone="muted" />
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={item.title} query={query} />
                </span>
                <span className="ml-auto shrink-0 pl-2 text-xs text-muted">
                  {item.subtitle}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {searching && grouped.groups.length > 0 && (
          <CommandGroup heading="Task groups">
            {grouped.groups.map((item) => (
              <CommandItem
                key={item.id}
                value={`group:${item.id}`}
                onSelect={() =>
                  run(() => {
                    remember(query);
                    router.push("/my-tasks");
                  })
                }
              >
                <PlainIcon name="layers" size={16} tone="muted" />
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={item.title} query={query} />
                </span>
                <span className="ml-auto shrink-0 pl-2 text-xs text-muted">
                  {item.subtitle}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {searching && grouped.plan.length > 0 && (
          <CommandGroup heading="Study plan">
            {grouped.plan.map((item) => (
              <CommandItem
                key={item.id}
                value={`plan:${item.id}`}
                onSelect={() =>
                  run(() => {
                    remember(query);
                    if (item.date) router.push(planHref(item.date));
                  })
                }
              >
                <PlainIcon name="calendar" size={16} tone="muted" />
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={item.title} query={query} />
                </span>
                <span className="ml-auto shrink-0 pl-2 text-xs text-muted">
                  {item.subtitle}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {searching && hasMore && !loadingFirstPage && (
          <CommandGroup>
            <CommandItem
              value="Load more results"
              onSelect={() => void search.fetchNextPage()}
              className="justify-center text-accent"
            >
              {search.isFetchingNextPage ? (
                <>
                  <PlainIcon
                    name="refresh"
                    size={14}
                    className="animate-spin"
                  />
                  <span>Loading more…</span>
                </>
              ) : (
                <>
                  <PlainIcon name="chevronDown" size={14} />
                  <span>Load more results</span>
                </>
              )}
            </CommandItem>
          </CommandGroup>
        )}

        {searching && !loadingFirstPage && resultCount > 0 && (
          <p className="border-t border-rule-soft px-4 py-2.5 text-[0.6875rem] text-muted">
            {resultCount} result{resultCount === 1 ? "" : "s"} loaded
            {hasMore ? " · more available" : ""}
          </p>
        )}

        {empty && (
          <CommandEmpty>
            No matches for “{query}” — try a mock name, task title, group, or
            plan day.
          </CommandEmpty>
        )}

        {searching &&
          !loadingFirstPage &&
          !searchFailed &&
          resultCount === 0 &&
          visiblePages.length > 0 && (
            <p className="px-4 pb-3 pt-1 text-xs text-muted">
              No tasks, mocks, or plan days match — the pages above did.
            </p>
          )}
      </CommandList>
    </>
  );
}

/** Three skeleton rows — the palette's first-load state is a shape, not a
 *  blank list. */
function SearchingSkeleton() {
  return (
    <CommandGroup heading="Searching…">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-2 px-2 py-2.5">
          <Skeleton className="size-4 shrink-0" />
          <Skeleton
            className="h-4 flex-1"
            style={{ maxWidth: `${68 - row * 14}%` }}
          />
        </div>
      ))}
    </CommandGroup>
  );
}
