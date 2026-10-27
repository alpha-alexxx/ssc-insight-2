"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { api } from "@/lib/api-client";
import { useToast } from "./toast";
import { PlainIcon } from "./icon";
import { cn } from "@/lib/utils";
import {
  PROVIDER_PRESETS,
  providerPreset,
  type ProviderId,
} from "@/lib/ai/providers";
import { sameCredentialTarget } from "@/lib/ai/connection-target";
import type {
  AiCredentialSummary,
  AiModelsResponse,
  AiSettingsResponse,
} from "@/lib/ai/client-types";

type Props = {
  onChanged?: (credential: AiCredentialSummary | null) => void;
  variant?: "settings" | "panel";
  showHeading?: boolean;
};

const EMPTY_FORM = {
  provider: "openai" as ProviderId,
  baseUrl: "https://api.openai.com/v1",
  model: "",
  apiKey: "",
  jsonMode: true,
  allowPrivate: false,
};
type Form = typeof EMPTY_FORM;
type Catalog = {
  state: "idle" | "loading" | "ready" | "error";
  models: AiModelsResponse["models"];
  error?: string;
};
const EMPTY_CATALOG: Catalog = { state: "idle", models: [] };
const fieldClass =
  "min-h-10 w-full rounded-control border border-rule bg-paper px-3 py-2 text-sm text-ink shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60";

/** Shared by Settings and the narrow chat sheet. Keys remain write-only. */
export function AiSettingsForm({
  onChanged,
  variant = "settings",
  showHeading = true,
}: Props) {
  const toast = useToast();
  const id = useId();
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<"save" | "test" | "remove" | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [stored, setStored] = useState<AiCredentialSummary | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [tested, setTested] = useState(false);
  const [revealKey, setRevealKey] = useState(false);
  const [manual, setManual] = useState(false);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const catalogRequest = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  const load = useCallback(() => {
    return api<AiSettingsResponse>("/api/ai/settings")
      .then((data) => {
        if (!mounted.current) return;
        setStorageAvailable(data.storageAvailable);
        setStored(data.credential);
        if (data.credential) {
          const credential = data.credential;
          setForm({
            provider: credential.provider as ProviderId,
            baseUrl: credential.baseUrl,
            model: credential.model,
            apiKey: "",
            jsonMode: credential.jsonMode,
            allowPrivate: credential.allowPrivate,
          });
          setManual(
            !providerPreset(credential.provider)?.models.includes(
              credential.model,
            ),
          );
        }
      })
      .catch(() => {
        if (mounted.current) setLoadFailed(true);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      catalogRequest.current?.abort();
    };
  }, [load]);

  const compact = variant === "panel";
  const preset = providerPreset(form.provider);
  const isLocal = Boolean(preset?.local);
  const keepingKey = Boolean(stored && sameCredentialTarget(stored, form));
  const hasKey = Boolean(form.apiKey.trim() || keepingKey);
  const connectionReady = Boolean(
    hasKey && form.baseUrl.trim() && (!isLocal || form.allowPrivate),
  );
  const dirty = !stored
    ? Boolean(form.apiKey.trim() || form.model)
    : !sameCredentialTarget(stored, form) ||
      stored.model !== form.model.trim() ||
      stored.jsonMode !== form.jsonMode ||
      stored.allowPrivate !== form.allowPrivate ||
      Boolean(form.apiKey.trim());
  const canSave =
    !busy &&
    connectionReady &&
    Boolean(form.model.trim()) &&
    dirty &&
    storageAvailable;
  const suggestions = (preset?.models ?? []).map((model) => ({
    id: model,
    name: model,
  }));
  const models = catalog.state === "ready" ? catalog.models : suggestions;
  const visibleModels = models.filter((model) =>
    `${model.id} ${model.name}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  function change(patch: Partial<Form>, resetCatalog = false) {
    setForm((current) => ({ ...current, ...patch }));
    setError(null);
    setTested(false);
    setConfirmRemove(false);
    if (resetCatalog) {
      catalogRequest.current?.abort();
      catalogRequest.current = null;
      setCatalog(EMPTY_CATALOG);
      setQuery("");
    }
  }

  function chooseProvider(provider: ProviderId) {
    if (provider === form.provider) return;
    const next = providerPreset(provider);
    change(
      {
        provider,
        baseUrl: next?.baseUrl ?? "",
        model: "",
        apiKey: "",
        allowPrivate: Boolean(next?.local),
      },
      true,
    );
    setManual(provider === "custom");
    setRevealKey(false);
  }

  function payload() {
    return {
      provider: form.provider,
      baseUrl: form.baseUrl.trim(),
      model: form.model.trim(),
      ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
      jsonMode: form.jsonMode,
      allowHttp: isLocal,
      allowPrivate: form.allowPrivate,
    };
  }

  async function fetchModels() {
    catalogRequest.current?.abort();
    const controller = new AbortController();
    catalogRequest.current = controller;
    setCatalog({ state: "loading", models: [] });
    setQuery("");
    try {
      const data = await api<AiModelsResponse>("/api/ai/models", {
        method: "POST",
        body: JSON.stringify(payload()),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setCatalog({ state: "ready", models: data.models });
      setManual(false);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setCatalog({
        state: "error",
        models: [],
        error:
          cause instanceof Error
            ? cause.message
            : "Could not fetch models. Try again or enter a model ID.",
      });
    }
  }

  async function save() {
    if (!canSave) return;
    setBusy("save");
    setError(null);
    try {
      const data = await api<AiCredentialSummary>("/api/ai/settings", {
        method: "PUT",
        body: JSON.stringify(payload()),
      });
      if (!mounted.current) return;
      setStored(data);
      setForm((current) => ({ ...current, apiKey: "" }));
      setRevealKey(false);
      toast.success("AI settings saved", `${data.model} is selected.`);
      onChanged?.(data);
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not save AI settings. Try again.",
        );
    } finally {
      if (mounted.current) setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    setError(null);
    setTested(false);
    try {
      await api("/api/ai/test", {
        method: "POST",
        body: JSON.stringify(payload()),
      });
      if (mounted.current) setTested(true);
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "The provider did not respond. Check the key and model.",
        );
    } finally {
      if (mounted.current) setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    setError(null);
    try {
      await api("/api/ai/settings", { method: "DELETE" });
      if (!mounted.current) return;
      catalogRequest.current?.abort();
      setStored(null);
      setForm(EMPTY_FORM);
      setCatalog(EMPTY_CATALOG);
      setQuery("");
      setManual(false);
      setTested(false);
      setRevealKey(false);
      setConfirmRemove(false);
      toast.info(
        "Personal AI settings removed",
        "The server configuration, if available, will be used instead.",
      );
      onChanged?.(null);
    } catch {
      if (mounted.current)
        setError("Could not remove your settings. Try again.");
    } finally {
      if (mounted.current) setBusy(null);
    }
  }

  if (loading)
    return (
      <p className="py-6 text-sm text-muted" role="status">
        Loading AI settings…
      </p>
    );
  if (loadFailed)
    return (
      <div className="space-y-3 py-4">
        <p role="alert" className="text-sm text-danger">
          Could not load your AI settings. Your saved configuration is
          unchanged.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setLoading(true);
            setLoadFailed(false);
            void load();
          }}
        >
          Retry loading
        </Button>
      </div>
    );

  return (
    <form
      aria-label="AI provider settings"
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="space-y-2">
        {showHeading && (
          <h2 className="font-serif text-xl font-medium">AI provider</h2>
        )}
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          Choose the provider and model for your coach and report assistant.
          Your personal settings take priority over the server defaults.
        </p>
        {stored && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
              <PlainIcon name="check" size={14} /> Saved configuration
            </span>
            <span className="min-w-0 break-all text-muted">
              {providerPreset(stored.provider)?.label ?? stored.provider} ·{" "}
              {stored.model}
            </span>
          </div>
        )}
      </div>

      {!storageAvailable && (
        <p
          role="status"
          className="rounded-control border border-warning bg-warning-soft p-3 text-xs leading-relaxed text-warning"
        >
          Personal key storage is unavailable on this installation. You can
          fetch models and test a key for this session, but saving needs to be
          enabled by the person managing the app.
        </p>
      )}

      <div
        className={cn(
          "grid min-w-0 gap-7",
          !compact &&
            "xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:gap-8",
        )}
      >
        <fieldset disabled={Boolean(busy)} className="min-w-0 space-y-5">
          <legend className="mb-4 font-serif text-lg font-medium text-ink">
            Connection
          </legend>
          <div className="space-y-2">
            <Label htmlFor={`${id}-provider`}>Provider</Label>
            <select
              id={`${id}-provider`}
              className={fieldClass}
              value={form.provider}
              onChange={(event) =>
                chooseProvider(event.target.value as ProviderId)
              }
            >
              {PROVIDER_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            {preset?.note && (
              <p className="text-xs leading-relaxed text-muted">
                {preset.note}
              </p>
            )}
          </div>

          {form.provider === "custom" && (
            <div className="space-y-2">
              <Label htmlFor={`${id}-base`}>API base URL</Label>
              <input
                id={`${id}-base`}
                type="url"
                className={fieldClass}
                value={form.baseUrl}
                onChange={(event) =>
                  change({ baseUrl: event.target.value }, true)
                }
                placeholder="https://your-provider.com/v1"
                autoComplete="off"
                spellCheck={false}
                maxLength={300}
              />
              <p className="text-xs leading-relaxed text-muted">
                Use the base URL for an OpenAI-compatible API, without
                /chat/completions.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`${id}-key`}>
              {keepingKey ? "Replace API key" : "API key"}
            </Label>
            <div className="relative">
              <input
                id={`${id}-key`}
                type={revealKey ? "text" : "password"}
                className={cn(fieldClass, "pr-12")}
                value={form.apiKey}
                onChange={(event) =>
                  change({ apiKey: event.target.value }, true)
                }
                placeholder={
                  keepingKey
                    ? "Leave blank to keep saved key"
                    : isLocal
                      ? "Your local server key"
                      : "Paste your provider’s API key"
                }
                autoComplete="off"
                spellCheck={false}
                maxLength={400}
                aria-describedby={`${id}-key-help`}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink disabled:opacity-50"
                disabled={!form.apiKey}
                aria-label={revealKey ? "Hide API key" : "Show API key"}
                aria-pressed={revealKey}
                onClick={() => setRevealKey((value) => !value)}
              >
                {revealKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p
              id={`${id}-key-help`}
              className="text-xs leading-relaxed text-muted"
            >
              {keepingKey
                ? `Saved key${stored?.keyHint ? ` ending ${stored.keyHint}` : ""}. Leave this blank to keep it.`
                : "Your key is encrypted when saved and is never returned to the browser."}
            </p>
          </div>

          <details className="border-t border-rule-soft pt-3">
            <summary className="text-xs font-medium text-ink">
              Advanced connection settings
            </summary>
            <div className="space-y-4 pt-4">
              {form.provider !== "custom" && (
                <div className="space-y-2">
                  <Label htmlFor={`${id}-endpoint`}>API base URL</Label>
                  <input
                    id={`${id}-endpoint`}
                    className={cn(fieldClass, "text-xs")}
                    value={form.baseUrl}
                    readOnly
                  />
                  <p className="text-xs text-muted">
                    Choose Custom endpoint to use a different URL.
                  </p>
                </div>
              )}
              <label className="check-row text-xs">
                <input
                  type="checkbox"
                  checked={form.jsonMode}
                  onChange={(event) =>
                    change({ jsonMode: event.target.checked })
                  }
                />
                <span>Request structured JSON responses</span>
              </label>
              <p className="text-xs leading-relaxed text-muted">
                Turn this off if your provider does not support JSON mode.
              </p>
              {isLocal && (
                <label className="check-row items-start text-xs">
                  <input
                    type="checkbox"
                    checked={form.allowPrivate}
                    onChange={(event) =>
                      change({ allowPrivate: event.target.checked }, true)
                    }
                  />
                  <span>
                    Allow access to my local server. It must be reachable from
                    the app’s server.
                  </span>
                </label>
              )}
            </div>
          </details>
        </fieldset>

        <fieldset disabled={Boolean(busy)} className="min-w-0 space-y-4">
          <legend className="mb-4 font-serif text-lg font-medium text-ink">
            Model
          </legend>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-[30ch] flex-1 text-xs leading-relaxed text-muted">
              Fetch the provider’s catalog, then choose a model. Availability
              depends on your account.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!connectionReady || catalog.state === "loading"}
              onClick={() => void fetchModels()}
            >
              {catalog.state === "loading" ? (
                <Loader2
                  size={14}
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <PlainIcon name="refresh" size={14} />
              )}
              {catalog.state === "loading"
                ? "Fetching…"
                : catalog.state === "ready"
                  ? "Refresh models"
                  : "Fetch models"}
            </Button>
          </div>
          {!connectionReady && (
            <p className="text-xs text-muted">
              {isLocal && !form.allowPrivate
                ? "Enable local access in advanced settings to fetch models."
                : "Enter your API key to fetch available models."}
            </p>
          )}
          <div
            role="group"
            aria-label="Model selection method"
            className="flex border-b border-rule-soft"
          >
            {[
              { value: false, label: "Choose from list" },
              { value: true, label: "Enter model ID" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                aria-pressed={manual === item.value}
                onClick={() => setManual(item.value)}
                className={cn(
                  "min-h-10 border-b-2 px-3 text-xs font-medium transition-colors",
                  manual === item.value
                    ? "border-accent text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {catalog.state === "error" && (
            <p role="alert" className="text-xs leading-relaxed text-danger">
              {catalog.error}
            </p>
          )}
          {manual ? (
            <div className="space-y-2">
              <Label htmlFor={`${id}-model`}>Model ID</Label>
              <input
                id={`${id}-model`}
                className={fieldClass}
                value={form.model}
                onChange={(event) => change({ model: event.target.value })}
                placeholder={
                  preset?.models[0] ?? "Your provider’s exact model ID"
                }
                autoComplete="off"
                spellCheck={false}
                maxLength={120}
              />
              <p className="text-xs leading-relaxed text-muted">
                Use the exact ID from your provider. You can test it before
                saving.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-control border border-rule-soft">
              <div className="border-b border-rule-soft bg-canvas px-3 py-2">
                <Label htmlFor={`${id}-search`} className="sr-only">
                  Search models
                </Label>
                <div className="flex items-center gap-2">
                  <PlainIcon
                    name="search"
                    size={14}
                    className="shrink-0 text-muted"
                  />
                  <input
                    id={`${id}-search`}
                    type="search"
                    className="min-h-8 min-w-0 border-0 bg-transparent p-0 text-sm shadow-none"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search model name or ID"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div
                className="border-b border-rule-soft px-3 py-2 text-xs text-muted"
                role="status"
                aria-live="polite"
              >
                {catalog.state === "loading"
                  ? "Loading models from your provider…"
                  : catalog.state === "ready"
                    ? `${catalog.models.length} models fetched · ${visibleModels.length} shown`
                    : "Suggestions · availability not checked"}
              </div>
              <div
                className="max-h-60 overflow-y-auto overscroll-contain"
                aria-busy={catalog.state === "loading"}
              >
                {catalog.state === "loading" ? (
                  <p className="p-5 text-center text-sm text-muted">
                    Fetching your model list…
                  </p>
                ) : visibleModels.length ? (
                  visibleModels.map((model) => (
                    <label
                      key={model.id}
                      className={cn(
                        "check-row m-0 min-h-12 cursor-pointer border-b border-rule-soft px-3 py-3 last:border-b-0 hover:bg-canvas",
                        form.model === model.id && "bg-accent-soft",
                      )}
                    >
                      <input
                        type="radio"
                        name={`${id}-models`}
                        className="size-4! w-4! shrink-0 accent-accent"
                        value={model.id}
                        checked={form.model === model.id}
                        onChange={() => change({ model: model.id })}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block break-all text-sm font-medium text-ink">
                          {model.name}
                        </span>
                        {model.name !== model.id && (
                          <span className="mt-0.5 block break-all text-xs font-normal text-muted">
                            {model.id}
                          </span>
                        )}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="space-y-2 p-5 text-center text-xs leading-relaxed text-muted">
                    <p>
                      {query.trim()
                        ? "No models match your search."
                        : catalog.state === "ready"
                          ? "This provider returned no models."
                          : "Fetch a model list or enter an ID manually."}
                    </p>
                    {query.trim() && (
                      <button
                        type="button"
                        className="text-ink underline underline-offset-4"
                        onClick={() => setQuery("")}
                      >
                        Clear search
                      </button>
                    )}
                    <button
                      type="button"
                      className="block w-full text-ink underline underline-offset-4"
                      onClick={() => setManual(true)}
                    >
                      Enter a model ID
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          <p className="break-all text-xs leading-relaxed text-muted">
            {form.model ? (
              <>
                <span className="font-medium text-ink">Selected: </span>
                {form.model}
              </>
            ) : (
              "No model selected yet."
            )}
          </p>
          {!manual &&
            catalog.state === "ready" &&
            form.model &&
            !catalog.models.some((model) => model.id === form.model) && (
              <p className="text-xs leading-relaxed text-muted">
                Your selected model is not in this catalog. Keep its ID or
                choose another model.
              </p>
            )}
        </fieldset>
      </div>

      <div className="space-y-3 border-t border-rule-soft pt-4">
        {error && (
          <p role="alert" className="text-sm leading-relaxed text-danger">
            {error}
          </p>
        )}
        {tested && (
          <p
            role="status"
            className="flex items-start gap-2 text-xs leading-relaxed text-positive"
          >
            <PlainIcon name="check" size={14} className="mt-0.5 shrink-0" />
            {dirty
              ? "Connection verified for these settings. Save to use them."
              : "Connection verified for your saved settings."}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={!canSave}>
            {busy === "save" ? "Saving…" : "Save AI settings"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy) || !connectionReady || !form.model.trim()}
            onClick={() => void test()}
          >
            {busy === "test" ? "Testing…" : "Test connection"}
          </Button>
          <span role="status" className="text-xs text-muted">
            {dirty
              ? "Unsaved changes"
              : stored
                ? "All changes saved"
                : "Not configured"}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Testing sends one short request to the selected model and may use
          provider credits. It does not save your settings.
        </p>
        {stored && (
          <div className="pt-1">
            {confirmRemove ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="w-full text-xs text-muted">
                  Remove your saved provider and encrypted key?
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={Boolean(busy)}
                  onClick={() => void remove()}
                >
                  {busy === "remove" ? "Removing…" : "Remove personal settings"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={Boolean(busy)}
                  onClick={() => setConfirmRemove(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="min-h-9 text-xs text-muted underline underline-offset-4 hover:text-danger disabled:opacity-50"
                disabled={Boolean(busy)}
                onClick={() => setConfirmRemove(true)}
              >
                Remove personal settings
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
