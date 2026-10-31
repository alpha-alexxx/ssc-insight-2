export type AccountUser = {
  id: string;
  name?: string;
  email?: string;
  image?: string | null;
};
export class SessionError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "AUTH_UNAVAILABLE",
    public status: 401 | 503,
  ) {
    super(
      code === "UNAUTHENTICATED"
        ? "Please sign in to continue."
        : "Sign-in could not be verified. Please retry.",
    );
  }
}

type LookupResult = {
  data?: { user?: AccountUser | null } | null;
  error?: unknown;
};

export async function verifiedUser(
  lookup: () => Promise<LookupResult>,
): Promise<AccountUser> {
  let result: LookupResult;
  try {
    result = await lookup();
  } catch {
    throw new SessionError("AUTH_UNAVAILABLE", 503);
  }
  if (result.error) {
    const status =
      typeof result.error === "object" && "status" in result.error
        ? result.error.status
        : null;
    if (status === 401 || status === 403)
      throw new SessionError("UNAUTHENTICATED", 401);
    throw new SessionError("AUTH_UNAVAILABLE", 503);
  }
  if (!result.data?.user?.id?.trim())
    throw new SessionError("UNAUTHENTICATED", 401);
  return result.data.user;
}
