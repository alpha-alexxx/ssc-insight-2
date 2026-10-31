"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { startGoogleSignIn } from "@/lib/auth/sign-in";
import { PlainIcon } from "./icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/** Props for {@link AuthControl}. */
export interface AuthControlProps {
  enabled: boolean;
  name: string;
  email: string;
  imageUrl: string;
  onSettings: () => void;
}

/**
 * Header account menu — the workspace's single auth surface. The trigger is
 * the avatar (Google photo when present, otherwise the name's first letter);
 * the menu holds the identity (name + email), Settings, and Sign out.
 * Sign-out routes through the app's custom events so the workspace guard
 * reacts immediately.
 */
export function AuthControl({
  enabled,
  name,
  email,
  imageUrl,
  onSettings,
}: AuthControlProps) {
  const { busy, error, signOut } = useAuthActions();

  if (!enabled) {
    return (
      <span className="text-[0.6875rem] font-medium text-muted">
        Sign-in unavailable
      </span>
    );
  }

  const source = (name || email || "?").trim();
  const initial = source.charAt(0).toUpperCase() || "?";

  return (
    <div className="relative flex min-w-0 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            title={source}
            className="
              inline-flex size-11 shrink-0 items-center justify-center sm:size-8
              rounded-full transition-shadow outline-none
              hover:ring-2 hover:ring-rule-soft
              focus-visible:ring-2 focus-visible:ring-accent/40
              data-[state=open]:ring-2 data-[state=open]:ring-rule
            "
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                aria-hidden="true"
                className="size-8 rounded-full object-cover ring-1 ring-rule-soft"
              />
            ) : (
              <span
                aria-hidden="true"
                className="sidebar-avatar grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[0.625rem] font-semibold tracking-wide text-paper"
              >
                {initial}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[13rem]">
          <DropdownMenuLabel className="normal-case tracking-normal">
            <span className="block truncate text-xs font-medium text-ink">
              {name || "My workspace"}
            </span>
            <span className="block truncate text-[0.625rem] font-normal text-muted">
              {email || "Private account"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onSettings}>
            <PlainIcon name="settings" size={15} />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem danger disabled={busy} onSelect={signOut}>
            <PlainIcon name="logout" size={15} />
            {busy ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <AuthError message={error} />}
    </div>
  );
}

/**
 * Shared sign-in/sign-out actions. Dispatches the workspace-guard's custom
 * events so the header account menu and any other auth surface behave
 * identically.
 */
export function useAuthActions() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      await startGoogleSignIn();
    } catch {
      setError("Google sign-in is unavailable. Please retry shortly.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    window.dispatchEvent(new Event("ssc:auth-unavailable"));
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign-out failed");
      window.dispatchEvent(new Event("ssc:session-ended"));
    } catch {
      setError("Could not sign out. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, setError, signIn, signOut };
}

/** Paper-docked error alert, right-aligned beneath the control. */
function AuthError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="absolute right-0 top-full z-30 mt-2 flex w-64 max-w-[80vw] items-start gap-2 rounded-control border border-danger/40 bg-danger-soft p-3 text-xs text-danger shadow-pop"
    >
      <PlainIcon
        name="warning"
        size={13}
        tone="mono"
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      />
      <span className="leading-snug">{message}</span>
    </div>
  );
}
