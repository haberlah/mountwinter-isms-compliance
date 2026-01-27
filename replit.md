# ISMS Compliance Tracker

## Recent Changes (January 2026)

### Prompt 6 - Persona-Aware Questionnaire Display (Completed)
- PersonaSelector component: 3 persona buttons (Auditor, Advisor, Analyst) with question counts and selection state
- SeverityBadge component: Critical (red), High (orange), Medium (yellow), Low (green) color variants
- QuestionCard component: Collapsible sections for guidance, auditor_focus, what_good_looks_like, red_flags, nc_pattern, related_controls
- ProgressSection component: Shows questionnaire completion by persona (e.g., "Auditor: 2/5")
- ViewModeToggle component: Switch between "By Persona" (filtered) and "All Questions" (grouped)
- Auto-save with 2-second debounce using useDebouncedCallback hook
- Save status indicators: Saving..., Saved (green), Error, Unsaved states
- Evidence references: Add/display as tags in QuestionCard
- API endpoints: PATCH /persona, PATCH /response (auto-merge), PATCH /response/:questionId/evidence
- Persona changes logged as AI interactions with "ontology-preloaded" model
- Persona-specific display rules: Auditor highlights auditor_focus, Advisor highlights what_good_looks_like

### Ontology Migration (Completed)
- Upgraded from 90 to 100 controls with enhanced ISO 27001:2022 ontology
- Loaded 503 audit questions from iso_27001_ontology.json
- Added persona support: Auditor (282 questions), Advisor (195 questions), Analyst (26 questions)
- New schema column: selected_persona in organisation_controls (defaults to "Auditor")
- New TypeScript types: Persona, OntologyQuestion, ControlQuestionnaire, Severity
- Ontology loader script: server/load-ontology.ts handles FK constraints and data migration
- Questions include rich metadata: guidance, auditor_focus, evidence_type, what_good_looks_like, red_flags, nc_pattern, severity, primary_persona
- Test history was reset during migration (expected for V1 upgrade)

### Prompt 5 - Test Recording (Completed)
- Test recording form page at /controls/:controlNumber/test
- Status dropdown with 6 options (Pass, PassPrevious, Fail, Blocked, NotAttempted, ContinualImprovement)
- Comments textarea for observations and evidence
- Submit creates immutable test_run record via POST /api/test-runs
- No UPDATE/DELETE endpoints for test_runs (immutability enforced)
- Redirect to control detail page after successful save
- tester_user_id automatically set to current user (1)
- Control reference card shows description and last test result
- Cancel and Record Test buttons in form

### Prompt 4 - Control Detail & Settings (Completed)
- Enhanced control detail page with tabbed interface (AI Questionnaire, Test History, Implementation)
- Control Settings sidebar displaying current configuration (applicability, frequency, owner, start quarter)
- Edit Settings form with applicability toggle, frequency override, and start quarter selection
- Exclusion justification required when marking controls as inapplicable
- Due date calculation on settings save (Annual uses start quarter, Quarterly respects start quarter pattern, Monthly advances to next month)
- Test history displays in reverse chronological order with AI confidence and suggested status indicators
- Implementation tab shows questionnaire responses from previous tests
- Controls list updated with Owner and Last Tested columns
- API: PATCH /api/organisation-controls/:controlId with due date calculation

### Prompt 3 - Controls List (Completed)
- Added controls list page with sortable table (Control #, Name, Category, Status, Frequency, Owner, Last Tested)
- Summary stats cards showing Total, Passed, Failed, Not Tested counts
- Search functionality for filtering by control number, name, or category
- Dropdown filters for category and status
- Click-through navigation to control detail page
- New API endpoints: GET /api/controls/stats, enhanced GET /api/controls with latest test data
- New storage methods: getControlsWithLatestTest(), getControlsStats()
- New types: ControlsStats, ControlWithLatestTest

### Prompt 2 - Layout & Navigation (Completed)
- Linear-style responsive sidebar layout
- Zinc palette with blue-600 primary accent
- Navigation: Dashboard, Controls, Settings
- MWC - ISMS Compliance Tracker branding
- useCurrentUser hook and permission utilities

### Prompt 1 - Database & Seed Data (Completed)
- 90 organization-specific controls seeded from controls.json
- 5 control categories with APRA prudential standard references (CPS234, CPS230)
- AI questionnaire generation verified working

## Overview

This is an ISO 27001:2022 Information Security Management System (ISMS) compliance tracking application. It helps organizations manage and assess security controls through AI-powered questionnaire generation and compliance analysis. The system tracks 100 ISO 27001 controls across 5 categories with 503 persona-based audit questions, supports test run tracking, and integrates with Claude AI for analyzing compliance responses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with React plugin
- **Charts**: Recharts for dashboard visualizations

The frontend follows a page-based structure under `client/src/pages/` with shared components in `client/src/components/`. The app uses a sidebar navigation layout with pages for Dashboard, Controls, Control Details, Test Runs, and AI Activity.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful JSON APIs under `/api/*` routes
- **Database ORM**: Drizzle ORM with PostgreSQL
- **AI Integration**: Anthropic Claude API (claude-sonnet-4-5-20250929 model)

The server is structured with:
- `server/index.ts` - Express app setup and middleware
- `server/routes.ts` - API route definitions
- `server/storage.ts` - Database access layer interface
- `server/db.ts` - Drizzle database connection
- `server/seed.ts` - Database seeding logic for initial controls
- `server/ai.ts` - Anthropic AI integration for questionnaire generation

### Data Model
The database schema (`shared/schema.ts`) includes:
- **users** - System users with roles (admin, compliance_officer, auditor)
- **control_categories** - 5 categories for organizing controls
- **controls** - 100 ISO 27001:2022 controls with metadata and pre-loaded questionnaires (from ontology)
- **organisation_controls** - Per-organization control configuration and overrides
- **test_runs** - Immutable audit trail of control assessments
- **ai_interactions** - Logging of all AI API calls

Schema uses Drizzle with PostgreSQL enums for type safety on frequencies, quarters, test statuses, and user roles.

### Build System
- Development: `tsx` for running TypeScript directly
- Production: esbuild bundles server, Vite builds client
- Database migrations: Drizzle Kit with `db:push` command

## External Dependencies

### Database
- **PostgreSQL** - Primary database via `DATABASE_URL` environment variable
- **Drizzle ORM** - Type-safe database queries and schema management
- **connect-pg-simple** - PostgreSQL session storage

### AI Services
- **Anthropic Claude API** - Requires `ANTHROPIC_API_KEY` environment variable
- Used for generating compliance questionnaires and analyzing test responses
- Model: claude-sonnet-4-5-20250929
- Startup check: Server logs a warning if API key is missing or invalid
- Error handling: AI failures return 502 status with clear configuration error messages

### Third-Party Libraries
- **@tanstack/react-query** - Server state management and caching
- **date-fns** - Date formatting and manipulation
- **zod** - Runtime schema validation
- **drizzle-zod** - Schema validation integration with Drizzle
- **recharts** - Dashboard charts and visualizations

### Seed Data
- Controls data loaded from `seed-data/iso_27001_ontology.json` on first startup
- Contains 100 organization-specific controls organized into 5 categories:
  - ISMS Requirements (Clauses 4-10): 7 controls (RQ4-RQ10)
  - Organisational Controls: 37 controls (5.1-5.37)
  - People Controls: 8 controls (6.1-6.8)
  - Physical Controls: 14 controls (7.1-7.14)
  - Technological Controls: 34 controls (8.1-8.34)
- Each control includes:
  - Organization-specific control numbers (e.g., RQ4, 5.1a, 8.17a)
  - APRA CPS234 prudential standard references
  - APRA CPS230 operational resilience references
  - ISO 27001:2022 Annex A cross-references
  - Default test frequency and owner roles
  - Pre-loaded questionnaire with persona-based questions (503 total)
- Question metadata includes: guidance, auditor_focus, evidence_type, what_good_looks_like, red_flags, nc_pattern, severity, primary_persona