"use client";
import { useState } from "react";
import {
  ArrowLeft,
  ClipboardPaste,
  Save,
  AlertCircle,
  Check,
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
  function importPaste() {
    setImportVersion((v) => v + 1);
    const parsed = parseReport(paste);
    if (parsed.values.platform) {
      const selection = platformSelection(parsed.values.platform);
      setPlatformChoice(selection);
      if (selection !== "other") parsed.values.platform = selection;
    }
    setValues((v) => ({
      ...v,
      ...parsed.values,
      subjects: parsed.values.subjects?.length
        ? parsed.values.subjects
        : v.subjects,
    }));
    setWarnings(parsed.warnings);
    setMode("form");
    setError("");
  }
  return (
    <div className="max-w-5xl mx-auto">
      <button
        className="flex items-center gap-2 muted mb-6 hover:text-accent"
        onClick={onClose}
      >
        <ArrowLeft size={16} /> Back to dashboard
      </button>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="page-title">{attempt ? "Edit mock" : "Log a mock"}</h1>
          <p className="muted mt-1">
            Small steps. A clearer picture of your preparation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mode === "form" ? "default" : "outline"}
            aria-pressed={mode === "form"}
            onClick={() => setMode("form")}
          >
            Manual entry
          </Button>
          <Button
            variant={mode === "paste" ? "default" : "outline"}
            aria-pressed={mode === "paste"}
            onClick={() => setMode("paste")}
          >
            <ClipboardPaste size={15} /> Paste report
          </Button>
        </div>
      </div>
      {mode === "paste" ? (
        <section className="panel p-6">
          <h2 className="panel-title mb-2">Bring your result with you</h2>
          <p className="muted mb-5">
            Paste the text from your platform’s result page, including the
            sectional summary. You’ll review everything before saving.
          </p>
          <label>
            Result report
            <textarea
              rows={16}
              placeholder="Your Score… Sectional Summary…"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              maxLength={100000}
            />
          </label>
          <Button
            className="mt-5"
            disabled={!paste.trim()}
            onClick={importPaste}
          >
            Review extracted result <Check size={15} />
          </Button>
        </section>
      ) : (
        <form onSubmit={save} className="space-y-6">
          {warnings.length > 0 && (
            <div
              role="status"
              className="rounded-none bg-warning-soft p-4 text-warning text-sm"
            >
              <strong>Review your report</strong>
              {warnings.map((w, i) => (
                <p key={i} className="mt-1">
                  {w}
                </p>
              ))}
            </div>
          )}
          <section className="panel p-6">
            <h2 className="panel-title mb-5">Mock details</h2>
            <div className="grid sm:grid-cols-2 gap-5">
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
          <section className="panel p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
              <h2 className="panel-title">Subject results</h2>
              <p className="text-xs muted">
                +3 correct · −1 incorrect · 0 unattempted
              </p>
            </div>
            <div
              aria-live="polite"
              aria-atomic="true"
              className="mb-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-rule-soft py-4 tabular"
            >
              <p className="text-sm">
                Test score{" "}
                <strong className="ml-2">
                  {formatNumber(stats.score)} / {stats.maxScore}
                </strong>
              </p>
              <p className="text-sm">
                Overall time{" "}
                <strong className="ml-2">
                  {formatTime(computedValues.overallTimeSeconds).padStart(
                    8,
                    "0",
                  )}
                </strong>
              </p>
            </div>
            <div className="space-y-7">
              {values.subjects.map((s, i) => {
                const sectionHeading =
                  values.type === "full"
                    ? fullMockSectionHeading(s.subjectId)
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
          <section className="panel p-6">
            <h2 className="panel-title mb-5">
              Additional results{" "}
              <span className="font-normal muted">· optional</span>
            </h2>
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
          </section>
          <div className="panel p-5 flex flex-wrap items-center justify-between gap-5">
            <div className="tabular">
              <strong className="text-xl">
                {formatNumber(stats.score)}{" "}
                <span className="text-sm font-normal muted">
                  / {stats.maxScore}
                </span>
              </strong>
              <p className="text-xs muted mt-1">
                {stats.attempted} attempted · {formatNumber(stats.accuracy, 2)}
                {stats.accuracy == null ? "" : "%"} accuracy
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
                {busy ? "Saving…" : "Save mock"}
              </Button>
            </div>
          </div>
          {error && (
            <p
              role="alert"
              className="flex gap-2 bg-danger-soft text-danger rounded-none p-4 whitespace-pre-wrap break-words"
            >
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
