import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Structural guarantees for user-supplied AI credentials.
 *
 * These read the source instead of exercising the database, because both
 * properties are about what the code is allowed to touch at all: a credential
 * must never reach a backup, and no client module may be able to read one.
 */

const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("the backup layer never reads the credential table", () => {
  const backup = read("src/lib/backup.ts");
  const repository = read("src/lib/repository.ts");
  // Backups are assembled from attempts + settings only.
  assert.equal(
    /aiCredential/i.test(backup),
    false,
    "backup.ts must not mention AiCredential",
  );
  assert.equal(
    /aiCredential/i.test(repository),
    false,
    "repository.ts must not mention AiCredential",
  );
});

test("the client-facing credential type cannot carry a plaintext key", () => {
  const types = read("src/lib/ai/client-types.ts");
  // Find the AiCredentialSummary block and prove it has no apiKey field.
  const start = types.indexOf("export type AiCredentialSummary");
  assert.notEqual(start, -1, "AiCredentialSummary must exist");
  const end = types.indexOf("};", start);
  const block = types.slice(start, end);
  assert.equal(
    /apiKey\s*:/.test(block),
    false,
    "AiCredentialSummary must not expose an apiKey field",
  );
  assert.match(block, /keyHint/, "it should expose a hint instead");
});

test("only the credential module marks its encryption output as server-only", () => {
  // crypto.ts is the guarded entry point; crypto-core.ts stays testable.
  assert.match(read("src/lib/ai/crypto.ts"), /server-only/);
  assert.equal(
    /^import "server-only"/m.test(read("src/lib/ai/crypto-core.ts")),
    false,
  );
});

test("AI routes resolve per-user config instead of reading env directly", () => {
  for (const route of [
    "src/app/api/ai/coach/route.ts",
    "src/app/api/ai/chat/route.ts",
    "src/app/api/ai/extract/route.ts",
  ]) {
    const source = read(route);
    assert.match(
      source,
      /resolveAiConfig/,
      `${route} must use the per-user resolver`,
    );
    assert.equal(
      /aiConfig\(\)/.test(source),
      false,
      `${route} must not call the env-only aiConfig()`,
    );
  }
});

test("the provider pins redirects and never echoes the key in errors", () => {
  const provider = read("src/lib/ai/provider.ts");
  assert.match(provider, /redirect:\s*"error"/, "redirects must be refused");
  // The Authorization header is set once, from config, and never logged.
  assert.match(provider, /Authorization: `Bearer \$\{config\.apiKey\}`/);
  assert.equal(
    /console\.(log|error|warn)/.test(provider),
    false,
    "the provider must not log (it handles credentials)",
  );
});

test("SSRF validation runs at request time, not only on save", () => {
  const resolver = read("src/lib/ai/resolve.ts");
  assert.match(
    resolver,
    /assertSafeBaseUrl\(/,
    "the resolver must re-validate the stored URL before use",
  );
});
