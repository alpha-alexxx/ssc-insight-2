import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CredentialCryptoError,
  credentialKey,
  decryptCredential,
  encryptCredential,
  keyHint,
  secretEquals,
} from "../src/lib/ai/crypto-core";

const SECRET_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

test("a round trip returns the original key", () => {
  const key = credentialKey(SECRET_HEX);
  const plaintext = "sk-proj-abcdef1234567890";
  const envelope = encryptCredential(plaintext, key);
  assert.equal(decryptCredential(envelope, key), plaintext);
});

test("the envelope never contains the plaintext", () => {
  const key = credentialKey(SECRET_HEX);
  const plaintext = "sk-super-secret-value";
  const envelope = encryptCredential(plaintext, key);
  assert.equal(envelope.includes(plaintext), false);
  assert.equal(envelope.startsWith("v1."), true);
  assert.equal(envelope.split(".").length, 4);
});

test("encryption is randomised: same input, different ciphertext", () => {
  const key = credentialKey(SECRET_HEX);
  const a = encryptCredential("sk-same", key);
  const b = encryptCredential("sk-same", key);
  assert.notEqual(a, b);
  assert.equal(decryptCredential(a, key), "sk-same");
  assert.equal(decryptCredential(b, key), "sk-same");
});

test("a different secret cannot decrypt", () => {
  const key = credentialKey(SECRET_HEX);
  const otherKey = credentialKey(
    "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
  );
  const envelope = encryptCredential("sk-secret", key);
  assert.throws(() => decryptCredential(envelope, otherKey), CredentialCryptoError);
});

test("tampered ciphertext fails authentication instead of returning bytes", () => {
  const key = credentialKey(SECRET_HEX);
  const envelope = encryptCredential("sk-secret", key);
  const parts = envelope.split(".");
  // Flip the last character of the ciphertext segment.
  const last = parts[3];
  const flipped =
    last.slice(0, -1) + (last.endsWith("A") ? "B" : "A");
  const tampered = [parts[0], parts[1], parts[2], flipped].join(".");
  assert.throws(() => decryptCredential(tampered, key), CredentialCryptoError);
});

test("malformed envelopes are rejected", () => {
  const key = credentialKey(SECRET_HEX);
  assert.throws(() => decryptCredential("", key), CredentialCryptoError);
  assert.throws(() => decryptCredential("v1.only", key), CredentialCryptoError);
  assert.throws(
    () => decryptCredential("v2.a.b.c", key),
    CredentialCryptoError,
    "an unknown version must not be parsed as v1",
  );
});

test("a missing or weak secret is refused rather than silently used", () => {
  assert.throws(() => credentialKey(undefined), CredentialCryptoError);
  assert.throws(() => credentialKey(""), CredentialCryptoError);
  assert.throws(() => credentialKey("short"), CredentialCryptoError);
});

test("a passphrase secret is hashed to a usable 32-byte key", () => {
  const passphrase = "a-long-enough-passphrase-for-dev-use";
  const key = credentialKey(passphrase);
  assert.equal(key.length, 32);
  const envelope = encryptCredential("sk-value", key);
  assert.equal(decryptCredential(envelope, key), "sk-value");
});

test("the key hint shows only the last four characters", () => {
  assert.equal(keyHint("sk-abcdef1234"), "…1234");
  // Five characters is enough to show a suffix.
  assert.equal(keyHint("short"), "…hort");
  // Four or fewer cannot hide anything, so nothing is revealed.
  assert.equal(keyHint("abcd"), "…");
  assert.equal(keyHint(""), "…");
});

test("secretEquals compares without leaking length differences", () => {
  assert.equal(secretEquals("abc", "abc"), true);
  assert.equal(secretEquals("abc", "abd"), false);
  assert.equal(secretEquals("abc", "abcd"), false);
});
