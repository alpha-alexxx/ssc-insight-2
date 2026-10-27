/**
 * Known OpenAI-compatible providers offered by the AI picker. All of these
 * speak `/chat/completions`, which is the only protocol the provider client
 * implements.
 *
 * `custom` is present but intentionally has no fixed base URL: the user types
 * it, and the server validates it through the SSRF guard.
 */

export type ProviderId =
  | "openai"
  | "openrouter"
  | "groq"
  | "together"
  | "deepseek"
  | "ollama"
  | "custom";

export type ProviderPreset = {
  id: ProviderId;
  label: string;
  /** Fixed base URL, or null when the user must supply one. */
  baseUrl: string | null;
  /** Representative models offered as suggestions (free text is allowed). */
  models: string[];
  /** True when the endpoint is typically a local server without auth. */
  local?: boolean;
  note?: string;
};

export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-flash-1.5",
    ],
    note: "One key for many models.",
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    note: "Very fast inference.",
  },
  {
    id: "together",
    label: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo"],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    models: ["llama3.2", "qwen2.5"],
    local: true,
    note: "Runs on your own machine. Only reachable from a local install.",
  },
  {
    id: "custom",
    label: "Custom endpoint",
    baseUrl: null,
    models: [],
    note: "Any OpenAI-compatible /chat/completions endpoint.",
  },
] as const;

export const PROVIDER_IDS = new Set<string>(
  PROVIDER_PRESETS.map((preset) => preset.id),
);

export function providerPreset(id: string): ProviderPreset | null {
  return PROVIDER_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function providerLabel(id: string): string {
  return providerPreset(id)?.label ?? "Custom endpoint";
}
