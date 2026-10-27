# Graph Report - ssc-insight-2  (2026-10-27)

## Corpus Check
- 206 files · ~159,321 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 4, .jsonl 2, .css 2)

## Summary
- 1747 nodes · 4378 edges · 108 communities (84 shown, 24 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 213 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4d1526b6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- calendar-view.tsx
- Caching and Revalidation Policy
- AI Credentials and SSRF Guard
- sidebar.tsx
- Settings Screen Surface
- Backup Format and Import
- Plan and Task API Routes
- Root Layout and Appearance
- mock-attempts/[id]/route.ts
- use-plan-data.ts
- AI Extraction Review
- Dashboard Desktop Screenshots
- Access Log and Middleware
- workspace-shell.tsx
- Planner Calendar Screen
- Landing Page and Icon System
- ai.test.ts
- AI Errors and Provider
- context.ts
- Plan Day View Panels
- Auth Routes and Session
- Mock Entry Form
- client-types.ts
- dependencies
- Test Suites and Fixtures
- react
- Analytics Route and Rate Limits
- Analytics Scope Projections
- Paper-and-Ink Design System
- lucide-react
- Ownership and Private Accounts
- Development Toolchain
- AI Extract and Status Routes
- AI Config Resolution
- Study Plan Source Data
- TypeScript Configuration
- Shell Architecture Decisions
- AI Chat Sheet Screenshots
- Chat Sheet UI Primitives
- performance-overview.tsx
- QA Utility Scripts
- Persistence and Data Model
- shadcn Component Config
- CI Workflow
- @neon/env@^1.6.4
- Settings Route and LRU Cache
- app-shell.tsx
- Dashboard Docs Screenshots
- chat/route.ts
- Dashboard Populated Screenshots
- Health, Audit, and DB Client
- AI Subsystem Documentation
- dashboard-view.tsx
- Add Mock Screen Screenshots
- Domain Rules and Scoring
- Outcome Card Documentation
- Filters and URL State
- Report Parser and Domain Tests
- Dashboard Overview Panels
- Study Planner Documentation
- npm Scripts
- acl-backup-222a02e6d1cf4dc7a775e6abab3be9b9.json.ps1
- acl-backup-7fb25f44b363442c9bd2fb0b0d27fd01.json.ps1
- Theme Tokens and Chart Rules
- Backup Route
- API Catch-All Route
- acl-backup-8f9ea1d86716478694d366dd88ec19de.json.ps1
- Dashboard Data Screenshots
- Icon System Migration
- acl-backup-97163324db174117bef6d021de77d219.json.ps1
- ESLint Configuration
- Next.js Server Config
- Mobile Breakpoint Hook
- Prisma CLI Config
- acl-backup-f4521a34a140499bba75b7ef81e202df.json.ps1
- Loading Skeletons
- Token Bucket Limiter
- PlainIcon
- clsx
- Duo Icons Dependency
- attempt-persistence.ts
- extraction-review.tsx
- repository.ts
- tasks/route.ts
- task-suggestion.ts
- publicOrigin
- WebSocket Dependency
- PostCSS Config
- istTodayIso
- No Zustand and no TanStack Query decision
- useKeyboardShortcuts
- @fontsource-variable/source-serif-4
- pg@^8.23.1
- @prisma/adapter-neon
- @radix-ui/react-label
- @radix-ui/react-tooltip

## God Nodes (most connected - your core abstractions)
1. `PlainIcon()` - 61 edges
2. `Button()` - 54 edges
3. `cn()` - 51 edges
4. `react` - 40 edges
5. `WorkspaceShellInner()` - 34 edges
6. `database()` - 33 edges
7. `MockForm()` - 28 edges
8. `RequestError` - 28 edges
9. `readBody()` - 28 edges
10. `shortDate()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `"The Printed Progress Ledger" Design Direction` --semantically_similar_to--> `Paper-and-Ink Design System`  [INFERRED] [semantically similar]
  docs/ui-overhaul/phase-2-design-spec.md → DESIGN.md
- `Selected Neon Environment (org/project/branch)` --semantically_similar_to--> `Neon PostgreSQL + Prisma 7 Stack`  [INFERRED] [semantically similar]
  docs/neon-migration.md → README.md
- `Compact Two-Row Scope Tabs and Stacked Filters` --semantically_similar_to--> `Analytical Scope Tabs (Full mocks, Subject wise, Sectional wise, All mocks)`  [INFERRED] [semantically similar]
  docs/images/dashboard-mobile.jpg → dashboard-data.png
- `In-Process Settings LRU Cache` --conceptually_related_to--> `HTTP API surface`  [INFERRED]
  docs/caching.md → README.md
- `Request and Ownership Architecture` --semantically_similar_to--> `Session-Derived Ownership Model`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/private-accounts.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Day Cell Marker Hierarchy (date, task labels, overflow count, selection state)** — calendar_desktop_day_cell, calendar_desktop_task_marker_labels, calendar_desktop_overflow_more_indicator, calendar_desktop_selected_day_highlight [EXTRACTED 1.00]
- **Desktop Month Calendar Composition (switcher, navigation, grid, detail panel)** — calendar_desktop_view_switcher, calendar_desktop_month_navigation, calendar_desktop_month_grid, calendar_desktop_day_detail_panel [EXTRACTED 1.00]
- **Five-palette token family selectable via the appearance picker** — settings_mobile_terracotta_swatch, settings_mobile_blue_swatch, settings_mobile_lime_swatch, settings_mobile_violet_swatch, settings_mobile_rose_swatch [EXTRACTED 1.00]
- **Day View Composes Assignments, Checklist, Revision, Logged Attempts, Notebook** — plan_desktop_study_planner_day_view, plan_desktop_assignments_panel, plan_desktop_daily_checklist, plan_desktop_revision_panel, plan_desktop_logged_attempts_panel, plan_desktop_weak_areas_notebook [EXTRACTED 1.00]
- **15-Phase UI/UX Overhaul Program** — docs_ui_overhaul_phase_1_audit_findings, docs_ui_overhaul_phase_1_audit_phase_plan, docs_ui_overhaul_phase_2_design_spec_printed_progress_ledger, docs_ui_overhaul_phase_5_to_14_implementation_segment_group, docs_ui_overhaul_phase_15_handover_conventions [EXTRACTED 1.00]
- **Responsive Reflow of the Same Day View Across Breakpoints** — plan_mobile_stacked_layout, plan_mobile_wrapping_task_row, plan_desktop_assignments_panel, plan_desktop_daily_checklist [INFERRED 0.65]
- **Responsive Sheet Variants (Desktop Rail and Mobile Full Width)** — ai_sheet_ai_chat_sheet, ai_sheet_mobile_full_width_sheet, ai_sheet_mobile_chat_composer, ai_sheet_chat_composer [INFERRED 0.75]
- **Dashboard Planning and Coaching Panel Family** — dashboard_cdp_assignment_strip, dashboard_cdp_todays_focus_panel, dashboard_cdp_upcoming_tests_panel, dashboard_cdp_study_progress_panel, dashboard_cdp_revision_queue_panel, dashboard_cdp_ai_coach_panel [INFERRED 0.75]
- **History Record Management Surface** — history_data_attempt_table, history_data_scope_tabs, history_data_filter_controls, history_data_sort_and_search, history_data_footer_details [INFERRED 0.75]
- **Percentage-Axis Chart Family on the Dashboard** — dashboard_data_full_mock_performance_chart, dashboard_data_where_you_stand_radar, dashboard_data_my_target_panel, dashboard_data2_target_delta_chart [INFERRED 0.75]
- **Planner-to-Tracker Logging Bridge (add record, logged attempt card, store separation)** — plan_desktop_add_mock_record_action, plan_desktop_logged_attempts_panel, plan_data_logged_attempts_populated, plan_data_two_store_separation [INFERRED 0.75]
- **Single Percentage-Axis Chart Convention Across Breakpoints** — docs_images_dashboard_desktop_quant_performance_chart, docs_images_dashboard_desktop_subject_deep_dive_chart, docs_images_dashboard_mobile_responsive_chart_axes [INFERRED 0.75]
- **Ephemeral Session-Scoped Chat Pattern** — ai_sheet_ai_chat_sheet, ai_sheet_chat_log, ai_sheet_session_only_chip, ai_sheet_session_retention_notice [INFERRED 0.85]
- **Read-Only Aggregates-Only AI Privacy Contract** — ai_sheet_coach_sheet_header, ai_sheet_coach_readonly_disclosure, ai_sheet_screen_context_chip [INFERRED 0.85]
- **Score-Centered Answer-Distribution Ring Pattern** — docs_images_card_score_centered_ring, docs_images_card_outcome_counts_bars, docs_images_dashboard_desktop_make_every_attempt_count_panel [INFERRED 0.85]
- **Responsive Dashboard Layout System** — dashboard_cdp_desktop_dashboard_screen, dashboard_mobile_mobile_dashboard_screen, dashboard_mobile_sheet_sidebar_trigger, dashboard_mobile_stacked_metric_grid [INFERRED 0.85]
- **Dashboard Reference Asset Set (outcome card + desktop + mobile)** — docs_images_card_outcome_card, docs_images_dashboard_desktop_dashboard_view, docs_images_dashboard_mobile_mobile_dashboard_view [INFERRED 0.85]
- **One navigation model rendered as expanded sidebar, icon rail, and mobile sheet** — settings_desktop_expanded_sidebar, sidebar_collapsed_icon_rail, sidebar_mobile_sheet_sidebar [INFERRED 0.85]
- **Outcome Card Family (Single Attempt, Stacked Records, Aggregate)** — dashboard_data_attempt_record_card, dashboard_data_outcome_card, dashboard_data2_attempt_record_list, dashboard_data2_outcome_card_aggregate [INFERRED 0.85]
- **Printed-Ledger Design Identity Family** — design_paper_and_ink_system, design_typography_scale, docs_ui_overhaul_phase_2_design_spec_printed_progress_ledger, docs_ui_overhaul_phase_2_design_spec_radius_scale, docs_ui_overhaul_phase_1_audit_radius_system [INFERRED 0.85]
- **Private-Account Auth and Ownership Flow** — product_private_accounts, claude_request_ownership_architecture, readme_google_signin_oauth, docs_private_accounts_ownership_model, docs_private_accounts_migration [INFERRED 0.85]
- **Desktop-to-Mobile Responsive Parity of the Planner Calendar** — calendar_desktop_study_planner_screen, calendar_mobile_study_planner_screen, calendar_desktop_month_grid, calendar_mobile_month_grid, calendar_desktop_day_detail_panel, calendar_mobile_day_detail_card [INFERRED 0.85]
- **Settings surface composed of nav tabs, target card, and appearance pickers** — settings_desktop_settings_screen, settings_desktop_settings_subnav, settings_desktop_study_target_panel, settings_mobile_appearance_panel [INFERRED 0.85]
- **Paper-and-Ink Visual System Applied Across Screens** — add_prefill_log_a_mock_screen, add_prefill_paper_ink_palette, dashboard_desktop_dashboard_overview, dashboard_data_dashboard_with_saved_attempt [INFERRED 0.95]

## Communities (108 total, 24 thin omitted)

### Community 0 - "calendar-view.tsx"
Cohesion: 0.09
Nodes (48): AgendaList(), CalendarMode, CalendarView(), clampToPlan(), MODES, MonthView(), SelectedDayAgenda(), shiftMonth() (+40 more)

### Community 1 - "Caching and Revalidation Policy"
Cohesion: 0.06
Nodes (45): AI Status Endpoint Cache Policy (/api/ai/status), Analytics Projections Cache Policy (/api/analytics), api() Client Fetch cache: no-store (src/lib/api-client.ts), Backup Export Raw File Exception (GET /api/backup), Next.js 16 Cache Components Not Enabled, Caching and Revalidation Policy (Phase 8 reference), Filters/Scope URL State Mirror (src/lib/filters-url.ts), force-dynamic Public Auth-Adjacent Pages (+37 more)

### Community 2 - "AI Credentials and SSRF Guard"
Cohesion: 0.08
Nodes (37): RFC-1918, api(), full, ids, raw(), api(), cookies, created (+29 more)

### Community 3 - "sidebar.tsx"
Cohesion: 0.15
Nodes (16): PageHeader(), Separator, SidebarContext, SidebarContextProps, SidebarGroupAction, SidebarMenuAction, SidebarMenuBadge, sidebarMenuButtonVariants (+8 more)

### Community 4 - "Settings Screen Surface"
Cohesion: 0.05
Nodes (45): About & Account Section, Account Card (Local Developer / dev@localhost), Appearance Section (nav entry leading to palette and style), Ask Coach Trigger, Data & Backup Section (import/export nav entry), Expanded Sidebar Navigation (wordmark, study planner and results groups, settings footer), Footer Meta (Built for progress / SSC CGL Tier 2 / IST times), Paper Surface and Thin-Rule Token (warm off-white, square corners, no shadow) (+37 more)

### Community 5 - "Backup Format and Import"
Cohesion: 0.08
Nodes (33): assertSummary(), BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_MAX_ATTEMPTS, BACKUP_MAX_BYTES, BACKUP_SAMPLE_LIMIT, BackupError, BackupPreview (+25 more)

### Community 6 - "Plan and Task API Routes"
Cohesion: 0.13
Nodes (23): mutationSchema, POST, runtime, DELETE, idSchema, PUT, runtime, RequestError (+15 more)

### Community 7 - "Root Layout and Appearance"
Cohesion: 0.08
Nodes (28): next-themes@^0.4.6, next-themes, metadata, RootLayout(), AppearancePanel(), PaletteChip(), StyleGlyph(), ErrorBoundary (+20 more)

### Community 8 - "mock-attempts/[id]/route.ts"
Cohesion: 0.18
Nodes (16): DELETE, GET, idSchema, PUT, runtime, GET, POST, runtime (+8 more)

### Community 9 - "use-plan-data.ts"
Cohesion: 0.15
Nodes (14): Toast, ToastApi, ToastCard(), ToastContext, ToastTone, ToastViewport(), TONE_STYLES, patchDayInPlan() (+6 more)

### Community 10 - "AI Extraction Review"
Cohesion: 0.17
Nodes (19): deriveCounts(), deriveQuestions(), exactInteger(), ExtractionIssue, extractionModelSchema, extractionSections, extractionSubjectIds, inferType() (+11 more)

### Community 11 - "Dashboard Desktop Screenshots"
Cohesion: 0.10
Nodes (32): AI Coach Panel, Today's Assignments Metric Strip, Desktop Dashboard Screen, Platform and Date Filter Bar, Full Mock Performance Chart Empty State, Make Every Attempt Count Outcome Cards, My Target Panel, Paper-and-Ink Visual System (+24 more)

### Community 12 - "Access Log and Middleware"
Cohesion: 0.18
Nodes (20): accessLog(), AccessLogEvent, bypassesMaintenance(), classifyPath(), EnvLike, maintenanceActive(), maintenanceRetryAfter(), newRequestId() (+12 more)

### Community 13 - "workspace-shell.tsx"
Cohesion: 0.14
Nodes (35): radix-ui, AddMockView(), AiCoachCard(), Bullets(), CompareView, DateRangeFilter(), accuracyTone(), HistoryPanel (+27 more)

### Community 14 - "Planner Calendar Screen"
Cohesion: 0.10
Nodes (29): Add Mock Record Primary Action (page and panel), Day Cell with Date Number and Inline Task Titles, Day Detail Side Panel (Day 2 · 27 Oct, 0/4 done), Density-Driven Marker Pattern (text labels on desktop, dots on mobile), Calendar Footer Legend and IST Timezone Note, Top Header Toolbar (Ask coach, theme, settings, account), Inactive Days Outside Plan Range Tinted Muted, "Log result" Row Action on Mock Tasks (+21 more)

### Community 15 - "Landing Page and Icon System"
Cohesion: 0.12
Nodes (23): motion, @react-spring/web, AppHeader(), AuthControl(), ConnectedAuthControl(), DuoGlyph(), DuoIcon, DuotoneIcon() (+15 more)

### Community 16 - "ai.test.ts"
Cohesion: 0.09
Nodes (25): zod, parseExtraction(), AiQuotaLimits, AiQuotaUsage, chargedOnFailure(), planReservation(), ReservationPlan, coachInsightSchema (+17 more)

### Community 17 - "AI Errors and Provider"
Cohesion: 0.24
Nodes (21): aiAborted(), aiInvalidOutput(), aiProviderError(), aiTimeout(), AiProvider, AiUsage, contentText(), createAiProvider() (+13 more)

### Community 18 - "context.ts"
Cohesion: 0.29
Nodes (9): AiContext, average(), buildAiContext(), fullMockProfile(), payload(), recentFullMock(), sectionProfile(), subjectProfile() (+1 more)

### Community 19 - "Plan Day View Panels"
Cohesion: 0.11
Nodes (25): Attempt Metadata Line (Testbook - Full mock - Logged 27 ...), ATTEMPTED Status Badge with attempt date, Plan Counters Unchanged After Logging (still 0/4 - 0/4), Logged Attempts Panel (populated with one tracker attempt), Score and Accuracy Metrics (242/390, 80%), Score Percentage Ring (62.1% SCORE chip), Tracker Attempts vs Plan Progress Are Separate Stores, Primary "Add mock record" Action (terracotta, top right) (+17 more)

### Community 20 - "Auth Routes and Session"
Cohesion: 0.12
Nodes (22): next, Context, devHandle(), handle(), privateNoStore, runtime, dynamic, LandingPage() (+14 more)

### Community 21 - "Mock Entry Form"
Cohesion: 0.19
Nodes (21): DurationInput(), change(), formatParts(), blankSubject(), fullMockSectionHeading(), MockForm(), applyAiDraft(), applyExtracted() (+13 more)

### Community 22 - "client-types.ts"
Cohesion: 0.08
Nodes (28): api(), backup(), cookies, preview(), raw(), replace(), settings, newId() (+20 more)

### Community 23 - "dependencies"
Cohesion: 0.07
Nodes (29): dependencies, class-variance-authority@^0.7.1, @fontsource-variable/dm-sans@^5.3.0, lucide-react@^0.468.0, motion@^12.0.0, @neon/config@^1.9.3, @neondatabase/auth@0.7.0-beta, next@^16.0.0 (+21 more)

### Community 24 - "Test Suites and Fixtures"
Cohesion: 0.15
Nodes (12): targetMarks(), targetPercentage(), SubjectResult, all, english, full, ga, quant (+4 more)

### Community 25 - "react"
Cohesion: 0.13
Nodes (17): class-variance-authority, react, credentialSchema, AiSettingsForm(), chooseProvider(), remove(), EMPTY_FORM, Props (+9 more)

### Community 26 - "Analytics Route and Rate Limits"
Cohesion: 0.23
Nodes (15): okCached(), AccountUser, apiRateLimiter, Bucket, clientIp(), enforceRateLimit(), rateLimitHeadersFor(), rateLimitHeaders() (+7 more)

### Community 27 - "Analytics Scope Projections"
Cohesion: 0.14
Nodes (25): GET, runtime, analyze(), AnswerStack, average(), buildWhereYouStand(), comparePoints(), deepDiveFor() (+17 more)

### Community 28 - "Paper-and-Ink Design System"
Cohesion: 0.10
Nodes (16): Dashboard Analytical Scopes (full/subject/sectional/all), Multi-Theme System (data-palette x data-style), WorkspaceShell Client Orchestrator and Its Three Hooks, Semantic Chart Palette and Chart Rules, Palettes x Styles Theme Matrix, Typography Scale (Source Serif 4 + DM Sans), dashboard.tsx Monolith Split Finding, UI Baseline Audit Findings (26 prioritized items) (+8 more)

### Community 29 - "lucide-react"
Cohesion: 0.29
Nodes (3): lucide-react, metadata, metadata

### Community 30 - "Ownership and Private Accounts"
Cohesion: 0.12
Nodes (14): Backup Format v2 and Account Transfer, Request and Ownership Architecture, Neon Agent Tooling Setup (Codex plugin + MCP), Expiring QA Branch Migration Rehearsal, Selected Neon Environment (org/project/branch), Private-Accounts Migration (claim two shared mocks), Session-Derived Ownership Model, Isolation and Ownership Verification (+6 more)

### Community 31 - "Development Toolchain"
Cohesion: 0.12
Nodes (22): devDependencies, prettier@^3.9.10, tailwindcss@^4.0.0, @tailwindcss/postcss@^4.0.0, tsx@^4.20.0, @types/node@^22.0.0, @types/react@^19.0.0, @types/react-dom@^19.0.0 (+14 more)

### Community 32 - "AI Extract and Status Routes"
Cohesion: 0.22
Nodes (10): GET, dynamic, GET(), runtime, POST, credentialStorageAvailable(), describeAiCredential(), apiError() (+2 more)

### Community 33 - "AI Config Resolution"
Cohesion: 0.14
Nodes (18): maxDuration, POST, runtime, aiConfig(), aiConfigOrNull(), AiConfig, DEFAULT_AI_BASE_URL, Env (+10 more)

### Community 34 - "Study Plan Source Data"
Cohesion: 0.10
Nodes (14): getStudyPlan(), parsed, parsePlanTaskKey(), planChecklistItemSchema, PlanDay, planDaySchema, planRevisionSchema, PlanTask (+6 more)

### Community 35 - "TypeScript Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 36 - "Shell Architecture Decisions"
Cohesion: 0.12
Nodes (11): Generated Next.js Agent Rules Block, api() client helper, API envelope and route guard (src/lib/api.ts), PrivateWorkspace session guard, requireUser(), /sign-in authoritative server check, useWorkspaceData, (workspace) route group (+3 more)

### Community 37 - "AI Chat Sheet Screenshots"
Cohesion: 0.16
Nodes (18): AI Chat Sheet (Desktop Right-Side Panel), Dashboard AI Coach Card, Ask a Question Trigger Button, Chat Composer Textarea, Independently Scrolling Chat Log Area, Clear Conversation Action, Coach Insight Read-Only Disclosure, Ask Your Coach Sheet Header (+10 more)

### Community 38 - "Chat Sheet UI Primitives"
Cohesion: 0.16
Nodes (21): AiChatSheet(), AiSheetTaskApi, ChatBubble(), CoachChatTab(), inlineNodes(), LogMockPayload, LogMockTab(), MessageContent() (+13 more)

### Community 39 - "performance-overview.tsx"
Cohesion: 0.11
Nodes (32): recharts@^3.0.0, recharts, EmptyChart(), AttemptCards(), DeepDive(), PerformanceOverview, scopeCopy, ScopeTrend() (+24 more)

### Community 40 - "QA Utility Scripts"
Cohesion: 0.12
Nodes (8): packageDir, REPLACEMENTS, targets, root, logs, pending, target, ws

### Community 41 - "Persistence and Data Model"
Cohesion: 0.19
Nodes (9): Backup format and planning layer (src/lib/backup.ts), MockAttempt model, Repository (src/lib/repository.ts), SubjectResult model, TrackerSettings model, Neon PostgreSQL, Prisma 7 with Neon serverless adapter, ssc_insight PostgreSQL schema (+1 more)

### Community 42 - "shadcn Component Config"
Cohesion: 0.12
Nodes (15): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+7 more)

### Community 43 - "CI Workflow"
Cohesion: 0.12
Nodes (15): jobs, validate, name, permissions, contents, run, uses, with (+7 more)

### Community 45 - "Settings Route and LRU Cache"
Cohesion: 0.16
Nodes (10): GET, PUT, runtime, settingsSchema, Entry, LruCache, FULL_MOCK_MAX_SCORE, getSettings() (+2 more)

### Community 46 - "app-shell.tsx"
Cohesion: 0.17
Nodes (22): AppFrame(), AppSidebar(), AppView, initials(), NAV_GROUPS, NavItem(), VIEW_HREF, VIEW_META (+14 more)

### Community 47 - "Dashboard Docs Screenshots"
Cohesion: 0.19
Nodes (15): Analytical Scope Tabs (Full mocks, Subject wise, Sectional wise, All mocks), Subject Deep Dive Section Heading, Desktop Dashboard View ('Your preparation, in perspective.'), Persisted-Record Filter Bar (platform / subject / time), Headline Overview Metric Strip (Mocks completed / Average / Personal best / Accuracy), Quant Performance Trend Chart (subject score % vs last-5 average), Collapsible Paper Sidebar Shell (Workspace/Preferences groups), Subject Deep Dive Dual-Series Chart (accuracy % + time in minutes) (+7 more)

### Community 48 - "chat/route.ts"
Cohesion: 0.15
Nodes (29): bodySchema, maxDuration, POST(), runtime, maxDuration, POST(), runtime, bodySchema (+21 more)

### Community 49 - "Dashboard Populated Screenshots"
Cohesion: 0.23
Nodes (14): Stacked Attempt Record Cards (62.1% and 53.8%), Dashboard Populated with Two Saved Attempts, Full Mock Performance Trend Line Across Two Attempts, Latest Result Stat Unchanged at 62.1% While Aggregate Averages 57.9%, Aggregate Outcome Card (2 attempts, 452/780, 57.9% ring), Target Panel Snapshot Chart Showing Up 8.2 pp, Populated Where You Stand Radar Across Four Subjects, Platform and Time Filter Controls (+6 more)

### Community 50 - "Health, Audit, and DB Client"
Cohesion: 0.17
Nodes (9): dynamic, GET, HealthStatus, runtime, AuditEvent, healthSnapshot(), startedAt, database() (+1 more)

### Community 51 - "AI Subsystem Documentation"
Cohesion: 0.20
Nodes (8): Per-User Encrypted AI Credentials, AI provider (OpenAI-compatible fetch), AI API routes, AI subsystem, AiUsage quota ledger, SSRF Guard for User-Controlled AI Base URL, Vercel Configuration Preparation, AI Coach, Chat Drawer, and Assisted Paste

### Community 52 - "dashboard-view.tsx"
Cohesion: 0.25
Nodes (20): DashboardOverview(), Panel(), DashboardSkeleton(), DashboardView(), RecentAttemptsPanel(), DashboardPlanApi, PersonalTasksPanel(), PlanApi (+12 more)

### Community 53 - "Add Mock Screen Screenshots"
Cohesion: 0.18
Nodes (12): Additional Results Optional Collapsible Section, Include Computer Knowledge Toggle with Scoring Note, Log a Mock Screen, Manual vs Paste Report Mode Toggle, Mock Details Form (name, platform, attempt date, mock type), Log a Mock Page Header with Serif Title and Subtitle, Paper-and-Ink Palette (warm paper surfaces, ink text, terracotta accent), Section I / Section II Grouping Headers with Mark Totals (+4 more)

### Community 54 - "Domain Rules and Scoring"
Cohesion: 0.18
Nodes (4): Dashboard analytics payload (src/lib/analytics.ts), attemptSchema write contract, Domain rules (src/lib/domain.ts), HTTP API surface

### Community 55 - "Outcome Card Documentation"
Cohesion: 0.23
Nodes (12): Accuracy Footer Divisor Column (83.3% Accuracy), Marks Obtained (70/90) and Score Strip, Outcome Card Illustration (Reasoning), Outcome Counts with Proportion Bars (Correct / Incorrect / Unattempted), Percentile Availability Note ('No standalone subject percentile recorded'), Score-Centered Answer Distribution Ring (77.8% SCORE), Serif Subject Heading with Attempt/Question Subtitle, Soft-Rounded Warm Paper Card Surface (+4 more)

### Community 56 - "Filters and URL State"
Cohesion: 0.26
Nodes (11): useWorkspaceData(), api(), DashboardScope, Filters, filtersSchema, lenientFiltersSchema, mirrorsWorkspaceState(), parseWorkspaceState() (+3 more)

### Community 57 - "Report Parser and Domain Tests"
Cohesion: 0.15
Nodes (14): filterAttempts(), Attempt, MAIN_SUBJECT_IDS, optionalNumber, parseTime(), sectionIds, SECTIONS, SubjectId (+6 more)

### Community 58 - "Dashboard Overview Panels"
Cohesion: 0.20
Nodes (11): Workspace Sidebar Navigation (Study Planner / Results groups), AI Coach Read-Only Insight Card, Dashboard Overview in Empty Scope, My Tasks Personal Work Card, Panel Card Pattern with Icon Badge and Hairline Header Rule, Revision Queue Card (Rev-1 / Rev-2 / Rev-3 counts), Study Progress Card with Phase Buckets and Milestone, Today's Focus Checklist Card with Next Up Row (+3 more)

### Community 59 - "Study Planner Documentation"
Cohesion: 0.25
Nodes (5): Plan and task API routes, Plan view model (src/lib/plan/view-model.ts), Study planner subsystem, usePlanData, Built-in 50-Day Study Plan (26 Oct - 14 Dec 2026)

### Community 60 - "npm Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, db:generate, db:migrate, dev, lint, postinstall, start (+3 more)

### Community 61 - "acl-backup-222a02e6d1cf4dc7a775e6abab3be9b9.json.ps1"
Cohesion: 0.23
Nodes (17): Get-AceSet(), Get-Ancestors(), Get-HResultChain(), Get-IntegritySid(), Get-NormalizedPath(), Get-ObjectFacts(), Get-OwnDaclSddl(), Get-RepairRefusal() (+9 more)

### Community 62 - "acl-backup-7fb25f44b363442c9bd2fb0b0d27fd01.json.ps1"
Cohesion: 0.23
Nodes (17): Get-AceSet(), Get-Ancestors(), Get-HResultChain(), Get-IntegritySid(), Get-NormalizedPath(), Get-ObjectFacts(), Get-OwnDaclSddl(), Get-RepairRefusal() (+9 more)

### Community 64 - "Backup Route"
Cohesion: 0.33
Nodes (6): GET, maxDuration, runtime, privateHeaders, BACKUP_REQUEST_MAX_BYTES, exportBackup()

### Community 65 - "API Catch-All Route"
Cohesion: 0.25
Nodes (7): DELETE, dynamic, GET, PATCH, POST, PUT, runtime

### Community 66 - "acl-backup-8f9ea1d86716478694d366dd88ec19de.json.ps1"
Cohesion: 0.23
Nodes (17): Get-AceSet(), Get-Ancestors(), Get-HResultChain(), Get-IntegritySid(), Get-NormalizedPath(), Get-ObjectFacts(), Get-OwnDaclSddl(), Get-RepairRefusal() (+9 more)

### Community 67 - "Dashboard Data Screenshots"
Cohesion: 0.47
Nodes (6): Attempt Record Card with Score Ring and Marks/Accuracy, Dashboard Populated with One Saved Attempt, Latest Result Stat Showing 62.1% with Date and Marks, Empty State Block with Open History and Log a Mock Actions, Recent Attempts Card with Empty State, Overview Stat Strip (assignments, plan completed, tests ahead, latest result)

### Community 68 - "Icon System Migration"
Cohesion: 0.40
Nodes (6): Known Limitations (duo-icons fill-rule, native inputs), Design System Source-of-Truth Map, Icon Inconsistency Finding (14 ad-hoc sizes), Icon Size Scale (14/16/18/22/28), Named Imports for Bundle Reduction, Raw Lucide Imports Migrated into Semantic Icon Map

### Community 69 - "acl-backup-97163324db174117bef6d021de77d219.json.ps1"
Cohesion: 0.23
Nodes (17): Get-AceSet(), Get-Ancestors(), Get-HResultChain(), Get-IntegritySid(), Get-NormalizedPath(), Get-ObjectFacts(), Get-OwnDaclSddl(), Get-RepairRefusal() (+9 more)

### Community 70 - "ESLint Configuration"
Cohesion: 0.40
Nodes (4): eslint@^9.0.0, eslint-config-next@^16.0.0, eslint, eslint-config-next

### Community 71 - "Next.js Server Config"
Cohesion: 0.40
Nodes (4): cspDev, cspProduction, nextConfig, productionHeaders

### Community 72 - "Mobile Breakpoint Hook"
Cohesion: 0.70
Nodes (4): getServerSnapshot(), getSnapshot(), subscribe(), useIsMobile()

### Community 74 - "acl-backup-f4521a34a140499bba75b7ef81e202df.json.ps1"
Cohesion: 0.23
Nodes (17): Get-AceSet(), Get-Ancestors(), Get-HResultChain(), Get-IntegritySid(), Get-NormalizedPath(), Get-ObjectFacts(), Get-OwnDaclSddl(), Get-RepairRefusal() (+9 more)

### Community 75 - "Loading Skeletons"
Cohesion: 0.83
Nodes (3): DashboardSkeleton(), PanelSkeleton(), StatStripSkeleton()

### Community 77 - "PlainIcon"
Cohesion: 0.25
Nodes (15): AttemptOutcomeCard(), AttemptRecordCard(), outcomes, percent(), ScoreRing(), subjectIcons, PlainIcon(), DayAttempts() (+7 more)

### Community 78 - "clsx"
Cohesion: 0.19
Nodes (7): clsx@^2.1.1, @neondatabase/serverless@^1.2.0, zod, overrides, @neondatabase/auth, clsx, @neondatabase/serverless

### Community 80 - "attempt-persistence.ts"
Cohesion: 0.21
Nodes (10): attemptData(), attemptInclude, attemptWhere(), escapeLike(), mapSubjects(), StoredAnalyticsAttempt, StoredAttempt, toAnalyticsAttempt() (+2 more)

### Community 81 - "extraction-review.tsx"
Cohesion: 0.27
Nodes (10): ExtractionReview(), update(), updateSubject(), FieldIssues(), NullableDuration(), optionalNumber(), blankExtractedSubject(), ExtractedSubjectDraft (+2 more)

### Community 82 - "repository.ts"
Cohesion: 0.24
Nodes (11): attemptFingerprint(), attemptLabel(), BACKUP_INSERT_CHUNK_SIZE, ImportOptions, ParsedBackup, planImport(), duplicateKey(), chunks() (+3 more)

### Community 83 - "tasks/route.ts"
Cohesion: 0.36
Nodes (7): GET, POST, runtime, createPersonalTask(), listPersonalTasks(), PersonalTaskCreate, toView()

### Community 84 - "task-suggestion.ts"
Cohesion: 0.32
Nodes (7): CATEGORIES, isHttpUrl(), ParsedChatContent, parseSuggestionBody(), parseTaskSuggestions(), PRIORITIES, TaskSuggestion

### Community 85 - "publicOrigin"
Cohesion: 0.52
Nodes (3): GET(), publicOrigin(), publicUrl()

### Community 97 - "istTodayIso"
Cohesion: 0.47
Nodes (5): GET, runtime, planHref(), getPlanPayload(), istTodayIso()

### Community 98 - "No Zustand and no TanStack Query decision"
Cohesion: 0.40
Nodes (3): In-Process Settings LRU Cache, Opt-In SWR Headers for Non-App Consumers, URL State Mirror (filters/scope in address bar)

### Community 99 - "useKeyboardShortcuts"
Cohesion: 0.50
Nodes (4): Handlers, useKeyboardShortcuts(), isTypingTarget(), onKey()

## Ambiguous Edges - Review These
- `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` → `Private Accounts Release Notes`  [AMBIGUOUS]
  docs/ui-overhaul/phase-1-audit.md · relation: conceptually_related_to
- `SSC Insight` → `(workspace) route group`  [AMBIGUOUS]
  PRODUCT.md · relation: conceptually_related_to
- `Dashboard analytics payload (src/lib/analytics.ts)` → `Outcome card ring center semantics`  [AMBIGUOUS]
  DESIGN.md · relation: conceptually_related_to
- `Density-Driven Marker Pattern (text labels on desktop, dots on mobile)` → `October 2026 Seven-Column Month Grid`  [AMBIGUOUS]
  calendar-desktop.png · relation: conceptually_related_to
- `Outcome Card with Score-Centered Answer Distribution Ring` → `Section I / Section II Grouping Headers with Mark Totals`  [AMBIGUOUS]
  add-prefill.png · relation: conceptually_related_to

## Knowledge Gaps
- **79 isolated node(s):** `RFC-1918`, `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages`, `Health Endpoint Rate-Limit-Exempt (/api/health)`, `Firebase/Mongo Runtime Dependencies Removed` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 477 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Auth Routes and Session` to `calendar-view.tsx`, `AI Extract and Status Routes`, `Root Layout and Appearance`, `Next.js Server Config`, `Access Log and Middleware`, `PlainIcon`, `app-shell.tsx`, `Landing Page and Icon System`, `workspace-shell.tsx`, `dashboard-view.tsx`, `publicOrigin`, `dependencies`, `Filters and URL State`, `Analytics Route and Rate Limits`, `lucide-react`, `Development Toolchain`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `RFC-1918`, `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages` to the rest of the system?**
  _79 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `calendar-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09016393442622951 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `ai.test.ts` to `AI Extract and Status Routes`, `AI Credentials and SSRF Guard`, `Study Plan Source Data`, `Backup Format and Import`, `Plan and Task API Routes`, `mock-attempts/[id]/route.ts`, `AI Extraction Review`, `Settings Route and LRU Cache`, `chat/route.ts`, `dependencies`, `Report Parser and Domain Tests`, `Development Toolchain`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `Caching and Revalidation Policy` be split into smaller, more focused modules?**
  _Cohesion score 0.057912457912457915 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` and `Private Accounts Release Notes`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `SSC Insight` and `(workspace) route group`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._