"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { TodoAiComposer } from "./ai-composer";

/**
 * The page-level "Plan with AI" host: a right-side sheet (the app's AI
 * surface idiom) holding the shared review-before-apply composer.
 */
export function AiPlanSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="ai-workspace-sheet flex w-full flex-col gap-0 sm:max-w-[520px]"
      >
        <SheetHeader className="pr-12">
          <SheetTitle>Plan with AI</SheetTitle>
          <SheetDescription>
            Draft tasks from a description, review every change, then apply.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-5 sm:py-5">
          <TodoAiComposer compact />
        </div>
      </SheetContent>
    </Sheet>
  );
}
