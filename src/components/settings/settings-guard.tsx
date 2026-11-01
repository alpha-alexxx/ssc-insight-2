"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Unsaved-changes guard for Settings.
 *
 * Settings is a set of independent panels, each with its own save action, so
 * a single global "Save" would be a lie. What a user does expect is not to
 * lose typed input by clicking another section. A panel registers its draft
 * state here; navigating away asks before discarding.
 *
 * Panels stay mounted while the section changes (so a half-typed target is
 * not thrown away by a mis-click), which is why dirty state has to be
 * observable rather than owned by the navigator.
 */

type PanelDraft = {
  /** True when the panel has edits the user has not saved. */
  isDirty: boolean;
  /** Reverts the panel's draft to its saved values. */
  reset: () => void;
};

type SettingsGuard = {
  /** The section currently being rendered. */
  section: string;
  requestSection: (next: string) => void;
  register: (section: string, draft: PanelDraft | null) => void;
  /** True while the discard dialog is open. */
  confirming: boolean;
  confirmDiscard: () => void;
  cancelDiscard: () => void;
  /** The section the user tried to reach, shown in the dialog copy. */
  pendingSection: string | null;
};

const SettingsGuardContext = createContext<SettingsGuard | null>(null);

export function SettingsGuardProvider({
  section,
  onSectionChange,
  children,
}: {
  section: string;
  onSectionChange: (next: string) => void;
  children: ReactNode;
}) {
  const drafts = useRef(new Map<string, PanelDraft>());
  const [confirming, setConfirming] = useState(false);
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  const register = useCallback(
    (key: string, draft: PanelDraft | null) => {
      if (draft) drafts.current.set(key, draft);
      else drafts.current.delete(key);
    },
    [],
  );

  const requestSection = useCallback(
    (next: string) => {
      if (next === section) return;
      const dirty = [...drafts.current.values()].some((d) => d.isDirty);
      if (!dirty) {
        onSectionChange(next);
        return;
      }
      setPendingSection(next);
      setConfirming(true);
    },
    [onSectionChange, section],
  );

  const confirmDiscard = useCallback(() => {
    for (const draft of drafts.current.values()) draft.reset();
    setConfirming(false);
    if (pendingSection) onSectionChange(pendingSection);
    setPendingSection(null);
  }, [onSectionChange, pendingSection]);

  const cancelDiscard = useCallback(() => {
    setConfirming(false);
    setPendingSection(null);
  }, []);

  // Closing the tab with unsaved edits asks the browser to confirm. The
  // listener is only bound while something is actually dirty.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      const dirty = [...drafts.current.values()].some((d) => d.isDirty);
      if (!dirty) return;
      event.preventDefault();
      // Chrome requires returnValue to be set for the prompt to appear.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const value = useMemo<SettingsGuard>(
    () => ({
      section,
      requestSection,
      register,
      confirming,
      confirmDiscard,
      cancelDiscard,
      pendingSection,
    }),
    [
      cancelDiscard,
      confirmDiscard,
      confirming,
      pendingSection,
      register,
      requestSection,
      section,
    ],
  );

  return (
    <SettingsGuardContext.Provider value={value}>
      {children}
    </SettingsGuardContext.Provider>
  );
}

export function useSettingsGuard(): SettingsGuard {
  const value = useContext(SettingsGuardContext);
  if (!value)
    throw new Error("useSettingsGuard must be used within SettingsGuardProvider");
  return value;
}

/** Register one panel's draft with the guard. Call with `null` on unmount. */
export function usePanelDraft(section: string, draft: PanelDraft | null) {
  const guard = useSettingsGuard();
  const { isDirty, reset } = draft ?? { isDirty: false, reset: () => {} };
  useEffect(() => {
    guard.register(section, { isDirty, reset });
  }, [guard, isDirty, reset, section]);
  useEffect(() => () => guard.register(section, null), [guard, section]);
}
