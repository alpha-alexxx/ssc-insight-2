import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Generation and builds do not contact Postgres. Migrations require the
    // direct connection pulled by Neon; this placeholder permits secretless CI.
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      "postgresql://unconfigured:unconfigured@localhost:5432/unconfigured",
  },
});
