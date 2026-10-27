import "server-only";
import { RequestError } from "../api";
import { getAiCredential } from "./credentials";
import { assertSafeBaseUrl, SsrfError } from "./ssrf";
import type { AiConnectionInput } from "./connection-input";
import { sameCredentialTarget } from "./connection-target";

/** Resolve the draft without persisting it or falling back to the server key. */
export async function resolveDraftConnection(
  userId: string,
  input: AiConnectionInput,
) {
  let baseUrl: string;
  try {
    baseUrl = await assertSafeBaseUrl(input.baseUrl, {
      allowHttp: input.allowHttp,
      allowPrivate: input.allowPrivate,
    });
  } catch (error) {
    if (error instanceof SsrfError) throw new RequestError(error.message, 400);
    throw error;
  }
  let apiKey = input.apiKey?.trim() ?? "";
  if (!apiKey) {
    const stored = await getAiCredential(userId);
    if (stored && sameCredentialTarget(stored, { ...input, baseUrl }))
      apiKey = stored.apiKey;
  }
  if (!apiKey)
    throw new RequestError(
      "Enter an API key for this provider and endpoint.",
      400,
    );
  return { baseUrl, apiKey };
}
