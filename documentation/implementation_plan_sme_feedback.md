# Implementation Plan: SME Feedback Items #2, #4, #5, #6, #7

## Context

An SME reviewed the ISMS Compliance Tracker (ISO 27001 app) and identified usability issues and missing features. This plan addresses the 5 clear, actionable items. The app is a React + Express + PostgreSQL stack hosted on Replit, using shadcn/ui, TanStack Query, and Drizzle ORM.

**Base path:** `/Users/haberlah/Documents/replit projects/iso_27001`

---

## Implementation Sequence

```
#2 (Scroll bug)  ─────────────────────────► Done
#5 (Save status bug)  ───────────────────► Done
#4 (Evidence links - schema + API + UI)  ─► Done ──► #7 (Test run evidence)
#6 (Progress counter)  ──────────────────► Done
```

Rationale: #2 and #5 are independent bug fixes. #5 should go before #4 because both touch `control-detail.tsx` — fixing state logic first avoids conflicts. #4 must precede #7 (evidence table is a prerequisite). #6 is independent.

---

## Item #2: Fix Questionnaire Scroll

**Problem:** Only ~3 of 6+ questions visible on PC. Users can't scroll to see the rest.

**Root cause:** `App.tsx:67` has `overflow-hidden` on the flex container. The `<main>` at line 74 has `flex-1 overflow-y-auto` but lacks `min-h-0`, which is required for flex children to shrink below content size and enable scrolling.

**Fix:**

| File | Change |
|------|--------|
| `client/src/App.tsx` (line 74) | Add `min-h-0` to `<main>` className: `"flex-1 min-h-0 overflow-y-auto p-6 bg-background"` |
| `client/src/pages/control-detail.tsx` | Add `lg:sticky lg:top-0 lg:self-start` to the right-hand settings column so it stays visible while scrolling questions |

**Verify:** Open a control with 6+ questions (e.g. 5.4). All questions should be scrollable. Settings sidebar stays sticky on desktop.

---

## Item #5: Fix Save Status Bug

**Problem:** Status shows "Unsaved" → "Saving..." → reverts to "Unsaved" instead of showing "Saved".

**Root cause:** Race condition in `control-detail.tsx` lines 490-504:
1. `onSuccess` sets status to `"saved"`
2. Then schedules `setTimeout(() => "idle", 2000)` — which makes `QuestionCard` show "Unsaved" (line 270: `idle && responseText → "Unsaved"`)
3. Then calls `queryClient.invalidateQueries()` which triggers a refetch, which triggers the `useEffect` (line ~403) that reinitialises `localResponses`

**Fix:**

| File | Change |
|------|--------|
| `control-detail.tsx` lines 494-499 | **Remove** the `setTimeout` that resets to `"idle"`. **Remove** `queryClient.invalidateQueries()`. Status stays `"saved"` until next user edit. |
| `control-detail.tsx` lines 506-528 | **Remove** `queryClient.invalidateQueries()` from `evidenceMutation.onSuccess` |
| `control-detail.tsx` line ~403 | Guard `useEffect` with a `useRef(false)` flag so `localResponses` is only initialised once from server data, not re-initialised on every refetch |
| `control-detail.tsx` line 549 | Keep as-is: typing sets status to `"saving"` which correctly replaces `"saved"` |
| `control-detail.tsx` lines 595-609 | `handleSaveAll`: set all statuses to `"saving"` upfront before the mutation loop |
| `QuestionCard.tsx` line 270 | Change the `idle` display: when `saveStatus === "idle"` and there's text, show nothing (no indicator) instead of "Unsaved". Only show "Unsaved" as an explicit status set when there are genuinely pending changes (i.e. after typing but before the debounced save fires). |

**New status model:**
- User types → `"saving"` (shows spinner — note: the actual API call is debounced, but user sees immediate feedback)
- Debounce fires, API responds → `"saved"` (shows green tick, persists until next edit)
- No text / idle → no indicator shown
- Error → `"error"` (shows red text, persists until retry)

**Verify:** Type in a response → see "Saving..." → see "Saved" (green tick stays). Click "Save All" → all show "Saving..." → all show "Saved". Navigate away and back → responses load correctly.

---

## Item #4: Multiple Evidence Links

**Problem:** Evidence is just flat `string[]` filenames in JSONB. No structured metadata, no URLs, no types, no audit trail.

### Phase 4a: Schema

| File | Change |
|------|--------|
| `shared/schema.ts` | Add `evidenceTypeEnum` pgEnum: `["REGISTER", "RECORD", "POLICY", "MATRIX", "DOCUMENT", "OTHER"]` |
| `shared/schema.ts` | Add `evidenceLinks` pgTable with columns: `id`, `organisationControlId` (FK), `questionId` (nullable int), `testRunId` (nullable FK to testRuns), `title` (text, required), `url` (text, nullable), `evidenceType` (enum, nullable), `description` (text, nullable), `addedByUserId` (FK to users), `createdAt` (timestamp) |
| `shared/schema.ts` | Add Drizzle relations: `evidenceLinks` ↔ `organisationControls`, `testRuns`, `users` |
| `shared/schema.ts` | Add `insertEvidenceLinkSchema`, `EvidenceLink` type, `InsertEvidenceLink` type |

**Migration:** Run `npm run db:push` (drizzle-kit push) — purely additive, no existing data affected.

### Phase 4b: Storage Layer

| File | Change |
|------|--------|
| `server/storage.ts` | Add to `IStorage` interface: `getEvidenceLinksByOrgControl(id)`, `getEvidenceLinksByTestRun(id)`, `createEvidenceLink(data)`, `deleteEvidenceLink(id)` |
| `server/storage.ts` | Implement in `DatabaseStorage` class |

### Phase 4c: API Routes

| File | Change |
|------|--------|
| `server/routes.ts` | `GET /api/organisation-controls/:controlId/evidence-links` — list evidence for a control (optionally filtered by questionId query param) |
| `server/routes.ts` | `POST /api/organisation-controls/:controlId/evidence-links` — create evidence link (body: `{ title, url?, evidenceType?, description?, questionId?, testRunId? }`) |
| `server/routes.ts` | `DELETE /api/evidence-links/:id` — delete an evidence link |

### Phase 4d: Shared UI Component

| File | Change |
|------|--------|
| **NEW** `client/src/components/EvidenceLinkManager.tsx` | Shared component with two modes: |

**"manage" mode** (for questionnaire questions):
- Fetches evidence from API via `useQuery`
- Displays evidence as compact chips: `[TYPE icon] "Title" [x]`
- "Add Evidence" button opens a `Sheet` (slide-over panel) with form: title (required), URL (optional), evidence type dropdown (pre-populated from ontology `evidence_type`), description (optional)
- Delete button with `AlertDialog` confirmation
- Props: `organisationControlId`, `questionId?`, `readOnly?`

**"collect" mode** (for test run recording — used in #7):
- Local state only, no API calls
- Same add/remove UI but accumulates evidence in memory
- Returns collected evidence via `onCollectedChange` callback
- Props: `onCollectedChange`, `suggestedTypes?`

### Phase 4e: Integrate into QuestionCard

| File | Change |
|------|--------|
| `client/src/components/QuestionCard.tsx` lines 218-251 | Replace the inline evidence input (filename.pdf + Plus button) with `<EvidenceLinkManager mode="manage" organisationControlId={...} questionId={question.question_id} />` |
| `QuestionCard.tsx` props | Add `organisationControlId: number` prop. Remove `onEvidenceAdd` prop. |
| `control-detail.tsx` line ~619 | Pass `organisationControlId={orgControl?.id}` to `QuestionCard`. Remove `onEvidenceAdd={handleEvidenceAdd}` prop. |
| `control-detail.tsx` lines 506-584 | Remove `evidenceMutation` and `handleEvidenceAdd` — no longer needed, evidence management is self-contained in `EvidenceLinkManager` |

**Verify:** Open a control → add evidence with title, URL, type → evidence chip appears. Refresh → persists. Delete evidence → confirmation dialog → removed. Check that the ontology `evidence_type` field populates the type dropdown.

---

## Item #6: Progress Counter Per Control

**Problem:** No visible count of answered/outstanding questions. Controls list page has no progress column.

### Phase 6a: Server-side Progress Computation

| File | Change |
|------|--------|
| `server/routes.ts` (PATCH response endpoint, ~line 434) | After updating `implementationResponses`, compute and store `completion_status` with `total`, `answered`, and `by_persona` counts by reading the control's `aiQuestionnaire.questions` array |

### Phase 6b: Controls List API

| File | Change |
|------|--------|
| `server/storage.ts` (`getControlsWithLatestTest`) | Compute `questionnaireProgress: { total, answered, percentage }` for each control by reading `aiQuestionnaire.questions.length` and counting non-empty responses in `implementationResponses.responses` |
| `shared/schema.ts` | Extend `ControlWithLatestTest` type with optional `questionnaireProgress` field |

### Phase 6c: Controls List UI

| File | Change |
|------|--------|
| `client/src/pages/controls.tsx` | Add "Responses" column between Status and Frequency |

Column renders:
- Compact `<Progress>` bar (w-16 h-2) + `"X/Y"` text in `text-xs`
- Colour: green at 100%, amber at >0%, grey at 0%
- Dash "-" when no questionnaire exists
- Sortable by completion percentage

**Verify:** Controls list shows progress bars. Answer questions on a control → navigate back → progress updates. Sort by progress column works.

---

## Item #7: Evidence Links on Test Runs

**Problem:** Test run workflow has no way to attach evidence. Depends on #4's evidence table.

### Phase 7a: Collect-mode EvidenceLinkManager on Record Test Page

| File | Change |
|------|--------|
| `client/src/pages/record-test.tsx` | Add `collectedEvidence` local state array |
| `record-test.tsx` | Add `<EvidenceLinkManager mode="collect" onCollectedChange={setCollectedEvidence} />` between the Comments textarea and the AI Analysis section |
| `record-test.tsx` | When submitting, include `evidenceLinks: collectedEvidence` in the `POST /api/test-runs` body |

### Phase 7b: API Update

| File | Change |
|------|--------|
| `server/routes.ts` (POST `/api/test-runs`, ~line 283) | Accept optional `evidenceLinks` array in request body. After creating the test run, loop through and `storage.createEvidenceLink()` for each with the new `testRunId` |

### Phase 7c: Display Evidence in Test History

| File | Change |
|------|--------|
| `server/storage.ts` (`getControlByNumber`) | After fetching `recentTestRuns`, also fetch evidence links for those test run IDs and attach to each test run object |
| `shared/schema.ts` | Add `TestRunWithEvidence` type extending `TestRun` with optional `evidenceLinks` array |
| `client/src/pages/control-detail.tsx` (Test History tab) | When rendering each test run, show evidence chips below the comments (read-only, using `EvidenceLinkManager` with `readOnly` prop or simple chip display) |

### Phase 7d: Soft Nudge for Evidence

| File | Change |
|------|--------|
| `record-test.tsx` | When status is "Pass" or "Fail" and no evidence attached, show a subtle `Alert` (not blocking): "For audit trail completeness, consider linking supporting documents." |

**Verify:** Record Test page → add evidence links → submit → navigate to Test History tab → evidence chips display on the test run. Submit without evidence on a Pass → nudge message shown.

---

## File Conflict Map

| File | #2 | #4 | #5 | #6 | #7 |
|------|:--:|:--:|:--:|:--:|:--:|
| `App.tsx` | X | | | | |
| `control-detail.tsx` | X | X | X | | X |
| `QuestionCard.tsx` | | X | X | | |
| `controls.tsx` | | | | X | |
| `record-test.tsx` | | | | | X |
| `schema.ts` | | X | | X | X |
| `storage.ts` | | X | | X | X |
| `routes.ts` | | X | | X | X |

The key conflict zone is `control-detail.tsx` (touched by #2, #4, #5, #7). Implementing in the sequence #2 → #5 → #4 → #7 minimises conflicts.

---

## Verification (End-to-End)

1. `npm run db:push` — apply schema migration
2. `npm run dev` — start dev server
3. Open a control with 6+ questions → **scroll works** (#2)
4. Type a response → "Saving..." → **"Saved" persists** (#5)
5. Click "Save All" → all questions show "Saving..." → **"Saved"** (#5)
6. Add evidence to a question → chip appears with type/title → **persists on refresh** (#4)
7. Navigate to controls list → **"Responses" column with progress bars** (#6)
8. Record a test → **attach evidence links** → submit → view in Test History with evidence (#7)
9. `npm run check` — TypeScript passes
10. `npm run build` — production build succeeds
