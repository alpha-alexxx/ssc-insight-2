"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  SUBJECTS,
  subjectIds,
  type AttemptInput,
  type SubjectId,
} from "@/lib/domain";
import {
  blankExtractedSubject,
  validateExtractionDraft,
  type ExtractedSubjectDraft,
  type ExtractionDraft,
} from "@/lib/ai/extraction";
import { Button } from "./ui/button";

function optionalNumber(value: string) {
  return value === "" ? null : Number(value);
}

function NullableDuration({
  value,
  subject,
  onChange,
}: {
  value: number | null;
  subject: string;
  onChange: (value: number | null) => void;
}) {
  const formatted =
    value == null
      ? ""
      : `${Math.floor(value / 3600)}:${String(Math.floor(value / 60) % 60).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  const [text, setText] = useState(formatted);
  const [lastValue, setLastValue] = useState(value);
  // External value changes re-sync the text during render, so the parent no
  // longer needs a remount key and typing never loses focus.
  if (value !== lastValue) {
    setLastValue(value);
    setText(formatted);
  }
  const [error, setError] = useState("");
  const errorId = `${subject.toLowerCase().replaceAll(" ", "-")}-time-error`;

  function commit() {
    if (!text.trim()) {
      setError("");
      onChange(null);
      return;
    }
    const match = text.trim().match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/);
    if (!match) {
      setError("Use hh:mm:ss, for example 00:18:42.");
      return;
    }
    const seconds =
      Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    if (seconds > 86_400) {
      setError("Time cannot exceed 24:00:00.");
      return;
    }
    setError("");
    onChange(seconds);
  }

  return (
    <label>
      Time (hh:mm:ss)
      <input
        aria-label={`${subject} time`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        inputMode="numeric"
        placeholder="blank if not reported"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          if (error) setError("");
        }}
        onBlur={commit}
      />
      {error && (
        <span id={errorId} className="mt-1 text-[11px] text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

function FieldIssues({
  draft,
  path,
  nested = false,
}: {
  draft: ExtractionDraft;
  path: string;
  nested?: boolean;
}) {
  const entries = draft.issues.filter(
    (entry) =>
      entry.path === path || (nested && entry.path?.startsWith(`${path}.`)),
  );
  if (!entries.length) return null;
  return (
    <div className="mt-2 space-y-1" role="status">
      {entries.map((entry, index) => (
        <p
          key={`${entry.code}-${index}`}
          className={entry.severity === "blocker" ? "text-xs text-danger" : "text-xs text-warning"}
        >
          {entry.message}
        </p>
      ))}
    </div>
  );
}

export function ExtractionReview({
  draft,
  onChange,
  onUse,
  onBack,
  onDiscard,
}: {
  draft: ExtractionDraft;
  onChange: (draft: ExtractionDraft) => void;
  onUse: () => void;
  onBack: () => void;
  onDiscard: () => void;
}) {
  const blockers = draft.issues.filter((entry) => entry.severity === "blocker");
  const warnings = draft.issues.filter((entry) => entry.severity === "warning");
  const hasBlocker = (path: string, nested = false) =>
    blockers.some(
      (entry) =>
        entry.path === path || (nested && entry.path?.startsWith(`${path}.`)),
    );

  function update(changes: Partial<ExtractionDraft>) {
    onChange(validateExtractionDraft({ ...draft, ...changes }));
  }

  function updateSubject(
    index: number,
    changes: Partial<ExtractedSubjectDraft>,
    editedField?: "questions" | "correct" | "incorrect",
  ) {
    const subjects = draft.subjects.map((subject, subjectIndex) => {
      if (subjectIndex !== index) return subject;
      const derivedFields = changes.derivedFields ?? subject.derivedFields;
      return {
        ...subject,
        ...changes,
        derivedFields: editedField
          ? derivedFields.filter((field) => field !== editedField)
          : derivedFields,
      };
    });
    update({ subjects });
  }

  return (
    <section className="space-y-0" aria-label="Review AI extraction">
      <div className="border-y border-rule-soft bg-canvas px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-lg">Draft status</h3>
          <span className="text-[11px] uppercase tracking-wide text-muted">
            {draft.confidence} AI confidence
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Edit any uncertain value. This step only prepares the form; it does not save.
        </p>
        {(blockers.length > 0 || warnings.length > 0 || draft.modelWarnings.length > 0) && (
          <div className="mt-4 border-t border-rule-soft pt-3" role="status">
            {blockers.length > 0 && (
              <p className="text-sm font-medium text-danger">
                Resolve {blockers.length} highlighted field{blockers.length === 1 ? "" : "s"} before continuing.
              </p>
            )}
            {draft.issues.slice(0, 4).map((entry, index) => (
              <p
                key={`${entry.code}-summary-${index}`}
                className={entry.severity === "blocker" ? "mt-1 text-xs text-danger" : "mt-1 text-xs text-warning"}
              >
                {entry.message}
              </p>
            ))}
            {draft.issues.length > 4 && (
              <p className="mt-1 text-[11px] text-muted">
                +{draft.issues.length - 4} more issue{draft.issues.length - 4 === 1 ? "" : "s"} shown beside the affected fields.
              </p>
            )}
            {draft.modelWarnings.map((message, index) => (
              <p key={`model-${index}`} className="mt-1 text-xs text-warning">
                {message}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="border-b border-rule-soft py-4">
        <h4 className="font-serif text-base">Mock details</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            Mock name
            <input
              maxLength={150}
              aria-invalid={hasBlocker("name")}
              value={draft.name ?? ""}
              onChange={(event) => update({ name: event.target.value || null })}
            />
            <FieldIssues draft={draft} path="name" />
          </label>
          <label>
            Platform
            <input
              maxLength={80}
              aria-invalid={hasBlocker("platform")}
              value={draft.platform ?? ""}
              onChange={(event) => update({ platform: event.target.value || null })}
            />
            <FieldIssues draft={draft} path="platform" />
          </label>
          <label>
            Completed on
            <input
              type="date"
              aria-invalid={hasBlocker("date")}
              value={draft.date ?? ""}
              onChange={(event) => update({ date: event.target.value || null })}
            />
            <FieldIssues draft={draft} path="date" />
          </label>
          <label>
            Mock type
            <select
              aria-invalid={hasBlocker("type")}
              value={draft.type ?? ""}
              onChange={(event) => {
                const type = (event.target.value || null) as AttemptInput["type"] | null;
                update({
                  type,
                  subjects:
                    type === "full"
                      ? draft.subjects.map((subject) =>
                          subject.questions == null
                            ? {
                                ...subject,
                                questions: SUBJECTS[subject.subjectId].questions,
                                derivedFields: [
                                  ...new Set([...subject.derivedFields, "questions" as const]),
                                ],
                              }
                            : subject,
                        )
                      : draft.subjects,
                });
              }}
            >
              <option value="">Choose type</option>
              <option value="full">Full mock</option>
              <option value="subject">Subject mock</option>
              <option value="sectional">Sectional mock</option>
            </select>
            <FieldIssues draft={draft} path="type" />
          </label>
        </div>
      </div>

      <div className="border-b border-rule-soft py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-serif text-base">Subject results</h4>
            <p className="mt-1 text-xs text-muted">Blank means the report did not provide a reliable value.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={draft.subjects.length >= 5}
            onClick={() => {
              const nextId = subjectIds.find(
                (id) => !draft.subjects.some((subject) => subject.subjectId === id),
              );
              if (nextId) update({ subjects: [...draft.subjects, blankExtractedSubject(nextId)] });
            }}
          >
            <Plus size={14} /> Add subject
          </Button>
        </div>
        <FieldIssues draft={draft} path="subjects" />
        <div className="mt-4 divide-y divide-rule-soft border-y border-rule-soft">
          {draft.subjects.map((subject, index) => {
            const path = `subjects.${index}`;
            return (
              <div key={`${subject.subjectId}-${index}`} className="py-4 first:pt-3">
                <div className="flex items-end gap-3">
                  <label className="min-w-0 flex-1">
                    Subject
                    <select
                      value={subject.subjectId}
                      onChange={(event) => {
                        const subjectId = event.target.value as SubjectId;
                        updateSubject(index, {
                          subjectId,
                          ...(draft.type === "full"
                            ? {
                                questions: SUBJECTS[subjectId].questions,
                                derivedFields: [
                                  ...new Set([...subject.derivedFields, "questions" as const]),
                                ],
                              }
                            : {}),
                        });
                      }}
                    >
                      {subjectIds.map((id) => (
                        <option key={id} value={id}>{SUBJECTS[id].name}</option>
                      ))}
                    </select>
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Remove ${SUBJECTS[subject.subjectId].short}`}
                    onClick={() => update({ subjects: draft.subjects.filter((_, row) => row !== index) })}
                  >
                    <Trash2 size={14} /> Remove
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {(["questions", "correct", "incorrect"] as const).map((field) => (
                    <label key={field}>
                      {field[0].toUpperCase() + field.slice(1)}
                      <input
                        type="number"
                        aria-invalid={hasBlocker(`${path}.${field}`)}
                        min={field === "questions" ? 1 : 0}
                        max={500}
                        step={1}
                        value={subject[field] ?? ""}
                        onChange={(event) =>
                          updateSubject(
                            index,
                            { [field]: optionalNumber(event.target.value) },
                            field,
                          )
                        }
                      />
                      {subject.derivedFields.includes(field) && (
                        <span className="mt-1 text-[11px] text-muted">Derived from reported values</span>
                      )}
                    </label>
                  ))}
                  <NullableDuration
                    value={subject.timeSeconds}
                    subject={SUBJECTS[subject.subjectId].short}
                    onChange={(timeSeconds) => updateSubject(index, { timeSeconds })}
                  />
                </div>
                <details className="group mt-3 border border-rule-soft bg-canvas">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                    <span className="font-medium">Reported cross-check</span>
                    <span className="tabular text-muted group-open:hidden">
                      {subject.reported.score == null ? "Score —" : `Score ${subject.reported.score}`} · {subject.reported.attempted == null ? "Attempted —" : `${subject.reported.attempted} attempted`} · {subject.reported.unattempted == null ? "Skipped —" : `${subject.reported.unattempted} skipped`}
                    </span>
                    <span className="hidden text-muted group-open:inline">Collapse</span>
                  </summary>
                  <div className="border-t border-rule-soft p-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {(["score", "attempted", "unattempted"] as const).map((field) => (
                        <label key={field}>
                          {field[0].toUpperCase() + field.slice(1)}
                          <input
                            type="number"
                            step={field === "score" ? "any" : 1}
                            min={field === "score" ? undefined : 0}
                            value={subject.reported[field] ?? ""}
                            onChange={(event) =>
                              updateSubject(index, {
                                reported: {
                                  ...subject.reported,
                                  [field]: optionalNumber(event.target.value),
                                },
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                    {subject.reported.timeText && (
                      <p className="mt-2 text-xs tabular text-ink">
                        Reported time: {subject.reported.timeText}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-muted">
                      Used only to cross-check editable counts. Clear a value if the AI read it incorrectly.
                    </p>
                  </div>
                </details>
                <FieldIssues draft={draft} path={path} nested />
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-b border-rule-soft py-4">
        <h4 className="font-serif text-base">Additional results</h4>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          {(["rank", "participants", "percentile"] as const).map((field) => (
            <label key={field}>
              {field === "participants" ? "Participants" : field === "percentile" ? "Percentile (%)" : "Rank"}
              <input
                type="number"
                aria-invalid={hasBlocker(field)}
                min={field === "percentile" ? 0 : 1}
                max={field === "percentile" ? 100 : undefined}
                step={field === "percentile" ? 0.01 : 1}
                value={draft[field] ?? ""}
                onChange={(event) => update({ [field]: optionalNumber(event.target.value) })}
              />
              <FieldIssues draft={draft} path={field} />
            </label>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-t border-ink bg-paper/95 px-4 py-3 backdrop-blur-sm sm:-mx-5 sm:px-5">
        <Button disabled={blockers.length > 0} onClick={onUse}>
          {blockers.length > 0
            ? `Complete ${blockers.length} required field${blockers.length === 1 ? "" : "s"}`
            : "Use reviewed values"}
        </Button>
        <Button variant="outline" onClick={onBack}>Back to report</Button>
        <Button variant="ghost" onClick={onDiscard}>Discard AI draft</Button>
        <span className="ml-auto text-[11px] text-muted">Copies to form · does not save</span>
      </div>
    </section>
  );
}
