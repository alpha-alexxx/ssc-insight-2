# Graph Report - ssc-insight-2  (2026-10-27)

## Corpus Check
- 5 files · ~16,876 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1878 nodes · 4708 edges · 139 communities (65 shown, 74 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- AI Credentials and SSRF Guard
- workspace-shell.tsx
- calendar-view.tsx
- README.md SSC Insight
- Caching and Revalidation Policy
- SSC Insight Architecture
- SSC Insight Architecture
- dependencies
- client-types.ts
- PRODUCT.md SSC Insight
- Landing Page and Icon System
- database
- DESIGN.md SSC Insight
- Plan and Task API Routes
- ai-chat-sheet.tsx
- backup.ts
- performance-overview.tsx
- Access Log and Middleware
- Analytics Route and Rate Limits
- sidebar.tsx
- ai-chat-sheet.tsx
- app/layout.tsx
- repository.ts
- Mock Entry Form
- AI Errors and Provider
- Dashboard Docs Screenshots
- ai.test.ts
- sidebar.tsx
- Development Toolchain
- chat/route.ts
- Analytics Scope Projections
- PlainIcon
- calendar-view.tsx
- domain.test.ts
- dashboard-view.tsx
- ref_server_only
- mock-attempts/[id]/route.ts
- AI Extraction Review
- TypeScript Configuration
- cdp-check.mjs
- extract/route.ts
- zod
- Settings Route and LRU Cache
- usage.ts
- shadcn Component Config
- CI Workflow
- AI Config Resolution
- api.ts
- Analytics Scope Projections
- personal-todos.tsx
- domain.ts
- Paper-and-Ink Design System
- mock-attempts/[id]/route.ts
- ai-settings-form.tsx
- domain.test.ts
- Ownership and Private Accounts
- npm Scripts
- extraction-review.tsx
- Dated personal todos and AI-assisted planning
- error-boundary.tsx
- Ownership and Private Accounts
- ai-chat-sheet.tsx
- backup/route.ts
- task-suggestion.ts
- Icon System Migration
- Paper-and-Ink Design System
- next
- workspace-shell.tsx
- Mobile Breakpoint Hook
- Prisma CLI Config
- Loading Skeletons
- Token Bucket Limiter
- No Zustand and no TanStack Query decision
- @neon/config
- AI Subsystem Documentation
- PostCSS Config
- Shell Architecture Decisions
- No Zustand and no TanStack Query decision
- AI Subsystem Documentation
- Paper-and-Ink Design System
- Study Planner Documentation
- AI Subsystem Documentation

## God Nodes (most connected - your core abstractions)
1. `SSC Insight Architecture` - 104 edges
2. `SSC Insight Architecture` - 104 edges
3. `README.md SSC Insight` - 75 edges
4. `Button()` - 61 edges
5. `PlainIcon()` - 60 edges
6. `cn()` - 60 edges
7. `database()` - 50 edges
8. `readBody()` - 45 edges
9. `react` - 45 edges
10. `DESIGN.md SSC Insight` - 45 edges

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

## Communities (139 total, 74 thin omitted)

### Community 0 - "AI Credentials and SSRF Guard"
Cohesion: 0.07
Nodes (48): RFC-1918, maxDuration, POST, runtime, DELETE, GET, PUT, runtime (+40 more)

### Community 1 - "workspace-shell.tsx"
Cohesion: 0.10
Nodes (44): next, radix-ui, react, dynamic, WorkspaceLayout(), AddMockView(), LogMockPayload, AiCoachCard() (+36 more)

### Community 2 - "calendar-view.tsx"
Cohesion: 0.09
Nodes (50): AgendaList(), CalendarMode, CalendarView(), clampToPlan(), MODES, MonthView(), SelectedDayAgenda(), shiftMonth() (+42 more)

### Community 4 - "Caching and Revalidation Policy"
Cohesion: 0.06
Nodes (45): AI Status Endpoint Cache Policy (/api/ai/status), Analytics Projections Cache Policy (/api/analytics), api() Client Fetch cache: no-store (src/lib/api-client.ts), Backup Export Raw File Exception (GET /api/backup), Next.js 16 Cache Components Not Enabled, Caching and Revalidation Policy (Phase 8 reference), Filters/Scope URL State Mirror (src/lib/filters-url.ts), force-dynamic Public Auth-Adjacent Pages (+37 more)

### Community 7 - "dependencies"
Cohesion: 0.05
Nodes (51): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, @duo-icons/react@^1.0.1, motion@^12.0.0, @neon/env@^1.6.4, @neondatabase/auth@0.7.0-beta, @neondatabase/serverless@^1.2.0 (+43 more)

### Community 8 - "client-types.ts"
Cohesion: 0.06
Nodes (38): api(), backup(), cookies, preview(), raw(), replace(), settings, api() (+30 more)

### Community 10 - "Landing Page and Icon System"
Cohesion: 0.08
Nodes (36): motion, @react-spring/web, dynamic, LandingPage(), dynamic, SignInPage(), AppearancePanel(), PaletteChip() (+28 more)

### Community 11 - "database"
Cohesion: 0.10
Nodes (30): POST, GET, runtime, DELETE, PATCH, runtime, GET, POST (+22 more)

### Community 13 - "Plan and Task API Routes"
Cohesion: 0.09
Nodes (35): mutationSchema, POST, runtime, GET, runtime, DELETE, idSchema, PUT (+27 more)

### Community 14 - "ai-chat-sheet.tsx"
Cohesion: 0.09
Nodes (30): PersonalCalendar(), personalMonthRange(), DraftResponse, Group, GroupRow(), OverdueTodoPreview(), PersonalTodos(), mutate() (+22 more)

### Community 15 - "backup.ts"
Cohesion: 0.08
Nodes (33): assertSummary(), BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_MAX_ATTEMPTS, BACKUP_MAX_BYTES, BACKUP_SAMPLE_LIMIT, BackupError, BackupPreview (+25 more)

### Community 16 - "performance-overview.tsx"
Cohesion: 0.12
Nodes (31): AttemptOutcomeCard(), outcomes, percent(), ScoreRing(), subjectIcons, EmptyChart(), IconName, AttemptCards() (+23 more)

### Community 17 - "Access Log and Middleware"
Cohesion: 0.14
Nodes (23): GET(), accessLog(), AccessLogEvent, bypassesMaintenance(), classifyPath(), EnvLike, maintenanceActive(), maintenanceRetryAfter() (+15 more)

### Community 18 - "Analytics Route and Rate Limits"
Cohesion: 0.13
Nodes (24): DELETE, dynamic, GET, PATCH, POST, PUT, runtime, DELETE (+16 more)

### Community 19 - "sidebar.tsx"
Cohesion: 0.14
Nodes (17): PageHeader(), Input, Separator, SidebarContext, SidebarContextProps, SidebarGroupAction, SidebarInput, SidebarMenuAction (+9 more)

### Community 20 - "ai-chat-sheet.tsx"
Cohesion: 0.14
Nodes (23): AiChatSheet(), AiSheetTaskApi, ChatBubble(), CoachChatTab(), inlineNodes(), LogMockTab(), MessageContent(), QUICK_QUESTIONS (+15 more)

### Community 21 - "app/layout.tsx"
Cohesion: 0.10
Nodes (22): @fontsource-variable/dm-sans@^5.3.0, @fontsource-variable/source-serif-4@^5.3.1, next-themes@^0.4.6, @vercel/analytics@^2.0.1, @vercel/speed-insights@^2.0.0, @fontsource-variable/dm-sans, @fontsource-variable/source-serif-4, next-themes (+14 more)

### Community 22 - "repository.ts"
Cohesion: 0.14
Nodes (23): GET, attemptData(), attemptInclude, attemptWhere(), escapeLike(), mapSubjects(), StoredAnalyticsAttempt, StoredAttempt (+15 more)

### Community 23 - "Mock Entry Form"
Cohesion: 0.18
Nodes (21): DurationInput(), change(), formatParts(), blankSubject(), fullMockSectionHeading(), MockForm(), applyAiDraft(), applyExtracted() (+13 more)

### Community 24 - "AI Errors and Provider"
Cohesion: 0.21
Nodes (23): aiAborted(), AiError, AiErrorCode, aiInvalidOutput(), aiProviderError(), aiTimeout(), AiProvider, AiUsage (+15 more)

### Community 25 - "Dashboard Docs Screenshots"
Cohesion: 0.12
Nodes (25): Accuracy Footer Divisor Column (83.3% Accuracy), Marks Obtained (70/90) and Score Strip, Outcome Card Illustration (Reasoning), Outcome Counts with Proportion Bars (Correct / Incorrect / Unattempted), Percentile Availability Note ('No standalone subject percentile recorded'), Score-Centered Answer Distribution Ring (77.8% SCORE), Serif Subject Heading with Attempt/Question Subtitle, Soft-Rounded Warm Paper Card Surface (+17 more)

### Community 26 - "ai.test.ts"
Cohesion: 0.13
Nodes (17): maxDuration, runtime, buildAiContext(), AiQuotaLimits, AiQuotaUsage, chargedOnFailure(), CONTEXT_TOKEN_ESTIMATE, ReservationPlan (+9 more)

### Community 27 - "sidebar.tsx"
Cohesion: 0.16
Nodes (24): AppFrame(), AppHeader(), AppSidebar(), AppView, initials(), NAV_GROUPS, NavItem(), planHref() (+16 more)

### Community 28 - "Development Toolchain"
Cohesion: 0.09
Nodes (23): devDependencies, eslint@^9.0.0, eslint-config-next@^16.0.0, prettier@^3.9.10, tailwindcss@^4.0.0, @tailwindcss/postcss@^4.0.0, tsx@^4.20.0, @types/node@^22.0.0 (+15 more)

### Community 29 - "chat/route.ts"
Cohesion: 0.19
Nodes (20): bodySchema, maxDuration, POST(), runtime, POST(), POST(), dynamic, GET() (+12 more)

### Community 30 - "Analytics Scope Projections"
Cohesion: 0.16
Nodes (22): analyze(), AnswerStack, average(), buildWhereYouStand(), comparePoints(), deepDiveFor(), DeepDiveSubject, derivedSectionPoint() (+14 more)

### Community 31 - "PlainIcon"
Cohesion: 0.16
Nodes (19): AttemptRecordCard(), ConnectedAuthControl(), RecentAttemptsPanel(), DuoGlyph(), DuoIcon, IconEntry, ICONS, IconTone (+11 more)

### Community 32 - "calendar-view.tsx"
Cohesion: 0.11
Nodes (12): parsed, parsePlanTaskKey(), planChecklistItemSchema, PlanDay, planDaySchema, planRevisionSchema, PlanTask, planTaskSchema (+4 more)

### Community 33 - "domain.test.ts"
Cohesion: 0.14
Nodes (18): average(), fullMockProfile(), payload(), recentFullMock(), sectionProfile(), subjectProfile(), sectionColors, subjectColors (+10 more)

### Community 34 - "dashboard-view.tsx"
Cohesion: 0.25
Nodes (18): DashboardOverview(), DashboardSkeleton(), DashboardView(), DashboardPlanApi, PlanApi, PlanProgressPanel(), PlanWithToday, RevisionQueuePanel() (+10 more)

### Community 35 - "ref_server_only"
Cohesion: 0.18
Nodes (13): Context, devHandle(), handle(), privateNoStore, runtime, devAuthBypassActive(), devBypassUser(), devSessionPayload() (+5 more)

### Community 36 - "mock-attempts/[id]/route.ts"
Cohesion: 0.15
Nodes (16): dynamic, GET, HealthStatus, runtime, DELETE, idSchema, PUT, runtime (+8 more)

### Community 37 - "AI Extraction Review"
Cohesion: 0.19
Nodes (17): deriveCounts(), deriveQuestions(), exactInteger(), ExtractionIssue, extractionModelSchema, extractionSections, extractionSubjectIds, inferType() (+9 more)

### Community 38 - "TypeScript Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 39 - "cdp-check.mjs"
Cohesion: 0.12
Nodes (8): packageDir, REPLACEMENTS, targets, root, logs, pending, target, ws

### Community 40 - "extract/route.ts"
Cohesion: 0.16
Nodes (15): bodySchema, maxDuration, runtime, AiScreenContext, AiContext, MAX_EXTRACT_CHARS, parseExtraction(), chatMessages() (+7 more)

### Community 41 - "zod"
Cohesion: 0.20
Nodes (14): maxDuration, POST, runtime, loadAiContext(), parseTodoProposals(), Target, TODO_DATE_QUESTION, todoDraftMessages() (+6 more)

### Community 42 - "Settings Route and LRU Cache"
Cohesion: 0.17
Nodes (9): GET, PUT, runtime, settingsSchema, Entry, LruCache, FULL_MOCK_MAX_SCORE, getSettings() (+1 more)

### Community 43 - "usage.ts"
Cohesion: 0.22
Nodes (12): aiBusy(), aiQuotaExceeded(), planReservation(), dayKey(), nextIstMidnight(), secondsUntilIstMidnight(), getAiUsageToday(), prismaCode() (+4 more)

### Community 44 - "shadcn Component Config"
Cohesion: 0.12
Nodes (15): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+7 more)

### Community 45 - "CI Workflow"
Cohesion: 0.12
Nodes (15): jobs, validate, name, permissions, contents, run, uses, with (+7 more)

### Community 46 - "AI Config Resolution"
Cohesion: 0.20
Nodes (12): maxDuration, POST, runtime, AiConfig, DEFAULT_AI_BASE_URL, Env, integerEnv(), normaliseBaseUrl() (+4 more)

### Community 47 - "api.ts"
Cohesion: 0.26
Nodes (6): zod, POST, POST, ok(), privateJson(), readBody()

### Community 48 - "Analytics Scope Projections"
Cohesion: 0.15
Nodes (12): targetMarks(), targetPercentage(), SubjectResult, all, english, full, ga, quant (+4 more)

### Community 49 - "personal-todos.tsx"
Cohesion: 0.24
Nodes (11): AiSettingsForm(), fetchModels(), payload(), remove(), save(), test(), TodoAiComposer(), apply() (+3 more)

### Community 50 - "domain.ts"
Cohesion: 0.32
Nodes (10): useWorkspaceData(), DashboardScope, Filters, filtersSchema, lenientFiltersSchema, mirrorsWorkspaceState(), parseWorkspaceState(), safeWorkspaceReturnTo() (+2 more)

### Community 51 - "Paper-and-Ink Design System"
Cohesion: 0.20
Nodes (8): Multi-Theme System (data-palette x data-style), Palettes x Styles Theme Matrix, Typography Scale (Source Serif 4 + DM Sans), Missing Radius System Finding, Elevation Model and --shadow-pop Token, Restrained Motion Language, Tokenized Radius Scale (panel/control/card/pill), Sticky Identity Column for Mock History

### Community 52 - "mock-attempts/[id]/route.ts"
Cohesion: 0.23
Nodes (10): GET, runtime, GET, POST, runtime, dashboardScopeSchema, createAttempt(), filtersFrom() (+2 more)

### Community 53 - "ai-settings-form.tsx"
Cohesion: 0.20
Nodes (10): Catalog, EMPTY_CATALOG, EMPTY_FORM, Form, Props, Label, labelVariants, AiCredentialSummary (+2 more)

### Community 54 - "domain.test.ts"
Cohesion: 0.23
Nodes (8): filterAttempts(), duplicateKey(), parseTime(), subjectIds, aliases, numberAfter(), parseReport(), input

### Community 55 - "Ownership and Private Accounts"
Cohesion: 0.20
Nodes (10): Request and Ownership Architecture, Neon Agent Tooling Setup (Codex plugin + MCP), Expiring QA Branch Migration Rehearsal, Selected Neon Environment (org/project/branch), Private-Accounts Migration (claim two shared mocks), Session-Derived Ownership Model, Isolation and Ownership Verification, Google Sign-In via Neon Auth OAuth (+2 more)

### Community 56 - "npm Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, db:generate, db:migrate, dev, lint, postinstall, start (+3 more)

### Community 57 - "extraction-review.tsx"
Cohesion: 0.31
Nodes (9): ExtractionReview(), update(), updateSubject(), FieldIssues(), NullableDuration(), optionalNumber(), blankExtractedSubject(), ExtractedSubjectDraft (+1 more)

### Community 58 - "Dated personal todos and AI-assisted planning"
Cohesion: 0.20
Nodes (9): Confirmed requirements, Dated personal todos and AI-assisted planning, Existing foundation, Finalized navigation and lifecycle, Phase 1 — Design the dated planner and review flow, Phase 2 — Extend task storage and manual workflows, Phase 3 — Add AI proposal and confirmed-apply workflows, Phase 4 — Validate and document (+1 more)

### Community 59 - "error-boundary.tsx"
Cohesion: 0.25
Nodes (4): ErrorBoundary, ErrorFallback(), Props, State

### Community 60 - "Ownership and Private Accounts"
Cohesion: 0.25
Nodes (5): Dashboard Analytical Scopes (full/subject/sectional/all), Backup Format v2 and Account Transfer, Semantic Chart Palette and Chart Rules, Core Product Workflows, JSON Backup Format Version 2

### Community 61 - "ai-chat-sheet.tsx"
Cohesion: 0.25
Nodes (4): lucide-react@^0.468.0, lucide-react, metadata, metadata

### Community 62 - "backup/route.ts"
Cohesion: 0.29
Nodes (7): GET, maxDuration, runtime, privateHeaders, BACKUP_REQUEST_MAX_BYTES, exportBackup(), invalidateSettings()

### Community 63 - "task-suggestion.ts"
Cohesion: 0.33
Nodes (6): CATEGORIES, isHttpUrl(), ParsedChatContent, parseSuggestionBody(), PRIORITIES, TaskSuggestion

### Community 64 - "Icon System Migration"
Cohesion: 0.40
Nodes (6): Known Limitations (duo-icons fill-rule, native inputs), Design System Source-of-Truth Map, Icon Inconsistency Finding (14 ad-hoc sizes), Icon Size Scale (14/16/18/22/28), Named Imports for Bundle Reduction, Raw Lucide Imports Migrated into Semantic Icon Map

### Community 68 - "Paper-and-Ink Design System"
Cohesion: 0.50
Nodes (5): WorkspaceShell Client Orchestrator and Its Three Hooks, dashboard.tsx Monolith Split Finding, UI Baseline Audit Findings (26 prioritized items), 15-Phase Execution Order, Unified Segmented Control (.segment-group)

### Community 69 - "next"
Cohesion: 0.40
Nodes (4): cspDev, cspProduction, nextConfig, productionHeaders

### Community 70 - "workspace-shell.tsx"
Cohesion: 0.50
Nodes (4): Handlers, useKeyboardShortcuts(), isTypingTarget(), onKey()

### Community 71 - "Mobile Breakpoint Hook"
Cohesion: 0.70
Nodes (4): getServerSnapshot(), getSnapshot(), subscribe(), useIsMobile()

### Community 74 - "Loading Skeletons"
Cohesion: 0.83
Nodes (3): DashboardSkeleton(), PanelSkeleton(), StatStripSkeleton()

## Ambiguous Edges - Review These
- `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` → `Private Accounts Release Notes`  [AMBIGUOUS]
  docs/ui-overhaul/phase-1-audit.md · relation: conceptually_related_to

## Knowledge Gaps
- **36 isolated node(s):** `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages`, `Health Endpoint Rate-Limit-Exempt (/api/health)`, `Firebase/Mongo Runtime Dependencies Removed`, `Neon OAuth MCP Server (https://mcp.neon.tech/mcp)` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 668 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **74 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `workspace-shell.tsx` to `calendar-view.tsx`, `dashboard-view.tsx`, `next`, `dependencies`, `error-boundary.tsx`, `Landing Page and Icon System`, `api.ts`, `Access Log and Middleware`, `domain.ts`, `Analytics Route and Rate Limits`, `app/layout.tsx`, `sidebar.tsx`, `ai-chat-sheet.tsx`, `PlainIcon`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `Analytics Projections Cache Policy (/api/analytics)`, `force-dynamic Public Auth-Adjacent Pages`, `Health Endpoint Rate-Limit-Exempt (/api/health)` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AI Credentials and SSRF Guard` be split into smaller, more focused modules?**
  _Cohesion score 0.07161125319693094 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `api.ts` to `AI Credentials and SSRF Guard`, `domain.test.ts`, `calendar-view.tsx`, `mock-attempts/[id]/route.ts`, `AI Extraction Review`, `dependencies`, `extract/route.ts`, `zod`, `Settings Route and LRU Cache`, `database`, `Plan and Task API Routes`, `backup.ts`, `Analytics Route and Rate Limits`, `ai.test.ts`, `chat/route.ts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `workspace-shell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10163934426229508 - nodes in this community are weakly interconnected._
- **Why does `react` connect `workspace-shell.tsx` to `calendar-view.tsx`, `dependencies`, `client-types.ts`, `Landing Page and Icon System`, `ai-chat-sheet.tsx`, `backup.ts`, `performance-overview.tsx`, `sidebar.tsx`, `ai-chat-sheet.tsx`, `app/layout.tsx`, `Mock Entry Form`, `PlainIcon`, `dashboard-view.tsx`, `domain.ts`, `ai-settings-form.tsx`, `extraction-review.tsx`, `error-boundary.tsx`, `workspace-shell.tsx`, `Mobile Breakpoint Hook`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Stack Inventory (Next 16.4.3, React 19.2, TS 5.9, Tailwind 4, Recharts 3, motion 12)` and `Private Accounts Release Notes`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._