# JobOps Architecture

## System Overview

JobOps is a **local-first AI-powered job application command center**. It enables a Senior UX Designer to analyze opportunities, identify gaps, refine positioning, and generate truthful ATS-optimized resumes and human cover letters.

### Core Design Principle

**Truth First** — The system never fabricates experience. Every skill, metric, project, technology, certification, responsibility, and accomplishment must either exist in the Master Career Document or be explicitly confirmed by the user.

---

## Architectural Layers

### 1. Frontend (React 18 + TypeScript + Vite)

**Responsibility:** User interaction, state display, form handling, real-time feedback.

**Three-Panel Layout (NotebookLM Style):**
- **Sources Panel** (left) — Job listings, triage status, search and filter by fit score band
- **Chat Panel** (center) — Job-scoped conversation with AI about this opportunity, estimate-confirmation interactions, positioning angle suggestions
- **Studio Panel** (right) — Resume/cover letter generation, in-browser editing, preview, PDF export, source code viewing

**Key Features:**
- Real-time form validation
- Keyboard-first navigation
- Accessibility-first (WCAG AA)
- State management via Zustand
- Optimistic UI updates

**Constraints:**
- No API keys in frontend
- All AI work happens server-side
- Forms validate against live data constraints

---

### 2. Express Server (Node + TypeScript)

**Responsibility:** API routing, business logic, database access, AI orchestration, artifact generation.

**Architecture:**
- Thin, focused route handlers
- Business logic in services
- Request validation via middleware
- Error handling and logging
- Database abstraction layer

**Key Services:**
- `JobService` — job CRUD, state transitions, funnel tracking
- `AiService` — Claude API integration, structured outputs
- `GeneratorService` — resume/cover letter generation pipeline
- `PdfService` — Puppeteer-based PDF generation
- `DatabaseService` — SQLite query abstraction

---

### 3. SQLite Database (better-sqlite3)

**Responsibility:** Persistent state, master truth for all data.

**Philosophy:**
- Every state transition is explicit
- No hidden mutations
- Every artifact is reproducible from stored data
- Schema is versioned via migrations

**Schema Areas:**
- `jobs` — job opportunities and their state
- `documents` — generated resumes and cover letters
- `analyses` — job analysis results
- `artifacts` — metadata for PDFs and artifacts
- `settings` — user-editable thresholds and configurations

---

## Data Flow Architecture

### Job Analysis and Application Workflow

```
1. User adds job from job board
   ├─ Job row created in jobs table
   ├─ tracker_event created: [job_added]
   └─ Chat messages created (empty)
   ↓
2. User clicks "Analyze" in Sources panel
   ├─ Claude analyzes job vs. career document
   ├─ Analysis row created with fit_score, skills_match, gaps
   ├─ tracker_event created: [job_analyzed]
   └─ Chat history updated
   ↓
3. Chat panel displays analysis to user
   ├─ System sends estimate-confirmation messages: "Does this gap look right?"
   ├─ User responds in chat panel
   ├─ Each confirmation/rejection creates tracker_event
   └─ Positioning angle suggestions sent to user
   ↓
4. User reviews estimate confirmations
   ├─ Accepts some estimates
   ├─ Rejects others (triggers re-analysis if needed)
   └─ Chat history grows with each interaction
   ↓
5. User initiates resume generation (Studio panel)
   ├─ Anti-fabrication validation BEFORE generation
   ├─ Claude generates resume using latest career doc version
   ├─ Validates generated content against CV hash
   ├─ If validation fails: 422 error, show specific violations
   ├─ If passes: artifacts created (resume_source, resume_pdf)
   ├─ tracker_event created: [resume_generated]
   └─ PDF stored in output/ directory
   ↓
6. User reviews generated resume with sources
   ├─ Each claim shows [CV: location of source]
   ├─ User can click to view CV section
   ├─ User can edit text in Studio panel
   └─ Changes mark artifact as "user_modified"
   ↓
7. User applies to job
   ├─ Outreach row created with application method (form/email/etc.)
   ├─ tracker_event created: [applied] with score_band, positioning_angle
   └─ Chat can record: "Applied via LinkedIn email"
   ↓
8. User receives outcome (phone screen, rejection, offer, etc.)
   ├─ Outreach row updated: first_response_at, outcome
   ├─ tracker_event created: [interview_scheduled] or [offer_received]
   ├─ time_to_outcome_days calculated
   └─ Funnel calibration metrics updated
   ↓
9. Funnel calibration report shows:
   ├─ Of jobs in "61-100" score band with "leadership" angle: 40% converted
   ├─ Average time to response by score band
   ├─ Which positioning angles worked best
   └─ Where to refine candidate positioning
```

---

## AI Pipeline Architecture

### Claude API Integration

All AI work happens server-side to:
- Keep API keys secure
- Validate structured outputs
- Enforce anti-fabrication rules
- Batch process efficiently

**Pipeline:**

```
Frontend Request
    ↓
Route Handler
    ↓
AiService
  ├─ Load prompt from file
  ├─ Build context (Master CV + job data)
  ├─ Call Claude with structured output schema
  └─ Parse and validate response
    ↓
Validation (Zod)
  ├─ Type-check output
  ├─ Run anti-fabrication checks
  └─ Fail gracefully if invalid
    ↓
Store Result (SQLite)
    ↓
Return to Frontend
```

### Prompt Management

**Philosophy:** Prompts are versioned files, not configuration.

**Strategy:**
- Prompts live in `/src/server/ai/prompts/`
- Each prompt has a clear name and version comment
- Prompts are loaded at server startup
- Easy to audit, test, and iterate
- Can be tested independently of deployment

**Prompts:**
1. `resume-generator.md` — Generate ATS-optimized resume for a specific job
2. `cover-letter-generator.md` — Generate human cover letter for a specific job
3. `job-analyzer.md` — Analyze job posting against Master CV
4. `gap-identifier.md` — Identify skills/experience gaps
5. `positioning-refiner.md` — Suggest positioning changes for future applications

---

## Anti-Fabrication Architecture

**The core constraint:** No skill, achievement, or metric may be generated unless it exists in the Master Career Document or is explicitly confirmed by the user.

**Critical principle:** **Validation BEFORE artifact generation.** If validation fails, no artifact row is created.

### Enforcement Strategy (5 Layers)

1. **Prompt instruction layer:**
   - Claude explicitly told: "Use ONLY information from the provided CV"
   - Examples of what NOT to do included
   - Effectiveness: 85-90%

2. **Output validation layer (BEFORE artifact created):**
   - Parse generated resume/letter
   - Check each claim against career_doc_versions content
   - Extract skill, technology, and metric assertions
   - If any unverified claims: return 422, abort artifact creation
   - Effectiveness: 95%+

3. **Source citation layer:**
   - Each claim shows [CV: Experience > Tech Corp > Achievement]
   - When user views resume, can click to see CV source
   - Transparency enables user verification

4. **User review layer:**
   - User sees estimated claims before accepting
   - Estimate-confirmation messages in chat
   - Must approve before proceeding to artifact export
   - Effectiveness: 100% (user sees everything)

5. **Career document versioning:**
   - artifacts.career_doc_version_hash stores which CV version was used
   - If CV updated, can retrace what was generated from which version
   - Enables audit: "Did this resume use outdated skills?"

**Result:** Hallucinations caught at layer 2 (validation). No bad artifacts ever created.

---

## Event-Based Tracking: Job Lifecycle

Rather than mutable status field, JobOps tracks events. Job history is an immutable log.

```
Event Sequence
├─ [job_added]              Job discovered or manually added
├─ [job_analyzed]           User requests initial analysis
├─ [estimate_confirmed]     User confirms a gap/skill assessment
├─ [estimate_rejected]      User rejects our assessment
├─ [resume_generated]       Resume created from CV
├─ [cover_letter_generated] Cover letter created
├─ [applied]                Application submitted (creates funnel row)
├─ [rejected]               Rejection received after application
├─ [interview_scheduled]    Phone screen or interview scheduled
├─ [interview_completed]    Interview completed
├─ [offer_received]         Job offer received
├─ [offer_accepted]         Offer accepted (end of funnel)
└─ [archived]               Job removed from active list
```

Each event:
- **Is immutable** — Cannot be deleted or changed
- **Has timestamps** — event_at (when it happened) and recorded_at (when we logged it)
- **Carries context** — score_band, positioning_angle, outcome details
- **Links to artifacts** — resume_generated event links to artifacts.id
- **Supports funnel analysis** — Grouped by score_band and positioning_angle

**No silent state changes.** Every event is logged. Funnel metrics are computed from events, not from a mutable status field.

---

## Frontend State Management

**Tool:** Zustand (lightweight, explicit, DevTools support)

**Stores:**
- `appStore` — user preferences, selected job, sidebar state
- `jobsStore` — loaded jobs, filters, sorting
- `documentsStore` — generated resumes/cover letters, editing state

**Philosophy:**
- Store only what the user is actively working with
- Fetch from server on page load
- Optimistic updates with rollback on error
- No derived state in store (compute in selectors)

---

## Error Handling Strategy

### Server-Side

1. **Validation errors** — 400 with clear message about what's wrong
2. **Not found** — 404 with resource identifier
3. **AI service errors** — 503 (transient), retry in frontend, log for investigation
4. **Database errors** — 500 with error ID for support, sanitized message to frontend
5. **Anti-fabrication violations** — 422 with specific claim that failed

### Client-Side

1. **Network errors** — show toast, enable retry
2. **Validation errors** — inline field errors
3. **AI generation failures** — explain why, offer to regenerate
4. **PDF generation failures** — show error, offer alternative format

---

## Build and Runtime Environment

### Development

```bash
# Terminal 1: Backend server
npm run dev:server

# Terminal 2: Frontend with Vite
npm run dev:client
```

### Production

```bash
# Build both client and server
npm run build

# Run as Node server with static files
npm start
```

### Environment Configuration

```
CLAUDE_API_KEY       # Claude API key (server-only)
NODE_ENV             # development | production
DATABASE_PATH        # Path to SQLite database
PUPPETEER_HEADLESS   # true | false
```

---

## Accessibility Architecture

**Requirement:** WCAG AA compliance on every screen.

### Strategy

1. **Semantic HTML** — correct elements for structure
2. **ARIA labels** — all interactive elements properly labeled
3. **Focus management** — visible focus ring, tab order follows visual flow
4. **Color contrast** — all text meets 4.5:1 minimum
5. **Keyboard navigation** — every feature accessible via keyboard
6. **Screen reader testing** — manual testing on VoiceOver/NVDA

### Components

- `SkipLink` — skip to main content
- `FocusManager` — manage focus during modal/dialog transitions
- `AriaLive` — announce dynamic updates to assistive devices

### Testing

- Automated contrast checking in CI
- Manual keyboard navigation testing
- Screen reader verification before shipping

---

## Performance Considerations

### Frontend

- **Code splitting** — load features on demand
- **Image optimization** — lazy loading, WebP format
- **Bundle size** — monitor via CI
- **Pagination** — job lists paginated, not infinite scroll

### Server

- **Prepared statements** — all SQL queries precompiled
- **Connection pooling** — better-sqlite3 handles this
- **Caching** — analyzed jobs cached in SQLite, cleared on CV update
- **PDF generation** — async, done in background queue if many

### Database

- **Indexes** — on job status, user IDs, timestamps
- **Query optimization** — EXPLAIN QUERY PLAN reviewed
- **Backups** — encrypted, stored locally

---

## Security Model

### API

- No authentication required for local-first (desktop app)
- If web deployment needed later: JWT tokens, HTTPS only
- All user input validated server-side
- SQL injection prevented via prepared statements

### Keys and Secrets

- Claude API key in environment variable only
- Never logged
- Not sent to client
- Rotated if exposed

### Data

- SQLite database encrypted at rest (if sensitive data stored)
- No external API calls except Claude
- All data stays on device (local-first)

---

## Testing Strategy

### Unit Tests (80% coverage)

- Services (job, AI, generator, database)
- Utility functions
- Zod schemas and validators
- Components (critical UI only)

### Integration Tests

- Complete job workflow (add → analyze → generate → apply)
- Database migrations
- API routes with database

### E2E Tests

- Happy path smoke test
- PDF generation validation

### Manual Testing

- Accessibility verification
- Anti-fabrication spot checks
- Real job board imports
- PDF quality inspection

---

## Deployment Model

### Desktop App (Primary)

- Electron (or similar)
- Bundled Node server
- Local SQLite database
- Claude API calls with user's own key

### Web App (Future)

- Same backend, different frontend bundler
- OAuth for user identity
- User-scoped database
- Same API contract

---

## Technology Choices and Rationale

| Choice | Why | Trade-off |
|--------|-----|-----------|
| React 18 | Modern, component-based, large ecosystem | Learning curve |
| TypeScript | Type safety, catches bugs early | Build step |
| SQLite | Simple, local, no server, familiar | Single-user only |
| Express | Minimal, middleware-based, familiar | Not as structured as alternatives |
| Claude API | Best-in-class reasoning for job analysis | API call cost, latency |
| Puppeteer | Reliable PDF generation, headless browser | Larger bundle |
| Zod | Type-safe validation at runtime | Verbose schemas |
| Zustand | Lightweight state, minimal boilerplate | Less structured than Redux |
| Vite | Fast dev server, modern bundler | Still evolving |

---

## Architecture Quality Metrics

**How do we know this architecture is good?**

1. **Separation of concerns** — Server and client have clear responsibilities
2. **Testability** — Business logic in services, not components
3. **Maintainability** — New features don't require touching 10 files
4. **Truthfulness** — Anti-fabrication rules enforced at multiple layers
5. **Accessibility** — WCAG AA verified automatically and manually
6. **Performance** — No N+1 queries, data structures right-sized

---

## Known Limitations

1. **Local-first with remote AI** — "local-first" means data stays local, not network access. This is acceptable.
2. **SQLite single-user** — If multi-user needed later, requires migration to server DB
3. **PDF generation latency** — Puppeteer takes 2-5 seconds, consider async generation
4. **Manual funnel calibration** — User must update outcomes; no scraping job boards for results

---

## Next Steps

1. Define database schema (DATABASE.md)
2. Define API contract (API.md)
3. Document architecture decisions (ADRs)
4. Review and approve before implementation
