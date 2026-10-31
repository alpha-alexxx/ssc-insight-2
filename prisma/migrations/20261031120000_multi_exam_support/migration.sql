-- Multi-exam support: exam/tier identity on attempts, pattern snapshots,
-- custom exams, and per-exam workspace settings. Every existing attempt
-- backfills to SSC CGL Tier 2, which is exactly the pre-migration behavior.

-- MockAttempt: exam identity + marking snapshot of the tier pattern.
ALTER TABLE "ssc_insight"."MockAttempt" ADD COLUMN "examId" VARCHAR(40) NOT NULL DEFAULT 'cgl',
    ADD COLUMN "tierId" VARCHAR(40) NOT NULL DEFAULT 'tier2',
    ADD COLUMN "markingCorrect" DOUBLE PRECISION NOT NULL DEFAULT 3,
    ADD COLUMN "markingIncorrect" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- schemaVersion 2 = records carrying exam/tier/marking; 1 = pre-migration rows.
ALTER TABLE "ssc_insight"."MockAttempt" DROP CONSTRAINT "MockAttempt_schemaVersion_check";
ALTER TABLE "ssc_insight"."MockAttempt" ADD CONSTRAINT "MockAttempt_schemaVersion_check" CHECK ("schemaVersion" = ANY (ARRAY[1, 2]));

-- The old bound assumed one marking scheme; pattern-specific bounds now live
-- in zod (attemptSchemaFor). Keep only a generous sanity bound.
ALTER TABLE "ssc_insight"."MockAttempt" DROP CONSTRAINT "MockAttempt_score_check";
ALTER TABLE "ssc_insight"."MockAttempt" ADD CONSTRAINT "MockAttempt_score_check" CHECK ("scoreOverride" IS NULL OR "scoreOverride" BETWEEN -100000 AND 100000);

CREATE INDEX "MockAttempt_userId_examId_completedAt_idx" ON "ssc_insight"."MockAttempt"("userId", "examId", "completedAt");

-- SubjectResult: qualifying flag (excluded from a full mock's merit total).
-- The old +3/−1 score bound moves to app validation.
ALTER TABLE "ssc_insight"."SubjectResult" ADD COLUMN "qualifying" BOOLEAN NOT NULL DEFAULT false;
UPDATE "ssc_insight"."SubjectResult" SET "qualifying" = true WHERE "subjectId" = 'computer';
ALTER TABLE "ssc_insight"."SubjectResult" DROP CONSTRAINT IF EXISTS "SubjectResult_score_check";

-- TrackerSettings: per-exam scope. The single target score moves into the
-- per-exam map (under CGL, the only exam that existed) before the column goes.
ALTER TABLE "ssc_insight"."TrackerSettings" ADD COLUMN "activeExamId" VARCHAR(40) NOT NULL DEFAULT 'cgl',
    ADD COLUMN "enabledExams" JSONB NOT NULL DEFAULT '["cgl"]',
    ADD COLUMN "examTargets" JSONB NOT NULL DEFAULT '{}';
UPDATE "ssc_insight"."TrackerSettings" SET "examTargets" = jsonb_build_object('cgl', "targetScore") WHERE "targetScore" IS NOT NULL;
ALTER TABLE "ssc_insight"."TrackerSettings" DROP CONSTRAINT IF EXISTS "TrackerSettings_target_check";
ALTER TABLE "ssc_insight"."TrackerSettings" DROP COLUMN "targetScore";

-- CustomExam: user-defined exam patterns (one implicit "main" tier).
CREATE TABLE "ssc_insight"."CustomExam" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "subjects" JSONB NOT NULL,
    "marking" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomExam_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomExam_userId_idx" ON "ssc_insight"."CustomExam"("userId");

-- Reconcile pre-existing drift: dayNotes was created as Text, the schema
-- says VarChar(2000).
ALTER TABLE "ssc_insight"."PlanDayProgress" ALTER COLUMN "dayNotes" SET DATA TYPE VARCHAR(2000);
