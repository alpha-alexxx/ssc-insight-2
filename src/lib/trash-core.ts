/**
 * Trash policy and shapes — client-safe.
 *
 * The retention window is ONE constant and expiry is DERIVED, never stored:
 * a persisted `expiresAt` could disagree with `deletedAt`, and the app has a
 * long-standing rule against persisting derived values. Every boundary check
 * compares instants (deletedAt + 15 days), never IST calendar days, so the
 * answer cannot drift across a date line.
 *
 * This module must stay free of `server-only` and Prisma imports: the client
 * renders the same expiry math the API enforces.
 */
import { z } from "zod";

/** One day in milliseconds — the unit every retention boundary is built from. */
export const TRASH_DAY_MS = 24 * 60 * 60 * 1000;
export const TRASH_RETENTION_DAYS = 15;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * TRASH_DAY_MS;
/** "Expiring soon" means inside this many days of the retention edge. */
export const TRASH_EXPIRING_DAYS = 3;
/** Cap on one bulk restore/purge request (body size + write budget). */
export const TRASH_BULK_MAX = 200;

export const TRASH_KINDS = ["attempt", "task", "exam", "group"] as const;
export type TrashKind = (typeof TRASH_KINDS)[number];

/** Display order and labels for the grouped list. */
export const TRASH_KIND_META: Record<
  TrashKind,
  { label: string; plural: string; module: string }
> = {
  attempt: { label: "Mock result", plural: "Mock results", module: "Results" },
  exam: { label: "Custom exam", plural: "Custom exams", module: "Exams" },
  task: { label: "Task", plural: "Tasks", module: "Planner" },
  group: { label: "Task group", plural: "Task groups", module: "Planner" },
};

export const TRASH_KIND_ORDER: TrashKind[] = [...TRASH_KINDS];

export type TrashItem = {
  kind: TrashKind;
  id: string;
  title: string;
  /** Platform for a mock, category for a task, tier count for an exam. */
  subtitle: string;
  /** Attempt date / task due date / null. */
  context: string | null;
  deletedAt: string;
  expiresAt: string;
  /** Whole days remaining, rounded up; 0 on the final day. */
  daysLeft: number;
  /** Live child records affected by a permanent delete (groups only). */
  affected: number | null;
};

export type TrashPage = {
  items: TrashItem[];
  total: number;
  page: number;
  limit: number;
  counts: Record<TrashKind | "all", number>;
  retentionDays: number;
};

export type TrashOutcome = {
  done: number;
  failed: { kind: TrashKind; id: string; code: string; message: string }[];
};

/** Read-only detail for the record sheet. */
export type TrashDetail = {
  item: TrashItem;
  /** Label/value rows in display order, already formatted by the server. */
  fields: { label: string; value: string }[];
  /** Subject roster for a mock result. */
  subjects?: {
    subject: string;
    questions: number;
    correct: number;
    incorrect: number;
    score: number;
  }[];
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** The instant a deleted record stops being recoverable. */
export function trashExpiresAt(deletedAt: Date | string): Date {
  return new Date(toDate(deletedAt).getTime() + TRASH_RETENTION_MS);
}

/** Whole days left, rounded up, clamped at 0. */
export function trashDaysLeft(
  deletedAt: Date | string,
  now: number = Date.now(),
): number {
  const remaining = trashExpiresAt(deletedAt).getTime() - now;
  return Math.max(0, Math.ceil(remaining / TRASH_DAY_MS));
}

/**
 * Expired at or after the boundary — the same rule the API enforces, so a
 * record is never restorable in the UI while the server rejects it.
 */
export function isTrashExpired(
  deletedAt: Date | string,
  now: number = Date.now(),
): boolean {
  return now >= trashExpiresAt(deletedAt).getTime();
}

/**
 * Restart the retention clock for a deletion timestamp that arrives from an
 * older backup. A v5 file exported before Trash existed carries real
 * `deletedAt` values; importing one months later must not produce a row that
 * is already expired (invisible, unrestorable, purged on the next cleanup).
 * Same policy as the deploy backfill: never shorten a window, only extend it.
 *
 * Anything at or past the edge is re-stamped to "deleted now", which gives
 * back the FULL window. Clamping to `now - TRASH_RETENTION_MS` would land the
 * row exactly ON the expiry instant — already expired, since the boundary is
 * inclusive — and the import would silently defeat itself.
 */
export function clampImportedDeletedAt(
  value: string | null | undefined,
  now: number = Date.now(),
): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getTime() <= now - TRASH_RETENTION_MS ? new Date(now) : parsed;
}

export const trashQuerySchema = z.object({
  kind: z.enum(["all", ...TRASH_KINDS]).default("all"),
  q: z.string().trim().max(200).default(""),
  status: z.enum(["all", "expiring"]).default("all"),
  sort: z.enum(["recent", "expiring"]).default("recent"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type TrashQuery = z.infer<typeof trashQuerySchema>;

export const trashSelectionSchema = z.object({
  items: z
    .array(z.object({ kind: z.enum(TRASH_KINDS), id: z.uuid() }))
    .min(1)
    .max(TRASH_BULK_MAX),
});

export type TrashSelection = z.infer<typeof trashSelectionSchema>;

/** Stable de-duplicated identity list — a bulk retry never repeats work. */
export function uniqueSelection(
  items: TrashSelection["items"],
): TrashSelection["items"] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
