import { test } from "node:test";
import assert from "node:assert/strict";
import { apiError } from "../src/lib/api";

test("Prisma record errors return safe status codes without ORM details", async () => {
  for (const [code, status] of [
    ["P2025", 404],
    ["P2016", 404],
    ["P2002", 409],
    ["P2003", 409],
  ] as const) {
    const response = apiError({
      code,
      message: "secret SQL table and connection URL",
      meta: { cause: "secret" },
    });
    assert.equal(response.status, status);
    assert.ok(!JSON.stringify(await response.json()).includes("secret"));
  }
});

test("missing Neon configuration returns safe configuration guidance", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const response = apiError(new Error("DATABASE_NOT_CONFIGURED"));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error.message, /Neon/);
  } finally {
    console.error = original;
  }
});
