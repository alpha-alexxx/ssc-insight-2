import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SsrfError,
  assertSafeBaseUrlShape,
  isBlockedAddress,
  parseBaseUrl,
} from "../src/lib/ai/ssrf-core";

test("loopback and private IPv4 addresses are blocked", () => {
  for (const address of [
    "127.0.0.1",
    "127.255.255.254",
    "10.0.0.1",
    "10.255.255.255",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata
    "100.64.0.1", // CGNAT
    "0.0.0.0",
    "224.0.0.1", // multicast
    "255.255.255.255", // broadcast
  ]) {
    assert.equal(isBlockedAddress(address), true, `${address} must be blocked`);
  }
});

test("public IPv4 addresses are allowed", () => {
  for (const address of ["8.8.8.8", "1.1.1.1", "104.18.32.7", "203.0.114.1"]) {
    assert.equal(
      isBlockedAddress(address),
      false,
      `${address} must be allowed`,
    );
  }
});

test("test-net ranges are blocked as non-routable", () => {
  assert.equal(isBlockedAddress("192.0.2.1"), true);
  assert.equal(isBlockedAddress("198.51.100.1"), true);
  assert.equal(isBlockedAddress("203.0.113.1"), true);
  assert.equal(isBlockedAddress("198.18.0.1"), true);
});

test("IPv6 loopback, link-local, and unique-local are blocked", () => {
  for (const address of [
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "fc00::1",
    "ff02::1",
    "2001:db8::1",
  ]) {
    assert.equal(isBlockedAddress(address), true, `${address} must be blocked`);
  }
});

test("public IPv6 addresses are allowed", () => {
  assert.equal(isBlockedAddress("2606:4700:4700::1111"), false);
  assert.equal(isBlockedAddress("2001:4860:4860::8888"), false);
});

test("IPv4-mapped IPv6 is classified by the embedded address", () => {
  assert.equal(isBlockedAddress("::ffff:127.0.0.1"), true);
  assert.equal(isBlockedAddress("::ffff:10.0.0.1"), true);
  assert.equal(isBlockedAddress("::ffff:169.254.169.254"), true);
  assert.equal(isBlockedAddress("::ffff:8.8.8.8"), false);
});

test("an unparseable address fails closed", () => {
  assert.equal(isBlockedAddress("not-an-ip"), true);
  assert.equal(isBlockedAddress(""), true);
  assert.equal(isBlockedAddress("999.1.1.1"), true);
});

test("a literal private URL is rejected on shape validation", () => {
  assert.throws(
    () => assertSafeBaseUrlShape("http://127.0.0.1:11434/v1", { allowHttp: true }),
    SsrfError,
  );
  assert.throws(
    () => assertSafeBaseUrlShape("https://169.254.169.254/latest"),
    SsrfError,
  );
  assert.throws(
    () => assertSafeBaseUrlShape("https://192.168.0.10/v1"),
    SsrfError,
  );
});

test("allowPrivate opts a local endpoint in explicitly", () => {
  assert.equal(
    assertSafeBaseUrlShape("http://127.0.0.1:11434/v1", {
      allowHttp: true,
      allowPrivate: true,
    }),
    "http://127.0.0.1:11434/v1",
  );
});

test("plain http is refused unless explicitly allowed", () => {
  assert.throws(
    () => assertSafeBaseUrlShape("http://api.example.com/v1"),
    SsrfError,
  );
  assert.equal(
    assertSafeBaseUrlShape("http://api.example.com/v1", { allowHttp: true }),
    "http://api.example.com/v1",
  );
});

test("credentials, query strings, and fragments in the URL are rejected", () => {
  assert.throws(
    () => assertSafeBaseUrlShape("https://user:pass@api.example.com/v1"),
    SsrfError,
  );
  assert.throws(
    () => assertSafeBaseUrlShape("https://api.example.com/v1?key=abc"),
    SsrfError,
  );
  assert.throws(
    () => assertSafeBaseUrlShape("https://api.example.com/v1#frag"),
    SsrfError,
  );
});

test("non-http protocols are rejected", () => {
  for (const value of [
    "file:///etc/passwd",
    "ftp://example.com/v1",
    "gopher://example.com",
    "javascript:alert(1)",
  ]) {
    assert.throws(() => parseBaseUrl(value), SsrfError, `${value} must fail`);
  }
});

test("trailing slashes are normalised away", () => {
  assert.equal(
    assertSafeBaseUrlShape("https://api.openai.com/v1///"),
    "https://api.openai.com/v1",
  );
});

test("cloud metadata hostnames are refused by name", () => {
  assert.throws(
    () => assertSafeBaseUrlShape("https://metadata.google.internal/v1"),
    SsrfError,
  );
});

test("an invalid URL is rejected with a helpful message", () => {
  assert.throws(() => parseBaseUrl("not a url"), SsrfError);
  assert.throws(() => parseBaseUrl(""), SsrfError);
});
