import { test } from "node:test";
import assert from "node:assert/strict";
import { readBody, apiError, RequestError } from "../src/lib/api";
function req(body: string, origin = "http://localhost:3000") {
  return new Request("http://0.0.0.0:3000/api/mock-attempts", {
    method: "POST",
    headers: {
      Host: "localhost:3000",
      Origin: origin,
      "Content-Type": "application/json",
    },
    body,
  });
}
test("same-origin validation supports bind address and rejects foreign origin", async () => {
  assert.deepEqual(await readBody(req('{"valid":true}')), { valid: true });
  await assert.rejects(
    readBody(req("{}", "https://other.example")),
    (e) => e instanceof RequestError && e.status === 403,
  );
});
test("streamed size limit and malformed JSON are rejected", async () => {
  await assert.rejects(
    readBody(req('"12345"'), 3),
    (e) => e instanceof RequestError && e.status === 413,
  );
  await assert.rejects(
    readBody(req("broken")),
    (e) => e instanceof RequestError && e.status === 400,
  );
});
test("database failure uses a recoverable response without leaking internals", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const response = apiError(new Error("internal credentials secret"));
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.error.code, "DATABASE_UNAVAILABLE");
    assert.ok(!JSON.stringify(body).includes("secret"));
  } finally {
    console.error = original;
  }
});
