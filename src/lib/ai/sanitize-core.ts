/**
 * One character policy for every string that can reach an AI prompt or render
 * in the AI panel. Deliberately dependency-free: `task-suggestion.ts` runs in
 * the browser, so this module must never import `node:*` or `server-only`.
 *
 * The strip set removes only characters that have no legitimate place in a
 * scorecard, a label, or a task title: C0/C1 controls (except tab and
 * newline), zero-width and bidi overrides, Unicode tag characters, variation
 * selectors, and Hangul fillers. It deliberately keeps the em dash and other
 * typographic punctuation the extraction fixtures contain, and keeps all
 * ordinary spaces — `safeLabel` collapses whitespace separately.
 */

/** Invisible / bidi / control characters that can hide instructions or break
 * delimiters. `u` is required for the astral ranges (tag characters and the
 * variation-selector supplement). */
export const UNSAFE_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿\u{115F}\u{1160}\u{3164}\u{FFA0}\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/gu;

export function stripUnsafeChars(text: string): string {
  return text.replace(UNSAFE_CHARS, "");
}

/** Canonical form for pasted report text: compatibility-normalise, then one
 * newline convention. */
export function normalizeText(text: string): string {
  return text.normalize("NFKC").replace(/\r\n?/g, "\n");
}

/**
 * A short, single-line, sanitized label for user-supplied names (custom exam
 * names, tier labels, platform names). Collapses runs of whitespace so a name
 * can never open a new line in a prompt.
 */
export function safeLabel(text: string, maxLength: number): string {
  return stripUnsafeChars(normalizeText(text))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Escape `<` and `>` inside serialized JSON so a data value can never form a
 * delimiter tag. The replacement is the JSON unicode escape, which is legal
 * JSON and parses back to the original character exactly — unlike HTML
 * entities, which would change the value the model sees.
 *
 * Only apply this to JSON text: `<` and `>` cannot occur outside a string
 * literal in valid JSON, so a whole-document replace is safe.
 */
export function escapeJsonAngleBrackets(json: string): string {
  return json.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}
