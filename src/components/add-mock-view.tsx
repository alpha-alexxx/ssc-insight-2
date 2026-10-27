"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { MockForm } from "./mock-form";
import { safeWorkspaceReturnTo } from "@/lib/filters-url";
import { isIsoDate } from "@/lib/format";
import type { Attempt } from "@/lib/domain";

/**
 * Query-aware wrapper for the existing /add form. Planner actions pass the
 * selected attempt date, optional scheduled-task title, and a validated
 * planner return target. The form remains the sole save path.
 */
export function AddMockView({
  attempt,
  knownAttempts,
  onClose,
  onSaved,
}: {
  attempt?: Attempt;
  knownAttempts?: Attempt[];
  onClose: () => void;
  onSaved: (returnTo?: string | null) => void | Promise<void>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const dateParam = params.get("date") ?? "";
  const initialDate = isIsoDate(dateParam) ? dateParam : undefined;
  const nameParam = (params.get("name") ?? "").trim().slice(0, 150);
  const initialName = nameParam || undefined;
  const returnTo = safeWorkspaceReturnTo(params.get("returnTo"));
  return (
    <MockForm
      key={`${initialDate ?? "today"}:${initialName ?? "blank"}:${attempt?.id ?? "new"}`}
      attempt={attempt}
      knownAttempts={knownAttempts}
      initialDate={initialDate}
      initialName={initialName}
      backLabel={returnTo ? "Back to planner" : "Back to dashboard"}
      onClose={() => {
        if (returnTo) router.push(returnTo);
        else onClose();
      }}
      onSaved={() => onSaved(returnTo)}
    />
  );
}
