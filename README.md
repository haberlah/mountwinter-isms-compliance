# ISMS Compliance Tracker

AI-powered ISO 27001:2022 compliance tracker with 100 controls and 503 expert-crafted audit questions.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.6-blue.svg)

## Overview

ISMS Compliance Tracker helps organisations prepare for ISO 27001 certification by providing a structured approach to security control assessment. Three AI persona modes adapt to your role:

1. **Auditor** — Evidence verification with red flag detection and non-conformity patterns
2. **Advisor** — Process improvement guidance with maturity assessments
3. **Analyst** — Metrics tracking with compliance scoring and KPIs

Built for compliance officers, security teams, and auditors preparing for ISO 27001 certification.

## Features

- **100 ISO 27001:2022 Controls** — Complete Annex A controls (5.1-8.34) plus ISMS requirements (Clauses 4-10)
- **503 Expert-Crafted Questions** — Pre-loaded audit questionnaire with persona-specific guidance
- **AI-Powered Analysis** — Claude AI analyses responses and suggests Pass/Fail status with confidence levels
- **Immutable Audit Trail** — All test results are permanently recorded for certification evidence
- **Organisation Context** — Configure company profile for tailored AI recommendations
- **Regulatory Cross-References** — APRA CPS 234 and CPS 230 mappings included
- **Dashboard Analytics** — Compliance percentage, questionnaire progress, and category breakdowns

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Node.js, Express 5, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Anthropic Claude API (claude-sonnet-4-5-20250929)
- **Routing**: Wouter (client), Express (server)

## Quick Start

### Option 1: Deploy on Replit (Recommended)

1. Fork this repository on GitHub
2. Import to Replit from GitHub
3. Add a PostgreSQL database in Replit
4. Add `ANTHROPIC_API_KEY` to Replit Secrets
5. Click Run — the database seeds automatically on first start

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/haberlah/mountwinter-isms-compliance.git
cd mountwinter-isms-compliance

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and ANTHROPIC_API_KEY

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features | Yes |
| `PORT` | Server port (default: 5000) | No |

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities
├── server/                 # Express backend
│   ├── ai.ts              # Anthropic AI integration
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database access layer
│   └── load-ontology.ts   # Control data loader
├── shared/                 # Shared types
│   └── schema.ts          # Drizzle schema & types
└── seed-data/             # ISO 27001 ontology data
    └── iso_27001_ontology.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/controls` | List all controls with latest test status |
| GET | `/api/controls/:controlNumber` | Get control details with questionnaire |
| POST | `/api/test-runs` | Record a test result (immutable) |
| POST | `/api/controls/:controlNumber/analyze` | AI analysis with streaming |
| GET | `/api/dashboard` | Dashboard statistics |
| GET | `/api/settings` | Application settings |
| GET/PUT | `/api/settings/profile` | Organisation profile |

## Development Workflow

This project supports both **Replit Agent** and **Claude Code** development:

- **Replit Agent**: Use `.replit` configuration for native Replit development
- **Claude Code**: Clone locally and use Claude Code for agentic development
- **GitHub**: Serves as the bridge between both environments

### Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Run production build
npm run check    # TypeScript type check
npm run db:push  # Push schema changes to database
```

## Data Model

The application uses a relational model with these core tables:

- **controls** — 100 ISO 27001 controls with pre-loaded questionnaires
- **organisation_controls** — Per-control settings (applicability, persona, responses)
- **test_runs** — Immutable audit trail of all assessments
- **ai_interactions** — Log of all AI API calls for auditing
- **organisation_profile** — Company context for AI personalisation

## Personas Explained

### Auditor (282 questions)
- Focuses on evidence verification
- Highlights red flags and non-conformity patterns
- Provides audit-style observations
- Best for: Certification preparation, internal audits

### Advisor (195 questions)
- Emphasises improvement opportunities
- Assesses control maturity levels
- Identifies quick wins and related controls
- Best for: Continuous improvement, gap analysis

### Analyst (26 questions)
- Quantifies compliance with scores
- Tracks criteria met vs. total
- Suggests monitoring KPIs
- Best for: Management reporting, trend analysis

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- ISO 27001:2022 standard by ISO/IEC
- APRA CPS 234 and CPS 230 prudential standards
- [Anthropic Claude](https://anthropic.com) for AI capabilities
- [shadcn/ui](https://ui.shadcn.com) for UI components
