-- Centralized Trash: soft-delete columns for every recoverable entity.
-- PersonalTask already carries "deletedAt" (20261029000000_personal_todos).
--
-- Expiry is derived (deletedAt + 15 days), never stored: one constant owns the
-- policy and the two values can never disagree.
--
-- The backfill restarts the clock for task rows that were deleted under the
-- old "kept forever" behavior. Without it the first cleanup run would purge
-- rows the user could still recover and had no warning about.

ALTER TABLE "ssc_insight"."MockAttempt" ADD COLUMN "deletedAt" TIMESTAMPTZ(3);
ALTER TABLE "ssc_insight"."CustomExam" ADD COLUMN "deletedAt" TIMESTAMPTZ(3);
ALTER TABLE "ssc_insight"."TodoGroup" ADD COLUMN "deletedAt" TIMESTAMPTZ(3);

CREATE INDEX "MockAttempt_userId_deletedAt_idx" ON "ssc_insight"."MockAttempt"("userId", "deletedAt");
CREATE INDEX "CustomExam_userId_deletedAt_idx" ON "ssc_insight"."CustomExam"("userId", "deletedAt");
CREATE INDEX "TodoGroup_userId_deletedAt_idx" ON "ssc_insight"."TodoGroup"("userId", "deletedAt");

UPDATE "ssc_insight"."PersonalTask"
SET "deletedAt" = now()
WHERE "deletedAt" IS NOT NULL
  AND "deletedAt" < now() - interval '15 days';
