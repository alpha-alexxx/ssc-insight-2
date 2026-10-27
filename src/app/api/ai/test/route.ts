import { defineRoute } from "@/lib/route-handler";
import { RequestError } from "@/lib/api";
import { resolveAiConfig } from "@/lib/ai/resolve";
import { createAiProvider } from "@/lib/ai/provider";
import { AiError } from "@/lib/ai/errors";
import { SsrfError } from "@/lib/ai/ssrf-core";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * "Test connection" for the AI picker.
 *
 * This is intentionally tiny: one short completion, no tracker context, nothing
 * saved. It proves the endpoint, key, and model work without spending real
 * tokens on a full coach read, and it never echoes the key or the base URL back.
 *
 * Rate-limited as a write: it causes a billable outbound request.
 */
export const POST = defineRoute({ kind: "write" }, async ({ user }) => {
  let resolved;
  try {
    resolved = await resolveAiConfig(user.id);
  } catch (error) {
    if (error instanceof SsrfError) {
      throw new RequestError(error.message, 400);
    }
    throw error;
  }
  if (!resolved) {
    throw new RequestError(
      "AI is not configured yet. Add a provider and API key first.",
      503,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const provider = createAiProvider(resolved.config);
    const result = await provider.complete({
      messages: [
        {
          role: "system",
          content:
            "Reply with exactly: OK. Do not add any other text or punctuation.",
        },
        { role: "user", content: "Connection test." },
      ],
      maxOutputTokens: 16,
      signal: controller.signal,
    });
    return {
      data: {
        ok: true,
        model: resolved.config.model,
        source: resolved.source,
        // Confirms a real completion happened without exposing content.
        replyChars: result.text.trim().length,
      },
    };
  } catch (error) {
    if (error instanceof AiError) {
      // AiError messages are already sanitized (no provider body, no headers).
      throw new RequestError(error.message, error.status);
    }
    if (error instanceof SsrfError) {
      throw new RequestError(error.message, 400);
    }
    throw new RequestError(
      "The provider could not be reached. Check the base URL, key, and model.",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
});
