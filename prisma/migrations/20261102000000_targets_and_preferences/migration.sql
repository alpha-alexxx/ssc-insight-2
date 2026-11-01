-- Targets become a versioned envelope, and in-app preferences get a home.
--
-- Before: TrackerSettings.examTargets was a bare { examId: marks | null }
-- map — one marks value per exam, validated against that exam's PRIMARY tier.
-- After:  TrackerSettings.targets is { version: 2, percentiles, tierDefaults,
--         tierTargets }, where tierTargets is keyed "examId:tierId".
--
-- Existing values are pinned as an explicit override on the tier they were
-- actually measured against (the frozen legacy primary tier), so no target
-- silently changes meaning or ceiling. Values above the corrected maximum
-- (the CPO Paper I ceiling moved from 200 to 100 when SSC restructured the
-- paper) are KEPT and flagged out-of-range by the app — never dropped or
-- clamped, because that would edit a user's own goal without asking.

ALTER TABLE "ssc_insight"."TrackerSettings"
  RENAME COLUMN "examTargets" TO "targets";

ALTER TABLE "ssc_insight"."TrackerSettings"
  ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}';

UPDATE "ssc_insight"."TrackerSettings" AS s
SET "targets" = jsonb_build_object(
  'version', 2,
  'percentiles', '{}'::jsonb,
  'tierDefaults', '{}'::jsonb,
  'tierTargets', COALESCE((
    SELECT jsonb_object_agg(
      CASE e.key
        WHEN 'cgl' THEN 'cgl:tier2'
        WHEN 'chsl' THEN 'chsl:tier2'
        WHEN 'cpo' THEN 'cpo:paper1'
        ELSE e.key || ':main'
      END,
      e.value
    )
    FROM jsonb_each(s."targets") AS e
    WHERE jsonb_typeof(e.value) = 'number'
  ), '{}'::jsonb)
)
WHERE jsonb_typeof(s."targets") = 'object'
  AND NOT (s."targets" ? 'version');
