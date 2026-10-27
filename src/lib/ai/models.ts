export type AiModel = { id: string; name: string };

export class ModelDiscoveryError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = "ModelDiscoveryError";
  }
}

/** Only IDs and display names cross back to the browser. */
export function parseModelCatalog(payload: unknown): AiModel[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray((payload as { data?: unknown }).data)
  ) {
    throw new ModelDiscoveryError(
      "This provider did not return a model list. Enter a model ID manually.",
    );
  }
  const result = new Map<string, AiModel>();
  for (const entry of (payload as { data: unknown[] }).data) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== "string") continue;
    const id = item.id.trim();
    if (!id || id.length > 120 || /[\u0000-\u001f\u007f]/.test(id)) continue;
    const name =
      typeof item.name === "string" ? item.name.trim().slice(0, 160) : id;
    // OpenRouter annotates modalities; omit known image/audio-only endpoints.
    const architecture = item.architecture as
      { output_modalities?: unknown } | undefined;
    if (
      Array.isArray(architecture?.output_modalities) &&
      !architecture.output_modalities.includes("text")
    )
      continue;
    result.set(id, { id, name: name || id });
  }
  return [...result.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function fetchModelCatalog(
  connection: { baseUrl: string; apiKey: string },
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<AiModel[]> {
  const response = await fetcher(
    `${connection.baseUrl.replace(/\/+$/, "")}/models`,
    {
      headers: {
        Authorization: `Bearer ${connection.apiKey}`,
        Accept: "application/json",
      },
      redirect: "error",
      cache: "no-store",
      signal,
    },
  );
  if (!response.ok) {
    const message =
      response.status === 401 || response.status === 403
        ? "The provider rejected this key. Check its permissions or enter another key."
        : response.status === 404 || response.status === 405
          ? "This endpoint does not list models. Enter a model ID manually."
          : response.status === 429
            ? "The provider is busy or rate limited. Wait a moment, then fetch models again."
            : "Could not fetch models. Try again or enter a model ID manually.";
    await response.body?.cancel();
    throw new ModelDiscoveryError(message, response.status === 429 ? 429 : 502);
  }
  // Bound the provider response, including chunked bodies, before parsing.
  const reader = response.body?.getReader();
  if (!reader)
    throw new ModelDiscoveryError(
      "The provider returned an empty response. Enter a model ID manually.",
    );
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) {
        await reader.cancel();
        throw new ModelDiscoveryError(
          "The model list is too large. Enter a model ID manually.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(buffer));
  } catch {
    throw new ModelDiscoveryError(
      "This endpoint did not return a model list. Enter a model ID manually.",
    );
  }
  return parseModelCatalog(payload);
}
