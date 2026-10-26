import "server-only";

/**
 * Local development only. Neon Auth is a managed service and cannot be
 * self-hosted, so when DEV_AUTH_BYPASS=true outside production the auth
 * paths answer with a fixed Better Auth-shaped session instead of
 * contacting the managed service. Never active in production builds, and
 * never active unless the flag is explicitly set in the environment.
 */
export function devAuthBypassActive() {
  return (
    process.env.DEV_AUTH_BYPASS === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

export function devBypassUser() {
  const userId = process.env.DEV_AUTH_USER_ID?.trim() || "local-dev-user";
  return { id: userId, name: "Local Developer", email: "dev@localhost" };
}

/** Minimal Better Auth get-session payload for the local dev session. */
export function devSessionPayload() {
  const user = devBypassUser();
  const now = new Date();
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  return {
    session: {
      id: "local-dev-session",
      userId: user.id,
      token: "local-dev-token",
      expiresAt: farFuture.toISOString(),
      ipAddress: "127.0.0.1",
      userAgent: "local-dev",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: true,
      image: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  };
}
