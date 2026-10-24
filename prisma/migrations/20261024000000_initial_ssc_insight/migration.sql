-- Only app-owned objects are created. Neon Auth and existing schemas stay intact.
CREATE SCHEMA IF NOT EXISTS "ssc_insight";

CREATE TYPE "ssc_insight"."MockType" AS ENUM ('full', 'subject', 'sectional');
CREATE TYPE "ssc_insight"."SubjectId" AS ENUM ('quant', 'reasoning', 'english', 'ga', 'computer');
CREATE TYPE "ssc_insight"."ImportSource" AS ENUM ('manual', 'paste', 'backup');

CREATE TABLE "ssc_insight"."MockAttempt" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "platform" VARCHAR(80) NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL,
    "type" "ssc_insight"."MockType" NOT NULL,
    "scoreOverride" DOUBLE PRECISION,
    "overallTimeSeconds" INTEGER,
    "rank" INTEGER,
    "participants" INTEGER,
    "percentile" DOUBLE PRECISION,
    "notes" VARCHAR(5000) NOT NULL DEFAULT '',
    "source" "ssc_insight"."ImportSource" NOT NULL DEFAULT 'manual',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "MockAttempt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MockAttempt_name_check" CHECK (length(btrim("name")) > 0),
    CONSTRAINT "MockAttempt_platform_check" CHECK (length(btrim("platform")) > 0),
    CONSTRAINT "MockAttempt_schemaVersion_check" CHECK ("schemaVersion" = 1),
    CONSTRAINT "MockAttempt_time_check" CHECK ("overallTimeSeconds" IS NULL OR "overallTimeSeconds" BETWEEN 0 AND 86400),
    CONSTRAINT "MockAttempt_rank_check" CHECK ("rank" IS NULL OR "rank" >= 1),
    CONSTRAINT "MockAttempt_participants_check" CHECK ("participants" IS NULL OR "participants" >= 1),
    CONSTRAINT "MockAttempt_rank_participants_check" CHECK ("rank" IS NULL OR "participants" IS NULL OR "rank" <= "participants"),
    CONSTRAINT "MockAttempt_percentile_check" CHECK ("percentile" IS NULL OR "percentile" BETWEEN 0 AND 100),
    CONSTRAINT "MockAttempt_score_check" CHECK ("scoreOverride" IS NULL OR "scoreOverride" BETWEEN -2500 AND 7500)
);

CREATE TABLE "ssc_insight"."SubjectResult" (
    "attemptId" TEXT NOT NULL,
    "subjectId" "ssc_insight"."SubjectId" NOT NULL,
    "position" INTEGER NOT NULL,
    "questions" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "incorrect" INTEGER NOT NULL,
    "scoreOverride" DOUBLE PRECISION,
    "timeSeconds" INTEGER,
    CONSTRAINT "SubjectResult_pkey" PRIMARY KEY ("attemptId", "subjectId"),
    CONSTRAINT "SubjectResult_position_check" CHECK ("position" BETWEEN 0 AND 4),
    CONSTRAINT "SubjectResult_questions_check" CHECK ("questions" BETWEEN 1 AND 500),
    CONSTRAINT "SubjectResult_counts_check" CHECK ("correct" >= 0 AND "incorrect" >= 0 AND "correct" + "incorrect" <= "questions"),
    CONSTRAINT "SubjectResult_score_check" CHECK ("scoreOverride" IS NULL OR "scoreOverride" BETWEEN -"questions" AND "questions" * 3),
    CONSTRAINT "SubjectResult_time_check" CHECK ("timeSeconds" IS NULL OR "timeSeconds" BETWEEN 0 AND 86400)
);

CREATE TABLE "ssc_insight"."TrackerSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "targetScore" DOUBLE PRECISION,
    CONSTRAINT "TrackerSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TrackerSettings_singleton_check" CHECK ("id" = 'default'),
    CONSTRAINT "TrackerSettings_target_check" CHECK ("targetScore" IS NULL OR "targetScore" BETWEEN 0 AND 390)
);

CREATE INDEX "MockAttempt_completedAt_idx" ON "ssc_insight"."MockAttempt"("completedAt");
CREATE INDEX "MockAttempt_platform_completedAt_idx" ON "ssc_insight"."MockAttempt"("platform", "completedAt");
CREATE INDEX "MockAttempt_type_completedAt_idx" ON "ssc_insight"."MockAttempt"("type", "completedAt");
CREATE UNIQUE INDEX "SubjectResult_attemptId_position_key" ON "ssc_insight"."SubjectResult"("attemptId", "position");
CREATE INDEX "SubjectResult_subjectId_attemptId_idx" ON "ssc_insight"."SubjectResult"("subjectId", "attemptId");
ALTER TABLE "ssc_insight"."SubjectResult" ADD CONSTRAINT "SubjectResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ssc_insight"."MockAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
