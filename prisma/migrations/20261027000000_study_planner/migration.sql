-- Study planner: per-user progress for the static 50-day plan, plus
-- user-created personal tasks. Plan content itself is never stored here.
-- Table names follow Prisma's default (model name) casing, matching the
-- existing MockAttempt/TrackerSettings/AiUsage tables.

CREATE TABLE "ssc_insight"."PlanTaskProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskKey" VARCHAR(20) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "percentile" DOUBLE PRECISION,
    "wrong" INTEGER,
    "unattempted" INTEGER,
    "rev1" BOOLEAN NOT NULL DEFAULT false,
    "rev2" BOOLEAN NOT NULL DEFAULT false,
    "rev3" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanTaskProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ssc_insight"."PlanDayProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "checklistDone" TEXT[] NOT NULL DEFAULT '{}',
    "revisionDone" TEXT[] NOT NULL DEFAULT '{}',
    "dayNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanDayProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ssc_insight"."PersonalTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "notes" VARCHAR(2000),
    "dueDate" VARCHAR(10),
    "category" VARCHAR(40) NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanTaskProgress_userId_taskKey_key" ON "ssc_insight"."PlanTaskProgress"("userId", "taskKey");
CREATE INDEX "PlanTaskProgress_userId_idx" ON "ssc_insight"."PlanTaskProgress"("userId");

CREATE UNIQUE INDEX "PlanDayProgress_userId_day_key" ON "ssc_insight"."PlanDayProgress"("userId", "day");
CREATE INDEX "PlanDayProgress_userId_idx" ON "ssc_insight"."PlanDayProgress"("userId");

CREATE INDEX "PersonalTask_userId_status_idx" ON "ssc_insight"."PersonalTask"("userId", "status");
CREATE INDEX "PersonalTask_userId_dueDate_idx" ON "ssc_insight"."PersonalTask"("userId", "dueDate");