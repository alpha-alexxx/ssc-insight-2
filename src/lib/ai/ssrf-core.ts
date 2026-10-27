import { isIP } from "node:net";

/**
 * Pure SSRF classification, kept free of `server-only` so tests can import it
 * directly (the same split as `config-core.ts` vs `config.ts`).
 *
 * The AI provider issues a server-side `fetch` to `${baseUrl}/chat/completions`.
 * Once that URL is user-controlled, the server would otherwise become a proxy
 * into private infrastructure (cloud metadata at 169.254.169.254, RFC1918
 * services, loopback admin ports). This module refuses such targets.
 */

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

/** Parses an IPv4 literal into its four octets, or null. */
function ipv4Octets(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets;
}

/**
 * Expands an IP address into bytes so v4, v4-mapped v6, and native v6 share
 * one classification path. Returns null when unparseable.
 */
function toBytes(address: string): Uint8Array | null {
  const version = isIP(address);
  if (version === 4) {
    const octets = ipv4Octets(address);
    if (!octets) return null;
    return new Uint8Array(octets);
  }
  if (version !== 6) return null;

  // Strip a zone index (fe80::1%eth0) and expand the v6 representation.
  const [head] = address.split("%");
  let text = head;

  // Embedded IPv4 tail, e.g. ::ffff:127.0.0.1
  const tailMatch = text.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (tailMatch) {
    const embedded = ipv4Octets(tailMatch[2]);
    if (!embedded) return null;
    const high = ((embedded[0] << 8) | embedded[1]).toString(16);
    const low = ((embedded[2] << 8) | embedded[3]).toString(16);
    text = `${tailMatch[1]}${high}:${low}`;
  }

  const halves = text.split("::");
  if (halves.length > 2) return null;
  const parseGroups = (chunk: string) =>
    chunk ? chunk.split(":").filter((group) => group.length > 0) : [];
  const left = parseGroups(halves[0] ?? "");
  const right = halves.length === 2 ? parseGroups(halves[1] ?? "") : [];
  const missing = 8 - left.length - right.length;
  if (halves.length === 2 && missing < 0) return null;
  if (halves.length === 1 && left.length !== 8) return null;

  const groups = [
    ...left,
    ...Array.from({ length: halves.length === 2 ? missing : 0 }, () => "0"),
    ...right,
  ];
  if (groups.length !== 8) return null;

  const bytes = new Uint8Array(16);
  for (let index = 0; index < 8; index += 1) {
    const group = groups[index];
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    const value = parseInt(group, 16);
    bytes[index * 2] = (value >> 8) & 0xff;
    bytes[index * 2 + 1] = value & 0xff;
  }
  return bytes;
}

function toInt(parts: number[]): number {
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function inV4Range(
  octets: number[],
  a: number,
  b: number,
  c: number,
  d: number,
  mask: number,
): boolean {
  const shift = 32 - mask;
  return toInt(octets) >>> shift === toInt([a, b, c, d]) >>> shift;
}

/**
 * True when the address is not a public unicast destination. Covers loopback,
 * RFC1918, link-local (cloud metadata lives here), CGNAT, multicast,
 * documentation, benchmark, and reserved/broadcast space.
 */
export function isBlockedAddress(address: string): boolean {
  const bytes = toBytes(address);
  if (!bytes) return true; // Unparseable: fail closed.

  if (bytes.length === 4) {
    const o = Array.from(bytes);
    if (inV4Range(o, 0, 0, 0, 0, 8)) return true; // 0.0.0.0/8 this network
    if (inV4Range(o, 10, 0, 0, 0, 8)) return true; // RFC1918
    if (inV4Range(o, 100, 64, 0, 0, 10)) return true; // CGNAT 100.64/10
    if (inV4Range(o, 127, 0, 0, 0, 8)) return true; // loopback
    if (inV4Range(o, 169, 254, 0, 0, 16)) return true; // link-local + metadata
    if (inV4Range(o, 172, 16, 0, 0, 12)) return true; // RFC1918
    if (inV4Range(o, 192, 0, 0, 0, 24)) return true; // IETF protocol assignments
    if (inV4Range(o, 192, 0, 2, 0, 24)) return true; // TEST-NET-1
    if (inV4Range(o, 192, 168, 0, 0, 16)) return true; // RFC1918
    if (inV4Range(o, 198, 18, 0, 0, 15)) return true; // benchmark
    if (inV4Range(o, 198, 51, 100, 0, 24)) return true; // TEST-NET-2
    if (inV4Range(o, 203, 0, 113, 0, 24)) return true; // TEST-NET-3
    if (inV4Range(o, 224, 0, 0, 0, 4)) return true; // multicast
    if (inV4Range(o, 240, 0, 0, 0, 4)) return true; // reserved + broadcast
    return false;
  }

  const b = Array.from(bytes);
  const zeroPrefix = (count: number) =>
    b.slice(0, count).every((byte) => byte === 0);

  if (zeroPrefix(15) && b[15] <= 1) return true; // :: and ::1
  if (zeroPrefix(10) && b[10] === 0xff && b[11] === 0xff) {
    return isBlockedAddress(b.slice(12).join(".")); // v4-mapped
  }
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (b[0] === 0xff) return true; // ff00::/8 multicast
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) {
    return true; // 2001:db8::/32 documentation
  }
  if (b[0] === 0x01 && b[1] === 0x00 && b.slice(2, 8).every((byte) => byte === 0)) {
    return true; // 100::/64 discard-only
  }
  return false;
}

const BLOCKED_HOSTNAMES = new Set([
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

/**
 * Structural validation of a base URL: http(s) only, no embedded credentials,
 * no query, no fragment.
 */
export function parseBaseUrl(
  value: string,
  options: { allowHttp?: boolean } = {},
): URL {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new SsrfError(
      "Enter a valid URL, for example https://api.openai.com/v1",
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new SsrfError(
      "The base URL must use https:// (or http:// for a local server).",
    );
  }
  if (url.username || url.password) {
    throw new SsrfError("Do not put credentials in the base URL.");
  }
  if (url.search || url.hash) {
    throw new SsrfError(
      "The base URL must not include a query string or fragment.",
    );
  }
  if (url.protocol === "http:" && !options.allowHttp) {
    throw new SsrfError("Plain http:// is only allowed for a local provider.");
  }
  if (BLOCKED_HOSTNAMES.has(url.hostname.toLowerCase())) {
    throw new SsrfError("That host is not allowed.");
  }
  return url;
}

/**
 * Synchronous structural + literal-address check, used on the save path so an
 * obviously bad URL is rejected before any network access. A hostname still
 * needs the async DNS check before each provider call.
 */
export function assertSafeBaseUrlShape(
  value: string,
  options: { allowHttp?: boolean; allowPrivate?: boolean } = {},
): string {
  const url = parseBaseUrl(value, options);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (!options.allowPrivate && isIP(hostname) && isBlockedAddress(hostname)) {
    throw new SsrfError("That address is private or reserved and is not allowed.");
  }
  return url.toString().replace(/\/+$/, "");
}
