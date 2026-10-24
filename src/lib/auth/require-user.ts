import "server-only";
import { auth } from "./server";
import { verifiedUser } from "./session-policy";

export function requireUser() {
  return verifiedUser(() =>
    auth().getSession({ query: { disableCookieCache: "true" } }),
  );
}
