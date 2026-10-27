CREATE TABLE "ssc_insight"."TodoGroup" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "name" VARCHAR(80) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "TodoGroup_userId_name_key" ON "ssc_insight"."TodoGroup"("userId","name");
ALTER TABLE "ssc_insight"."PersonalTask" ADD COLUMN "groupId" TEXT, ADD COLUMN "subtasks" JSONB NOT NULL DEFAULT '[]', ADD COLUMN "deletedAt" TIMESTAMPTZ(3), ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ssc_insight"."PersonalTask" ADD CONSTRAINT "PersonalTask_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ssc_insight"."TodoGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "ssc_insight"."TodoMutation" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL,"key" VARCHAR(100) NOT NULL,"payloadHash" TEXT NOT NULL,"result" JSONB NOT NULL,"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "TodoMutation_userId_key_key" ON "ssc_insight"."TodoMutation"("userId","key");
CREATE INDEX "PersonalTask_userId_deletedAt_dueDate_idx" ON "ssc_insight"."PersonalTask"("userId","deletedAt","dueDate");

ALTER TYPE "ssc_insight"."AiFeature" ADD VALUE 'todos';
