import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bypassesMaintenance,
  classifyPath,
  maintenanceActive,
  maintenanceRetryAfter,
  newRequestId,
  sameOrigin,
  safeNextPath,
  UNSAFE_METHODS,
} from "../src/lib/middleware-utils";

test("classifyPath separates pages from APIs and assigns access levels", () => {
  // Private workspace page
  assert.deepEqual(classifyPath("/"), { area: "page", route: "private" });

  // Public pages
  assert.deepEqual(classifyPath("/sign-in"), { area: "page", route: "public" });
  assert.deepEqual(classifyPath("/sign-in/extra"), {
    area: "page",
    route: "public",
  });
  assert.deepEqual(classifyPath("/maintenance"), {
    area: "page",
    route: "public",
  });

  // Auth flow: API handler and completion page are never gated
  assert.deepEqual(classifyPath("/api/auth/get-session"), {
    area: "api",
    route: "auth",
  });
  assert.deepEqual(classifyPath("/auth/complete"), {
    area: "page",
    route: "auth",
  });

  // Health is its own class (public, never throttled or gated)
  assert.deepEqual(classifyPath("/api/health"), {
    area: "api",
    route: "health",
  });

  // Data APIs are private by default
  assert.deepEqual(classifyPath("/api/mock-attempts"), {
    area: "api",
    route: "private",
  });
  assert.deepEqual(classifyPath("/api/mock-attempts/abc"), {
    area: "api",
    route: "private",
  });
  assert.deepEqual(classifyPath("/api/unknown-endpoint"), {
    area: "api",
    route: "private",
  });
  // Prefix collisions must not leak into another class
  assert.deepEqual(classifyPath("/api/healthcheck-evil"), {
    area: "api",
    route: "private",
  });
  assert.deepEqual(classifyPath("/api/authentication-attempt"), {
    area: "api",
    route: "private",
  });
});

test("sameOrigin blocks cross-origin writes and accepts first-party traffic", () => {
  const host = "ssc.example";
  assert.equal(sameOrigin(`https://${host}`, host), true);
  assert.equal(sameOrigin(`http://${host}`, host), true);
  assert.equal(sameOrigin("https://evil.example", host), false);
  // Protocol trickery must fail closed
  assert.equal(sameOrigin("javascript:alert(1)", host), false);
  assert.equal(sameOrigin("not a url", host), false);
  // Missing headers: no Origin = non-browser client (allowed), no Host = reject
  assert.equal(sameOrigin(null, host), true);
  assert.equal(sameOrigin("https://ssc.example", null), false);
  // Scheme downgrades are still same-host but http→https mismatch on protocol
  // is intentionally allowed at host level (edge terminates TLS).
  assert.equal(sameOrigin(`http://${host}`, host), true);
});

test("UNSAFE_METHODS covers exactly the state-changing verbs", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.ok(UNSAFE_METHODS.has(method), `${method} should be unsafe`);
  }
  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    assert.ok(!UNSAFE_METHODS.has(method), `${method} should be safe`);
  }
});

test("maintenance flag parsing is strict and case-insensitive", () => {
  assert.equal(maintenanceActive({ MAINTENANCE_MODE: "1" }), true);
  assert.equal(maintenanceActive({ MAINTENANCE_MODE: "true" }), true);
  assert.equal(maintenanceActive({ MAINTENANCE_MODE: " YES " }), true);
  assert.equal(maintenanceActive({ MAINTENANCE_MODE: "on" }), true);
  assert.equal(maintenanceActive({ MAINTENANCE_MODE: "0" }), false);
  assert.equal(maintenanceActive({ MAINTENANCE_MODE: "false" }), false);
  assert.equal(maintenanceActive({}), false);
  assert.equal(maintenanceActive({ MAINTENANCE_MODE: "" }), false);
  // Garbage values fail closed
  assert.equal(maintenanceActive({ MAINTENANCE_MODE: "enabled" }), false);
});

test("maintenance Retry-After honors config and falls back to one hour", () => {
  assert.equal(maintenanceRetryAfter({ MAINTENANCE_RETRY_AFTER: "1800" }), 1800);
  assert.equal(maintenanceRetryAfter({}), 3600);
  assert.equal(maintenanceRetryAfter({ MAINTENANCE_RETRY_AFTER: "NaN" }), 3600);
  assert.equal(maintenanceRetryAfter({ MAINTENANCE_RETRY_AFTER: "-5" }), 3600);
  assert.equal(maintenanceRetryAfter({ MAINTENANCE_RETRY_AFTER: "1.9" }), 1);
});

test("maintenance bypass keeps health, auth flow, sign-in and the page itself reachable", () => {
  for (const path of [
    "/maintenance",
    "/maintenance/",
    "/api/health",
    "/api/auth/get-session",
    "/auth/complete",
    "/sign-in",
    "/sign-in/",
  ]) {
    assert.equal(bypassesMaintenance(path), true, `${path} should bypass`);
  }
  for (const path of ["/", "/api/mock-attempts", "/api/analytics", "/anything"]) {
    assert.equal(bypassesMaintenance(path), false, `${path} should be gated`);
  }
});

test("safeNextPath only allows root-relative, protocol-relative-free paths", () => {
  assert.equal(safeNextPath("/"), "/");
  assert.equal(safeNextPath("/history"), "/history");
  assert.equal(safeNextPath("/history?view=quant"), "/history?view=quant");
  // Open-redirect classics
  assert.equal(safeNextPath("https://evil.example"), null);
  assert.equal(safeNextPath("//evil.example"), null);
  assert.equal(safeNextPath("/\\evil.example"), null);
  // A query value that LOOKS like a protocol-relative URL is still a
  // root-relative location — browsers never reinterpret query strings,
  // so host-level safety is all this function guarantees.
  assert.equal(safeNextPath("/redirect?url=//evil.example"), "/redirect?url=//evil.example");
  assert.equal(safeNextPath("javascript:alert(1)"), null);
  assert.equal(safeNextPath("/path\\back"), null);
  assert.equal(safeNextPath("/with\nnewline"), null);
  assert.equal(safeNextPath(""), null);
  assert.equal(safeNextPath(null), null);
  assert.equal(safeNextPath(undefined), null);
  assert.equal(safeNextPath("relative-path"), null);
  assert.equal(safeNextPath(`/${"x".repeat(600)}`), null);
});

test("newRequestId yields unique UUID-shaped ids", () => {
  const a = newRequestId();
  const b = newRequestId();
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f-]{36}$/);
});
