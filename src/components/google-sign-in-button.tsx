"use client";

import { useState } from "react";
import { startGoogleSignIn } from "@/lib/auth/sign-in";
import { GoogleGlyph } from "./google-glyph";
import { useToast } from "./toast";
import { Button } from "./ui/button";

/** Props for {@link GoogleSignInButton}. */
export interface GoogleSignInButtonProps {
  /** False when `GOOGLE_AUTH_ENABLED` is off; renders a disabled notice. */
  enabled: boolean;
  /** Full label. `compactLabel` replaces it below `sm`. */
  label: string;
  compactLabel?: string;
  ariaLabel?: string;
  variant?: "default" | "outline";
  size?: "sm" | "default";
  className?: string;
}

/**
 * Google sign-in affordance for the public landing page.
 *
 * The landing is server-gated to anonymous visitors (`app/page.tsx`), so this
 * deliberately does not call `useSession()` — that would only add a pending
 * flash. Failures surface as a toast, because a failed OAuth round trip
 * returns to `/` with `?error=oauth` and the button may be off-screen.
 */
export function GoogleSignInButton({
  enabled,
  label,
  compactLabel,
  ariaLabel,
  variant = "default",
  size = "default",
  className,
}: GoogleSignInButtonProps) {
  const { error } = useToast();
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return (
      <Button variant="outline" size={size} disabled className={className}>
        Sign-in unavailable
      </Button>
    );
  }

  async function signIn() {
    setBusy(true);
    try {
      await startGoogleSignIn();
    } catch {
      error(
        "Sign-in didn't complete",
        "Google sign-in is unavailable. Please retry shortly.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      disabled={busy}
      aria-busy={busy || undefined}
      aria-label={ariaLabel ?? label}
      onClick={signIn}
      className={className}
    >
      {busy ? (
        <>
          <span
            aria-hidden
            className="size-1.5 rounded-pill bg-current motion-safe:animate-pulse"
          />
          <span>Connecting…</span>
        </>
      ) : (
        <>
          <GoogleGlyph />
          {compactLabel ? (
            <>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{compactLabel}</span>
            </>
          ) : (
            <span>{label}</span>
          )}
        </>
      )}
    </Button>
  );
}
