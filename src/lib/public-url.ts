/**
 * Next dev binds to 0.0.0.0, so `request.url` can contain the bind address
 * instead of the host the browser used. Redirects must preserve the public
 * Host header or users land on http://0.0.0.0:3000 after OAuth.
 */
export function publicOrigin(request: Request) {
  const internal = new URL(request.url);
  const host = request.headers.get("host")?.trim();
  if (!host) return internal.origin;
  const forwarded = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwarded === "http" || forwarded === "https"
      ? `${forwarded}:`
      : internal.protocol;
  try {
    const candidate = new URL(`${protocol}//${host}`);
    // Host must be an authority only: no credentials, path, query, or hash.
    if (
      candidate.username ||
      candidate.password ||
      candidate.pathname !== "/" ||
      candidate.search ||
      candidate.hash
    )
      return internal.origin;
    return candidate.origin;
  } catch {
    return internal.origin;
  }
}

export function publicUrl(path: string, request: Request) {
  return new URL(path, publicOrigin(request));
}
