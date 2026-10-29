import { test } from "node:test";
import assert from "node:assert/strict";
import { publicOrigin, publicUrl } from "../src/lib/public-url";

function request(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

test("redirects preserve the browser host instead of the bind address", () => {
  const local = request("http://0.0.0.0:3000/auth/complete", {
    host: "localhost:3000",
  });
  assert.equal(publicOrigin(local), "http://localhost:3000");
  assert.equal(publicUrl("/", local).toString(), "http://localhost:3000/");
  assert.equal(
    publicUrl("/?error=unavailable", local).toString(),
    "http://localhost:3000/?error=unavailable",
  );

  const lan = request("http://0.0.0.0:3000/", {
    host: "192.168.1.25:3000",
  });
  assert.equal(publicOrigin(lan), "http://192.168.1.25:3000");

  const proxied = request("http://internal:3000/", {
    host: "sscinsight-lovat.vercel.app",
    "x-forwarded-proto": "https",
  });
  assert.equal(publicOrigin(proxied), "https://sscinsight-lovat.vercel.app");
});

test("public URL falls back when Host is missing or malformed", () => {
  const missing = request("http://0.0.0.0:3000/auth/complete");
  assert.equal(publicOrigin(missing), "http://0.0.0.0:3000");

  const credentials = request("http://0.0.0.0:3000/", {
    host: "evil.example@trusted.example",
  });
  assert.equal(publicOrigin(credentials), "http://0.0.0.0:3000");

  const path = request("http://0.0.0.0:3000/", {
    host: "localhost:3000/not-a-host",
  });
  assert.equal(publicOrigin(path), "http://0.0.0.0:3000");

  const ipv6 = request("http://0.0.0.0:3000/", { host: "[::1]:3000" });
  assert.equal(publicOrigin(ipv6), "http://[::1]:3000");
});
