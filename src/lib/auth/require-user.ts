import "server-only";
import { auth } from "./server";
import { verifiedUser } from "./session-policy";
import { devAuthBypassActive, devBypassUser } from "./dev-bypass";

export function requireUser() {
  if (devAuthBypassActive()) return Promise.resolve(devBypassUser());
  return verifiedUser(() =>
    auth().getSession({ query: { disableCookieCache: "true" } }),
  );
}
