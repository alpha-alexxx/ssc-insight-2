import "server-only";
import { database } from "../db";
import {
  CredentialCryptoError,
  credentialKey,
  decryptCredential,
  encryptCredential,
  keyHint,
} from "./crypto";
import { assertSafeBaseUrlShape } from "./ssrf-core";

/**
 * Per-user AI credentials.
 *
 * Security properties this module enforces:
 *  - The plaintext API key is encrypted (AES-256-GCM) before it reaches the
 *    database and is NEVER returned to a client, logged, or put in a backup.
 *  - `getAiCredential` is the only decrypting read and is server-internal.
 *  - `describeAiCredential` is the client-facing read and exposes only a
 *    provider label, model, base URL, and a 4-character key hint.
 *  - Base URLs are shape-validated on write; the DNS-resolving SSRF check runs
 *    again immediately before each provider call.
 */

export type AiCredentialInput = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey?: string | null;
  jsonMode?: boolean;
  allowHttp?: boolean;
  allowPrivate?: boolean;
};

/** Client-safe description. Contains no secret material. */
export type AiCredentialSummary = {
  configured: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  keyHint: string | null;
  jsonMode: boolean;
  allowHttp: boolean;
  allowPrivate: boolean;
  updatedAt: string | null;
};

const HINT_PLACEHOLDER = "…";

function encryptionKey() {
  return credentialKey(process.env.AI_CREDENTIAL_SECRET);
}

export function credentialStorageAvailable(): boolean {
  try {
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}

export async function describeAiCredential(
  userId: string,
): Promise<AiCredentialSummary | null> {
  const row = await database().aiCredential.findUnique({
    where: { userId },
    select: {
      provider: true,
      baseUrl: true,
      model: true,
      keyHint: true,
      jsonMode: true,
      allowHttp: true,
      allowPrivate: true,
      updatedAt: true,
    },
  });
  if (!row) return null;
  return {
    configured: true,
    provider: row.provider,
    baseUrl: row.baseUrl,
    model: row.model,
    keyHint: row.keyHint || null,
    jsonMode: row.jsonMode,
    allowHttp: row.allowHttp,
    allowPrivate: row.allowPrivate,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Decrypting read for server use only. Returns null when no row exists or the
 * stored ciphertext cannot be opened (wrong/rotated secret), so AI degrades to
 * "not configured" instead of throwing on every request.
 */
export async function getAiCredential(userId: string) {
  const row = await database().aiCredential.findUnique({
    where: { userId },
    select: {
      provider: true,
      baseUrl: true,
      apiKeyEnc: true,
      model: true,
      jsonMode: true,
      allowHttp: true,
      allowPrivate: true,
    },
  });
  if (!row) return null;
  let apiKey: string;
  try {
    apiKey = decryptCredential(row.apiKeyEnc, encryptionKey());
  } catch (error) {
    if (error instanceof CredentialCryptoError) return null;
    throw error;
  }
  return {
    provider: row.provider,
    baseUrl: row.baseUrl,
    apiKey,
    model: row.model,
    jsonMode: row.jsonMode,
    allowHttp: row.allowHttp,
    allowPrivate: row.allowPrivate,
  };
}

/**
 * Create or replace a user's credential.
 *
 * `apiKey` omitted/empty keeps the stored key (so the UI can change model or
 * base URL without re-entering the secret). Passing an explicit empty string is
 * treated the same way; use `deleteAiCredential` to remove it.
 */
export async function saveAiCredential(
  userId: string,
  input: AiCredentialInput,
): Promise<AiCredentialSummary> {
  const baseUrl = assertSafeBaseUrlShape(input.baseUrl, {
    allowHttp: input.allowHttp ?? false,
    allowPrivate: input.allowPrivate ?? false,
  });

  const existing = await database().aiCredential.findUnique({
    where: { userId },
    select: { apiKeyEnc: true, keyHint: true },
  });

  const providedKey = input.apiKey?.trim() ?? "";
  let apiKeyEnc: string;
  let keyHintValue: string;

  if (providedKey) {
    apiKeyEnc = encryptCredential(providedKey, encryptionKey());
    keyHintValue = keyHint(providedKey);
  } else if (existing) {
    // Keep the existing secret untouched.
    apiKeyEnc = existing.apiKeyEnc;
    keyHintValue = existing.keyHint;
  } else {
    throw new CredentialCryptoError("An API key is required the first time.");
  }

  const row = await database().aiCredential.upsert({
    where: { userId },
    create: {
      userId,
      provider: input.provider,
      baseUrl,
      model: input.model,
      apiKeyEnc,
      keyHint: keyHintValue,
      jsonMode: input.jsonMode ?? true,
      allowHttp: input.allowHttp ?? false,
      allowPrivate: input.allowPrivate ?? false,
    },
    update: {
      provider: input.provider,
      baseUrl,
      model: input.model,
      apiKeyEnc,
      keyHint: keyHintValue,
      jsonMode: input.jsonMode ?? true,
      allowHttp: input.allowHttp ?? false,
      allowPrivate: input.allowPrivate ?? false,
    },
    select: {
      provider: true,
      baseUrl: true,
      model: true,
      keyHint: true,
      jsonMode: true,
      allowHttp: true,
      allowPrivate: true,
      updatedAt: true,
    },
  });

  return {
    configured: true,
    provider: row.provider,
    baseUrl: row.baseUrl,
    model: row.model,
    keyHint: row.keyHint || null,
    jsonMode: row.jsonMode,
    allowHttp: row.allowHttp,
    allowPrivate: row.allowPrivate,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteAiCredential(userId: string): Promise<void> {
  await database().aiCredential.deleteMany({ where: { userId } });
}

export { HINT_PLACEHOLDER };
