# ISMS Compliance Tracker

## Recent Changes (January 2026)

### Prompt 3 - Controls List (Completed)
- Added controls list page with sortable table (Control #, Name, Category, Status, Frequency)
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

This is an ISO 27001:2022 Information Security Management System (ISMS) compliance tracking application. It helps organizations manage and assess security controls through AI-powered questionnaire generation and compliance analysis. The system tracks 90 ISO 27001 controls across 5 categories, supports test run tracking, and integrates with Claude AI for generating assessment questionnaires and analyzing compliance responses.

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
- **controls** - 90 ISO 27001:2022 controls with metadata and AI questionnaires
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
- Controls data loaded from `seed-data/controls.json` on first startup
- Contains 90 organization-specific controls organized into 5 categories:
  - ISMS Requirements (Clauses 4-10): 7 controls (RQ4-RQ10)
  - Organisational Controls: 38 controls (5.1-5.37)
  - People Controls: 8 controls (6.1-6.8)
  - Physical Controls: 3 controls (7.x)
  - Technological Controls: 34 controls (8.1-8.34)
- Each control includes:
  - Organization-specific control numbers (e.g., RQ4, 5.1a, 8.17a)
  - APRA CPS234 prudential standard references
  - APRA CPS230 operational resilience references
  - ISO 27001:2022 Annex A cross-references
  - Default test frequency and owner roles