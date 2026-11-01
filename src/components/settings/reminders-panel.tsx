"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Panel } from "../dashboard-panels";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch, SwitchRow } from "../ui/switch";
import { useToast } from "../toast";
import { useExamScope } from "../exam-context";
import {
  examsKeys,
  putScopeRequest,
  type ExamsResponse,
  type PreferencesDto,
} from "@/lib/queries/exams";
import { usePanelDraft } from "./settings-guard";

/**
 * Reminders — IN-APP ONLY.
 *
 * This app has no service worker, no push subscription, no email and no
 * background job, so it cannot deliver a notification while it is closed.
 * Saying so plainly is more useful than a toggle that looks like a reminder
 * and silently never fires. Each switch below drives an on-screen signal:
 * overdue emphasis in the shell, a mock-due note on the plan surfaces, and a
 * gap-to-target note on performance views. Quiet hours suppress transient
 * toasts while you are still working.
 */

export function RemindersPanel() {
  const scope = useExamScope();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<PreferencesDto | null>(null);

  const saved = scope.exams?.preferences;
  const current = draft ?? saved;

  const dirty = useMemo(() => {
    if (!draft || !saved) return false;
    return (
      draft.overdueEmphasis !== saved.overdueEmphasis ||
      draft.mockDueToday !== saved.mockDueToday ||
      draft.targetGap !== saved.targetGap ||
      draft.quietHours.enabled !== saved.quietHours.enabled ||
      draft.quietHours.start !== saved.quietHours.start ||
      draft.quietHours.end !== saved.quietHours.end
    );
  }, [draft, saved]);

  const resetDraft = useCallback(() => setDraft(null), []);
  usePanelDraft("reminders", { isDirty: dirty, reset: resetDraft });

  if (!scope.exams || !current) {
    return (
      <Panel dense icon="bell" title="Reminders" description="Loading…">
        <div className="px-4 pb-4">
          <div className="h-32 animate-pulse rounded-control bg-soft" />
        </div>
      </Panel>
    );
  }

  const patch = (value: Partial<PreferencesDto>) => {
    setDraft((prev) => {
      const base = prev ?? scope.exams!.preferences;
      return { ...base, ...value };
    });
  };

  const save = async () => {
    if (!draft) return;
    setPending(true);
    setError("");
    try {
      const fresh = await putScopeRequest({
        activeExamId: scope.exams!.activeExamId,
        activeTierId: scope.exams!.activeTierId,
        enabledTiers: scope.exams!.enabledTiers,
        preferences: draft,
      });
      queryClient.setQueryData<ExamsResponse>(examsKeys.current(), fresh);
      setDraft(null);
      toast.success("Reminder preferences saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save preferences");
    } finally {
      setPending(false);
    }
  };

  return (
    <Panel
      dense
      icon="bell"
      title="Reminders"
      description="What the workspace surfaces while you are working in it."
    >
      <div className="px-4 pb-4">
        <div className="rounded-control border border-rule-soft bg-canvas p-3">
          <p className="text-[0.6875rem] font-medium text-ink">
            These are in-app signals, not notifications.
          </p>
          <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted">
            SSC Insight runs entirely in your browser session. It cannot send a
            push notification, an email, or a reminder while it is closed —
            there is no background delivery of any kind. Everything below
            changes what you see on screen while the app is open.
          </p>
        </div>

        <div className="mt-2">
          <SwitchRow
            title="Emphasise overdue tasks"
            description="Marks overdue personal tasks in warning ink in the shell, the dashboard and the plan day."
            control={
              <Switch
                checked={current.overdueEmphasis}
                disabled={pending}
                label="Emphasise overdue tasks"
                onCheckedChange={(checked) =>
                  patch({ overdueEmphasis: checked })
                }
              />
            }
          />
          <SwitchRow
            title="Show a mock scheduled today"
            description="A quiet note on the plan surfaces naming the mock the schedule expects today."
            control={
              <Switch
                checked={current.mockDueToday}
                disabled={pending}
                label="Show a mock scheduled today"
                onCheckedChange={(checked) => patch({ mockDueToday: checked })}
              />
            }
          />
          <SwitchRow
            title="Keep the gap to target visible"
            description="A one-line gap between your latest result and the target on performance views."
            control={
              <Switch
                checked={current.targetGap}
                disabled={pending}
                label="Keep the gap to target visible"
                onCheckedChange={(checked) => patch({ targetGap: checked })}
              />
            }
          />
          <SwitchRow
            title="Quiet hours"
            description="Suppress transient toasts during a window, so a late session is not interrupted by confirmations."
            control={
              <Switch
                checked={current.quietHours.enabled}
                disabled={pending}
                label="Quiet hours"
                onCheckedChange={(checked) =>
                  patch({
                    quietHours: { ...current.quietHours, enabled: checked },
                  })
                }
              />
            }
          />
        </div>

        {current.quietHours.enabled && (
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <label className="text-[0.6875rem] text-muted">
              From
              <Input
                type="time"
                className="mt-0.5 block w-28"
                value={current.quietHours.start}
                disabled={pending}
                onChange={(e) =>
                  patch({
                    quietHours: {
                      ...current.quietHours,
                      start: e.target.value,
                    },
                  })
                }
              />
            </label>
            <label className="text-[0.6875rem] text-muted">
              Until
              <Input
                type="time"
                className="mt-0.5 block w-28"
                value={current.quietHours.end}
                disabled={pending}
                onChange={(e) =>
                  patch({
                    quietHours: { ...current.quietHours, end: e.target.value },
                  })
                }
              />
            </label>
            <p className="text-[0.6875rem] text-muted">
              All times are India Standard Time.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-[11px] text-danger">
            {error}
          </p>
        )}

        <div className="action-row mt-4">
          <Button disabled={!dirty || pending} onClick={() => void save()}>
            {pending ? "Saving…" : "Save preferences"}
          </Button>
          {dirty && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setDraft(null)}
            >
              Discard
            </Button>
          )}
          <span role="status" className="text-[0.6875rem] text-muted">
            {dirty ? "Unsaved changes" : ""}
          </span>
        </div>
      </div>
    </Panel>
  );
}
