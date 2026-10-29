"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { startGoogleSignIn } from "@/lib/auth/sign-in";
import { GoogleGlyph } from "./google-glyph";
import { PlainIcon } from "./icon";
import { Button } from "./ui/button";

/** Props for {@link AuthControl}. */
export interface AuthControlProps {
  enabled: boolean;
}

/**
 * Header auth surface. Presents three states — disabled, signed-out, and
 * signed-in — in one visual language: an identity mark (avatar or Google
 * glyph), an outline control for the primary action, and a paper-docked
 * alert for failures. All state changes route through the app's custom
 * events so the workspace guard reacts immediately.
 */
export function AuthControl({ enabled }: AuthControlProps) {
  if (!enabled) {
    return (
      <span className="text-[11px] font-medium text-muted">
        Sign-in unavailable
      </span>
    );
  }
  return <ConnectedAuthControl />;
}

function ConnectedAuthControl() {
  const {
    data: session,
    isPending,
    error: sessionError,
  } = authClient.useSession();
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

  const visibleError =
    error ||
    (sessionError ? "Sign-in is unavailable. Please retry shortly." : "");

  return (
    <div className="relative flex min-w-0 items-center gap-1.5 sm:gap-2">
      {session?.user ? (
        <SignedIn user={session.user} busy={busy} onSignOut={signOut} />
      ) : (
        <SignedOut busy={busy} pending={isPending} onSignIn={signIn} />
      )}
      {visibleError && <AuthError message={visibleError} />}
    </div>
  );
}

/** Signed-in identity chip + a quiet sign-out control. */
function SignedIn({
  user,
  busy,
  onSignOut,
}: {
  user: { name?: string | null; email?: string | null };
  busy: boolean;
  onSignOut: () => void;
}) {
  const source = (user.name ?? user.email ?? "?").trim();
  const initial = source.charAt(0).toUpperCase() || "?";

  return (
    <>
      <span
        aria-hidden
        className="hidden size-7 shrink-0 items-center justify-center rounded-pill border border-rule-soft bg-soft text-[11px] font-semibold tabular-nums text-ink sm:inline-flex"
        title={source}
      >
        {initial}
      </span>
      <span
        className="hidden max-w-32 truncate text-xs font-medium text-ink md:inline"
        title={user.name ?? undefined}
      >
        {user.name ?? user.email}
      </span>
      <Button variant="outline" size="sm" disabled={busy} onClick={onSignOut}>
        {busy ? "Signing out…" : "Sign out"}
      </Button>
    </>
  );
}

/** Signed-out call to action, with an inline Google glyph. */
function SignedOut({
  busy,
  pending,
  onSignIn,
}: {
  busy: boolean;
  pending: boolean;
  onSignIn: () => void;
}) {
  const loading = busy || pending;
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={onSignIn}
      aria-label="Continue with Google"
    >
      {loading ? (
        <>
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-accent motion-safe:animate-pulse"
          />
          <span>{busy ? "Connecting…" : "Checking…"}</span>
        </>
      ) : (
        <>
          <GoogleGlyph />
          <span className="hidden sm:inline">Continue with Google</span>
        </>
      )}
    </Button>
  );
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
