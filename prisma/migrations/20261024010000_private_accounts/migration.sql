BEGIN;

-- Block concurrent legacy writes while ownership is assigned. Auth tables are
-- read only: Prisma never manages the neon_auth schema.
LOCK TABLE "ssc_insight"."MockAttempt", "ssc_insight"."SubjectResult", "ssc_insight"."TrackerSettings" IN ACCESS EXCLUSIVE MODE;

ALTER TABLE "ssc_insight"."MockAttempt" ADD COLUMN "userId" TEXT;
ALTER TABLE "ssc_insight"."TrackerSettings" DROP CONSTRAINT "TrackerSettings_singleton_check";
ALTER TABLE "ssc_insight"."TrackerSettings" RENAME COLUMN "id" TO "userId";
ALTER TABLE "ssc_insight"."TrackerSettings" ALTER COLUMN "userId" DROP DEFAULT;

DO $$
DECLARE
  owner_id TEXT;
  owner_count INTEGER;
  mock_count INTEGER;
BEGIN
  SELECT count(*) INTO mock_count FROM "ssc_insight"."MockAttempt";
  -- Empty fresh installations need no identity-specific backfill. Production
  -- additionally has a release preflight requiring exactly the observed 2 rows.
  IF mock_count NOT IN (0, 2) THEN
    RAISE EXCEPTION 'Shared mock count changed; ownership migration requires reassessment';
  END IF;
  IF mock_count > 0 OR EXISTS (SELECT 1 FROM "ssc_insight"."TrackerSettings") THEN
    SELECT count(*), min(id::text) INTO owner_count, owner_id
    FROM "neon_auth"."user"
    WHERE lower(email) = lower('ankitinter9@gmail.com') AND "emailVerified" = true;
    IF owner_count <> 1 OR owner_id IS NULL THEN
      RAISE EXCEPTION 'Verified migration owner is missing or ambiguous';
    END IF;
    UPDATE "ssc_insight"."MockAttempt" SET "userId" = owner_id;
    UPDATE "ssc_insight"."TrackerSettings" SET "userId" = owner_id;
  END IF;
END $$;

ALTER TABLE "ssc_insight"."MockAttempt" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "ssc_insight"."MockAttempt" ADD CONSTRAINT "MockAttempt_userId_check" CHECK (length(btrim("userId")) > 0);
ALTER TABLE "ssc_insight"."TrackerSettings" ADD CONSTRAINT "TrackerSettings_userId_check" CHECK (length(btrim("userId")) > 0);

DROP INDEX "ssc_insight"."MockAttempt_completedAt_idx";
DROP INDEX "ssc_insight"."MockAttempt_platform_completedAt_idx";
DROP INDEX "ssc_insight"."MockAttempt_type_completedAt_idx";
CREATE INDEX "MockAttempt_userId_completedAt_idx" ON "ssc_insight"."MockAttempt"("userId", "completedAt");
CREATE INDEX "MockAttempt_userId_platform_completedAt_idx" ON "ssc_insight"."MockAttempt"("userId", "platform", "completedAt");
CREATE INDEX "MockAttempt_userId_type_completedAt_idx" ON "ssc_insight"."MockAttempt"("userId", "type", "completedAt");

COMMIT;
