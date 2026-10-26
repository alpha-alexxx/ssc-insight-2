import "server-only";
import {
  apiRateLimiter,
  clientIp,
  rateLimitHeaders,
  rateLimitKey,
  writeRateLimiter,
  type RateLimitResult,
} from "./rate-limit";
import { RequestError } from "./api";

/**
 * Apply rate limiting to an API request. Returns the rate-limit result so the
 * caller can attach the X-RateLimit-* headers to the response. Throws
 * RequestError(429) when the bucket is exhausted.
 *
 * @param request The incoming Request (used to derive the client IP).
 * @param userId  The authenticated user id (preferred) or undefined.
 * @param kind    "read" (default) for GET; "write" for POST/PUT/PATCH/DELETE.
 */
export function enforceRateLimit(
  request: Request,
  userId: string | undefined,
  kind: "read" | "write" = "read",
): RateLimitResult {
  const ip = clientIp(request);
  const key = rateLimitKey({ userId, ip });
  const limiter = kind === "write" ? writeRateLimiter : apiRateLimiter;
  const result = limiter.consume(key);
  if (!result.allowed) {
    throw new RequestError("Too many requests. Slow down and retry.", 429);
  }
  return result;
}

/** Convert a rate-limit result into X-RateLimit-* headers for the response. */
export function rateLimitHeadersFor(result: RateLimitResult): HeadersInit {
  return rateLimitHeaders(result);
}
