import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.APP_URL ?? "http://localhost:3000";
const cookies = [
  process.env.TEST_SESSION_COOKIE,
  process.env.TEST_OTHER_SESSION_COOKIE,
];
if (cookies.some((c) => !c))
  throw new Error(
    "Two real disposable QA session cookies are required. Never use production accounts.",
  );
const marker = `Private isolation QA ${randomUUID()}`;
const created = [new Set(), new Set()];
const original = [];
async function raw(user, path, method = "GET", body) {
  const r = await fetch(base + path, {
    method,
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      ...(user === null ? {} : { Cookie: cookies[user] }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.match(r.headers.get("cache-control") ?? "", /private.*no-store/);
  return r;
}
async function api(user, path, method = "GET", body) {
  const r = await raw(user, path, method, body);
  const j = await r.json();
  assert.ok(r.ok, `${method} ${path}: ${r.status} ${j.error?.code}`);
  return j.data;
}
const input = {
  name: marker,
  platform: marker,
  type: "subject",
  completedAt: "2026-10-24T00:00:00.000Z",
  subjects: [{ subjectId: "quant", questions: 15, correct: 3, incorrect: 2 }],
  userId: "forged-owner",
};
try {
  for (const u of [0, 1]) {
    original[u] = await api(u, "/api/settings");
    assert.equal(
      (
        await api(
          u,
          `/api/mock-attempts?platform=${encodeURIComponent(marker)}`,
        )
      ).length,
      0,
    );
  }
  const a = await api(0, "/api/mock-attempts", "POST", input);
  created[0].add(a.id);
  assert.ok(!("userId" in a));
  const sessionResponse = await fetch(base + "/api/auth/get-session", {
    headers: { Cookie: cookies[1] },
  });
  assert.equal(
    sessionResponse.headers.get("cache-control"),
    "private, no-store",
  );
  const sessionB = await sessionResponse.json();
  assert.ok(sessionB?.user?.id);
  for (const method of ["GET", "PUT", "DELETE"]) {
    const body =
      method === "PUT"
        ? { ...input, userId: sessionB.user.id }
        : method === "DELETE"
          ? {}
          : undefined;
    const foreign = await raw(1, `/api/mock-attempts/${a.id}`, method, body);
    const missing = await raw(
      1,
      `/api/mock-attempts/${randomUUID()}`,
      method,
      body,
    );
    assert.equal(foreign.status, 404);
    assert.equal(missing.status, 404);
    assert.deepEqual(await foreign.json(), await missing.json());
  }
  assert.equal(
    (
      await api(
        1,
        `/api/mock-attempts?userId=forged-owner&platform=${encodeURIComponent(marker)}`,
      )
    ).length,
    0,
  );
  assert.equal(
    (
      await api(
        1,
        `/api/analytics?type=all&platform=${encodeURIComponent(marker)}`,
      )
    ).count,
    0,
  );
  const bBackup = await (await raw(1, "/api/backup")).json();
  assert.ok(!bBackup.attempts.some((r) => r.id === a.id));
  const csv = await (await raw(1, "/api/backup?format=csv")).text();
  assert.ok(!csv.includes(marker));
  const backup = {
    schemaVersion: 1,
    attempts: [{ ...a, userId: "forged-owner" }],
    preview: true,
    userId: "forged-owner",
  };
  assert.equal((await api(0, "/api/backup", "POST", backup)).duplicates, 1);
  assert.equal((await api(1, "/api/backup", "POST", backup)).newRecords, 1);
  assert.equal(
    (await api(1, "/api/backup", "POST", { ...backup, preview: false }))
      .imported,
    1,
  );
  const bRows = await api(
    1,
    `/api/mock-attempts?platform=${encodeURIComponent(marker)}`,
  );
  assert.equal(bRows.length, 1);
  created[1].add(bRows[0].id);
  assert.notEqual(bRows[0].id, a.id);
  assert.equal(
    (await api(0, `/api/mock-attempts?platform=${encodeURIComponent(marker)}`))
      .length,
    1,
  );
  await api(0, "/api/settings", "PUT", {
    targetScore: 310,
    userId: sessionB.user.id,
  });
  await api(1, "/api/settings", "PUT", { targetScore: 220 });
  assert.equal((await api(0, "/api/settings")).targetScore, 310);
  assert.equal((await api(1, "/api/settings")).targetScore, 220);
  await api(0, `/api/mock-attempts/${a.id}`, "PUT", {
    ...input,
    name: marker + " edited",
  });
  assert.equal(
    (await api(0, `/api/mock-attempts/${a.id}`)).name,
    marker + " edited",
  );
  for (const [path, method] of [
    ["/api/mock-attempts", "GET"],
    ["/api/mock-attempts", "POST"],
    [`/api/mock-attempts/${a.id}`, "GET"],
    [`/api/mock-attempts/${a.id}`, "PUT"],
    [`/api/mock-attempts/${a.id}`, "DELETE"],
    ["/api/analytics", "GET"],
    ["/api/settings", "GET"],
    ["/api/settings", "PUT"],
    ["/api/backup", "GET"],
    ["/api/backup?format=csv", "GET"],
    ["/api/backup", "POST"],
  ]) {
    const r = await raw(null, path, method, method === "GET" ? undefined : {});
    assert.equal(r.status, 401);
    assert.equal((await r.json()).error.code, "UNAUTHENTICATED");
  }
  const page = await fetch(base + "/", { redirect: "manual" });
  assert.ok([302, 303, 307, 308].includes(page.status));
  assert.match(page.headers.get("location"), /sign-in/);
  const signIn = await fetch(base + "/sign-in", {
    headers: { Cookie: cookies[0] },
    redirect: "manual",
  });
  assert.ok([302, 303, 307, 308].includes(signIn.status));
  for (const u of [0, 1]) {
    for (const id of created[u])
      await api(u, `/api/mock-attempts/${id}`, "DELETE", {});
    created[u].clear();
    if (original[u]) await api(u, "/api/settings", "PUT", original[u]);
  }
  const signedOut = await fetch(base + "/api/auth/sign-out", {
    method: "POST",
    headers: {
      Cookie: cookies[1],
      Origin: base,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(signedOut.status, 200);
  // The old token must no longer authorize, even if the client keeps its cookie.
  const expired = await raw(1, "/api/mock-attempts");
  assert.equal(expired.status, 401);
  console.log(
    "PASS: Two real Neon Auth sessions; owner-only CRUD, foreign/nonexistent 404 parity, forged ownership, isolated analytics/settings/CSV/JSON, duplicate preview and import, all anonymous APIs 401, page redirects, revoked session 401.",
  );
} finally {
  // Only disposable records belonging to these QA accounts are removed.
  for (const u of [0, 1]) {
    for (const id of created[u]) {
      const r = await raw(u, `/api/mock-attempts/${id}`, "DELETE", {});
      if (r.status !== 401) assert.ok(r.ok);
    }
    if (original[u]) await raw(u, "/api/settings", "PUT", original[u]);
  }
}
