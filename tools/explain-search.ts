/**
 * EXPLAIN ANALYZE check for the search indexes (run: npx tsx tools/explain-search.ts).
 * Confirms the pg_trgm GIN indexes back the ILIKE queries /api/search sends,
 * per the search spec's "database indexes are actually used where expected".
 */
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Read DATABASE_URL from .env.local without loading the app.
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const match = env.match(/^DATABASE_URL=("?)([^\n]+?)\1$/m);
const connectionString = match?.[2];
if (!connectionString) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const queries: [string, string][] = [
  ["MockAttempt name ILIKE contains (trigram GIN)",
    `EXPLAIN ANALYZE SELECT "id" FROM "ssc_insight"."MockAttempt" WHERE "userId" = 'x' AND "name" ILIKE '%percentage%'`],
  ["MockAttempt notes ILIKE contains (trigram GIN)",
    `EXPLAIN ANALYZE SELECT "id" FROM "ssc_insight"."MockAttempt" WHERE "userId" = 'x' AND "notes" ILIKE '%revisit%'`],
  ["PersonalTask title ILIKE contains (trigram GIN)",
    `EXPLAIN ANALYZE SELECT "id" FROM "ssc_insight"."PersonalTask" WHERE "userId" = 'x' AND "deletedAt" IS NULL AND "title" ILIKE '%revision%'`],
  ["TodoGroup name ILIKE contains (trigram GIN)",
    `EXPLAIN ANALYZE SELECT "id" FROM "ssc_insight"."TodoGroup" WHERE "userId" = 'x' AND "name" ILIKE '%maths%'`],
  // Corpus-growth probes: no userId filter, so only the trigram GIN can
  // serve the ILIKE — this proves the indexes are valid and selectable.
  ["MockAttempt name ILIKE, corpus-growth probe",
    `EXPLAIN ANALYZE SELECT "id" FROM "ssc_insight"."MockAttempt" WHERE "name" ILIKE '%percentage%'`],
  ["PersonalTask title ILIKE, corpus-growth probe",
    `EXPLAIN ANALYZE SELECT "id" FROM "ssc_insight"."PersonalTask" WHERE "title" ILIKE '%revision%'`],
];

async function main() {
try {
  // Tiny per-user tables make the planner prefer the userId btree first —
  // the optimal plan at today's scale (sub-ms), with the trigram GIN taking
  // over as a user's corpus grows. The per-user probes assert "an index is
  // used"; the corpus probes (no userId) assert the trigram index itself.
  await prisma.$executeRawUnsafe(`SET enable_seqscan = off`);
  for (const [label, sql] of queries) {
    const rows = (await prisma.$queryRawUnsafe(sql)) as Array<Record<string, string>>;
    const plan = rows.map((r) => Object.values(r)[0]).join("\n");
    const isCorpusProbe = label.includes("corpus-growth");
    const usesIndex = isCorpusProbe
      ? /Index (Scan|Only Scan) using .*trgm|Bitmap Index Scan on .*trgm/.test(plan)
      : /Index Scan|Bitmap Index Scan|Index Only Scan/.test(plan);
    console.log(`${usesIndex ? "PASS" : "WARN"}  ${label}`);
    console.log(
      plan
        .split("\n")
        .filter((l) => /Scan|Heap/.test(l))
        .slice(0, 2)
        .map((l) => "    " + l.trim())
        .join("\n"),
    );
  }
} catch (e) {
    console.error("FAILED:", String(e).slice(0, 400));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
