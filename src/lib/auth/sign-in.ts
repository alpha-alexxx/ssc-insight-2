"use client";
import { authClient } from "./client";

/**
 * Where a failed Google round trip lands. The landing page is the only
 * sign-in surface, so `/` owns the error query and raises the toast; the
 * proxy and `/auth/complete` redirect here too.
 *
 * Deliberately bare: better-auth APPENDS its own `error=<provider-code>` to
 * this URL, so pre-setting `?error=oauth` would produce a duplicate key that
 * Next hands to the page as an array. The landing treats any unknown code as
 * a failed OAuth round trip instead.
 */
export const OAUTH_ERROR_PATH = "/";

/**
 * Start the Google OAuth redirect. Shared by the landing masthead/CTAs and
 * the workspace header control so both use one callback contract.
 *
 * Throws on failure; callers decide how to surface it (toast on the
 * landing, an inline popover in the workspace header).
 */
export async function startGoogleSignIn() {
  const result = await authClient.signIn.social({
    provider: "google",
    callbackURL: "/auth/complete",
    errorCallbackURL: OAUTH_ERROR_PATH,
  });
  if (result.error) throw new Error("Sign-in could not start. Please retry.");
}
