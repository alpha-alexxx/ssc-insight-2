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
if (process.env.ALLOW_DESTRUCTIVE_REPLACE !== "1")
  throw new Error(
    "This script replaces a QA account's data. Set ALLOW_DESTRUCTIVE_REPLACE=1 to run it.",
  );
const marker = `Backup transfer QA ${randomUUID()}`;
const settings = [];

async function raw(user, path, method = "GET", body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      Cookie: cookies[user],
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.match(
    response.headers.get("cache-control") ?? "",
    /private.*no-store/,
  );
  return response;
}
async function api(user, path, method = "GET", body) {
  const response = await raw(user, path, method, body);
  const json = await response.json();
  assert.ok(
    response.ok,
    `${method} ${path}: ${response.status} ${json.error?.message}`,
  );
  return json.data;
}
async function backup(user) {
  return (await raw(user, "/api/backup")).json();
}
async function preview(user, file, applyTarget) {
  return api(user, "/api/backup", "POST", {
    backup: file,
    mode: "replace",
    applyTarget,
    preview: true,
  });
}
async function replace(user, file, applyTarget, fingerprint) {
  return api(user, "/api/backup", "POST", {
    backup: file,
    mode: "replace",
    applyTarget,
    previewFingerprint: fingerprint,
    confirmReplace: true,
    preview: false,
  });
}
function subjectInput(name) {
  return {
    name,
    platform: marker,
    type: "subject",
    completedAt: "2026-10-24T00:00:00.000Z",
    source: "manual",
    subjects: [{ subjectId: "quant", questions: 15, correct: 3, incorrect: 2 }],
  };
}

let aCreated;
let bOriginal;
let bRestored = false;
try {
  settings[0] = await api(0, "/api/settings");
  settings[1] = await api(1, "/api/settings");
  bOriginal = await backup(1);

  aCreated = await api(0, "/api/mock-attempts", "POST", subjectInput(marker));
  await api(
    1,
    "/api/mock-attempts",
    "POST",
    subjectInput(marker + " old"),
  );
  await api(0, "/api/settings", "PUT", { targetScore: 330 });
  await api(1, "/api/settings", "PUT", { targetScore: 210 });
  const aBackup = await backup(0);
  assert.equal(aBackup.formatVersion, 2);
  assert.equal(aBackup.settings.targetScore, 330);
  assert.ok(aBackup.attempts.some((row) => row.id === aCreated.id));

  const before = await preview(1, aBackup, true);
  assert.ok(before.willDelete >= 1);
  assert.equal(
    before.importable,
    aBackup.attempts.length,
  );
  assert.equal(before.target.incoming, 330);
  const refused = await raw(1, "/api/backup", "POST", {
    backup: aBackup,
    mode: "replace",
    applyTarget: true,
    previewFingerprint: before.previewFingerprint,
    preview: false,
  });
  assert.equal(refused.status, 400);
  assert.equal(
    (await api(1, "/api/mock-attempts?platform=" + encodeURIComponent(marker)))
      .length,
    1,
  );

  const imported = await replace(
    1,
    aBackup,
    true,
    before.previewFingerprint,
  );
  assert.equal(imported.imported, aBackup.attempts.length);
  assert.ok(imported.deleted >= 1);
  assert.equal(imported.target.targetScore, 330);
  assert.equal((await api(1, "/api/settings")).targetScore, 330);
  const bAfterReplace = await api(
    1,
    "/api/mock-attempts?platform=" + encodeURIComponent(marker),
  );
  assert.equal(bAfterReplace.length, 1);
  assert.equal(bAfterReplace[0].name, marker);
  assert.notEqual(bAfterReplace[0].id, aCreated.id);
  assert.equal(bAfterReplace[0].source, "manual");
  assert.ok(!JSON.stringify(bAfterReplace[0]).includes("old"));

  const restorePreview = await preview(1, bOriginal, true);
  await replace(1, bOriginal, true, restorePreview.previewFingerprint);
  bRestored = true;
  assert.equal(
    (await api(1, "/api/mock-attempts")).length,
    bOriginal.attempts.length,
  );
  console.log(
    "PASS: guarded v2 replace preview, confirm requirement, deletion/import, target transfer, and QA restore.",
  );
} finally {
  if (aCreated) {
    await api(0, `/api/mock-attempts/${aCreated.id}`, "DELETE", {}).catch(
      () => {},
    );
  }
  if (bOriginal && !bRestored) {
    try {
      const restorePreview = await preview(1, bOriginal, true);
      await replace(1, bOriginal, true, restorePreview.previewFingerprint);
      console.log("PASS: QA account 1 restored after failure.");
    } catch {
      console.error(
        "WARNING: could not restore QA account 1. Use its exported backup before running again.",
      );
    }
  }
  for (const [user, original] of settings.entries()) {
    if (original)
      await api(user, "/api/settings", "PUT", original).catch(() => {});
  }
}
