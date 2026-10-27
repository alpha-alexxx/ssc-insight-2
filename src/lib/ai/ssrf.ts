import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { SsrfError, isBlockedAddress, parseBaseUrl } from "./ssrf-core";

export { SsrfError, isBlockedAddress } from "./ssrf-core";
export { assertSafeBaseUrlShape } from "./ssrf-core";

/**
 * DNS-resolving SSRF check. Must run immediately before each provider call,
 * because the literal check alone cannot see hostnames pointing at private
 * addresses (`internal.example.com -> 10.0.0.5`).
 *
 * Residual risk, stated honestly: a DNS-rebinding attacker can answer with a
 * public address for our check and a private one for the provider's own
 * resolution. Closing that fully requires pinning the resolved IP through a
 * custom undici dispatcher. This guard raises the bar substantially but should
 * not be described as complete TOCTOU protection.
 */
export async function assertSafeBaseUrl(
  value: string,
  options: { allowHttp?: boolean; allowPrivate?: boolean } = {},
): Promise<string> {
  const url = parseBaseUrl(value, options);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  if (options.allowPrivate) {
    return url.toString().replace(/\/+$/, "");
  }

  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new SsrfError(
        "That address is private or reserved and is not allowed.",
      );
    }
    return url.toString().replace(/\/+$/, "");
  }

  let resolved: { address: string }[];
  try {
    resolved = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SsrfError("That host could not be resolved.");
  }
  if (!resolved.length) {
    throw new SsrfError("That host could not be resolved.");
  }
  // Every resolved address must be public; a hostname answering with even one
  // private record is rejected rather than raced.
  for (const record of resolved) {
    if (isBlockedAddress(record.address)) {
      throw new SsrfError("That host resolves to a private or reserved address.");
    }
  }
  return url.toString().replace(/\/+$/, "");
}
