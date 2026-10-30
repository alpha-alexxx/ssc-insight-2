/**
 * Shared presentation helpers — mock-type labels and Asia/Kolkata date
 * formatting. Date components were previously redefined in six files, each
 * constructing a fresh Intl.DateTimeFormat per rendered cell; one memoized
 * formatter per shape replaces all of them. Output is byte-identical to the
 * original toLocaleDateString/toLocaleString calls.
 */

/** "Full mock" / "Sectional" / "Subject"; unknown types read as "Mock". */
export function mockTypeLabel(type: string): string {
  return type === "full"
    ? "Full mock"
    : type === "sectional"
      ? "Sectional"
      : type === "subject"
        ? "Subject"
        : "Mock";
}

const shortDay = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

const longDay = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const weekdayDay = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
/** "Friday, 30 October 2026" — the tasks workspace dateline. */
export function weekdayDate(date: string): string {
  return safeFormat(weekdayDay, date);
}
const monthDay = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
export function monthDate(date: string): string {
  return safeFormat(monthDay, date);
}

const istClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const istDayKey = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Kolkata",
});

/** Safe formatter: an invalid/legacy value must never crash a render. */
function safeFormat(
  formatter: Intl.DateTimeFormat,
  value: string | Date,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return formatter.format(date);
  } catch {
    return "—";
  }
}

/** "14 Mar" — table rows, chart labels, compact cards. */
export function shortDate(date: string): string {
  return safeFormat(shortDay, date);
}

/** "14 Mar 2026" — dialogs, settings, the coach card. */
export function longDate(date: string): string {
  return safeFormat(longDay, date);
}

/**
 * The attempt's calendar day in Asia/Kolkata (YYYY-MM-DD). Date-only form
 * fields are stored at IST midnight, so this is the canonical grouping key
 * for planner attempts and date filters. Invalid legacy values return "".
 */
export function istDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return istDayKey.format(date);
  } catch {
    return "";
  }
}

/** "08:40 PM" — the live IST clock in the dashboard header. */
export function istTimeLabel(value: string | Date = new Date()): string {
  return safeFormat(istClock, value);
}

/** Validate an ISO calendar date without accepting datetime strings. */
export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
