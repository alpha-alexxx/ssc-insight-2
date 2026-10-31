"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { PlainIcon } from "./icon";
import { Panel } from "./dashboard-panels";
import { useExamScope } from "./exam-context";
import {
  createCustomExamRequest,
  deleteCustomExamRequest,
  examsKeys,
  saveScopeRequest,
  updateCustomExamRequest,
  type CustomExamInput,
  type ExamsResponse,
} from "@/lib/queries/exams";
import { settingsKeys } from "@/lib/queries/settings";
import { patternMaxScore } from "@/lib/exams";
import type { SubjectId } from "@/lib/domain";
import { SUBJECTS } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * Settings → Exams: which exams the workspace covers (built-in toggles plus
 * user-defined custom exams), which one is the targeted/active exam, one
 * target score per exam, and the custom exam builder.
 */
export function ExamsSettingsPanel() {
  const scope = useExamScope();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<CustomExamInput | null>(null);
  const [creating, setCreating] = useState(false);

  if (!scope.exams) {
    return (
      <Panel dense icon="layers" title="Exams" description="Loading your exams…">
        <div className="px-4 pb-4" />
      </Panel>
    );
  }

  const exams = scope.exams;
  const enabled = new Set(exams.enabledExams);

  /**
   * Scope writes read the LATEST cached payload (not the render's snapshot)
   * and land in the cache optimistically, so two rapid toggles compose
   * instead of racing last-write-wins over a stale list.
   */
  const persist = async (
    patch: Partial<{
      activeExamId: string;
      enabledExams: string[];
      examTargets: Record<string, number | null>;
    }>,
  ) => {
    setBusy(true);
    setError("");
    const current =
      queryClient.getQueryData<ExamsResponse>(examsKeys.current()) ?? exams;
    const next = {
      activeExamId: patch.activeExamId ?? current.activeExamId,
      enabledExams: patch.enabledExams ?? current.enabledExams,
      examTargets: patch.examTargets ?? current.examTargets,
    };
    // Optimistic: the switcher and this panel read the same cache.
    queryClient.setQueryData<ExamsResponse>(examsKeys.current(), (prev) =>
      prev ? { ...prev, ...next } : prev,
    );
    try {
      const fresh = await saveScopeRequest(next);
      queryClient.setQueryData(settingsKeys.current(), fresh);
      scope.refresh();
    } catch (e) {
      scope.refresh(); // roll the optimistic value back on failure
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const toggleExam = (examId: string, on: boolean) => {
    const next = on ? [...enabled, examId] : [...enabled].filter((id) => id !== examId);
    if (!next.length) return; // never leave zero exams enabled
    void persist({
      enabledExams: next,
      // Switching away from a disabled exam falls back to CGL.
      activeExamId:
        exams.activeExamId === examId && !on ? "cgl" : exams.activeExamId,
    });
  };

  const setTarget = (examId: string, value: number | null) => {
    void persist({
      examTargets: { ...exams.examTargets, [examId]: value },
    });
  };

  const removeCustom = async (examId: string) => {
    setBusy(true);
    setError("");
    try {
      await deleteCustomExamRequest(examId);
      scope.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the exam");
    } finally {
      setBusy(false);
    }
  };

  const customExams = exams.customExams;
  const anyDialogOpen = creating || editing != null;

  return (
    <div className="flex flex-col gap-4">
      <Panel
        dense
        icon="layers"
        title="Your exams"
        description="Enable the exams you are preparing for; the header switcher moves between them."
      >
        <div className="px-4 pb-4">
          <ul className="divide-y divide-rule-soft">
            {exams.builtIn.map((exam) => (
              <ExamRow
                key={exam.id}
                name={exam.name}
                maxScore={primaryMax(exams, exam.id)}
                enabled={enabled.has(exam.id)}
                active={exams.activeExamId === exam.id}
                busy={busy}
                onToggle={(on) => toggleExam(exam.id, on)}
                onActivate={() => void persist({ activeExamId: exam.id })}
                target={exams.examTargets[exam.id] ?? null}
                onTarget={(value) => setTarget(exam.id, value)}
              />
            ))}
            {customExams.map((exam) => (
              <ExamRow
                key={exam.id}
                name={`${exam.name}`}
                custom
                maxScore={exam.maxScore}
                enabled
                active={exams.activeExamId === exam.id}
                busy={busy}
                onActivate={() => void persist({ activeExamId: exam.id })}
                target={exams.examTargets[exam.id] ?? null}
                onTarget={(value) => setTarget(exam.id, value)}
                onEdit={() => {
                  setEditing({
                    id: exam.id,
                    name: exam.name,
                    subjects: exam.subjects.map((s) => ({ ...s })),
                    marking: { ...exam.marking },
                  });
                }}
                onDelete={() => void removeCustom(exam.id)}
              />
            ))}
          </ul>
          {error && (
            <p role="alert" className="mt-3 text-[11px] text-danger">
              {error}
            </p>
          )}
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={anyDialogOpen || customExams.length >= 20}
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
            >
              <PlainIcon name="plus" size={14} /> Create custom exam
            </Button>
          </div>
        </div>
      </Panel>
      {(creating || editing) && (
        <CustomExamDialog
          initial={
            editing ?? {
              name: "",
              subjects: [{ subjectId: "quant", questions: 25, qualifying: false }],
              marking: { correct: 2, incorrect: 0.5 },
            }
          }
          isNew={!editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            scope.refresh();
          }}
        />
      )}
    </div>
  );
}

function primaryMax(exams: ExamsResponse, examId: string): number {
  const exam = exams.builtIn.find((e) => e.id === examId);
  if (!exam) return 0;
  const tier =
    exam.tiers.find((t) => t.id === exam.primaryTierId) ?? exam.tiers[0];
  return tier ? patternMaxScore(tier) : 0;
}

type ExamRowProps = {
  name: string;
  custom?: boolean;
  maxScore: number;
  enabled: boolean;
  active: boolean;
  busy: boolean;
  target: number | null;
  onToggle?: (on: boolean) => void;
  onActivate: () => void;
  onTarget: (value: number | null) => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

function ExamRow({
  name,
  custom = false,
  maxScore,
  enabled,
  active,
  busy,
  target,
  onToggle,
  onActivate,
  onTarget,
  onEdit,
  onDelete,
}: ExamRowProps) {
  const [targetInput, setTargetInput] = useState(target?.toString() ?? "");
  const dirty = targetInput !== (target?.toString() ?? "");
  const numeric = targetInput.trim() === "" ? null : Number(targetInput);
  const valid =
    targetInput.trim() === "" ||
    (Number.isFinite(numeric) && numeric != null && numeric >= 0 && numeric <= maxScore);

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            disabled={busy || !onToggle}
            onChange={(e) => onToggle?.(e.target.checked)}
          />
          <span className={cn("truncate", !enabled && "text-muted")}>
            {name}
            {custom ? (
              <span className="ml-1.5 text-[0.625rem] uppercase tracking-wide text-muted">
                custom
              </span>
            ) : null}
            <span className="ml-2 text-[0.625rem] text-muted">
              out of {maxScore}
            </span>
          </span>
        </label>
        {custom && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={busy}
            onClick={onEdit}
          >
            <PlainIcon name="more" size={13} /> Edit
          </Button>
        )}
        {custom && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-danger hover:text-danger"
            disabled={busy}
            onClick={onDelete}
          >
            Delete
          </Button>
        )}
        <button
          type="button"
          aria-pressed={active}
          disabled={busy || !enabled || active}
          onClick={onActivate}
          className={cn(
            "rounded-pill border px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide transition-colors",
            active
              ? "border-accent bg-accent/10 text-accent"
              : "border-rule-soft text-muted hover:border-rule hover:text-ink",
            !enabled && "opacity-50",
          )}
        >
          {active ? "Targeted" : "Set as targeted"}
        </button>
      </div>
      {enabled && (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
          <label className="text-[0.6875rem] text-muted">
            Target (out of {maxScore})
            <input
              type="number"
              className="no-spin mt-0.5 block w-32"
              min={0}
              max={maxScore}
              step="0.01"
              placeholder="e.g. 320"
              disabled={busy}
              value={targetInput}
              aria-invalid={!valid || undefined}
              onChange={(e) => setTargetInput(e.target.value)}
            />
          </label>
          <Button
            size="sm"
            variant="outline"
            className="mt-4 h-7"
            disabled={busy || !dirty || !valid}
            onClick={() => onTarget(numeric)}
          >
            Save target
          </Button>
        </div>
      )}
    </li>
  );
}

const SUBJECT_CHOICES: SubjectId[] = [
  "quant",
  "reasoning",
  "english",
  "ga",
  "computer",
];

function CustomExamDialog({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: CustomExamInput;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<CustomExamInput>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const meritQuestions = draft.subjects
    .filter((s) => !s.qualifying)
    .reduce((sum, s) => sum + s.questions, 0);
  const maxScore = meritQuestions * draft.marking.correct;
  const valid =
    draft.name.trim().length > 0 &&
    draft.subjects.length > 0 &&
    draft.subjects.every((s) => s.questions >= 1) &&
    draft.marking.correct > 0 &&
    draft.marking.incorrect >= 0;

  const toggleSubject = (id: SubjectId, on: boolean) => {
    setDraft((prev) => ({
      ...prev,
      subjects: on
        ? [...prev.subjects, { subjectId: id, questions: 25, qualifying: false }]
        : prev.subjects.filter((s) => s.subjectId !== id),
    }));
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      if (isNew) await createCustomExamRequest(draft);
      else await updateCustomExamRequest({ ...draft, id: draft.id! });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the exam");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      dense
      icon="layers"
      title={isNew ? "Create custom exam" : `Edit ${initial.name}`}
      description="Name, subject slots, and marking scheme. One paper pattern; tier is chosen per attempt elsewhere."
    >
      <div className="space-y-4 px-4 pb-4">
        <label className="block text-sm">
          Exam name
          <input
            className="mt-1"
            maxLength={80}
            required
            placeholder="e.g. SSC Steno, My Practice Paper"
            value={draft.name}
            disabled={busy}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          />
        </label>
        <fieldset className="text-sm">
          <legend className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Subjects
          </legend>
          <div className="space-y-2">
            {SUBJECT_CHOICES.map((id) => {
              const row = draft.subjects.find((s) => s.subjectId === id);
              return (
                <div key={id} className="flex flex-wrap items-center gap-3">
                  <label className="flex min-w-36 flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row != null}
                      disabled={busy}
                      onChange={(e) => toggleSubject(id, e.target.checked)}
                    />
                    {SUBJECTS[id].name}
                  </label>
                  {row && (
                    <>
                      <label className="text-[0.6875rem] text-muted">
                        Questions
                        <input
                          type="number"
                          className="no-spin mt-0.5 block w-24"
                          min={1}
                          max={500}
                          disabled={busy}
                          value={row.questions}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              subjects: prev.subjects.map((s) =>
                                s.subjectId === id
                                  ? { ...s, questions: Number(e.target.value) }
                                  : s,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-[0.6875rem] text-muted">
                        <input
                          type="checkbox"
                          checked={row.qualifying}
                          disabled={busy}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              subjects: prev.subjects.map((s) =>
                                s.subjectId === id
                                  ? { ...s, qualifying: e.target.checked }
                                  : s,
                              ),
                            }))
                          }
                        />
                        Qualifying (excluded from total)
                      </label>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="text-[0.6875rem] text-muted">
            Marks per correct
            <input
              type="number"
              className="no-spin mt-0.5 block w-24"
              min={0.25}
              max={100}
              step="0.25"
              disabled={busy}
              value={draft.marking.correct}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  marking: { ...prev.marking, correct: Number(e.target.value) },
                }))
              }
            />
          </label>
          <label className="text-[0.6875rem] text-muted">
            Penalty per incorrect
            <input
              type="number"
              className="no-spin mt-0.5 block w-24"
              min={0}
              max={100}
              step="0.05"
              disabled={busy}
              value={draft.marking.incorrect}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  marking: { ...prev.marking, incorrect: Number(e.target.value) },
                }))
              }
            />
          </label>
          <p className="self-end text-[0.6875rem] text-muted">
            Maximum: {maxScore} marks
          </p>
        </div>
        {error && (
          <p role="alert" className="text-[11px] text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button disabled={busy || !valid} onClick={() => void save()}>
            {busy ? "Saving…" : isNew ? "Create exam" : "Save changes"}
          </Button>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Panel>
  );
}
