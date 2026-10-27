"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { MockForm } from "./mock-form";
import { safeWorkspaceReturnTo } from "@/lib/filters-url";
import { isIsoDate } from "@/lib/format";
import type { LogMockPayload } from "./ai-chat-sheet";
import type { Attempt } from "@/lib/domain";

/**
 * Query-aware wrapper for the existing /add form. Planner actions pass the
 * selected attempt date, optional scheduled-task title, and a validated
 * planner return target. `prefill` carries a reviewed draft from the AI
 * panel's Log a Mock tab — applied once, then consumed. The form remains
 * the sole save path either way.
 */
export function AddMockView({
  attempt,
  knownAttempts,
  prefill,
  onConsumePrefill,
  onClose,
  onSaved,
}: {
  attempt?: Attempt;
  knownAttempts?: Attempt[];
  /** Reviewed AI-panel draft (AI or standard parse) to prefill the form. */
  prefill?: LogMockPayload | null;
  /** Clears the shell's one-shot prefill after it has been applied. */
  onConsumePrefill?: () => void;
  onClose: () => void;
  onSaved: (returnTo?: string | null) => void | Promise<void>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const dateParam = params.get("date") ?? "";
  // An AI-panel prefill wins over ?date= (it carries its own reviewed date);
  // the query params still apply for normal planner flows.
  const initialDate = prefill
    ? isIsoDate(prefill.date)
      ? prefill.date
      : undefined
    : isIsoDate(dateParam)
      ? dateParam
      : undefined;
  const nameParam = prefill
    ? ""
    : (params.get("name") ?? "").trim().slice(0, 150);
  const initialName = nameParam || undefined;
  const returnTo = safeWorkspaceReturnTo(params.get("returnTo"));
  return (
    <MockForm
      key={`${initialDate ?? "today"}:${initialName ?? "blank"}:${attempt?.id ?? "new"}:${prefill ? "prefilled" : "blank"}`}
      attempt={attempt}
      knownAttempts={knownAttempts}
      initialDate={initialDate}
      initialName={initialName}
      initialDraft={prefill ?? undefined}
      onPrefillApplied={onConsumePrefill}
      backLabel={returnTo ? "Back to planner" : "Back to dashboard"}
      onClose={() => {
        if (returnTo) router.push(returnTo);
        else onClose();
      }}
      onSaved={() => onSaved(returnTo)}
    />
  );
}
