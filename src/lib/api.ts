import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AiError } from "./ai/errors";
import { SessionError } from "./auth/session-policy";
export const privateHeaders = { "Cache-Control": "private, no-store" };

function privateJson(
  body: unknown,
  init: { status: number; headers?: HeadersInit },
) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(body, { ...init, headers });
}

export function ok(data: unknown, status = 200) {
  return privateJson({ data }, { status, headers: privateHeaders });
}

/**
 * Same as ok() but allows the response to be served stale-while-revalidate.
 *
 * Data is private (per-user) so the response is always marked private. The
 * browser may reuse a cached copy for up to `maxAgeSec`, and serve a stale
 * copy while revalidating for up to `swrSec` more. Use only for GET responses
 * whose underlying data changes at most every few seconds.
 */
export function okCached(
  data: unknown,
  opts: { maxAgeSec: number; swrSec: number },
  status = 200,
) {
  const headers = new Headers(privateHeaders);
  headers.set(
    "Cache-Control",
    `private, max-age=${opts.maxAgeSec}, stale-while-revalidate=${opts.swrSec}`,
  );
  return NextResponse.json({ data }, { status, headers });
}
export function apiError(error: unknown) {
  if (error instanceof SessionError)
    return privateJson(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: privateHeaders },
    );
  // AI failures must not fall through to the database mapping below.
  if (error instanceof AiError) {
    const headers = new Headers(privateHeaders);
    if (error.retryAfterSeconds)
      headers.set("Retry-After", String(error.retryAfterSeconds));
    return privateJson(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers },
    );
  }
  if (error instanceof ZodError)
    return privateJson(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
      },
      { status: 400 },
    );
  if (error instanceof RequestError)
    return privateJson(
      { error: { code: "REQUEST_ERROR", message: error.message } },
      { status: error.status },
    );
  const prismaCode =
    error && typeof error === "object" && "code" in error ? error.code : null;
  if (prismaCode === "P2025" || prismaCode === "P2016")
    return privateJson(
      { error: { code: "NOT_FOUND", message: "Mock not found" } },
      { status: 404 },
    );
  if (prismaCode === "P2002" || prismaCode === "P2003")
    return privateJson(
      {
        error: {
          code: "CONFLICT",
          message:
            "This change conflicts with an existing record. Refresh and retry.",
        },
      },
      { status: 409 },
    );
  if (prismaCode === "P2034")
    return privateJson(
      {
        error: {
          code: "CONFLICT",
          message:
            "Data changed during the import. Review the backup and try again.",
        },
      },
      { status: 409 },
    );
  // Driver messages can contain connection details; log only safe identifiers.
  console.error("Database request failed", {
    name: error instanceof Error ? error.name : "UnknownError",
    code:
      typeof prismaCode === "string" && /^P\d{4}$/.test(prismaCode)
        ? prismaCode
        : "DATABASE_UNAVAILABLE",
  });
  return privateJson(
    {
      error: {
        code: "DATABASE_UNAVAILABLE",
        message:
          error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
            ? "Connect your Neon database to start saving mocks. See README for server configuration."
            : "Cannot reach the database. Check the server credentials and connection, then retry.",
      },
    },
    { status: 503 },
  );
}
export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function readBody(request: Request, maxBytes = 64 * 1024) {
  const origin = request.headers.get("origin");
  if (origin) {
    let originUrl: URL;
    try {
      originUrl = new URL(origin);
    } catch {
      throw new RequestError("Invalid request origin", 403);
    }
    // Next's internal URL may use the bind address (0.0.0.0), while Host
    // retains the browser's public address. Do not trust forwarded headers.
    const host = request.headers.get("host") ?? new URL(request.url).host;
    if (
      originUrl.host !== host ||
      !["http:", "https:"].includes(originUrl.protocol)
    )
      throw new RequestError("Cross-origin changes are not allowed", 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new RequestError("Use application/json", 415);
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new RequestError("Request is too large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("A JSON body is required");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new RequestError("Request is too large", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError("Invalid JSON");
  }
}
