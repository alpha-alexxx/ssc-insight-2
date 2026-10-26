"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ClipboardPaste,
  Save,
  AlertCircle,
  Check,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  attemptSchema,
  MAIN_SUBJECT_IDS,
  SECTIONS,
  sectionForSubjects,
  sectionIds,
  SUBJECTS,
  subjectIds,
  type Attempt,
  type AttemptInput,
  type SubjectId,
  type SubjectResult,
  type SectionId,
  totals,
  formatNumber,
  formatTime,
} from "@/lib/domain";
import {
  calculatedEntry,
  completionDate,
  completionTimestamp,
  MOCK_PLATFORMS,
  platformSelection,
} from "@/lib/mock-entry";
import { DurationInput } from "./duration-input";
import { parseReport } from "@/lib/report-parser";
import type { AiStatus, ExtractResponse } from "@/lib/ai/client-types";
import {
  extractionToAttempt,
  MAX_EXTRACT_CHARS,
  type ExtractionDraft,
} from "@/lib/ai/extraction";
import { ExtractionReview } from "./extraction-review";
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = await response.json();
  if (response.status === 401)
    window.dispatchEvent(new Event("ssc:session-ended"));
  if (result.error?.code === "AUTH_UNAVAILABLE")
    window.dispatchEvent(new Event("ssc:auth-unavailable"));
  if (!response.ok)
    throw new Error(result.error?.message ?? "Request failed. Please retry.");
  return result.data;
}
const blankSubject = (id: SubjectId): SubjectResult => ({
  subjectId: id,
  questions: SUBJECTS[id].questions,
  correct: 0,
  incorrect: 0,
  timeSeconds: 0,
  scoreOverride: null,
});
function fullMockSectionHeading(subjectId: SubjectId) {
  const sectionId = sectionIds.find(
    (id) => SECTIONS[id].subjectIds[0] === subjectId,
  );
  if (sectionId)
    return `${SECTIONS[sectionId].name} · ${SECTIONS[sectionId].description} · ${SECTIONS[sectionId].maxScore} marks`;
  if (subjectId === "computer") return "Computer Knowledge · qualifying · 60 marks";
  return null;
}
export function MockForm({
  attempt,
  onClose,
  onSaved,
}: {
  attempt?: Attempt;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<AttemptInput>(
    attempt ?? {
      name: "",
      platform: "",
      completedAt: "",
      type: "full",
      subjects: MAIN_SUBJECT_IDS.map((id) => blankSubject(id)),
      notes: "",
      source: "manual",
    },
  );
  const [date, setDate] = useState(
    attempt ? completionDate(attempt.completedAt) : "",
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
          ? MAIN_SUBJECT_IDS
          : type === "sectional"
            ? SECTIONS.section1.subjectIds
            : (["quant"] as const)
      ).map(
        (id) => v.subjects.find((s) => s.subjectId === id) ?? blankSubject(id),
      ),
    }));
    setDuplicateReviewed(false);
  };
  const computedValues = calculatedEntry(values);
  const stats = totals(computedValues);
  const includesComputer =
    values.type === "full" &&
    values.subjects.some((s) => s.subjectId === "computer");
  const computer = includesComputer
    ? values.subjects.find((s) => s.subjectId === "computer")
    : undefined;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const input = attemptSchema.parse({
        ...computedValues,
        completedAt: date ? completionTimestamp(date) : "",
      });
      if (!attempt && !duplicateReviewed) {
        const existing = await api<Attempt[]>("/api/mock-attempts");
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
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save mock");
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
      const section = sectionForSubjects(incomingSubjects);
      const ids: SubjectId[] =
        type === "full"
          ? [
              ...MAIN_SUBJECT_IDS,
              ...(incomingSubjects.some((s) => s.subjectId === "computer")
                ? (["computer"] as const)
                : []),
            ]
          : type === "sectional"
            ? section
              ? [...SECTIONS[section].subjectIds]
              : incomingSubjects.map((s) => s.subjectId)
            : [incomingSubjects[0].subjectId];
      subjects = ids.map((id) => {
        const base =
          values.subjects.find((s) => s.subjectId === id) ?? blankSubject(id);
        const found = incomingSubjects.find((s) => s.subjectId === id);
        if (!found) return base;
        return {
          ...base,
          ...found,
          subjectId: id,
          questions:
            type === "full" ? SUBJECTS[id].questions : found.questions,
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
  function importPaste() {
    applyExtracted(parseReport(paste));
  }
  async function importWithAi() {
    setAiBusy(true);
    setAiError("");
    setAiDraft(null);
    try {
      const result = await api<ExtractResponse>("/api/ai/extract", {
        method: "POST",
        body: JSON.stringify({ text: paste }),
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
      const reviewed = extractionToAttempt(aiDraft, values.notes);
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
        className="mb-4 flex items-center gap-2 text-sm muted hover:text-accent"
        onClick={onClose}
      >
        <ArrowLeft size={16} /> Back to dashboard
      </button>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
        <div>
          <h1 className="page-title">{attempt ? "Edit mock" : "Log a mock"}</h1>
          <p className="mt-1 text-sm muted">
            Record the result now; refine the details before saving.
          </p>
        </div>
        <div className="inline-flex border border-rule bg-paper p-1" role="group" aria-label="Entry method">
          <Button
            size="sm"
            variant="ghost"
            className={mode === "form" ? "bg-ink text-paper hover:bg-ink hover:text-paper" : ""}
            aria-pressed={mode === "form"}
            onClick={() => setMode("form")}
          >
            Manual
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={mode === "paste" ? "bg-ink text-paper hover:bg-ink hover:text-paper" : ""}
            aria-pressed={mode === "paste"}
            onClick={() => setMode("paste")}
          >
            <ClipboardPaste size={14} /> Paste report
          </Button>
        </div>
      </div>
      {mode === "paste" ? (
        <section className="panel p-4 sm:p-5">
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
                  rows={10}
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
                  Import with standard parser <Check size={15} />
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
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Sparkles size={15} />
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
                  className="mt-4 border border-warning bg-warning-soft px-4 py-3 text-xs text-warning"
                >
                  {aiError}
                </p>
              )}
            </>
          )}
        </section>
      ) : (
        <form onSubmit={save} className="space-y-4">
          {warnings.length > 0 && (
            <div
              role="status"
              className="border border-warning bg-warning-soft p-3 text-sm text-warning"
            >
              <strong>Review your report</strong>
              {warnings.map((w, i) => (
                <p key={i} className="mt-1">
                  {w}
                </p>
              ))}
            </div>
          )}
          <section className="panel p-4 sm:p-5">
            <h2 className="panel-title mb-5">Mock details</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label>
                Mock name
                <input
                  required
                  maxLength={150}
                  placeholder="e.g. SSC CGL Tier 2 — Mock 12"
                  value={values.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </label>
              <label>
                Platform
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
                Completed on
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Mock type
                <select
                  value={values.type}
                  onChange={(e) =>
                    chooseType(e.target.value as AttemptInput["type"])
                  }
                >
                  <option value="full">Full mock · 390 marks</option>
                  <option value="subject">Subject mock</option>
                  <option value="sectional">Sectional mock</option>
                </select>
              </label>
              {values.type === "subject" && (
                <label>
                  Subject
                  <select
                    value={values.subjects[0]?.subjectId}
                    onChange={(e) =>
                      set("subjects", [
                        blankSubject(e.target.value as SubjectId),
                      ])
                    }
                  >
                    {subjectIds.map((id) => (
                      <option key={id} value={id}>
                        {SUBJECTS[id].name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {values.type === "sectional" && (
                <label>
                  Section
                  <select
                    value={sectionForSubjects(values.subjects) ?? "section1"}
                    onChange={(e) =>
                      set(
                        "subjects",
                        SECTIONS[e.target.value as SectionId].subjectIds.map(
                          (id) => blankSubject(id),
                        ),
                      )
                    }
                  >
                    {sectionIds.map((id) => (
                      <option key={id} value={id}>
                        {SECTIONS[id].name} · {SECTIONS[id].description} ·{" "}
                        {SECTIONS[id].maxScore} marks
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {values.type === "full" && (
              <div className="mt-5 border-t border-rule-soft pt-4">
                <label className="!flex flex-row items-center gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={includesComputer}
                    onChange={(e) =>
                      set(
                        "subjects",
                        e.target.checked
                          ? [...values.subjects, blankSubject("computer")]
                          : values.subjects.filter(
                              (s) => s.subjectId !== "computer",
                            ),
                      )
                    }
                  />
                  Include Computer Knowledge
                </label>
                <p className="text-xs muted mt-2">
                  Computer is scored separately from the main 390 marks. Its
                  time is included in overall time.
                </p>
              </div>
            )}
          </section>
          <section className="panel p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="panel-title">Subject results</h2>
              <p className="text-xs muted">+3 correct · −1 incorrect</p>
            </div>
            <div className="hidden grid-cols-[minmax(10rem,1.5fr)_repeat(4,minmax(4.75rem,.65fr))_minmax(12rem,1.2fr)] gap-3 border-y border-rule-soft bg-canvas px-3 py-2 text-[10px] uppercase tracking-wide text-muted lg:grid">
              <span>Subject</span>
              <span>Questions</span>
              <span>Correct</span>
              <span>Incorrect</span>
              <span>Score</span>
              <span>Time</span>
            </div>
            <div className="divide-y divide-rule-soft border-b border-rule-soft">
              {values.subjects.map((s, i) => {
                const sectionHeading =
                  values.type === "full"
                    ? fullMockSectionHeading(s.subjectId)
                    : null;
                return (
                  <div key={s.subjectId} className="py-3">
                    {sectionHeading && (
                      <p className="mb-2 text-[10px] uppercase tracking-wide text-muted">
                        {sectionHeading}
                      </p>
                    )}
                    <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[minmax(10rem,1.5fr)_repeat(4,minmax(4.75rem,.65fr))_minmax(12rem,1.2fr)]">
                      <div className="col-span-2 self-center lg:col-span-1">
                        <h3 className="text-sm font-medium">
                          {SUBJECTS[s.subjectId].name}
                        </h3>
                        <p className="mt-1 text-[11px] tabular muted">
                          {s.correct + s.incorrect} attempted · {s.questions - s.correct - s.incorrect} skipped
                        </p>
                      </div>
                      <label>
                        <span className="lg:sr-only">Questions</span>
                        <input
                          aria-label={`${SUBJECTS[s.subjectId].short} questions`}
                          type="number"
                          min={1}
                          max={500}
                          required
                          readOnly={values.type === "full"}
                          value={s.questions}
                          onChange={(e) =>
                            updateSubject(i, { questions: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        <span className="lg:sr-only">Correct</span>
                        <input
                          aria-label={`${SUBJECTS[s.subjectId].short} correct`}
                          type="number"
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
                        <span className="lg:sr-only">Incorrect</span>
                        <input
                          aria-label={`${SUBJECTS[s.subjectId].short} incorrect`}
                          type="number"
                          min={0}
                          max={s.questions}
                          required
                          value={s.incorrect}
                          onChange={(e) =>
                            updateSubject(i, { incorrect: Number(e.target.value) })
                          }
                        />
                      </label>
                      <div className="self-end">
                        <span className="mb-[7px] block text-xs font-medium text-muted lg:sr-only">Score</span>
                        <output className="flex h-10 items-center border border-rule-soft bg-canvas px-3 text-sm font-medium tabular">
                          {formatNumber(s.correct * 3 - s.incorrect)}
                        </output>
                      </div>
                      <DurationInput
                        key={`${s.subjectId}-${importVersion}`}
                        subjectName={SUBJECTS[s.subjectId].short}
                        value={s.timeSeconds}
                        onChange={(seconds) =>
                          updateSubject(i, { timeSeconds: seconds })
                        }
                      />
                    </div>
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
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:px-5">
              <span className="panel-title">Additional results</span>
              <span className="text-xs muted group-open:hidden">Optional · expand</span>
              <span className="hidden text-xs muted group-open:inline">Collapse</span>
            </summary>
            <div className="border-t border-rule-soft p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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
            </div>
            <label className="mt-4">
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
          {error && (
            <p
              role="alert"
              className="flex gap-2 border border-danger bg-danger-soft p-3 text-sm text-danger whitespace-pre-wrap break-words"
            >
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </p>
          )}
          <div className="panel sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 border-ink bg-paper/95 p-4 backdrop-blur-sm">
            <div className="tabular" aria-live="polite" aria-atomic="true">
              <strong className="text-xl">
                {formatNumber(stats.score)}{" "}
                <span className="text-sm font-normal muted">
                  / {stats.maxScore}
                </span>
              </strong>
              <p className="mt-1 text-xs muted">
                {stats.attempted} attempted · {formatNumber(stats.accuracy, 2)}
                {stats.accuracy == null ? "" : "%"} accuracy · {formatTime(computedValues.overallTimeSeconds)} total
              </p>
              {computer && (
                <p className="text-xs muted mt-2">
                  Computer:{" "}
                  {formatNumber(computer.correct * 3 - computer.incorrect)} / 60
                  · tracked separately
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                <Save size={16} />
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
