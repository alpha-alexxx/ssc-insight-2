import "server-only";

/**
 * Server-only entry point for credential encryption. The implementation lives
 * in `crypto-core.ts` so tests can import it without pulling in the Next.js
 * server shim.
 */
export {
  CredentialCryptoError,
  credentialKey,
  decryptCredential,
  encryptCredential,
  keyHint,
  secretEquals,
} from "./crypto-core";
