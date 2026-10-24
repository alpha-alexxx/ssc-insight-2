import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

const globalDb = globalThis as unknown as { prisma?: PrismaClient };

/** Reuse one adapter/pool in each warm Node.js instance. */
export function database() {
  if (!globalDb.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_NOT_CONFIGURED");
    const adapter = new PrismaNeon({ connectionString });
    globalDb.prisma = new PrismaClient({ adapter });
  }
  return globalDb.prisma;
}
