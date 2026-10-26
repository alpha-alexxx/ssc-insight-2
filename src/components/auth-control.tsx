"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { PlainIcon } from "./icon";
import { Button } from "./ui/button";

export function AuthControl({ enabled }: { enabled: boolean }) {
  if (!enabled)
    return <span className="text-xs muted">Sign-in unavailable</span>;
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
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/auth/complete",
        errorCallbackURL: "/sign-in?error=oauth",
      });
      if (result.error)
        throw new Error("Sign-in could not start. Please retry.");
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

  return (
    <div className="relative flex items-center gap-2 min-w-0">
      {session?.user ? (
        <>
          <span
            className="hidden md:block max-w-32 truncate text-xs"
            title={session.user.name}
          >
            {session.user.name}
          </span>
          <Button variant="outline" size="sm" disabled={busy} onClick={signOut}>
            Sign out
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={busy || isPending}
          onClick={signIn}
        >
          {busy
            ? "Connecting…"
            : isPending
              ? "Checking session…"
              : "Continue with Google"}
        </Button>
      )}
      {(error || sessionError) && (
        <span
          role="status"
          className="absolute right-0 top-full z-30 mt-2 w-64 max-w-[80vw] border border-danger/50 bg-danger-soft text-danger rounded-control shadow-pop p-3 text-xs flex items-start gap-2"
        >
          <PlainIcon name="warning" size={13} tone="mono" className="shrink-0 mt-0.5" />
          {error || "Sign-in is unavailable. Please retry shortly."}
        </span>
      )}
    </div>
  );
}
