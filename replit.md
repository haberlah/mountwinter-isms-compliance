# ISMS Compliance Tracker

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
- Contains 90 ISO 27001:2022 controls organized into 5 categories