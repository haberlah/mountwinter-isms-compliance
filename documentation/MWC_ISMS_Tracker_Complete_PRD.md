# MWC (ISMS Compliance Tracker) — Complete PRD & Prompt Sequence

**Version:** V1.3 (Single-user MVP with Persona-Based Questionnaires & Organization Context)  
**Purpose:** Production-ready compliance tracker with AI-powered audit support  
**Estimated Build Time:** 10-14 hours with Replit Agent (including testing between prompts)

---

## Table of Contents

1. [How to Use This Document](#how-to-use-this-document-with-replit-agent)
2. [V1 Prompts (MVP)](#v1-prompts-mvp)
   - Prompt 0: Planning Phase
   - Prompt 1: Database & Seed Data
   - Prompt 2: Layout & Navigation
   - Prompt 3: Controls List & Filtering
   - Prompt 4: Control Detail & Settings
   - Prompt 5: Test Recording
   - Prompt 5.5: Ontology Schema Migration *(NEW)*
   - Prompt 6: Persona Questionnaire Display *(REVISED)*
   - Prompt 7: Persona AI Test Analysis *(REVISED)*
   - Prompt 8: Dashboard *(ENHANCED)*
   - Prompt 9: Settings & Polish
   - Prompt 10: Organization Setup & AI Context *(NEW)*
3. [V2 Prompts (Multi-User Expansion)](#v2-prompts-multi-user-expansion)
4. [Seed Data Reference](#seed-data-reference)
5. [Ontology Reference](#ontology-reference)

---

## How to Use This Document with Replit Agent

### Prompting Workflow

1. **Prompt 0 (Plan Mode):** Switch Replit to Plan Mode → Paste prompt → Wait for confirmation
2. **Prompt 1 (Build Mode):** Switch to Build Mode → Paste prompt → Wait for checkpoint
3. **Seed Data:** Immediately after Prompt 1 completes, paste the seed data
4. **Prompts 2-5:** Paste each prompt → Wait for checkpoint → Verify before proceeding
5. **Prompt 5.5:** Schema migration for ontology → Provide ontology JSON after checkpoint
6. **Prompts 6-10:** Continue with enhanced prompts → Prompt 10 adds organization customization

### Checkpoints

Each prompt ends with `**Create checkpoint: "Name"**`. After Replit confirms the checkpoint:
- Briefly test the new functionality
- Check for console errors
- Only proceed to next prompt if working

### If Something Breaks

- Use Replit's "Restore to checkpoint" feature
- Re-paste the prompt with clarifications
- Don't skip ahead — prompts depend on previous work

---

# V1 Prompts (MVP)

---

## Prompt 0: Planning Phase

> **Switch to Plan Mode before pasting**

```
MWC - ISMS Compliance Tracker

I want to build an ISO 27001:2022 compliance tracking application for a single user.

## Project Overview
A compliance tracker for managing 100 ISO 27001:2022 security controls. Users record test results, view pre-loaded audit questionnaires with persona-based filtering, and use AI to analyze responses. Dashboards show compliance status. This is V1 — single user, no authentication.

## Core Features
1. View and manage 100 ISO 27001:2022 controls with filtering by category/status
2. Record test results with immutable audit trail
3. Pre-loaded questionnaires with 503 audit questions (Auditor/Advisor/Analyst personas)
4. AI analysis of test responses with suggested Pass/Fail status
5. Dashboard showing compliance statistics

## Technical Stack
- Frontend: React with Vite, Tailwind CSS, shadcn/ui
- Backend: Express.js with TypeScript
- Database: Replit Database (PostgreSQL with Drizzle ORM)
- AI: Anthropic Claude API (claude-sonnet-4-20250514)

## Database Schema Overview
- control_categories: 5 categories (ISMS Requirements, Organisational, People, Physical, Technological)
- controls: 100 ISO 27001:2022 controls with pre-loaded questionnaires
- organisation_controls: per-control settings (applicability, frequency, responses, persona)
- test_runs: immutable test result records with AI analysis
- ai_interactions: audit log of all AI API calls
- users: single default admin user (id=1) for V1

## Architecture Patterns
- State management: React Query for server state, useState for local
- API: RESTful under /api
- Components: pages/, components/, hooks/, lib/
- All data operations accept userId parameter (defaults to 1 in V1)

## Key Constraints
- test_runs table is INSERT-ONLY (no updates or deletes)
- AI API key stored in Replit Secrets as ANTHROPIC_API_KEY
- Questionnaires pre-loaded from ontology JSON (not generated at runtime)

Please confirm you understand this architecture. Do not build yet.
```

**After confirmation:** Switch to Build Mode for Prompt 1.

---

## Prompt 1: Foundation — Database & Seed Data

> **Use Build Mode**

```
[OBJECTIVE]
Set up database schema, Drizzle ORM, and seed the initial ISO 27001 controls.

[REQUIREMENTS]
1. Configure Replit Database with Drizzle ORM
2. Create all database tables with proper relationships
3. Create seed script that loads controls from JSON
4. Seed the database on first run (check if already seeded)
5. Create a single default user record (id=1, name='Admin', role='admin')

[TECHNICAL DETAILS]

Database tables:

users:
- id: serial primary key
- email: varchar(320) unique, default 'admin@local'
- name: text, default 'Admin'
- role: enum ('admin', 'compliance_officer', 'auditor'), default 'admin'
- created_at: timestamp

control_categories:
- id: serial primary key
- name: text not null
- sort_order: integer

controls:
- id: serial primary key  
- control_number: varchar(20) not null unique
- name: text not null
- description: text
- category_id: foreign key to control_categories
- owner_role: text nullable
- default_frequency: enum ('Annual', 'Quarterly', 'Monthly')
- start_quarter: enum ('Q1', 'Q2', 'Q3', 'Q4')
- cps234_reference: text nullable
- cps230_reference: text nullable
- annex_a_reference: text nullable
- ai_questionnaire: jsonb nullable
- questionnaire_generated_at: timestamp nullable

organisation_controls:
- id: serial primary key
- control_id: foreign key to controls (unique)
- assigned_user_id: foreign key to users nullable
- frequency: enum nullable (override)
- start_quarter: enum nullable (override)
- is_applicable: boolean default true
- exclusion_justification: text
- next_due_date: date nullable
- implementation_responses: jsonb nullable
- implementation_updated_at: timestamp nullable

test_runs:
- id: serial primary key
- organisation_control_id: foreign key
- test_date: timestamp default now()
- tester_user_id: foreign key to users
- status: enum ('Pass', 'PassPrevious', 'Fail', 'Blocked', 'NotAttempted', 'ContinualImprovement')
- comments: text
- ai_analysis: text nullable
- ai_suggested_status: status enum nullable
- ai_confidence: real nullable
- ai_context_scope: enum ('current_only', 'last_3', 'all_history') nullable
- created_at: timestamp default now()

ai_interactions:
- id: serial primary key
- user_id: foreign key to users
- interaction_type: enum ('questionnaire_generation', 'response_review', 'test_analysis')
- control_id: foreign key nullable
- test_run_id: foreign key nullable
- input_summary: text
- output_summary: text
- model_used: varchar(100)
- tokens_used: integer
- created_at: timestamp default now()

[SEED DATA]
Create a file `seed-data/controls.json` with this structure:
- categories: array of {id, name, sort_order}
- controls: array of {id, control_number, name, description, category_id, owner_role, default_frequency, start_quarter, cps234_reference, cps230_reference, annex_a_reference}

The seed script should:
1. Check if controls table has data
2. If empty, insert categories then controls
3. Create organisation_controls record for each control (one per control)
4. Create default user if not exists

Note: I will provide the seed data JSON immediately after this prompt completes.

[ACCEPTANCE CRITERIA]
- [ ] Database tables created with proper types and constraints
- [ ] Drizzle schema exports types for TypeScript
- [ ] Seed script runs without errors
- [ ] Controls visible in database after seeding
- [ ] Default user created with id=1

**Create checkpoint: "Database Foundation"**
```

---

### ⚠️ After Prompt 1: Seed Data Entry

Once Replit confirms checkpoint "Database Foundation", paste this follow-up:

```
Create the file `seed-data/controls.json` with this exact content:

[PASTE FULL CONTENTS OF isms_seed_data.json HERE]
```

**Verify before proceeding to Prompt 2:**
1. File exists at `seed-data/controls.json`
2. Run the app — seed script should execute
3. Database has controls and 5 categories

---

## Prompt 2: Layout & Navigation

> **Use Build Mode**

```
[OBJECTIVE]
Create the application layout with navigation and placeholder pages.

[REQUIREMENTS]
1. Create responsive layout with sidebar navigation
2. Create useCurrentUser hook returning static admin user
3. Create permission utilities (all return true for V1)
4. Set up React Router with page placeholders
5. Apply consistent styling with Tailwind and shadcn/ui

[TECHNICAL DETAILS]

Layout structure:
- Sidebar (256px): Logo, navigation links, user info at bottom
- Main area: Page content with header showing current page title
- Mobile: Collapsible sidebar with hamburger menu

Navigation links:
- Dashboard (/)
- Controls (/controls)
- Settings (/settings)

hooks/useCurrentUser.ts:
- Returns { user: { id: 1, name: 'Admin', role: 'admin' }, isAuthenticated: true }
- This will be replaced with real auth in V2

utils/permissions.ts:
- canRecordTest(role) => true
- canEditSettings(role) => true  
- canViewAIAnalysis(role) => true
- Export UserRole type

Page placeholders:
- Dashboard: "Dashboard coming soon"
- Controls: "Controls list coming soon"
- Settings: "Settings coming soon"

[STYLING & BRANDING]

App name: "MWC - ISMS Compliance Tracker"
Full name (footer/about): "Mountwinter Compliance"
Logo: Use placeholder icon (Shield from Lucide) until provided

Design system: Linear-style minimal monochrome with single accent color

Color palette (Tailwind classes):
- Primary accent: blue-600 (#2563EB) — buttons, links, active states, focus rings
- Primary hover: blue-700 (#1D4ED8)
- Background: zinc-50 (#FAFAFA) — main content area
- Sidebar: zinc-100 (#F4F4F5) — light sidebar
- Cards: white (#FFFFFF) — content cards
- Text primary: zinc-900 (#18181B)
- Text secondary: zinc-500 (#71717A)
- Borders: zinc-200 (#E4E4E7)

Status badge colors (pill style with light backgrounds):
- Pass: bg-green-100 text-green-700 border border-green-200
- PassPrevious: bg-blue-100 text-blue-700 border border-blue-200
- Fail: bg-red-100 text-red-700 border border-red-200
- Blocked: bg-amber-100 text-amber-700 border border-amber-200
- NotAttempted: bg-zinc-100 text-zinc-500 border border-zinc-200
- ContinualImprovement: bg-violet-100 text-violet-700 border border-violet-200

Typography:
- Font: Inter (shadcn/ui default)
- Headings: font-semibold tracking-tight
- Body: font-normal

UI principles:
- Minimal borders — use spacing and subtle background colors instead
- Cards use shadow-sm, not heavy borders
- Generous whitespace — content should breathe
- Tables have hover states (hover:bg-zinc-50)
- Active nav link: bg-zinc-200 text-zinc-900 font-medium
- Icons: Lucide (consistent, clean)
- No gradients — flat, clean surfaces
- Focus states: ring-2 ring-blue-500 ring-offset-2

[ACCEPTANCE CRITERIA]
- [ ] Layout renders with sidebar and main content area
- [ ] Navigation between pages works
- [ ] useCurrentUser hook returns admin user
- [ ] Responsive on mobile (sidebar collapses)
- [ ] No TypeScript errors

**Create checkpoint: "Layout & Navigation"**
```

---

## Prompt 3: Controls List & Filtering

> **Use Build Mode**

```
[OBJECTIVE]
Build the controls list page with filtering and search.

[REQUIREMENTS]
1. Display all controls in a sortable, filterable table
2. Show control status based on latest test run
3. Filter by category, status, and search text
4. Click row to navigate to control detail
5. Show compliance summary stats at top

[TECHNICAL DETAILS]

API endpoints:
- GET /api/controls - returns controls with latest test status
- GET /api/controls/stats - returns counts by status

Controls table columns:
- Control # (sortable)
- Name
- Category
- Status (color-coded badge)
- Last Tested (date)
- Frequency
- Owner

Status calculation:
- If no test_runs: "Not Attempted"
- Otherwise: most recent test_run.status

Filters (in filter bar above table):
- Category dropdown (All, ISMS Requirements, Organisational, People, Physical, Technological)
- Status dropdown (All, Pass, Fail, Blocked, Not Attempted, etc.)
- Search input (filters by control_number or name)

Summary cards at top:
- Total Controls
- Passed (green)
- Failed (red)
- Not Attempted (gray)

[INTEGRATION]
- Use React Query for data fetching
- Use shadcn/ui Table, Select, Input, Badge components

[ACCEPTANCE CRITERIA]
- [ ] All controls display in table
- [ ] Filtering by category works
- [ ] Filtering by status works
- [ ] Search filters by number and name
- [ ] Clicking row navigates to /controls/[controlNumber]
- [ ] Summary stats show correct counts

**Create checkpoint: "Controls List"**
```

---

## Prompt 4: Control Detail & Settings

> **Use Build Mode**

```
[OBJECTIVE]
Build the control detail page showing control info, settings, and test history.

[REQUIREMENTS]
1. Display control metadata (number, name, description, references)
2. Show/edit organisation_controls settings (applicability, frequency)
3. Display test history in reverse chronological order
4. Button to record new test (navigates to test form)
5. Show implementation responses section

[TECHNICAL DETAILS]

API endpoints:
- GET /api/controls/:controlNumber - returns control with organisation_control and test history
- PATCH /api/organisation-controls/:id - update settings

Page layout (tabs):
1. AI Questionnaire: questionnaire display (populated in Prompt 6)
2. Test History: table of all test_runs with status, date, tester, comments
3. Implementation: questionnaire responses (editable)
4. Settings: applicability toggle, frequency override, exclusion justification

Control info display:
- Control number and name (large heading)
- Category badge
- Current status badge
- Description
- Annex A reference, CPS 234/230 references

Settings form:
- Applicable: toggle (if false, show exclusion justification textarea)
- Frequency: dropdown (Annual, Quarterly, Monthly, or "Use Default")
- Start Quarter: dropdown
- Save button

Due date calculation (on save):
- Calculate next_due_date based on frequency and start_quarter
- Annual + Q2 start → Next April 1st (or current year if not passed)
- Quarterly → First day of next quarter
- Monthly → First day of next month
- After test recorded, advance to next period automatically

Test history table:
- Date
- Status (color badge)
- Tester
- Comments (truncated)
- AI Suggested (if different from actual)
- Expand to see full AI analysis

[ACCEPTANCE CRITERIA]
- [ ] Control detail loads with all info
- [ ] Settings can be edited and saved
- [ ] Test history displays correctly
- [ ] "Record Test" button visible
- [ ] Inapplicable controls show justification requirement

**Create checkpoint: "Control Detail"**
```

---

## Prompt 5: Test Recording (Immutable)

> **Use Build Mode**

```
[OBJECTIVE]
Build the test recording form that creates immutable test_run records.

[REQUIREMENTS]
1. Form to record a new test for a control
2. Select status from dropdown
3. Add comments/observations
4. Submit creates immutable record (no edit/delete)
5. Redirect to control detail after save

[TECHNICAL DETAILS]

API endpoint:
- POST /api/test-runs - creates new test_run (INSERT only, no UPDATE/DELETE endpoints)

Route: /controls/:controlNumber/test

Form fields:
- Status: dropdown (Pass, PassPrevious, Fail, Blocked, NotAttempted, ContinualImprovement)
- Comments: textarea for observations
- Hidden: tester_user_id = 1 (current user)

Page layout:
- Header: "Record Test for [Control Number]: [Control Name]"
- Show control description for reference
- Show last test result if exists
- Form with fields
- Cancel and Submit buttons

Immutability enforcement:
- Only POST endpoint exists for test_runs
- No PUT/PATCH/DELETE routes
- Frontend has no edit/delete UI

After submit:
- Show success toast
- Redirect to control detail page
- New test appears in history

[ACCEPTANCE CRITERIA]
- [ ] Form displays for selected control
- [ ] All status options available
- [ ] Submit creates test_run record
- [ ] Record visible in test history
- [ ] No way to edit or delete test runs
- [ ] tester_user_id correctly set to 1

**Create checkpoint: "Test Recording"**
```

---

## Prompt 5.5: Ontology Schema Migration

> **Use Build Mode**

```
[OBJECTIVE]
Migrate the database schema and seed data to support the enhanced ISO 27001 ontology 
with persona-based questionnaires. This prepares the foundation for Prompt 6.

[CONTEXT]
We have a comprehensive ISO 27001 ontology (iso_27001_ontology.json) that provides:
- 100 controls with 503 audit questions
- 3 user personas: Auditor (282 questions), Advisor (195), Analyst (26)
- Rich question metadata: guidance, evidence types, red flags, severity, etc.

Current state after Prompt 5:
- Controls seeded with basic data
- organisation_controls table has records for all controls
- Test recording form exists and works
- No persona support yet

We need to:
1. Replace controls with 100 individual controls from ontology
2. Add persona support to schema
3. Load rich questionnaire data from ontology
4. Preserve test history structure (test_runs table unchanged)

[SCHEMA CHANGES]

### 1. Add column to `organisation_controls` table

```sql
ALTER TABLE organisation_controls 
ADD COLUMN IF NOT EXISTS selected_persona VARCHAR(20) DEFAULT 'Auditor';

-- Add constraint
ALTER TABLE organisation_controls 
ADD CONSTRAINT valid_persona CHECK (selected_persona IN ('Auditor', 'Advisor', 'Analyst'));
```

### 2. Update Drizzle Schema

In `shared/schema.ts`, add:

```typescript
// Add to organisation_controls table definition
selected_persona: varchar('selected_persona', { length: 20 }).default('Auditor'),

// Add new types
export const personaEnum = ['Auditor', 'Advisor', 'Analyst'] as const;
export type Persona = typeof personaEnum[number];
```

### 3. Enhanced TypeScript Types

Add to `shared/types.ts`:

```typescript
export type Persona = 'Auditor' | 'Advisor' | 'Analyst';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface OntologyQuestion {
  question_id: number;
  question: string;
  guidance: string;
  auditor_focus: string;
  evidence_type: string;
  answer_type: string;
  what_good_looks_like: string;
  red_flags: string;
  nc_pattern: string;
  severity: Severity;
  primary_persona: Persona;
  related_controls: string;
}

export interface ControlQuestionnaire {
  questions: OntologyQuestion[];
  metadata: {
    total_questions: number;
    by_persona: Record<Persona, number>;
  };
}

export interface QuestionResponse {
  question_id: number;
  response_text: string;
  evidence_references: string[];
  last_updated: string;
  answered_by_user_id: number;
}

export interface ImplementationResponses {
  responses: QuestionResponse[];
  completion_status: {
    total: number;
    answered: number;
    by_persona: Record<Persona, { total: number; answered: number }>;
  };
}
```

[ONTOLOGY MIGRATION]

### Step 1: Create Ontology Loader Script

Create `scripts/load-ontology.ts`:

```typescript
// This script:
// 1. Reads iso_27001_ontology.json
// 2. Clears existing controls (test_runs will be orphaned - acceptable for MVP)
// 3. Inserts 100 controls with full questionnaire data
// 4. Creates organisation_controls for each new control
// 5. Logs the migration as an ai_interaction

// Key logic:
// - Map ontology category names to existing category IDs:
//   "ISMS Requirements" → category_id 1
//   "Organisational Controls" → category_id 2
//   "People Controls" → category_id 3
//   "Physical Controls" → category_id 4
//   "Technological Controls" → category_id 5

// - Transform ontology questions array to ai_questionnaire JSONB
// - Set questionnaire_generated_at to current timestamp
// - Default owner_role based on category:
//   - ISMS Requirements → 'IS'
//   - Organisational Controls → 'IS' 
//   - People Controls → 'HR'
//   - Physical Controls → 'Facilities'
//   - Technological Controls → 'SOC Team'
// - Default frequency: 'Annual'
// - Default start_quarter: 'Q1'
```

### Step 2: Data Transformation

From ontology JSON:
```json
{
  "control_number": "RQ4",
  "control_name": "Context of the Organisation and Scope",
  "category": "ISMS Requirements",
  "questions": [
    {
      "question_id": 1,
      "question": "...",
      "guidance": "...",
      ...
    }
  ]
}
```

To database:
```sql
INSERT INTO controls (
  control_number,
  name,
  description,
  category_id,
  owner_role,
  default_frequency,
  start_quarter,
  ai_questionnaire,
  questionnaire_generated_at
) VALUES (
  'RQ4',
  'Context of the Organisation and Scope',
  (first question's guidance as summary),
  1,
  'IS',
  'Annual',
  'Q1',
  '{"questions": [...], "metadata": {"total_questions": 6, "by_persona": {...}}}',
  NOW()
);
```

[VERIFICATION CHECKLIST]

After running migration and ontology load:
- [ ] 100 controls in database (SELECT COUNT(*) FROM controls)
- [ ] 5 categories unchanged
- [ ] Each control has ai_questionnaire with questions array
- [ ] organisation_controls has 100 records with selected_persona = 'Auditor'
- [ ] TypeScript compiles without errors
- [ ] Existing API endpoints still work (/api/controls, /api/controls/:controlNumber)
- [ ] Controls list page loads and shows 100 controls
- [ ] Control detail page loads (questionnaire tab may be empty UI for now)

[FILES TO PROVIDE]

After checkpoint, I will provide:
- `iso_27001_ontology.json` - Place in project root or `seed-data/`

[WARNING TO USER]

Display this message after migration:
"Ontology migration complete. 100 controls loaded with 503 audit questions. 
Note: Previous test history has been reset. This is expected for the ontology upgrade."

[ACCEPTANCE CRITERIA]
- [ ] selected_persona column added to organisation_controls
- [ ] 100 controls loaded from ontology
- [ ] 503 questions distributed across controls
- [ ] Persona counts correct: Auditor=282, Advisor=195, Analyst=26
- [ ] Types updated and compiling
- [ ] Migration logged to ai_interactions
- [ ] Existing pages still functional

**Create checkpoint: "Ontology Schema Migration"**
```

---

### ⚠️ After Prompt 5.5: Load Ontology Data

Once Replit confirms checkpoint, paste:

```
Now load the ontology data. The file iso_27001_ontology.json contains:
- 100 controls
- 503 questions with rich metadata

Run the ontology loader to:
1. Clear existing controls
2. Insert 100 controls from ontology
3. Create organisation_controls for each
4. Verify counts match expected (100 controls, 503 questions)

[PASTE FULL CONTENTS OF iso_27001_ontology.json HERE OR REFERENCE FILE PATH]
```

---

### ⚠️ Before Prompt 6: Set Up API Key

Before proceeding, add your Anthropic API key to Replit Secrets:
1. Open Replit Secrets (lock icon in sidebar)
2. Add: `ANTHROPIC_API_KEY` = your key
3. The key will be available to the app

---

## Prompt 6: Persona-Aware Questionnaire Display

> **Use Build Mode**

```
[OBJECTIVE]
Enhance the existing "AI Questionnaire" tab on the control detail page to display 
pre-loaded questions from the ontology with persona selection and response recording.

[CONTEXT]
After Prompt 5.5:
- 100 controls loaded with ai_questionnaire JSONB containing 503 questions
- organisation_controls has selected_persona column (default 'Auditor')
- Questions tagged by persona: Auditor (282), Advisor (195), Analyst (26)

The control detail page from Prompt 4 already has:
- Tabbed interface: "AI Questionnaire", "Test History", "Implementation"
- Control metadata header
- Settings sidebar

We need to enhance the "AI Questionnaire" tab with persona-aware display.

[DO NOT REBUILD]
Keep existing structure:
- Control detail page layout
- Tab navigation (AI Questionnaire, Test History, Implementation)
- Settings sidebar
- "Record Test" and "Back to Controls" buttons
- All existing functionality from Prompts 4-5

[REQUIREMENTS]

### 1. Persona Selector Component

Add at top of AI Questionnaire tab:

```tsx
// components/PersonaSelector.tsx
interface PersonaSelectorProps {
  selected: Persona;
  questionCounts: { Auditor: number; Advisor: number; Analyst: number };
  onChange: (persona: Persona) => void;
  disabled?: boolean;
}
```

Visual design:
- Horizontal button group with 3 options
- Each button shows: Icon + Label + Count
- Icons from Lucide: Shield (Auditor), Lightbulb (Advisor), BarChart3 (Analyst)
- Selected: bg-blue-600, text-white
- Unselected: bg-zinc-100, text-zinc-700, hover:bg-zinc-200
- Compact mobile: Icons only with tooltip

### 2. Question Display Component

```tsx
// components/QuestionCard.tsx
interface QuestionCardProps {
  question: OntologyQuestion;
  questionNumber: number;
  response?: QuestionResponse;
  persona: Persona;
  onResponseChange: (questionId: number, response: string) => void;
  onEvidenceAdd: (questionId: number, filename: string) => void;
}
```

Question card layout:
```
┌─────────────────────────────────────────────────────────────┐
│ Q1                                           [Critical] 🔴  │
├─────────────────────────────────────────────────────────────┤
│ Provide the documented internal and external issues         │
│ affecting your ISMS.                                        │
│                                                             │
│ ▸ Guidance                     (collapsible, default open)  │
│   Context documentation review. Look for: SWOT/PESTLE...    │
│                                                             │
│ ▸ Auditor Focus               (Auditor persona only)        │
│   Is this organisation-specific or a generic template?      │
│                                                             │
│ ▸ What Good Looks Like        (Advisor persona highlighted) │
│   Organisation-specific context document with dated...      │
│                                                             │
│ ▸ Red Flags ⚠️                 (Auditor persona only)        │
│   Generic template without customisation; No regulatory...  │
│                                                             │
│ Expected: REGISTER; RECORD | Format: Document               │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Your Response:                                          │ │
│ │ ________________________________________________        │ │
│ │ |                                              |        │ │
│ │ |                                              |        │ │
│ │ ------------------------------------------------        │ │
│ │ Evidence: policy_v2.pdf, risk_register.xlsx    [+ Add]  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                    [Unsaved •] / [Saved ✓]  │
└─────────────────────────────────────────────────────────────┘
```

### 3. Persona-Specific Display Rules

Show/hide fields based on selected persona:

| Field | Auditor | Advisor | Analyst |
|-------|---------|---------|---------|
| question | Always | Always | Always |
| guidance | Open | Open | Open |
| auditor_focus | **Highlighted** | Collapsed | Hidden |
| what_good_looks_like | Collapsed | **Highlighted** | Collapsed |
| red_flags | Visible | Hidden | Hidden |
| nc_pattern | Collapsed | Hidden | Hidden |
| evidence_type | Visible | Visible | Visible |
| severity | Visible | Visible | Visible |
| related_controls | Collapsed | Visible | Collapsed |

Highlighted = Visible by default, with accent background (blue-50)
Collapsed = Expandable, starts collapsed
Hidden = Not rendered

### 4. Filter Questions by Persona

When persona is selected, show only questions where `primary_persona` matches.
Add toggle to show all questions:

```tsx
<ViewModeToggle>
  <ToggleButton active={viewMode === 'persona'}>
    By Persona ({filteredCount})
  </ToggleButton>
  <ToggleButton active={viewMode === 'all'}>
    All Questions ({totalCount})
  </ToggleButton>
</ViewModeToggle>
```

When "All Questions" selected, group by persona with headers.

### 5. Response Recording

Save responses to organisation_controls.implementation_responses:

```typescript
// Enhanced structure for implementation_responses JSONB
{
  "responses": [
    {
      "question_id": 1,
      "response_text": "Our context document includes...",
      "evidence_references": ["context_2025.pdf"],
      "last_updated": "2026-01-27T10:30:00Z",
      "answered_by_user_id": 1
    }
  ],
  "completion_status": {
    "total": 6,
    "answered": 3,
    "by_persona": {
      "Auditor": { "total": 5, "answered": 2 },
      "Advisor": { "total": 1, "answered": 1 },
      "Analyst": { "total": 0, "answered": 0 }
    }
  }
}
```

Auto-save behavior:
- Debounce 2 seconds after typing stops
- Show "Saving..." indicator
- Show "Saved ✓" on success
- Manual "Save All" button as backup

### 6. Progress Indicator

Show completion progress at top of questionnaire:

```tsx
<ProgressSection>
  <ProgressBar value={50} max={100} />
  <ProgressLabel>3 of 6 questions answered (50%)</ProgressLabel>
  
  {/* Mini breakdown by persona */}
  <ProgressDetails>
    <span>Auditor: 2/5</span>
    <span>Advisor: 1/1</span>
    <span>Analyst: 0/0</span>
  </ProgressDetails>
</ProgressSection>
```

### 7. API Endpoints

```typescript
// Get control with questionnaire and responses
GET /api/controls/:controlNumber
// Already exists, ensure it returns:
// - ai_questionnaire from controls table
// - implementation_responses from organisation_controls
// - selected_persona from organisation_controls

// Update selected persona
PATCH /api/organisation-controls/:id/persona
Body: { persona: 'Auditor' | 'Advisor' | 'Analyst' }
Response: { success: true, selected_persona: 'Advisor' }

// Save question response (already exists, enhance)
PATCH /api/organisation-controls/:id
Body: { implementation_responses: {...} }
// Existing endpoint, ensure it handles new JSONB structure

// NEW: Save single question response (more granular)
PATCH /api/organisation-controls/:id/response
Body: {
  question_id: number,
  response_text: string,
  evidence_references: string[]
}
// Merges into existing implementation_responses
```

### 8. Severity Badge Component

```tsx
// components/SeverityBadge.tsx
const severityColors = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-green-100 text-green-700 border-green-200'
};
```

### 9. AI Interaction Logging

Log questionnaire views (not generations, since pre-loaded):

```typescript
// When user views questionnaire for first time in session
await logAIInteraction({
  user_id: 1,
  interaction_type: 'questionnaire_generation', // reuse existing type
  control_id: control.id,
  input_summary: `Viewed questionnaire for ${control.control_number}`,
  output_summary: `${questions.length} questions displayed (${persona} persona)`,
  model_used: 'ontology-preloaded',
  tokens_used: 0
});
```

[STYLING]

Use existing Linear-style design:
- Card backgrounds: white with shadow-sm
- Borders: zinc-200
- Primary accent: blue-600
- Collapsible chevrons: zinc-400
- Response textarea: standard input styling
- Progress bar: blue-600 on zinc-200 track

[ACCEPTANCE CRITERIA]
- [ ] Persona selector displays with correct question counts
- [ ] Switching persona filters visible questions
- [ ] Persona selection persists via API
- [ ] Questions display with all metadata fields
- [ ] Collapsible sections work (Guidance, Red Flags, etc.)
- [ ] Severity badges show correct colors
- [ ] Persona-specific fields shown/hidden correctly
- [ ] Responses auto-save with debounce
- [ ] Progress indicator updates in real-time
- [ ] View mode toggle works (By Persona / All)
- [ ] Evidence references can be added (text input for filenames)
- [ ] Mobile responsive layout maintained

**Create checkpoint: "Persona Questionnaire UI"**
```

---

## Prompt 7: Persona-Grounded AI Test Analysis

> **Use Build Mode**

```
[OBJECTIVE]
Add AI analysis of questionnaire responses that adapts its voice and focus based 
on the selected persona. Integrates with the existing test recording form from Prompt 5.

[CONTEXT]
After Prompt 6:
- Questionnaire tab displays persona-filtered questions
- Users can record responses to questions
- selected_persona stored per control
- Responses stored in implementation_responses JSONB

The test recording form from Prompt 5 exists at `/controls/:controlNumber/test`.
We need to add AI analysis capability that is persona-aware.

[DO NOT REBUILD - ENHANCE EXISTING]

Keep unchanged from Prompt 5:
- Test recording form structure and layout
- Status dropdown with all 6 options (Pass, Pass (Previous), Fail, Blocked, Not Attempted, Continual Improvement)
- Comments textarea
- Cancel and Submit buttons
- Navigation and routing
- Immutable INSERT-only behavior for test_runs

Only ADD these new elements:
- "Analyze with AI" button
- Streaming analysis display panel
- AI suggested status with confidence
- Persona indicator showing which persona is being used

[PERSONA BEHAVIOR PROFILES]

### Auditor Persona
**Voice:** Formal, evidence-focused, verification-oriented
**System prompt emphasis:**
- Check responses against `red_flags` - explicitly flag any matches
- Evaluate using `auditor_focus` criteria from each question
- Reference `nc_pattern` when issues found
- Be specific about evidence gaps per `evidence_type`
- Frame findings as audit observations

**Output emphasis:**
- Red flags triggered (list)
- Non-conformity risk areas
- Evidence gaps identified
- Compliance/non-compliance determination

### Advisor Persona  
**Voice:** Collaborative, improvement-focused, consultative
**System prompt emphasis:**
- Compare responses to `what_good_looks_like` criteria
- Identify improvement opportunities constructively
- Reference `related_controls` for holistic recommendations
- Focus on maturity progression and best practices
- Balance critique with recognition of strengths

**Output emphasis:**
- Improvement opportunities (prioritized list)
- Maturity assessment (Initial/Developing/Defined/Managed/Optimized)
- Related controls to review
- Best practice recommendations

### Analyst Persona
**Voice:** Data-driven, objective, metrics-focused
**System prompt emphasis:**
- Quantify compliance level as percentage/score
- Count criteria met vs. total criteria per question
- Identify measurable gaps
- Suggest KPIs for ongoing monitoring
- Present statistical summary

**Output emphasis:**
- Compliance score (0-100%)
- Criteria breakdown (X of Y met)
- Gap quantification
- Suggested monitoring KPIs

[REQUIREMENTS]

### 1. Enhanced Test Recording Form

Add to existing form (above Submit button):

```tsx
<AnalysisSection>
  <PersonaIndicator>
    Analyzing as: <PersonaBadge persona={selectedPersona} />
    <Link to={`/controls/${controlNumber}`}>Change persona</Link>
  </PersonaIndicator>
  
  <AnalyzeButton 
    onClick={requestAnalysis}
    disabled={isAnalyzing || !hasResponses}
  >
    {isAnalyzing ? (
      <><Spinner /> Analyzing...</>
    ) : (
      <><Sparkles /> Analyze with AI</>
    )}
  </AnalyzeButton>
  
  {!hasResponses && (
    <HelpText>Add questionnaire responses to enable AI analysis</HelpText>
  )}
</AnalysisSection>

{analysisResult && (
  <AnalysisResultsPanel>
    {/* Streaming content appears here */}
  </AnalysisResultsPanel>
)}
```

### 2. Streaming Analysis API

```typescript
// POST /api/controls/:controlNumber/analyze
// Uses Server-Sent Events for streaming

Request body: {
  persona: 'Auditor' | 'Advisor' | 'Analyst',
  include_history: boolean,  // include last 3 test results
  comments: string  // tester's comments from form
}

Response: Server-Sent Events stream
event: token
data: {"text": "Based on the evidence..."}

event: complete
data: {
  "assessment": "Overall assessment text...",
  "suggested_status": "Pass",
  "confidence": 0.85,
  "observations": ["...", "..."],
  "recommendations": ["...", "..."],
  "persona_specific": {
    // Varies by persona - see below
  }
}
```

### 3. Persona-Specific Output Structure

**Auditor persona_specific:**
```json
{
  "red_flags_triggered": ["Generic template detected", "No review evidence"],
  "nc_risk_areas": ["Documentation currency", "Stakeholder traceability"],
  "evidence_gaps": ["Missing dated review", "No version control"],
  "audit_opinion": "Partial conformity - documentation exists but lacks currency"
}
```

**Advisor persona_specific:**
```json
{
  "improvement_opportunities": [
    "Add version control to context document",
    "Include climate change considerations"
  ],
  "maturity_assessment": "Developing - processes exist but not consistently applied",
  "related_controls_to_review": ["RQ6", "5.1", "5.7"],
  "quick_wins": ["Update document date", "Add stakeholder sign-off"]
}
```

**Analyst persona_specific:**
```json
{
  "compliance_score": 67,
  "criteria_met": 4,
  "criteria_total": 6,
  "gap_analysis": [
    {"criterion": "Dated review", "status": "missing", "weight": "high"},
    {"criterion": "Version control", "status": "partial", "weight": "medium"}
  ],
  "suggested_kpis": [
    "Document review completion rate",
    "Days since last context update"
  ]
}
```

### 4. AI System Prompt Construction

```typescript
function buildAnalysisSystemPrompt(
  persona: Persona,
  control: Control,
  questions: OntologyQuestion[]
): string {
  const basePrompt = `You are an ISO 27001:2022 compliance ${persona.toLowerCase()} 
analyzing responses for control ${control.control_number}: ${control.name}.

Your task is to evaluate whether the responses demonstrate adequate implementation 
and suggest an appropriate test status.`;

  const personaPrompts = {
    Auditor: `
As an AUDITOR, your role is evidence verification. You must:
1. Verify each response against the expected evidence type
2. Check for RED FLAGS - explicitly call out any that apply:
${questions.map(q => `   - Q${q.question_id}: ${q.red_flags}`).join('\n')}
3. Reference NC (non-conformity) patterns when issues found
4. Be direct about documentation gaps
5. Consider if an external certification auditor would accept this evidence

Evaluation criteria per question:
${questions.map(q => `Q${q.question_id} - Auditor Focus: ${q.auditor_focus}`).join('\n')}

Your assessment should read like an audit observation.`,

    Advisor: `
As an ADVISOR, your role is improvement guidance. You must:
1. Compare responses to "what good looks like":
${questions.map(q => `   - Q${q.question_id}: ${q.what_good_looks_like}`).join('\n')}
2. Identify improvement opportunities constructively
3. Consider related controls for holistic recommendations: 
${[...new Set(questions.map(q => q.related_controls))].join(', ')}
4. Assess maturity level (Initial/Developing/Defined/Managed/Optimized)
5. Balance critique with recognition of strengths

Your assessment should read like a consulting recommendation.`,

    Analyst: `
As an ANALYST, your role is quantitative assessment. You must:
1. Score each response against its criteria (met/partial/not met)
2. Calculate overall compliance percentage
3. Quantify gaps with specific counts and percentages
4. Identify measurable improvement areas
5. Suggest KPIs for ongoing monitoring

Evaluation criteria counts:
${questions.map(q => {
  const criteria = q.what_good_looks_like.split(' and ').length;
  return `Q${q.question_id}: ${criteria} criteria`;
}).join('\n')}

Your assessment should read like a data-driven report.`
  };

  return `${basePrompt}\n${personaPrompts[persona]}`;
}
```

### 5. Streaming Implementation

```typescript
// Backend: routes/analysis.ts
import Anthropic from '@anthropic-ai/sdk';

app.post('/api/controls/:controlNumber/analyze', async (req, res) => {
  const { persona, include_history, comments } = req.body;
  
  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const anthropic = new Anthropic();
  
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: buildAnalysisSystemPrompt(persona, control, questions),
    messages: [{ 
      role: 'user', 
      content: buildAnalysisUserMessage(questions, responses, comments, history)
    }]
  });
  
  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      res.write(`event: token\ndata: ${JSON.stringify({ text: event.delta.text })}\n\n`);
    }
  }
  
  const finalMessage = await stream.finalMessage();
  const fullText = finalMessage.content[0].text;
  
  // Parse JSON from response
  const analysis = parseAnalysisJSON(fullText);
  
  // Log AI interaction
  await logAIInteraction({
    user_id: 1,
    interaction_type: 'test_analysis',
    control_id: control.id,
    input_summary: `${persona} analysis for ${control.control_number}`,
    output_summary: `Status: ${analysis.suggested_status}, Confidence: ${analysis.confidence}`,
    model_used: 'claude-sonnet-4-20250514',
    tokens_used: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens
  });
  
  res.write(`event: complete\ndata: ${JSON.stringify(analysis)}\n\n`);
  res.end();
});
```

### 6. Analysis Results Display

```tsx
<AnalysisResultsPanel>
  {/* Streaming text display */}
  {isAnalyzing && (
    <StreamingText>{streamedText}</StreamingText>
  )}
  
  {/* Final results */}
  {result && (
    <>
      <StatusSuggestion>
        <SuggestedBadge status={result.suggested_status} />
        <ConfidenceMeter value={result.confidence} />
        <span>{Math.round(result.confidence * 100)}% confidence</span>
      </StatusSuggestion>
      
      <Assessment>{result.assessment}</Assessment>
      
      <ObservationsList>
        <h4>Observations</h4>
        <ul>
          {result.observations.map((obs, i) => <li key={i}>{obs}</li>)}
        </ul>
      </ObservationsList>
      
      {/* Persona-specific sections */}
      {persona === 'Auditor' && result.persona_specific.red_flags_triggered?.length > 0 && (
        <RedFlagsAlert>
          <AlertTriangle className="text-red-500" />
          <h4>Red Flags Identified</h4>
          <ul>
            {result.persona_specific.red_flags_triggered.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </RedFlagsAlert>
      )}
      
      {persona === 'Advisor' && (
        <ImprovementSection>
          <h4>Improvement Opportunities</h4>
          <ul>
            {result.persona_specific.improvement_opportunities?.map((opp, i) => (
              <li key={i}>{opp}</li>
            ))}
          </ul>
          <MaturityBadge level={result.persona_specific.maturity_assessment} />
        </ImprovementSection>
      )}
      
      {persona === 'Analyst' && (
        <MetricsSection>
          <ComplianceScore value={result.persona_specific.compliance_score} />
          <span>
            {result.persona_specific.criteria_met} of {result.persona_specific.criteria_total} criteria met
          </span>
          <h4>Suggested KPIs</h4>
          <ul>
            {result.persona_specific.suggested_kpis?.map((kpi, i) => (
              <li key={i}>{kpi}</li>
            ))}
          </ul>
        </MetricsSection>
      )}
      
      <RecommendationsList>
        <h4>Recommendations</h4>
        <ul>
          {result.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
        </ul>
      </RecommendationsList>
      
      <ApplyButton onClick={() => setStatus(result.suggested_status)}>
        Apply Suggested Status: {result.suggested_status}
      </ApplyButton>
    </>
  )}
</AnalysisResultsPanel>
```

### 7. Test Run Record Enhancement

When submitting the test, include AI analysis:

```typescript
// Existing test_runs columns used:
// - ai_analysis: full AI response text
// - ai_suggested_status: AI's suggestion
// - ai_confidence: confidence score
// - ai_context_scope: 'current_only' | 'last_3' | 'all_history'

// Add to test run creation:
const testRun = await db.insert(testRuns).values({
  organisation_control_id: orgControl.id,
  tester_user_id: 1,
  status: selectedStatus,  // Human's final decision
  comments: comments,
  ai_analysis: JSON.stringify(analysisResult),
  ai_suggested_status: analysisResult?.suggested_status,
  ai_confidence: analysisResult?.confidence,
  ai_context_scope: includeHistory ? 'last_3' : 'current_only'
});
```

### 8. Error Handling

```tsx
{error && (
  <ErrorAlert>
    {error.includes('API_KEY') ? (
      <>
        AI analysis requires an API key.
        <Link to="/settings">Configure in Settings →</Link>
      </>
    ) : error.includes('rate') ? (
      <>Rate limit reached. Please wait a moment and try again.</>
    ) : (
      <>Analysis failed: {error}</>
    )}
  </ErrorAlert>
)}
```

[ACCEPTANCE CRITERIA]
- [ ] "Analyze with AI" button appears on test recording form
- [ ] Analysis streams in real-time
- [ ] Persona affects AI voice and focus areas
- [ ] Auditor analysis shows red flags and NC risks
- [ ] Advisor analysis shows improvements and maturity
- [ ] Analyst analysis shows scores and KPIs
- [ ] Suggested status displayed with confidence
- [ ] User can apply or override suggested status
- [ ] Both human status and AI analysis stored in test_run
- [ ] AI interaction logged to ai_interactions table
- [ ] Works gracefully when no responses provided (suggests NotAttempted)
- [ ] Error handling for API failures

**Create checkpoint: "Persona AI Analysis"**
```

---

## Prompt 8: Dashboard

> **Use Build Mode**

```
[OBJECTIVE]
Build the compliance dashboard with statistics, insights, and questionnaire progress.

[REQUIREMENTS]
1. Summary statistics cards (total, passed, failed, etc.)
2. Compliance percentage gauge/chart
3. Questionnaire completion progress
4. Controls due soon list
5. Recent test activity
6. Category breakdown chart
7. Install Recharts library: `npm install recharts`

[TECHNICAL DETAILS]

API endpoint:
- GET /api/dashboard - returns all dashboard data

Dashboard layout (2-column grid on desktop, single column on mobile):

### Row 1: Key Metrics (4 cards)

1. Summary Cards (top row):
- Total Controls: 100 (with "X applicable" subtitle)
- Passed: X (green) — includes Pass and PassPrevious
- Failed: X (red)
- Not Attempted: X (gray)

### Row 2: Progress Indicators (2 cards)

2. Compliance Gauge (left):
- Circular/radial progress showing percentage
- Large percentage number in center
- Color: Green if >80%, yellow 50-80%, red <50%
- Subtitle: "X of Y applicable controls passed"

3. Questionnaire Progress (right):
- Circular/radial progress showing completion percentage
- Calculate: (total questions answered / total questions) * 100
- Subtitle: "X of 503 questions answered"
- Secondary stats below:
  - Controls with complete responses: X/100
  - Controls with partial responses: X/100
  - Controls not started: X/100

### Row 3: Lists (2 columns)

4. Due Soon (left, next 30 days):
- Table: Control #, Name, Due Date, Days Until Due
- Based on next_due_date in organisation_controls
- Max 10 items, sorted by due date (soonest first)
- Color code: Red if overdue, amber if <7 days, default otherwise
- Click row to navigate to control
- Empty state: "No controls due in the next 30 days"

5. Recent Activity (right):
- Last 10 test runs across all controls
- Show: Date (relative, e.g., "2 hours ago"), Control #, Status badge
- Click row to navigate to control
- Empty state: "No tests recorded yet"

### Row 4: Charts (full width)

6. Category Breakdown:
- Stacked horizontal bar chart (one bar per category)
- Shows pass/fail/not attempted counts per category
- Categories: ISMS Requirements, Organisational, People, Physical, Technological
- Use Recharts BarChart with stacked bars
- Legend showing Pass (green), Fail (red), Not Attempted (gray)
- Click category to filter controls list (optional enhancement)

[API RESPONSE STRUCTURE]

```typescript
interface DashboardData {
  summary: {
    total_controls: number;
    applicable_controls: number;
    passed: number;
    failed: number;
    not_attempted: number;
    blocked: number;
    continual_improvement: number;
  };
  compliance: {
    percentage: number;
    passed_count: number;
    applicable_count: number;
  };
  questionnaire_progress: {
    total_questions: number;           // 503
    answered_questions: number;
    percentage: number;
    controls_complete: number;         // All questions answered
    controls_partial: number;          // Some questions answered
    controls_not_started: number;      // No questions answered
  };
  due_soon: Array<{
    control_number: string;
    control_name: string;
    due_date: string;
    days_until_due: number;
    last_tested: string | null;
  }>;
  recent_activity: Array<{
    test_date: string;
    control_number: string;
    control_name: string;
    status: string;
    tester_name: string;
  }>;
  category_breakdown: Array<{
    category_name: string;
    passed: number;
    failed: number;
    not_attempted: number;
  }>;
}
```

[CALCULATIONS]

Compliance %:
- Formula: (Passed / Applicable Controls) * 100
- Exclude non-applicable controls from calculation
- "Passed" includes both Pass and PassPrevious statuses

Questionnaire Progress:
- Count all non-empty responses in implementation_responses.responses array
- Sum across all organisation_controls records
- Total possible: 503 questions

Days Until Due:
- Calculate: next_due_date - today
- Negative values = overdue

[STYLING]

Use existing Linear-style design:
- Cards: white bg, shadow-sm, rounded-lg
- Progress circles: Use Recharts RadialBarChart or custom SVG
- Status colors: green-500 (pass), red-500 (fail), zinc-400 (not attempted)
- Overdue highlighting: red-100 bg with red-700 text
- Due soon (≤7 days): amber-100 bg with amber-700 text

[ACCEPTANCE CRITERIA]
- [ ] All summary cards show correct counts
- [ ] Compliance percentage calculated correctly
- [ ] Questionnaire progress shows accurate completion stats
- [ ] Due soon list shows controls sorted by date
- [ ] Overdue controls highlighted in red
- [ ] Recent activity shows latest 10 tests
- [ ] Category chart renders with correct data
- [ ] Empty states display helpful messages
- [ ] Dashboard loads quickly (<2 seconds)
- [ ] Responsive layout on mobile

**Create checkpoint: "Dashboard"**
```

---

## Prompt 9: Settings & Polish

> **Use Build Mode**

```
[OBJECTIVE]
Add settings page and polish the application for deployment.

[REQUIREMENTS]
1. Settings page with configuration options
2. Error handling and loading states throughout
3. Toast notifications for actions
4. Mobile responsiveness check
5. Final UI polish

[TECHNICAL DETAILS]

Settings page (/settings):

1. API Configuration section:
- Display API key status (configured/not configured)
- Note: "Set ANTHROPIC_API_KEY in Replit Secrets"
- Test connection button

2. Control Defaults section:
- Default frequency for new controls
- Default start quarter

3. Data Management section:
- Export test history (CSV download)
- Statistics summary

API endpoints:
- GET /api/settings - returns current settings
- POST /api/settings/test-api - tests Anthropic connection
- GET /api/export/test-history - returns CSV

Polish checklist:
- All API calls have loading spinners
- All errors show user-friendly messages
- Success actions show toast notifications
- Forms have validation
- Empty states have helpful messages
- 404 page for invalid routes

Mobile responsiveness:
- Sidebar collapses to hamburger menu
- Tables scroll horizontally on small screens
- Forms stack vertically
- Touch-friendly button sizes

Accessibility:
- Proper heading hierarchy
- Form labels linked to inputs
- Color contrast meets WCAG AA
- Keyboard navigation works

[ACCEPTANCE CRITERIA]
- [ ] Settings page functional
- [ ] API test button works
- [ ] Export downloads CSV
- [ ] No console errors
- [ ] Mobile layout works
- [ ] All features from previous prompts still work

**Create checkpoint: "Settings & Polish"**
```

---

## Prompt 10: Organization Setup & AI Context

> **Use Build Mode**

```
[OBJECTIVE]
Add organization profile for AI context and bulk control applicability management.
This personalizes the tracker to a specific organization and improves AI response relevance.

[CONTEXT]
After Prompt 9:
- Settings page has API config, defaults, and data management sections
- Control applicability is toggled per-control on detail pages
- AI analysis uses generic ISO 27001 context

We need to add:
1. Organization profile that provides context for AI-generated analysis
2. Bulk control applicability management (select which controls apply)

[REQUIREMENTS]

### 1. New Database Table

Create `organisation_profile` table:

```sql
CREATE TABLE organisation_profile (
  id SERIAL PRIMARY KEY,
  organisation_id INTEGER DEFAULT 1,  -- For V2 multi-tenancy
  company_name TEXT,
  industry TEXT,  -- e.g., "Financial Services", "Healthcare SaaS", "Technology"
  company_size TEXT,  -- e.g., "1-50", "51-200", "201-1000", "1000+"
  tech_stack TEXT,  -- e.g., "AWS, React, PostgreSQL, Kubernetes"
  deployment_model TEXT,  -- e.g., "Cloud-native SaaS", "Hybrid", "On-premise"
  regulatory_requirements JSONB DEFAULT '[]',  -- ["CPS 234", "GDPR", "SOC 2", "HIPAA"]
  data_classification_levels JSONB DEFAULT '[]',  -- ["Public", "Internal", "Confidential"]
  risk_appetite VARCHAR(20) DEFAULT 'Moderate',  -- 'Conservative', 'Moderate', 'Aggressive'
  additional_context TEXT,  -- Free-form context for AI
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Organization Profile UI

Add new section to Settings page (/settings):

```tsx
<SettingsSection title="Organization Profile">
  <p className="text-zinc-500 mb-4">
    This information helps the AI provide more relevant compliance guidance 
    tailored to your organization.
  </p>
  
  <Form>
    <FormField label="Company Name" optional>
      <Input placeholder="Acme Corporation" />
    </FormField>
    
    <FormField label="Industry">
      <Select options={[
        "Financial Services",
        "Healthcare",
        "Technology / SaaS",
        "Retail / E-commerce",
        "Manufacturing",
        "Government",
        "Education",
        "Other"
      ]} />
    </FormField>
    
    <FormField label="Company Size">
      <Select options={[
        "1-50 employees",
        "51-200 employees",
        "201-1000 employees",
        "1000+ employees"
      ]} />
    </FormField>
    
    <FormField label="Technology Stack" optional>
      <Textarea placeholder="AWS, React, Node.js, PostgreSQL, Kubernetes..." />
    </FormField>
    
    <FormField label="Deployment Model">
      <Select options={[
        "Cloud-native SaaS",
        "Cloud-hosted (IaaS)",
        "Hybrid (Cloud + On-premise)",
        "On-premise only"
      ]} />
    </FormField>
    
    <FormField label="Regulatory Requirements">
      <MultiSelect options={[
        "ISO 27001",
        "SOC 2",
        "CPS 234 (APRA)",
        "CPS 230 (APRA)",
        "GDPR",
        "HIPAA",
        "PCI-DSS",
        "SOX",
        "NIST CSF",
        "Essential Eight",
        "FedRAMP",
        "Other"
      ]} />
    </FormField>
    
    <FormField label="Data Classification Levels" optional>
      <MultiSelect options={[
        "Public",
        "Internal",
        "Confidential",
        "Restricted / Secret"
      ]} />
    </FormField>
    
    <FormField label="Risk Appetite">
      <RadioGroup options={[
        { value: "Conservative", label: "Conservative — Minimize all risks, full compliance" },
        { value: "Moderate", label: "Moderate — Balance risk with business needs" },
        { value: "Aggressive", label: "Aggressive — Accept higher risk for agility" }
      ]} />
    </FormField>
    
    <FormField label="Additional Context for AI" optional>
      <Textarea 
        rows={4}
        placeholder="Any other context that would help the AI understand your organization. E.g., 'We are a Series B startup preparing for SOC 2 Type II audit in Q3. Our main product handles PII for healthcare customers.'"
      />
    </FormField>
    
    <Button type="submit">Save Profile</Button>
  </Form>
</SettingsSection>
```

### 3. Bulk Control Applicability UI

Add new section to Settings page:

```tsx
<SettingsSection title="Control Applicability">
  <p className="text-zinc-500 mb-4">
    Select which controls are applicable to your organization. 
    Non-applicable controls are excluded from compliance calculations and can be hidden from the controls list.
  </p>
  
  <SummaryBar>
    <span>{applicableCount} of 100 controls applicable</span>
    <Checkbox 
      label="Hide non-applicable controls in Controls list" 
      checked={hideNonApplicable}
      onChange={setHideNonApplicable}
    />
  </SummaryBar>
  
  <FilterBar>
    <Select 
      label="Filter by Category"
      options={["All Categories", ...categories]}
      value={categoryFilter}
      onChange={setCategoryFilter}
    />
    <ButtonGroup>
      <Button variant="secondary" onClick={selectAllVisible}>
        Select All Visible
      </Button>
      <Button variant="secondary" onClick={deselectAllVisible}>
        Deselect All Visible
      </Button>
    </ButtonGroup>
  </FilterBar>
  
  <ApplicabilityTable>
    <thead>
      <tr>
        <th><Checkbox for select all /></th>
        <th>Control #</th>
        <th>Name</th>
        <th>Category</th>
        <th>Applicable</th>
      </tr>
    </thead>
    <tbody>
      {controls.map(control => (
        <tr key={control.id}>
          <td><Checkbox checked={selected.includes(control.id)} /></td>
          <td>{control.control_number}</td>
          <td>{control.name}</td>
          <td><CategoryBadge>{control.category}</CategoryBadge></td>
          <td>
            <Toggle 
              checked={control.is_applicable}
              onChange={() => toggleApplicability(control.id)}
            />
          </td>
        </tr>
      ))}
    </tbody>
  </ApplicabilityTable>
  
  <ActionBar>
    <Button onClick={saveChanges} disabled={!hasChanges}>
      Save Changes
    </Button>
    {hasChanges && <span className="text-zinc-500">Unsaved changes</span>}
  </ActionBar>
</SettingsSection>
```

### 4. API Endpoints

```typescript
// Organization Profile
GET  /api/settings/profile
Response: OrganisationProfile | null

PUT  /api/settings/profile
Body: {
  company_name?: string;
  industry?: string;
  company_size?: string;
  tech_stack?: string;
  deployment_model?: string;
  regulatory_requirements?: string[];
  data_classification_levels?: string[];
  risk_appetite?: 'Conservative' | 'Moderate' | 'Aggressive';
  additional_context?: string;
}
Response: OrganisationProfile

// Bulk Applicability
GET  /api/controls/applicability
Response: Array<{
  control_id: number;
  control_number: string;
  name: string;
  category: string;
  is_applicable: boolean;
}>

PATCH /api/controls/applicability
Body: {
  updates: Array<{ control_id: number; is_applicable: boolean }>
}
Response: { updated: number }

// User preference for hiding non-applicable
PATCH /api/settings/preferences
Body: { hide_non_applicable_controls: boolean }
```

### 5. Update AI Analysis to Include Organization Context

Modify the AI prompt construction in the analysis endpoint (from Prompt 7):

```typescript
async function buildAnalysisSystemPrompt(
  persona: Persona,
  control: Control,
  questions: OntologyQuestion[]
): Promise<string> {
  
  // Fetch organization profile
  const profile = await db.query.organisationProfile.findFirst({
    where: eq(organisationProfile.organisation_id, 1)
  });
  
  const basePrompt = `You are an ISO 27001:2022 compliance ${persona.toLowerCase()} 
analyzing responses for control ${control.control_number}: ${control.name}.`;

  // Build organization context section
  const orgContext = profile ? `

## Organization Context
${profile.company_name ? `- Company: ${profile.company_name}` : ''}
${profile.industry ? `- Industry: ${profile.industry}` : ''}
${profile.company_size ? `- Size: ${profile.company_size}` : ''}
${profile.tech_stack ? `- Tech Stack: ${profile.tech_stack}` : ''}
${profile.deployment_model ? `- Deployment: ${profile.deployment_model}` : ''}
${profile.regulatory_requirements?.length ? `- Regulatory Requirements: ${profile.regulatory_requirements.join(', ')}` : ''}
${profile.risk_appetite ? `- Risk Appetite: ${profile.risk_appetite}` : ''}
${profile.additional_context ? `- Additional Context: ${profile.additional_context}` : ''}

When evaluating responses, consider this organizational context:
- Tailor recommendations to the company's industry and size
- Reference relevant regulatory requirements they must meet
- Adjust expectations based on their risk appetite
- Consider their tech stack when discussing technical controls
` : '';

  return `${basePrompt}${orgContext}${personaPrompts[persona]}`;
}
```

### 6. Update Controls List to Support Hiding Non-Applicable

Add query parameter and filter:

```typescript
// GET /api/controls?hide_non_applicable=true
// Filter controls where is_applicable = true when parameter is set

// Frontend: Read preference from settings
const { data: preferences } = useQuery(['preferences'], fetchPreferences);
const hideNonApplicable = preferences?.hide_non_applicable_controls ?? false;

// Pass to API call
const { data: controls } = useQuery(
  ['controls', { hideNonApplicable }],
  () => fetchControls({ hide_non_applicable: hideNonApplicable })
);
```

### 7. TypeScript Types

```typescript
// types.ts
export interface OrganisationProfile {
  id: number;
  organisation_id: number;
  company_name: string | null;
  industry: string | null;
  company_size: string | null;
  tech_stack: string | null;
  deployment_model: string | null;
  regulatory_requirements: string[];
  data_classification_levels: string[];
  risk_appetite: 'Conservative' | 'Moderate' | 'Aggressive';
  additional_context: string | null;
  created_at: string;
  updated_at: string;
}

export interface ControlApplicability {
  control_id: number;
  control_number: string;
  name: string;
  category: string;
  is_applicable: boolean;
}

export interface UserPreferences {
  hide_non_applicable_controls: boolean;
}
```

[STYLING]

Organization Profile form:
- Standard form layout with labels above inputs
- Multi-select uses pill/chip style for selected items
- Radio group for risk appetite with descriptions
- Generous spacing between form fields

Applicability table:
- Compact table with hover states
- Toggle switches for quick applicability changes
- Category badges matching existing design
- Sticky header for scrolling
- Bulk action buttons in zinc-100 bar above table

[ACCEPTANCE CRITERIA]
- [ ] Organisation profile form saves and loads correctly
- [ ] All profile fields persist to database
- [ ] Bulk applicability table shows all 100 controls
- [ ] Category filter works on applicability table
- [ ] Select All / Deselect All work correctly
- [ ] Individual toggles update immediately (optimistic UI)
- [ ] Save Changes persists bulk updates
- [ ] AI analysis includes organization context when available
- [ ] Controls list respects "hide non-applicable" preference
- [ ] Dashboard stats exclude non-applicable controls (already implemented)
- [ ] Empty profile gracefully handled (AI works without context)

**Create checkpoint: "Organization Setup"**
```

---

## V1 Completion Checklist

- [ ] 100 controls seeded with ontology questionnaires
- [ ] Controls list with filtering works
- [ ] Control detail shows all info with persona selector
- [ ] Questionnaire displays with persona filtering
- [ ] Responses save with auto-save and progress tracking
- [ ] Test recording creates immutable records
- [ ] AI test analysis with streaming works
- [ ] Persona affects AI analysis output
- [ ] Dashboard shows compliance statistics
- [ ] Dashboard shows questionnaire completion progress
- [ ] Due soon controls highlighted correctly
- [ ] Settings page functional (API config, defaults, export)
- [ ] Organization profile saves and loads
- [ ] AI analysis incorporates organization context
- [ ] Bulk control applicability management works
- [ ] Non-applicable controls can be hidden from list
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Ready for user feedback

---

# V2 Prompts (Multi-User Expansion)

---

## V2 Prompt 1: Replit Auth Integration

> **Use Build Mode**

```
[OBJECTIVE]
Replace static user with Replit Auth authentication.

[REQUIREMENTS]
1. Integrate Replit Auth for user authentication
2. Create login/logout flow
3. Sync Replit user to local users table
4. Protect all API routes with auth middleware
5. Update useCurrentUser hook to use real auth

[TECHNICAL DETAILS]

Authentication flow:
1. User visits app → check if authenticated
2. If not, show login page with "Sign in with Replit" button
3. After Replit Auth callback, create/update local user record
4. Store session, redirect to dashboard

User sync:
- On first login, create user in users table
- Set default role to 'compliance_officer'
- Admin can change roles later

Updated hooks/useCurrentUser.ts:
- Integrate with Replit Auth
- Fetch user profile from database (for role)
- Return { user, isAuthenticated, isLoading, logout }

Auth middleware:
- Verify Replit Auth session on all /api/* routes
- Attach req.user with id and role
- Return 401 if not authenticated

Protected pages:
- Wrap all pages in auth check
- Redirect to login if not authenticated
- Show loading state while checking

[FILES TO MODIFY]
- hooks/useCurrentUser.ts (replace implementation)
- server/middleware/auth.ts (new file)
- server/routes/*.ts (add middleware)
- App.tsx (add auth provider)
- pages/Login.tsx (new file)

[DO NOT CHANGE]
- Database schema
- API response formats
- Component logic (only wrapping)

[ACCEPTANCE CRITERIA]
- [ ] Login with Replit works
- [ ] User created in database on first login
- [ ] Logout clears session
- [ ] Unauthenticated users redirected to login
- [ ] All existing functionality works for authenticated users

**Create checkpoint: "V2 Replit Auth"**
```

---

## V2 Prompt 2: Role-Based Access Control

> **Use Build Mode**

```
[OBJECTIVE]
Implement permission enforcement based on user roles.

[REQUIREMENTS]
1. Update permissions.ts with real role logic
2. Enforce permissions in API routes
3. Conditionally show/hide UI based on role
4. Three roles: admin, compliance_officer, auditor

[TECHNICAL DETAILS]

Role permissions:

| Action | Admin | Compliance Officer | Auditor |
|--------|-------|-------------------|---------|
| View controls | ✓ | ✓ | ✓ |
| Record tests | ✓ | ✓ | ✗ |
| Use AI features | ✓ | ✓ | View only |
| Edit settings | ✓ | ✗ | ✗ |
| Manage users | ✓ | ✗ | ✗ |

Updated utils/permissions.ts:
```typescript
export const permissions = {
  canRecordTest: (role: UserRole) => 
    ['admin', 'compliance_officer'].includes(role),
  canEditSettings: (role: UserRole) => 
    role === 'admin',
  canManageUsers: (role: UserRole) => 
    role === 'admin',
  canUseAI: (role: UserRole) => 
    ['admin', 'compliance_officer'].includes(role),
  canViewAIAnalysis: (role: UserRole) => 
    true, // All can view
};
```

API enforcement:
- Check permissions before operations
- Return 403 Forbidden if not allowed
- Include role in error message

UI changes:
- Hide "Record Test" button for auditors
- Hide "Settings" nav link for non-admins
- Disable AI "Analyze" button for auditors (show result only)
- Show "Read Only" badge for auditors

[ACCEPTANCE CRITERIA]
- [ ] Auditor cannot record tests
- [ ] Non-admin cannot access settings
- [ ] UI adapts to role
- [ ] API returns 403 for unauthorized actions
- [ ] Role shown in user menu

**Create checkpoint: "V2 RBAC"**
```

---

## V2 Prompt 3: User Management

> **Use Build Mode**

```
[OBJECTIVE]
Add admin interface for managing users and roles.

[REQUIREMENTS]
1. User list page (admin only)
2. Change user roles
3. View user activity
4. Invite users flow

[TECHNICAL DETAILS]

Route: /settings/users (admin only)

API endpoints:
- GET /api/users - list all users (admin only)
- PATCH /api/users/:id/role - change role (admin only)
- GET /api/users/:id/activity - user's test history

User list table:
- Name
- Email
- Role (dropdown to change)
- Last Active
- Tests Recorded (count)

Role change:
- Dropdown in table row
- Confirm dialog before changing
- Cannot demote yourself from admin
- Toast notification on success

User activity modal:
- Click user row to show activity
- List of test runs by this user
- Date, control, status

Invite flow:
- Note: "Users sign in with their Replit account"
- Explain that new users get 'compliance_officer' role by default
- Admin can change role after first login

[DO NOT CHANGE]
- User creation (handled by Replit Auth)
- Authentication flow

[ACCEPTANCE CRITERIA]
- [ ] Admin can see all users
- [ ] Admin can change roles
- [ ] Non-admin cannot access user management
- [ ] Role changes take effect immediately
- [ ] Activity history shows correctly

**Create checkpoint: "V2 User Management"**
```

---

## V2 Prompt 4: User Attribution & Assignment

> **Use Build Mode**

```
[OBJECTIVE]
Add user attribution to test runs and control ownership.

[REQUIREMENTS]
1. Test runs show actual tester name (not just id=1)
2. Assign control owners
3. "My Controls" filter
4. User-specific dashboard view

[TECHNICAL DETAILS]

Test run attribution:
- tester_user_id now uses authenticated user
- Display tester name in test history
- Filter test history by tester

Control assignment:
- Add "Owner" field to control settings
- Dropdown of all users
- Only admin can assign owners
- organisation_controls.assigned_user_id populated

My Controls filter:
- New filter on controls list: "Assigned to Me"
- Shows controls where assigned_user_id = current user
- Quick access from dashboard

Dashboard personalization:
- "My Controls" summary card
- "My Recent Tests" section
- Still show overall org stats

UI updates:
- Test history shows tester names
- Control detail shows assigned owner
- Test form shows "Recording as: [Your Name]"

[DATA MIGRATION]
- Existing test_runs with tester_user_id=1 stay as "System" or migrate to first admin

[ACCEPTANCE CRITERIA]
- [ ] Test runs attributed to correct user
- [ ] Control owners assignable
- [ ] "My Controls" filter works
- [ ] Dashboard shows personal stats
- [ ] Historical tests show "System" or admin name

**Create checkpoint: "V2 User Attribution"**
```

---

# Seed Data Reference

The seed data file `isms_seed_data.json` contains:
- 5 categories
- Initial controls for seeding

**File provided separately as:** `isms_seed_data.json`

**When to use:** Immediately after Prompt 1 checkpoint

---

# Ontology Reference

The ontology file `iso_27001_ontology.json` contains:
- 100 ISO 27001:2022 controls
- 503 audit questions
- Rich metadata per question (guidance, evidence types, red flags, severity, personas)
- CPS 234/230 regulatory references

**Question counts by persona:**
- Auditor: 282 questions
- Advisor: 195 questions
- Analyst: 26 questions

**File provided separately as:** `iso_27001_ontology.json`

**When to use:** After Prompt 5.5 checkpoint

---

# Architecture Summary

## Database Schema (After Prompt 5.5)

```
┌─────────────────────────────────────────────────────────────────┐
│                         users                                   │
├─────────────────────────────────────────────────────────────────┤
│ id, email, name, role, created_at                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ 1:N
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    control_categories                           │
├─────────────────────────────────────────────────────────────────┤
│ id, name, sort_order                                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ 1:N
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        controls                                 │
├─────────────────────────────────────────────────────────────────┤
│ id, control_number, name, description, category_id,            │
│ owner_role, default_frequency, start_quarter,                  │
│ cps234_reference, cps230_reference, annex_a_reference,         │
│ ai_questionnaire (JSONB), questionnaire_generated_at           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ 1:1
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   organisation_controls                         │
├─────────────────────────────────────────────────────────────────┤
│ id, control_id, assigned_user_id, frequency, start_quarter,    │
│ is_applicable, exclusion_justification, next_due_date,         │
│ implementation_responses (JSONB), implementation_updated_at,   │
│ selected_persona                                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ 1:N
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        test_runs                                │
├─────────────────────────────────────────────────────────────────┤
│ id, organisation_control_id, test_date, tester_user_id,        │
│ status, comments, ai_analysis, ai_suggested_status,            │
│ ai_confidence, ai_context_scope, created_at                    │
│ ** INSERT ONLY - NO UPDATES/DELETES **                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ai_interactions                            │
├─────────────────────────────────────────────────────────────────┤
│ id, user_id, interaction_type, control_id, test_run_id,        │
│ input_summary, output_summary, model_used, tokens_used,        │
│ created_at                                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Persona Summary

| Persona | Questions | Focus | AI Voice |
|---------|-----------|-------|----------|
| **Auditor** | 282 | Evidence verification | Formal, demanding |
| **Advisor** | 195 | Process improvement | Collaborative, constructive |
| **Analyst** | 26 | Metrics & data | Objective, quantitative |

---

# Version History

| Version | Date | Changes |
|---------|------|---------|
| V1.0 | Initial | 9 prompts for single-user MVP |
| V1.1 | Updated | Added Prompt 5.5, revised Prompts 6-7 for personas |
| V1.2 | Updated | Removed org-specific controls, 100 controls from ontology |
| V1.3 | Current | Added Prompt 10 (Organization Setup & AI Context), enhanced Prompt 8 (Dashboard) |

---

*End of PRD*
