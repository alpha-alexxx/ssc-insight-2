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

/** "14 Mar" — table rows, chart labels, compact cards. */
export function shortDate(date: string): string {
  return shortDay.format(new Date(date));
}

/** "14 Mar 2026" — dialogs, settings, the coach card. */
export function longDate(date: string): string {
  return longDay.format(new Date(date));
}
