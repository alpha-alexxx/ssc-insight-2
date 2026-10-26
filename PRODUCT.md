# SSC Insight

SSC Insight is a personal SSC CGL Tier 2 mock tracker. It helps an aspirant record results, understand performance over time, and decide what to practice next. The public `/sign-in` route explains the product; a verified account opens directly into the operational dashboard at `/`.

## Audience and access

SSC aspirants sign in with Google and work in isolated private accounts. Each user can access and change only their own mocks and settings. Anonymous visitors must sign in before entering the dashboard.

## Core workflows

- Log, edit, inspect, and delete mock attempts with platform, date, subject breakdown, optional timing, rank, percentile, and notes.
- Track full mocks, single-subject mocks, and sectional mocks. Full mocks contain Quant, Reasoning, English, and General Awareness with a maximum of 390 marks. Computer Knowledge can optionally be included with a full mock and is scored separately; its time contributes to the overall time. It can also be logged as a standalone subject.
- Log a date without a time, choose a platform preset or enter a custom platform, and enter durations using three hour/minute/second blocks. Scores update live from question counts; overall time is calculated automatically. Empty time blocks become zero.
- Review history using type, subject, platform, date, and text filters. Compare two to four attempts, using percentages where maximum marks differ. Active filters and the dashboard scope are mirrored into the page address, so a bookmarked or shared link restores the same filtered view after signing in; browser Back moves between pages, not between filter states.
- Paste a result report into a reviewable form before saving; preserve manual correction and explicit review. An optional AI helper can arrange the pasted report into a draft, but the user must apply it and review every field before saving.
- Generate an optional AI coaching read of saved performance and ask follow-up questions in a session-only chat drawer. The coach is read-only; it never creates, edits, deletes, or schedules records.
- See score trends, question breakdowns, subject strengths, accuracy, timing, and target progress. Missing values remain unknown rather than becoming zero.
- Dashboard tabs switch the analytical grain rather than filtering the saved-record table. Full Mocks projects saved full mocks. Subject Wise projects every subject result from full, sectional, and standalone subject mocks, with all subjects shown together. Sectional Wise projects explicit sectionals plus Section I (Quant + Reasoning) and Section II (English + General Awareness) derived from each full mock. All Mocks projects every saved attempt exactly once and compares percentages across different maxima. A full mock is not additionally counted as its subjects or sections in All Mocks.
- Where you stand is one global subject radar on every tab. Make every attempt count uses reference-led visual outcome cards for the selected analytical grain: one Full Mocks card, one card per populated subject or section, and parent attempts grouped by mock type in All Mocks. Every card shows attempt/question coverage, score percentage, Correct/Incorrect/Unattempted counts and shares, and aggregate marks/max, with a score-centered answer ring, answer-share bars, accuracy, and explicit reported-percentile availability—without percentile borrowing or extra projections. Subject deep dive appears on every tab except Subject Wise.
- Set one target score out of 390 and use it as a percentage reference on every dashboard tab.
- Download a portable JSON backup containing all mocks, subject results, notes, ranks/percentiles, timings, overrides, source metadata, and the target score. The file excludes email, user IDs, and credentials, so it can be imported into a different signed-in account.
- Preview an import with merge or replace modes. Merge preserves existing records and skips exact duplicates while reporting content conflicts; replace deletes the current account’s mocks after an explicit safety-backup download and confirmation naming the signed-in account. All imports are atomic.
- CSV remains a read-only spreadsheet export and cannot be imported. Legacy version-1 backups remain importable; the target is unavailable in them.
- Imports have a 4 MB transport limit. The app does not change the Google login identity and never reassigns ownership server-side; moving to a different Google account means exporting there and importing here.

## AI coach

AI is optional and server-configured through an OpenAI-compatible endpoint. When it is unavailable, the tracker remains fully usable and the AI card and assisted-extraction action are hidden or disabled.

- The coach card is generated manually, not on page load. It returns a structured headline, summary, strengths, focus areas, next actions, and caveats.
- Follow-up chat is session-only and held in memory; it disappears on reload, sign-out, account change, or session failure. It is never written to browser storage.
- AI-assisted paste returns an editable draft that distinguishes reported values, safely derived SSC counts, and missing fields. The user reviews or corrects mock details, subject counts, timings, rank, and percentile before choosing **Use reviewed values**; saving remains the existing separate form action. Contradictions and required missing values block copying, while the deterministic paste parser stays available as a fallback.
- Context is limited to aggregate analytics and the latest 20 full mocks. Notes, email, user identity, auth data, and per-attempt detail outside those latest 20 full mocks are never sent. The pasted report is sent only for extraction and is treated as untrusted data.
- Every request is subject to an IST-daily request and token cap. Usage rows log feature, model, token counts, status, and safe error codes, but never prompts, responses, notes, or report text.
- The AI has no write tools. Prompt-injected instructions in a report or chat message cannot change data.

## Product principles

Keep logging quick and analysis readable. Use calm, direct language and a warm paper workspace with editorial typography, thin rules, clear tables, charts, and empty states. Dates are displayed in India Standard Time. Scores and percentages must retain their underlying meaning across different mock types.

## Implementation context

Next.js 16 App Router with React, TypeScript, Tailwind CSS, shadcn-style Radix button and dialog primitives, Motion, and Recharts. Persistence uses Prisma 7 with Neon PostgreSQL, dedicated schema `ssc_insight`, in project `lingering-mode-47457333`, production branch. Neon Auth manages Google sessions separately. An optional server-side AI layer uses an OpenAI-compatible Chat Completions endpoint; it is read-only and disabled unless its environment is configured. The migration starts empty and leaves Firebase data untouched. Database setup and credentials belong to deployment configuration, not client code or design documentation.

## Scope boundaries

This is a result tracker, not an exam-taking platform, coaching marketplace, marketing landing page, or account-management product. The AI coach is an optional in-app analysis aid, not a marketplace, tutor, or autonomous agent. Backup restoration supports reviewed merge and explicit replace; replacement is never silent and requires a current safety backup and confirmation naming the signed-in account.

## Private accounts

Google sign-in is required. Each user owns their mocks, analytics, comparisons, backups, and target setting. All data APIs verify the session and scope database queries by its user ID. There are no guest records, shared settings, or administrator views. Session failure hides private content, and account changes remount the workspace.
