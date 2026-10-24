# SSC Insight

SSC Insight is a personal SSC CGL Tier 2 mock tracker. It helps an aspirant record results, understand performance over time, and decide what to practice next. The interface opens directly into a simple operational dashboard.

## Audience and access

One aspirant is the primary user. The current public, shared workspace without sign-in is an explicit product choice: anyone with access can read and change its records. Do not imply that the workspace is private or add an authentication flow without changing that decision.

## Core workflows

- Log, edit, inspect, and delete mock attempts with platform, date, subject breakdown, optional timing, rank, percentile, and notes.
- Track full mocks, single-subject mocks, and sectional mocks. Full mocks contain Quant, Reasoning, English, and General Awareness with a maximum of 390 marks. Computer Knowledge can optionally be included with a full mock and is scored separately; its time contributes to the overall time. It can also be logged as a standalone subject.
- Log a date without a time, choose a platform preset or enter a custom platform, and enter durations using three hour/minute/second blocks. Scores update live from question counts; overall time is calculated automatically. Empty time blocks become zero.
- Review history using type, subject, platform, date, and text filters. Compare two to four attempts, using percentages where maximum marks differ.
- Paste a result report into a reviewable form before saving; preserve manual correction and explicit review.
- See score trends, rolling averages, question breakdowns, subject strengths, accuracy, and timing. Missing values remain unknown rather than becoming zero.
- Subject performance combines the subject's results from full, sectional and standalone subject mocks, with date/platform/search constraints retained. The selected mock-type filter affects summary/history, not the cross-type subject series. Section I is Quant + Reasoning; Section II is English + General Awareness.
- Set a target score, export JSON backups and CSV, and preview JSON restoration before importing records.

## Product principles

Keep logging quick and analysis readable. Use calm, direct language and a warm paper workspace with editorial typography, thin rules, clear tables, charts, and empty states. Dates are displayed in India Standard Time. Scores and percentages must retain their underlying meaning across different mock types.

## Implementation context

Next.js 16 App Router with React, TypeScript, Tailwind CSS, shadcn-style Radix button and dialog primitives, Motion, and Recharts. Persistence uses the existing Firebase Firestore Enterprise database `insight` with MongoDB compatibility in project `ssc-insight-ankit-20261020`. Database setup and credentials belong to deployment configuration, not client code or design documentation.

## Scope boundaries

This is a result tracker, not an exam-taking platform, coaching marketplace, marketing landing page, or account-management product. Backup restoration adds reviewed records and handles duplicates; it is not a reason to silently replace the workspace.
