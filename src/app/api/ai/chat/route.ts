import { z } from "zod";
import { apiError, readBody } from "@/lib/api";
import { aiConfig } from "@/lib/ai/config";
import { AiError, aiProviderError } from "@/lib/ai/errors";
import { encodeNdjson } from "@/lib/ai/ndjson";
import { chatMessages } from "@/lib/ai/prompts";
import {
  CONTEXT_TOKEN_ESTIMATE,
  reservationTokens,
} from "@/lib/ai/quota";
import { createAiProvider } from "@/lib/ai/provider";
import { aiLimits, loadAiContext } from "@/lib/ai/server";
import {
  releaseSafely,
  reserveAiUsage,
  settleSafely,
} from "@/lib/ai/usage";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_HISTORY_CHARS = 16_000;

const bodySchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(4_000),
        }),
      )
      .min(1)
      .max(8),
  })
  .refine((body) => body.messages.at(-1)?.role === "user", {
    message: "The last message must be from you.",
  });

export async function POST(request: Request) {
  try {
    const { id: userId } = await requireUser();
    const config = aiConfig();
    const body = bodySchema.parse(await readBody(request, 64 * 1024));
    const historyChars = body.messages.reduce(
      (total, message) => total + message.content.length,
      0,
    );
    if (historyChars > MAX_HISTORY_CHARS)
      throw new AiError(
        "AI_INPUT_TOO_LARGE",
        "This conversation is too long. Clear the chat and start a new question.",
        413,
      );

    const reservation = await reserveAiUsage(userId, {
      feature: "chat",
      model: config.model,
      limits: aiLimits(config),
      reservedTokens: reservationTokens({
        promptText: body.messages
          .map((message) => message.content)
          .join("\n"),
        contextTokens: CONTEXT_TOKEN_ESTIMATE + 2_000,
        maxOutputTokens: config.maxOutputTokens,
        providerCalls: 1,
      }),
    });

    let context;
    try {
      context = await loadAiContext(userId);
    } catch (error) {
      await releaseSafely(reservation.id, userId, "CONTEXT_UNAVAILABLE");
      throw error;
    }

    const provider = createAiProvider(config);
    const messages = chatMessages(context, body.messages);
    const abort = new AbortController();
    const signal = AbortSignal.any([request.signal, abort.signal]);
    let settled = false;

    const settle = async (
      status: "success" | "error" | "aborted",
      result?: {
        usage: {
          inputTokens: number;
          outputTokens: number;
          totalTokens: number;
        };
        providerCalls: number;
      },
      errorCode?: string,
    ) => {
      if (settled) return;
      settled = true;
      await settleSafely({
        id: reservation.id,
        userId,
        status,
        inputTokens: result?.usage.inputTokens ?? 0,
        outputTokens: result?.usage.outputTokens ?? 0,
        // A started stream may have been billed even when it failed/aborted.
        tokensCharged:
          status === "success" && result
            ? result.usage.totalTokens
            : reservation.reservedTokens,
        providerCalls: result?.providerCalls ?? 1,
        errorCode: errorCode ?? null,
        contextVersion: context.contextVersion,
      });
    };

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: Parameters<typeof encodeNdjson>[0]) => {
          controller.enqueue(encodeNdjson(event));
        };
        try {
          send({ type: "start", contextVersion: context.contextVersion });
          const result = await provider.stream({
            messages,
            maxOutputTokens: config.maxOutputTokens,
            signal,
            onDelta: (text) => send({ type: "delta", text }),
          });
          await settle("success", result);
          send({
            type: "done",
            usage: {
              ...result.usage,
              providerCalls: result.providerCalls,
            },
          });
        } catch (error) {
          const code =
            error instanceof AiError ? error.code : "AI_PROVIDER_ERROR";
          await settle(
            code === "AI_ABORTED" ? "aborted" : "error",
            undefined,
            code,
          );
          if (!(error instanceof AiError))
            console.error("AI chat failed", {
              name: error instanceof Error ? error.name : "UnknownError",
            });
          try {
            send({
              type: "error",
              code,
              message:
                error instanceof AiError
                  ? error.message
                  : aiProviderError().message,
            });
          } catch {
            // The client is already gone.
          }
        } finally {
          abort.abort();
          try {
            controller.close();
          } catch {
            // Already closed by cancellation.
          }
        }
      },
      async cancel() {
        abort.abort();
        await settle("aborted", undefined, "AI_ABORTED");
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
