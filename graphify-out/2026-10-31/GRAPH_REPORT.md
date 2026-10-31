# Graph Report - ssc-insight-2  (2026-10-31)

## Corpus Check
- 301 files · ~208,127 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .css 2, .example 1)

## Summary
- 2415 nodes · 6623 edges · 165 communities (89 shown, 76 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aad79351`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ai/settings/route.ts
- workspace-shell.tsx
- view-model.ts
- Setup and Operations Handbook
- Migration Ownership and Cache Policies
- Primary Architecture Handbook
- Mirrored Architecture Handbook
- package.json
- Chat State and Session Verification
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
- extract/route.ts
- Analytical Projections and Subject Statistics
- task-toolbar.tsx
- study-plan.test.ts
- context.ts
- dashboard-view.tsx
- readBody
- audit.ts
- Extraction Normalization and Evidence
- TypeScript Compiler Configuration
- shot.mjs
- shot.mjs
- Reviewed AI Todo Proposals
- Target Settings and LRU Cache
- format.ts
- Shadcn Aliases and Tailwind Configuration
- Continuous Integration Validation Workflow
- AI Configuration and Connection Testing
- ref_server_only
- Scope Projection and Target Tests
- repository.ts
- Workspace Data and URL Filters
- Paper Tokens and Design Handover
- daynav-check.mjs
- extraction-review.tsx
- domain.test.ts
- Neon Ownership Migration and QA
- NPM Development and Migration Commands
- ai-chat-sheet.tsx
- Dated Todo Implementation Plan
- "ssc_insight"."MockAttempt"
- Tracker Analytics and Backup Principles
- private-workspace.tsx
- calendar-view.tsx
- prompts.ts
- Semantic Icon Migration and Conventions
- UI Audit and Refactoring History
- lucide-react
- plan-day-view.tsx
- cdp-check.mjs
- useKeyboardShortcuts
- use-mobile.tsx
- Token Bucket Rate Limiter
- Private Caching and Optional SWR
- react
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
- command-palette.tsx
- test/route.ts
- search.ts
- verify-backup-transfer.mjs
- command.tsx
- MyTasksView
- search-core.ts
- fixtures.ts
- usage.ts
- ssrf-core.ts
- data-parts.tsx
- board-view.tsx
- db.ts
- google-sign-in-button.tsx
- resp-probe.mjs
- showcase.tsx
- toast.tsx
- publicOrigin
- ownership.test.ts
- next.config.ts
- prisma
- 20261025000000_ai_usage/migration.sql
- 20261028000000_ai_credential/migration.sql

## God Nodes (most connected - your core abstractions)
1. `cn()` - 150 edges
2. `SSC Insight Architecture` - 104 edges
3. `SSC Insight Architecture` - 104 edges
4. `PlainIcon()` - 90 edges
5. `Button()` - 84 edges
6. `react` - 79 edges
7. `README.md SSC Insight` - 73 edges
8. `shortDate()` - 66 edges
9. `database()` - 56 edges
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

## Communities (165 total, 76 thin omitted)

### Community 0 - "ai/settings/route.ts"
Cohesion: 0.22
Nodes (19): DELETE, GET, PUT, runtime, AiCredentialInput, AiCredentialSummary, credentialStorageAvailable(), deleteAiCredential() (+11 more)

### Community 1 - "workspace-shell.tsx"
Cohesion: 0.09
Nodes (56): radix-ui, AiCoachCard(), CompareView, Diff(), scoreBarTone(), typeChip(), Panel(), DateRangeFilter() (+48 more)

### Community 2 - "view-model.ts"
Cohesion: 0.13
Nodes (26): MonthCell(), MonthGrid(), WEEKDAYS, taskChipClass(), taskDotClass(), WeekDayCell(), WeekView(), PersonalCalendar() (+18 more)

### Community 4 - "Migration Ownership and Cache Policies"
Cohesion: 0.06
Nodes (45): AI Status Endpoint Cache Policy (/api/ai/status), Analytics Projections Cache Policy (/api/analytics), api() Client Fetch cache: no-store (src/lib/api-client.ts), Backup Export Raw File Exception (GET /api/backup), Next.js 16 Cache Components Not Enabled, Caching and Revalidation Policy (Phase 8 reference), Filters/Scope URL State Mirror (src/lib/filters-url.ts), force-dynamic Public Auth-Adjacent Pages (+37 more)

### Community 7 - "package.json"
Cohesion: 0.05
Nodes (49): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, cmdk@^1.1.1, @duo-icons/react@^1.0.1, lucide-react@^0.468.0, motion@^12.0.0, @neon/config@^1.9.3 (+41 more)

### Community 8 - "Chat State and Session Verification"
Cohesion: 0.05
Nodes (49): AiSettingsForm(), change(), chooseProvider(), fetchModels(), payload(), remove(), save(), test() (+41 more)

### Community 10 - "sections.tsx"
Cohesion: 0.13
Nodes (27): dynamic, LandingPage(), metadata, Faq(), FAQ_ITEMS, Landing(), ERROR_COPY, LandingError() (+19 more)

### Community 11 - "lib/todos.ts"
Cohesion: 0.13
Nodes (28): GET, runtime, DELETE, GET, POST, runtime, calendarCounts(), completionState() (+20 more)

### Community 13 - "Study Plan Progress APIs"
Cohesion: 0.11
Nodes (27): mutationSchema, POST, runtime, GET, runtime, GET, POST, runtime (+19 more)

### Community 14 - "personal-todos.tsx"
Cohesion: 0.09
Nodes (26): categoryMeta(), Group, GroupRow(), KanbanBoard(), PageLayout, PersonalTodos(), clearSelection(), mutate() (+18 more)

### Community 15 - "Portable Backup Validation and Import"
Cohesion: 0.07
Nodes (37): assertSummary(), attemptLabel(), BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_INSERT_CHUNK_SIZE, BACKUP_MAX_ATTEMPTS, BACKUP_MAX_BYTES, BACKUP_REQUEST_MAX_BYTES (+29 more)

### Community 16 - "Performance Charts and Outcome Cards"
Cohesion: 0.14
Nodes (36): EmptyChart(), AttemptBreakdown(), BreakdownDonut(), DeepDive(), GroupedScoreBars(), InsightCallout(), PerformanceOverview, scopeCopy (+28 more)

### Community 17 - "Request Proxy and Public Origins"
Cohesion: 0.18
Nodes (20): accessLog(), AccessLogEvent, bypassesMaintenance(), classifyPath(), EnvLike, maintenanceActive(), maintenanceRetryAfter(), newRequestId() (+12 more)

### Community 18 - "Guarded Routes and Rate Limits"
Cohesion: 0.15
Nodes (21): DELETE, dynamic, GET, PATCH, POST, PUT, runtime, okCached() (+13 more)

### Community 19 - "theme-style-provider.tsx"
Cohesion: 0.15
Nodes (20): AppearancePanel(), PaletteChip(), StyleGlyph(), Swap(), initialPalette(), initialStyle(), microMotion(), PALETTE_IDS (+12 more)

### Community 20 - "totals"
Cohesion: 0.25
Nodes (12): fillFromAttempt(), isLoggableType(), matchAttemptForTask(), namesMatch(), normalizeName(), overlapScore(), NumberField, ResultEditor() (+4 more)

### Community 21 - "app/layout.tsx"
Cohesion: 0.09
Nodes (19): @fontsource-variable/dm-sans@^5.3.0, @fontsource-variable/source-serif-4@^5.3.1, next-themes@^0.4.6, @vercel/analytics@^2.0.1, @vercel/speed-insights@^2.0.0, @fontsource-variable/dm-sans, @fontsource-variable/source-serif-4, next-themes (+11 more)

### Community 22 - "ui-check.mjs"
Cohesion: 0.14
Nodes (13): args, evaluate(), height, pending, problems, report, send(), settle (+5 more)

### Community 23 - "Mock Entry Form and Validation"
Cohesion: 0.18
Nodes (21): DurationInput(), change(), formatParts(), blankSubject(), fullMockSectionHeading(), MockForm(), applyAiDraft(), applyExtracted() (+13 more)

### Community 24 - "AI Provider Transport and Errors"
Cohesion: 0.19
Nodes (25): aiAborted(), aiBusy(), AiError, AiErrorCode, aiInvalidOutput(), aiProviderError(), aiQuotaExceeded(), aiTimeout() (+17 more)

### Community 25 - "Dashboard and Outcome Visual References"
Cohesion: 0.12
Nodes (25): Accuracy Footer Divisor Column (83.3% Accuracy), Marks Obtained (70/90) and Score Strip, Outcome Card Illustration (Reasoning), Outcome Counts with Proportion Bars (Correct / Incorrect / Unattempted), Percentile Availability Note ('No standalone subject percentile recorded'), Score-Centered Answer Distribution Ring (77.8% SCORE), Serif Subject Heading with Attempt/Question Subtitle, Soft-Rounded Warm Paper Card Surface (+17 more)

### Community 26 - "ai.test.ts"
Cohesion: 0.15
Nodes (15): maxDuration, runtime, AiQuotaUsage, chargedOnFailure(), CONTEXT_TOKEN_ESTIMATE, ReservationPlan, reservationTokens(), coachInsightSchema (+7 more)

### Community 27 - "cn"
Cohesion: 0.12
Nodes (39): AppFrame(), AppHeader(), AppHeaderProps, AppSidebar(), AppView, HeaderLocation(), NavItem(), VIEW_HREF (+31 more)

### Community 28 - "Lint Formatting and Build Tooling"
Cohesion: 0.07
Nodes (26): devDependencies, eslint@^9.0.0, eslint-config-next@^16.0.0, prettier@^3.9.10, tailwindcss@^4.0.0, @tailwindcss/postcss@^4.0.0, tsx@^4.20.0, @types/node@^22.0.0 (+18 more)

### Community 29 - "extract/route.ts"
Cohesion: 0.22
Nodes (18): POST(), POST(), bodySchema, maxDuration, POST(), runtime, dynamic, GET() (+10 more)

### Community 30 - "Analytical Projections and Subject Statistics"
Cohesion: 0.17
Nodes (21): analyze(), average(), buildWhereYouStand(), comparePoints(), deepDiveFor(), DeepDiveSubject, derivedSectionPoint(), explicitSectionPoint() (+13 more)

### Community 31 - "task-toolbar.tsx"
Cohesion: 0.28
Nodes (18): AuthControl(), AuthControlProps, AuthError(), BulkBar(), TaskRow(), filterCount(), MenuOption(), PRIORITY_LABELS (+10 more)

### Community 32 - "study-plan.test.ts"
Cohesion: 0.08
Nodes (24): LANDING_PLAN, plan, buildLandingPlan(), category(), isMock(), LandingPlanData, LandingPlanDay, LandingPlanTask (+16 more)

### Community 33 - "context.ts"
Cohesion: 0.24
Nodes (11): GET, average(), buildAiContext(), fullMockProfile(), payload(), recentFullMock(), sectionProfile(), subjectProfile() (+3 more)

### Community 34 - "dashboard-view.tsx"
Cohesion: 0.22
Nodes (16): next, DashboardOverview(), DashboardView(), RecentAttemptsPanel(), IconName, MetricStripSkeleton(), PlanWithToday, PlanErrorCard() (+8 more)

### Community 35 - "readBody"
Cohesion: 0.12
Nodes (26): zod, GET, maxDuration, POST, runtime, DELETE, idSchema, PUT (+18 more)

### Community 36 - "audit.ts"
Cohesion: 0.12
Nodes (18): dynamic, GET, HealthStatus, runtime, DELETE, GET, idSchema, PUT (+10 more)

### Community 37 - "Extraction Normalization and Evidence"
Cohesion: 0.16
Nodes (19): deriveCounts(), deriveQuestions(), exactInteger(), ExtractionIssue, extractionModelSchema, extractionSections, extractionSubjectIds, inferType() (+11 more)

### Community 38 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 39 - "shot.mjs"
Cohesion: 0.25
Nodes (3): packageDir, REPLACEMENTS, targets

### Community 40 - "shot.mjs"
Cohesion: 0.17
Nodes (9): args, logs, outDir, pending, routes, target, waitMs, widths (+1 more)

### Community 41 - "Reviewed AI Todo Proposals"
Cohesion: 0.21
Nodes (13): maxDuration, POST, runtime, parseTodoProposals(), Target, TODO_DATE_QUESTION, todoDraftMessages(), todoDraftRequestSchema (+5 more)

### Community 43 - "format.ts"
Cohesion: 0.13
Nodes (21): AttemptOutcomeCard(), AttemptRecordCard(), outcomes, percent(), ScoreRing(), subjectIcons, DashboardClock(), SelectedDayPanel() (+13 more)

### Community 44 - "Shadcn Aliases and Tailwind Configuration"
Cohesion: 0.12
Nodes (15): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+7 more)

### Community 45 - "Continuous Integration Validation Workflow"
Cohesion: 0.12
Nodes (15): jobs, validate, name, permissions, contents, run, uses, with (+7 more)

### Community 46 - "AI Configuration and Connection Testing"
Cohesion: 0.24
Nodes (11): aiConfig(), aiConfigOrNull(), AiConfig, DEFAULT_AI_BASE_URL, Env, integerEnv(), normaliseBaseUrl(), readAiConfig() (+3 more)

### Community 47 - "ref_server_only"
Cohesion: 0.30
Nodes (9): Context, devHandle(), handle(), privateNoStore, runtime, devAuthBypassActive(), devBypassUser(), devSessionPayload() (+1 more)

### Community 48 - "Scope Projection and Target Tests"
Cohesion: 0.12
Nodes (11): targetMarks(), root, all, english, full, ga, quant, reasoning (+3 more)

### Community 49 - "repository.ts"
Cohesion: 0.13
Nodes (31): GET, runtime, GET, POST, runtime, attemptData(), attemptInclude, attemptWhere() (+23 more)

### Community 50 - "Workspace Data and URL Filters"
Cohesion: 0.25
Nodes (12): AddMockView(), LogMockPayload, useWorkspaceData(), DashboardScope, Filters, filtersSchema, lenientFiltersSchema, mirrorsWorkspaceState() (+4 more)

### Community 51 - "Paper Tokens and Design Handover"
Cohesion: 0.20
Nodes (8): Multi-Theme System (data-palette x data-style), Palettes x Styles Theme Matrix, Typography Scale (Source Serif 4 + DM Sans), Missing Radius System Finding, Elevation Model and --shadow-pop Token, Restrained Motion Language, Tokenized Radius Scale (panel/control/card/pill), Sticky Identity Column for Mock History

### Community 52 - "daynav-check.mjs"
Cohesion: 0.18
Nodes (9): args, evaluate(), height, pending, report, send(), target, width (+1 more)

### Community 53 - "extraction-review.tsx"
Cohesion: 0.31
Nodes (9): ExtractionReview(), update(), updateSubject(), FieldIssues(), NullableDuration(), optionalNumber(), blankExtractedSubject(), ExtractedSubjectDraft (+1 more)

### Community 54 - "domain.test.ts"
Cohesion: 0.12
Nodes (19): filterAttempts(), sectionColors, subjectColors, targetColor, duplicateKey(), optionalNumber, parseTime(), SectionId (+11 more)

### Community 55 - "Neon Ownership Migration and QA"
Cohesion: 0.20
Nodes (10): Request and Ownership Architecture, Neon Agent Tooling Setup (Codex plugin + MCP), Expiring QA Branch Migration Rehearsal, Selected Neon Environment (org/project/branch), Private-Accounts Migration (claim two shared mocks), Session-Derived Ownership Model, Isolation and Ownership Verification, Google Sign-In via Neon Auth OAuth (+2 more)

### Community 56 - "NPM Development and Migration Commands"
Cohesion: 0.17
Nodes (12): scripts, build, check, db:generate, db:migrate, dev, lint, postinstall (+4 more)

### Community 57 - "ai-chat-sheet.tsx"
Cohesion: 0.08
Nodes (36): AiChatSheet(), AiSheetTaskApi, ChatBubble(), CoachChatTab(), inlineNodes(), LogMockTab(), MessageContent(), QUICK_QUESTIONS (+28 more)

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
Cohesion: 0.15
Nodes (16): dynamic, WorkspaceLayout(), GuardLedgerRow(), GuardNotice(), GuardNoticeProps, GuardRow, GuardStyles(), GuardTone (+8 more)

### Community 62 - "calendar-view.tsx"
Cohesion: 0.11
Nodes (27): PageHeader(), DayView(), CalendarLegend(), PeriodNav(), stepSize(), UNIT, CalendarLoading(), CalendarView() (+19 more)

### Community 63 - "prompts.ts"
Cohesion: 0.19
Nodes (12): bodySchema, maxDuration, runtime, AiContext, MAX_EXTRACT_CHARS, encodeNdjson(), chatMessages(), coachMessages() (+4 more)

### Community 64 - "Semantic Icon Migration and Conventions"
Cohesion: 0.40
Nodes (6): Known Limitations (duo-icons fill-rule, native inputs), Design System Source-of-Truth Map, Icon Inconsistency Finding (14 ad-hoc sizes), Icon Size Scale (14/16/18/22/28), Named Imports for Bundle Reduction, Raw Lucide Imports Migrated into Semantic Icon Map

### Community 68 - "UI Audit and Refactoring History"
Cohesion: 0.50
Nodes (5): WorkspaceShell Client Orchestrator and Its Three Hooks, dashboard.tsx Monolith Split Finding, UI Baseline Audit Findings (26 prioritized items), 15-Phase Execution Order, Unified Segmented Control (.segment-group)

### Community 69 - "lucide-react"
Cohesion: 0.11
Nodes (16): lucide-react, metadata, metadata, DraftResponse, Proposal, GroupsManagerDialog(), PRIORITIES, STATUSES (+8 more)

### Community 70 - "plan-day-view.tsx"
Cohesion: 0.11
Nodes (26): AgendaView(), DayNotes(), FlowSection(), HeroFigure(), PlanDayView(), PlanNotFound(), ProgressRule(), patchDayInPlan() (+18 more)

### Community 71 - "cdp-check.mjs"
Cohesion: 0.25
Nodes (6): ws@^8.22.0, ws, logs, pending, target, ws

### Community 73 - "useKeyboardShortcuts"
Cohesion: 0.50
Nodes (4): Handlers, useKeyboardShortcuts(), isTypingTarget(), onKey()

### Community 74 - "use-mobile.tsx"
Cohesion: 0.70
Nodes (4): getServerSnapshot(), getSnapshot(), subscribe(), useIsMobile()

### Community 89 - "react"
Cohesion: 0.20
Nodes (19): react, MetricCell(), daysBefore(), CalendarMetrics(), CalendarSurface(), EventDialog(), PlanDoneState(), RevFlag() (+11 more)

### Community 139 - "history-screen.tsx"
Cohesion: 0.17
Nodes (23): CompareScreen(), delta(), duration(), accuracyTone(), ChipTone, MockChip(), MockStat(), formatDuration() (+15 more)

### Community 140 - "my-tasks-view.tsx"
Cohesion: 0.11
Nodes (22): ApplyOp, ConfirmState, RescheduleState, TAB_ITEMS, OverviewStrip(), TasksEmptyState(), activeFilterEntries(), asString() (+14 more)

### Community 141 - "command-palette.tsx"
Cohesion: 0.15
Nodes (21): NAV_GROUPS, planHref(), VIEW_META, CommandPalette(), CommandPaletteProps, loadRecentSearches(), PaletteBody(), persistRecentSearches() (+13 more)

### Community 142 - "test/route.ts"
Cohesion: 0.18
Nodes (16): maxDuration, POST, runtime, maxDuration, POST, runtime, AiConnectionInput, aiConnectionSchema (+8 more)

### Community 143 - "search.ts"
Cohesion: 0.16
Nodes (22): escapeLike(), getStudyPlan(), effectiveStatus(), ATTEMPT_PHASES, attemptItem(), attemptPhaseWhere(), matchTier(), takeFrom() (+14 more)

### Community 144 - "verify-backup-transfer.mjs"
Cohesion: 0.11
Nodes (18): api(), backup(), cookies, preview(), raw(), replace(), settings, api() (+10 more)

### Community 145 - "command.tsx"
Cohesion: 0.20
Nodes (18): @radix-ui/react-dialog@^1.3.1, @radix-ui/react-dialog, CommandRepoOps(), Command, CommandDialog(), CommandEmpty, CommandGroup, CommandInput (+10 more)

### Community 146 - "MyTasksView"
Cohesion: 0.15
Nodes (16): MyTasksView(), bulkRescheduleApply(), bulkRestoreSelected(), bulkStatus(), bulkTrashSelected(), clearSelection(), createTask(), cycleStatus() (+8 more)

### Community 147 - "search-core.ts"
Cohesion: 0.15
Nodes (18): collectCursors(), GET, runtime, decodeSearchCursors(), encodeSearchCursors(), fromBase64Url(), parseSearchTypes(), SEARCH_LIMIT_DEFAULT (+10 more)

### Community 148 - "fixtures.ts"
Cohesion: 0.15
Nodes (16): AttemptInput, buildAttempt(), FULL_ROWS, LANDING_ATTEMPTS, LANDING_FULL_MOCKS, LANDING_LATEST, LANDING_SCOPES, LANDING_SUMMARY (+8 more)

### Community 149 - "usage.ts"
Cohesion: 0.18
Nodes (15): AiQuotaLimits, planReservation(), dayKey(), nextIstMidnight(), secondsUntilIstMidnight(), getAiUsageToday(), prismaCode(), releaseAiUsage() (+7 more)

### Community 150 - "ssrf-core.ts"
Cohesion: 0.26
Nodes (11): RFC-1918, assertSafeBaseUrl(), assertSafeBaseUrlShape(), BLOCKED_HOSTNAMES, inV4Range(), ipv4Octets(), isBlockedAddress(), parseBaseUrl() (+3 more)

### Community 151 - "data-parts.tsx"
Cohesion: 0.24
Nodes (11): HeroArt(), DashboardScreen(), CHART, CHIP_TONES, MockLedger(), MockMetricStrip(), MockRadar(), MockRing() (+3 more)

### Community 152 - "board-view.tsx"
Cohesion: 0.32
Nodes (11): nextStatus(), PersonalTaskDisplayStatus, STATUS_META, StatusDot(), statusOf(), BoardView(), handleDrop(), columnFor() (+3 more)

### Community 153 - "db.ts"
Cohesion: 0.20
Nodes (7): @prisma/adapter-pg@^7.10.1, @prisma/adapter-pg, globalDb, env, match, prisma, queries

### Community 154 - "google-sign-in-button.tsx"
Cohesion: 0.27
Nodes (8): useAuthActions(), signIn(), GoogleGlyph(), GoogleSignInButton(), signIn(), GoogleSignInButtonProps, Hero(), startGoogleSignIn()

### Community 155 - "resp-probe.mjs"
Cohesion: 0.20
Nodes (9): args, evaluate(), pending, send(), target, url, wait, widths (+1 more)

### Community 156 - "showcase.tsx"
Cohesion: 0.36
Nodes (6): BrowserFrame(), MockupCaption(), EASE, Showcase(), TabId, TABS

### Community 157 - "toast.tsx"
Cohesion: 0.29
Nodes (7): Toast, ToastApi, ToastCard(), ToastContext, ToastTone, ToastViewport(), TONE_STYLES

### Community 158 - "publicOrigin"
Cohesion: 0.52
Nodes (3): GET(), publicOrigin(), publicUrl()

### Community 159 - "ownership.test.ts"
Cohesion: 0.43
Nodes (4): AccountUser, LookupResult, SessionError, verifiedUser()

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 821 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **76 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `workspace-shell.tsx`, `view-model.ts`, `package.json`, `Chat State and Session Verification`, `sections.tsx`, `history-screen.tsx`, `my-tasks-view.tsx`, `command-palette.tsx`, `personal-todos.tsx`, `Portable Backup Validation and Import`, `Performance Charts and Outcome Cards`, `command.tsx`, `theme-style-provider.tsx`, `totals`, `app/layout.tsx`, `Mock Entry Form and Validation`, `data-parts.tsx`, `board-view.tsx`, `google-sign-in-button.tsx`, `cn`, `showcase.tsx`, `toast.tsx`, `task-toolbar.tsx`, `dashboard-view.tsx`, `format.ts`, `Workspace Data and URL Filters`, `extraction-review.tsx`, `ai-chat-sheet.tsx`, `private-workspace.tsx`, `calendar-view.tsx`, `lucide-react`, `plan-day-view.tsx`, `useKeyboardShortcuts`, `use-mobile.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `RFC-1918`, `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `workspace-shell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08732394366197183 - nodes in this community are weakly interconnected._
- **Why does `next` connect `dashboard-view.tsx` to `next.config.ts`, `workspace-shell.tsx`, `readBody`, `lucide-react`, `plan-day-view.tsx`, `package.json`, `sections.tsx`, `format.ts`, `command-palette.tsx`, `Performance Charts and Outcome Cards`, `Request Proxy and Public Origins`, `Workspace Data and URL Filters`, `Guarded Routes and Rate Limits`, `app/layout.tsx`, `calendar-view.tsx`, `cn`, `private-workspace.tsx`, `publicOrigin`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `view-model.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12701612903225806 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `cn` to `workspace-shell.tsx`, `view-model.ts`, `Chat State and Session Verification`, `sections.tsx`, `history-screen.tsx`, `my-tasks-view.tsx`, `personal-todos.tsx`, `Performance Charts and Outcome Cards`, `command.tsx`, `MyTasksView`, `data-parts.tsx`, `board-view.tsx`, `showcase.tsx`, `task-toolbar.tsx`, `dashboard-view.tsx`, `ai-chat-sheet.tsx`, `calendar-view.tsx`, `lucide-react`, `plan-day-view.tsx`, `react`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` and `Private Accounts Release Notes`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._