BEGIN;

-- AI quota and audit ledger. Additive only: no existing table is altered.
-- Ownership is the opaque Neon Auth user id; there is deliberately no foreign
-- key into neon_auth.
CREATE TYPE "ssc_insight"."AiFeature" AS ENUM ('coach', 'chat', 'extract');
CREATE TYPE "ssc_insight"."AiUsageStatus" AS ENUM ('pending', 'success', 'error', 'aborted');

CREATE TABLE "ssc_insight"."AiUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "day" VARCHAR(10) NOT NULL,
  "feature" "ssc_insight"."AiFeature" NOT NULL,
  "model" VARCHAR(120) NOT NULL,
  "status" "ssc_insight"."AiUsageStatus" NOT NULL DEFAULT 'pending',
  "providerCalls" INTEGER NOT NULL DEFAULT 0,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "tokensCharged" INTEGER NOT NULL,
  "contextVersion" VARCHAR(64),
  "errorCode" VARCHAR(64),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMPTZ(3),

  CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiUsage_userId_check" CHECK (length(btrim("userId")) > 0),
  CONSTRAINT "AiUsage_day_check" CHECK ("day" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  CONSTRAINT "AiUsage_tokens_check" CHECK (
    "inputTokens" >= 0 AND
    "outputTokens" >= 0 AND
    "tokensCharged" >= 0
  ),
  CONSTRAINT "AiUsage_calls_check" CHECK ("providerCalls" BETWEEN 0 AND 2)
);

CREATE INDEX "AiUsage_userId_day_idx"
  ON "ssc_insight"."AiUsage"("userId", "day");
CREATE INDEX "AiUsage_userId_status_createdAt_idx"
  ON "ssc_insight"."AiUsage"("userId", "status", "createdAt");

COMMIT;
