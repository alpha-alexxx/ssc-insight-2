# Dated personal todos and AI-assisted planning

Status: implemented on `Feat/add-todos`; validation is being recorded by the implementation task. No production migration or deployment is claimed.

The four phases below preserve the finalized user requirements and implementation acceptance criteria. The implementation reuses PersonalTask, adds reusable TodoGroup records, JSON subtasks, soft deletion, record versions, batch receipts, `/api/todos` routes, and a separate `/api/ai/todos` proposal route. Study calendar and My Tasks share the new personal-todo component; the AI panel exposes the same review flow. Ordinary coaching remains read-only.

The additive `20261029000000_personal_todos` migration was tested against a disposable local database only. QA/production migration application, commit/push, merging, and deployment remain separate operations. See README.md for current user/API documentation.

## Confirmed requirements

- Use one planner with separate **Mock plan** and **Personal todos** tabs. Place these tabs on the Study calendar page, with personal todos also accessible from My Tasks. Both entry points share the same records and state.
- Every new personal todo requires one date, with no time field. Use IST dates. Personal todos can exist outside the fixed mock-plan date range.
- Unfinished todos retain their original date and become overdue; never roll them forward automatically.
- Organize each date's checklist into user-created, reusable groups such as subjects or projects. Groups are available across dates.
- Deleting a group preserves its todos under **Ungrouped**.
- Todo fields: title and required date, optional notes and priority, plus optional subtasks. Groups are separate from the existing category field; do not conflate them or silently reinterpret existing categories.
- Subtasks inherit the parent's date and have no separate date/time. Completing all subtasks automatically completes the parent; unchecking one reopens it. Checking the parent completes all its subtasks together; unchecking the parent reopens them all. Todos without subtasks use ordinary complete/reopen behavior.
- Within each date/group, show unfinished todos first, ordered by priority (high, normal, low), and completed todos at the bottom. Use a stable creation-order tie-breaker.
- Deleting a todo moves it and its subtasks to Trash for restoration; normal deletion is not permanent.
- Provide a date strip and daily checklist with **Today / Overdue / Upcoming / All** views.
- Manual entry is quick title entry on the selected date, with optional details. Support many consecutive additions without repeatedly opening a full form.
- No artificial lifetime or total todo limit. Keep individual operations and page sizes bounded for performance.
- AI entry points: the personal todo planner and the existing AI panel.
- AI can turn instructions/pasted text into todos and suggest work from mock performance and the study plan. It may also use existing personal todo titles, dates, status, notes, and subtask details for this task-assistance workflow.
- AI can propose additions, edits, rescheduling, completion, and deletion of personal todos. Every operation requires explicit review/confirmation.
- If the user supplies no dates, AI must ask which dates to use before generating dated proposals. Do not infer that the selected date is authorization or silently invent a deadline.
- Review all AI proposals in one selectable list, showing before/after values for changes. Users can edit proposed fields and choose which operations to apply.
- Existing undated personal tasks remain preserved in a **Needs date** list until the user assigns dates. Require dates for new tasks without making legacy records inaccessible.
- First version excludes recurring todos and reminders.

## Finalized navigation and lifecycle

- Study calendar hosts Mock plan / Personal todos tabs. The personal tab supports dates beyond the built-in mock-plan window.

  _Superseded 2026-10-31:_ the calendar shipped as one unified ledger over three toggleable layers (plan / personal / logged) rather than two tabs, so the plan's scheduled work and the user's dated tasks sit on the same date row. The personal layer is still unbounded by the mock-plan window.
- My Tasks provides another way to access the same personal todos; adding or editing from either page updates the other without creating copies.
- Keep the personal tab focused on dated grouped checklists, not time-slot scheduling.
- Trash is a separate recoverable view. Trashed todos/subtasks are excluded from normal lists, counts, overdue checks, and default AI context.
- Restore the original date, details, subtasks, and completion state. A restored unfinished todo with a past date is overdue. If its group no longer exists, restore under Ungrouped.
- Do not assume automatic Trash expiry or permanent-delete functionality. Preserve trashed records unless a separately specified permanent-deletion action is introduced.
- No product-blocking questions remain. Stable ordering tie-breakers and preserving Trash without automatic expiry are implementation defaults, not additional user answers.

## Existing foundation

- `PersonalTask` in `prisma/schema.prisma` stores title, notes, optional date, category, priority, status, and ownership.
- `/api/tasks` and `/api/tasks/[id]` provide personal-task CRUD, with ownership enforced from the signed-in session.
- `src/components/plan/tasks-view.tsx` currently combines plan assignments and personal tasks and contains the manual task form.
- `src/components/use-plan-data.ts` shares planner/task state across views.
- Provider resolution, structured AI output, quotas, and the chat panel already exist. Current coaching is read-only; this feature extends the contract to reviewed personal-todo proposals. Mock records and built-in plan assignments remain outside the AI mutation scope.

## Phase 1 — Design the dated planner and review flow

- Use the confirmed Study calendar tabs and shared My Tasks access; define consistent navigation and selected-date behavior across both entry points.
- Design separate Mock plan / Personal todos tabs with clear source boundaries, retaining mock-plan functionality.
- Define the personal tab: date strip, daily grouped checklists, quick add, optional-details editor, and Today / Overdue / Upcoming / All views.
- Include group creation/rename/delete, Ungrouped, subtask progress, and Needs date for legacy records.
- Define search/date-view interactions and completed-work visibility; implement unfinished-first priority ordering and the confirmed parent/subtask toggle rules.
- Design Trash and restoration, including original-date overdue behavior and missing-group recovery.
- Design one AI review list for mixed operations, with editable proposals, visible dates, before/after values, and individual selection. Deletions must be unmistakable.
- Reuse the warm paper/ink visual system, theme tokens, accessible controls, and responsive patterns.

Acceptance: manual and AI flows are fully specified for desktop/mobile; a user can distinguish personal work from the mock plan and see exactly what a confirmation will change.

## Phase 2 — Extend task storage and manual workflows

- Extend the existing personal-task subsystem instead of creating a parallel todo table/API.
- Add per-user reusable groups and ordered subtasks, with foreign-key/ownership checks. A schema migration is expected for these confirmed requirements.
- Enforce required dates on new task creation while retaining nullable dates on legacy records until assigned; do not backfill with fabricated dates.
- Delete groups without deleting their tasks, including group references on trashed records. Add soft-deletion storage for todos and restore parent/subtask state together. Exclude Trash from normal queries/counts, and restore into Ungrouped if the original group was removed.
- Enforce parent/subtask completion rules transactionally on the server, including reopening, adding/removing subtasks, bulk completion, and concurrent requests.
- Apply unfinished-first ordering within each date/group, then priority, with completed todos at the bottom and stable creation-order ties. Do not add drag-and-drop ordering.
- Add Trash list/restore endpoints with the same per-user ownership rules as active todos.
- Extract shared validation and editors; support consecutive quick additions, edit, reschedule, priority/notes clearing, completion/reopen, and deletion/recovery.
- Add server-side pagination/filtering and correct aggregate counts. Update every consumer so unloaded pages do not produce incorrect dashboard counts or incomplete date views.
- Update shared state after changes from either planner or AI panel.

Acceptance: manual dated todos, reusable groups, and subtasks persist correctly; legacy tasks remain accessible; ownership and mock-plan isolation hold.

## Phase 3 — Add AI proposal and confirmed-apply workflows

- Provide task assistance from the personal planner and AI panel using the same proposal/review components.
- Ask for a date or date range when omitted before generating dated proposals. Resolve supplied relative dates against the explicit current IST date and show resolved dates in review.
- Use a dedicated authenticated structured-output endpoint for personal-todo proposals, reusing provider resolution, timeout handling, schema validation, and quota accounting.
- Support typed operations: create, edit, reschedule, complete/reopen, and delete. Restrict existing targets to the signed-in user's personal tasks and groups; never accept arbitrary ownership or mock-plan targets from model output.
- Allow performance/plan context plus relevant personal notes/subtasks, as authorized. Clearly disclose that selected context is sent to the configured provider, bound context size, and never send credentials or account identity. Existing coaching requests should not gain unrestricted todo-note context as an unrelated side effect.
- Generate manageable batches (proposed default 5, maximum 25 operations per request), without imposing a total todo count limit. Keep these batch sizes an implementation default, not a claimed user preference.
- Keep all proposals unsaved until review. Show existing versus proposed values, selectable operations, validation errors, likely duplicates, and destructive effects.
- Apply the confirmed selection through a validated transactional endpoint with idempotency protection. Recheck ownership, current record versions, dates, groups, and completion invariants at apply time. If a target changed or disappeared since review, require refreshed review rather than overwriting silently.
- Keep drafts available on recoverable errors and prevent duplicate submits. Regeneration alone never mutates records.
- Update AI prompts, panel copy, and product documentation to distinguish proposed operations from confirmed persistence. AI must not claim an action succeeded before the server confirms it. AI-proposed deletion uses the same recoverable Trash action as manual deletion.
- Preserve manual creation when AI is unavailable, invalid, timed out, or quota-limited.

Acceptance: both entry points support reviewed additions and changes to personal todos; unselected operations do nothing; AI never alters mock records or the built-in study schedule.

## Phase 4 — Validate and document

- Unit checks: required dates, IST boundaries, overdue and Needs date behavior, groups, parent/all-subtask toggling, subtask-driven completion/reopening, priority ordering, Trash/restore, AI schemas, ambiguous/missing dates, and mixed-operation validation.
- Integration checks: ownership across tasks/groups/subtasks, migrations preserving legacy rows, group deletion preservation (including trashed todos), Trash exclusion and restoration, pagination/counts, batch atomicity/idempotency, stale-review rejection, quota handling, and zero mutations during generation.
- Browser checks on desktop/mobile: quick add-many, date browsing, grouped checklists, editing, subtasks, completion/reopen, Trash/restore behavior, and both AI entry points through mixed-operation review/apply.
- Verify that mock-plan data, completion, mock attempts, and existing planner routes remain intact.
- Run lint, relevant existing and new tests, type checking, and production build. Distinguish provider-fixture checks from any live-provider validation.
- Document the final navigation, AI data-sharing scope, confirmation rules, migration behavior, and limits.

## Scope boundaries

Personal todos extend the existing planner independently of mock assignments. No exam-plan rewriting, autonomous writes, recurrence, reminders, file uploads/OCR, or unsupervised bulk operations are included. New dates are required, subtasks are included, and AI changes beyond creation are allowed only through explicit reviewed confirmation.

Implementation is on `Feat/add-todos`. Commit/push, merging, migration deployment outside the local test database, and app deployment remain separate steps.
