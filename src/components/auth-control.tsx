"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "./ui/button";

export function AuthControl({
  enabled,
  presentation = "header",
}: {
  enabled: boolean;
  presentation?: "header" | "landing";
}) {
  if (!enabled)
    return (
      <span className={presentation === "landing" ? "text-sm text-warning" : "text-xs muted"}>
        Google sign-in is not configured on this server.
      </span>
    );
  return <ConnectedAuthControl presentation={presentation} />;
}

function callbackOrigin() {
  const url = new URL(window.location.href);
  // Opening the dev server via the bind address cannot be a browser callback
  // target. The same machine is reachable at localhost.
  if (
    url.hostname === "0.0.0.0" ||
    url.hostname === "[::]" ||
    url.hostname === "::"
  )
    url.hostname = "localhost";
  return url.origin;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 12.2c0-.72-.06-1.25-.2-1.8H12v3.35h5.37a4.7 4.7 0 0 1-1.99 3.02v2.18h2.88c1.69-1.56 3.09-3.86 3.09-6.75Z"
      />
      <path
        fill="currentColor"
        opacity=".72"
        d="M12 21.7c2.63 0 4.84-.87 6.46-2.36l-2.88-2.18c-.8.54-1.83.91-3.58.91-2.53 0-4.68-1.71-5.45-4.01H3.58v2.25A9.75 9.75 0 0 0 12 21.7Z"
      />
      <path
        fill="currentColor"
        opacity=".5"
        d="M6.55 14.06A5.86 5.86 0 0 1 6.25 12c0-.72.12-1.42.3-2.06V7.69H3.58A9.7 9.7 0 0 0 2.25 12c0 1.56.37 3.04 1.33 4.31l2.97-2.25Z"
      />
      <path
        fill="currentColor"
        opacity=".86"
        d="M12 5.93c1.43 0 2.72.49 3.73 1.45l2.79-2.8A9.4 9.4 0 0 0 12 2.3a9.75 9.75 0 0 0-8.42 5.39l2.97 2.25C7.32 7.64 9.47 5.93 12 5.93Z"
      />
    </svg>
  );
}

function ConnectedAuthControl({
  presentation,
}: {
  presentation: "header" | "landing";
}) {
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
        callbackURL: `${callbackOrigin()}/auth/complete`,
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

  if (presentation === "landing") {
    return (
      <div className="flex flex-col items-start gap-3">
        {session?.user ? (
          <Button asChild>
            <Link href="/">Open your workspace</Link>
          </Button>
        ) : (
          <Button disabled={busy || isPending} onClick={signIn}>
            <GoogleMark />
            {busy
              ? "Connecting…"
              : isPending
                ? "Checking your session…"
                : "Continue with Google"}
          </Button>
        )}
        {(error || sessionError) && (
          <span role="status" className="border border-danger bg-danger-soft p-3 text-xs text-danger">
            {error || "Sign-in is unavailable. Please retry shortly."}
          </span>
        )}
      </div>
    );
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
          className="absolute right-0 top-full z-30 mt-2 w-64 max-w-[80vw] border border-rule bg-paper p-3 text-xs text-ink"
        >
          {error || "Sign-in is unavailable. Please retry shortly."}
        </span>
      )}
    </div>
  );
}
