-- Personal tasks may carry one optional external link. URLs are validated
-- in application code (strict http/https only) before they are ever stored,
-- so the column needs no database-level scheme constraint.

ALTER TABLE "ssc_insight"."PersonalTask" ADD COLUMN "url" VARCHAR(2048);
