/**
 * Credential encryption for user-supplied AI API keys.
 *
 * Keys are encrypted with AES-256-GCM before they touch the database, so a
 * database-only leak (branch dump, backup, mis-scoped query) yields ciphertext
 * without the separate `AI_CREDENTIAL_SECRET`. This does NOT defend against a
 * full application compromise — an attacker who can run code server-side can
 * read both the key and the plaintext.
 *
 * Format: v1.<iv-b64url>.<tag-b64url>.<ciphertext-b64url>
 * The version prefix allows a future re-key without guessing at legacy rows.
 *
 * Kept free of the `server-only` marker so tests can import it directly (the
 * same split as `config-core.ts` vs `config.ts`); `crypto.ts` re-exports it
 * behind the server guard.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM-recommended size
const KEY_BYTES = 32; // AES-256
const TAG_BYTES = 16;

export class CredentialCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialCryptoError";
  }
}

/**
 * Derives the encryption key from the environment secret.
 *
 * A 64-character hex string is accepted as a raw 32-byte key; any other
 * non-empty value is used as a passphrase and hashed to 32 bytes. Requiring a
 * minimum length stops a one-character secret from silently "working".
 */
export function credentialKey(secret: string | undefined): Buffer {
  const value = secret?.trim() ?? "";
  if (!value) {
    throw new CredentialCryptoError(
      "AI_CREDENTIAL_SECRET is not set; user AI credentials cannot be stored.",
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, "hex");
  }
  if (value.length < 32) {
    throw new CredentialCryptoError(
      "AI_CREDENTIAL_SECRET must be at least 32 characters, or 64 hex characters.",
    );
  }
  // Hash the passphrase to a fixed 32-byte key. Domain-separated so the same
  // secret used elsewhere cannot collide.
  return createHash("sha256")
    .update("ssc-insight:ai-credential:v1\0")
    .update(value, "utf8")
    .digest();
}

function b64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

export function encryptCredential(plaintext: string, key: Buffer): string {
  if (!plaintext) throw new CredentialCryptoError("Nothing to encrypt.");
  if (key.length !== KEY_BYTES) {
    throw new CredentialCryptoError("Encryption key must be 32 bytes.");
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    b64url(iv),
    b64url(tag),
    b64url(ciphertext),
  ].join(".");
}

export function decryptCredential(payload: string, key: Buffer): string {
  if (key.length !== KEY_BYTES) {
    throw new CredentialCryptoError("Encryption key must be 32 bytes.");
  }
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new CredentialCryptoError("Unrecognised credential format.");
  }
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ciphertext = Buffer.from(parts[3], "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new CredentialCryptoError("Corrupt credential envelope.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_BYTES,
  });
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Authentication failed: wrong key or tampered ciphertext. Never fall
    // back to the unauthenticated bytes.
    throw new CredentialCryptoError("Credential failed authentication.");
  }
}

/**
 * A short, non-reversible hint for display. Shows only the last 4 characters,
 * so a user can recognise which key is stored without exposing it.
 */
export function keyHint(plaintext: string): string {
  const trimmed = plaintext.trim();
  if (trimmed.length <= 4) return "…";
  return `…${trimmed.slice(-4)}`;
}

/** Constant-time comparison for any secret equality check. */
export function secretEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
