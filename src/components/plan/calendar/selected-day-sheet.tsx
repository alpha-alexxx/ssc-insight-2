"use client";
import type { ComponentProps } from "react";
import { Sheet, SheetContent, SheetTitle } from "../../ui/sheet";
import { SelectedDayPanel } from "./selected-day-panel";
import { longDate } from "@/lib/format";

/**
 * The selected-day panel as a bottom sheet on phones: tapping a day in the
 * month or week grid slides the schedule up over the grid instead of leaving
 * it below the fold. The body is the exact rail component the desktop aside
 * uses, so both surfaces stay one implementation — the sheet only adds the
 * handle, the scroll region and the safe-area padding. Tablets and desktop
 * keep the stacked/sticky aside and never mount this.
 */
export function SelectedDaySheet({
  open,
  onOpenChange,
  ...panel
}: ComponentProps<typeof SelectedDayPanel> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 pb-[max(6px,env(safe-area-inset-bottom))] shadow-none"
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-1 h-1 w-10 shrink-0 rounded-pill bg-rule-soft"
        />
        <SheetTitle className="sr-only">
          {panel.day ? `Schedule for ${longDate(panel.day.date)}` : "Selected day"}
        </SheetTitle>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SelectedDayPanel {...panel} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
