# Graph Report - ssc-insight-2  (2026-11-02)

## Corpus Check
- 392 files · ~288,986 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .css 2, .example 1)

## Summary
- 3093 nodes · 9248 edges · 178 communities (97 shown, 81 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f41e7f9a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ssrf-core.ts
- PlainIcon
- calendar-entries.ts
- Setup and Operations Handbook
- Migration Ownership and Cache Policies
- Primary Architecture Handbook
- Mirrored Architecture Handbook
- package.json
- client-types.ts
- Product Workflows and Privacy
- sections.tsx
- lib/todos.ts
- Paper Design System Handbook
- Study Plan Progress APIs
- personal-todos.tsx
- backup.ts
- Performance Charts and Outcome Cards
- Request Proxy and Public Origins
- Guarded Routes and Rate Limits
- theme-style-provider.tsx
- exam-settings.ts
- app/layout.tsx
- ui-check.mjs
- Mock Entry Form and Validation
- AI Provider Transport and Errors
- Dashboard and Outcome Visual References
- coach/route.ts
- cn
- Lint Formatting and Build Tooling
- AiSettingsForm
- Analytical Projections and Subject Statistics
- task-toolbar.tsx
- study-plan.test.ts
- attempt-pagination.tsx
- shortDate
- lib/trash.ts
- audit
- Extraction Normalization and Evidence
- TypeScript Compiler Configuration
- shot.mjs
- shot.mjs
- exams-panel.tsx
- Target Settings and LRU Cache
- plan-day-view.tsx
- Shadcn Aliases and Tailwind Configuration
- Continuous Integration Validation Workflow
- AI Configuration and Connection Testing
- auth/[...path]/route.ts
- performance-metrics.ts
- repository.ts
- domain.ts
- Paper Tokens and Design Handover
- daynav-check.mjs
- queries/exams.ts
- "ssc_insight"."MockAttempt"
- Neon Ownership Migration and QA
- NPM Development and Migration Commands
- extract/route.ts
- Dated Todo Implementation Plan
- ai.test.ts
- Tracker Analytics and Backup Principles
- requireUser
- calendar-view.tsx
- Button
- Semantic Icon Migration and Conventions
- UI Audit and Refactoring History
- task-editor.tsx
- plan-day-view.tsx
- view-model.ts
- usage.ts
- workspace-shell.tsx
- lucide-react
- Token Bucket Rate Limiter
- Private Caching and Optional SWR
- personal-task-drawer.tsx
- Encrypted Credentials and SSRF Guard
- PostCSS Build Configuration
- Generated Next Agent Rules
- Filter URL State Mirror
- Vercel Migration Configuration
- Accessibility Focus and Skip Navigation
- Built In Fifty Day Plan
- Coach Chat and Assisted Paste
- history-screen.tsx
- my-tasks-view.tsx
- search.ts
- subject-performance.test.ts
- compare-view.tsx
- backup.test.ts
- ref_node_crypto
- format.ts
- ref_node_assert
- fixtures.ts
- query-client.ts
- verify-backup-transfer.mjs
- google-sign-in-button.tsx
- parseBackup
- db.ts
- shortDate
- resp-probe.mjs
- verify-trash.mjs
- api
- MyTasksView
- use-backup-import.ts
- next.config.ts
- vercel.json
- credentials.ts
- ai/todos/route.ts
- data-parts.tsx
- personal-tasks.test.ts
- context.ts
- istTodayIso
- DuotoneIcon
- 20261025000000_ai_usage/migration.sql
- 20261028000000_ai_credential/migration.sql

## God Nodes (most connected - your core abstractions)
1. `cn()` - 249 edges
2. `PlainIcon()` - 134 edges
3. `Button()` - 119 edges
4. `react` - 106 edges
5. `SSC Insight Architecture` - 104 edges
6. `SSC Insight Architecture` - 104 edges
7. `shortDate()` - 81 edges
8. `database()` - 74 edges
9. `README.md SSC Insight` - 73 edges
10. `RequestError` - 67 edges

## Surprising Connections (you probably didn't know these)
- `Findings` --references--> `usePlanData()`  [INFERRED]
  docs/state-audit.md → src/components/use-plan-data.ts
- `Migration roadmap (executed order)` --references--> `useTodoList()`  [INFERRED]
  docs/state-audit.md → src/components/use-todos-data.tsx
- `Migration roadmap (executed order)` --references--> `useTodoMutations()`  [INFERRED]
  docs/state-audit.md → src/components/use-todos-data.tsx
- `Findings` --references--> `useWorkspaceData()`  [INFERRED]
  docs/state-audit.md → src/components/use-workspace-data.ts
- `Baseline architecture` --references--> `AiUsage`  [INFERRED]
  docs/state-audit.md → src/lib/ai/provider.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Shared Personal Work Data Flow** — agents_shell_scoped_todo_query_cache, agents_dedicated_personal_workspace_and_forty_two_day_summary, agents_overview_today_plan_study_calendar_order [EXTRACTED 1.00]
- **Theme Palette Style Contrast Contract** — design_before_paint_palette_and_style_attributes, design_semantic_canvas_paper_ink_accent_and_chart_tokens, design_aa_contrast_and_focus_rules [EXTRACTED 1.00]
- **Reviewed Three Mode AI Workflow** — product_three_mode_ai_panel, product_explicitly_reviewed_versioned_ai_todo_proposals, product_nullable_reviewed_extraction_draft, product_session_only_in_memory_chat [EXTRACTED 1.00]
- **15-Phase UI/UX Overhaul Program** — docs_ui_overhaul_phase_1_audit_findings, docs_ui_overhaul_phase_1_audit_phase_plan, docs_ui_overhaul_phase_2_design_spec_printed_progress_ledger, docs_ui_overhaul_phase_5_to_14_implementation_segment_group, docs_ui_overhaul_phase_15_handover_conventions [EXTRACTED 1.00]
- **Single Percentage-Axis Chart Convention Across Breakpoints** — docs_images_dashboard_desktop_quant_performance_chart, docs_images_dashboard_desktop_subject_deep_dive_chart, docs_images_dashboard_mobile_responsive_chart_axes [INFERRED 0.75]
- **Score-Centered Answer-Distribution Ring Pattern** — docs_images_card_score_centered_ring, docs_images_card_outcome_counts_bars, docs_images_dashboard_desktop_make_every_attempt_count_panel [INFERRED 0.85]
- **Dashboard Reference Asset Set (outcome card + desktop + mobile)** — docs_images_card_outcome_card, docs_images_dashboard_desktop_dashboard_view, docs_images_dashboard_mobile_mobile_dashboard_view [INFERRED 0.85]
- **Printed-Ledger Design Identity Family** — design_paper_and_ink_system, design_typography_scale, docs_ui_overhaul_phase_2_design_spec_printed_progress_ledger, docs_ui_overhaul_phase_2_design_spec_radius_scale, docs_ui_overhaul_phase_1_audit_radius_system [INFERRED 0.85]
- **Private-Account Auth and Ownership Flow** — claude_request_ownership_architecture, readme_google_signin_oauth, docs_private_accounts_ownership_model, docs_private_accounts_migration [INFERRED 0.85]

## Communities (178 total, 81 thin omitted)

### Community 0 - "ssrf-core.ts"
Cohesion: 0.26
Nodes (11): RFC-1918, assertSafeBaseUrl(), assertSafeBaseUrlShape(), BLOCKED_HOSTNAMES, inV4Range(), ipv4Octets(), isBlockedAddress(), parseBaseUrl() (+3 more)

### Community 1 - "PlainIcon"
Cohesion: 0.13
Nodes (20): DuoGlyph(), DuoIcon, IconEntry, ICONS, IconTone, PlainIcon(), resolveIcon(), CalendarToolbar() (+12 more)

### Community 2 - "calendar-entries.ts"
Cohesion: 0.11
Nodes (21): addToCounts(), AttemptEntry, attemptScorePct(), buildCalendarIndex(), compareEntries(), countAll(), EMPTY_COUNTS, emptyCounts() (+13 more)

### Community 4 - "Migration Ownership and Cache Policies"
Cohesion: 0.06
Nodes (45): AI Status Endpoint Cache Policy (/api/ai/status), Analytics Projections Cache Policy (/api/analytics), api() Client Fetch cache: no-store (src/lib/api-client.ts), Backup Export Raw File Exception (GET /api/backup), Next.js 16 Cache Components Not Enabled, Caching and Revalidation Policy (Phase 8 reference), Filters/Scope URL State Mirror (src/lib/filters-url.ts), force-dynamic Public Auth-Adjacent Pages (+37 more)

### Community 7 - "package.json"
Cohesion: 0.05
Nodes (53): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, cmdk@^1.1.1, @duo-icons/react@^1.0.1, lucide-react@^0.468.0, motion@^12.0.0, @neon/config@^1.9.3 (+45 more)

### Community 8 - "client-types.ts"
Cohesion: 0.06
Nodes (43): Catalog, EMPTY_CATALOG, EMPTY_FORM, Form, Props, INSIGHT_REQUEST_TEXT, insightToChatText(), newId() (+35 more)

### Community 10 - "sections.tsx"
Cohesion: 0.14
Nodes (28): dynamic, LandingPage(), metadata, Faq(), FAQ_ITEMS, Landing(), ERROR_COPY, LandingError() (+20 more)

### Community 11 - "lib/todos.ts"
Cohesion: 0.13
Nodes (28): GET, runtime, DELETE, GET, POST, runtime, calendarCounts(), completionState() (+20 more)

### Community 13 - "Study Plan Progress APIs"
Cohesion: 0.12
Nodes (26): mutationSchema, POST, runtime, GET, runtime, GET, POST, runtime (+18 more)

### Community 14 - "personal-todos.tsx"
Cohesion: 0.14
Nodes (22): DuotoneTile(), categoryMeta(), Group, GroupRow(), KanbanBoard(), OverdueTodoPreview(), PageLayout, PersonalTodos() (+14 more)

### Community 15 - "backup.ts"
Cohesion: 0.05
Nodes (43): attemptLabel(), BACKUP_INSERT_CHUNK_SIZE, BACKUP_REQUEST_MAX_BYTES, BACKUP_SAMPLE_LIMIT, backupAttemptSchema, backupAttemptsWithBounds, BackupPersonalTask, BackupPlanDayProgress (+35 more)

### Community 16 - "Performance Charts and Outcome Cards"
Cohesion: 0.11
Nodes (41): EmptyChart(), AttemptBreakdown(), BreakdownDonut(), DeepDive(), GroupedScoreBars(), InsightCallout(), paperMax(), PerformanceOverview (+33 more)

### Community 17 - "Request Proxy and Public Origins"
Cohesion: 0.19
Nodes (21): accessLog(), AccessLogEvent, bypassesMaintenance(), classifyPath(), EnvLike, isCronPath(), maintenanceActive(), maintenanceRetryAfter() (+13 more)

### Community 18 - "Guarded Routes and Rate Limits"
Cohesion: 0.07
Nodes (53): zod, maxDuration, POST, runtime, assignTierIds(), POST, PUT, DELETE (+45 more)

### Community 19 - "theme-style-provider.tsx"
Cohesion: 0.11
Nodes (23): react, AppearancePanel(), PaletteChip(), StyleGlyph(), initialPalette(), initialStyle(), PALETTE_IDS, PALETTE_STORAGE_KEY (+15 more)

### Community 20 - "exam-settings.ts"
Cohesion: 0.04
Nodes (101): GET, runtime, customExamInputSchema, customSubjectSchema, customTierSchema, DELETE, GET, runtime (+93 more)

### Community 21 - "app/layout.tsx"
Cohesion: 0.08
Nodes (23): @fontsource-variable/dm-sans@^5.3.0, @fontsource-variable/source-serif-4@^5.3.1, next-themes@^0.4.6, @vercel/analytics@^2.0.1, @fontsource-variable/dm-sans, @fontsource-variable/source-serif-4, next-themes, @vercel/analytics (+15 more)

### Community 22 - "ui-check.mjs"
Cohesion: 0.14
Nodes (13): args, evaluate(), height, pending, problems, report, send(), settle (+5 more)

### Community 23 - "Mock Entry Form and Validation"
Cohesion: 0.16
Nodes (26): DurationInput(), change(), formatParts(), blankSubject(), defaultTierId(), fullMockSectionHeading(), meritSubjectIds(), MockForm() (+18 more)

### Community 24 - "AI Provider Transport and Errors"
Cohesion: 0.22
Nodes (22): aiAborted(), AiError, AiErrorCode, aiInvalidOutput(), aiProviderError(), aiTimeout(), AiProvider, contentText() (+14 more)

### Community 25 - "Dashboard and Outcome Visual References"
Cohesion: 0.12
Nodes (25): Accuracy Footer Divisor Column (83.3% Accuracy), Marks Obtained (70/90) and Score Strip, Outcome Card Illustration (Reasoning), Outcome Counts with Proportion Bars (Correct / Incorrect / Unattempted), Percentile Availability Note ('No standalone subject percentile recorded'), Score-Centered Answer Distribution Ring (77.8% SCORE), Serif Subject Heading with Attempt/Question Subtitle, Soft-Rounded Warm Paper Card Surface (+17 more)

### Community 26 - "coach/route.ts"
Cohesion: 0.16
Nodes (19): maxDuration, POST(), runtime, dynamic, GET(), runtime, AiBundle, aiLimits() (+11 more)

### Community 27 - "cn"
Cohesion: 0.07
Nodes (56): class-variance-authority, ActiveExamFooterNote(), AppFrame(), AppHeaderProps, AppSidebar(), NavItem(), VIEW_META, PlanCategoryLegend() (+48 more)

### Community 28 - "Lint Formatting and Build Tooling"
Cohesion: 0.07
Nodes (27): devDependencies, eslint@^9.0.0, eslint-config-next@^16.0.0, prettier@^3.9.10, prisma@7.10.1, tailwindcss@^4.0.0, @tailwindcss/postcss@^4.0.0, @tanstack/react-query-devtools@^5.105.0 (+19 more)

### Community 29 - "AiSettingsForm"
Cohesion: 0.39
Nodes (8): AiSettingsForm(), change(), chooseProvider(), fetchModels(), payload(), remove(), save(), test()

### Community 30 - "Analytical Projections and Subject Statistics"
Cohesion: 0.12
Nodes (29): buildSectionRows(), analyze(), average(), buildWhereYouStand(), comparePoints(), deepDiveFor(), DeepDiveSubject, derivedSectionPoint() (+21 more)

### Community 31 - "task-toolbar.tsx"
Cohesion: 0.23
Nodes (23): AppHeader(), HeaderLocation(), AuthControl(), AuthControlProps, AuthError(), ExamSwitcher(), BulkBar(), TaskRow() (+15 more)

### Community 32 - "study-plan.test.ts"
Cohesion: 0.08
Nodes (24): LANDING_PLAN, plan, buildLandingPlan(), category(), isMock(), LandingPlanData, LandingPlanDay, LandingPlanTask (+16 more)

### Community 33 - "attempt-pagination.tsx"
Cohesion: 0.12
Nodes (32): AiChatSheet(), AttemptPagination, windowedPages(), Masthead(), onScroll(), read(), NAV, AiPlanSheet() (+24 more)

### Community 34 - "shortDate"
Cohesion: 0.13
Nodes (36): next, DashboardOverview(), DashboardView(), RecentAttemptsPanel(), IconName, MetricCell(), MetricStripSkeleton(), DashboardPlanApi (+28 more)

### Community 35 - "lib/trash.ts"
Cohesion: 0.07
Nodes (52): GET, idSchema, kindSchema, runtime, POST, runtime, POST, runtime (+44 more)

### Community 36 - "audit"
Cohesion: 0.12
Nodes (22): DELETE, GET, PUT, runtime, bearerToken(), GET, maxDuration, runtime (+14 more)

### Community 37 - "Extraction Normalization and Evidence"
Cohesion: 0.08
Nodes (40): AiSheetTaskApi, CoachChatTab(), CoachMemo(), CoachMemos(), inlineNodes(), LogMockTab(), MEMO_LABELS, MemoBlock (+32 more)

### Community 38 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 39 - "shot.mjs"
Cohesion: 0.12
Nodes (8): packageDir, REPLACEMENTS, targets, root, logs, pending, target, ws

### Community 40 - "shot.mjs"
Cohesion: 0.17
Nodes (9): args, logs, outDir, pending, routes, target, waitMs, widths (+1 more)

### Community 41 - "exams-panel.tsx"
Cohesion: 0.08
Nodes (54): CustomExamDialog(), describeTier(), ExamRow(), ExamsPanel(), maxOf(), SourceSummary, StageSummary, SUBJECT_CHOICES (+46 more)

### Community 43 - "plan-day-view.tsx"
Cohesion: 0.15
Nodes (15): AttemptOutcomeCard(), AttemptRecordCard(), outcomes, percent(), ScoreRing(), subjectIcons, tierSuffix(), DayNotes() (+7 more)

### Community 44 - "Shadcn Aliases and Tailwind Configuration"
Cohesion: 0.12
Nodes (15): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+7 more)

### Community 45 - "Continuous Integration Validation Workflow"
Cohesion: 0.12
Nodes (15): jobs, validate, name, permissions, contents, run, uses, with (+7 more)

### Community 46 - "AI Configuration and Connection Testing"
Cohesion: 0.18
Nodes (15): maxDuration, POST, runtime, aiConfig(), aiConfigOrNull(), AiConfig, DEFAULT_AI_BASE_URL, Env (+7 more)

### Community 47 - "auth/[...path]/route.ts"
Cohesion: 0.29
Nodes (9): Context, devHandle(), handle(), privateNoStore, runtime, devAuthBypassActive(), devBypassUser(), devSessionPayload() (+1 more)

### Community 48 - "performance-metrics.ts"
Cohesion: 0.10
Nodes (27): PerformancePreview(), ScoreBand(), Sparkline(), Analytics, AnswerStack, PerformancePoint, Distribution, DISTRIBUTION_MIN_POINTS (+19 more)

### Community 49 - "repository.ts"
Cohesion: 0.08
Nodes (52): GET, maxDuration, POST, runtime, DELETE, GET, idSchema, PUT (+44 more)

### Community 50 - "domain.ts"
Cohesion: 0.08
Nodes (34): AddMockView(), LogMockPayload, ASC_SORTERS, AttemptSortRow, buildAttemptStats(), monthSplit(), ATTEMPT_SORT_KEYS, attemptListSchema (+26 more)

### Community 51 - "Paper Tokens and Design Handover"
Cohesion: 0.20
Nodes (8): Multi-Theme System (data-palette x data-style), Palettes x Styles Theme Matrix, Typography Scale (Source Serif 4 + DM Sans), Missing Radius System Finding, Elevation Model and --shadow-pop Token, Restrained Motion Language, Tokenized Radius Scale (panel/control/card/pill), Sticky Identity Column for Mock History

### Community 52 - "daynav-check.mjs"
Cohesion: 0.18
Nodes (9): args, evaluate(), height, pending, report, send(), target, width (+1 more)

### Community 53 - "queries/exams.ts"
Cohesion: 0.13
Nodes (19): ExamScope, ExamScopeContext, ExamScopeProvider(), tierLabelFallback(), activeExamPattern(), CustomExamDto, CustomExamInput, CustomTierDto (+11 more)

### Community 54 - ""ssc_insight"."MockAttempt""
Cohesion: 0.07
Nodes (36): MockAttempt_completedAt_idx, MockAttempt_platform_completedAt_idx, MockAttempt_type_completedAt_idx, "ssc_insight"."MockAttempt", "ssc_insight"."SubjectResult", "ssc_insight"."TrackerSettings", SubjectResult_attemptId_position_key, SubjectResult_subjectId_attemptId_idx (+28 more)

### Community 55 - "Neon Ownership Migration and QA"
Cohesion: 0.20
Nodes (10): Request and Ownership Architecture, Neon Agent Tooling Setup (Codex plugin + MCP), Expiring QA Branch Migration Rehearsal, Selected Neon Environment (org/project/branch), Private-Accounts Migration (claim two shared mocks), Session-Derived Ownership Model, Isolation and Ownership Verification, Google Sign-In via Neon Auth OAuth (+2 more)

### Community 56 - "NPM Development and Migration Commands"
Cohesion: 0.17
Nodes (12): scripts, build, check, db:generate, db:migrate, dev, lint, postinstall (+4 more)

### Community 57 - "extract/route.ts"
Cohesion: 0.22
Nodes (14): bodySchema, maxDuration, POST(), runtime, parseExtraction(), chatMessages(), coachMessages(), contextBlock() (+6 more)

### Community 58 - "Dated Todo Implementation Plan"
Cohesion: 0.20
Nodes (9): Confirmed requirements, Dated personal todos and AI-assisted planning, Existing foundation, Finalized navigation and lifecycle, Phase 1 — Design the dated planner and review flow, Phase 2 — Extend task storage and manual workflows, Phase 3 — Add AI proposal and confirmed-apply workflows, Phase 4 — Validate and document (+1 more)

### Community 59 - "ai.test.ts"
Cohesion: 0.20
Nodes (8): chargedOnFailure(), coachInsightSchema, extractJsonText(), parseModelJson(), config, subjects, AiExtractionFixture, aiExtractionFixtures

### Community 60 - "Tracker Analytics and Backup Principles"
Cohesion: 0.25
Nodes (5): Dashboard Analytical Scopes (full/subject/sectional/all), Backup Format v2 and Account Transfer, Semantic Chart Palette and Chart Rules, Core Product Workflows, JSON Backup Format Version 2

### Community 61 - "requireUser"
Cohesion: 0.13
Nodes (18): Baseline architecture, Call-site inventory (39 total), dynamic, WorkspaceLayout(), GuardLedgerRow(), GuardNotice(), GuardNoticeProps, GuardRow (+10 more)

### Community 62 - "calendar-view.tsx"
Cohesion: 0.13
Nodes (27): Swap(), CalendarLegend(), stepSize(), CalendarLoading(), CalendarView(), currentPath(), MemoMonthGrid, MemoWeekView (+19 more)

### Community 63 - "Button"
Cohesion: 0.11
Nodes (37): radix-ui, AiCoachCard(), CompareView, ErrorState(), SelectionBar(), Panel(), DateRangeFilter(), PersonalTasksPanel() (+29 more)

### Community 64 - "Semantic Icon Migration and Conventions"
Cohesion: 0.40
Nodes (6): Known Limitations (duo-icons fill-rule, native inputs), Design System Source-of-Truth Map, Icon Inconsistency Finding (14 ad-hoc sizes), Icon Size Scale (14/16/18/22/28), Named Imports for Bundle Reduction, Raw Lucide Imports Migrated into Semantic Icon Map

### Community 68 - "UI Audit and Refactoring History"
Cohesion: 0.50
Nodes (5): WorkspaceShell Client Orchestrator and Its Three Hooks, dashboard.tsx Monolith Split Finding, UI Baseline Audit Findings (26 prioritized items), 15-Phase Execution Order, Unified Segmented Control (.segment-group)

### Community 69 - "task-editor.tsx"
Cohesion: 0.30
Nodes (12): nextStatus(), PersonalTaskDisplayStatus, STATUS_META, StatusDot(), statusOf(), BoardView(), handleDrop(), columnFor() (+4 more)

### Community 70 - "plan-day-view.tsx"
Cohesion: 0.21
Nodes (22): DaySections(), AttemptEntryRow(), entryPlanRow(), PersonalEntryRow(), PlanEntryRow(), RevisionEntryRow(), SectionHead(), StatusDot() (+14 more)

### Community 71 - "view-model.ts"
Cohesion: 0.12
Nodes (26): categoryLabel(), CellRow(), MonthCell(), MonthGrid, WEEKDAYS, planTickClass(), CompactRow(), DayTicks() (+18 more)

### Community 72 - "usage.ts"
Cohesion: 0.12
Nodes (27): bodySchema, maxDuration, POST(), runtime, aiBusy(), aiQuotaExceeded(), encodeNdjson(), AiQuotaLimits (+19 more)

### Community 73 - "workspace-shell.tsx"
Cohesion: 0.09
Nodes (42): @tanstack/react-query, DashboardClock(), useExamScope(), PageHeader(), FindingsPanel(), points(), sentence(), TONE_ICON (+34 more)

### Community 74 - "lucide-react"
Cohesion: 0.11
Nodes (19): lucide-react, metadata, metadata, DraftResponse, Proposal, GroupsManagerDialog(), PRIORITIES, STATUSES (+11 more)

### Community 89 - "personal-task-drawer.tsx"
Cohesion: 0.18
Nodes (18): DayDrawer(), DayLedgerProps, blankTask(), PersonalTaskDrawer(), TaskEditorLoader(), TaskEditorForm(), buildDraft(), save() (+10 more)

### Community 139 - "history-screen.tsx"
Cohesion: 0.13
Nodes (26): motion, CompareScreen(), delta(), duration(), accuracyTone(), ChipTone, MockStat(), formatDuration() (+18 more)

### Community 140 - "my-tasks-view.tsx"
Cohesion: 0.10
Nodes (23): ApplyOp, ConfirmState, RescheduleState, TAB_ITEMS, OverviewStrip(), QuickAddBar(), TasksEmptyState(), activeFilterEntries() (+15 more)

### Community 141 - "search.ts"
Cohesion: 0.05
Nodes (78): @radix-ui/react-dialog@^1.3.1, @radix-ui/react-dialog, collectCursors(), GET, runtime, NAV_GROUPS, planHref(), CommandPalette() (+70 more)

### Community 142 - "subject-performance.test.ts"
Cohesion: 0.08
Nodes (25): targetMarks(), targetPercentage(), Marking, SubjectResult, AttemptSeed, MARKING, T1, T2 (+17 more)

### Community 143 - "compare-view.tsx"
Cohesion: 0.16
Nodes (27): accuracyTone(), AttemptTotals, comparablePercentage(), Delta(), scoreBarTone(), totalsFor(), typeChip(), buildComparison() (+19 more)

### Community 144 - "backup.test.ts"
Cohesion: 0.13
Nodes (13): BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_MAX_ATTEMPTS, backup, english, full, ga, PLANNER (+5 more)

### Community 145 - "ref_node_crypto"
Cohesion: 0.18
Nodes (10): api(), full, ids, raw(), api(), cookies, created, input (+2 more)

### Community 146 - "format.ts"
Cohesion: 0.12
Nodes (20): NumberField, ResultEditor(), fill(), weekdayDateLabel(), istClock, istDateKey(), istDayKey, longDay (+12 more)

### Community 147 - "ref_node_assert"
Cohesion: 0.27
Nodes (3): GET(), publicOrigin(), publicUrl()

### Community 148 - "fixtures.ts"
Cohesion: 0.13
Nodes (19): AttemptInput, buildAttempt(), FULL_ROWS, LANDING_ATTEMPTS, LANDING_FULL_MOCKS, LANDING_LATEST, LANDING_SCOPES, LANDING_SUMMARY (+11 more)

### Community 149 - "query-client.ts"
Cohesion: 0.17
Nodes (12): Client State Architecture Audit — 2026-10-31, Design decisions, Findings, Migration roadmap (executed order), Standing gaps (out of scope, recorded), QueryProvider(), ApiError, getQueryClient() (+4 more)

### Community 150 - "verify-backup-transfer.mjs"
Cohesion: 0.29
Nodes (8): api(), backup(), cookies, preview(), raw(), replace(), settings, user()

### Community 151 - "google-sign-in-button.tsx"
Cohesion: 0.31
Nodes (7): useAuthActions(), signIn(), GoogleGlyph(), GoogleSignInButton(), signIn(), GoogleSignInButtonProps, startGoogleSignIn()

### Community 152 - "parseBackup"
Cohesion: 0.31
Nodes (8): assertSummary(), backfillLegacyQualifying(), BackupError, computedSummary(), formatIssues(), isRecord(), parseBackup(), parseImportRequest()

### Community 153 - "db.ts"
Cohesion: 0.22
Nodes (6): @prisma/adapter-pg@^7.10.1, @prisma/adapter-pg, env, match, prisma, queries

### Community 154 - "shortDate"
Cohesion: 0.21
Nodes (21): AgendaGroups(), AgendaView(), EarlierRanges(), CalendarMetrics(), CalendarSurface(), DayLedger(), EmptyActions(), LoadLine() (+13 more)

### Community 155 - "resp-probe.mjs"
Cohesion: 0.17
Nodes (11): ws@^8.22.0, ws, args, evaluate(), pending, send(), target, url (+3 more)

### Community 156 - "verify-trash.mjs"
Cohesion: 0.43
Nodes (6): api(), cookies, created, input, raw(), visible()

### Community 157 - "api"
Cohesion: 0.10
Nodes (33): TodoAiComposer(), apply(), duplicateWarning(), proposedValue(), EMPTY_TASKS, patchDayInPlan(), patchTaskInPlan(), PersonalTaskInput (+25 more)

### Community 158 - "MyTasksView"
Cohesion: 0.15
Nodes (14): MyTasksView(), bulkRescheduleApply(), bulkStatus(), bulkTrashSelected(), clearSelection(), createTask(), cycleStatus(), duplicate() (+6 more)

### Community 159 - "use-backup-import.ts"
Cohesion: 0.40
Nodes (4): BACKUP_MAX_BYTES, BackupPreview, ImportMode, ImportResult

### Community 160 - "next.config.ts"
Cohesion: 0.40
Nodes (4): cspDev, cspProduction, nextConfig, productionHeaders

### Community 166 - "credentials.ts"
Cohesion: 0.32
Nodes (12): AiCredentialInput, AiCredentialSummary, encryptionKey(), getAiCredential(), saveAiCredential(), b64url(), CredentialCryptoError, credentialKey() (+4 more)

### Community 167 - "ai/todos/route.ts"
Cohesion: 0.21
Nodes (13): maxDuration, POST, runtime, parseTodoProposals(), Target, TODO_DATE_QUESTION, todoDraftMessages(), todoDraftRequestSchema (+5 more)

### Community 168 - "data-parts.tsx"
Cohesion: 0.32
Nodes (10): DashboardScreen(), CHART, CHIP_TONES, MockLedger(), MockMetricStrip(), MockRadar(), MockRing(), MockTable() (+2 more)

### Community 169 - "personal-tasks.test.ts"
Cohesion: 0.21
Nodes (8): CATEGORIES, isHttpUrl(), ParsedChatContent, parseSuggestionBody(), parseTaskSuggestions(), PRIORITIES, TaskSuggestion, personalTasksByDate()

### Community 170 - "context.ts"
Cohesion: 0.33
Nodes (8): AiContext, average(), buildAiContext(), fullMockProfile(), payload(), recentFullMock(), sectionProfile(), subjectProfile()

### Community 171 - "istTodayIso"
Cohesion: 0.33
Nodes (7): PersonalCalendar(), personalMonthRange(), useTodoCalendar(), istTodayIso(), AiChatTab, UiState, useUiStore

### Community 172 - "DuotoneIcon"
Cohesion: 0.53
Nodes (4): DuotoneIcon(), AiPanel(), MockChip(), DayWorkspaceScreen()

### Community 173 - "20261025000000_ai_usage/migration.sql"
Cohesion: 0.83
Nodes (3): AiUsage_userId_day_idx, AiUsage_userId_status_createdAt_idx, "ssc_insight"."AiUsage"

## Ambiguous Edges - Review These
- `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` → `Private Accounts Release Notes`  [AMBIGUOUS]
  docs/ui-overhaul/phase-1-audit.md · relation: conceptually_related_to

## Knowledge Gaps
- **36 isolated node(s):** `RFC-1918`, `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages`, `Health Endpoint Rate-Limit-Exempt (/api/health)`, `Firebase/Mongo Runtime Dependencies Removed` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 989 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **81 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `theme-style-provider.tsx` to `PlainIcon`, `package.json`, `client-types.ts`, `sections.tsx`, `history-screen.tsx`, `my-tasks-view.tsx`, `search.ts`, `personal-todos.tsx`, `compare-view.tsx`, `Performance Charts and Outcome Cards`, `format.ts`, `fixtures.ts`, `app/layout.tsx`, `query-client.ts`, `Mock Entry Form and Validation`, `google-sign-in-button.tsx`, `shortDate`, `cn`, `api`, `task-toolbar.tsx`, `use-backup-import.ts`, `attempt-pagination.tsx`, `shortDate`, `Extraction Normalization and Evidence`, `data-parts.tsx`, `exams-panel.tsx`, `istTodayIso`, `plan-day-view.tsx`, `queries/exams.ts`, `requireUser`, `calendar-view.tsx`, `Button`, `task-editor.tsx`, `plan-day-view.tsx`, `view-model.ts`, `workspace-shell.tsx`, `lucide-react`, `personal-task-drawer.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `RFC-1918`, `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `PlainIcon` be split into smaller, more focused modules?**
  _Cohesion score 0.13054187192118227 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `cn` to `PlainIcon`, `client-types.ts`, `sections.tsx`, `history-screen.tsx`, `my-tasks-view.tsx`, `search.ts`, `personal-todos.tsx`, `compare-view.tsx`, `Performance Charts and Outcome Cards`, `theme-style-provider.tsx`, `shortDate`, `AiSettingsForm`, `api`, `task-toolbar.tsx`, `MyTasksView`, `attempt-pagination.tsx`, `shortDate`, `Extraction Normalization and Evidence`, `data-parts.tsx`, `exams-panel.tsx`, `istTodayIso`, `DuotoneIcon`, `plan-day-view.tsx`, `performance-metrics.ts`, `calendar-view.tsx`, `Button`, `task-editor.tsx`, `plan-day-view.tsx`, `view-model.ts`, `workspace-shell.tsx`, `lucide-react`, `personal-task-drawer.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `calendar-entries.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10846560846560846 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `Guarded Routes and Rate Limits` to `study-plan.test.ts`, `lib/trash.ts`, `Extraction Normalization and Evidence`, `package.json`, `usage.ts`, `client-types.ts`, `ai/todos/route.ts`, `lib/todos.ts`, `Study Plan Progress APIs`, `search.ts`, `backup.ts`, `repository.ts`, `domain.ts`, `exam-settings.ts`, `extract/route.ts`, `ai.test.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` and `Private Accounts Release Notes`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._