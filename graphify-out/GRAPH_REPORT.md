# Graph Report - ssc-insight-2  (2026-10-31)

## Corpus Check
- 305 files · ~211,232 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .css 2, .example 1)

## Summary
- 2454 nodes · 6778 edges · 157 communities (80 shown, 77 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aad79351`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ai/settings/route.ts
- Button
- view-model.ts
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
- Portable Backup Validation and Import
- Performance Charts and Outcome Cards
- Request Proxy and Public Origins
- Guarded Routes and Rate Limits
- theme-style-provider.tsx
- totals
- app/layout.tsx
- ui-check.mjs
- Mock Entry Form and Validation
- AI Provider Transport and Errors
- Dashboard and Outcome Visual References
- ai.test.ts
- cn
- Lint Formatting and Build Tooling
- ai-settings-form.tsx
- Analytical Projections and Subject Statistics
- task-toolbar.tsx
- study-plan.test.ts
- sheet.tsx
- icon.tsx
- backup/route.ts
- audit.ts
- Extraction Normalization and Evidence
- TypeScript Compiler Configuration
- shot.mjs
- shot.mjs
- PlainIcon
- Target Settings and LRU Cache
- attempt-outcome-card.tsx
- Shadcn Aliases and Tailwind Configuration
- Continuous Integration Validation Workflow
- AI Configuration and Connection Testing
- api.ts
- Scope Projection and Target Tests
- repository.ts
- Workspace Data and URL Filters
- Paper Tokens and Design Handover
- daynav-check.mjs
- extraction-review.tsx
- domain.ts
- Neon Ownership Migration and QA
- NPM Development and Migration Commands
- ai-chat-sheet.tsx
- Dated Todo Implementation Plan
- "ssc_insight"."MockAttempt"
- Tracker Analytics and Backup Principles
- private-workspace.tsx
- calendar-view.tsx
- domain.test.ts
- Semantic Icon Migration and Conventions
- UI Audit and Refactoring History
- lucide-react
- plan-day-view.tsx
- cdp-check.mjs
- useKeyboardShortcuts
- attempt-pagination.tsx
- Token Bucket Rate Limiter
- Private Caching and Optional SWR
- selected-day-panel.tsx
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
- test/route.ts
- attempt-sort.ts
- @neon/config
- overrides
- MyTasksView
- fixtures.ts
- hero-art.tsx
- db.ts
- resp-probe.mjs
- workspace-shell.tsx
- next.config.ts
- prisma
- 20261025000000_ai_usage/migration.sql
- 20261028000000_ai_credential/migration.sql

## God Nodes (most connected - your core abstractions)
1. `cn()` - 160 edges
2. `SSC Insight Architecture` - 104 edges
3. `SSC Insight Architecture` - 104 edges
4. `PlainIcon()` - 95 edges
5. `Button()` - 84 edges
6. `react` - 81 edges
7. `README.md SSC Insight` - 73 edges
8. `shortDate()` - 66 edges
9. `database()` - 58 edges
10. `longDate()` - 53 edges

## Surprising Connections (you probably didn't know these)
- `"The Printed Progress Ledger" Design Direction` --semantically_similar_to--> `Paper-and-Ink Design System`  [INFERRED] [semantically similar]
  docs/ui-overhaul/phase-2-design-spec.md → DESIGN.md
- `Selected Neon Environment (org/project/branch)` --semantically_similar_to--> `Neon PostgreSQL + Prisma 7 Stack`  [INFERRED] [semantically similar]
  docs/neon-migration.md → README.md
- `Request and Ownership Architecture` --semantically_similar_to--> `Session-Derived Ownership Model`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/private-accounts.md
- `Missing Radius System Finding` --conceptually_related_to--> `Paper-and-Ink Design System`  [INFERRED]
  docs/ui-overhaul/phase-1-audit.md → DESIGN.md
- `Elevation Model and --shadow-pop Token` --conceptually_related_to--> `Paper-and-Ink Design System`  [INFERRED]
  docs/ui-overhaul/phase-2-design-spec.md → DESIGN.md

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

## Communities (157 total, 77 thin omitted)

### Community 0 - "ai/settings/route.ts"
Cohesion: 0.11
Nodes (33): RFC-1918, DELETE, GET, PUT, runtime, sameCredentialTarget(), AiCredentialInput, AiCredentialSummary (+25 more)

### Community 1 - "Button"
Cohesion: 0.14
Nodes (16): radix-ui, AiCoachCard(), DateRangeFilter(), GoogleGlyph(), GoogleSignInButton(), GoogleSignInButtonProps, DeleteMockButton(), MockDetailDialog() (+8 more)

### Community 2 - "view-model.ts"
Cohesion: 0.11
Nodes (31): CalendarMetrics(), MonthCell(), MonthGrid(), WEEKDAYS, taskChipClass(), taskDotClass(), postpone(), monthDate() (+23 more)

### Community 4 - "Migration Ownership and Cache Policies"
Cohesion: 0.06
Nodes (45): AI Status Endpoint Cache Policy (/api/ai/status), Analytics Projections Cache Policy (/api/analytics), api() Client Fetch cache: no-store (src/lib/api-client.ts), Backup Export Raw File Exception (GET /api/backup), Next.js 16 Cache Components Not Enabled, Caching and Revalidation Policy (Phase 8 reference), Filters/Scope URL State Mirror (src/lib/filters-url.ts), force-dynamic Public Auth-Adjacent Pages (+37 more)

### Community 7 - "package.json"
Cohesion: 0.06
Nodes (48): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, cmdk@^1.1.1, @duo-icons/react@^1.0.1, lucide-react@^0.468.0, motion@^12.0.0, @neon/env@^1.6.4 (+40 more)

### Community 8 - "client-types.ts"
Cohesion: 0.06
Nodes (41): api(), backup(), cookies, preview(), raw(), replace(), settings, api() (+33 more)

### Community 10 - "sections.tsx"
Cohesion: 0.13
Nodes (28): dynamic, LandingPage(), metadata, Faq(), FAQ_ITEMS, Landing(), ERROR_COPY, LandingError() (+20 more)

### Community 11 - "lib/todos.ts"
Cohesion: 0.11
Nodes (37): GET, runtime, GET, POST, DELETE, PATCH, runtime, DELETE (+29 more)

### Community 13 - "Study Plan Progress APIs"
Cohesion: 0.09
Nodes (34): mutationSchema, POST, runtime, GET, runtime, DELETE, idSchema, PUT (+26 more)

### Community 14 - "personal-todos.tsx"
Cohesion: 0.11
Nodes (27): PersonalCalendar(), personalMonthRange(), categoryMeta(), Group, GroupRow(), KanbanBoard(), OverdueTodoPreview(), PageLayout (+19 more)

### Community 15 - "Portable Backup Validation and Import"
Cohesion: 0.08
Nodes (34): assertSummary(), attemptLabel(), BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_INSERT_CHUNK_SIZE, BACKUP_MAX_ATTEMPTS, BACKUP_SAMPLE_LIMIT, BackupError (+26 more)

### Community 16 - "Performance Charts and Outcome Cards"
Cohesion: 0.10
Nodes (52): CompareView, Diff(), scoreBarTone(), typeChip(), EmptyChart(), Panel(), accuracyTone(), attemptTime() (+44 more)

### Community 17 - "Request Proxy and Public Origins"
Cohesion: 0.14
Nodes (23): GET(), accessLog(), AccessLogEvent, bypassesMaintenance(), classifyPath(), EnvLike, maintenanceActive(), maintenanceRetryAfter() (+15 more)

### Community 18 - "Guarded Routes and Rate Limits"
Cohesion: 0.10
Nodes (28): dynamic, GET, HealthStatus, runtime, DELETE, dynamic, GET, PATCH (+20 more)

### Community 19 - "theme-style-provider.tsx"
Cohesion: 0.15
Nodes (19): AppearancePanel(), PaletteChip(), StyleGlyph(), initialPalette(), initialStyle(), PALETTE_IDS, PALETTE_STORAGE_KEY, PaletteId (+11 more)

### Community 20 - "totals"
Cohesion: 0.26
Nodes (10): fillFromAttempt(), isLoggableType(), matchAttemptForTask(), namesMatch(), normalizeName(), overlapScore(), ResultEditor(), fill() (+2 more)

### Community 21 - "app/layout.tsx"
Cohesion: 0.09
Nodes (18): @fontsource-variable/dm-sans@^5.3.0, @fontsource-variable/source-serif-4@^5.3.1, next-themes@^0.4.6, @vercel/analytics@^2.0.1, @vercel/speed-insights@^2.0.0, @fontsource-variable/dm-sans, @fontsource-variable/source-serif-4, next-themes (+10 more)

### Community 22 - "ui-check.mjs"
Cohesion: 0.14
Nodes (13): args, evaluate(), height, pending, problems, report, send(), settle (+5 more)

### Community 23 - "Mock Entry Form and Validation"
Cohesion: 0.18
Nodes (22): DurationInput(), change(), formatParts(), blankSubject(), fullMockSectionHeading(), MockForm(), applyAiDraft(), applyExtracted() (+14 more)

### Community 24 - "AI Provider Transport and Errors"
Cohesion: 0.19
Nodes (25): aiAborted(), aiBusy(), AiError, AiErrorCode, aiInvalidOutput(), aiProviderError(), aiQuotaExceeded(), aiTimeout() (+17 more)

### Community 25 - "Dashboard and Outcome Visual References"
Cohesion: 0.12
Nodes (25): Accuracy Footer Divisor Column (83.3% Accuracy), Marks Obtained (70/90) and Score Strip, Outcome Card Illustration (Reasoning), Outcome Counts with Proportion Bars (Correct / Incorrect / Unattempted), Percentile Availability Note ('No standalone subject percentile recorded'), Score-Centered Answer Distribution Ring (77.8% SCORE), Serif Subject Heading with Attempt/Question Subtitle, Soft-Rounded Warm Paper Card Surface (+17 more)

### Community 26 - "ai.test.ts"
Cohesion: 0.06
Nodes (72): zod, bodySchema, maxDuration, POST(), runtime, maxDuration, POST(), runtime (+64 more)

### Community 27 - "cn"
Cohesion: 0.12
Nodes (37): AppFrame(), AppHeader(), AppHeaderProps, AppSidebar(), AppView, HeaderLocation(), NavItem(), VIEW_HREF (+29 more)

### Community 28 - "Lint Formatting and Build Tooling"
Cohesion: 0.09
Nodes (23): devDependencies, eslint@^9.0.0, eslint-config-next@^16.0.0, prettier@^3.9.10, tailwindcss@^4.0.0, @tailwindcss/postcss@^4.0.0, tsx@^4.20.0, @types/node@^22.0.0 (+15 more)

### Community 29 - "ai-settings-form.tsx"
Cohesion: 0.11
Nodes (21): AiSettingsForm(), change(), chooseProvider(), fetchModels(), payload(), remove(), save(), test() (+13 more)

### Community 30 - "Analytical Projections and Subject Statistics"
Cohesion: 0.12
Nodes (27): GET, runtime, subjectProfile(), analyze(), AnswerStack, average(), buildWhereYouStand(), comparePoints() (+19 more)

### Community 31 - "task-toolbar.tsx"
Cohesion: 0.25
Nodes (18): AuthControl(), AuthControlProps, AuthError(), useAuthActions(), signIn(), signIn(), BulkBar(), TaskRow() (+10 more)

### Community 32 - "study-plan.test.ts"
Cohesion: 0.08
Nodes (24): LANDING_PLAN, plan, buildLandingPlan(), category(), isMock(), LandingPlanData, LandingPlanDay, LandingPlanTask (+16 more)

### Community 33 - "sheet.tsx"
Cohesion: 0.19
Nodes (15): Masthead(), onScroll(), read(), NAV, AiPlanSheet(), SheetContent, SheetContentProps, SheetDescription (+7 more)

### Community 34 - "icon.tsx"
Cohesion: 0.10
Nodes (33): next, DashboardOverview(), DashboardView(), RecentAttemptsPanel(), DuoGlyph(), DuoIcon, IconEntry, IconName (+25 more)

### Community 35 - "backup/route.ts"
Cohesion: 0.29
Nodes (7): GET, maxDuration, runtime, privateHeaders, BACKUP_REQUEST_MAX_BYTES, exportBackup(), invalidateSettings()

### Community 36 - "audit.ts"
Cohesion: 0.15
Nodes (15): DELETE, GET, idSchema, PUT, runtime, GET, PUT, runtime (+7 more)

### Community 37 - "Extraction Normalization and Evidence"
Cohesion: 0.16
Nodes (18): deriveCounts(), deriveQuestions(), exactInteger(), ExtractedSubjectDraft, ExtractionIssue, extractionModelSchema, extractionSections, extractionSubjectIds (+10 more)

### Community 38 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 39 - "shot.mjs"
Cohesion: 0.20
Nodes (4): packageDir, REPLACEMENTS, targets, root

### Community 40 - "shot.mjs"
Cohesion: 0.17
Nodes (9): args, logs, outDir, pending, routes, target, waitMs, widths (+1 more)

### Community 41 - "PlainIcon"
Cohesion: 0.31
Nodes (11): PlainIcon(), DashboardPlanApi, PipelineProgressSection(), PipelineRevisionSection(), PipelineUpcomingSection(), PlanApi, ProgressRing(), StudyPipelinePanel() (+3 more)

### Community 43 - "attempt-outcome-card.tsx"
Cohesion: 0.38
Nodes (5): AttemptOutcomeCard(), outcomes, percent(), ScoreRing(), subjectIcons

### Community 44 - "Shadcn Aliases and Tailwind Configuration"
Cohesion: 0.12
Nodes (15): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+7 more)

### Community 45 - "Continuous Integration Validation Workflow"
Cohesion: 0.12
Nodes (15): jobs, validate, name, permissions, contents, run, uses, with (+7 more)

### Community 46 - "AI Configuration and Connection Testing"
Cohesion: 0.33
Nodes (8): aiConfig(), aiConfigOrNull(), AiConfig, DEFAULT_AI_BASE_URL, Env, integerEnv(), normaliseBaseUrl(), readAiConfig()

### Community 47 - "api.ts"
Cohesion: 0.13
Nodes (21): dynamic, GET(), runtime, Context, devHandle(), handle(), privateNoStore, runtime (+13 more)

### Community 48 - "Scope Projection and Target Tests"
Cohesion: 0.15
Nodes (11): targetMarks(), SubjectResult, all, english, full, ga, quant, reasoning (+3 more)

### Community 49 - "repository.ts"
Cohesion: 0.12
Nodes (30): GET, POST, runtime, attemptData(), attemptInclude, attemptWhere(), mapSubjects(), StoredAnalyticsAttempt (+22 more)

### Community 50 - "Workspace Data and URL Filters"
Cohesion: 0.15
Nodes (19): AddMockView(), LogMockPayload, useWorkspaceData(), ATTEMPT_SORT_KEYS, filtersSchema, PAGE_SIZES, PageSize, defaultListState (+11 more)

### Community 51 - "Paper Tokens and Design Handover"
Cohesion: 0.20
Nodes (8): Multi-Theme System (data-palette x data-style), Palettes x Styles Theme Matrix, Typography Scale (Source Serif 4 + DM Sans), Missing Radius System Finding, Elevation Model and --shadow-pop Token, Restrained Motion Language, Tokenized Radius Scale (panel/control/card/pill), Sticky Identity Column for Mock History

### Community 52 - "daynav-check.mjs"
Cohesion: 0.18
Nodes (9): args, evaluate(), height, pending, report, send(), target, width (+1 more)

### Community 53 - "extraction-review.tsx"
Cohesion: 0.36
Nodes (8): ExtractionReview(), update(), updateSubject(), FieldIssues(), NullableDuration(), optionalNumber(), blankExtractedSubject(), validateExtractionDraft()

### Community 54 - "domain.ts"
Cohesion: 0.14
Nodes (18): AiContext, average(), fullMockProfile(), payload(), sectionProfile(), sectionColors, subjectColors, targetColor (+10 more)

### Community 55 - "Neon Ownership Migration and QA"
Cohesion: 0.20
Nodes (10): Request and Ownership Architecture, Neon Agent Tooling Setup (Codex plugin + MCP), Expiring QA Branch Migration Rehearsal, Selected Neon Environment (org/project/branch), Private-Accounts Migration (claim two shared mocks), Session-Derived Ownership Model, Isolation and Ownership Verification, Google Sign-In via Neon Auth OAuth (+2 more)

### Community 56 - "NPM Development and Migration Commands"
Cohesion: 0.17
Nodes (12): scripts, build, check, db:generate, db:migrate, dev, lint, postinstall (+4 more)

### Community 57 - "ai-chat-sheet.tsx"
Cohesion: 0.10
Nodes (23): AiChatSheet(), AiSheetTaskApi, ChatBubble(), CoachChatTab(), inlineNodes(), LogMockTab(), MessageContent(), QUICK_QUESTIONS (+15 more)

### Community 58 - "Dated Todo Implementation Plan"
Cohesion: 0.20
Nodes (9): Confirmed requirements, Dated personal todos and AI-assisted planning, Existing foundation, Finalized navigation and lifecycle, Phase 1 — Design the dated planner and review flow, Phase 2 — Extend task storage and manual workflows, Phase 3 — Add AI proposal and confirmed-apply workflows, Phase 4 — Validate and document (+1 more)

### Community 59 - ""ssc_insight"."MockAttempt""
Cohesion: 0.09
Nodes (30): MockAttempt_completedAt_idx, MockAttempt_platform_completedAt_idx, MockAttempt_type_completedAt_idx, "ssc_insight"."MockAttempt", "ssc_insight"."SubjectResult", "ssc_insight"."TrackerSettings", SubjectResult_attemptId_position_key, SubjectResult_subjectId_attemptId_idx (+22 more)

### Community 60 - "Tracker Analytics and Backup Principles"
Cohesion: 0.25
Nodes (5): Dashboard Analytical Scopes (full/subject/sectional/all), Backup Format v2 and Account Transfer, Semantic Chart Palette and Chart Rules, Core Product Workflows, JSON Backup Format Version 2

### Community 61 - "private-workspace.tsx"
Cohesion: 0.19
Nodes (12): GuardLedgerRow(), GuardNotice(), GuardNoticeProps, GuardRow, GuardStyles(), GuardTone, PrivateWorkspace(), PrivateWorkspaceProps (+4 more)

### Community 62 - "calendar-view.tsx"
Cohesion: 0.13
Nodes (37): AttemptRecordCard(), AgendaView(), daysBefore(), CalendarSurface(), DayView(), EmptyDay(), CalendarLegend(), PeriodNav() (+29 more)

### Community 63 - "domain.test.ts"
Cohesion: 0.23
Nodes (8): filterAttempts(), duplicateKey(), parseTime(), subjectIds, aliases, numberAfter(), parseReport(), input

### Community 64 - "Semantic Icon Migration and Conventions"
Cohesion: 0.40
Nodes (6): Known Limitations (duo-icons fill-rule, native inputs), Design System Source-of-Truth Map, Icon Inconsistency Finding (14 ad-hoc sizes), Icon Size Scale (14/16/18/22/28), Named Imports for Bundle Reduction, Raw Lucide Imports Migrated into Semantic Icon Map

### Community 68 - "UI Audit and Refactoring History"
Cohesion: 0.50
Nodes (5): WorkspaceShell Client Orchestrator and Its Three Hooks, dashboard.tsx Monolith Split Finding, UI Baseline Audit Findings (26 prioritized items), 15-Phase Execution Order, Unified Segmented Control (.segment-group)

### Community 69 - "lucide-react"
Cohesion: 0.09
Nodes (26): lucide-react, react, metadata, metadata, DraftResponse, Proposal, GroupsManagerDialog(), ApplyOp (+18 more)

### Community 70 - "plan-day-view.tsx"
Cohesion: 0.16
Nodes (21): DayNotes(), FlowSection(), HeroFigure(), PlanDayView(), PlanNotFound(), nextStatus(), PersonalTaskDisplayStatus, PlanErrorCard() (+13 more)

### Community 71 - "cdp-check.mjs"
Cohesion: 0.25
Nodes (6): ws@^8.22.0, ws, logs, pending, target, ws

### Community 73 - "useKeyboardShortcuts"
Cohesion: 0.50
Nodes (4): Handlers, useKeyboardShortcuts(), isTypingTarget(), onKey()

### Community 74 - "attempt-pagination.tsx"
Cohesion: 0.28
Nodes (13): AttemptPagination, windowedPages(), Pagination(), PaginationContent, PaginationEllipsis(), PaginationItem(), PaginationNext(), PaginationPage() (+5 more)

### Community 89 - "selected-day-panel.tsx"
Cohesion: 0.35
Nodes (10): EventDialog(), PlanDoneState(), RevFlag(), CategoryChip(), CompleteToggle(), ResultLine(), PlanTaskRow(), taskIcon() (+2 more)

### Community 139 - "history-screen.tsx"
Cohesion: 0.12
Nodes (36): CompareScreen(), delta(), duration(), DashboardScreen(), accuracyTone(), CHART, CHIP_TONES, ChipTone (+28 more)

### Community 140 - "my-tasks-view.tsx"
Cohesion: 0.12
Nodes (18): filterCount(), PRIORITY_LABELS, SORT_LABELS, STATUS_LABELS, asString(), DEFAULT_FILTERS, LAYOUTS, loadStored() (+10 more)

### Community 141 - "search.ts"
Cohesion: 0.05
Nodes (79): @radix-ui/react-dialog@^1.3.1, @radix-ui/react-dialog, collectCursors(), GET, runtime, NAV_GROUPS, planHref(), VIEW_META (+71 more)

### Community 142 - "test/route.ts"
Cohesion: 0.15
Nodes (20): maxDuration, POST, runtime, maxDuration, POST, runtime, POST, DELETE (+12 more)

### Community 143 - "attempt-sort.ts"
Cohesion: 0.29
Nodes (7): ASC_SORTERS, attemptComparator(), AttemptSortRow, buildAttemptStats(), monthSplit(), AttemptStats, SortKey

### Community 145 - "overrides"
Cohesion: 0.67
Nodes (3): zod, overrides, @neondatabase/auth

### Community 146 - "MyTasksView"
Cohesion: 0.13
Nodes (20): cyclePersonalStatus(), MyTasksView(), bulkRescheduleApply(), bulkRestoreSelected(), bulkStatus(), bulkTrashSelected(), clearSelection(), createTask() (+12 more)

### Community 148 - "fixtures.ts"
Cohesion: 0.13
Nodes (18): DuotoneIcon(), AttemptInput, buildAttempt(), FULL_ROWS, LANDING_ATTEMPTS, LANDING_FULL_MOCKS, LANDING_LATEST, LANDING_SCOPES (+10 more)

### Community 151 - "hero-art.tsx"
Cohesion: 0.39
Nodes (4): HeroArt(), Hero(), MockRing(), MockTrend()

### Community 153 - "db.ts"
Cohesion: 0.29
Nodes (4): env, match, prisma, queries

### Community 155 - "resp-probe.mjs"
Cohesion: 0.20
Nodes (9): args, evaluate(), pending, send(), target, url, wait, widths (+1 more)

### Community 157 - "workspace-shell.tsx"
Cohesion: 0.09
Nodes (40): @tanstack/react-query, DashboardClock(), DuotoneTile(), PageHeader(), NumberField, viewTransition(), Toast, ToastApi (+32 more)

### Community 160 - "next.config.ts"
Cohesion: 0.40
Nodes (4): cspDev, cspProduction, nextConfig, productionHeaders

### Community 162 - "20261025000000_ai_usage/migration.sql"
Cohesion: 0.83
Nodes (3): AiUsage_userId_day_idx, AiUsage_userId_status_createdAt_idx, "ssc_insight"."AiUsage"

## Ambiguous Edges - Review These
- `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` → `Private Accounts Release Notes`  [AMBIGUOUS]
  docs/ui-overhaul/phase-1-audit.md · relation: conceptually_related_to

## Knowledge Gaps
- **36 isolated node(s):** `RFC-1918`, `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages`, `Health Endpoint Rate-Limit-Exempt (/api/health)`, `Firebase/Mongo Runtime Dependencies Removed` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 828 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **77 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `lucide-react` to `Button`, `view-model.ts`, `package.json`, `client-types.ts`, `sections.tsx`, `history-screen.tsx`, `my-tasks-view.tsx`, `search.ts`, `personal-todos.tsx`, `Performance Charts and Outcome Cards`, `theme-style-provider.tsx`, `app/layout.tsx`, `Mock Entry Form and Validation`, `hero-art.tsx`, `cn`, `workspace-shell.tsx`, `ai-settings-form.tsx`, `task-toolbar.tsx`, `sheet.tsx`, `icon.tsx`, `PlainIcon`, `Workspace Data and URL Filters`, `extraction-review.tsx`, `ai-chat-sheet.tsx`, `private-workspace.tsx`, `calendar-view.tsx`, `plan-day-view.tsx`, `useKeyboardShortcuts`, `attempt-pagination.tsx`, `selected-day-panel.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `RFC-1918`, `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ai/settings/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10904255319148937 - nodes in this community are weakly interconnected._
- **Why does `ws` connect `cdp-check.mjs` to `package.json`, `shot.mjs`, `daynav-check.mjs`, `ui-check.mjs`, `resp-probe.mjs`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.14153846153846153 - nodes in this community are weakly interconnected._
- **Why does `next` connect `icon.tsx` to `next.config.ts`, `lucide-react`, `plan-day-view.tsx`, `package.json`, `PlainIcon`, `sections.tsx`, `search.ts`, `api.ts`, `Performance Charts and Outcome Cards`, `Request Proxy and Public Origins`, `Workspace Data and URL Filters`, `Guarded Routes and Rate Limits`, `app/layout.tsx`, `workspace-shell.tsx`, `selected-day-panel.tsx`, `cn`, `private-workspace.tsx`, `calendar-view.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` and `Private Accounts Release Notes`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._