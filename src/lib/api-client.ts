/**
 * Shared JSON fetch helper for the private workspace.
 *
 * Extracted from mock-form.tsx (Phase 13, maintainability): both the
 * dashboard and the mock form call the API, so the client belongs in lib/.
 * Dispatches global session events so PrivateWorkspace can react to
 * expired sessions and unavailable auth before showing stale data.
 *
 * Every failure throws an ApiError carrying the response status, the
 * envelope's machine code, and any Retry-After hint — query retry policies
 * and error surfaces key off those instead of parsing strings.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    /** Seconds the server asked the client to wait (429 rate limiting). */
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope = {
  data?: unknown;
  error?: { code?: string; message?: string };
};

/** A non-JSON body (a proxy's HTML 500, an empty 204) must surface as an
 * ApiError with the real status, not as a JSON parse crash. */
async function readEnvelope(response: Response): Promise<Envelope> {
  try {
    return (await response.json()) as Envelope;
  } catch {
    return {};
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = await readEnvelope(response);
  if (response.status === 401)
    window.dispatchEvent(new Event("ssc:session-ended"));
  const code = result.error?.code ?? "REQUEST_ERROR";
  if (code === "AUTH_UNAVAILABLE")
    window.dispatchEvent(new Event("ssc:auth-unavailable"));
  if (!response.ok) {
    const retryAfter = response.headers.get("Retry-After");
    throw new ApiError(
      result.error?.message ?? "Request failed. Please retry.",
      response.status,
      code,
      retryAfter ? Number(retryAfter) || undefined : undefined,
    );
  }
  return result.data as T;
}
