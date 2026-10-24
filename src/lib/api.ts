import { NextResponse } from "next/server";
import { ZodError } from "zod";
export function ok(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}
export function apiError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
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
    return NextResponse.json(
      { error: { code: "REQUEST_ERROR", message: error.message } },
      { status: error.status },
    );
  console.error(
    "Database request failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  return NextResponse.json(
    {
      error: {
        code: "DATABASE_UNAVAILABLE",
        message:
          error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
            ? "Connect your Firebase database to start saving mocks. See README for server credential setup."
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
