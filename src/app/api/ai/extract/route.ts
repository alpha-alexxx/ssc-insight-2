import { z } from "zod";
import { apiError, ok, readBody } from "@/lib/api";
import { aiNotConfigured, AiError, aiProviderError } from "@/lib/ai/errors";
import { parseExtraction } from "@/lib/ai/extraction";
import {
  MAX_EXTRACT_CHARS,
  extractionMessages,
  sanitizeReport,
} from "@/lib/ai/prompts";
import { reservationTokens } from "@/lib/ai/quota";
import { createAiProvider } from "@/lib/ai/provider";
import { resolveAiConfig } from "@/lib/ai/resolve";
import { aiLimits } from "@/lib/ai/server";
import {
  reserveAiUsage,
  settleSafely,
} from "@/lib/ai/usage";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ text: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const { id: userId } = await requireUser();
    const resolved = await resolveAiConfig(userId);
    if (!resolved) throw aiNotConfigured();
    const config = resolved.config;
    // Allow the textarea's full report to reach the AI-specific 20k check
    // instead of failing first on the generic transport limit.
    const body = bodySchema.parse(await readBody(request, 128 * 1024));
    if (body.text.length > MAX_EXTRACT_CHARS)
      throw new AiError(
        "AI_INPUT_TOO_LARGE",
        `AI extraction accepts up to ${MAX_EXTRACT_CHARS.toLocaleString("en-IN")} characters. Use the manual parser for a longer report.`,
        413,
      );

    const report = sanitizeReport(body.text);
    const messages = extractionMessages(report);
    const reservation = await reserveAiUsage(userId, {
      feature: "extract",
      model: config.model,
      limits: aiLimits(config),
      reservedTokens: reservationTokens({
        promptText: messages.map((message) => message.content).join("\n"),
        maxOutputTokens: config.maxOutputTokens,
        providerCalls: 2,
      }),
    });

    let result;
    try {
      result = await createAiProvider(config).completeJson({
        messages,
        maxOutputTokens: config.maxOutputTokens,
        signal: request.signal,
        parse: parseExtraction,
      });
    } catch (error) {
      const code = error instanceof AiError ? error.code : "AI_PROVIDER_ERROR";
      await settleSafely({
        id: reservation.id,
        userId,
        status: code === "AI_ABORTED" ? "aborted" : "error",
        inputTokens: 0,
        outputTokens: 0,
        tokensCharged: reservation.reservedTokens,
        providerCalls: 2,
        errorCode: code,
      });
      if (error instanceof AiError) throw error;
      console.error("AI extraction failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      throw aiProviderError();
    }

    await settleSafely({
      id: reservation.id,
      userId,
      status: "success",
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      tokensCharged: result.usage.totalTokens,
      providerCalls: result.providerCalls,
    });

    return ok({
      draft: result.value,
      usage: {
        ...result.usage,
        providerCalls: result.providerCalls,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
