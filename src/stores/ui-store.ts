import { create } from "zustand";
import { istTodayIso } from "@/lib/plan/view-model";

/**
 * Global shell UI state, on Zustand.
 *
 * Scope rules (see docs/state-audit.md and AGENTS.md):
 * - Server data NEVER lives here — every API resource belongs to the
 *   TanStack Query cache. This store carries only what multiple surfaces
 *   read and write: palette visibility, the AI drawer's open flag and flow
 *   tab, the planner date the calendar/day views share, and the quick-add
 *   handoff from the `n` shortcut (replacing the ssc:tasks-quick-add
 *   window event).
 * - No persistence middleware: every field is session UI state and must
 *   reset on reload; anything durable already has a home (theme tokens in
 *   localStorage, the sidebar in its cookie, task-view prefs in their own
 *   storage key).
 * - Select fields with narrow selectors (`useUiStore((s) => s.searchOpen)`)
 *   so streaming chat tokens and drawer state changes do not re-render
 *   unrelated panels.
 */

export type AiChatTab = "chat" | "log" | "todos";

type UiState = {
  /** ⌘K command palette visibility (keyboard shortcuts, header, shell). */
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  /** Shared AI drawer. Messages and streaming state stay in
   * use-ai-workspace; only the cross-surface bits live here. */
  aiChatOpen: boolean;
  aiChatTab: AiChatTab;
  /** Sets the flow tab and opens the drawer in one action. */
  openAiChat: (tab: AiChatTab) => void;
  setAiChatOpen: (open: boolean) => void;

  /** The planner date shared by the dashboard week strip, the calendar
   * selection, and the /plan/<date> fallback. */
  plannerDate: string;
  setPlannerDate: (date: string) => void;

  /** Monotonic counter bumped to ask My Tasks to focus its quick-add bar.
   * Consumers track consumption so a remount never re-fires an old request. */
  quickAddNonce: number;
  consumedQuickAddNonce: number;
  requestQuickAdd: () => void;
  consumeQuickAdd: () => void;
};

export const useUiStore = create<UiState>()((set) => ({
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  aiChatOpen: false,
  aiChatTab: "chat",
  openAiChat: (tab) => set({ aiChatTab: tab, aiChatOpen: true }),
  setAiChatOpen: (open) => set({ aiChatOpen: open }),

  plannerDate: istTodayIso(),
  setPlannerDate: (date) => set({ plannerDate: date }),

  quickAddNonce: 0,
  consumedQuickAddNonce: 0,
  requestQuickAdd: () =>
    set((state) => ({ quickAddNonce: state.quickAddNonce + 1 })),
  consumeQuickAdd: () =>
    set((state) => ({ consumedQuickAddNonce: state.quickAddNonce })),
}));
