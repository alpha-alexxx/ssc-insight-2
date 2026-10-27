import { z } from "zod";
import { defineRoute } from "@/lib/route-handler";
import { readBody, RequestError } from "@/lib/api";
import { audit } from "@/lib/audit";
import {
  credentialStorageAvailable,
  deleteAiCredential,
  describeAiCredential,
  saveAiCredential,
} from "@/lib/ai/credentials";
import { PROVIDER_IDS, providerPreset } from "@/lib/ai/providers";
import { SsrfError } from "@/lib/ai/ssrf-core";
import { CredentialCryptoError } from "@/lib/ai/crypto";

export const runtime = "nodejs";

/**
 * The API key is write-only across this whole route. It may be sent in, but it
 * is never echoed back: PUT and GET return only a 4-character hint.
 */
const credentialSchema = z
  .object({
    provider: z
      .string()
      .refine((value) => PROVIDER_IDS.has(value), {
        message: "Choose a supported provider.",
      }),
    baseUrl: z.string().trim().min(1).max(300),
    model: z.string().trim().min(1).max(120),
    apiKey: z.string().trim().max(400).optional(),
    jsonMode: z.boolean().optional(),
    allowHttp: z.boolean().optional(),
    allowPrivate: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    // A local preset (Ollama on localhost) needs both allowances; the client
    // sets them together, so a partial update is a client bug worth rejecting.
    const preset = providerPreset(value.provider);
    if (preset?.local && !value.allowPrivate) {
      ctx.addIssue({
        code: "custom",
        path: ["allowPrivate"],
        message: "A local provider requires the local-access option.",
      });
    }
  });

const STORAGE_UNAVAILABLE_MESSAGE =
  "The server has no AI_CREDENTIAL_SECRET configured, so personal API keys cannot be stored. Add it to the environment, or use the server-provided AI configuration.";

export const GET = defineRoute({ kind: "read" }, async ({ user }) => {
  const credential = await describeAiCredential(user.id);
  return {
    data: {
      storageAvailable: credentialStorageAvailable(),
      credential,
    },
  };
});

export const PUT = defineRoute(
  {
    kind: "write",
    onError: (error, userId, startedAt) => {
      audit("ai.credential.save", userId, {
        outcome: "error",
        ms: Date.now() - startedAt,
      });
    },
  },
  async ({ request, user, startedAt }) => {
    if (!credentialStorageAvailable()) {
      throw new RequestError(STORAGE_UNAVAILABLE_MESSAGE, 503);
    }
    const parsed = credentialSchema.safeParse(await readBody(request));
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new RequestError(
        first?.message ?? "Check the AI settings and try again.",
        400,
      );
    }

    let summary;
    try {
      summary = await saveAiCredential(user.id, parsed.data);
    } catch (error) {
      if (error instanceof SsrfError) {
        throw new RequestError(error.message, 400);
      }
      if (error instanceof CredentialCryptoError) {
        throw new RequestError(STORAGE_UNAVAILABLE_MESSAGE, 503);
      }
      throw error;
    }

    // Audit the fact of the change, never the secret or the URL.
    audit("ai.credential.save", user.id, { ms: Date.now() - startedAt });
    return { data: summary };
  },
);

export const DELETE = defineRoute({ kind: "write" }, async ({ user }) => {
  await deleteAiCredential(user.id);
  audit("ai.credential.delete", user.id, {});
  return { data: { configured: false } };
});
