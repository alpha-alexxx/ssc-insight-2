import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = process.env.APP_URL ?? "http://localhost:3000";
const cookie = process.env.TEST_SESSION_COOKIE;
if (!cookie)
  throw new Error(
    "TEST_SESSION_COOKIE is required; use a disposable QA account session.",
  );
const platform = `QA disposable ${randomUUID()}`;
const ids = new Set();
let originalSettings;

async function raw(path, method = "GET", body, origin = base) {
  return fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Cookie: cookie,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function api(path, method = "GET", body) {
  const response = await raw(path, method, body);
  const json = await response.json();
  assert.ok(
    response.ok,
    `${method} ${path}: ${response.status} ${json.error?.code ?? ""}`,
  );
  return json.data;
}

const full = {
  name: "QA full 100%_sample",
  platform,
  completedAt: "2026-10-24T00:00:00.000Z",
  type: "full",
  notes: "Disposable integration record; automatically removed.",
  source: "manual",
  subjects: [
    {
      subjectId: "quant",
      questions: 30,
      correct: 14,
      incorrect: 6,
      timeSeconds: 1782,
    },
    {
      subjectId: "reasoning",
      questions: 30,
      correct: 25,
      incorrect: 5,
      timeSeconds: 995,
    },
    {
      subjectId: "english",
      questions: 45,
      correct: 37,
      incorrect: 8,
      timeSeconds: 2112,
    },
    {
      subjectId: "ga",
      questions: 25,
      correct: 14,
      incorrect: 6,
      timeSeconds: 588,
    },
    {
      subjectId: "computer",
      questions: 20,
      correct: 20,
      incorrect: 0,
      timeSeconds: 60,
    },
  ],
};
const query = `platform=${encodeURIComponent(platform)}`;

try {
  originalSettings = await api("/api/settings");
  const created = await api("/api/mock-attempts", "POST", full);
  ids.add(created.id);
  assert.equal((await api(`/api/mock-attempts/${created.id}`)).id, created.id);
  const updated = await api(`/api/mock-attempts/${created.id}`, "PUT", {
    ...full,
    subjects: [...full.subjects].reverse(),
    notes: "Edited disposable integration record",
  });
  assert.equal(updated.subjects[0].subjectId, "computer");
  assert.equal(updated.notes, "Edited disposable integration record");

  let stats = await api(`/api/analytics?${query}&view=full`);
  assert.equal(stats.trend.points[0].score, 245);
  assert.equal(stats.summary.weightedAccuracy.toFixed(2), "78.26");
  assert.equal(stats.summary.correct, 90);
  assert.equal(stats.summary.incorrect, 25);
  assert.equal(stats.summary.unattempted, 15);
  const matching = await api(
    `/api/mock-attempts?${query}&search=${encodeURIComponent("100%_sample")}&from=2026-10-24&to=2026-10-24`,
  );
  assert.equal(matching.length, 1);

  const sectional = await api("/api/mock-attempts", "POST", {
    ...full,
    name: "QA sectional",
    type: "sectional",
    subjects: full.subjects.slice(0, 2),
  });
  ids.add(sectional.id);
  const subject = await api("/api/mock-attempts", "POST", {
    ...full,
    name: "QA short quant",
    type: "subject",
    subjects: [
      {
        subjectId: "quant",
        questions: 15,
        correct: 0,
        incorrect: 5,
        timeSeconds: null,
      },
    ],
  });
  ids.add(subject.id);
  stats = await api(`/api/analytics?${query}&view=full`);
  assert.equal(stats.sourceAttemptCount, 1);
  assert.equal(
    stats.whereYouStand.find((s) => s.subjectId === "quant").resultCount,
    3,
  );
  assert.equal(stats.trend.points[0].score, 245);

  const csv = await (await raw("/api/backup?format=csv")).text();
  assert.ok(csv.includes(full.name));
  const backup = await (await raw("/api/backup")).json();
  const saved = backup.attempts.filter((a) => a.platform === platform);
  assert.equal(saved.length, 3);
  const preview = await api("/api/backup", "POST", {
    schemaVersion: 1,
    attempts: [...saved, saved[0]],
    preview: true,
  });
  assert.equal(preview.newRecords, 0);
  assert.equal(preview.duplicates, 4);
  for (const id of ids) await api(`/api/mock-attempts/${id}`, "DELETE", {});
  ids.clear();
  const imported = await api("/api/backup", "POST", {
    schemaVersion: 1,
    attempts: [...saved, saved[0]],
    preview: false,
  });
  assert.equal(imported.imported, 3);
  assert.equal(imported.skipped, 1);
  const restored = await api(`/api/mock-attempts?${query}`);
  restored.forEach((a) => ids.add(a.id));
  assert.equal(restored.length, 3);
  assert.ok(restored.every((a) => a.source === "backup"));

  await api("/api/settings", "PUT", { targetScore: 300 });
  assert.equal((await api("/api/settings")).targetScore, 300);
  const missing = randomUUID();
  for (const method of ["GET", "PUT", "DELETE"]) {
    assert.equal(
      (
        await raw(
          `/api/mock-attempts/${missing}`,
          method,
          method === "PUT" ? full : method === "DELETE" ? {} : undefined,
        )
      ).status,
      404,
    );
  }
  assert.equal(
    (await raw("/api/mock-attempts", "POST", full, "https://foreign.example"))
      .status,
    403,
  );
  assert.equal(
    (await raw("/api/mock-attempts", "POST", { ...full, subjects: [] })).status,
    400,
  );

  const session = await fetch(base + "/api/auth/get-session");
  assert.equal(session.status, 200);
  assert.equal(session.headers.get("cache-control"), "private, no-store");
  assert.equal(await session.json(), null);
  const unauthorizedPage = await fetch(base + "/");
  assert.equal(unauthorizedPage.url, base + "/sign-in");
  console.log(
    "PASS: Neon persistence, ordered subject replacement, 245/390 sample, Computer exclusion, cross-type analytics, literal filters, CSV/JSON backup round trip, duplicate imports, settings, 404/400/403 responses, anonymous redirect, Neon Auth session endpoint.",
  );
} finally {
  const remaining = await api(`/api/mock-attempts?${query}`).catch(() => []);
  for (const row of remaining)
    await api(`/api/mock-attempts/${row.id}`, "DELETE", {});
  if (originalSettings) await api("/api/settings", "PUT", originalSettings);
  assert.equal((await api(`/api/mock-attempts?${query}`)).length, 0);
  console.log(
    "PASS: Disposable mock records removed; original target setting restored.",
  );
}
