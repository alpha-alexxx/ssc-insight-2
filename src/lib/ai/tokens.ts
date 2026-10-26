const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Conservative character-based estimate when a provider omits usage. */
export function estimateTokens(text: string) {
  return Math.ceil(text.length / 3);
}

/** YYYY-MM-DD in Asia/Kolkata, matching the tracker's date semantics. */
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** The next IST midnight as an absolute instant. IST has no DST. */
export function nextIstMidnight(date = new Date()) {
  const ist = date.getTime() + IST_OFFSET_MS;
  const startOfIstDay = Math.floor(ist / 86_400_000) * 86_400_000;
  return new Date(startOfIstDay + 86_400_000 - IST_OFFSET_MS);
}

export function secondsUntilIstMidnight(date = new Date()) {
  return Math.max(
    1,
    Math.ceil((nextIstMidnight(date).getTime() - date.getTime()) / 1000),
  );
}
