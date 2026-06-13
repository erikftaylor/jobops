# JobOps Project Structure

## Canonical Repository Layout

```
jobber-app/
├── README.md                          # Project overview and quick start
├── ARCHITECTURE.md                    # System architecture and design principles
├── DATABASE.md                        # SQLite schema and data model
├── API.md                             # Express API contract and routes
├── ROADMAP.md                         # Phased delivery plan
├── RISKS.md                           # Technical and product risks
│
├── docs/
│   ├── adr/
│   │   ├── ADR-001-local-first.md
│   │   ├── ADR-002-sqlite.md
│   │   ├── ADR-003-thin-express-server.md
│   │   ├── ADR-004-feature-first-organization.md
│   │   ├── ADR-005-prompt-file-strategy.md
│   │   └── ADR-006-anti-fabrication-enforcement.md
│   └── guides/
│       ├── accessibility.md
│       ├── ai-safety.md
│       └── deployment.md
│
├── src/
│   ├── main.ts                        # Electron/Vite entry point
│   │
│   ├── server/
│   │   ├── index.ts                   # Express app setup
│   │   ├── routes/
│   │   │   ├── jobs.ts                # Job CRUD endpoints
│   │   │   ├── documents.ts           # Document generation endpoints
│   │   │   ├── analysis.ts            # Job analysis endpoints
│   │   │   ├── artifacts.ts           # Generated artifact endpoints
│   │   │   └── health.ts              # Health check endpoint
│   │   ├── middleware/
│   │   │   ├── auth.ts                # Token validation (if applicable)
│   │   │   ├── validation.ts          # Request validation
│   │   │   └── error.ts               # Error handling
│   │   ├── services/
│   │   │   ├── job.service.ts         # Job business logic
│   │   │   ├── ai.service.ts          # Claude API integration
│   │   │   ├── generator.service.ts   # Resume/cover letter generation
│   │   │   ├── pdf.service.ts         # Puppeteer PDF generation
│   │   │   └── database.service.ts    # SQLite operations
│   │   ├── ai/
│   │   │   ├── prompts/               # Versioned prompt files
│   │   │   │   ├── resume-generator.md
│   │   │   │   ├── cover-letter-generator.md
│   │   │   │   ├── job-analyzer.md
│   │   │   │   ├── gap-identifier.md
│   │   │   │   └── positioning-refiner.md
│   │   │   ├── schemas/               # Zod validation schemas
│   │   │   │   ├── resume.schema.ts
│   │   │   │   ├── cover-letter.schema.ts
│   │   │   │   └── job-analysis.schema.ts
│   │   │   └── pipeline.ts            # AI orchestration
│   │   └── db/
│   │       ├── migrations/            # Schema migrations
│   │       │   └── 001-initial.sql
│   │       ├── database.ts            # better-sqlite3 setup
│   │       └── queries.ts             # Prepared statements
│   │
│   ├── client/
│   │   ├── main.tsx                   # React 18 entry point
│   │   ├── app.tsx                    # Root component
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   └── theme.css
│   │   ├── features/
│   │   │   ├── jobs/
│   │   │   │   ├── components/
│   │   │   │   │   ├── JobList.tsx
│   │   │   │   │   ├── JobDetail.tsx
│   │   │   │   │   ├── JobForm.tsx
│   │   │   │   │   └── JobStatusBadge.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useJobs.ts
│   │   │   │   │   └── useJobDetail.ts
│   │   │   │   └── pages/
│   │   │   │       └── JobsPage.tsx
│   │   │   ├── documents/
│   │   │   │   ├── components/
│   │   │   │   │   ├── DocumentEditor.tsx
│   │   │   │   │   ├── DocumentPreview.tsx
│   │   │   │   │   └── GeneratorPanel.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useDocumentGeneration.ts
│   │   │   │   └── pages/
│   │   │   │       └── DocumentsPage.tsx
│   │   │   ├── analysis/
│   │   │   │   ├── components/
│   │   │   │   │   ├── OpportunityAnalyzer.tsx
│   │   │   │   │   ├── GapIdentifier.tsx
│   │   │   │   │   └── PositioningRefiner.tsx
│   │   │   │   └── pages/
│   │   │   │       └── AnalysisPage.tsx
│   │   │   └── tracking/
│   │   │       ├── components/
│   │   │       │   ├── FunnelView.tsx
│   │   │       │   └── CalibrationDashboard.tsx
│   │   │       └── pages/
│   │   │           └── TrackingPage.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── ThreePanel.tsx
│   │   │   │   ├── SourcesPanel.tsx
│   │   │   │   ├── ChatPanel.tsx
│   │   │   │   ├── StudioPanel.tsx
│   │   │   │   └── Navigation.tsx
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Alert.tsx
│   │   │   │   └── LoadingSpinner.tsx
│   │   │   └── a11y/
│   │   │       ├── SkipLink.tsx
│   │   │       ├── FocusManager.tsx
│   │   │       └── AriaLive.tsx
│   │   ├── hooks/
│   │   │   ├── useApi.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   └── useKeyboardNavigation.ts
│   │   ├── store/
│   │   │   ├── app.store.ts           # Global app state (Zustand)
│   │   │   ├── jobs.store.ts
│   │   │   └── documents.store.ts
│   │   ├── api/
│   │   │   ├── client.ts              # Fetch wrapper
│   │   │   └── types.ts               # API request/response types
│   │   └── utils/
│   │       ├── validation.ts
│   │       ├── format.ts
│   │       └── accessibility.ts
│   │
│   └── shared/
│       ├── types/
│       │   ├── job.ts                 # Job domain types
│       │   ├── document.ts            # Resume/cover letter types
│       │   ├── analysis.ts            # Analysis result types
│       │   └── api.ts                 # API contract types
│       ├── constants/
│       │   ├── job-states.ts
│       │   ├── skill-tags.ts
│       │   └── config.ts
│       └── utils/
│           ├── validation.ts
│           └── formatting.ts
│
├── tests/
│   ├── unit/
│   │   ├── server/
│   │   │   ├── services/
│   │   │   │   ├── job.service.test.ts
│   │   │   │   ├── ai.service.test.ts
│   │   │   │   └── generator.service.test.ts
│   │   │   └── db/
│   │   │       └── database.test.ts
│   │   └── client/
│   │       ├── hooks/
│   │       │   └── useJobs.test.ts
│   │       └── components/
│   │           └── JobList.test.tsx
│   ├── integration/
│   │   └── job-workflow.test.ts
│   └── fixtures/
│       ├── sample-jobs.json
│       └── sample-cv.json
│
├── e2e/
│   └── smoke-test.spec.ts
│
├── data/
│   ├── Master_Career_Document.md        # Primary career document (markdown)
│   ├── pending_additions.md             # Manually confirmed new experience to merge
│   └── sample-jobs/
│       └── examples.md                  # Sample opportunities for testing

├── output/
│   ├── resumes/                         # Generated resume PDFs
│   │   └── job-abc123-resume-v1.pdf
│   ├── resume_sources/                  # HTML source before PDF
│   │   └── job-abc123-resume-v1.html
│   ├── cover_letters/                   # Generated cover letter PDFs
│   │   └── job-abc123-letter-v1.pdf
│   └── letter_sources/                  # HTML source before PDF
│       └── job-abc123-letter-v1.html
│
├── .github/
│   └── workflows/
│       ├── test.yml
│       └── build.yml
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── prettier.config.js
├── .eslintrc.cjs
├── .gitignore
└── .env.example

```

## Responsibility Boundaries

### `/src/server`
- Express server setup and middleware
- API route definitions and validation
- Database operations via better-sqlite3
- Claude API integration
- PDF generation via Puppeteer
- Business logic (job state transitions, document generation)

### `/src/client`
- React 18 components and UI
- State management (Zustand)
- Fetch wrapper for API communication
- Layout components (three-panel design)
- Feature-specific pages and forms
- Accessibility implementations

### `/src/shared`
- Shared types between client and server
- Domain constants
- Validation utilities
- Formatting utilities

### `/data`
- User's master career document (JSON)
- Sample jobs for testing
- NOT generated artifacts (those live in SQLite)

### `/docs`
- Architecture decision records
- Deployment guides
- Accessibility documentation
- AI safety guidelines

## File Organization Principles

1. **Feature-first** — related components, hooks, and logic live together
2. **Business logic separate from UI** — services and utilities are standalone
3. **Shared code centralized** — types and constants in `/shared`
4. **Small, focused files** — each file has one clear responsibility
5. **Tests colocated** — unit tests live near source; integration tests in `/tests/integration`
6. **Prompts as files** — versioned in `/src/server/ai/prompts`, loaded at runtime
