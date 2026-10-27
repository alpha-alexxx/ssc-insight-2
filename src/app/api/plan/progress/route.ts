import { z } from "zod";
import { readBody } from "@/lib/api";
import { defineRoute } from "@/lib/route-handler";
import {
  setChecklistItem,
  setDayNotes,
  setDayRevision,
  updateTaskProgress,
  TASK_PATCH,
} from "@/lib/plan/progress";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const mutationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("task"), key: z.string(), patch: TASK_PATCH }),
  z.object({
    kind: z.literal("checklist"),
    day: z.number().int().min(1).max(50),
    itemId: z.string().min(1).max(40),
    done: z.boolean(),
  }),
  z.object({
    kind: z.literal("revision"),
    day: z.number().int().min(1).max(50),
    revisionIndex: z.number().int().min(0).max(20),
    done: z.boolean(),
  }),
  z.object({
    kind: z.literal("day-notes"),
    day: z.number().int().min(1).max(50),
    notes: z.string().max(2000),
  }),
]);

export const POST = defineRoute(
  {
    kind: "write",
    onError: (error, userId) => {
      audit("plan.progress", userId, { outcome: "error" });
    },
  },
  async ({ request, user }) => {
    const input = mutationSchema.parse(await readBody(request));
    switch (input.kind) {
      case "task":
        return {
          data: await updateTaskProgress(user.id, input.key, input.patch),
        };
      case "checklist":
        return {
          data: await setChecklistItem(
            user.id,
            input.day,
            input.itemId,
            input.done,
          ),
        };
      case "revision":
        return {
          data: await setDayRevision(
            user.id,
            input.day,
            input.revisionIndex,
            input.done,
          ),
        };
      case "day-notes":
        return {
          data: await setDayNotes(user.id, input.day, input.notes),
        };
    }
  },
);
