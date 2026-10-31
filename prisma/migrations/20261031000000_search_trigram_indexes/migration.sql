-- Unified server-side search (GET /api/search) — text-search indexes.
-- pg_trgm GIN indexes make ILIKE '%q%' (Prisma `contains`, mode insensitive)
-- index-backed for the search hit columns. Full-text search (tsvector/tsquery)
-- stays the documented upgrade path if per-user text corpora ever grow beyond
-- short titles; today every user-scoped table holds at most a few hundred
-- short strings, so trigram ILIKE is the right weight.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "MockAttempt_name_trgm_idx"
  ON "ssc_insight"."MockAttempt" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "MockAttempt_notes_trgm_idx"
  ON "ssc_insight"."MockAttempt" USING gin ("notes" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PersonalTask_title_trgm_idx"
  ON "ssc_insight"."PersonalTask" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PersonalTask_notes_trgm_idx"
  ON "ssc_insight"."PersonalTask" USING gin ("notes" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "TodoGroup_name_trgm_idx"
  ON "ssc_insight"."TodoGroup" USING gin ("name" gin_trgm_ops);
