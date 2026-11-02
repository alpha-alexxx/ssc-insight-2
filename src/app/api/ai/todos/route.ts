import { defineRoute } from "@/lib/route-handler";
import { readBody } from "@/lib/api";
import { database } from "@/lib/db";
import { normalizeSubtasks } from "@/lib/todos-core";
import { resolveAiConfig } from "@/lib/ai/resolve";
import { createAiProvider } from "@/lib/ai/provider";
import { aiNotConfigured, AiError, aiProviderError } from "@/lib/ai/errors";
import { aiLimits, loadAiContext } from "@/lib/ai/server";
import { reservationTokens } from "@/lib/ai/quota";
import { reserveAiUsage, settleSafely } from "@/lib/ai/usage";
import { getPlanDays } from "@/lib/plan/plan";
import { dayKey } from "@/lib/ai/tokens";
import {
  parseTodoProposals,
  todoDraftMessages,
  todoDraftRequestSchema,
  TODO_DATE_QUESTION,
} from "@/lib/ai/todos";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = defineRoute(
  { kind: "write" },
  async ({ request, user }) => {
    // The prompt may be 20k characters; allow for multi-byte UTF-8 and the
    // small date fields rather than rejecting a long instruction at the door.
    const input = todoDraftRequestSchema.parse(
      await readBody(request, 128 * 1024),
    );
    // Asking for dates is free and never resolves an AI provider or writes data.
    if (!input.date)
      return {
        data: {
          needsDates: true,
          question: TODO_DATE_QUESTION,
          operations: [],
        },
      };
    const resolved = await resolveAiConfig(user.id);
    if (!resolved) throw aiNotConfigured();
    const db = database();
    const [rows, groups, performance] = await Promise.all([
      db.personalTask.findMany({
        where: { userId: user.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 101,
      }),
      db.todoGroup.findMany({
        where: { userId: user.id, deletedAt: null },
        select: { id: true, name: true },
        take: 100,
      }),
      loadAiContext(user.id),
    ]);
    // Explicit fields only: no account IDs, credentials, bookkeeping, or trash.
    const todos = rows.slice(0, 100).map((row) => ({
      id: row.id,
      version: row.version,
      title: row.title,
      dueDate: row.dueDate,
      notes: (row.notes ?? "").slice(0, 500),
      priority: row.priority,
      groupId: row.groupId,
      status: row.status,
      subtasks: normalizeSubtasks(row.subtasks).slice(0, 20),
    }));
    // Bound aggregate context without cutting JSON strings or hiding included targets.
    while (JSON.stringify(todos).length > 25000) todos.pop();
    const end = input.endDate ?? input.date;
    const plan = getPlanDays()
      .filter((day) => day.date >= input.date! && day.date <= end)
      .slice(0, 14);
    const messages = todoDraftMessages(
      input.prompt,
      input.date,
      input.endDate,
      dayKey(),
      { todos, groups, performance, studyPlan: plan },
    );
    const maxOutputTokens = Math.min(
      6000,
      Math.max(2400, resolved.config.maxOutputTokens),
    );
    const reservation = await reserveAiUsage(user.id, {
      feature: "todos",
      model: resolved.config.model,
      limits: aiLimits(resolved.config),
      reservedTokens: reservationTokens({
        promptText: messages.map((m) => m.content).join("\n"),
        maxOutputTokens,
        providerCalls: 2,
      }),
    });
    let result;
    try {
      result = await createAiProvider(resolved.config).completeJson({
        messages,
        maxOutputTokens,
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]),
        parse: (raw) =>
          parseTodoProposals(
            raw,
            todos,
            groups.map((group) => group.id),
            { start: input.date!, end },
          ),
      });
    } catch (error) {
      const code = error instanceof AiError ? error.code : "AI_PROVIDER_ERROR";
      await settleSafely({
        id: reservation.id,
        userId: user.id,
        status: code === "AI_ABORTED" ? "aborted" : "error",
        inputTokens: 0,
        outputTokens: 0,
        tokensCharged: reservation.reservedTokens,
        providerCalls: 2,
        errorCode: code,
      });
      if (error instanceof AiError) throw error;
      throw aiProviderError();
    }
    await settleSafely({
      id: reservation.id,
      userId: user.id,
      status: "success",
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      tokensCharged: result.usage.totalTokens,
      providerCalls: result.providerCalls,
    });
    const ids = new Set(
      result.value.operations.flatMap((operation) =>
        operation.type === "create" ? [] : [operation.id],
      ),
    );
    return {
      data: {
        needsDates: false,
        operations: result.value.operations,
        before: Object.fromEntries(
          rows
            .filter((todo) => ids.has(todo.id))
            .map((todo) => [
              todo.id,
              {
                id: todo.id,
                version: todo.version,
                title: todo.title,
                dueDate: todo.dueDate,
                notes: todo.notes ?? "",
                priority: todo.priority,
                groupId: todo.groupId,
                status: todo.status,
                subtasks: normalizeSubtasks(todo.subtasks),
              },
            ]),
        ),
        contextTruncated: rows.length > todos.length,
        usage: { ...result.usage, providerCalls: result.providerCalls },
      },
    };
  },
);
