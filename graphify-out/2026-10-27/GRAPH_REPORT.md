# Graph Report - ssc-insight-2  (2026-10-27)

## Corpus Check
- 222 files · ~149,334 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .css 2, .example 1)

## Summary
- 1878 nodes · 4705 edges · 138 communities (64 shown, 74 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d6f4569a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AI Credentials and Endpoint Safety
- Workspace Orchestration and Controls
- Study Calendar and Daily Tasks
- Setup and Operations Handbook
- Migration Ownership and Cache Policies
- Primary Architecture Handbook
- Mirrored Architecture Handbook
- Application Runtime Dependencies
- Chat State and Session Verification
- Product Workflows and Privacy
- Landing Appearance and Theme Controls
- Versioned Personal Todo Persistence
- Paper Design System Handbook
- Study Plan Progress APIs
- personal-todos.tsx
- Portable Backup Validation and Import
- Performance Charts and Outcome Cards
- Request Proxy and Public Origins
- Guarded Routes and Rate Limits
- Shared Sidebar UI Primitives
- Responsive AI Sheet Composition
- Root Layout Fonts and Toasts
- Attempt Repository and Persistence Mapping
- Mock Entry Form and Validation
- AI Provider Transport and Errors
- Dashboard and Outcome Visual References
- AI Context Quotas and Schemas
- Application Sidebar and Header
- Lint Formatting and Build Tooling
- Authenticated AI Route Handlers
- Analytical Projections and Subject Statistics
- icon.tsx
- Static Study Plan Schema
- AI Performance Context
- Dashboard Plan and Overview Composition
- Auth Session Guards and Policy
- Attempt CRUD Audit and Health
- Extraction Normalization and Evidence
- TypeScript Compiler Configuration
- Browser Integration and Icon Tooling
- AI Prompts and Screen Context
- Reviewed AI Todo Proposals
- Target Settings and LRU Cache
- IST Daily AI Usage Ledger
- Shadcn Aliases and Tailwind Configuration
- Continuous Integration Validation Workflow
- AI Configuration and Connection Testing
- API Envelope and Body Validation
- Scope Projection and Target Tests
- Account Integration Verification
- Workspace Data and URL Filters
- Paper Tokens and Design Handover
- Mock Listing and Analytics APIs
- Scoring and Report Parsing
- Neon Ownership Migration and QA
- NPM Development and Migration Commands
- Editable Extraction Review Workflow
- Dated Todo Implementation Plan
- Recoverable UI Error Boundaries
- Tracker Analytics and Backup Principles
- Maintenance and Not Found Pages
- Backup Download and Import Route
- Safe Chat Task Suggestion Parsing
- Semantic Icon Migration and Conventions
- UI Audit and Refactoring History
- Next Configuration and Security Headers
- Authenticated Workspace Shell
- Responsive Mobile Detection
- Prisma Environment Configuration
- Dashboard Loading Skeletons
- Token Bucket Rate Limiter
- Private Caching and Optional SWR
- Neon Service Configuration
- Encrypted Credentials and SSRF Guard
- PostCSS Build Configuration
- Generated Next Agent Rules
- Filter URL State Mirror
- Vercel Migration Configuration
- Accessibility Focus and Skip Navigation
- Built In Fifty Day Plan
- Coach Chat and Assisted Paste

## God Nodes (most connected - your core abstractions)
1. `SSC Insight Architecture` - 104 edges
2. `SSC Insight Architecture` - 104 edges
3. `README.md SSC Insight` - 73 edges
4. `Button()` - 61 edges
5. `PlainIcon()` - 60 edges
6. `cn()` - 60 edges
7. `database()` - 50 edges
8. `react` - 45 edges
9. `readBody()` - 45 edges
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

### Community 0 - "AI Credentials and Endpoint Safety"
Cohesion: 0.05
Nodes (64): RFC-1918, maxDuration, POST, runtime, DELETE, GET, PUT, runtime (+56 more)

### Community 1 - "Workspace Orchestration and Controls"
Cohesion: 0.13
Nodes (17): radix-ui, AiCoachCard(), Bullets(), ConnectedAuthControl(), BackupPreviewCard(), SettingsPanels(), SettingsPanelsProps, Button() (+9 more)

### Community 2 - "Study Calendar and Daily Tasks"
Cohesion: 0.09
Nodes (57): PlainIcon(), AgendaList(), CalendarMode, CalendarView(), clampToPlan(), MODES, MonthView(), SelectedDayAgenda() (+49 more)

### Community 4 - "Migration Ownership and Cache Policies"
Cohesion: 0.06
Nodes (45): AI Status Endpoint Cache Policy (/api/ai/status), Analytics Projections Cache Policy (/api/analytics), api() Client Fetch cache: no-store (src/lib/api-client.ts), Backup Export Raw File Exception (GET /api/backup), Next.js 16 Cache Components Not Enabled, Caching and Revalidation Policy (Phase 8 reference), Filters/Scope URL State Mirror (src/lib/filters-url.ts), force-dynamic Public Auth-Adjacent Pages (+37 more)

### Community 7 - "Application Runtime Dependencies"
Cohesion: 0.05
Nodes (51): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, @duo-icons/react@^1.0.1, motion@^12.0.0, @neon/env@^1.6.4, @neondatabase/auth@0.7.0-beta, @neondatabase/serverless@^1.2.0 (+43 more)

### Community 8 - "Chat State and Session Verification"
Cohesion: 0.13
Nodes (20): newId(), trimChatHistory(), useAiWorkspace(), chatBaseForSend(), AI_VIEWS, AiResponseUsage, AiStatus, AiUsageSummary (+12 more)

### Community 10 - "Landing Appearance and Theme Controls"
Cohesion: 0.08
Nodes (36): motion, @react-spring/web, dynamic, LandingPage(), dynamic, SignInPage(), AppearancePanel(), PaletteChip() (+28 more)

### Community 11 - "Versioned Personal Todo Persistence"
Cohesion: 0.10
Nodes (30): POST, GET, runtime, DELETE, PATCH, runtime, GET, POST (+22 more)

### Community 13 - "Study Plan Progress APIs"
Cohesion: 0.09
Nodes (35): mutationSchema, POST, runtime, GET, runtime, DELETE, idSchema, PUT (+27 more)

### Community 14 - "personal-todos.tsx"
Cohesion: 0.10
Nodes (25): PersonalCalendar(), personalMonthRange(), DraftResponse, Group, GroupRow(), OverdueTodoPreview(), PersonalTodos(), mutate() (+17 more)

### Community 15 - "Portable Backup Validation and Import"
Cohesion: 0.08
Nodes (33): assertSummary(), BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_MAX_ATTEMPTS, BACKUP_MAX_BYTES, BACKUP_SAMPLE_LIMIT, BackupError, BackupPreview (+25 more)

### Community 16 - "Performance Charts and Outcome Cards"
Cohesion: 0.11
Nodes (42): AttemptOutcomeCard(), AttemptRecordCard(), outcomes, percent(), ScoreRing(), subjectIcons, CompareView, EmptyChart() (+34 more)

### Community 17 - "Request Proxy and Public Origins"
Cohesion: 0.14
Nodes (23): GET(), accessLog(), AccessLogEvent, bypassesMaintenance(), classifyPath(), EnvLike, maintenanceActive(), maintenanceRetryAfter() (+15 more)

### Community 18 - "Guarded Routes and Rate Limits"
Cohesion: 0.13
Nodes (24): DELETE, dynamic, GET, PATCH, POST, PUT, runtime, DELETE (+16 more)

### Community 19 - "Shared Sidebar UI Primitives"
Cohesion: 0.15
Nodes (17): PageHeader(), Input, Separator, SidebarContext, SidebarContextProps, SidebarGroupAction, SidebarInput, SidebarMenuAction (+9 more)

### Community 20 - "Responsive AI Sheet Composition"
Cohesion: 0.14
Nodes (23): AiChatSheet(), AiSheetTaskApi, ChatBubble(), CoachChatTab(), inlineNodes(), LogMockTab(), MessageContent(), QUICK_QUESTIONS (+15 more)

### Community 21 - "Root Layout Fonts and Toasts"
Cohesion: 0.10
Nodes (22): @fontsource-variable/dm-sans@^5.3.0, @fontsource-variable/source-serif-4@^5.3.1, next-themes@^0.4.6, @vercel/analytics@^2.0.1, @vercel/speed-insights@^2.0.0, @fontsource-variable/dm-sans, @fontsource-variable/source-serif-4, next-themes (+14 more)

### Community 22 - "Attempt Repository and Persistence Mapping"
Cohesion: 0.15
Nodes (22): attemptData(), attemptInclude, attemptWhere(), escapeLike(), mapSubjects(), StoredAnalyticsAttempt, StoredAttempt, toAnalyticsAttempt() (+14 more)

### Community 23 - "Mock Entry Form and Validation"
Cohesion: 0.19
Nodes (21): DurationInput(), change(), formatParts(), blankSubject(), fullMockSectionHeading(), MockForm(), applyAiDraft(), applyExtracted() (+13 more)

### Community 24 - "AI Provider Transport and Errors"
Cohesion: 0.21
Nodes (23): aiAborted(), AiError, AiErrorCode, aiInvalidOutput(), aiProviderError(), aiTimeout(), AiProvider, AiUsage (+15 more)

### Community 25 - "Dashboard and Outcome Visual References"
Cohesion: 0.12
Nodes (25): Accuracy Footer Divisor Column (83.3% Accuracy), Marks Obtained (70/90) and Score Strip, Outcome Card Illustration (Reasoning), Outcome Counts with Proportion Bars (Correct / Incorrect / Unattempted), Percentile Availability Note ('No standalone subject percentile recorded'), Score-Centered Answer Distribution Ring (77.8% SCORE), Serif Subject Heading with Attempt/Question Subtitle, Soft-Rounded Warm Paper Card Surface (+17 more)

### Community 26 - "AI Context Quotas and Schemas"
Cohesion: 0.13
Nodes (17): maxDuration, runtime, buildAiContext(), AiQuotaLimits, AiQuotaUsage, chargedOnFailure(), CONTEXT_TOKEN_ESTIMATE, ReservationPlan (+9 more)

### Community 27 - "Application Sidebar and Header"
Cohesion: 0.17
Nodes (23): AppFrame(), AppHeader(), AppSidebar(), AppView, initials(), NAV_GROUPS, NavItem(), planHref() (+15 more)

### Community 28 - "Lint Formatting and Build Tooling"
Cohesion: 0.09
Nodes (23): devDependencies, eslint@^9.0.0, eslint-config-next@^16.0.0, prettier@^3.9.10, tailwindcss@^4.0.0, @tailwindcss/postcss@^4.0.0, tsx@^4.20.0, @types/node@^22.0.0 (+15 more)

### Community 29 - "Authenticated AI Route Handlers"
Cohesion: 0.19
Nodes (20): bodySchema, maxDuration, POST(), runtime, POST(), POST(), dynamic, GET() (+12 more)

### Community 30 - "Analytical Projections and Subject Statistics"
Cohesion: 0.16
Nodes (21): analyze(), AnswerStack, average(), buildWhereYouStand(), comparePoints(), deepDiveFor(), DeepDiveSubject, derivedSectionPoint() (+13 more)

### Community 31 - "icon.tsx"
Cohesion: 0.33
Nodes (6): DuoGlyph(), DuoIcon, IconEntry, ICONS, IconTone, resolveIcon()

### Community 32 - "Static Study Plan Schema"
Cohesion: 0.11
Nodes (12): parsed, parsePlanTaskKey(), planChecklistItemSchema, PlanDay, planDaySchema, planRevisionSchema, PlanTask, planTaskSchema (+4 more)

### Community 33 - "AI Performance Context"
Cohesion: 0.25
Nodes (9): average(), fullMockProfile(), payload(), recentFullMock(), sectionProfile(), subjectProfile(), AnalyticsAttempt, sectionIds (+1 more)

### Community 34 - "Dashboard Plan and Overview Composition"
Cohesion: 0.22
Nodes (21): DashboardOverview(), Panel(), DashboardSkeleton(), DashboardView(), RecentAttemptsPanel(), DashboardPlanApi, PersonalTasksPanel(), PlanApi (+13 more)

### Community 35 - "Auth Session Guards and Policy"
Cohesion: 0.18
Nodes (13): Context, devHandle(), handle(), privateNoStore, runtime, devAuthBypassActive(), devBypassUser(), devSessionPayload() (+5 more)

### Community 36 - "Attempt CRUD Audit and Health"
Cohesion: 0.14
Nodes (17): dynamic, GET, HealthStatus, runtime, DELETE, GET, idSchema, PUT (+9 more)

### Community 37 - "Extraction Normalization and Evidence"
Cohesion: 0.16
Nodes (18): deriveCounts(), deriveQuestions(), exactInteger(), ExtractedSubjectDraft, ExtractionIssue, extractionModelSchema, extractionSections, extractionSubjectIds (+10 more)

### Community 38 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 39 - "Browser Integration and Icon Tooling"
Cohesion: 0.12
Nodes (8): packageDir, REPLACEMENTS, targets, root, logs, pending, target, ws

### Community 40 - "AI Prompts and Screen Context"
Cohesion: 0.16
Nodes (15): bodySchema, maxDuration, runtime, AiScreenContext, AiContext, MAX_EXTRACT_CHARS, parseExtraction(), chatMessages() (+7 more)

### Community 41 - "Reviewed AI Todo Proposals"
Cohesion: 0.20
Nodes (14): maxDuration, POST, runtime, loadAiContext(), parseTodoProposals(), Target, TODO_DATE_QUESTION, todoDraftMessages() (+6 more)

### Community 42 - "Target Settings and LRU Cache"
Cohesion: 0.17
Nodes (9): GET, PUT, runtime, settingsSchema, Entry, LruCache, FULL_MOCK_MAX_SCORE, getSettings() (+1 more)

### Community 43 - "IST Daily AI Usage Ledger"
Cohesion: 0.22
Nodes (12): aiBusy(), aiQuotaExceeded(), planReservation(), dayKey(), nextIstMidnight(), secondsUntilIstMidnight(), getAiUsageToday(), prismaCode() (+4 more)

### Community 44 - "Shadcn Aliases and Tailwind Configuration"
Cohesion: 0.12
Nodes (15): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+7 more)

### Community 45 - "Continuous Integration Validation Workflow"
Cohesion: 0.12
Nodes (15): jobs, validate, name, permissions, contents, run, uses, with (+7 more)

### Community 46 - "AI Configuration and Connection Testing"
Cohesion: 0.20
Nodes (12): maxDuration, POST, runtime, AiConfig, DEFAULT_AI_BASE_URL, Env, integerEnv(), normaliseBaseUrl() (+4 more)

### Community 47 - "API Envelope and Body Validation"
Cohesion: 0.26
Nodes (6): zod, POST, POST, ok(), privateJson(), readBody()

### Community 48 - "Scope Projection and Target Tests"
Cohesion: 0.15
Nodes (12): filterAttempts(), targetMarks(), targetPercentage(), all, english, full, ga, quant (+4 more)

### Community 49 - "Account Integration Verification"
Cohesion: 0.11
Nodes (18): api(), backup(), cookies, preview(), raw(), replace(), settings, api() (+10 more)

### Community 50 - "Workspace Data and URL Filters"
Cohesion: 0.20
Nodes (14): GET, runtime, useWorkspaceData(), DashboardScope, dashboardScopeSchema, Filters, filtersSchema, lenientFiltersSchema (+6 more)

### Community 51 - "Paper Tokens and Design Handover"
Cohesion: 0.20
Nodes (8): Multi-Theme System (data-palette x data-style), Palettes x Styles Theme Matrix, Typography Scale (Source Serif 4 + DM Sans), Missing Radius System Finding, Elevation Model and --shadow-pop Token, Restrained Motion Language, Tokenized Radius Scale (panel/control/card/pill), Sticky Identity Column for Mock History

### Community 52 - "Mock Listing and Analytics APIs"
Cohesion: 0.38
Nodes (6): GET, POST, runtime, createAttempt(), LIST_ATTEMPTS_MAX, listAttempts()

### Community 54 - "Scoring and Report Parsing"
Cohesion: 0.15
Nodes (18): sectionColors, subjectColors, targetColor, AttemptInput, duplicateKey(), optionalNumber, parseTime(), SectionId (+10 more)

### Community 55 - "Neon Ownership Migration and QA"
Cohesion: 0.20
Nodes (10): Request and Ownership Architecture, Neon Agent Tooling Setup (Codex plugin + MCP), Expiring QA Branch Migration Rehearsal, Selected Neon Environment (org/project/branch), Private-Accounts Migration (claim two shared mocks), Session-Derived Ownership Model, Isolation and Ownership Verification, Google Sign-In via Neon Auth OAuth (+2 more)

### Community 56 - "NPM Development and Migration Commands"
Cohesion: 0.18
Nodes (11): scripts, build, db:generate, db:migrate, dev, lint, postinstall, start (+3 more)

### Community 57 - "Editable Extraction Review Workflow"
Cohesion: 0.36
Nodes (8): ExtractionReview(), update(), updateSubject(), FieldIssues(), NullableDuration(), optionalNumber(), blankExtractedSubject(), validateExtractionDraft()

### Community 58 - "Dated Todo Implementation Plan"
Cohesion: 0.20
Nodes (9): Confirmed requirements, Dated personal todos and AI-assisted planning, Existing foundation, Finalized navigation and lifecycle, Phase 1 — Design the dated planner and review flow, Phase 2 — Extend task storage and manual workflows, Phase 3 — Add AI proposal and confirmed-apply workflows, Phase 4 — Validate and document (+1 more)

### Community 59 - "Recoverable UI Error Boundaries"
Cohesion: 0.25
Nodes (4): ErrorBoundary, ErrorFallback(), Props, State

### Community 60 - "Tracker Analytics and Backup Principles"
Cohesion: 0.25
Nodes (5): Dashboard Analytical Scopes (full/subject/sectional/all), Backup Format v2 and Account Transfer, Semantic Chart Palette and Chart Rules, Core Product Workflows, JSON Backup Format Version 2

### Community 61 - "Maintenance and Not Found Pages"
Cohesion: 0.25
Nodes (4): lucide-react@^0.468.0, lucide-react, metadata, metadata

### Community 62 - "Backup Download and Import Route"
Cohesion: 0.29
Nodes (7): GET, maxDuration, runtime, privateHeaders, BACKUP_REQUEST_MAX_BYTES, exportBackup(), invalidateSettings()

### Community 63 - "Safe Chat Task Suggestion Parsing"
Cohesion: 0.33
Nodes (6): CATEGORIES, isHttpUrl(), ParsedChatContent, parseSuggestionBody(), PRIORITIES, TaskSuggestion

### Community 64 - "Semantic Icon Migration and Conventions"
Cohesion: 0.40
Nodes (6): Known Limitations (duo-icons fill-rule, native inputs), Design System Source-of-Truth Map, Icon Inconsistency Finding (14 ad-hoc sizes), Icon Size Scale (14/16/18/22/28), Named Imports for Bundle Reduction, Raw Lucide Imports Migrated into Semantic Icon Map

### Community 68 - "UI Audit and Refactoring History"
Cohesion: 0.50
Nodes (5): WorkspaceShell Client Orchestrator and Its Three Hooks, dashboard.tsx Monolith Split Finding, UI Baseline Audit Findings (26 prioritized items), 15-Phase Execution Order, Unified Segmented Control (.segment-group)

### Community 69 - "Next Configuration and Security Headers"
Cohesion: 0.40
Nodes (4): cspDev, cspProduction, nextConfig, productionHeaders

### Community 70 - "Authenticated Workspace Shell"
Cohesion: 0.10
Nodes (33): next, react, dynamic, WorkspaceLayout(), AddMockView(), LogMockPayload, DateRangeFilter(), PrivateWorkspace() (+25 more)

### Community 71 - "Responsive Mobile Detection"
Cohesion: 0.53
Nodes (5): SidebarProvider, getServerSnapshot(), getSnapshot(), subscribe(), useIsMobile()

### Community 74 - "Dashboard Loading Skeletons"
Cohesion: 0.83
Nodes (3): DashboardSkeleton(), PanelSkeleton(), StatStripSkeleton()

## Ambiguous Edges - Review These
- `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` → `Private Accounts Release Notes`  [AMBIGUOUS]
  docs/ui-overhaul/phase-1-audit.md · relation: conceptually_related_to

## Knowledge Gaps
- **36 isolated node(s):** `RFC-1918`, `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages`, `Health Endpoint Rate-Limit-Exempt (/api/health)`, `Firebase/Mongo Runtime Dependencies Removed` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 674 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **74 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Authenticated Workspace Shell` to `Study Calendar and Daily Tasks`, `Dashboard Plan and Overview Composition`, `Next Configuration and Security Headers`, `Application Runtime Dependencies`, `Recoverable UI Error Boundaries`, `Landing Appearance and Theme Controls`, `API Envelope and Body Validation`, `Request Proxy and Public Origins`, `Workspace Data and URL Filters`, `Guarded Routes and Rate Limits`, `Root Layout Fonts and Toasts`, `Application Sidebar and Header`, `Maintenance and Not Found Pages`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `RFC-1918`, `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AI Credentials and Endpoint Safety` be split into smaller, more focused modules?**
  _Cohesion score 0.053728949478749 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `API Envelope and Body Validation` to `AI Credentials and Endpoint Safety`, `Static Study Plan Schema`, `Attempt CRUD Audit and Health`, `Extraction Normalization and Evidence`, `Application Runtime Dependencies`, `AI Prompts and Screen Context`, `Reviewed AI Todo Proposals`, `Target Settings and LRU Cache`, `Versioned Personal Todo Persistence`, `Study Plan Progress APIs`, `Portable Backup Validation and Import`, `Guarded Routes and Rate Limits`, `Scoring and Report Parsing`, `AI Context Quotas and Schemas`, `Authenticated AI Route Handlers`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `Workspace Orchestration and Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.13105413105413105 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Authenticated Workspace Shell` to `AI Credentials and Endpoint Safety`, `Workspace Orchestration and Controls`, `Study Calendar and Daily Tasks`, `Application Runtime Dependencies`, `Chat State and Session Verification`, `Landing Appearance and Theme Controls`, `personal-todos.tsx`, `Portable Backup Validation and Import`, `Performance Charts and Outcome Cards`, `Shared Sidebar UI Primitives`, `Responsive AI Sheet Composition`, `Root Layout Fonts and Toasts`, `Mock Entry Form and Validation`, `icon.tsx`, `Dashboard Plan and Overview Composition`, `Workspace Data and URL Filters`, `Editable Extraction Review Workflow`, `Recoverable UI Error Boundaries`, `Responsive Mobile Detection`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` and `Private Accounts Release Notes`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._