# SSC Insight

SSC Insight is a personal SSC CGL Tier 2 mock tracker. It helps an aspirant record results, understand performance over time, and decide what to practice next. The interface opens directly into a simple operational dashboard.

## Audience and access

SSC aspirants sign in with Google and work in isolated private accounts. Each user can access and change only their own mocks and settings. Anonymous visitors must sign in before entering the dashboard.

## Core workflows

- Log, edit, inspect, and delete mock attempts with platform, date, subject breakdown, optional timing, rank, percentile, and notes.
- Track full mocks, single-subject mocks, and sectional mocks. Full mocks contain Quant, Reasoning, English, and General Awareness with a maximum of 390 marks. Computer Knowledge can optionally be included with a full mock and is scored separately; its time contributes to the overall time. It can also be logged as a standalone subject.
- Log a date without a time, choose a platform preset or enter a custom platform, and enter durations using three hour/minute/second blocks. Scores update live from question counts; overall time is calculated automatically. Empty time blocks become zero.
- Review history using type, subject, platform, date, and text filters. Compare two to four attempts, using percentages where maximum marks differ.
- Paste a result report into a reviewable form before saving; preserve manual correction and explicit review.
- See score trends, question breakdowns, subject strengths, accuracy, timing, and target progress. Missing values remain unknown rather than becoming zero.
- Dashboard tabs switch the analytical grain rather than filtering the saved-record table. Full Mocks projects saved full mocks. Subject Wise projects every subject result from full, sectional, and standalone subject mocks, with all subjects shown together. Sectional Wise projects explicit sectionals plus Section I (Quant + Reasoning) and Section II (English + General Awareness) derived from each full mock. All Mocks projects every saved attempt exactly once and compares percentages across different maxima. A full mock is not additionally counted as its subjects or sections in All Mocks.
- Where you stand is one global subject radar on every tab. Make every attempt count stacks Correct, Incorrect, and Unattempted for the selected grain. Subject Wise and Sectional Wise show one self-contained card per subject/section; Full Mocks keeps one ring card and All Mocks keeps one card with rings by mock type. Each ring center shows the average saved exam percentile where a genuine result reported one, otherwise score percentage (marks ÷ maximum); a full or sectional mock’s percentile is never reused for its subjects or derived sections. Subject deep dive appears on every tab except Subject Wise.
- Set one target score out of 390 and use it as a percentage reference on every dashboard tab.
- Download a portable JSON backup containing all mocks, subject results, notes, ranks/percentiles, timings, overrides, source metadata, and the target score. The file excludes email, user IDs, and credentials, so it can be imported into a different signed-in account.
- Preview an import with merge or replace modes. Merge preserves existing records and skips exact duplicates while reporting content conflicts; replace deletes the current account’s mocks after an explicit safety-backup download and confirmation naming the signed-in account. All imports are atomic.
- CSV remains a read-only spreadsheet export and cannot be imported. Legacy version-1 backups remain importable; the target is unavailable in them.
- Imports have a 4 MB transport limit. The app does not change the Google login identity and never reassigns ownership server-side; moving to a different Google account means exporting there and importing here.

## Product principles

Keep logging quick and analysis readable. Use calm, direct language and a warm paper workspace with editorial typography, thin rules, clear tables, charts, and empty states. Dates are displayed in India Standard Time. Scores and percentages must retain their underlying meaning across different mock types.

## Implementation context

Next.js 16 App Router with React, TypeScript, Tailwind CSS, shadcn-style Radix button and dialog primitives, Motion, and Recharts. Persistence uses Prisma 7 with Neon PostgreSQL, dedicated schema `ssc_insight`, in project `lingering-mode-47457333`, production branch. Neon Auth manages Google sessions separately. The migration starts empty and leaves Firebase data untouched. Database setup and credentials belong to deployment configuration, not client code or design documentation.

## Scope boundaries

This is a result tracker, not an exam-taking platform, coaching marketplace, marketing landing page, or account-management product. Backup restoration supports reviewed merge and explicit replace; replacement is never silent and requires a current safety backup and confirmation naming the signed-in account.

## Private accounts

Google sign-in is required. Each user owns their mocks, analytics, comparisons, backups, and target setting. All data APIs verify the session and scope database queries by its user ID. There are no guest records, shared settings, or administrator views. Session failure hides private content, and account changes remount the workspace.
