import { sameCredentialTarget } from "../src/lib/ai/connection-target";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aiConnectionSchema,
  aiCredentialSchema,
} from "../src/lib/ai/connection-input";
import {
  fetchModelCatalog,
  ModelDiscoveryError,
  parseModelCatalog,
} from "../src/lib/ai/models";

test("model catalogs normalize, deduplicate and sort while exposing only labels and IDs", () => {
  assert.deepEqual(
    parseModelCatalog({
      data: [
        { id: " z-model ", name: "Model Z", provider_secret: "do-not-return" },
        { id: "a-model" },
        { id: "z-model", name: "Model Z" },
        { id: "" },
        { id: "bad\nmodel" },
        null,
        { id: 17 },
        { id: "x".repeat(121) },
      ],
    }),
    [
      { id: "a-model", name: "a-model" },
      { id: "z-model", name: "Model Z" },
    ],
  );
});

test("known non-text OpenRouter models are excluded; unknown capabilities stay selectable", () => {
  assert.deepEqual(
    parseModelCatalog({
      data: [
        { id: "image", architecture: { output_modalities: ["image"] } },
        { id: "chat", architecture: { output_modalities: ["text", "image"] } },
        { id: "unknown" },
      ],
    }).map((model) => model.id),
    ["chat", "unknown"],
  );
});

test("empty catalogs differ from unsupported response shapes", () => {
  assert.deepEqual(parseModelCatalog({ data: [] }), []);
  assert.throws(() => parseModelCatalog({ models: [] }), ModelDiscoveryError);
});

test("model fetching uses the supplied draft key, refuses redirects, and sends no tracker data", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://provider.example/v1/models");
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer draft-key",
    );
    assert.equal(init?.body, undefined);
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    return Response.json({ data: [{ id: "available-model" }] });
  };
  const result = await fetchModelCatalog(
    { baseUrl: "https://provider.example/v1/", apiKey: "draft-key" },
    new AbortController().signal,
    fetcher,
  );
  assert.equal(calls, 1);
  assert.deepEqual(result, [
    { id: "available-model", name: "available-model" },
  ]);
});

test("provider errors never echo provider bodies or credentials", async () => {
  for (const status of [401, 403, 404, 429, 500]) {
    await assert.rejects(
      fetchModelCatalog(
        { baseUrl: "https://provider.example", apiKey: "sensitive-key" },
        new AbortController().signal,
        async () =>
          new Response("sensitive-key: internal provider details", { status }),
      ),
      (error: unknown) =>
        error instanceof ModelDiscoveryError &&
        !/sensitive-key|internal provider/.test(error.message),
    );
  }
});

test("malformed and oversized provider responses fail with manual-entry recovery", async () => {
  for (const body of [
    "not json",
    JSON.stringify({ data: [], padding: "x".repeat(2_000_001) }),
  ]) {
    await assert.rejects(
      fetchModelCatalog(
        { baseUrl: "https://provider.example", apiKey: "key" },
        new AbortController().signal,
        async () => new Response(body),
      ),
      /model ID manually/,
    );
  }
});

test("saved keys can only be reused for the same provider and endpoint", () => {
  const stored = { provider: "openai", baseUrl: "https://api.openai.com/v1" };
  assert.equal(
    sameCredentialTarget(stored, { ...stored, baseUrl: stored.baseUrl + "/" }),
    true,
  );
  assert.equal(
    sameCredentialTarget(stored, { ...stored, provider: "custom" }),
    false,
  );
  assert.equal(
    sameCredentialTarget(stored, {
      ...stored,
      baseUrl: "https://elsewhere.example/v1",
    }),
    false,
  );
});

test("model discovery needs no selected model, while a draft test/save requires one", () => {
  const input = {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "key",
  };
  assert.equal(aiConnectionSchema.safeParse(input).success, true);
  assert.equal(
    aiCredentialSchema.safeParse({ ...input, model: "" }).success,
    false,
  );
  assert.equal(
    aiCredentialSchema.safeParse({ ...input, model: "chosen-model" }).success,
    true,
  );
});

test("only the local preset can opt into private or plaintext targets", () => {
  const input = {
    provider: "custom",
    baseUrl: "http://localhost/v1",
    allowPrivate: true,
    allowHttp: true,
  };
  assert.equal(aiConnectionSchema.safeParse(input).success, false);
  assert.equal(
    aiConnectionSchema.safeParse({ ...input, provider: "ollama" }).success,
    true,
  );
  assert.equal(
    aiConnectionSchema.safeParse({
      ...input,
      provider: "ollama",
      allowPrivate: false,
    }).success,
    false,
  );
});
