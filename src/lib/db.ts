import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalDb = globalThis as unknown as { prisma?: PrismaClient };

/** Reuse one adapter/pool in each warm Node.js instance. */
export function database() {
  if (!globalDb.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_NOT_CONFIGURED");
    // DATABASE_DRIVER=pg selects a direct PostgreSQL connection for local
    // development against a self-hosted database. Unset (the default, and
    // the production configuration) keeps the Neon serverless adapter.
    const adapter =
      process.env.DATABASE_DRIVER === "pg"
        ? new PrismaPg({ connectionString })
        : new PrismaNeon({ connectionString });
    globalDb.prisma = new PrismaClient({ adapter });
  }
  return globalDb.prisma;
}
