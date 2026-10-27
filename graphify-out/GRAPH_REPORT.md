# Graph Report - ssc-insight-2  (2026-10-27)

## Corpus Check
- 217 files · ~196,687 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1878 nodes · 4702 edges · 138 communities (64 shown, 74 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Token Bucket Rate Limiter
- AI Provider Transport and Errors
- Chat State and Session Verification
- Recoverable UI Error Boundaries
- Target Settings and LRU Cache
- AI Credentials and Endpoint Safety
- Workspace Orchestration and Controls
- Landing Appearance and Theme Controls
- Versioned Personal Todo Persistence
- Study Plan Progress APIs
- Personal Calendar and Shared Queries
- Portable Backup Validation and Import
- Performance Charts and Outcome Cards
- Request Proxy and Public Origins
- Guarded Routes and Rate Limits
- Shared Sidebar UI Primitives
- Study Calendar and Daily Tasks
- Responsive AI Sheet Composition
- Root Layout Fonts and Toasts
- Attempt Repository and Persistence Mapping
- AI Context Quotas and Schemas
- Application Sidebar and Header
- Analytical Projections and Subject Statistics
- Daily Study Workspace
- Static Study Plan Schema
- AI Performance Context
- Dashboard Plan and Overview Composition
- Auth Session Guards and Policy
- Attempt CRUD Audit and Health
- Extraction Normalization and Evidence
- AI Prompts and Screen Context
- Reviewed AI Todo Proposals
- IST Daily AI Usage Ledger
- AI Configuration and Connection Testing
- Workspace Data and URL Filters
- Scoring and Report Parsing
- Safe Chat Task Suggestion Parsing
- Authenticated Workspace Shell
- Mock Entry Form and Validation
- Authenticated AI Route Handlers
- Browser Integration and Icon Tooling
- API Envelope and Body Validation
- Scope Projection and Target Tests
- Account Integration Verification
- Mock Listing and Analytics APIs
- Editable Extraction Review Workflow
- Maintenance and Not Found Pages
- Backup Download and Import Route
- Responsive Mobile Detection
- Dashboard Loading Skeletons
- Paper Design System Handbook
- Setup and Operations Handbook
- Primary Architecture Handbook
- Paper Tokens and Design Handover
- Mirrored Architecture Handbook
- Product Workflows and Privacy
- Migration Ownership and Cache Policies
- PostCSS Build Configuration
- Lint Formatting and Build Tooling
- TypeScript Compiler Configuration
- Shadcn Aliases and Tailwind Configuration
- Continuous Integration Validation Workflow
- NPM Development and Migration Commands
- Dated Todo Implementation Plan
- Next Configuration and Security Headers
- Application Runtime Dependencies
- Prisma Environment Configuration
- Neon Service Configuration
- Encrypted Credentials and SSRF Guard
- Generated Next Agent Rules
- Filter URL State Mirror
- Vercel Migration Configuration
- Accessibility Focus and Skip Navigation
- Built In Fifty Day Plan
- Coach Chat and Assisted Paste
- Dashboard and Outcome Visual References
- Neon Ownership Migration and QA
- Tracker Analytics and Backup Principles
- Semantic Icon Migration and Conventions
- UI Audit and Refactoring History
- Private Caching and Optional SWR

## God Nodes (most connected - your core abstractions)
1. `SSC Insight Architecture` - 104 edges
2. `SSC Insight Architecture` - 104 edges
3. `README.md SSC Insight` - 73 edges
4. `Button()` - 61 edges
5. `cn()` - 60 edges
6. `PlainIcon()` - 60 edges
7. `database()` - 50 edges
8. `readBody()` - 45 edges
9. `react` - 45 edges
10. `DESIGN.md SSC Insight` - 43 edges

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

## Communities (138 total, 74 thin omitted)

### Community 24 - "AI Provider Transport and Errors"
Cohesion: 0.21
Nodes (23): AiError, AiErrorCode, AiProvider, AiUsage, JsonModeUnsupported, RequestArgs, aiAborted(), aiInvalidOutput() (+15 more)

### Community 8 - "Chat State and Session Verification"
Cohesion: 0.13
Nodes (20): NdjsonDecoder, AiResponseUsage, AiStatus, AiUsageSummary, AiView, ChatMessage, CoachMeta, CoachResponse (+12 more)

### Community 59 - "Recoverable UI Error Boundaries"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, ErrorFallback()

### Community 42 - "Target Settings and LRU Cache"
Cohesion: 0.17
Nodes (9): LruCache, Entry, getSettings(), saveSettings(), GET, PUT, runtime, settingsSchema (+1 more)

### Community 0 - "AI Credentials and Endpoint Safety"
Cohesion: 0.05
Nodes (64): Catalog, Form, Props, AiCredentialSummary, AiModelsResponse, AiSettingsResponse, AiConnectionInput, AiCredentialInput (+56 more)

### Community 1 - "Workspace Orchestration and Controls"
Cohesion: 0.10
Nodes (36): DuoIcon, IconEntry, IconTone, SettingsPanelsProps, Attempt, AiCoachCard(), Bullets(), ConnectedAuthControl() (+28 more)

### Community 10 - "Landing Appearance and Theme Controls"
Cohesion: 0.08
Nodes (36): PaletteId, StyleId, ThemePrefs, LandingPage(), SignInPage(), AppearancePanel(), PaletteChip(), StyleGlyph() (+28 more)

### Community 11 - "Versioned Personal Todo Persistence"
Cohesion: 0.10
Nodes (30): TodoSubtask, Tx, applyTodos(), calendarCounts(), completionState(), normalizeSubtasks(), todoCalendarWhere(), createTodo() (+22 more)

### Community 13 - "Study Plan Progress APIs"
Cohesion: 0.09
Nodes (35): PersonalTaskCreate, TaskPatch, PlanTaskStatus, getPlanDays(), getStudyPlan(), createPersonalTask(), deletePersonalTask(), getPlanPayload() (+27 more)

### Community 14 - "Personal Calendar and Shared Queries"
Cohesion: 0.10
Nodes (24): PersonalTaskInput, PlanApi, PlanDataApi, TaskPatchInput, Entry, Store, PlanPayload, GroupRow() (+16 more)

### Community 15 - "Portable Backup Validation and Import"
Cohesion: 0.08
Nodes (33): BackupError, BackupPreview, BackupSettings, BackupSummary, BackupV2, ImportMode, ImportPlan, ImportResult (+25 more)

### Community 16 - "Performance Charts and Outcome Cards"
Cohesion: 0.16
Nodes (26): TrendRow, ChartConfig, ChartContextProps, TooltipNameType, AttemptOutcomeCard(), EmptyChart(), AttemptCards(), DeepDive() (+18 more)

### Community 17 - "Request Proxy and Public Origins"
Cohesion: 0.14
Nodes (23): AccessLogEvent, EnvLike, RouteAccess, RouteArea, RouteClass, GET(), accessLog(), bypassesMaintenance() (+15 more)

### Community 18 - "Guarded Routes and Rate Limits"
Cohesion: 0.13
Nodes (24): RequestError, Bucket, RateLimitResult, RouteContext, RouteOptions, RouteResult, okCached(), clientIp() (+16 more)

### Community 19 - "Shared Sidebar UI Primitives"
Cohesion: 0.15
Nodes (17): SidebarContextProps, PageHeader(), cn(), Input, Separator, SidebarContext, SidebarGroupAction, SidebarInput (+9 more)

### Community 2 - "Study Calendar and Daily Tasks"
Cohesion: 0.09
Nodes (50): CalendarMode, PersonalTaskDisplayStatus, TaskFilter, PlanTaskType, PersonalTaskView, PlanTaskView, RevisionItem, AgendaList() (+42 more)

### Community 20 - "Responsive AI Sheet Composition"
Cohesion: 0.10
Nodes (31): AiSheetTaskApi, DraftResponse, Group, Proposal, Response, Subtask, Todo, TodoData (+23 more)

### Community 21 - "Root Layout Fonts and Toasts"
Cohesion: 0.10
Nodes (22): Toast, ToastApi, ToastTone, RootLayout(), ThemeProvider(), ToastCard(), ToastProvider(), ToastViewport() (+14 more)

### Community 22 - "Attempt Repository and Persistence Mapping"
Cohesion: 0.15
Nodes (22): StoredAnalyticsAttempt, StoredAttempt, ImportOptions, ParsedBackup, attemptData(), attemptWhere(), escapeLike(), mapSubjects() (+14 more)

### Community 26 - "AI Context Quotas and Schemas"
Cohesion: 0.13
Nodes (17): AiQuotaLimits, AiQuotaUsage, ReservationPlan, AiExtractionFixture, buildAiContext(), chargedOnFailure(), reservationTokens(), extractJsonText() (+9 more)

### Community 27 - "Application Sidebar and Header"
Cohesion: 0.17
Nodes (23): AppView, AppFrame(), AppHeader(), AppSidebar(), initials(), NavItem(), planHref(), useSidebar() (+15 more)

### Community 30 - "Analytical Projections and Subject Statistics"
Cohesion: 0.16
Nodes (21): AnswerStack, DeepDiveSubject, PerformancePoint, TargetSnapshot, TrendSeries, WhereYouStandRow, analyze(), average() (+13 more)

### Community 31 - "Daily Study Workspace"
Cohesion: 0.23
Nodes (15): IconName, AttemptRecordCard(), percent(), ScoreRing(), PlainIcon(), DayAttempts(), DayNotes(), PlanDayView() (+7 more)

### Community 32 - "Static Study Plan Schema"
Cohesion: 0.11
Nodes (12): PlanDay, PlanTask, StudyPlan, parsePlanTaskKey(), parsed, planChecklistItemSchema, planDaySchema, planRevisionSchema (+4 more)

### Community 33 - "AI Performance Context"
Cohesion: 0.25
Nodes (9): AnalyticsAttempt, average(), fullMockProfile(), payload(), recentFullMock(), sectionProfile(), subjectProfile(), sectionIds (+1 more)

### Community 34 - "Dashboard Plan and Overview Composition"
Cohesion: 0.20
Nodes (21): DashboardPlanApi, PlanApi, PlanWithToday, Analytics, PlanDayView, DashboardOverview(), DashboardSkeleton(), DashboardView() (+13 more)

### Community 35 - "Auth Session Guards and Policy"
Cohesion: 0.18
Nodes (13): Context, AccountUser, LookupResult, SessionError, devHandle(), handle(), devAuthBypassActive(), devBypassUser() (+5 more)

### Community 36 - "Attempt CRUD Audit and Health"
Cohesion: 0.14
Nodes (17): HealthStatus, AuditEvent, audit(), healthSnapshot(), database(), deleteAttempt(), getAttempt(), dynamic (+9 more)

### Community 37 - "Extraction Normalization and Evidence"
Cohesion: 0.16
Nodes (18): ExtractedSubjectDraft, ExtractionIssue, deriveCounts(), deriveQuestions(), exactInteger(), inferType(), issue(), localIssues() (+10 more)

### Community 40 - "AI Prompts and Screen Context"
Cohesion: 0.16
Nodes (15): AiScreenContext, AiContext, SanitizedReport, AiMessage, parseExtraction(), chatMessages(), coachMessages(), contextBlock() (+7 more)

### Community 41 - "Reviewed AI Todo Proposals"
Cohesion: 0.20
Nodes (14): Target, TodoProposal, loadAiContext(), parseTodoProposals(), todoDraftMessages(), parse(), maxDuration, POST (+6 more)

### Community 43 - "IST Daily AI Usage Ledger"
Cohesion: 0.22
Nodes (12): ReservationInput, Settlement, aiBusy(), aiQuotaExceeded(), planReservation(), dayKey(), nextIstMidnight(), secondsUntilIstMidnight() (+4 more)

### Community 46 - "AI Configuration and Connection Testing"
Cohesion: 0.20
Nodes (12): AiConfig, Env, ResolvedAiConfig, integerEnv(), normaliseBaseUrl(), readAiConfig(), resolveAiConfig(), maxDuration (+4 more)

### Community 50 - "Workspace Data and URL Filters"
Cohesion: 0.20
Nodes (14): DashboardScope, Filters, WorkspaceUrlState, useWorkspaceData(), mirrorsWorkspaceState(), parseWorkspaceState(), safeWorkspaceReturnTo(), serializeWorkspaceState() (+6 more)

### Community 54 - "Scoring and Report Parsing"
Cohesion: 0.15
Nodes (18): AttemptInput, SectionId, SubjectId, SubjectResult, duplicateKey(), parseTime(), subjectStats(), numberAfter() (+10 more)

### Community 63 - "Safe Chat Task Suggestion Parsing"
Cohesion: 0.32
Nodes (7): ParsedChatContent, TaskSuggestion, isHttpUrl(), parseSuggestionBody(), parseTaskSuggestions(), CATEGORIES, PRIORITIES

### Community 70 - "Authenticated Workspace Shell"
Cohesion: 0.15
Nodes (20): LogMockPayload, Handlers, WorkspaceLayout(), AddMockView(), DateRangeFilter(), PrivateWorkspace(), viewTransition(), useToast() (+12 more)

### Community 23 - "Mock Entry Form and Validation"
Cohesion: 0.19
Nodes (21): DurationInput(), change(), formatParts(), blankSubject(), fullMockSectionHeading(), MockForm(), applyAiDraft(), applyExtracted() (+13 more)

### Community 29 - "Authenticated AI Route Handlers"
Cohesion: 0.19
Nodes (20): POST(), POST(), POST(), GET(), aiConfig(), aiConfigOrNull(), aiNotConfigured(), encodeNdjson() (+12 more)

### Community 39 - "Browser Integration and Icon Tooling"
Cohesion: 0.12
Nodes (8): packageDir, REPLACEMENTS, targets, root, logs, pending, target, ws

### Community 47 - "API Envelope and Body Validation"
Cohesion: 0.26
Nodes (6): ok(), privateJson(), readBody(), POST, POST, zod

### Community 48 - "Scope Projection and Target Tests"
Cohesion: 0.15
Nodes (12): filterAttempts(), targetMarks(), targetPercentage(), all, english, full, ga, quant (+4 more)

### Community 49 - "Account Integration Verification"
Cohesion: 0.11
Nodes (18): api(), backup(), preview(), raw(), replace(), api(), raw(), api() (+10 more)

### Community 52 - "Mock Listing and Analytics APIs"
Cohesion: 0.38
Nodes (6): createAttempt(), listAttempts(), GET, POST, runtime, LIST_ATTEMPTS_MAX

### Community 57 - "Editable Extraction Review Workflow"
Cohesion: 0.36
Nodes (8): ExtractionReview(), update(), updateSubject(), FieldIssues(), NullableDuration(), optionalNumber(), blankExtractedSubject(), validateExtractionDraft()

### Community 61 - "Maintenance and Not Found Pages"
Cohesion: 0.25
Nodes (4): lucide-react@^0.468.0, metadata, metadata, lucide-react

### Community 62 - "Backup Download and Import Route"
Cohesion: 0.29
Nodes (7): exportBackup(), invalidateSettings(), GET, maxDuration, runtime, privateHeaders, BACKUP_REQUEST_MAX_BYTES

### Community 71 - "Responsive Mobile Detection"
Cohesion: 0.53
Nodes (5): getServerSnapshot(), getSnapshot(), subscribe(), useIsMobile(), SidebarProvider

### Community 74 - "Dashboard Loading Skeletons"
Cohesion: 0.83
Nodes (3): DashboardSkeleton(), PanelSkeleton(), StatStripSkeleton()

### Community 51 - "Paper Tokens and Design Handover"
Cohesion: 0.20
Nodes (8): Multi-Theme System (data-palette x data-style), Palettes x Styles Theme Matrix, Typography Scale (Source Serif 4 + DM Sans), Missing Radius System Finding, Elevation Model and --shadow-pop Token, Restrained Motion Language, Tokenized Radius Scale (panel/control/card/pill), Sticky Identity Column for Mock History

### Community 4 - "Migration Ownership and Cache Policies"
Cohesion: 0.06
Nodes (45): AI Status Endpoint Cache Policy (/api/ai/status), Analytics Projections Cache Policy (/api/analytics), api() Client Fetch cache: no-store (src/lib/api-client.ts), Backup Export Raw File Exception (GET /api/backup), Filters/Scope URL State Mirror (src/lib/filters-url.ts), force-dynamic Public Auth-Adjacent Pages, Health Endpoint Rate-Limit-Exempt (/api/health), private, no-store Baseline via ok() in src/lib/api.ts (+37 more)

### Community 28 - "Lint Formatting and Build Tooling"
Cohesion: 0.09
Nodes (23): devDependencies, eslint@^9.0.0, eslint-config-next@^16.0.0, prettier@^3.9.10, tailwindcss@^4.0.0, @tailwindcss/postcss@^4.0.0, tsx@^4.20.0, @types/node@^22.0.0 (+15 more)

### Community 38 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 44 - "Shadcn Aliases and Tailwind Configuration"
Cohesion: 0.12
Nodes (15): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+7 more)

### Community 45 - "Continuous Integration Validation Workflow"
Cohesion: 0.12
Nodes (15): jobs, validate, name, permissions, contents, run, uses, with (+7 more)

### Community 56 - "NPM Development and Migration Commands"
Cohesion: 0.18
Nodes (11): scripts, build, db:generate, db:migrate, dev, lint, postinstall, start (+3 more)

### Community 58 - "Dated Todo Implementation Plan"
Cohesion: 0.20
Nodes (9): Confirmed requirements, Dated personal todos and AI-assisted planning, Existing foundation, Finalized navigation and lifecycle, Phase 1 — Design the dated planner and review flow, Phase 2 — Extend task storage and manual workflows, Phase 3 — Add AI proposal and confirmed-apply workflows, Phase 4 — Validate and document (+1 more)

### Community 69 - "Next Configuration and Security Headers"
Cohesion: 0.40
Nodes (4): cspDev, cspProduction, nextConfig, productionHeaders

### Community 7 - "Application Runtime Dependencies"
Cohesion: 0.05
Nodes (51): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, @duo-icons/react@^1.0.1, motion@^12.0.0, @neon/env@^1.6.4, @neondatabase/auth@0.7.0-beta, @neondatabase/serverless@^1.2.0 (+43 more)

### Community 25 - "Dashboard and Outcome Visual References"
Cohesion: 0.12
Nodes (25): Accuracy Footer Divisor Column (83.3% Accuracy), Marks Obtained (70/90) and Score Strip, Outcome Card Illustration (Reasoning), Outcome Counts with Proportion Bars (Correct / Incorrect / Unattempted), Percentile Availability Note ('No standalone subject percentile recorded'), Score-Centered Answer Distribution Ring (77.8% SCORE), Serif Subject Heading with Attempt/Question Subtitle, Soft-Rounded Warm Paper Card Surface (+17 more)

### Community 55 - "Neon Ownership Migration and QA"
Cohesion: 0.20
Nodes (10): Request and Ownership Architecture, Neon Agent Tooling Setup (Codex plugin + MCP), Expiring QA Branch Migration Rehearsal, Selected Neon Environment (org/project/branch), Private-Accounts Migration (claim two shared mocks), Session-Derived Ownership Model, Isolation and Ownership Verification, Google Sign-In via Neon Auth OAuth (+2 more)

### Community 60 - "Tracker Analytics and Backup Principles"
Cohesion: 0.25
Nodes (5): Dashboard Analytical Scopes (full/subject/sectional/all), Backup Format v2 and Account Transfer, Semantic Chart Palette and Chart Rules, Core Product Workflows, JSON Backup Format Version 2

### Community 64 - "Semantic Icon Migration and Conventions"
Cohesion: 0.40
Nodes (6): Known Limitations (duo-icons fill-rule, native inputs), Design System Source-of-Truth Map, Icon Inconsistency Finding (14 ad-hoc sizes), Icon Size Scale (14/16/18/22/28), Named Imports for Bundle Reduction, Raw Lucide Imports Migrated into Semantic Icon Map

### Community 68 - "UI Audit and Refactoring History"
Cohesion: 0.50
Nodes (5): WorkspaceShell Client Orchestrator and Its Three Hooks, dashboard.tsx Monolith Split Finding, UI Baseline Audit Findings (26 prioritized items), 15-Phase Execution Order, Unified Segmented Control (.segment-group)

## Ambiguous Edges - Review These
- `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` → `Private Accounts Release Notes`  [AMBIGUOUS]
  docs/ui-overhaul/phase-1-audit.md · relation: conceptually_related_to

## Knowledge Gaps
- **36 isolated node(s):** `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages`, `Health Endpoint Rate-Limit-Exempt (/api/health)`, `Firebase/Mongo Runtime Dependencies Removed`, `Neon OAuth MCP Server (https://mcp.neon.tech/mcp)` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 674 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **74 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Authenticated Workspace Shell` to `Workspace Orchestration and Controls`, `Study Calendar and Daily Tasks`, `Dashboard Plan and Overview Composition`, `Next Configuration and Security Headers`, `Application Runtime Dependencies`, `Recoverable UI Error Boundaries`, `Landing Appearance and Theme Controls`, `API Envelope and Body Validation`, `Request Proxy and Public Origins`, `Workspace Data and URL Filters`, `Guarded Routes and Rate Limits`, `Root Layout Fonts and Toasts`, `Application Sidebar and Header`, `Maintenance and Not Found Pages`, `Daily Study Workspace`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages`, `Health Endpoint Rate-Limit-Exempt (/api/health)` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chat State and Session Verification` be split into smaller, more focused modules?**
  _Cohesion score 0.12807881773399016 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `API Envelope and Body Validation` to `AI Credentials and Endpoint Safety`, `Static Study Plan Schema`, `Attempt CRUD Audit and Health`, `Extraction Normalization and Evidence`, `Application Runtime Dependencies`, `AI Prompts and Screen Context`, `Reviewed AI Todo Proposals`, `Target Settings and LRU Cache`, `Versioned Personal Todo Persistence`, `Study Plan Progress APIs`, `Portable Backup Validation and Import`, `Guarded Routes and Rate Limits`, `Scoring and Report Parsing`, `AI Context Quotas and Schemas`, `Authenticated AI Route Handlers`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `AI Credentials and Endpoint Safety` be split into smaller, more focused modules?**
  _Cohesion score 0.053728949478749 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Workspace Orchestration and Controls` to `AI Credentials and Endpoint Safety`, `Study Calendar and Daily Tasks`, `Application Runtime Dependencies`, `Chat State and Session Verification`, `Landing Appearance and Theme Controls`, `Personal Calendar and Shared Queries`, `Portable Backup Validation and Import`, `Performance Charts and Outcome Cards`, `Shared Sidebar UI Primitives`, `Responsive AI Sheet Composition`, `Root Layout Fonts and Toasts`, `Mock Entry Form and Validation`, `Daily Study Workspace`, `Dashboard Plan and Overview Composition`, `Workspace Data and URL Filters`, `Editable Extraction Review Workflow`, `Recoverable UI Error Boundaries`, `Authenticated Workspace Shell`, `Responsive Mobile Detection`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` and `Private Accounts Release Notes`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._