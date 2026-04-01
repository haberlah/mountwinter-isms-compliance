# ISMS Compliance Tracker

## Recent Changes (April 2026)

### Replit Auth & Organisation Multi-Tenancy (Completed)
- Installed Replit Auth blueprint (OpenID Connect via passport)
- Added organisations + organisation_email_domains tables
- Changed users table to varchar UUID primary key (Replit Auth compatible)
- Added organisationId FK to all data tables: organisationControls, documents, testRuns, aiInteractions, evidenceLinks, documentControlLinks, documentQuestionMatches, responseChangeLog, organisationProfile
- organisationControls unique constraint changed to composite (controlId, organisationId)
- Auth storage: auto-matches email domain to organisation on first login
- Seeded "Bella Sláinte" organisation with bellamed.ai domain
- All API routes protected with isAuthenticated + requireOrg middleware
- All storage queries scoped by organisationId for tenant isolation
- Cross-tenant IDOR protection on document, suggestion, evidence, test-run endpoints
- Removed getOrCreateDefaultUser(); routes use req.appUser from auth middleware
- Frontend: landing page with "Sign in with Replit" button
- Frontend: loading screen, no-org error screen
- Sidebar: user avatar, display name, role, logout button
- useAuth hook replaces useCurrentUser for real authentication
- Database schema pushed (destructive migration from old integer user IDs)

### Reset Assessment Data (Completed)
- "Reset Assessment Data" button in Settings > Data Management section
- Clears: questionnaire responses, test history, AI interaction logs, evidence links, document analysis matches
- Preserves: controls, uploaded documents, organization profile, control applicability
- Wrapped in database transaction for data integrity
- Confirmation dialog explains what will be cleared vs kept
- Success toast shows counts of cleared items
- API endpoint: DELETE /api/assessment/reset

### Document Management - Delete & Clear All (Completed)
- Individual document delete: Trash icon button on each document row in Documents page
- Confirmation dialog before deletion warns about permanent removal and control unlinking
- Force-delete automatically unlinks from controls, clears analysis matches, and removes storage object
- "Clear All Documents" button in Settings > Data Management section
- Destructive confirmation dialog for bulk clear explains consequences
- Delete button on ControlDocumentsSection (control detail page) for permanent document removal
- All deletions wrapped in database transactions for data integrity
- Evidence links and response change log references nullified (not lost) on document deletion
- Storage objects cleaned up after DB transaction commits
- API endpoints:
  - DELETE /api/documents/all — bulk clear with transactional cleanup
  - DELETE /api/documents/:id — force-delete with automatic unlink
## Overview

The ISMS Compliance Tracker is an ISO 27001:2022 Information Security Management System application designed to help organizations manage and assess their security controls. It utilizes AI-powered questionnaire generation and compliance analysis, tracking 100 ISO 27001 controls across 5 categories with 503 persona-based audit questions. The system supports test run tracking and integrates with the Claude AI for analyzing compliance responses, enabling personalized guidance based on organizational context. It features multi-tenancy with Replit Auth for organization-based user management and data isolation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: shadcn/ui (Radix UI, Tailwind CSS)
- **Charts**: Recharts
- **Build Tool**: Vite

The frontend organizes pages under `client/src/pages/` and shared components in `client/src/components/`, featuring a sidebar navigation for Dashboard, Controls, Control Details, Test Runs, and AI Activity.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM)
- **API Pattern**: RESTful JSON APIs (`/api/*`)
- **Database ORM**: Drizzle ORM with PostgreSQL
- **AI Integration**: Anthropic Claude API

The server structure includes `server/index.ts` for Express setup, `server/routes.ts` for API definitions, `server/storage.ts` for database access, `server/db.ts` for connection, `server/seed.ts` for initial data, and `server/ai.ts` for AI integration. It supports Replit Auth for user authentication and multi-tenancy, ensuring data isolation per organization.

### Data Model
The database schema (`shared/schema.ts`) uses Drizzle with PostgreSQL enums and includes tables for:
- `users`: System users with roles.
- `organisations`: For multi-tenancy.
- `organisation_email_domains`: Maps email domains to organizations.
- `organisation_profile`: Stores organization-specific profile information and AI context.
- `control_categories`: Organizes controls.
- `controls`: ISO 27001:2022 controls with metadata and pre-loaded questionnaires.
- `organisation_controls`: Per-organization control configurations, applicability, and due date calculations.
- `test_runs`: Immutable audit trail of control assessments.
- `ai_interactions`: Logs AI API calls.
- `documents`: Stores compliance documents.
- `evidence_links`: Links documents to responses.
- `response_change_log`: Tracks changes to responses.

### Build System
- **Development**: `tsx`
- **Production**: esbuild (server), Vite (client)
- **Database Migrations**: Drizzle Kit (`db:push`)

### Features
- **Authentication**: Replit Auth (OpenID Connect / Google SSO) with organization multi-tenancy.
- **Document Management**: Upload, view, delete individual documents, and bulk clear documents with transactional cleanup.
- **Organization Profile**: Customizable profile (Company Name, Industry, Tech Stack, Regulatory Requirements) used to tailor AI analysis.
- **Control Applicability**: Bulk management of control applicability, allowing filtering and hiding of non-applicable controls.
- **Compliance Dashboard**: Summary statistics, radial charts for compliance and questionnaire progress, due soon list, recent activity, and category breakdown.
- **Persona-Aware Questionnaire**: Dynamically adjusts questions based on selected persona (Auditor, Advisor, Analyst) with auto-save and evidence management.
- **Test Recording**: Immutable test run records with status, comments, and automatic user association.
- **Control Detail Page**: Tabbed interface for AI Questionnaire, Test History, and Implementation, with editable control settings (frequency, owner, start quarter) and due date calculations.
- **Controls List**: Sortable and filterable list of controls with summary stats and navigation to detail pages.
- **Settings Page**: API configuration, control defaults, data management (export test history), and statistics summary.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Type-safe database queries.
- **connect-pg-simple**: PostgreSQL session storage.

### AI Services
- **Anthropic Claude API**: For questionnaire generation and response analysis (model: `claude-sonnet-4-5-20250929`). Requires `ANTHROPIC_API_KEY`.

### Third-Party Libraries
- **@tanstack/react-query**: Server state management.
- **date-fns**: Date manipulation.
- **zod**: Runtime schema validation.
- **drizzle-zod**: Drizzle schema validation integration.
- **recharts**: Data visualizations.

### Seed Data
- **iso_27001_ontology.json**: Contains 100 ISO 27001:2022 controls, categorized and linked to APRA prudential standards (CPS234, CPS230), with 503 persona-based audit questions and rich metadata.