"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { PlainIcon } from "./icon";
import {
  attemptSchemaFor,
  sectionForSubjects,
  SUBJECTS,
  type Attempt,
  type AttemptInput,
  type PatternShape,
  type SubjectId,
  type SubjectResult,
  totals,
  formatNumber,
  formatScore,
  formatTime,
} from "@/lib/domain";
import { useExamScope } from "./exam-context";
import type { ExamDef } from "@/lib/exams";
import {
  calculatedEntry,
  completionDate,
  completionTimestamp,
  MOCK_PLATFORMS,
  platformSelection,
} from "@/lib/mock-entry";
import { istTodayIso } from "@/lib/plan/view-model";
import { isIsoDate } from "@/lib/format";
import { DurationInput } from "./duration-input";
import { parseReport } from "@/lib/report-parser";
import { api } from "@/lib/api-client";
import type { AiStatus, ExtractResponse } from "@/lib/ai/client-types";
import {
  extractionToAttempt,
  MAX_EXTRACT_CHARS,
  type ExtractionDraft,
} from "@/lib/ai/extraction";
import { ExtractionReview } from "./extraction-review";
const blankSubject = (id: SubjectId, shape: PatternShape): SubjectResult => ({
  subjectId: id,
  questions:
    shape.subjects.find((s) => s.subjectId === id)?.questions ??
    SUBJECTS[id].questions,
  correct: 0,
  incorrect: 0,
  qualifying:
    shape.subjects.find((s) => s.subjectId === id)?.qualifying ?? false,
  timeSeconds: 0,
  scoreOverride: null,
});
function fullMockSectionHeading(subjectId: SubjectId, shape: PatternShape) {
  const section = shape.sections.find((s) => s.subjectIds[0] === subjectId);
  if (section) {
    const maxScore =
      section.subjectIds.reduce(
        (sum, id) =>
          sum +
          (shape.subjects.find((s) => s.subjectId === id)?.questions ?? 0),
        0,
      ) * shape.marking.correct;
    return `${section.name} · ${section.description} · ${maxScore} marks`;
  }
  const pattern = shape.subjects.find((s) => s.subjectId === subjectId);
  if (pattern?.qualifying)
    return `${SUBJECTS[subjectId].name} · qualifying · ${pattern.questions * shape.marking.correct} marks`;
  return null;
}
/** The default tier for a new attempt: the most-logged tier of this exam,
 * else the exam's primary tier. */
function defaultTierId(
  exam: ExamDef | null,
  knownAttempts: Attempt[] | undefined,
  examId: string,
): string {
  if (!exam) return "main";
  const counts = new Map<string, number>();
  for (const attempt of knownAttempts ?? []) {
    if (attempt.examId !== examId) continue;
    counts.set(attempt.tierId, (counts.get(attempt.tierId) ?? 0) + 1);
  }
  const [mostLogged] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (mostLogged && exam.tiers.some((t) => t.id === mostLogged))
    return mostLogged;
  return exam.primaryTierId;
}
/** Merit-bearing (non-qualifying) subject ids of a pattern, in order. */
function meritSubjectIds(shape: PatternShape): SubjectId[] {
  return shape.subjects.filter((s) => !s.qualifying).map((s) => s.subjectId);
}

export function MockForm({
  attempt,
  knownAttempts,
  initialDate,
  initialName,
  initialDraft,
  onPrefillApplied,
  backLabel = "Back to dashboard",
  onClose,
  onSaved,
}: {
  attempt?: Attempt;
  /** Already-loaded attempts from the shell; saves an extra fetch when the
   * duplicate check runs. Empty/undefined falls back to fetching. */
  knownAttempts?: Attempt[];
  /** Planner-selected date / task title for a new attempt. */
  initialDate?: string;
  initialName?: string;
  /** Reviewed draft from the AI panel's Log a Mock tab, applied once at
   * mount through the same merge path as a paste import. */
  initialDraft?: { values: Partial<AttemptInput>; date?: string };
  /** Called after the initial draft has been applied (shell clears it). */
  onPrefillApplied?: () => void;
  backLabel?: string;
  onClose: () => void;
  onSaved: (returnTo?: string | null) => void | Promise<void>;
}) {
  const scope = useExamScope();
  // Editing locks the exam+tier to the saved attempt; a new attempt uses the
  // active exam and its default (most-logged, else primary) tier.
  const editShape = attempt
    ? scope.resolveShape(attempt.examId, attempt.tierId)
    : null;
  const activeExam = scope.exams
    ? (scope.exams.builtIn.find((exam) => exam.id === scope.activeExamId) ??
      null)
    : null;
  const [tierId, setTierId] = useState(
    () =>
      attempt?.tierId ??
      defaultTierId(activeExam, knownAttempts, scope.activeExamId),
  );
  // The form offers the ENABLED tiers of the active exam — the scope the
  // switcher set. With the combined view active, every enabled tier of the
  // exam is offered and the default falls to the most-logged one.
  const tierOptions: { id: string; label: string }[] = attempt
    ? []
    : (() => {
        if (!scope.exams) return [];
        const examId = scope.activeExamId;
        const enabled = new Set(scope.exams.enabledTiers);
        const tierList =
          scope.exams.builtIn.find((exam) => exam.id === examId)?.tiers ??
          scope.exams.customExams.find((exam) => exam.id === examId)?.tiers ??
          [];
        return tierList
          .filter((tier) => enabled.has(`${examId}:${tier.id}`))
          .map((tier) => ({ id: tier.id, label: tier.label }));
      })();

  // While the exams payload is still loading the raw tierId may not resolve
  // ("main" default for built-ins); normalize to the exam's primary tier so
  // the select, the pattern, and the marks copy always agree.
  const effectiveTierId = attempt
    ? tierId
    : (tierOptions.find(
        (tier) =>
          tier.id ===
          (scope.activeTierId !== "all" ? scope.activeTierId : tierId),
      )?.id ??
      tierOptions.find((tier) => tier.id === tierId)?.id ??
      tierOptions[0]?.id ??
      activeExam?.primaryTierId ??
      tierId);
  const shape: PatternShape =
    editShape ??
    scope.resolveShape(
      scope.activeExamId,
      attempt?.tierId ?? effectiveTierId,
    ) ?? {
      examId: "cgl",
      tierId: "tier2",
      subjects: [
        { subjectId: "quant", questions: 30, qualifying: false },
        { subjectId: "reasoning", questions: 30, qualifying: false },
        { subjectId: "english", questions: 45, qualifying: false },
        { subjectId: "ga", questions: 25, qualifying: false },
        { subjectId: "computer", questions: 20, qualifying: true },
      ],
      marking: { correct: 3, incorrect: 1 },
      sections: [],
    };
  const examName =
    (scope.exams
      ? (scope.exams.builtIn.find(
          (exam) => exam.id === shape.examId,
        )?.name ??
        scope.exams.customExams.find((exam) => exam.id === shape.examId)
          ?.name)
      : null) ?? "SSC CGL";
  const [values, setValues] = useState<AttemptInput>(
    attempt ?? {
      name: initialName ?? "",
      platform: "",
      completedAt: "",
      type: "full",
      examId: shape.examId,
      tierId: shape.tierId,
      marking: shape.marking,
      subjects: meritSubjectIds(shape).map((id) => blankSubject(id, shape)),
      notes: "",
      source: "manual",
    },
  );
  const [date, setDate] = useState(
    attempt
      ? completionDate(attempt.completedAt)
      : initialDate && isIsoDate(initialDate)
        ? initialDate
        : istTodayIso(),
  );
  const [platformChoice, setPlatformChoice] = useState(
    platformSelection(attempt?.platform ?? ""),
  );
  const [mode, setMode] = useState<"form" | "paste">("form");
  const [paste, setPaste] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importVersion, setImportVersion] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [duplicateReviewed, setDuplicateReviewed] = useState(false);
  const [additionalOpen, setAdditionalOpen] = useState(() =>
    Boolean(
      attempt ||
        values.rank != null ||
        values.participants != null ||
        values.percentile != null ||
        values.notes,
    ),
  );
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [aiStatusChecked, setAiStatusChecked] = useState(false);
  const [aiDraft, setAiDraft] = useState<ExtractionDraft | null>(null);
  const [aiReviewing, setAiReviewing] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  useEffect(() => {
    if (mode !== "paste" || aiStatusChecked) return;
    let cancelled = false;
    void api<AiStatus>("/api/ai/status")
      .then((status) => {
        if (!cancelled) setAiStatus(status);
      })
      .catch(() => {
        // The deterministic parser remains available without AI status.
      })
      .finally(() => {
        if (!cancelled) setAiStatusChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, aiStatusChecked]);
  // One-shot AI-panel prefill: apply the reviewed draft once at mount via
  // the same merge path as a paste import, then tell the shell it is used.
  const prefillDraft = initialDraft;
  const prefillAppliedRef = useRef(false);
  const set = <K extends keyof AttemptInput>(
    key: K,
    value: AttemptInput[K],
  ) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDuplicateReviewed(false);
  };
  const updateSubject = (index: number, changes: Partial<SubjectResult>) =>
    set(
      "subjects",
      values.subjects.map((s, i) => (i === index ? { ...s, ...changes } : s)),
    );
  const chooseType = (type: AttemptInput["type"]) => {
    setValues((v) => ({
      ...v,
      type,
      subjects: (
        type === "full"
          ? meritSubjectIds(shape)
          : type === "sectional"
            ? (shape.sections[0]?.subjectIds ?? [])
            : meritSubjectIds(shape).slice(0, 1)
      ).map(
        (id) => v.subjects.find((s) => s.subjectId === id) ?? blankSubject(id, shape),
      ),
    }));
    setDuplicateReviewed(false);
  };
  /** Switch the tier: reset the subject rows to the new pattern. */
  const chooseTier = (nextTierId: string) => {
    const nextShape = scope.resolveShape(scope.activeExamId, nextTierId);
    if (!nextShape) return;
    setTierId(nextTierId);
    setValues((v) => ({
      ...v,
      examId: nextShape.examId,
      tierId: nextShape.tierId,
      marking: nextShape.marking,
      type: "full",
      subjects: meritSubjectIds(nextShape).map((id) =>
        blankSubject(id, nextShape),
      ),
    }));
    setDuplicateReviewed(false);
  };
  const computedValues = calculatedEntry(values);
  const stats = totals(computedValues);
  const qualifyingSubject = shape.subjects.find((s) => s.qualifying);
  const includesQualifying =
    values.type === "full" &&
    qualifyingSubject != null &&
    values.subjects.some((s) => s.subjectId === qualifyingSubject.subjectId);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const input = attemptSchemaFor(shape).parse({
        ...computedValues,
        examId: shape.examId,
        tierId: shape.tierId,
        marking: shape.marking,
        completedAt: date ? completionTimestamp(date) : "",
      });
      if (!attempt && !duplicateReviewed) {
        // Reuse the workspace's loaded attempts when available; fetch only
        // if the shell hasn't delivered them yet (e.g. an immediate save).
        const existing =
          knownAttempts && knownAttempts.length
            ? knownAttempts
            : await api<Attempt[]>("/api/mock-attempts");
        const duplicate = existing.some(
          (a) =>
            a.name.toLowerCase() === input.name.toLowerCase() &&
            a.platform.toLowerCase() === input.platform.toLowerCase(),
        );
        if (duplicate) {
          setDuplicateReviewed(true);
          setError(
            "A mock with this name and platform already exists. Review it, or click Save again to log a repeat attempt.",
          );
          return;
        }
      }
      await api(`/api/mock-attempts${attempt ? `/${attempt.id}` : ""}`, {
        method: attempt ? "PUT" : "POST",
        body: JSON.stringify(input),
      });
      await onSaved();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save mock";
      setError(message);
      // Surface the failure: the error lives above the form so it can never
      // hide below the fold next to a long subject list.
      requestAnimationFrame(() =>
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } finally {
      setBusy(false);
    }
  }
  function applyExtracted(draft: {
    values: Partial<AttemptInput>;
    warnings: string[];
    date?: string;
  }) {
    const incoming: Partial<AttemptInput> = { ...draft.values };
    for (const key of Object.keys(incoming) as (keyof AttemptInput)[]) {
      if (incoming[key] === undefined) delete incoming[key];
    }
    const incomingSubjects = incoming.subjects;
    const type = incomingSubjects?.length
      ? (incoming.type ?? values.type)
      : values.type;
    let subjects = values.subjects;
    if (incomingSubjects?.length) {
      const section = sectionForSubjects(incomingSubjects, shape.sections);
      const meritIds = meritSubjectIds(shape);
      const qualifyingIds = shape.subjects
        .filter((s) => s.qualifying)
        .map((s) => s.subjectId);
      const ids: SubjectId[] =
        type === "full"
          ? [
              ...meritIds,
              ...qualifyingIds.filter((id) =>
                incomingSubjects.some((s) => s.subjectId === id),
              ),
            ]
          : type === "sectional"
            ? section
              ? [...section.subjectIds]
              : incomingSubjects.map((s) => s.subjectId)
            : [incomingSubjects[0].subjectId];
      subjects = ids.map((id) => {
        const base =
          values.subjects.find((s) => s.subjectId === id) ??
          blankSubject(id, shape);
        const found = incomingSubjects.find((s) => s.subjectId === id);
        if (!found) return base;
        return {
          ...base,
          ...found,
          subjectId: id,
          qualifying:
            shape.subjects.find((s) => s.subjectId === id)?.qualifying ??
            false,
          questions:
            type === "full"
              ? (shape.subjects.find((s) => s.subjectId === id)?.questions ??
                found.questions)
              : found.questions,
        };
      });
    }
    const platform = incoming.platform;
    let nextPlatform = incoming.platform ?? values.platform;
    let nextChoice = platformChoice;
    if (platform !== undefined) {
      nextChoice = platformSelection(platform);
      nextPlatform = nextChoice === "other" ? platform : nextChoice;
    }
    setValues({
      ...values,
      ...incoming,
      type,
      subjects,
      platform: nextPlatform,
    });
    setPlatformChoice(nextChoice);
    if (draft.date) setDate(draft.date);
    setWarnings(draft.warnings);
    setImportVersion((v) => v + 1);
    setMode("form");
    setDuplicateReviewed(false);
    setError("");
  }
  // Runs once per mount; the deps intentionally mirror the initial state.
  useEffect(() => {
    if (!prefillDraft || prefillAppliedRef.current) return;
    prefillAppliedRef.current = true;
    applyExtracted({
      values: prefillDraft.values,
      warnings: [],
      date: prefillDraft.date,
    });
    onPrefillApplied?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function importPaste() {
    applyExtracted(parseReport(shape, paste));
  }
  async function importWithAi() {
    setAiBusy(true);
    setAiError("");
    setAiDraft(null);
    try {
      const result = await api<ExtractResponse>("/api/ai/extract", {
        method: "POST",
        body: JSON.stringify({
          text: paste,
          examId: shape.examId,
          tierId: shape.tierId,
        }),
      });
      setAiDraft(result.draft);
      setAiReviewing(true);
    } catch (e) {
      setAiError(
        e instanceof Error ? e.message : "Could not arrange this report",
      );
    } finally {
      setAiBusy(false);
    }
  }
  function applyAiDraft() {
    if (!aiDraft) return;
    try {
      const reviewed = extractionToAttempt(shape, aiDraft, values.notes);
      setValues(reviewed.values);
      setDate(reviewed.date);
      setPlatformChoice(platformSelection(reviewed.values.platform));
      setWarnings(reviewed.warnings);
      setImportVersion((version) => version + 1);
      setMode("form");
      setDuplicateReviewed(false);
      setError("");
      setAiDraft(null);
      setAiReviewing(false);
      setAiError("");
    } catch (cause) {
      setAiError(
        cause instanceof Error
          ? cause.message
          : "Resolve the highlighted fields before continuing.",
      );
    }
  }
  return (
    <div className="mx-auto max-w-6xl">
      <button
        className="mb-4 flex items-center gap-2 text-sm muted hover:text-accent transition-colors"
        onClick={onClose}
      >
        <PlainIcon name="arrowLeft" size={16} /> {backLabel}
      </button>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
        <div>
          <h1 className="page-title">{attempt ? "Edit mock" : "Log a mock"}</h1>
          <p className="mt-1 text-sm muted">
            Record the result now; refine the details before saving.
          </p>
        </div>
        <div
          role="group"
          aria-label="Entry method"
          className="segment-group"
        >
          <button
            type="button"
            aria-pressed={mode === "form"}
            className="segment"
            onClick={() => setMode("form")}
          >
            Manual
          </button>
          <button
            type="button"
            aria-pressed={mode === "paste"}
            className="segment inline-flex items-center gap-1.5"
            onClick={() => setMode("paste")}
          >
            <PlainIcon name="paste" size={14} /> Paste report
          </button>
        </div>
      </div>
      {mode === "paste" ? (
        <section className="panel p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="panel-title">
                {aiDraft && aiReviewing ? "Review AI draft" : "Paste a scorecard"}
              </h2>
              <p className="mt-1 text-sm muted">
                {aiDraft && aiReviewing
                  ? "Check the extracted values before copying them into the form."
                  : "Paste the report text, then choose a standard or AI-assisted import."}
              </p>
            </div>
            <ol className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted" aria-label="Import progress">
              <li className={!aiReviewing ? "text-ink" : ""}>1 Paste</li>
              <li aria-hidden="true">/</li>
              <li className={aiReviewing ? "text-ink" : ""}>2 Review</li>
              <li aria-hidden="true">/</li>
              <li>3 Save</li>
            </ol>
          </div>
          {aiDraft && aiReviewing ? (
            <ExtractionReview
              draft={aiDraft}
              shape={shape}
              onChange={setAiDraft}
              onUse={applyAiDraft}
              onBack={() => setAiReviewing(false)}
              onDiscard={() => {
                setAiDraft(null);
                setAiReviewing(false);
                setAiError("");
              }}
            />
          ) : (
            <>
              <label>
                Result report
                <textarea
                  rows={12}
                  placeholder="Your Score… Sectional Summary…"
                  value={paste}
                  disabled={aiBusy}
                  onChange={(e) => {
                    setPaste(e.target.value);
                    setAiDraft(null);
                    setAiReviewing(false);
                    setAiError("");
                  }}
                  maxLength={100000}
                />
              </label>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
                <span>
                  AI can arrange up to {MAX_EXTRACT_CHARS.toLocaleString("en-IN")} characters. The manual parser accepts longer reports.
                </span>
                <span className={paste.length > MAX_EXTRACT_CHARS ? "text-warning" : ""}>
                  {paste.length.toLocaleString("en-IN")} / {MAX_EXTRACT_CHARS.toLocaleString("en-IN")} for AI
                </span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button disabled={!paste.trim() || aiBusy} onClick={importPaste}>
                  Import with standard parser <PlainIcon name="check" size={15} />
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    !paste.trim() ||
                    paste.length > MAX_EXTRACT_CHARS ||
                    aiBusy ||
                    !aiStatus?.enabled
                  }
                  title={
                    aiStatus && !aiStatus.enabled
                      ? "AI is not configured on this server."
                      : paste.length > MAX_EXTRACT_CHARS
                        ? `AI accepts up to ${MAX_EXTRACT_CHARS.toLocaleString("en-IN")} characters.`
                        : undefined
                  }
                  onClick={() => void importWithAi()}
                >
                  {aiBusy ? (
                    <PlainIcon name="refresh" size={15} className="animate-spin" />
                  ) : (
                    <PlainIcon name="sparkles" size={15} />
                  )}
                  {aiBusy ? "Arranging…" : "Arrange with AI"}
                </Button>
                {aiDraft && (
                  <Button variant="outline" onClick={() => setAiReviewing(true)}>
                    Continue AI review
                  </Button>
                )}
              </div>
              {!aiStatusChecked && (
                <p className="mt-3 text-xs muted">Checking AI availability…</p>
              )}
              {aiStatusChecked && !aiStatus && (
                <p className="mt-3 text-xs text-warning">
                  AI status is unavailable. The standard parser still works.
                </p>
              )}
              {aiStatus && !aiStatus.enabled && (
                <p className="mt-3 text-xs muted">
                  AI is not configured on this server. Automatic review and manual entry still work.
                </p>
              )}
              <p className="mt-3 text-[11px] text-muted">
                AI maps the pasted report into an editable draft but never saves. You will review every field before copying it to the form.
              </p>
              {aiError && (
                <p
                  role="alert"
                  className="mt-4 border border-warning bg-warning-soft rounded-control px-4 py-3 text-xs text-warning"
                >
                  {aiError}
                </p>
              )}
            </>
          )}
        </section>
      ) : (
        <form onSubmit={save} className="space-y-6">
          {warnings.length > 0 && (
            <div
              role="status"
              className="rounded-control bg-warning-soft p-4 text-warning text-sm"
            >
              <strong>Review your report</strong>
              {warnings.map((w, i) => (
                <p key={i} className="mt-1">
                  {w}
                </p>
              ))}
            </div>
          )}
          {error && (
            <p
              ref={errorRef}
              role="alert"
              className="flex gap-2 items-start bg-danger-soft text-danger rounded-control p-4 text-sm whitespace-pre-wrap break-words"
            >
              <PlainIcon name="danger" size={18} className="shrink-0 mt-0.5" />
              {error}
            </p>
          )}
          <section className="panel p-4 sm:p-6">
            <h2 className="panel-title mb-1">Mock details</h2>
            <p className="text-xs muted mb-5">
              Fields marked <span className="req" aria-hidden="true">*</span> are
              required.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label>
                <span>
                  Mock name <span className="req" aria-hidden="true">*</span>
                </span>
                <input
                  required
                  maxLength={150}
                  placeholder={`e.g. ${examName} — Mock 12`}
                  value={values.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </label>
              <label>
                <span>
                  Platform <span className="req" aria-hidden="true">*</span>
                </span>
                <select
                  required
                  value={platformChoice}
                  onChange={(e) => {
                    setPlatformChoice(e.target.value);
                    set(
                      "platform",
                      e.target.value === "other" ? "" : e.target.value,
                    );
                  }}
                >
                  <option value="" disabled>
                    Select platform
                  </option>
                  {MOCK_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="other">Others</option>
                </select>
              </label>
              {platformChoice === "other" && (
                <label>
                  Other platform
                  <input
                    type="text"
                    required
                    maxLength={80}
                    placeholder="Enter the platform name"
                    value={values.platform}
                    onChange={(e) => set("platform", e.target.value)}
                  />
                </label>
              )}
              <label>
                <span>
                  Attempt date <span className="req" aria-hidden="true">*</span>
                </span>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              {!attempt && tierOptions.length > 1 && (
                <label>
                  Tier / paper
                  <select
                    value={effectiveTierId}
                    onChange={(e) => chooseTier(e.target.value)}
                  >
                    {tierOptions.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Mock type
                <select
                  value={values.type}
                  onChange={(e) =>
                    chooseType(e.target.value as AttemptInput["type"])
                  }
                >
                  <option value="full">
                    Full mock ·{" "}
                    {meritSubjectIds(shape).reduce(
                      (sum, id) =>
                        sum +
                        (shape.subjects.find((s) => s.subjectId === id)
                          ?.questions ?? 0),
                      0,
                    ) * shape.marking.correct}{" "}
                    marks
                  </option>
                  <option value="subject">Subject mock</option>
                  {shape.sections.length > 0 && (
                    <option value="sectional">Sectional mock</option>
                  )}
                </select>
              </label>
              {values.type === "subject" && (
                <label>
                  Subject
                  <select
                    value={values.subjects[0]?.subjectId}
                    onChange={(e) =>
                      set("subjects", [
                        blankSubject(e.target.value as SubjectId, shape),
                      ])
                    }
                  >
                    {shape.subjects.map((s) => (
                      <option key={s.subjectId} value={s.subjectId}>
                        {SUBJECTS[s.subjectId].name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {values.type === "sectional" && (
                <label>
                  Section
                  <select
                    value={
                      sectionForSubjects(values.subjects, shape.sections)
                        ?.id ?? shape.sections[0]?.id
                    }
                    onChange={(e) => {
                      const section = shape.sections.find(
                        (s) => s.id === e.target.value,
                      );
                      if (!section) return;
                      set(
                        "subjects",
                        section.subjectIds.map((id) =>
                          blankSubject(id, shape),
                        ),
                      );
                    }}
                  >
                    {shape.sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name} · {section.description} ·{" "}
                        {section.subjectIds.reduce(
                          (sum, id) =>
                            sum +
                            (shape.subjects.find((s) => s.subjectId === id)
                              ?.questions ?? 0),
                          0,
                        ) * shape.marking.correct}{" "}
                        marks
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {values.type === "full" && qualifyingSubject && (
              <div className="mt-5 border-t border-rule-soft pt-4">
                <label className="!flex flex-row items-center gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={includesQualifying}
                    onChange={(e) =>
                      set(
                        "subjects",
                        e.target.checked
                          ? [
                              ...values.subjects,
                              blankSubject(qualifyingSubject.subjectId, shape),
                            ]
                          : values.subjects.filter(
                              (s) =>
                                s.subjectId !== qualifyingSubject.subjectId,
                            ),
                      )
                    }
                  />
                  Include {SUBJECTS[qualifyingSubject.subjectId].name}
                </label>
                <p className="text-xs muted mt-2">
                  {SUBJECTS[qualifyingSubject.subjectId].short} is scored
                  separately from the main{" "}
                  {formatNumber(
                    meritSubjectIds(shape).reduce(
                      (sum, id) =>
                        sum +
                        (shape.subjects.find((s) => s.subjectId === id)
                          ?.questions ?? 0),
                      0,
                    ) * shape.marking.correct,
                    0,
                  )}{" "}
                  marks. Its time is included in overall time.
                </p>
              </div>
            )}
          </section>
          <section className="panel p-4 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
              <h2 className="panel-title">Subject results</h2>
              <p className="text-xs muted">
                +{shape.marking.correct} correct ·{" "}
                {shape.marking.incorrect > 0
                  ? `−${shape.marking.incorrect} incorrect`
                  : "no penalty"}{" "}
                · 0 unattempted
              </p>
            </div>
            <div className="space-y-7">
              {values.subjects.map((s, i) => {
                const sectionHeading =
                  values.type === "full"
                    ? fullMockSectionHeading(s.subjectId, shape)
                    : null;
                return (
                <div key={s.subjectId}>
                  {sectionHeading && (
                    <p className="mb-4 border-b border-rule-soft pb-2 text-sm font-medium">
                      {sectionHeading}
                    </p>
                  )}
                  <h3 className="font-medium text-sm mb-3">
                    {SUBJECTS[s.subjectId].name}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <label>
                      Questions
                      <input
                        type="number"
                        className="no-spin"
                        min={1}
                        max={500}
                        required
                        readOnly={values.type === "full"}
                        value={s.questions}
                        onChange={(e) =>
                          updateSubject(i, {
                            questions: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Correct
                      <input
                        type="number"
                        className="no-spin bg-positive-soft/50"
                        min={0}
                        max={s.questions}
                        required
                        value={s.correct}
                        onChange={(e) =>
                          updateSubject(i, { correct: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Incorrect
                      <input
                        type="number"
                        className="no-spin bg-danger-soft/50"
                        min={0}
                        max={s.questions}
                        required
                        value={s.incorrect}
                        onChange={(e) =>
                          updateSubject(i, {
                            incorrect: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Score
                      <input
                        type="number"
                        readOnly
                        value={s.correct * 3 - s.incorrect}
                      />
                    </label>
                    <DurationInput
                      key={`${s.subjectId}-${importVersion}`}
                      subjectName={SUBJECTS[s.subjectId].short}
                      value={s.timeSeconds}
                      onChange={(seconds) =>
                        updateSubject(i, { timeSeconds: seconds })
                      }
                    />
                  </div>
                  <p className="text-xs muted mt-3">
                    {s.correct + s.incorrect} attempted ·{" "}
                    {s.questions - s.correct - s.incorrect} unattempted ·{" "}
                    {formatNumber(s.correct * 3 - s.incorrect)} calculated marks
                  </p>
                </div>
                );
              })}
            </div>
          </section>
          <details
            className="panel group"
            open={additionalOpen}
            onToggle={(event) => setAdditionalOpen(event.currentTarget.open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:px-6 sm:py-5">
              <span className="panel-title">
                Additional results{" "}
                <span className="font-normal muted text-base">· optional</span>
              </span>
              <span className="text-xs muted group-open:hidden">Expand</span>
              <span className="hidden text-xs muted group-open:inline">Collapse</span>
            </summary>
            <div className="border-t border-rule-soft p-4 sm:p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(["rank", "participants", "percentile"] as const).map((key) => (
                  <label key={key}>
                    {
                      {
                        rank: "Rank",
                        participants: "Participants",
                        percentile: "Percentile (%)",
                      }[key]
                    }
                    <input
                      type="number"
                      step={key === "percentile" ? "0.01" : "1"}
                      value={values[key] ?? ""}
                      onChange={(e) =>
                        set(
                          key,
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </label>
                ))}
                <label>
                  Overall time (hh:mm:ss)
                  <input
                    readOnly
                    value={formatTime(computedValues.overallTimeSeconds).padStart(
                      8,
                      "0",
                    )}
                  />
                </label>
              </div>
              <label className="mt-5">
                Notes
                <textarea
                  rows={3}
                  maxLength={5000}
                  placeholder="What went well? What needs another look?"
                  value={values.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </label>
            </div>
          </details>
          <div className="panel sticky bottom-0 z-20 shadow-pop flex flex-wrap items-center justify-between gap-5 p-4 sm:p-5">
            <div className="tabular" aria-live="polite" aria-atomic="true">
              <strong className="text-xl">
                {formatNumber(stats.score)}{" "}
                <span className="text-sm font-normal muted">
                  / {stats.maxScore}
                </span>
              </strong>
              <p className="text-xs muted mt-1">
                {stats.attempted} attempted · {formatNumber(stats.accuracy, 2)}
                {stats.accuracy == null ? "" : "%"} accuracy · {formatTime(computedValues.overallTimeSeconds)} total
              </p>
              {includesQualifying && qualifyingSubject &&
                (() => {
                  const row = values.subjects.find(
                    (s) => s.subjectId === qualifyingSubject.subjectId,
                  );
                  if (!row) return null;
                  return (
                    <p className="text-xs muted mt-2">
                      {SUBJECTS[qualifyingSubject.subjectId].short}:{" "}
                      {formatScore(
                        row.scoreOverride ??
                          row.correct * shape.marking.correct -
                            row.incorrect * shape.marking.incorrect,
                      )}{" "}
                      /{" "}
                      {row.questions * shape.marking.correct} · tracked
                      separately
                    </p>
                  );
                })()}
            </div>
            <div className="action-row gap-3 sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                <PlainIcon name="save" size={16} />
                {busy
                  ? "Saving…"
                  : duplicateReviewed
                    ? "Save repeat mock"
                    : attempt
                      ? "Update mock"
                      : "Save mock"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
