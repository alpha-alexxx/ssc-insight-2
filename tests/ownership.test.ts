import { test } from "node:test";
import assert from "node:assert/strict";
import { verifiedUser, SessionError } from "../src/lib/auth/session-policy";
import { apiError, ok } from "../src/lib/api";
import { attemptSchema } from "../src/lib/domain";

test("session guard derives identity only from a verified session", async () => {
  const user = { id: "verified-user", email: "private@example.com" };
  assert.equal(await verifiedUser(async () => ({ data: { user } })), user);
  for (const result of [
    {},
    { data: null },
    { data: { user: null } },
    { data: { user: { id: " " } } },
    { error: { status: 401 } },
    { error: { status: 403 } },
  ]) {
    await assert.rejects(
      verifiedUser(async () => result),
      (e: unknown) =>
        e instanceof SessionError &&
        e.status === 401 &&
        e.code === "UNAUTHENTICATED",
    );
  }
});

test("authentication outages fail closed with sanitized 503", async () => {
  for (const lookup of [
    async () => {
      throw new Error("secret upstream URL");
    },
    async () => ({ error: { status: 500, message: "secret" } }),
  ]) {
    await assert.rejects(
      verifiedUser(lookup),
      (e: unknown) =>
        e instanceof SessionError &&
        e.status === 503 &&
        e.code === "AUTH_UNAVAILABLE" &&
        !e.message.includes("secret"),
    );
  }
});

test("personalized success and authentication errors cannot be cached", async () => {
  for (const response of [
    ok({ private: true }),
    apiError(new SessionError("UNAUTHENTICATED", 401)),
    apiError(new SessionError("AUTH_UNAVAILABLE", 503)),
  ]) {
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
});

test("forged ownership is stripped from manual and backup attempt inputs", () => {
  const result = attemptSchema.parse({
    userId: "victim",
    name: "Practice",
    platform: "Testbook",
    type: "subject",
    completedAt: "2026-10-24T00:00:00.000Z",
    subjects: [
      {
        subjectId: "quant",
        questions: 15,
        correct: 1,
        incorrect: 0,
        userId: "victim",
      },
    ],
  });
  assert.ok(!("userId" in result));
  assert.ok(!("userId" in result.subjects[0]));
});
