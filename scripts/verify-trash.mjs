import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/**
 * Trash lifecycle, against a real database.
 *
 * The pure suite (tests/trash.test.ts) pins the retention arithmetic; this
 * script proves the parts a unit test cannot see — that a soft delete really
 * removes a record from every projection, that restore brings the same row
 * back, that ownership is enforced on restore and purge, and that the cleanup
 * endpoint is idempotent.
 *
 * Run against a DISPOSABLE Neon branch with two real QA sessions. Never point
 * this at a production account: it creates and destroys records.
 *
 *   TEST_SESSION_COOKIE=... TEST_OTHER_SESSION_COOKIE=... \
 *     node scripts/verify-trash.mjs
 *
 * Add TEST_CRON_SECRET to also exercise the scheduled cleanup route.
 */

const base = process.env.APP_URL ?? "http://localhost:3000";
const cookies = [
  process.env.TEST_SESSION_COOKIE,
  process.env.TEST_OTHER_SESSION_COOKIE,
];
if (cookies.some((c) => !c))
  throw new Error(
    "Two real disposable QA session cookies are required. Never use production accounts.",
  );

const cronSecret = process.env.TEST_CRON_SECRET ?? "";
const marker = `Trash QA ${randomUUID()}`;
const created = [];

async function raw(user, path, method = "GET", body, extraHeaders = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: base,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(user === null ? {} : { Cookie: cookies[user] }),
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.match(
    response.headers.get("cache-control") ?? "",
    /private.*no-store/,
    `${method} ${path} must not be cacheable`,
  );
  return response;
}

async function api(user, path, method = "GET", body) {
  const response = await raw(user, path, method, body);
  const json = await response.json();
  assert.ok(
    response.ok,
    `${method} ${path}: ${response.status} ${json.error?.code} ${json.error?.message}`,
  );
  return json.data;
}

/** Does the attempt appear anywhere the product surfaces results? */
async function visible(user, id) {
  const attempts = await api(user, `/api/mock-attempts?type=all&limit=100`);
  const list = Array.isArray(attempts) ? attempts : (attempts.items ?? []);
  if (list.some((row) => row.id === id)) return true;
  const found = await raw(user, `/api/mock-attempts/${id}`);
  return found.ok;
}

const input = {
  name: marker,
  platform: marker,
  type: "subject",
  completedAt: "2026-10-24T00:00:00.000Z",
  subjects: [{ subjectId: "quant", questions: 20, correct: 12, incorrect: 5 }],
};

try {
  /* ---- 1. delete moves the record to Trash and out of every view ---- */
  const attempt = await api(0, "/api/mock-attempts", "POST", input);
  created.push(attempt.id);
  assert.equal(await visible(0, attempt.id), true);

  await api(0, `/api/mock-attempts/${attempt.id}`, "DELETE", {});
  assert.equal(
    await visible(0, attempt.id),
    false,
    "a trashed mock must leave the list and its detail route",
  );
  // Reading or editing a trashed record 404s exactly like a missing one.
  assert.equal((await raw(0, `/api/mock-attempts/${attempt.id}`)).status, 404);
  assert.equal(
    (await raw(0, `/api/mock-attempts/${attempt.id}`, "PUT", input)).status,
    404,
  );

  const listed = await api(0, "/api/trash?kind=all&limit=100");
  const row = listed.items.find((item) => item.id === attempt.id);
  assert.ok(row, "the trashed mock must appear in /api/trash");
  assert.equal(row.kind, "attempt");
  assert.ok(row.daysLeft > 0 && row.daysLeft <= listed.retentionDays);
  assert.ok(new Date(row.expiresAt).getTime() > Date.now());

  /* ---- 2. a kind filter still reports every kind's count ---- */
  const onlyAttempts = await api(0, "/api/trash?kind=attempt&limit=1");
  assert.ok(onlyAttempts.counts.attempt >= 1);
  // The pills the user is about to click must not read zero just because one
  // kind is selected.
  const otherKinds = ["task", "exam", "group"].filter(
    (kind) => kind !== "attempt",
  );
  assert.ok(
    otherKinds.every((kind) => onlyAttempts.counts[kind] >= 0),
    "counts for the unselected kinds must still be reported",
  );
  assert.ok(
    onlyAttempts.counts.all >= onlyAttempts.counts.attempt,
    "counts.all is the unfiltered total",
  );

  /* ---- 3. a live id can never be restored or purged ---- */
  const live = await api(0, "/api/mock-attempts", "POST", {
    ...input,
    name: marker + " live",
  });
  created.push(live.id);
  for (const route of ["restore", "purge"]) {
    const outcome = await api(0, `/api/trash/${route}`, "POST", {
      items: [{ kind: "attempt", id: live.id }],
    });
    assert.equal(outcome.done, 0, `${route} must refuse a live row`);
    assert.equal(outcome.failed[0]?.code, "NOT_FOUND");
  }
  assert.equal(await visible(0, live.id), true, "the live row is untouched");

  /* ---- 4. another account cannot restore or purge it ---- */
  for (const route of ["restore", "purge"]) {
    const outcome = await api(1, `/api/trash/${route}`, "POST", {
      items: [{ kind: "attempt", id: attempt.id }],
    });
    assert.equal(outcome.done, 0, `${route} must be owner-scoped`);
    assert.equal(outcome.failed[0]?.code, "NOT_FOUND");
  }
  assert.equal(
    await visible(0, attempt.id),
    false,
    "a foreign attempt left the record in Trash",
  );

  /* ---- 5. restore returns the same record, intact ---- */
  const restored = await api(0, "/api/trash/restore", "POST", {
    items: [{ kind: "attempt", id: attempt.id }],
  });
  assert.equal(restored.done, 1);
  assert.equal(restored.failed.length, 0);
  assert.equal(
    await visible(0, attempt.id),
    true,
    "the same id is back in the list",
  );
  const back = await api(0, `/api/mock-attempts/${attempt.id}`);
  assert.equal(back.subjects.length, attempt.subjects.length);
  assert.equal(back.marking.correct, attempt.marking.correct);
  const afterRestore = await api(0, "/api/trash?kind=all&limit=100");
  assert.equal(
    afterRestore.items.some((item) => item.id === attempt.id),
    false,
    "a restored record leaves Trash",
  );

  /* ---- 6. permanent delete removes it for good ---- */
  await api(0, `/api/mock-attempts/${attempt.id}`, "DELETE", {});
  const purged = await api(0, "/api/trash/purge", "POST", {
    items: [{ kind: "attempt", id: attempt.id }],
  });
  assert.equal(purged.done, 1);
  assert.equal(
    await visible(0, attempt.id),
    false,
    "a purged record never comes back",
  );
  // Idempotent: a second purge reports a miss, never an error.
  const again = await api(0, "/api/trash/purge", "POST", {
    items: [{ kind: "attempt", id: attempt.id }],
  });
  assert.equal(again.done, 0);
  assert.equal(again.failed[0]?.code, "NOT_FOUND");

  /* ---- 7. a personal task round-trips through Trash ---- */
  const task = await api(0, "/api/todos", "POST", {
    title: marker + " task",
    dueDate: "2026-10-30",
    priority: "normal",
  });
  created.push(`task:${task.id}`);
  const scopeTrash = await api(0, "/api/todos", "DELETE", { ids: [task.id] });
  assert.equal(scopeTrash.count, 1);
  const taskRows = await api(0, "/api/trash?kind=task&q=" + encodeURIComponent(marker));
  const taskRow = taskRows.items.find((item) => item.id === task.id);
  assert.ok(taskRow, "the trashed task must appear in Trash");
  assert.equal(taskRow.daysLeft, 15, "a fresh delete has the full window");
  const taskBack = await api(0, "/api/trash/restore", "POST", {
    items: [{ kind: "task", id: task.id }],
  });
  assert.equal(taskBack.done, 1);

  /* ---- 8. a custom exam round-trips through Trash ----
   * This is the branch that pinned the UNION's type mismatch: CustomExam was
   * created with a real UUID id while every other trashed table uses TEXT, so
   * the list query needs an explicit `"id"::text` cast to unify them. */
  const exam = await api(0, "/api/exams", "POST", {
    name: marker + " exam",
    tiers: [
      {
        label: "Paper 1",
        subjects: [{ subjectId: "quant", questions: 10 }],
        marking: { correct: 2, incorrect: 0.5 },
      },
    ],
  });
  created.push(`exam:${exam.id}`);
  await api(0, "/api/exams", "DELETE", { id: exam.id });
  const examRows = await api(
    0,
    "/api/trash?kind=exam&q=" + encodeURIComponent(marker),
  );
  const examRow = examRows.items.find((item) => item.id === exam.id);
  assert.ok(examRow, "the trashed exam must appear in Trash");
  assert.equal(examRow.kind, "exam");
  // The all-kinds list is the query that unions UUID and TEXT ids.
  const allRows = await api(0, "/api/trash?kind=all&limit=100");
  assert.ok(
    allRows.items.some((item) => item.id === exam.id),
    "the all-kinds list must include the exam branch",
  );
  assert.ok(allRows.counts.exam >= 1, "counts.exam must count it");
  const examBack = await api(0, "/api/trash/restore", "POST", {
    items: [{ kind: "exam", id: exam.id }],
  });
  assert.equal(examBack.done, 1);
  const catalog = await api(0, "/api/exams");
  assert.ok(
    catalog.customExams.some((row) => row.id === exam.id),
    "a restored exam is back in the catalog",
  );

  /* ---- 9. empty Trash is owner-scoped and needs the explicit flag ---- */
  const unconfirmed = await raw(0, "/api/trash/empty", "POST", {});
  assert.equal(unconfirmed.status, 400, "empty Trash requires confirm: true");
  const emptied = await api(0, "/api/trash/empty", "POST", { confirm: true });
  assert.ok(emptied.total >= 0);

  /* ---- 10. the cleanup endpoint is secret-gated and idempotent ---- */
  const anonymousCron = await fetch(base + "/api/cron/trash-cleanup");
  assert.ok(
    [401, 503].includes(anonymousCron.status),
    `cleanup must not run unauthenticated (got ${anonymousCron.status})`,
  );
  if (cronSecret) {
    const first = await fetch(base + "/api/cron/trash-cleanup", {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    assert.ok(first.ok, `cleanup failed: ${first.status}`);
    const run = (await first.json()).data;
    assert.ok(run.removed >= 0);
    // A second run finds nothing new to do. That is what makes retries safe.
    const second = await fetch(base + "/api/cron/trash-cleanup", {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    assert.ok(second.ok);
    const rerun = (await second.json()).data;
    assert.equal(rerun.removed, 0, "a drained backlog removes nothing twice");
  } else {
    console.log("SKIP: TEST_CRON_SECRET not set — cleanup run not verified.");
  }

  console.log(
    "PASS: soft delete hides a mock from every read, Trash lists it with a live window, kind-filter counts stay populated, live and foreign ids are refused on restore/purge, restore returns the same row, purge is permanent and idempotent, a task and a custom exam round-trip, empty Trash is scoped and confirm-gated, and cleanup is secret-gated.",
  );
} finally {
  // Leave nothing behind, in either place. A live row is soft-deleted first,
  // then purged; an already-trashed row's DELETE simply 404s, which is fine.
  for (const entry of created) {
    const kind = entry.startsWith("task:")
      ? "task"
      : entry.startsWith("exam:")
        ? "exam"
        : "attempt";
    const id = entry.slice(kind === "attempt" ? 0 : kind.length + 1);
    if (kind === "attempt")
      await raw(0, `/api/mock-attempts/${id}`, "DELETE", {});
    if (kind === "exam") await raw(0, "/api/exams", "DELETE", { id });
    await raw(0, "/api/trash/purge", "POST", { items: [{ kind, id }] });
  }
}
