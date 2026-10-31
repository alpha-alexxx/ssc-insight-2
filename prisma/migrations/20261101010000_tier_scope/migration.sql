-- Tier-level workspace scope: enablement/activation move from exams to
-- individual tiers ("examId:tierId" keys), and custom exams hold per-tier
-- patterns. Existing rows keep working via backfill.

-- TrackerSettings: the active tier of the active exam.
ALTER TABLE "ssc_insight"."TrackerSettings" ADD COLUMN "activeTierId" VARCHAR(40) NOT NULL DEFAULT 'tier2';
UPDATE "ssc_insight"."TrackerSettings"
SET "activeTierId" = CASE "activeExamId"
  WHEN 'cgl' THEN 'tier2'
  WHEN 'chsl' THEN 'tier2'
  WHEN 'cpo' THEN 'paper1'
  ELSE 'main' END;

-- Enablement expands from exam ids to "examId:primaryTier" keys.
ALTER TABLE "ssc_insight"."TrackerSettings" ADD COLUMN "enabledTiers" JSONB NOT NULL DEFAULT '[]';
UPDATE "ssc_insight"."TrackerSettings"
SET "enabledTiers" = (
  SELECT COALESCE(
    jsonb_agg(
      key || ':' || CASE key
        WHEN 'cgl' THEN 'tier2'
        WHEN 'chsl' THEN 'tier2'
        WHEN 'cpo' THEN 'paper1'
        ELSE 'main' END
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements_text("enabledExams") AS key
);
ALTER TABLE "ssc_insight"."TrackerSettings" DROP COLUMN "enabledExams";

-- CustomExam: one flat pattern becomes a list of tier patterns; the single
-- tier keeps the "main" id so attempts recorded against it stay valid.
ALTER TABLE "ssc_insight"."CustomExam" ADD COLUMN "tiers" JSONB NOT NULL DEFAULT '[]';
UPDATE "ssc_insight"."CustomExam"
SET "tiers" = jsonb_build_array(jsonb_build_object(
  'id', 'main',
  'label', 'Main',
  'subjects', "subjects",
  'marking', "marking"
));
ALTER TABLE "ssc_insight"."CustomExam" DROP COLUMN "subjects";
ALTER TABLE "ssc_insight"."CustomExam" DROP COLUMN "marking";
