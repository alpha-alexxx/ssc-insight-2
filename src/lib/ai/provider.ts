import type { AiConfig } from "./config-core";
import {
  AiError,
  aiAborted,
  aiInvalidOutput,
  aiProviderError,
  aiTimeout,
} from "./errors";
import { estimateTokens } from "./tokens";

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimated: boolean;
};

type RequestArgs = {
  messages: AiMessage[];
  maxOutputTokens: number;
  signal: AbortSignal;
};

export type AiProvider = {
  complete(args: RequestArgs): Promise<{
    text: string;
    usage: AiUsage;
    providerCalls: number;
  }>;
  completeJson<T>(
    args: RequestArgs & { parse: (raw: string) => T },
  ): Promise<{ value: T; usage: AiUsage; providerCalls: number }>;
  stream(
    args: RequestArgs & { onDelta: (text: string) => void },
  ): Promise<{ text: string; usage: AiUsage; providerCalls: number }>;
};

const MAX_STREAM_CHARS = 60_000;
const MAX_ERROR_BODY_CHARS = 8_192;
const REPAIR_INSTRUCTION =
  "Your previous reply was not valid JSON for the requested schema. Return only one JSON object, with no markdown fences or commentary.";

class JsonModeUnsupported extends Error {}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;
}

function usageFrom(payload: unknown, fallback: AiUsage): AiUsage {
  if (!payload || typeof payload !== "object") return fallback;
  const usage = (payload as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return fallback;
  const record = usage as Record<string, unknown>;
  const input =
    numberValue(record.prompt_tokens) ?? numberValue(record.input_tokens);
  const output =
    numberValue(record.completion_tokens) ?? numberValue(record.output_tokens);
  const total = numberValue(record.total_tokens);
  if (input == null && output == null && total == null) return fallback;
  const inputTokens = input ?? 0;
  const outputTokens = output ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: total ?? inputTokens + outputTokens,
    estimated: false,
  };
}

function estimatedUsage(messages: AiMessage[], output: string): AiUsage {
  const inputTokens = estimateTokens(
    messages.map((message) => message.content).join("\n"),
  );
  const outputTokens = estimateTokens(output);
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimated: true,
  };
}

function sumUsage(a: AiUsage, b: AiUsage): AiUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    estimated: a.estimated || b.estimated,
  };
}

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (
        part &&
        typeof part === "object" &&
        typeof (part as { text?: unknown }).text === "string"
      )
        return (part as { text: string }).text;
      return "";
    })
    .join("");
}

async function readLimitedText(response: Response, limit: number) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.length >= limit) {
        text = text.slice(0, limit);
        await reader.cancel();
        break;
      }
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

function responseMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  return (payload as { choices?: unknown }).choices;
}

export function createAiProvider(
  config: AiConfig,
  fetchImpl: typeof fetch = fetch,
): AiProvider {
  type Opened = {
    response: Response;
    cleanup: () => void;
    didTimeout: () => boolean;
  };

  async function open(
    body: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<Opened> {
    if (signal.aborted) throw aiAborted();
    const controller = new AbortController();
    let timedOut = false;
    const forwardAbort = () => controller.abort();
    signal.addEventListener("abort", forwardAbort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, config.timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", forwardAbort);
    };

    let response: Response;
    try {
      response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          Accept: body.stream ? "text/event-stream" : "application/json",
        },
        body: JSON.stringify(body),
        redirect: "error",
        signal: controller.signal,
      });
    } catch {
      cleanup();
      if (timedOut) throw aiTimeout();
      if (signal.aborted) throw aiAborted();
      throw aiProviderError();
    }

    if (!response.ok) {
      const errorBody = await readLimitedText(
        response,
        MAX_ERROR_BODY_CHARS,
      ).catch(() => "");
      cleanup();
      const errorText = errorBody.toLowerCase();
      if (
        response.status === 400 &&
        body.response_format &&
        (errorText.includes("response_format") ||
          errorText.includes("response format"))
      )
        throw new JsonModeUnsupported();
      throw aiProviderError();
    }

    return {
      response,
      cleanup,
      didTimeout: () => timedOut,
    };
  }

  function requestBody(
    args: RequestArgs,
    options: { stream: boolean; json: boolean },
  ) {
    return {
      model: config.model,
      messages: args.messages,
      max_tokens: args.maxOutputTokens,
      ...(options.stream ? { stream: true } : {}),
      ...(options.json && config.jsonMode
        ? { response_format: { type: "json_object" } }
        : {}),
    };
  }

  async function complete(
    args: RequestArgs,
    json = false,
  ): Promise<{ text: string; usage: AiUsage; providerCalls: number }> {
    let opened: Opened;
    try {
      opened = await open(
        requestBody(args, { stream: false, json }),
        args.signal,
      );
    } catch (error) {
      if (!(error instanceof JsonModeUnsupported)) throw error;
      // Some OpenAI-compatible servers reject response_format. Retry once
      // without it; the prompt and Zod validation still enforce JSON.
      opened = await open(
        requestBody(args, { stream: false, json: false }),
        args.signal,
      );
    }

    try {
      const raw = await readLimitedText(opened.response, 512_000);
      let payload: unknown;
      try {
        payload = JSON.parse(raw);
      } catch {
        throw aiProviderError();
      }
      const choices = responseMessage(payload);
      if (!Array.isArray(choices) || !choices.length) throw aiProviderError();
      const first = choices[0] as {
        message?: { content?: unknown };
        text?: unknown;
      };
      const text = contentText(first.message?.content ?? first.text);
      if (!text.trim()) throw aiInvalidOutput();
      return {
        text,
        usage: usageFrom(payload, estimatedUsage(args.messages, text)),
        providerCalls: 1,
      };
    } catch (error) {
      if (error instanceof AiError) throw error;
      if (opened.didTimeout()) throw aiTimeout();
      if (args.signal.aborted) throw aiAborted();
      throw aiProviderError();
    } finally {
      opened.cleanup();
    }
  }

  async function stream(
    args: RequestArgs & { onDelta: (text: string) => void },
  ): Promise<{ text: string; usage: AiUsage; providerCalls: number }> {
    const opened = await open(
      requestBody(args, { stream: true, json: false }),
      args.signal,
    );
    const contentType = opened.response.headers.get("content-type") ?? "";
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let providerUsage: AiUsage | null = null;
    let done = false;

    const handleLine = (rawLine: string) => {
      const line = rawLine.replace(/\r$/, "").trim();
      if (!line) return;
      if (line === "[DONE]" || line === "data: [DONE]") {
        done = true;
        return;
      }
      const payloadText = line.startsWith("data:")
        ? line.slice(5).trim()
        : line;
      if (!payloadText || payloadText === "[DONE]") return;
      let payload: unknown;
      try {
        payload = JSON.parse(payloadText);
      } catch {
        // Ignore keepalives and malformed compatibility chunks.
        return;
      }
      if (payload && typeof payload === "object" && "error" in payload)
        throw aiProviderError();
      const choices = responseMessage(payload);
      const first = Array.isArray(choices)
        ? (choices[0] as
            | {
                delta?: { content?: unknown };
                message?: { content?: unknown };
                text?: unknown;
              }
            | undefined)
        : undefined;
      const piece = contentText(
        first?.delta?.content ?? first?.message?.content ?? first?.text,
      );
      if (piece) {
        text += piece;
        args.onDelta(piece);
        if (text.length >= MAX_STREAM_CHARS) done = true;
      }
      const usage = usageFrom(payload, {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimated: true,
      });
      // Usage is normally a single final total, not a per-chunk delta.
      if (!usage.estimated) providerUsage = usage;
    };

    try {
      // Some gateways ignore stream:true and return one JSON response.
      if (contentType.includes("application/json")) {
        const raw = await readLimitedText(opened.response, 512_000);
        const payload = JSON.parse(raw) as unknown;
        const choices = responseMessage(payload);
        const first = Array.isArray(choices)
          ? (choices[0] as { message?: { content?: unknown }; text?: unknown })
          : undefined;
        const full = contentText(first?.message?.content ?? first?.text);
        if (!full.trim()) throw aiInvalidOutput();
        text = full;
        args.onDelta(full);
        return {
          text,
          usage: usageFrom(payload, estimatedUsage(args.messages, full)),
          providerCalls: 1,
        };
      }

      if (!opened.response.body) throw aiProviderError();
      const bodyReader = opened.response.body.getReader();
      reader = bodyReader;
      while (!done) {
        const { done: finished, value } = await bodyReader.read();
        if (finished) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          handleLine(buffer.slice(0, newline));
          buffer = buffer.slice(newline + 1);
          if (done) break;
          newline = buffer.indexOf("\n");
        }
      }
      buffer += decoder.decode();
      if (!done && buffer) handleLine(buffer);
      if (!text.trim()) throw aiInvalidOutput();
      return {
        text,
        usage: providerUsage ?? estimatedUsage(args.messages, text),
        providerCalls: 1,
      };
    } catch (error) {
      if (error instanceof AiError) throw error;
      if (opened.didTimeout()) throw aiTimeout();
      if (args.signal.aborted) throw aiAborted();
      throw aiProviderError();
    } finally {
      opened.cleanup();
      if (reader) {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    }
  }

  async function completeJson<T>(
    args: RequestArgs & { parse: (raw: string) => T },
  ): Promise<{ value: T; usage: AiUsage; providerCalls: number }> {
    const first = await complete(args, true);
    try {
      return {
        value: args.parse(first.text),
        usage: first.usage,
        providerCalls: 1,
      };
    } catch {
      if (args.signal.aborted) throw aiAborted();
    }

    const repaired = await complete(
      {
        ...args,
        messages: [
          ...args.messages,
          { role: "assistant", content: first.text.slice(0, 12_000) },
          { role: "user", content: REPAIR_INSTRUCTION },
        ],
      },
      true,
    );
    let value: T;
    try {
      value = args.parse(repaired.text);
    } catch {
      throw aiInvalidOutput();
    }
    return {
      value,
      usage: sumUsage(first.usage, repaired.usage),
      providerCalls: 2,
    };
  }

  return { complete, completeJson, stream };
}
