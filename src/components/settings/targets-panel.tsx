"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Panel } from "../dashboard-panels";
import { PlainIcon } from "../icon";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import { Progress } from "../ui/progress";
import {
  Tabs,
  TabsCaption,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import { useToast } from "../toast";
import { useExamScope } from "../exam-context";
import {
  examsKeys,
  patchTargetsRequest,
  type EffectiveTargetDto,
  type ExamsResponse,
  type TargetEditInput,
} from "@/lib/queries/exams";
import { formatNumber as n } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { usePanelDraft } from "./settings-guard";

/**
 * Targets — three INDEPENDENT systems, kept visibly distinct:
 *
 *  1. A percentile goal per exam. Never computed, never converted from marks,
 *     never a selection probability.
 *  2. A marks target per tier, which may be inherited from a structure
 *     default (shared only with tiers of the identical paper).
 *  3. Per-tier overrides, which reset back to the inherited default.
 *
 * Every field is the tier's own maximum, delivered by the server with the
 * resolved target — so the editor can never disagree with the chart.
 */
export function TargetsPanel({
  saveTarget,
  busy,
}: {
  saveTarget: () => Promise<boolean>;
  busy: boolean;
}) {
  const scope = useExamScope();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  // Local drafts keyed by tier key / exam id, so a half-typed value survives
  // a re-render and only commits on Save.
  const [tierDrafts, setTierDrafts] = useState<Record<string, string>>({});
  const [defaultDrafts, setDefaultDrafts] = useState<Record<string, string>>({});
  const [percentileDrafts, setPercentileDrafts] = useState<Record<string, string>>(
    {},
  );
  const [tab, setTab] = useState("tiers");

  const dirty =
    Object.keys(tierDrafts).length > 0 ||
    Object.keys(defaultDrafts).length > 0 ||
    Object.keys(percentileDrafts).length > 0;

  const resetDraft = useCallback(() => {
    setTierDrafts({});
    setDefaultDrafts({});
    setPercentileDrafts({});
    setError("");
  }, []);
  usePanelDraft("targets", { isDirty: dirty, reset: resetDraft });

  const exams = scope.exams;
  const enabledTierKeys = useMemo(() => exams?.enabledTiers ?? [], [exams]);

  const commit = async (edits: TargetEditInput[], message: string) => {
    setPending(true);
    setError("");
    try {
      const fresh = await patchTargetsRequest(edits);
      queryClient.setQueryData<ExamsResponse>(examsKeys.current(), fresh);
      // The dashboard draws the target, so its payload is now stale.
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      resetDraft();
      toast.success(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the target");
    } finally {
      setPending(false);
    }
  };

  if (!exams) {
    return (
      <Panel dense icon="target" title="Targets" description="Loading…">
        <div className="px-4 pb-4">
          <div className="h-24 animate-pulse rounded-control bg-soft" />
        </div>
      </Panel>
    );
  }

  const activeExam = exams.builtIn.find((e) => e.id === exams.activeExamId);
  const activeCustom = exams.customExams.find(
    (e) => e.id === exams.activeExamId,
  );

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={setTab}>
        <Panel
          dense
          icon="target"
          title="Targets"
          description="A percentile goal per exam, and a marks target per tier."
        >
          <div className="px-4 pb-4">
            <TabsList aria-label="Target type">
              <TabsTrigger value="tiers">Per tier</TabsTrigger>
              <TabsTrigger value="defaults">Structure defaults</TabsTrigger>
              <TabsTrigger value="percentile">Percentile goal</TabsTrigger>
            </TabsList>

            {/* ---- per-tier marks ---- */}
            <TabsContent value="tiers">
              <TabsCaption>
                Each tier has its own maximum. A tier shows where its number
                came from, and can be reset to the shared default.
              </TabsCaption>
              {enabledTierKeys.length === 0 ? (
                <p className="mt-3 rounded-control bg-soft p-3 text-xs text-muted">
                  No tiers are enabled yet. Enable one under Exams &amp; tiers to
                  set a target.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-rule-soft">
                  {enabledTierKeys.map((key) => {
                    const target = exams.resolvedTargets[key];
                    if (!target) return null;
                    return (
                      <TierTargetRow
                        key={key}
                        tierKey={key}
                        target={target}
                        label={tierLabel(exams, key)}
                        value={
                          tierDrafts[key] ??
                          (target.marks == null ? "" : String(target.marks))
                        }
                        pending={pending || busy}
                        onChange={(value) =>
                          setTierDrafts((prev) => ({ ...prev, [key]: value }))
                        }
                        onSave={(marks) =>
                          void commit(
                            [{ kind: "override", tierKey: key, marks }],
                            "Target saved",
                          )
                        }
                        onInherit={() =>
                          void commit(
                            [{ kind: "inherit", tierKey: key }],
                            "Target reset to the structure default",
                          )
                        }
                      />
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            {/* ---- structure defaults ---- */}
            <TabsContent value="defaults">
              <TabsCaption>
                A default applies to every tier with the identical paper
                (same subjects, counts and marking). It can never cross a
                different maximum.
              </TabsCaption>
              <ul className="mt-3 divide-y divide-rule-soft">
                {Object.entries(exams.targetPeers).map(
                  ([signature, peers]) => (
                    <DefaultRow
                      key={signature}
                      signature={signature}
                      peers={peers}
                      target={targetForSignature(exams, peers)}
                      labelFor={(key) => tierLabel(exams, key)}
                      value={
                        defaultDrafts[signature] ??
                        (targetForSignature(exams, peers)?.marks == null
                          ? ""
                          : String(targetForSignature(exams, peers)!.marks))
                      }
                      pending={pending || busy}
                      onChange={(value) =>
                        setDefaultDrafts((prev) => ({
                          ...prev,
                          [signature]: value,
                        }))
                      }
                      onSave={(marks) =>
                        void commit(
                          [{ kind: "default", signature, marks }],
                          "Default saved",
                        )
                      }
                      onClear={() =>
                        void commit(
                          [{ kind: "default", signature, marks: null }],
                          "Default removed",
                        )
                      }
                    />
                  ),
                )}
              </ul>
            </TabsContent>

            {/* ---- percentile goal ---- */}
            <TabsContent value="percentile">
              <PercentileExplainer />
              <ul className="mt-3 divide-y divide-rule-soft">
                {[
                  ...exams.builtIn.map((e) => ({
                    id: e.id,
                    name: e.name,
                    enabled: exams.enabledTiers.some((k) =>
                      k.startsWith(`${e.id}:`),
                    ),
                  })),
                  ...exams.customExams.map((e) => ({
                    id: e.id,
                    name: e.name,
                    enabled: exams.enabledTiers.some((k) =>
                      k.startsWith(`${e.id}:`),
                    ),
                  })),
                ].map((exam) => (
                  <PercentileRow
                    key={exam.id}
                    examId={exam.id}
                    name={exam.name}
                    enabled={exam.enabled}
                    value={
                      percentileDrafts[exam.id] ??
                      (exams.percentiles[exam.id] == null
                        ? ""
                        : String(exams.percentiles[exam.id]))
                    }
                    pending={pending || busy}
                    onChange={(value) =>
                      setPercentileDrafts((prev) => ({
                        ...prev,
                        [exam.id]: value,
                      }))
                    }
                    onSave={(percentile) =>
                      void commit(
                        [{ kind: "percentile", examId: exam.id, percentile }],
                        "Percentile goal saved",
                      )
                    }
                  />
                ))}
              </ul>
            </TabsContent>

            {error && (
              <p role="alert" className="mt-3 text-[11px] text-danger">
                {error}
              </p>
            )}
          </div>
        </Panel>
      </Tabs>

      {/* The quick single-field editor the dashboard's target action uses.
          Kept so the header/dashboard "Set target" affordance still exists. */}
      <ActiveTargetCard
        examName={activeExam?.name ?? activeCustom?.name ?? "this exam"}
        target={scope.activeTarget}
        onSave={saveTarget}
        busy={busy}
      />
    </div>
  );
}

function tierLabel(exams: ExamsResponse, key: string): string {
  const sep = key.indexOf(":");
  const examId = key.slice(0, sep);
  const tierId = key.slice(sep + 1);
  const name =
    exams.builtIn.find((e) => e.id === examId)?.name ??
    exams.customExams.find((e) => e.id === examId)?.name ??
    examId;
  const label =
    exams.builtIn
      .find((e) => e.id === examId)
      ?.tiers.find((t) => t.id === tierId)?.label ??
    exams.customExams
      .find((e) => e.id === examId)
      ?.tiers.find((t) => t.id === tierId)?.label ??
    tierId;
  return `${name} · ${label}`;
}

/** The shared structure a set of peer tiers describes. */
function targetForSignature(
  exams: ExamsResponse,
  peers: string[],
): EffectiveTargetDto | null {
  return peers.map((key) => exams.resolvedTargets[key]).find(Boolean) ?? null;
}

function sourceLabel(target: EffectiveTargetDto): string {
  if (target.source === "override") return "Your target";
  if (target.source === "tier-default") return "Inherited default";
  return "No target";
}

function TierTargetRow({
  target,
  label,
  value,
  pending,
  onChange,
  onSave,
  onInherit,
}: {
  tierKey: string;
  target: EffectiveTargetDto;
  label: string;
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
  onSave: (marks: number | null) => void;
  onInherit: () => void;
}) {
  const numeric = value.trim() === "" ? null : Number(value);
  const valid =
    value.trim() === "" ||
    (Number.isFinite(numeric) && numeric != null && numeric >= 0 && numeric <= target.maxScore);
  return (
    <li className="py-3 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-[0.6875rem] text-muted">
          <span
            className={cn(
              target.source === "override" && "text-ink",
              target.source === "none" && "text-muted",
            )}
          >
            {sourceLabel(target)}
          </span>
          {" · out of "}
          {target.maxScore}
        </p>
      </div>
      {target.outOfRange && (
        <p className="mt-1 text-[0.6875rem] leading-relaxed text-warning">
          Your saved {n(target.marks)} is above this paper&apos;s current
          maximum of {target.maxScore}. The paper changed after you set it —
          adjust it or reset to the default.
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-[0.6875rem] text-muted">
          Target marks
          <Input
            type="number"
            inputMode="decimal"
            className="no-spin mt-0.5 block w-32"
            min={0}
            max={target.maxScore}
            step="0.01"
            placeholder={`up to ${target.maxScore}`}
            value={value}
            disabled={pending}
            aria-invalid={!valid || undefined}
            aria-label={`Target marks for ${label}`}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          disabled={pending || !valid}
          onClick={() => onSave(numeric)}
        >
          Save
        </Button>
        {target.source !== "none" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9"
            disabled={pending}
            onClick={onInherit}
            title="Remove this tier's own target and use the structure default"
          >
            <PlainIcon name="refresh" size={13} /> Use default
          </Button>
        )}
        {!valid && (
          <p role="alert" className="text-[0.6875rem] text-danger">
            Enter 0–{target.maxScore}.
          </p>
        )}
      </div>
      {target.marks != null && target.maxScore > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <Progress
            value={(target.marks / target.maxScore) * 100}
            label={`${label} target`}
            className="max-w-56"
          />
          <span className="text-[0.6875rem] tabular text-muted">
            {n((target.marks / target.maxScore) * 100)}% of the paper
          </span>
        </div>
      )}
    </li>
  );
}

function DefaultRow({
  signature,
  peers,
  target,
  labelFor,
  value,
  pending,
  onChange,
  onSave,
  onClear,
}: {
  signature: string;
  peers: string[];
  target: EffectiveTargetDto | null;
  labelFor: (key: string) => string;
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
  onSave: (marks: number | null) => void;
  onClear: () => void;
}) {
  const maxScore = target?.maxScore ?? 0;
  const numeric = value.trim() === "" ? null : Number(value);
  const valid =
    value.trim() === "" ||
    (Number.isFinite(numeric) && numeric != null && numeric >= 0 && numeric <= maxScore);
  return (
    <li className="py-3 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-ink">
          {describeSignature(signature)}
        </p>
        <p className="text-[0.6875rem] text-muted">
          Applies to {peers.length} tier{peers.length === 1 ? "" : "s"} · out of{" "}
          {maxScore}
        </p>
      </div>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
        {peers.map((key) => (
          <li key={key}>{labelFor(key)}</li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-[0.6875rem] text-muted">
          Default target marks
          <Input
            type="number"
            inputMode="decimal"
            className="no-spin mt-0.5 block w-32"
            min={0}
            max={maxScore}
            step="0.01"
            placeholder={`up to ${maxScore}`}
            value={value}
            disabled={pending}
            aria-invalid={!valid || undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          disabled={pending || !valid}
          onClick={() => onSave(numeric)}
        >
          Save default
        </Button>
        {target?.source === "tier-default" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9"
            disabled={pending}
            onClick={onClear}
          >
            Remove default
          </Button>
        )}
        {!valid && (
          <p role="alert" className="text-[0.6875rem] text-danger">
            Enter 0–{maxScore}.
          </p>
        )}
      </div>
    </li>
  );
}

/** "4 parts · 25 Q each · +2/−0.5" from the signature's own encoding. */
function describeSignature(signature: string): string {
  const merit = signature.match(/m:([^|]*)/)?.[1] ?? "";
  const marking = signature.match(/mk:([^|]*)/)?.[1] ?? "";
  const parts = merit ? merit.split(",").length : 0;
  const questions = merit
    ? merit
        .split(",")
        .reduce(
          (sum, entry) => sum + Number(entry.replace(/^[a-z]+/, "") || 0),
          0,
        )
    : 0;
  const [correct, incorrect] = marking.split("/");
  return `${parts} parts · ${questions} Q · +${correct}/${incorrect === "0" ? "no negative" : `−${incorrect}`}`;
}

function PercentileRow({
  name,
  enabled,
  value,
  pending,
  onChange,
  onSave,
}: {
  examId: string;
  name: string;
  enabled: boolean;
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
  onSave: (percentile: number | null) => void;
}) {
  const numeric = value.trim() === "" ? null : Number(value);
  const valid =
    value.trim() === "" ||
    (Number.isFinite(numeric) && numeric != null && numeric >= 0 && numeric <= 100);
  return (
    <li className="py-3 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-ink">
          {name}
          {!enabled && (
            <span className="ml-2 text-[0.625rem] uppercase tracking-wide text-muted">
              not enabled
            </span>
          )}
        </p>
        <p className="text-[0.6875rem] text-muted">Goal percentile</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Slider
          value={[Math.min(100, Math.max(0, numeric ?? 0))]}
          min={0}
          max={100}
          step={1}
          disabled={pending}
          aria-label={`${name} goal percentile`}
          onValueChange={([next]) => onChange(String(next))}
          className="max-w-56"
        />
        <Input
          type="number"
          inputMode="numeric"
          className="no-spin block w-20"
          min={0}
          max={100}
          step="1"
          placeholder="e.g. 95"
          value={value}
          disabled={pending}
          aria-invalid={!valid || undefined}
          aria-label={`${name} goal percentile value`}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !valid}
          onClick={() => onSave(numeric)}
        >
          Save
        </Button>
        {!valid && (
          <p role="alert" className="text-[0.6875rem] text-danger">
            Enter 0–100.
          </p>
        )}
      </div>
    </li>
  );
}

function PercentileExplainer() {
  return (
    <div className="mt-3 rounded-control border border-rule-soft bg-canvas p-3">
      <p className="text-[0.6875rem] font-medium text-ink">
        A percentile goal is not any of these
      </p>
      <ul className="mt-1 grid gap-0.5 text-[0.6875rem] leading-relaxed text-muted sm:grid-cols-2">
        <li>Not a percentage of a paper.</li>
        <li>Not a raw-marks equivalent.</li>
        <li>Not a normalized score.</li>
        <li>Not an official cutoff or a chance of selection.</li>
      </ul>
      <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-muted">
        The app never estimates a percentile for you — it only records what a
        platform or result sheet reported.
      </p>
    </div>
  );
}

/** The single target the dashboard's action writes, for the active tier. */
function ActiveTargetCard({
  examName,
  target,
  onSave,
  busy,
}: {
  examName: string;
  target: EffectiveTargetDto | null;
  onSave: () => Promise<boolean>;
  busy: boolean;
}) {
  const [saving, setSaving] = useState(false);
  if (!target) return null;
  const percent =
    target.marks == null || target.maxScore === 0
      ? null
      : (target.marks / target.maxScore) * 100;
  return (
    <Panel
      dense
      icon="award"
      title="Today's reference"
      description={`${examName} · ${target.source === "none" ? "no target set" : sourceLabel(target)}`}
    >
      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-serif text-[1.75rem] leading-none tabular">
            {target.marks == null ? "—" : n(target.marks)}
          </span>
          <span className="text-xs text-muted">/ {target.maxScore}</span>
          {percent != null && (
            <span className="text-xs tabular text-muted">
              · {n(percent)}% of the paper
            </span>
          )}
        </div>
        <p className="mt-1 text-[0.6875rem] text-muted">
          The dashboard draws this as a reference line on the charts for this tier.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          disabled={busy || saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave();
            } finally {
              setSaving(false);
            }
          }}
        >
          <PlainIcon name="target" size={13} /> Set from dashboard value
        </Button>
      </div>
    </Panel>
  );
}

export { PercentileExplainer, targetForSignature, tierLabel };
