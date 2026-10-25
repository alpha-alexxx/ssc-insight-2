import assert from "node:assert/strict";
import { writeFile, readFile, unlink } from "node:fs/promises";
const base = process.env.APP_URL ?? "http://localhost:3000";
const cookie = process.env.TEST_SESSION_COOKIE;
if (!cookie)
  throw new Error(
    "TEST_SESSION_COOKIE is required; use a disposable QA session.",
  );
async function request(path, method = "GET", body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      Cookie: cookie,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json();
  if (!response.ok)
    throw new Error(`${response.status}: ${json.error?.message}`);
  return json.data;
}
const marker = ".local/integration-records.json";
if (process.argv.includes("--cleanup")) {
  const ids = JSON.parse(await readFile(marker, "utf8"));
  for (const id of ids) await request(`/api/mock-attempts/${id}`, "DELETE", {});
  await unlink(marker);
  console.log("Temporary integration records removed.");
} else {
  const ids = [];
  try {
    const original = await request("/api/mock-attempts");
    const input = {
      name: `QA verification ${Date.now()}`,
      platform: "Verification only",
      completedAt: "2026-10-24T06:00:00.000Z",
      type: "full",
      notes: "Temporary verification record. Removed after browser checks.",
      source: "manual",
      rank: 436,
      participants: 1267,
      percentile: 65.59,
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
      ],
    };
    const created = await request("/api/mock-attempts", "POST", input);
    ids.push(created.id);
    const updated = await request(`/api/mock-attempts/${created.id}`, "PUT", {
      ...input,
      notes: "Updated verification record",
    });
    assert.equal(updated.notes, "Updated verification record");
    const fetched = await request(`/api/mock-attempts/${created.id}`);
    assert.equal(fetched.id, created.id);
    const stats = await request(
      "/api/analytics?platform=Verification%20only&view=full",
    );
    assert.equal(stats.trend.points[0].score, 245);
    assert.equal(stats.summary.weightedAccuracy.toFixed(2), "78.26");
    const csv = await fetch(base + "/api/backup?format=csv");
    assert.equal(csv.status, 200);
    assert.ok((await csv.text()).includes(input.name));
    const backup = await (await fetch(base + "/api/backup")).json();
    assert.equal(backup.format, "ssc-insight-backup");
    assert.equal(backup.formatVersion, 2);
    assert.ok("targetScore" in backup.settings);
    assert.equal(backup.summary.attempts, backup.attempts.length);
    const preview = await request("/api/backup", "POST", {
      backup,
      mode: "merge",
      preview: true,
    });
    assert.equal(preview.importable, 0);
    assert.equal(preview.skippedDuplicates, original.length + 1);
    const second = {
      ...input,
      name: input.name + " repeat",
      completedAt: "2026-10-25T06:00:00.000Z",
      scoreOverride: 260,
    };
    const imported = await request("/api/backup", "POST", {
      schemaVersion: 1,
      attempts: [second],
      preview: false,
    });
    assert.equal(imported.imported, 1);
    const rows = await request(
      "/api/mock-attempts?platform=Verification%20only",
    );
    const restored = rows.find((a) => a.name === second.name);
    assert.ok(restored);
    ids.push(restored.id);
    assert.equal(restored.scoreOverride, 260);
    assert.equal(restored.source, second.source);
    const bad = await fetch(base + "/api/mock-attempts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://other.example",
      },
      body: JSON.stringify(input),
    });
    assert.equal(bad.status, 403);
    const invalid = await fetch(base + "/api/mock-attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, subjects: [] }),
    });
    assert.equal(invalid.status, 400);
    await writeFile(marker, JSON.stringify(ids));
    console.log(
      "PASS: create, read, edit, analytics, CSV, backup duplicate preview, restore, cross-origin rejection, validation. Temporary records retained for browser checks; run --cleanup.",
    );
  } catch (e) {
    for (const id of ids)
      await request(`/api/mock-attempts/${id}`, "DELETE", {});
    throw e;
  }
}
