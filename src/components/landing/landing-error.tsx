"use client";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/toast";

/**
 * Failure copy for the `?error=` codes the landing can receive. Unknown values
 * fall back to the OAuth copy — better-auth appends its own provider codes
 * (`access_denied`, `invalid_code`, …) — but the value itself is never
 * rendered, since the query arrives from a URL anyone can type.
 */
const ERROR_COPY: Record<string, { title: string; detail: string }> = {
  oauth: {
    title: "Sign-in didn't complete",
    detail: "Google sign-in didn't finish. Please try again.",
  },
  unavailable: {
    title: "Sign-in unavailable",
    detail: "Sign-in is temporarily unavailable. Please retry shortly.",
  },
  session: {
    title: "Session ended",
    detail: "Your session ended. Sign in again to continue.",
  },
};

/**
 * Announces a failed OAuth/session round trip exactly once, then drops the
 * query so a reload (or a shared link) does not re-toast.
 *
 * This contract is the reason `/` can stay the only sign-in surface: the
 * proxy, `/auth/complete` and the session guard all redirect here with a
 * code, and this is the one place that turns a code into words.
 */
export function LandingError({ errorCode }: { errorCode?: string }) {
  const toast = useToast();
  const announced = useRef(false);

  useEffect(() => {
    if (announced.current || !errorCode) return;
    announced.current = true;
    const copy = ERROR_COPY[errorCode] ?? ERROR_COPY.oauth!;
    toast.error(copy.title, copy.detail);
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [errorCode, toast]);

  return null;
}
