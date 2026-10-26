import { z } from "zod";

export const coachInsightSchema = z.object({
  headline: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(1_200),
  strengths: z.array(z.string().trim().min(1).max(300)).min(1).max(3),
  focusAreas: z.array(z.string().trim().min(1).max(300)).min(1).max(3),
  nextActions: z.array(z.string().trim().min(1).max(300)).min(2).max(5),
  caveats: z.array(z.string().trim().max(300)).max(3).default([]),
});

export type CoachInsight = z.infer<typeof coachInsightSchema>;

/** Remove markdown fences and surrounding prose, then take one balanced object. */
export function extractJsonText(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = (fenced?.[1] ?? raw).trim();
  const start = source.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index++) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

/** Parse model JSON and validate it. Throws on any mismatch. */
export function parseModelJson<T>(raw: string, schema: z.ZodType<T>): T {
  const json = extractJsonText(raw);
  if (!json) throw new Error("No JSON object in model output");
  return schema.parse(JSON.parse(json));
}
