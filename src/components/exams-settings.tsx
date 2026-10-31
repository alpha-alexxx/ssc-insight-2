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
  type CustomTierInput,
  type ExamsResponse,
} from "@/lib/queries/exams";
import { settingsKeys } from "@/lib/queries/settings";
import { patternMaxScore } from "@/lib/exams";
import type { SubjectId } from "@/lib/domain";
import { SUBJECTS } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * Settings → Exams: tier-level scope. Each exam lists its tiers as
 * checkboxes ("cgl:tier1", "cgl:tier2", …), one exam is the targeted one
 * (activated with its first enabled tier), targets are per exam, and the
 * custom exam builder defines named tiers with their own patterns.
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
  const enabled = new Set(exams.enabledTiers);

  /**
   * Scope writes read the LATEST cached payload (not the render's snapshot)
   * and land in the cache optimistically, so two rapid toggles compose
   * instead of racing last-write-wins over a stale list.
   */
  const persist = async (
    patch: Partial<{
      activeExamId: string;
      activeTierId: string;
      enabledTiers: string[];
      examTargets: Record<string, number | null>;
    }>,
  ) => {
    setBusy(true);
    setError("");
    const current =
      queryClient.getQueryData<ExamsResponse>(examsKeys.current()) ?? exams;
    const next = {
      activeExamId: patch.activeExamId ?? current.activeExamId,
      activeTierId: patch.activeTierId ?? current.activeTierId,
      enabledTiers: patch.enabledTiers ?? current.enabledTiers,
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

  /** When the active tier gets disabled, the scope moves somewhere valid. */
  const nextActiveAfterRemoval = (
    remaining: string[],
    removedExamId: string,
  ): { activeExamId: string; activeTierId: string } => {
    const sameExam = remaining.find((key) =>
      key.startsWith(`${removedExamId}:`),
    );
    if (sameExam) {
      return {
        activeExamId: removedExamId,
        activeTierId: sameExam.slice(removedExamId.length + 1),
      };
    }
    const any = remaining[0];
    if (any) {
      const sep = any.indexOf(":");
      return {
        activeExamId: any.slice(0, sep),
        activeTierId: any.slice(sep + 1),
      };
    }
    // Nothing left enabled: the workspace shows its empty state.
    return { activeExamId: "cgl", activeTierId: "tier2" };
  };

  const toggleTier = (examId: string, tierId: string, on: boolean) => {
    const key = `${examId}:${tierId}`;
    const remaining = on
      ? [...enabled, key]
      : [...enabled].filter((k) => k !== key);
    const patch: Parameters<typeof persist>[0] = { enabledTiers: remaining };
    if (!on && exams.activeExamId === examId) {
      const activeKey = `${exams.activeExamId}:${exams.activeTierId}`;
      if (!remaining.includes(activeKey))
        Object.assign(patch, nextActiveAfterRemoval(remaining, examId));
    }
    void persist(patch);
  };

  const setTargeted = (examId: string) => {
    const examTiers = exams.enabledTiers
      .filter((key) => key.startsWith(`${examId}:`))
      .map((key) => key.slice(examId.length + 1));
    if (!examTiers.length) return;
    void persist({ activeExamId: examId, activeTierId: examTiers[0]! });
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
        description="Enable the tiers you are preparing for — both tiers of an exam is fine. The header switcher moves between them, including an all-tiers combined view."
      >
        <div className="px-4 pb-4">
          {exams.enabledTiers.length === 0 && (
            <p className="mb-3 rounded-control bg-soft p-3 text-xs text-muted">
              Nothing is enabled yet. Tick at least one tier below to start
              logging mocks.
            </p>
          )}
          <ul className="divide-y divide-rule-soft">
            {exams.builtIn.map((exam) => (
              <ExamRow
                key={exam.id}
                examId={exam.id}
                name={exam.name}
                maxScore={primaryMax(exams, exam.id)}
                tiers={exam.tiers.map((tier) => ({
                  id: tier.id,
                  label: tier.label,
                }))}
                enabledKeys={exams.enabledTiers}
                activeExamId={exams.activeExamId}
                activeTierId={exams.activeTierId}
                busy={busy}
                onToggleTier={(tierId, on) => toggleTier(exam.id, tierId, on)}
                onTargeted={() => setTargeted(exam.id)}
                target={exams.examTargets[exam.id] ?? null}
                onTarget={(value) => setTarget(exam.id, value)}
              />
            ))}
            {customExams.map((exam) => (
              <ExamRow
                key={exam.id}
                examId={exam.id}
                name={exam.name}
                custom
                maxScore={exam.tiers[0]?.maxScore ?? 0}
                tiers={exam.tiers.map((tier) => ({
                  id: tier.id,
                  label: tier.label,
                }))}
                enabledKeys={exams.enabledTiers}
                activeExamId={exams.activeExamId}
                activeTierId={exams.activeTierId}
                busy={busy}
                onToggleTier={(tierId, on) => toggleTier(exam.id, tierId, on)}
                onTargeted={() => setTargeted(exam.id)}
                target={exams.examTargets[exam.id] ?? null}
                onTarget={(value) => setTarget(exam.id, value)}
                onEdit={() => {
                  setEditing({
                    id: exam.id,
                    name: exam.name,
                    tiers: exam.tiers.map((tier) => ({
                      id: tier.id,
                      label: tier.label,
                      subjects: tier.subjects.map((s) => ({ ...s })),
                      marking: { ...tier.marking },
                    })),
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
              tiers: [
                {
                  label: "Tier 1",
                  subjects: [
                    { subjectId: "quant", questions: 25, qualifying: false },
                  ],
                  marking: { correct: 2, incorrect: 0.5 },
                },
              ],
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
  if (!exam) {
    return (
      exams.customExams.find((e) => e.id === examId)?.tiers[0]?.maxScore ?? 0
    );
  }
  const tier =
    exam.tiers.find((t) => t.id === exam.primaryTierId) ?? exam.tiers[0];
  return tier ? patternMaxScore(tier) : 0;
}

type ExamRowProps = {
  examId: string;
  name: string;
  custom?: boolean;
  maxScore: number;
  tiers: { id: string; label: string }[];
  enabledKeys: string[];
  activeExamId: string;
  activeTierId: string;
  busy: boolean;
  target: number | null;
  onToggleTier: (tierId: string, on: boolean) => void;
  onTargeted: () => void;
  onTarget: (value: number | null) => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

function ExamRow({
  examId,
  name,
  custom = false,
  maxScore,
  tiers,
  enabledKeys,
  activeExamId,
  activeTierId,
  busy,
  target,
  onToggleTier,
  onTargeted,
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
  const keyOf = (tierId: string) => `${examId}:${tierId}`;
  const enabledTierIds = tiers
    .filter((tier) => enabledKeys.includes(keyOf(tier.id)))
    .map((tier) => tier.id);
  const isTargeted =
    activeExamId === examId && enabledTierIds.includes(activeTierId);

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("min-w-36 flex-1 truncate text-sm")}>
          {name}
          {custom ? (
            <span className="ml-1.5 text-[0.625rem] uppercase tracking-wide text-muted">
              custom
            </span>
          ) : null}
          <span className="ml-2 text-[0.625rem] text-muted">
            target out of {maxScore}
          </span>
        </span>
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
          aria-pressed={isTargeted}
          disabled={busy || enabledTierIds.length === 0 || isTargeted}
          onClick={onTargeted}
          className={cn(
            "rounded-pill border px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide transition-colors",
            isTargeted
              ? "border-accent bg-accent/10 text-accent"
              : "border-rule-soft text-muted hover:border-rule hover:text-ink",
            enabledTierIds.length === 0 && "opacity-50",
          )}
        >
          {isTargeted ? "Targeted" : "Set as targeted"}
        </button>
      </div>
      {/* Tier checkboxes — the unit of enablement. */}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 pl-1">
        {tiers.map((tier) => (
          <label
            key={tier.id}
            className="flex items-center gap-2 text-xs text-ink"
          >
            <input
              type="checkbox"
              checked={enabledKeys.includes(keyOf(tier.id))}
              disabled={busy}
              onChange={(e) => onToggleTier(tier.id, e.target.checked)}
            />
            {tier.label}
          </label>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-1">
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
  const valid =
    draft.name.trim().length > 0 &&
    draft.tiers.length > 0 &&
    draft.tiers.every(
      (tier) =>
        tier.label.trim().length > 0 &&
        tier.subjects.length > 0 &&
        tier.subjects.every((s) => s.questions >= 1) &&
        tier.marking.correct > 0 &&
        tier.marking.incorrect >= 0,
    );

  const updateTier = (index: number, patch: Partial<CustomTierInput>) => {
    setDraft((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) =>
        i === index ? { ...tier, ...patch } : tier,
      ),
    }));
  };

  const addTier = () => {
    setDraft((prev) => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        {
          label: `Tier ${prev.tiers.length + 1}`,
          subjects: [
            { subjectId: "quant", questions: 25, qualifying: false },
          ],
          marking: { correct: 2, incorrect: 0.5 },
        },
      ],
    }));
  };

  const removeTier = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index),
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
      description="Name the exam, then add its tiers — each tier carries its own subjects, question counts, and marking scheme."
    >
      <div className="space-y-5 px-4 pb-4">
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
        {draft.tiers.map((tier, index) => {
          const meritQuestions = tier.subjects
            .filter((s) => !s.qualifying)
            .reduce((sum, s) => sum + s.questions, 0);
          return (
            <fieldset
              key={tier.id ?? `new-${index}`}
              className="rounded-control border border-rule-soft p-3"
            >
              <legend className="flex items-center gap-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                Tier {index + 1}
                {draft.tiers.length > 1 && (
                  <button
                    type="button"
                    className="text-[0.6875rem] font-normal normal-case text-danger hover:underline"
                    disabled={busy}
                    onClick={() => removeTier(index)}
                  >
                    remove
                  </button>
                )}
              </legend>
              <div className="space-y-3">
                <label className="block text-sm">
                  Tier label
                  <input
                    className="mt-1"
                    maxLength={40}
                    required
                    placeholder="e.g. Prelims, Mains, Paper 1"
                    disabled={busy}
                    value={tier.label}
                    onChange={(e) => updateTier(index, { label: e.target.value })}
                  />
                </label>
                <div className="space-y-2">
                  {SUBJECT_CHOICES.map((id) => {
                    const row = tier.subjects.find((s) => s.subjectId === id);
                    return (
                      <div key={id} className="flex flex-wrap items-center gap-3">
                        <label className="flex min-w-36 flex-1 items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={row != null}
                            disabled={busy}
                            onChange={(e) => {
                              const subjects = e.target.checked
                                ? [
                                    ...tier.subjects,
                                    { subjectId: id, questions: 25, qualifying: false },
                                  ]
                                : tier.subjects.filter((s) => s.subjectId !== id);
                              updateTier(index, { subjects });
                            }}
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
                                  updateTier(index, {
                                    subjects: tier.subjects.map((s) =>
                                      s.subjectId === id
                                        ? { ...s, questions: Number(e.target.value) }
                                        : s,
                                    ),
                                  })
                                }
                              />
                            </label>
                            <label className="flex items-center gap-1.5 text-[0.6875rem] text-muted">
                              <input
                                type="checkbox"
                                checked={row.qualifying}
                                disabled={busy}
                                onChange={(e) =>
                                  updateTier(index, {
                                    subjects: tier.subjects.map((s) =>
                                      s.subjectId === id
                                        ? { ...s, qualifying: e.target.checked }
                                        : s,
                                    ),
                                  })
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
                      value={tier.marking.correct}
                      onChange={(e) =>
                        updateTier(index, {
                          marking: { ...tier.marking, correct: Number(e.target.value) },
                        })
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
                      value={tier.marking.incorrect}
                      onChange={(e) =>
                        updateTier(index, {
                          marking: { ...tier.marking, incorrect: Number(e.target.value) },
                        })
                      }
                    />
                  </label>
                  <p className="self-end text-[0.6875rem] text-muted">
                    Maximum: {meritQuestions * tier.marking.correct} marks
                  </p>
                </div>
              </div>
            </fieldset>
          );
        })}
        {draft.tiers.length < 4 && (
          <Button variant="outline" size="sm" disabled={busy} onClick={addTier}>
            <PlainIcon name="plus" size={14} /> Add tier
          </Button>
        )}
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
