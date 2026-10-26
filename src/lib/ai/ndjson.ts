export type ChatUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimated: boolean;
  providerCalls: number;
};

export type AiChatEvent =
  | { type: "start"; contextVersion: string }
  | { type: "delta"; text: string }
  | { type: "done"; usage: ChatUsage }
  | { type: "error"; code: string; message: string };

const encoder = new TextEncoder();

export function encodeNdjson(event: AiChatEvent) {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

/** Buffers partial UTF-8 and partial lines between network chunks. */
export class NdjsonDecoder {
  private buffer = "";
  private decoder = new TextDecoder();

  push(chunk: Uint8Array) {
    this.buffer += this.decoder.decode(chunk, { stream: true });
    return this.drain();
  }

  flush() {
    this.buffer += this.decoder.decode();
    const lines = this.drain();
    const trailing = this.buffer.trim();
    this.buffer = "";
    if (trailing) lines.push(trailing);
    return lines;
  }

  private drain() {
    const lines: string[] = [];
    let newline = this.buffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newline + 1);
      if (line.trim()) lines.push(line);
      newline = this.buffer.indexOf("\n");
    }
    return lines;
  }
}

export function parseChatEvent(line: string): AiChatEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const event = value as Record<string, unknown>;
  if (event.type === "start" && typeof event.contextVersion === "string")
    return { type: "start", contextVersion: event.contextVersion };
  if (event.type === "delta" && typeof event.text === "string")
    return { type: "delta", text: event.text };
  if (event.type === "error" && typeof event.message === "string")
    return {
      type: "error",
      code: typeof event.code === "string" ? event.code : "AI_PROVIDER_ERROR",
      message: event.message,
    };
  if (event.type === "done" && event.usage && typeof event.usage === "object") {
    const usage = event.usage as Record<string, unknown>;
    if (
      typeof usage.inputTokens === "number" &&
      typeof usage.outputTokens === "number" &&
      typeof usage.totalTokens === "number" &&
      typeof usage.estimated === "boolean" &&
      typeof usage.providerCalls === "number"
    )
      return { type: "done", usage: usage as ChatUsage };
  }
  return null;
}
