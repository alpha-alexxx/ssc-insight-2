"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { api } from "@/lib/api-client";
import { useToast } from "./toast";
import { PlainIcon } from "./icon";
import {
  PROVIDER_PRESETS,
  providerPreset,
  type ProviderId,
} from "@/lib/ai/providers";
import type {
  AiCredentialSummary,
  AiSettingsResponse,
} from "@/lib/ai/client-types";

/**
 * AI provider picker. Rendered in Settings → AI and inside the chat Sheet, so a
 * user can configure AI the moment they hit "not configured".
 *
 * The API key is write-only: it is sent once and the server returns only a
 * 4-character hint. Nothing here ever reads a stored key back into state.
 */

type Props = {
  /** Called after a successful save/delete so callers can refetch AI status. */
  onChanged?: (credential: AiCredentialSummary | null) => void;
  /** Compact spacing for the in-panel variant. */
  variant?: "settings" | "panel";
  /** Hide the heading when the parent already provides one. */
  showHeading?: boolean;
};

const EMPTY_FORM = {
  provider: "openai" as ProviderId,
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  apiKey: "",
  jsonMode: true,
  allowPrivate: false,
};

export function AiSettingsForm({
  onChanged,
  variant = "settings",
  showHeading = true,
}: Props) {
  const toast = useToast();
  const fieldId = useId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [stored, setStored] = useState<AiCredentialSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const applyResponse = useCallback((data: AiSettingsResponse) => {
    setStorageAvailable(data.storageAvailable);
    setStored(data.credential);
    if (data.credential) {
      setForm({
        provider: data.credential.provider as ProviderId,
        baseUrl: data.credential.baseUrl,
        model: data.credential.model,
        apiKey: "",
        jsonMode: data.credential.jsonMode,
        allowPrivate: data.credential.allowPrivate,
      });
    }
    setLoading(false);
  }, []);

  // State is set from the promise callback, not synchronously in the effect
  // body, so this stays a real data subscription rather than a cascade.
  useEffect(() => {
    let active = true;
    api<AiSettingsResponse>("/api/ai/settings")
      .then((data) => {
        if (active) applyResponse(data);
      })
      .catch(() => {
        if (!active) return;
        setError("Could not load your AI settings.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyResponse]);

  const preset = providerPreset(form.provider);
  const isLocal = Boolean(preset?.local);
  // http:// only ever applies to local providers; the server enforces this too.
  const allowHttp = isLocal;

  const dirty = useMemo(() => {
    if (!stored) return form.apiKey.trim().length > 0;
    return (
      stored.provider !== form.provider ||
      stored.baseUrl !== form.baseUrl.trim() ||
      stored.model !== form.model.trim() ||
      stored.jsonMode !== form.jsonMode ||
      stored.allowPrivate !== form.allowPrivate ||
      form.apiKey.trim().length > 0
    );
  }, [form, stored]);

  const canSave =
    dirty &&
    !saving &&
    form.model.trim().length > 0 &&
    form.baseUrl.trim().length > 0 &&
    (stored ? true : form.apiKey.trim().length > 0) &&
    storageAvailable;

  function chooseProvider(id: ProviderId) {
    const next = providerPreset(id);
    setForm((current) => ({
      ...current,
      provider: id,
      // Adopt the preset's URL/model, but never clobber a typed custom endpoint
      // with a placeholder.
      baseUrl: next?.baseUrl ?? current.baseUrl,
      model: next?.models[0] ?? current.model,
      allowPrivate: Boolean(next?.local),
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const data = await api<AiCredentialSummary>("/api/ai/settings", {
        method: "PUT",
        body: JSON.stringify({
          provider: form.provider,
          baseUrl: form.baseUrl.trim(),
          model: form.model.trim(),
          // Omitted when blank so the stored key is preserved.
          ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
          jsonMode: form.jsonMode,
          allowHttp,
          allowPrivate: form.allowPrivate,
        }),
      });
      setStored(data);
      setForm((current) => ({ ...current, apiKey: "" }));
      toast.success("AI provider saved", `${data.model} is ready to use.`);
      onChanged?.(data);    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not save the provider.";
      setError(message);
      toast.error("Could not save AI settings", message);
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setError(null);
    try {
      const data = await api<{ model: string; source: string }>("/api/ai/test", {
        method: "POST",
      });
      toast.success("Connection works", `${data.model} replied successfully.`);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "The provider did not respond.";
      setError(message);
      toast.error("Connection failed", message);
    } finally {
      setTesting(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError(null);
    try {
      await api("/api/ai/settings", { method: "DELETE" });
      setStored(null);
      setForm(EMPTY_FORM);
      toast.info("AI provider removed", "Your key was deleted from this server.");
      onChanged?.(null);
    } catch {
      setError("Could not remove the provider.");
    } finally {
      setSaving(false);
    }
  }

  const compact = variant === "panel";

  if (loading) {
    return (
      <p className="text-xs text-muted" aria-busy="true">
        Loading AI settings…
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {showHeading ? (
        <div>
          <h2 className="font-serif text-xl font-medium">AI provider</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Bring your own key. It is encrypted before storage and never
            returned to the browser, logged, or included in a backup.
          </p>
        </div>
      ) : null}

      {!storageAvailable ? (
        <p
          role="alert"
          className="rounded-control border border-warning bg-warning-soft px-3 py-2 text-xs text-warning"
        >
          This server has no <code>AI_CREDENTIAL_SECRET</code>, so personal keys
          cannot be stored. Add it to the environment to enable this form.
        </p>
      ) : null}

      {stored ? (
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1 rounded-control border border-positive bg-positive-soft px-2 py-0.5 text-positive">
            <PlainIcon name="check" size={11} /> Connected
          </span>
          <span>
            {providerPreset(stored.provider)?.label ?? stored.provider} ·{" "}
            {stored.model}
          </span>
          {stored.keyHint ? <span>key {stored.keyHint}</span> : null}
        </p>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="text-[10px] uppercase tracking-wide text-muted">
          Provider
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {PROVIDER_PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={form.provider === item.id}
              onClick={() => chooseProvider(item.id)}
              className={`rounded-control border px-2.5 py-1 text-xs transition-colors ${
                form.provider === item.id
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-paper text-ink hover:bg-soft"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {preset?.note ? (
          <p className="text-[11px] text-muted">{preset.note}</p>
        ) : null}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-base`}>Base URL</Label>
        <Input
          id={`${fieldId}-base`}
          value={form.baseUrl}
          onChange={(event) =>
            setForm((current) => ({ ...current, baseUrl: event.target.value }))
          }
          placeholder="https://api.openai.com/v1"
          spellCheck={false}
          autoComplete="off"
          disabled={form.provider !== "custom" && Boolean(preset?.baseUrl)}
        />
        <p className="text-[11px] text-muted">
          Must be an OpenAI-compatible endpoint. Private and reserved addresses
          are rejected.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-model`}>Model</Label>
        <Input
          id={`${fieldId}-model`}
          value={form.model}
          onChange={(event) =>
            setForm((current) => ({ ...current, model: event.target.value }))
          }
          placeholder="gpt-4o-mini"
          spellCheck={false}
          autoComplete="off"
        />
        {preset?.models.length ? (
          <p className="text-[11px] text-muted">
            Suggestions: {preset.models.join(", ")}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-key`}>
          API key{stored ? " (leave blank to keep the current key)" : ""}
        </Label>
        <Input
          id={`${fieldId}-key`}
          type="password"
          value={form.apiKey}
          onChange={(event) =>
            setForm((current) => ({ ...current, apiKey: event.target.value }))
          }
          placeholder={stored ? "••••••••" : "sk-…"}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {isLocal ? (
        <label className="flex items-start gap-2 text-[11px] text-muted">
          <input
            type="checkbox"
            checked={form.allowPrivate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                allowPrivate: event.target.checked,
              }))
            }
            className="mt-0.5"
          />
          <span>
            Allow a local/private address. Only enable this for a server you run
            yourself.
          </span>
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void save()}
          disabled={!canSave}
        >
          {saving ? "Saving…" : dirty ? "Save provider" : "Saved"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void test()}
          disabled={testing || !stored}
        >
          {testing ? "Testing…" : "Test connection"}
        </Button>
        {stored ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={saving}
            className="text-xs text-muted underline underline-offset-2 hover:text-danger"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
