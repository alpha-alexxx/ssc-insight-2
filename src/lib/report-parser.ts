import {
  SUBJECTS,
  subjectIds,
  type AttemptInput,
  type SubjectId,
  type SubjectResult,
  parseTime,
  subjectStats,
} from "./domain";
const aliases: Record<SubjectId, string[]> = {
  quant: ["Quantitative Aptitude", "Mathematical Abilities"],
  reasoning: [
    "General Intelligence and Reasoning",
    "General Intelligence & Reasoning",
    "Reasoning and General Intelligence",
  ],
  english: ["English Comprehension", "English Language and Comprehension"],
  ga: ["General Awareness"],
  computer: ["Computer Knowledge Test", "Computer Knowledge"],
};
function numberAfter(text: string, label: string) {
  const m = text.match(
    new RegExp(`(?:^|\\n)${label}\\s*[:\\n]?\\s*([\\d,.]+)`, "i"),
  );
  return m ? Number(m[1].replaceAll(",", "")) : undefined;
}
export function parseReport(raw: string): {
  values: Partial<AttemptInput>;
  warnings: string[];
} {
  const text = raw
    .replace(/\\\r?\n/g, "\n")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ");
  const warnings: string[] = [];
  const found: { id: SubjectId; index: number; end: number }[] = [];
  for (const id of subjectIds) {
    const matches = aliases[id]
      .map((alias) => {
        const index = text.toLowerCase().indexOf(alias.toLowerCase());
        return { id, index, end: index + alias.length };
      })
      .filter((m) => m.index >= 0)
      .sort((a, b) => a.index - b.index);
    if (matches[0]) found.push(matches[0]);
  }
  found.sort((a, b) => a.index - b.index);
  const subjects: SubjectResult[] = [];
  for (let i = 0; i < found.length; i++) {
    const section = found[i];
    const block = text
      .slice(section.end, found[i + 1]?.index ?? text.length)
      .split(/\bOverall\b/i)[0];
    // Common platform reports place the score, maximum, attempted and total before accuracy.
    const nums = [...block.matchAll(/(?<![\w:])\d+(?:\.\d+)?/g)].map((m) =>
      Number(m[0]),
    );
    const score = nums[0];
    const maximum = nums[1];
    const labeledCorrect = numberAfter(block, "Correct");
    const labeledIncorrect = numberAfter(block, "Incorrect");
    let correct = labeledCorrect;
    let incorrect = labeledIncorrect;
    if (correct == null && nums.length >= 9) {
      correct = nums[5];
      incorrect = nums[8];
    }
    const questions =
      maximum && maximum % 3 === 0
        ? maximum / 3
        : SUBJECTS[section.id].questions;
    if (
      correct == null ||
      incorrect == null ||
      correct + incorrect > questions
    ) {
      warnings.push(
        `Could not confidently read ${SUBJECTS[section.id].short}. Enter its question counts manually.`,
      );
      continue;
    }
    const time = block.match(/\b\d{1,2}:\d{2}:\d{2}\b/);
    const s: SubjectResult = {
      subjectId: section.id,
      questions,
      correct,
      incorrect,
      scoreOverride: score,
      timeSeconds: time ? parseTime(time[0]) : null,
    };
    if (score !== correct * 3 - incorrect)
      warnings.push(
        `${SUBJECTS[section.id].short}: reported score differs from +3/−1 scoring. Review the question counts; form scores are calculated automatically.`,
      );
    subjects.push(s);
  }
  const firstSubject = found[0]?.index ?? text.length;
  const header = text.slice(0, firstSubject);
  const reportedScore = numberAfter(header, "Your Score");
  const rankMatch = header.match(
    /(?:^|\n)Rank\s*[:\n]?\s*([\d,]+)\s*\/\s*([\d,]+)/i,
  );
  const overallBlock = text.split(/\bOverall\b/i)[1];
  const overallTime = overallBlock?.match(/\b\d{1,2}:\d{2}:\d{2}\b/);
  const ids = subjects.map((s) => s.subjectId);
  const isFull = ids.filter((id) => id !== "computer").length === 4;
  const scoringSubjects = isFull
    ? subjects.filter((s) => s.subjectId !== "computer")
    : subjects;
  if (
    reportedScore != null &&
    subjects.length &&
    scoringSubjects.reduce((n, s) => n + subjectStats(s).score, 0) !==
      reportedScore
  )
    warnings.push(
      "Reported total differs from the subject total. Review both before saving.",
    );
  if (!subjects.length)
    warnings.push(
      "No supported subject results found. Use the manual form to complete this result.",
    );
  const type = isFull ? "full" : ids.length === 2 ? "sectional" : "subject";
  const name = text.match(/(?:^|\n)Mock Name\s*:\s*([^\n]+)/i)?.[1]?.trim();
  const platform = text
    .match(/(?:^|\n)(?:Mock )?Platform\s*:\s*([^\n]+)/i)?.[1]
    ?.trim();
  return {
    values: {
      ...(name ? { name } : {}),
      ...(platform ? { platform } : {}),
      subjects,
      type,
      source: "paste",
      scoreOverride: reportedScore,
      percentile: numberAfter(header, "Percentile"),
      rank: rankMatch ? Number(rankMatch[1].replaceAll(",", "")) : undefined,
      participants: rankMatch
        ? Number(rankMatch[2].replaceAll(",", ""))
        : undefined,
      overallTimeSeconds: overallTime ? parseTime(overallTime[0]) : undefined,
    },
    warnings,
  };
}
