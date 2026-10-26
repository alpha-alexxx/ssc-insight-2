export type AiExtractionFixture = {
  name: string;
  raw: string;
  model: Record<string, unknown>;
  expected: {
    type: "full" | "sectional" | "subject" | null;
    rank?: number | null;
    participants?: number | null;
    percentile?: number | null;
    subjects: Array<{
      subjectId: "quant" | "reasoning" | "english" | "ga" | "computer";
      questions: number | null;
      correct: number | null;
      incorrect: number | null;
      timeSeconds: number | null;
      unattempted?: number | null;
      questionsDerived?: boolean;
    }>;
  };
};

export const aiExtractionFixtures: AiExtractionFixture[] = [
  {
    name: "four-subject table with skipped and accuracy",
    raw: `Subject    Score    Correct    Incorrect    Skipped    Accuracy    Time
Quant    36 / 90    14    6    10    70%    0:29:42
Reasoning    70 / 90    25    5    0    83.3%    0:16:35
English    103 / 135    37    8    0    82.2%    0:35:12
General Awareness    36 / 75    14    6    5    70%    0:09:48`,
    model: {
      name: null,
      platform: null,
      date: null,
      type: "full",
      subjects: [
        { subjectId: "quant", questions: null, correct: 14, incorrect: 6, timeText: "0:29:42", score: 36, attempted: null, unattempted: 10 },
        { subjectId: "reasoning", questions: null, correct: 25, incorrect: 5, timeText: "0:16:35", score: 70, attempted: null, unattempted: 0 },
        { subjectId: "english", questions: null, correct: 37, incorrect: 8, timeText: "0:35:12", score: 103, attempted: null, unattempted: 0 },
        { subjectId: "ga", questions: null, correct: 14, incorrect: 6, timeText: "0:09:48", score: 36, attempted: null, unattempted: 5 },
      ],
      rank: null,
      participants: null,
      percentile: null,
      warnings: [],
      confidence: "high",
    },
    expected: {
      type: "full",
      percentile: null,
      subjects: [
        { subjectId: "quant", questions: 30, correct: 14, incorrect: 6, timeSeconds: 1782, unattempted: 10, questionsDerived: true },
        { subjectId: "reasoning", questions: 30, correct: 25, incorrect: 5, timeSeconds: 995, unattempted: 0, questionsDerived: true },
        { subjectId: "english", questions: 45, correct: 37, incorrect: 8, timeSeconds: 2112, unattempted: 0, questionsDerived: true },
        { subjectId: "ga", questions: 25, correct: 14, incorrect: 6, timeSeconds: 588, unattempted: 5, questionsDerived: true },
      ],
    },
  },
  {
    name: "line-oriented subject report with rank and percentile",
    raw: `Test Name: Quant Speed Drill 8
Platform: Example Prep
Attempted on: 24 Oct 2026
AIR: 436 out of 1,267
Percentile: 88.45
Quantitative Aptitude
Questions: 25
Marks Obtained: 62
Attempted: 22
Not Attempted: 3
Time Taken: 18 min 42 sec
Overall Time: 00:18:42`,
    model: {
      name: "Quant Speed Drill 8",
      platform: "Example Prep",
      date: "2026-10-24",
      type: "subject",
      subjects: [
        { subjectId: "quant", questions: 25, correct: null, incorrect: null, timeText: "18 min 42 sec", score: 62, attempted: 22, unattempted: 3 },
      ],
      rank: 436,
      participants: 1267,
      percentile: 88.45,
      warnings: [],
      confidence: "high",
    },
    expected: {
      type: "subject",
      rank: 436,
      participants: 1267,
      percentile: 88.45,
      subjects: [
        { subjectId: "quant", questions: 25, correct: 21, incorrect: 1, timeSeconds: 1122, unattempted: 3 },
      ],
    },
  },
  {
    name: "section two with custom counts and percentage",
    raw: `Section II sectional
English Language — Total Qs 30 — Right 22 — Wrong 5 — Left 3 — Duration 21:08 — Percentage 68.3%
GK — Total Qs 20 — Right 11 — Wrong 4 — Left 5 — Duration 12m 09s`,
    model: {
      name: null,
      platform: null,
      date: null,
      type: "sectional",
      subjects: [
        { subjectId: "english", questions: 30, correct: 22, incorrect: 5, timeText: "21:08", score: null, attempted: null, unattempted: 3 },
        { subjectId: "ga", questions: 20, correct: 11, incorrect: 4, timeText: "12m 09s", score: null, attempted: null, unattempted: 5 },
      ],
      rank: null,
      participants: null,
      percentile: null,
      warnings: [],
      confidence: "high",
    },
    expected: {
      type: "sectional",
      percentile: null,
      subjects: [
        { subjectId: "english", questions: 30, correct: 22, incorrect: 5, timeSeconds: 1268, unattempted: 3 },
        { subjectId: "ga", questions: 20, correct: 11, incorrect: 4, timeSeconds: 729, unattempted: 5 },
      ],
    },
  },
  {
    name: "computer subject derives questions from skipped",
    raw: `Exam Name: Computer Practice 3
Computer Knowledge | Correct Answers: 15 | Wrong Answers: 2 | Skipped: 3 | Time Spent: 00:11:05`,
    model: {
      name: "Computer Practice 3",
      platform: null,
      date: null,
      type: "subject",
      subjects: [
        { subjectId: "computer", questions: null, correct: 15, incorrect: 2, timeText: "00:11:05", score: null, attempted: null, unattempted: 3 },
      ],
      rank: null,
      participants: null,
      percentile: null,
      warnings: [],
      confidence: "high",
    },
    expected: {
      type: "subject",
      subjects: [
        { subjectId: "computer", questions: 20, correct: 15, incorrect: 2, timeSeconds: 665, unattempted: 3, questionsDerived: true },
      ],
    },
  },
  {
    name: "attempted plus skipped derives custom question count",
    raw: `English subject test
Score: 54 | Attempted: 20 | Skipped: 5 | Time: 14:30`,
    model: {
      name: "English subject test",
      platform: null,
      date: null,
      type: "subject",
      subjects: [
        { subjectId: "english", questions: null, correct: null, incorrect: null, timeText: "14:30", score: 54, attempted: 20, unattempted: 5 },
      ],
      rank: null,
      participants: null,
      percentile: null,
      warnings: [],
      confidence: "high",
    },
    expected: {
      type: "subject",
      subjects: [
        { subjectId: "english", questions: 25, correct: null, incorrect: null, timeSeconds: 870, unattempted: 5, questionsDerived: true },
      ],
    },
  },
];
