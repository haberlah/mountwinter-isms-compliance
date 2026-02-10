# The Best of Both Worlds: Claude + Replit

*Better outcomes using a hybrid AI dev stack at lower costs*

---

When Replit released Agent 3 in September 2025, they announced a 10x improvement in autonomous operation: from 20 minutes of productive work to over 200 minutes (Replit, 2025a). The achievement relied on a REPL-based verification system that combines code execution with browser automation, enabling the agent to self-test at scale.

Around the same time, Anthropic shipped Plan Mode for Claude Code, introducing a read-only research phase where the model analyses codebases, identifies patterns, and proposes implementation strategies before writing a single line of code (Anthropic, 2025a).

These tools represent fundamentally different approaches. Replit Agent excels at end-to-end autonomy for small to medium applications, directly executing and iterating code in the cloud (AI Agent Store, 2026). Claude Code offers context-rich reasoning valuable for architectural decisions, maintaining context over extended conversations.

The insight: combining them produces better outcomes than using either tool alone.

---

## The hybrid workflow

I developed this approach while building an ISO 27001 compliance tracker. The application covers 93 Annex A controls organised into four categories (Organisational, People, Physical, Technological), plus Clauses 4-10 that define the management system requirements. The 2022 revision condensed the previous 114 controls and introduced 11 new controls addressing modern threats like cloud security (A.5.23), data masking (A.8.11), and secure coding (A.8.28) (DataGuard, 2025).

The data foundation includes 503 audit questions with rich metadata: guidance text, auditor focus areas, evidence types, severity levels, and persona assignments.

The workflow breaks into five stages:

| Stage | Tool | Purpose |
|-------|------|---------|
| 1 | Claude Chat | Deep research, PRD creation |
| 1.5 | Claude Cowork | Building complex data ontologies |
| 2 | Replit Agent | 0→1 prototyping |
| 3 | Claude Code | 1→100 refinement |
| 4 | Git | Sync loop |
| 5 | Replit | Deployment |

**[PLACEHOLDER: Workflow diagram showing stages with tool icons]**

---

## Stage 1: Deep research and PRD creation

Before touching code, I invested several sessions researching the problem domain. Understanding the structure, how auditors evaluate evidence, and what constitutes nonconformities shaped every subsequent decision.

The key output is a PRD designed for AI coding agents. Traditional PRDs written for human developers contain too much ambiguity. They assume context and lack the explicit structure these systems need.

I covered this approach in my previous article (Haberlah, 2026). The core principle: break projects into sequential prompts, each with clear acceptance criteria and checkpoints. Front-loading specification work gives AI agents the context they lack.

For the compliance tracker, I created a 10-prompt sequence. Each prompt follows a consistent structure:

```markdown
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
- role: enum ('admin', 'compliance_officer', 'auditor')

controls:
- id: serial primary key
- control_number: varchar(20) not null unique
- name: text not null
- ai_questionnaire: jsonb nullable
...

[ACCEPTANCE CRITERIA]
- [ ] Database tables created with proper types and constraints
- [ ] Drizzle schema exports types for TypeScript
- [ ] Controls visible in database after seeding

**Create checkpoint: "Database Foundation"**
```

This structure provides explicit requirements, technical specifications, and testable acceptance criteria. Replit Agent can execute against clear constraints rather than interpreting ambiguous intent.

**Pro tip:** Keep the PRD and research artifacts in a `documentation/` folder within the same directory Claude Code uses for the repo. This folder provides context without cluttering the codebase pushed to GitHub.

### The feedback loop with Claude Chat

Claude Chat remains active throughout the project. After each Replit Agent session, I return to Claude Chat with running feedback: what worked, what broke, what features Agent added that I had not requested. Claude reasons about the current state, identifies what needs to change in the PRD, and helps structure the next prompt.

For example, after Replit Agent added an organisation settings page I had not specified, I added this constraint to subsequent prompts:

```
[CONSTRAINTS]
- Do NOT add features beyond those explicitly listed
- Do NOT refactor existing working code unless required for this prompt
- If unclear, ask before implementing
```

This feedback loop produces progressively better prompts. Claude Chat sees the patterns across sessions and helps codify them into explicit guardrails.

---

## Stage 1.5: Building complex ontologies with Cowork

The compliance tracker needed a comprehensive data foundation: 100 controls with 503 audit questions. Each question required 17 fields including guidance, auditor focus, evidence types, red flags, non-conformity patterns, severity, and persona assignments.

Claude Chat struggles with this work. Context window limits prevent holding the entire ontology in memory while iterating. Sessions terminate. Progress disappears.

Claude Cowork, announced January 2026, addresses this limitation (Anthropic, 2026a). The tool runs in a virtual machine on your computer with direct local file access (VentureBeat, 2026). You designate a folder; Claude can read, edit, and create files within that sandbox.

**[PLACEHOLDER: Screenshot of Cowork interface with ontology file]**

My "ISMS Questionnaire Table Builder" master prompt defined the exact schema across 680 lines. A representative section:

```markdown
## Persona Assignment Guidelines

### Auditor Persona
**Focus:** Evidence verification, compliance checking, documentary proof

**Assign when the question:**
- Requests specific evidence or artifacts
- Verifies existence of mandatory documentation
- Checks compliance with requirements
- Uses imperatives like "Provide...", "Show me...", "Present..."

### Advisor Persona
**Focus:** Process implementation, best practice guidance

**Assign when the question:**
- Explores how processes work
- Seeks understanding of approach
- Uses interrogatives like "How is...", "Describe..."

### Analyst Persona
**Focus:** Data analysis, metrics evaluation

**Assign when the question:**
- Requests metrics or KPIs
- Asks for rates, percentages, counts
```

This level of structured data work is not feasible in standard chat interfaces. Cowork's sub-agent coordination breaks complex work into smaller tasks and coordinates parallel workstreams (DataCamp, 2026).

The output was a validated JSON ontology that Replit could seed directly into PostgreSQL. No ambiguity, no missing fields, no schema mismatches.

---

## Stage 2: 0→1 with Replit Agent

With PRD and ontology ready, Replit Agent handled the build.

Replit Agent 3 can run for up to 200 minutes autonomously, handling full tasks with minimal manual oversight (Replit, 2025a). The REPL-based verification system catches issues through automated browser testing. According to Replit, this approach proves 3x faster and 10x more cost-effective than computer-use models (Replit, 2025b).

**[PLACEHOLDER: Screenshot of Replit Agent settings showing autonomy levels]**

### Plan Mode versus Build Mode

Replit Agent operates in two distinct modes. In Plan Mode, Agent analyses your prompt and generates a task list without executing anything. You can review, modify, or approve the plan before proceeding. In Build Mode, Agent executes the approved plan, writing code, running tests, and iterating until the acceptance criteria are met.

For the compliance tracker, I used the "High" autonomy setting with App Testing enabled. At this level:

1. Agent generates a detailed task list in Plan Mode
2. After approval, it enters Build Mode and executes tasks sequentially
3. Between changes, it opens a real browser to test functionality
4. If tests fail, it automatically fixes issues and retests
5. The cycle continues until all acceptance criteria pass

What Replit Agent handles well:

- **Library selection**: Automatically chose React with Vite, Tailwind, shadcn/ui, Drizzle ORM
- **Dependency management**: No manual npm installs or version conflict debugging
- **Database setup**: PostgreSQL configured with schemas, relationships, and seed scripts
- **Secrets management**: Environment variables handled through Replit's Secrets feature

The 10-prompt sequence cost **US$62.34** total. Replit's effort-based pricing means simple changes typically cost less than $0.25, while complex tasks bundle into single checkpoints reflecting actual scope (Replit, 2025c). Note that costs can be unpredictable: some users report spending $300+ monthly on Agent usage for complex projects (Hackceleration, 2026).

### When to stop and switch to Claude Code

**Stop using Replit Agent when:**

- Core functionality works end-to-end
- Further changes require understanding patterns across multiple files
- You're fixing the same type of issue repeatedly
- Architectural decisions feel like they need deeper reasoning
- Iteration costs start exceeding the value of changes

**Signs you're ready for Claude Code:**

- The prototype demonstrates all major features
- You have a mental model of the codebase structure
- Remaining work involves consolidation, typing, or optimisation
- You want to explore "what if" scenarios before committing to changes

For the compliance tracker, I switched after prompt 10 when the dashboard, questionnaire system, and AI analysis all functioned correctly. The remaining work was refinement: consolidating API endpoints, adding TypeScript types, and implementing debounced auto-save.

---

## Stage 3: 1→100 with Claude Code

Push to GitHub, clone locally, and Claude Code takes over.

### The handoff process

The transition from Replit to Claude Code follows a consistent pattern:

1. **In Replit**: Ensure all changes are committed. Open the Git tab, stage any uncommitted files, and push to GitHub.

2. **Locally**: Clone or pull the repository. Open the project folder in your terminal.

3. **In Claude Code**: Start with Plan Mode (Shift+Tab twice from Normal Mode) to let Claude analyse the codebase before proposing changes.

Plan Mode creates a read-only research phase before any code changes. Claude has access to file viewing, directory listings, pattern searches, and web analysis. Tools that modify state are blocked until you approve (Anthropic, 2025a).

The documentation states:

> "Plan Mode instructs Claude to create a plan by analyzing the codebase with read-only operations, perfect for exploring codebases, planning complex changes, or reviewing code safely." (Anthropic, 2025a)

**[PLACEHOLDER: Screenshot of Claude Code in Plan Mode]**

For the compliance tracker, Plan Mode revealed several architectural refinements:

- Consolidating API endpoints that had grown organically
- Adding proper TypeScript types for complex questionnaire structures
- Implementing debounced auto-save for response recording

Extended thinking is enabled by default, reserving up to 31,999 tokens for step-by-step reasoning through complex problems (Anthropic, 2025a). This proves valuable for architectural decisions and multi-step implementation planning.

The `/rewind` command provides surgical recovery. Press Esc twice or run `/rewind` to open the menu. Options include restoring conversation only, code only, or both. Note: file modifications made by bash commands cannot be undone through rewind (Anthropic, 2025b).

---

## Stage 4: The sync loop

Git keeps both environments synchronised. The bidirectional flow matters because Replit maintains deployment infrastructure, secrets, and database connections while Claude Code provides deep reasoning capabilities.

### From Claude Code to Replit

After making changes locally:

```bash
git add .
git commit -m "Add TypeScript types for questionnaire structures"
git push origin main
```

Then in Replit:
1. Open the Git tab in the left sidebar
2. Click "Pull" to fetch the latest changes
3. If the app is running, it will automatically reload

**Watch for database schema changes.** When Claude Code modifies your Drizzle schema or adds migrations, you need to apply them in Replit. Claude Code will typically output the command you need:

```bash
npm run db:push
```

Copy this command and run it in Replit's Shell tab. If you're using migrations instead of push:

```bash
npm run db:migrate
```

Forgetting this step is a common source of "it works locally but breaks in Replit" issues.

### From Replit to Claude Code

After Replit Agent makes changes:

1. In Replit, open the Git tab and ensure changes are committed and pushed
2. Locally, pull the changes:

```bash
git pull origin main
```

3. Review what changed before continuing work in Claude Code. Agent sometimes modifies files you didn't expect.

### When to use which direction

**Replit → Claude Code:** When you need Replit Agent to scaffold a new feature quickly, then want Claude Code to refine it.

**Claude Code → Replit:** When you've made architectural improvements locally and want to test them in Replit's deployment environment.

For the compliance tracker, most flow went Claude Code → Replit during the refinement phase, with occasional returns to Replit Agent for new feature scaffolding.

---

## Stage 5: Publish via Replit

Replit handles DevOps with transparent deployments, visible usage metrics, and custom domain configuration.

**[PLACEHOLDER: Screenshot of Replit deployment dashboard]**

For technical founders focused on building rather than infrastructure, the deployment story is compelling. No Kubernetes manifests, no CI/CD pipeline configuration, no cloud provider dashboards.

---

## Cost comparison

| Approach | Estimated Cost | Characteristics |
|----------|---------------|-----------------|
| Replit-only | $150-300+ | Fast 0→1, costs scale with iteration |
| Claude Code-only | $100-200/mo subscription | Powerful refinement, requires local setup |
| Hybrid | ~$60 Replit + subscription | Requires workflow discipline |

**Actual costs from the ISO 27001 project:**
- Replit Agent (10 prompts, High autonomy): $62.34
- Claude Max subscription: <20% of weekly allocation used

Claude Max is available in two tiers: Max 5x at $100/month (5x Pro usage) and Max 20x at $200/month (20x Pro usage). Both include full access to Claude Code and Cowork (Anthropic, 2026b).

Replit Core costs $20/month (billed annually) or $25/month and includes $25 in usage credits. Many users report the credits rarely last a full month, especially when debugging or keeping apps live (Hackceleration, 2026).

The hybrid approach produces better results because each tool addresses what it does best. Replit's strength is rapid scaffolding. Claude's strength is deep reasoning.

---

## Key takeaways

**Front-load the thinking.** PRDs designed for AI coding agents, comprehensive ontologies, and clear acceptance criteria improve outcomes. The specification problem matters more than the capability problem.

**Use Replit for 0→1.** Library selection, database setup, frontend scaffolding, and deployment. Agent 3's autonomous testing catches issues during development.

**Use Claude Code for 1→100.** Plan Mode enables architectural analysis before changes. Extended thinking handles complex reasoning. The subscription model makes extensive iteration cost-effective.

**Maintain the feedback loop.** Running feedback from Replit informs PRD revisions. Claude Chat reasons about state changes. This continuous refinement produces better prompts and better code.

**Let Replit own deployment.** Transparent, predictable, integrated with the development environment.

---

The tools continue improving. Replit Agent now automatically leverages high-power models, includes web search and media generation, and runs for 200+ minutes autonomously. Claude Code's Plan Mode supports interactive planning workflows. The hybrid approach adapts to these improvements while maintaining its core insight: use each tool for what it does best.

The ISO 27001 compliance tracker exists because this workflow made it possible to build production-quality software as a solo technical founder. The same approach applies to any domain requiring both rapid prototyping and thoughtful refinement.

---

## References

AI Agent Store. (2026). *Claude Code vs Replit Agent - AI Agents Comparison*. https://aiagentstore.ai/compare-ai-agents/claude-code-vs-replit-agent

Anthropic. (2025a). *Common workflows - Claude Code Docs*. https://code.claude.com/docs/en/common-workflows

Anthropic. (2025b). *Checkpointing - Claude Code Docs*. https://code.claude.com/docs/en/checkpointing

Anthropic. (2026a). *Cowork: Claude Code for the rest of your work*. https://claude.com/blog/cowork-research-preview

Anthropic. (2026b). *What is the Max plan?* Claude Help Center. https://support.claude.com/en/articles/11049741-what-is-the-max-plan

DataCamp. (2026). *Claude Cowork tutorial: How to use Anthropic's AI desktop agent*. https://www.datacamp.com/tutorial/claude-cowork-tutorial

DataGuard. (2025). *ISO 27001 controls: Overview of all measures from Annex A*. https://www.dataguard.com/iso-27001/annex-a/

Haberlah, D. (2026). How to write PRDs for AI coding agents. *Medium*. https://medium.com/@haberlah/how-to-write-prds-for-ai-coding-agents-d60d72efb797

Hackceleration. (2026). *Replit review 2026: We tested Agent 3 AI, pricing, performance & real development speed*. https://hackceleration.com/replit-review/

HighTable. (2025). *ISO 27001 Annex A controls: The complete 2022 reference list (93 controls)*. https://hightable.io/iso-27001-annex-a-controls-reference-guide/

Replit. (2025a). *Introducing Agent 3: Our most autonomous agent yet*. https://blog.replit.com/introducing-agent-3-our-most-autonomous-agent-yet

Replit. (2025b). *Automated self-testing*. https://blog.replit.com/automated-self-testing

Replit. (2025c). *Introducing effort-based pricing for Replit Agent*. https://blog.replit.com/effort-based-pricing

VentureBeat. (2026). *Anthropic launches Cowork, a Claude Desktop agent that works in your files*. https://venturebeat.com/technology/anthropic-launches-cowork-a-claude-desktop-agent-that-works-in-your-files-no

---

*Building something similar? I'd love to hear how you're combining AI development tools. Find me on LinkedIn or leave a comment below.*
