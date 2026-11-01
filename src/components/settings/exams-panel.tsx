"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Panel } from "../dashboard-panels";
import { PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Dialog } from "radix-ui";
import { useToast } from "../toast";
import { useExamScope } from "../exam-context";
import {
  createCustomExamRequest,
  deleteCustomExamRequest,
  examsKeys,
  putScopeRequest,
  updateCustomExamRequest,
  type CustomExamInput,
  type CustomTierInput,
  type ExamsResponse,
} from "@/lib/queries/exams";
import { SUBJECTS, type SubjectId } from "@/lib/domain";
import { trashKeys } from "@/lib/queries/trash";
import { cn } from "@/lib/utils";
import { usePanelDraft } from "./settings-guard";

/**
 * Exams & tiers: enable the tiers you are preparing for, see each paper's
 * real shape (subjects, marks, marking, duration and stages), set the
 * targeted tier, and build custom exams.
 *
 * Everything here is descriptive rather than decipherable-into-marks: the
 * catalog is versioned source data (see lib/exams.ts), so the panel shows
 * what the notice says and links where the number came from.
 */
export function ExamsPanel() {
  const scope = useExamScope();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CustomExamInput | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(
    null,
  );
  // Tier enablement is staged until "Save scope", so a slip of the mouse does
  // not silently change which tiers the workspace reads.
  const [draftTiers, setDraftTiers] = useState<string[] | null>(null);

  const exams = scope.exams;

  const enabled = useMemo(
    () => new Set(draftTiers ?? exams?.enabledTiers ?? []),
    [draftTiers, exams?.enabledTiers],
  );
  const savedEnabled = useMemo(
    () => new Set(exams?.enabledTiers ?? []),
    [exams?.enabledTiers],
  );
  const dirty =
    draftTiers != null &&
    (draftTiers.length !== savedEnabled.size ||
      draftTiers.some((key) => !savedEnabled.has(key)));

  const resetDraft = useCallback(() => setDraftTiers(null), []);
  usePanelDraft("exams", { isDirty: dirty, reset: resetDraft });

  if (!exams) {
    return (
      <Panel
        dense
        icon="layers"
        title="Exams & tiers"
        description={
          scope.failed
            ? "Your exam list could not be loaded."
            : "Loading your exams…"
        }
      >
        <div className="px-4 pb-4">
          {scope.failed ? (
            <div className="flex items-center gap-3">
              <p role="alert" className="text-xs text-danger">
                Check your connection, then try again.
              </p>
              <Button size="sm" variant="outline" onClick={scope.refresh}>
                <PlainIcon name="refresh" size={13} /> Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-2" role="status" aria-label="Loading exams">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-control bg-soft"
                  style={{ opacity: 1 - i * 0.15 }}
                />
              ))}
            </div>
          )}
        </div>
      </Panel>
    );
  }

  const toggleTier = (key: string, on: boolean) => {
    setDraftTiers((current) => {
      const base = new Set(current ?? exams.enabledTiers);
      if (on) base.add(key);
      else base.delete(key);
      return [...base];
    });
  };

  const saveScope = async () => {
    if (draftTiers == null) return;
    setBusy(true);
    setError("");
    try {
      // If the active tier was just disabled, move the scope somewhere that
      // still resolves — preferring the same exam, then the exam's anchor.
      const activeKey = `${exams.activeExamId}:${exams.activeTierId}`;
      const remaining = draftTiers;
      let activeExamId = exams.activeExamId;
      let activeTierId = exams.activeTierId;
      if (
        exams.activeTierId !== "all" &&
        remaining.length > 0 &&
        !remaining.includes(activeKey)
      ) {
        const sameExam = remaining.find((k) =>
          k.startsWith(`${exams.activeExamId}:`),
        );
        const next = sameExam ?? remaining[0]!;
        const sep = next.indexOf(":");
        activeExamId = next.slice(0, sep);
        activeTierId = next.slice(sep + 1);
      }
      const fresh = await putScopeRequest({
        activeExamId,
        activeTierId,
        enabledTiers: remaining,
      });
      queryClient.setQueryData<ExamsResponse>(examsKeys.current(), fresh);
      setDraftTiers(null);
      // The scope drives attempt and analytics queries, so they re-read.
      await queryClient.invalidateQueries({ queryKey: ["mock-attempts"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Exams updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your exams");
    } finally {
      setBusy(false);
    }
  };

  const setTargeted = async (examId: string) => {
    const firstEnabled =
      exams.enabledTiers
        .filter((key) => key.startsWith(`${examId}:`))
        .map((key) => key.slice(examId.length + 1))[0] ??
      exams.builtIn.find((exam) => exam.id === examId)?.primaryTierId ??
      exams.customExams.find((exam) => exam.id === examId)?.tiers[0]?.id;
    if (!firstEnabled) return;
    setBusy(true);
    setError("");
    try {
      const fresh = await putScopeRequest({
        activeExamId: examId,
        activeTierId: firstEnabled,
        enabledTiers: exams.enabledTiers,
      });
      queryClient.setQueryData<ExamsResponse>(examsKeys.current(), fresh);
      await queryClient.invalidateQueries({ queryKey: ["mock-attempts"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change the exam");
    } finally {
      setBusy(false);
    }
  };

  const removeCustom = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      await deleteCustomExamRequest(id);
      await queryClient.invalidateQueries({ queryKey: examsKeys.all });
      // The exam is now a Trash row; a mounted /trash must show it.
      await queryClient.invalidateQueries({ queryKey: trashKeys.all });
      setDeleting(null);
      toast.success("Moved to Trash", "Recoverable for 15 days");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the exam");
    } finally {
      setBusy(false);
    }
  };

  const anyDialogOpen = creating || editing != null || deleting != null;

  return (
    <div className="flex flex-col gap-4">
      <Panel
        dense
        icon="layers"
        title="Exams & tiers"
        description="Enable the tiers you are preparing for, then pick which one the workspace follows."
      >
        <div className="px-4 pb-4">
          {exams.enabledTiers.length === 0 && draftTiers == null && (
            <p className="mb-3 rounded-control bg-warning-soft p-3 text-xs leading-relaxed text-warning">
              Nothing is enabled yet. Tick at least one tier below so mocks,
              targets and performance views have a scope.
            </p>
          )}
          <ul className="divide-y divide-rule-soft">
            {exams.builtIn.map((exam) => (
              <ExamRow
                key={exam.id}
                examId={exam.id}
                name={exam.name}
                cycle={exam.source.cycle}
                tiers={exam.tiers.map((tier) => ({
                  id: tier.id,
                  label: tier.label,
                  maxScore: maxOf(tier),
                  durationMinutes: tier.durationMinutes ?? null,
                  subjects: tier.subjects.map((s) => ({
                    subjectId: s.subjectId,
                    questions: s.questions,
                    qualifying: s.qualifying,
                  })),
                  marking: tier.marking,
                  role: tier.role ?? null,
                }))}
                sources={[exam.source]}
                stages={(exam.stages ?? []).map((stage) => ({
                  id: stage.id,
                  label: stage.label,
                  durationMinutes: stage.durationMinutes ?? null,
                  note: stage.note ?? null,
                }))}
                enabled={enabled}
                activeExamId={exams.activeExamId}
                activeTierId={exams.activeTierId}
                busy={busy}
                onToggleTier={toggleTier}
                onTargeted={() => void setTargeted(exam.id)}
              />
            ))}
            {exams.customExams.map((exam) => (
              <ExamRow
                key={exam.id}
                examId={exam.id}
                name={exam.name}
                custom
                tiers={exam.tiers.map((tier) => ({
                  id: tier.id,
                  label: tier.label,
                  maxScore: tier.maxScore,
                  durationMinutes: null,
                  subjects: tier.subjects,
                  marking: tier.marking,
                  role: null,
                }))}
                sources={[]}
                stages={[]}
                enabled={enabled}
                activeExamId={exams.activeExamId}
                activeTierId={exams.activeTierId}
                busy={busy}
                onToggleTier={toggleTier}
                onTargeted={() => void setTargeted(exam.id)}
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
                onDelete={() => setDeleting({ id: exam.id, name: exam.name })}
              />
            ))}
          </ul>
          {error && (
            <p role="alert" className="mt-3 text-[11px] text-danger">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="max-sm:w-full"
              disabled={!dirty || busy}
              onClick={() => void saveScope()}
            >
              {busy ? "Saving…" : "Save selection"}
            </Button>
            {dirty && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={resetDraft}>
                Discard
              </Button>
            )}
            <span role="status" className="text-[0.6875rem] text-muted">
              {dirty ? "Unsaved changes" : ""}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto max-sm:w-full"
              disabled={anyDialogOpen || exams.customExams.length >= 20}
              onClick={() => setCreating(true)}
              title={
                exams.customExams.length >= 20
                  ? "You already have 20 custom exams"
                  : undefined
              }
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
          }}
        />
      )}

      <AlertDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move {deleting?.name} to Trash?
            </AlertDialogTitle>
            <AlertDialogDescription>
              It disappears from the catalog and the scope switcher, and stays
              recoverable in Trash for 15 days. Its tiers, targets and
              percentile goal come back with it — they are only dropped when it
              is deleted permanently. An exam that still has logged mocks
              cannot be deleted.
              {deleting && exams?.activeExamId === deleting.id ? (
                <>
                  {" "}
                  This is your active exam: your scope moves to another enabled
                  tier. Restoring it will not switch the scope back.                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                if (deleting) void removeCustom(deleting.id);
              }}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type TierSummary = {
  id: string;
  label: string;
  maxScore: number;
  durationMinutes: number | null;
  subjects: { subjectId: SubjectId; questions: number; qualifying: boolean }[];
  marking: { correct: number; incorrect: number };
  role: string | null;
};

type StageSummary = {
  id: string;
  label: string;
  durationMinutes: number | null;
  note: string | null;
};

type SourceSummary = { cycle: string; url: string; retrievedAt: string };

function ExamRow({
  examId,
  name,
  cycle,
  custom = false,
  tiers,
  sources,
  stages,
  enabled,
  activeExamId,
  activeTierId,
  busy,
  onToggleTier,
  onTargeted,
  onEdit,
  onDelete,
}: {
  examId: string;
  name: string;
  cycle?: string;
  custom?: boolean;
  tiers: TierSummary[];
  sources: SourceSummary[];
  stages: StageSummary[];
  enabled: Set<string>;
  activeExamId: string;
  activeTierId: string;
  busy: boolean;
  onToggleTier: (key: string, on: boolean) => void;
  onTargeted: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const enabledKeys = tiers
    .map((tier) => `${examId}:${tier.id}`)
    .filter((key) => enabled.has(key));
  // The combined "all" view belongs to this exam, so the exam IS targeted.
  const isTargeted =
    activeExamId === examId &&
    (activeTierId === "all"
      ? enabledKeys.length > 0
      : enabledKeys.includes(`${examId}:${activeTierId}`));

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="min-w-36 flex-1 text-sm font-medium text-ink">
          {name}
          {custom ? (
            <span className="ml-1.5 text-[0.625rem] uppercase tracking-wide text-muted">
              custom
            </span>
          ) : null}
        </span>
        {cycle && (
          <span className="text-[0.6875rem] text-muted">Pattern: {cycle}</span>
        )}
        <button
          type="button"
          aria-pressed={isTargeted}
          disabled={busy || enabledKeys.length === 0 || isTargeted}
          onClick={onTargeted}
          className={cn(
            "rounded-control border px-2.5 py-1 text-[0.6875rem] font-medium transition-colors",
            isTargeted
              ? "border-accent bg-accent-soft text-accent"
              : "border-rule-soft text-muted hover:border-rule hover:text-ink",
            enabledKeys.length === 0 && "opacity-50",
          )}
          title={
            enabledKeys.length === 0
              ? "Enable a tier first"
              : isTargeted
                ? "This is the exam the workspace follows"
                : "Make this the exam the workspace follows"
          }
        >
          {isTargeted ? "Your exam" : "Set as your exam"}
        </button>
        {custom && onEdit && (
          <Button variant="ghost" size="sm" className="h-7 px-2" disabled={busy} onClick={onEdit}>
            Edit
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
      </div>

      <div className="mt-2 space-y-1.5 pl-1">
        {tiers.map((tier) => {
          const key = `${examId}:${tier.id}`;
          const on = enabled.has(key);
          return (
            <label
              key={tier.id}
              className="flex cursor-pointer items-start gap-2.5 text-xs"
            >
              <Checkbox
                checked={on}
                disabled={busy}
                onCheckedChange={(checked) => onToggleTier(key, checked === true)}
                className="mt-0.5"
                aria-label={`Enable ${name} ${tier.label}`}
              />
              <span className="min-w-0">
                <span className="font-medium text-ink">{tier.label}</span>
                <span className="ml-2 text-muted">{describeTier(tier)}</span>
                {tier.role && (
                  <span className="ml-2 text-[0.625rem] uppercase tracking-wide text-muted">
                    {tier.role}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {(stages.length > 0 || sources.length > 0) && (
        <Accordion type="single" collapsible className="mt-1 pl-1">
          <AccordionItem value="detail" className="border-b-0">
            <AccordionTrigger className="py-1.5 text-[0.6875rem] font-normal text-muted">
              Stages and source
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1 text-[0.6875rem] leading-relaxed text-muted">
                {stages.map((stage) => (
                  <li key={stage.id}>
                    <span className="font-medium text-ink">{stage.label}</span>
                    {stage.durationMinutes ? ` · ${stage.durationMinutes} min` : ""}
                    {" · qualifying, not scored"}
                    {stage.note ? ` — ${stage.note}` : ""}
                  </li>
                ))}
                {sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="underline decoration-rule-soft underline-offset-2 hover:text-accent"
                    >
                      {source.cycle} notice
                    </a>{" "}
                    · read {source.retrievedAt}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </li>
  );
}

/** "4 parts · 130 Q · 390 marks · +3/−1 · 135 min" */
function describeTier(tier: TierSummary): string {
  const merit = tier.subjects.filter((s) => !s.qualifying);
  const qualifying = tier.subjects.length - merit.length;
  const questions = merit.reduce((sum, s) => sum + s.questions, 0);
  const parts = `${merit.length} part${merit.length === 1 ? "" : "s"}`;
  const penalty = tier.marking.incorrect
    ? `−${tier.marking.incorrect}`
    : "no negative";
  const bits = [
    parts,
    `${questions} Q`,
    `${tier.maxScore} marks`,
    `+${tier.marking.correct}/${penalty}`,
  ];
  if (tier.durationMinutes) bits.push(`${tier.durationMinutes} min`);
  if (qualifying)
    bits.push(`${qualifying} qualifying`);
  return bits.join(" · ");
}

function maxOf(tier: {
  subjects: readonly { questions: number; qualifying: boolean }[];
  marking: { correct: number };
}): number {
  return (
    tier.subjects
      .filter((s) => !s.qualifying)
      .reduce((sum, s) => sum + s.questions, 0) * tier.marking.correct
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
  const queryClient = useQueryClient();
  const toast = useToast();
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

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      if (isNew) await createCustomExamRequest(draft);
      else await updateCustomExamRequest({ ...draft, id: draft.id! });
      await queryClient.invalidateQueries({ queryKey: examsKeys.all });
      toast.success(isNew ? "Custom exam created" : "Custom exam updated");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the exam");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !busy && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-ink/45" />
        <Dialog.Content
          aria-describedby="custom-exam-description"
          className="dialog-content fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto border border-rule bg-paper p-5 shadow-pop outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-40px)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-panel"
        >
          <Dialog.Title className="font-serif text-[1.25rem] font-medium">
            {isNew ? "Create a custom exam" : `Edit ${initial.name}`}
          </Dialog.Title>
          <p
            id="custom-exam-description"
            className="mt-1 text-[0.75rem] leading-relaxed text-muted"
          >
            Name the exam, then add its tiers. Each tier carries its own
            subjects, question counts and marking scheme.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block text-xs font-medium">
              Exam name
              <Input
                className="mt-1"
                maxLength={80}
                required
                placeholder="e.g. SSC JE, My Practice Paper"
                value={draft.name}
                disabled={busy}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
                }
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
                  <legend className="flex items-center gap-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">
                    Tier {index + 1}
                    {draft.tiers.length > 1 && (
                      <button
                        type="button"
                        className="text-[0.6875rem] font-normal normal-case text-danger hover:underline"
                        disabled={busy}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            tiers: prev.tiers.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        remove
                      </button>
                    )}
                  </legend>
                  <div className="space-y-3">
                    <label className="block text-xs font-medium">
                      Tier label
                      <Input
                        className="mt-1"
                        maxLength={40}
                        required
                        placeholder="e.g. Prelims, Mains, Paper 1"
                        disabled={busy}
                        value={tier.label}
                        onChange={(e) =>
                          updateTier(index, { label: e.target.value })
                        }
                      />
                    </label>
                    <div className="space-y-2">
                      {SUBJECT_CHOICES.map((id) => {
                        const row = tier.subjects.find(
                          (s) => s.subjectId === id,
                        );
                        return (
                          <div
                            key={id}
                            className="flex flex-wrap items-center gap-3"
                          >
                            <label className="flex min-w-36 flex-1 items-center gap-2 text-xs">
                              <Checkbox
                                checked={row != null}
                                disabled={busy}
                                onCheckedChange={(checked) => {
                                  const subjects =
                                    checked === true
                                      ? [
                                          ...tier.subjects,
                                          {
                                            subjectId: id,
                                            questions: 25,
                                            qualifying: false,
                                          },
                                        ]
                                      : tier.subjects.filter(
                                          (s) => s.subjectId !== id,
                                        );
                                  updateTier(index, { subjects });
                                }}
                              />
                              {SUBJECTS[id].name}
                            </label>
                            {row && (
                              <>
                                <label className="text-[0.6875rem] text-muted">
                                  Questions
                                  <Input
                                    type="number"
                                    inputMode="numeric"
                                    className="no-spin mt-0.5 block w-24"
                                    min={1}
                                    max={500}
                                    disabled={busy}
                                    value={row.questions}
                                    onChange={(e) =>
                                      updateTier(index, {
                                        subjects: tier.subjects.map((s) =>
                                          s.subjectId === id
                                            ? {
                                                ...s,
                                                questions: Number(e.target.value),
                                              }
                                            : s,
                                        ),
                                      })
                                    }
                                  />
                                </label>
                                <label className="flex items-center gap-1.5 text-[0.6875rem] text-muted">
                                  <Checkbox
                                    checked={row.qualifying}
                                    disabled={busy}
                                    onCheckedChange={(checked) =>
                                      updateTier(index, {
                                        subjects: tier.subjects.map((s) =>
                                          s.subjectId === id
                                            ? {
                                                ...s,
                                                qualifying: checked === true,
                                              }
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
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="text-[0.6875rem] text-muted">
                        Marks per correct
                        <Input
                          type="number"
                          inputMode="decimal"
                          className="no-spin mt-0.5 block w-24"
                          min={0.25}
                          max={100}
                          step="0.25"
                          disabled={busy}
                          value={tier.marking.correct}
                          onChange={(e) =>
                            updateTier(index, {
                              marking: {
                                ...tier.marking,
                                correct: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                      <label className="text-[0.6875rem] text-muted">
                        Penalty per incorrect
                        <Input
                          type="number"
                          inputMode="decimal"
                          className="no-spin mt-0.5 block w-24"
                          min={0}
                          max={100}
                          step="0.05"
                          disabled={busy}
                          value={tier.marking.incorrect}
                          onChange={(e) =>
                            updateTier(index, {
                              marking: {
                                ...tier.marking,
                                incorrect: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                      <p className="text-[0.6875rem] text-muted">
                        Maximum: {meritQuestions * tier.marking.correct} marks
                      </p>
                    </div>
                  </div>
                </fieldset>
              );
            })}

            {draft.tiers.length < 4 && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    tiers: [
                      ...prev.tiers,
                      {
                        label: `Tier ${prev.tiers.length + 1}`,
                        subjects: [
                          {
                            subjectId: "quant",
                            questions: 25,
                            qualifying: false,
                          },
                        ],
                        marking: { correct: 2, incorrect: 0.5 },
                      },
                    ],
                  }))
                }
              >
                <PlainIcon name="plus" size={14} /> Add tier
              </Button>
            )}
            {error && (
              <p role="alert" className="text-[11px] text-danger">
                {error}
              </p>
            )}
            <div className="action-row">
              <Button disabled={busy || !valid} onClick={() => void save()}>
                {busy ? "Saving…" : isNew ? "Create exam" : "Save changes"}
              </Button>
              <Button variant="outline" disabled={busy} onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
