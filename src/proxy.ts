import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { publicOrigin, publicUrl } from "@/lib/public-url";

/**
 * Next dev binds to 0.0.0.0, so the middleware's request URL and OAuth
 * exchange can otherwise redirect the browser to http://0.0.0.0:3000.
 */
function withPublicUrl(request: NextRequest) {
  const origin = publicOrigin(request);
  const internal = new URL(request.url);
  if (origin === internal.origin) return request;
  const url = new URL(request.url);
  const publicBase = new URL(origin);
  url.protocol = publicBase.protocol;
  url.host = publicBase.host;
  return new NextRequest(url, {
    method: request.method,
    headers: request.headers,
    signal: request.signal,
  });
}

function withPublicLocation(response: NextResponse, request: NextRequest) {
  const location = response.headers.get("location");
  if (!location) return response;
  try {
    const target = new URL(location, request.url);
    const internal = new URL(request.url);
    const rewrite =
      target.origin === internal.origin ||
      target.hostname === "0.0.0.0" ||
      target.hostname === "[::]" ||
      target.hostname === "::";
    if (!rewrite) return response;
    response.headers.set(
      "location",
      new URL(
        `${target.pathname}${target.search}${target.hash}`,
        publicOrigin(request),
      ).toString(),
    );
  } catch {
    // Leave malformed or external redirects untouched.
  }
  return response;
}

// The page guard improves navigation; each API independently checks its session.
export async function proxy(request: NextRequest) {
  const forwarded = withPublicUrl(request);
  try {
    const response = await auth().middleware({ loginUrl: "/sign-in" })(
      forwarded,
    );
    return withPublicLocation(response, forwarded);
  } catch {
    return NextResponse.redirect(
      publicUrl("/sign-in?error=unavailable", request),
    );
  }
}

export const config = { matcher: ["/", "/auth/complete"] };
