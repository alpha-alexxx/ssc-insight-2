import type { Prisma } from "@/generated/prisma/client";
import type { AiFeature, AiUsageStatus } from "@/generated/prisma/enums";
import { database } from "../db";
import { aiBusy, aiQuotaExceeded } from "./errors";
import { planReservation, type AiQuotaLimits } from "./quota";
import { dayKey, nextIstMidnight, secondsUntilIstMidnight } from "./tokens";

type ReservationInput = {
  feature: AiFeature;
  model: string;
  reservedTokens: number;
  limits: AiQuotaLimits;
};

function prismaCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? error.code
    : null;
}

async function serializable<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await database().$transaction(work, {
        isolationLevel: "Serializable",
        // A cold Neon connection can take several seconds; the Prisma default
        // 2s maxWait surfaces as P2028 before the AI request even starts.
        maxWait: 10_000,
        timeout: 15_000,
      });
    } catch (error) {
      const code = prismaCode(error);
      if (code === "P2034") {
        if (attempt === 0) continue;
        throw aiBusy();
      }
      // P2028 is a closed/timed-out transaction, not an unreachable database.
      if (code === "P2028") throw aiBusy();
      throw error;
    }
  }
  throw new Error("Serializable transaction did not run");
}

/**
 * Count-and-insert quota gate. Pending, errored, and aborted rows all count
 * until the IST day rolls over, which is the safe behavior after a crash.
 */
export async function reserveAiUsage(userId: string, input: ReservationInput) {
  const day = dayKey();
  const reservedTokens = Math.max(0, Math.floor(input.reservedTokens));
  return serializable(async (tx) => {
    const aggregate = await tx.aiUsage.aggregate({
      where: { userId, day },
      _count: { _all: true },
      _sum: { tokensCharged: true },
    });
    const plan = planReservation(
      {
        requests: aggregate._count._all,
        tokens: aggregate._sum.tokensCharged ?? 0,
      },
      input.limits,
      reservedTokens,
    );
    if (!plan.allowed) throw aiQuotaExceeded(secondsUntilIstMidnight());
    const row = await tx.aiUsage.create({
      data: {
        userId,
        day,
        feature: input.feature,
        model: input.model,
        tokensCharged: reservedTokens,
      },
    });
    return { id: row.id, day, reservedTokens };
  });
}

type Settlement = {
  id: string;
  userId: string;
  status: Exclude<AiUsageStatus, "pending">;
  inputTokens: number;
  outputTokens: number;
  tokensCharged: number;
  providerCalls: number;
  errorCode?: string | null;
  contextVersion?: string | null;
};

/** Idempotent: only a still-pending reservation can be settled. */
export async function settleAiUsage(input: Settlement) {
  const result = await database().aiUsage.updateMany({
    where: { id: input.id, userId: input.userId, status: "pending" },
    data: {
      status: input.status,
      inputTokens: Math.max(0, Math.floor(input.inputTokens)),
      outputTokens: Math.max(0, Math.floor(input.outputTokens)),
      tokensCharged: Math.max(0, Math.floor(input.tokensCharged)),
      providerCalls: Math.min(2, Math.max(0, Math.floor(input.providerCalls))),
      errorCode: input.errorCode?.slice(0, 64) ?? null,
      contextVersion: input.contextVersion?.slice(0, 64) ?? null,
      settledAt: new Date(),
    },
  });
  return result.count > 0;
}

/** Pre-call validation/context failures are not billed. */
export async function releaseAiUsage(
  id: string,
  userId: string,
  errorCode: string,
) {
  return settleAiUsage({
    id,
    userId,
    status: "error",
    inputTokens: 0,
    outputTokens: 0,
    tokensCharged: 0,
    providerCalls: 0,
    errorCode,
  });
}

/** Usage persistence must never replace the user-facing AI response/error. */
export async function settleSafely(input: Settlement) {
  try {
    return await settleAiUsage(input);
  } catch {
    console.error("AI usage settlement failed", {
      code: input.errorCode ?? null,
    });
    return false;
  }
}

export async function releaseSafely(
  id: string,
  userId: string,
  errorCode: string,
) {
  try {
    return await releaseAiUsage(id, userId, errorCode);
  } catch {
    console.error("AI usage release failed", { code: errorCode });
    return false;
  }
}

export async function getAiUsageToday(userId: string, limits: AiQuotaLimits) {
  const day = dayKey();
  const aggregate = await database().aiUsage.aggregate({
    where: { userId, day },
    _count: { _all: true },
    _sum: { tokensCharged: true },
  });
  return {
    day,
    requests: aggregate._count._all,
    tokens: aggregate._sum.tokensCharged ?? 0,
    limits,
    resetAt: nextIstMidnight().toISOString(),
    retryAfterSeconds: secondsUntilIstMidnight(),
  };
}
