# JobOps Architecture

**Version:** 1.0.0-rc1  
**Audience:** All engineers and AI agents  
**Purpose:** Single source of truth for system design and integration  
**Last Updated:** 2026-06-13

---

## System Overview

JobOps is an AI-powered job opportunity analysis platform designed for senior-level recruiters. The system analyzes job descriptions against a recruiter's career profile, identifies skill gaps, generates optimization suggestions, and produces multiple resume variants for comparison.

**Core value:** Recruiters make faster, more confident job decisions with AI-powered analysis backed by their actual experience.

The architecture emphasizes three principles:
1. **Separation of concerns:** Client (UI), Services (logic), Data (persistence)
2. **Immutability:** Career Profile data never mutated in place; all changes tracked in ChangeGraph
3. **Service ownership:** Business logic lives in services, not components or controllers

```
┌─────────────────────────────────────────────────────────────┐
│                     React Client (Browser)                   │
│                   JobsPage & WorkspacePage                    │
│  Sources Panel │ Resume Chat Panel │ Studio/Scoring Panel     │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/JSON API
┌────────────────────────────▼────────────────────────────────┐
│                   Express Server (Node.js)                    │
│  /health /api/jobs /api/workspace /api/chat /api/artifacts   │
│                                                               │
│  ├─ Job Service                                              │
│  ├─ Workspace Service                                        │
│  ├─ Claude Service (AI)                                      │
│  ├─ Analysis Services (scoring, fit, keywords)               │
│  ├─ Artifact Engine (resume generation)                      │
│  └─ ChangeGraph (immutable change tracking)                  │
└────────────────────────────┬────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐    ┌────────▼────────┐    ┌────▼──────┐
    │ SQLite  │    │  Claude API     │    │ File I/O  │
    │Database │    │  (Server-side)  │    │ (Outputs) │
    └─────────┘    └─────────────────┘    └───────────┘
```

---

## Core Architectural Concepts

### 1. Immutable Career Model

The Career Profile is the single source of truth for recruiter experience. It is never mutated directly:

**Structure:**
- `fullName`: Recruiter's name
- `sections`: Experience, skills, education, summary (readonly arrays)
- `metadata`: Hash (version), source file, created_at, updated_at
- **Hash:** Computed content digest used for cache invalidation and change detection

**Why immutable:**
- Enables deterministic analysis (same Career Profile + Job = same score)
- Creates complete audit trail of all changes
- Prevents accidental data corruption
- Simplifies concurrency (no race conditions)

**How changes work:**
```
ChangeNode created → awaits approval → if approved: ChangeGraph records it → score recalculates
```

### 2. Service-Oriented Architecture

Services are stateless, reusable business logic units. No service directly mutates data from another service.

**Service responsibilities:**
- Input validation
- Business logic execution
- Result persistence (if needed)
- Error handling

**Service pattern:**
```typescript
interface Service {
  // Stateless: same input always produces same output
  // Pure: doesn't mutate inputs
  // Observable: throws or returns errors, never silent failures
}
```

### 3. Recruiter Workspace as Consumer

The workspace (React UI) is purely a presentation and orchestration layer:
- Displays service results
- Handles user interactions
- Routes commands to services
- Shows loading/error states

**Workspace never:**
- Calculates scores directly
- Modifies Career Profile
- Manages ChangeGraph
- Generates artifacts without ArtifactEngine

### 4. Deterministic Artifact Generation

Resume generation produces consistent output from same inputs:
- Same Career Profile + Job + Strategy → Same resume output
- Enables caching: key = `(careerModel.hash, job.id, strategy)`
- Allows comparing variants side-by-side with confidence

---

## Data Flow

### User Journey: Job Analysis

1. **User Adds Job**
   - React form submits job description
   - Server stores in SQLite with status="draft"
   - JobList refreshes to show new job

2. **User Opens Workspace**
   - React requests job data + analysis
   - Server loads job, fires up analysis services
   - Resume score, keywords, fit assessment calculated
   - Results cached by career document hash
   - UI updates with scores, recommendations

3. **User Asks Question**
   - React sends recruiter question ID
   - Server crafts prompt using career model + job
   - Claude API responds with analysis
   - Response stored in chat history
   - UI displays answer with confidence

4. **User Accepts Keyword**
   - React sends keyword acceptance
   - Server records in ChangeGraph (immutable)
   - ResumeSolver updates score calculation
   - Score recalculates and returns to client
   - UI updates with new score + removed keyword

5. **User Generates Artifacts**
   - React requests artifact generation
   - Server calls ArtifactEngine with current resume + changes
   - Claude generates multiple variants
   - Scores calculated for each variant
   - Variants returned for comparison

6. **User Returns Later**
   - React loads same job
   - Server queries workspace state
   - Chat history, dismissed keywords, selections load
   - UI reconstructs previous analysis state
   - User can continue from where they left off

---

## Folder Structure

```
jobber-app/
├── src/
│   ├── shared/
│   │   ├── types.ts                    # Shared types (Career Model, Job, etc.)
│   │   └── constants.ts                # Shared constants
│   │
│   ├── server/
│   │   ├── index.ts                    # Express app setup
│   │   ├── routes/                     # API endpoints
│   │   │   ├── health.ts               # GET /health
│   │   │   ├── jobs.ts                 # /api/jobs endpoints
│   │   │   ├── workspace.ts            # /api/workspace/:id endpoints
│   │   │   └── artifacts.ts            # /api/artifacts endpoints
│   │   │
│   │   └── services/                   # Business logic (no side effects)
│   │       ├── CareerModelService.ts   # Load career profile
│   │       ├── JobService.ts           # Create, read, update jobs
│   │       ├── WorkspaceService.ts     # Load/persist workspace state
│   │       ├── AnalysisServices.ts     # ResumeScorerService, KeywordAnalyzer, etc.
│   │       ├── ClaudeService.ts        # Claude API integration
│   │       ├── ArtifactEngine.ts       # Resume generation (deterministic)
│   │       └── ChangeGraphService.ts   # Immutable change tracking
│   │
│   └── client/
│       ├── App.tsx                     # Root component
│       ├── styles/
│       │   ├── variables.css           # Design system (colors, spacing, typography)
│       │   └── global.css              # Global styles
│       │
│       └── features/
│           ├── jobs/
│           │   ├── pages/JobsPage.tsx      # Job list + add form
│           │   ├── components/
│           │   │   ├── NewJobForm.tsx      # Add job form
│           │   │   ├── JobList.tsx         # List of jobs
│           │   │   └── onboarding/         # First-time user experience
│           │   │       ├── WelcomePanel.tsx
│           │   │       ├── CareerProfileCard.tsx
│           │   │       └── *.css
│           │   └── styles/
│           │       └── jobs-page.css
│           │
│           └── workspace/
│               ├── pages/WorkspacePage.tsx  # Main analysis view
│               ├── components/
│               │   ├── SourcePanel.tsx      # Job + metadata
│               │   ├── ChatPanel.tsx        # Recruiter chat
│               │   ├── StudioPanel.tsx      # Score, keywords, artifacts
│               │   ├── ResumeScore/
│               │   ├── MissingKeywords/
│               │   ├── JobFitAnalysis/
│               │   └── ArtifactComparison/
│               └── styles/
│                   └── workspace.css
│
├── data/
│   ├── Master_Career_Document.md       # Recruiter's career profile (manual entry)
│   └── jobops.db                       # SQLite database (generated)
│
├── docs/
│   ├── ARCHITECTURE.md                 # This file
│   ├── PRODUCT_DECISIONS.md            # Design decisions and tradeoffs
│   ├── AI_CONTEXT.md                   # AI agent instructions
│   ├── KNOWN_ISSUES.md                 # P0-P3 issues and status
│   └── adr/                            # Architecture Decision Records
│
└── tests/
    ├── unit/                           # Pure function tests
    ├── integration/                    # API + database tests
    └── components/                     # React component tests
```

**Key principles:**
- Features group by domain (jobs, workspace), not by type
- Components live with tests and styles (colocation)
- Services are stateless, reusable
- Types defined in shared layer for cross-boundary usage
- Design system centralized in CSS variables

---

## Service Layers

### Client Layer (React)

**Responsibilities:**
- UI rendering and user interaction
- Form handling and validation
- State management for current view
- API communication (fetch)
- Accessibility implementation

**Key Components:**
- `App.tsx` — Entry point, health check, navigation
- `JobsPage.tsx` — List, filter, add jobs
- `WorkspacePage.tsx` — Job analysis, chat, scoring
- `ResumeScore` — Score display and breakdown
- `MissingKeywords` — Keyword suggestions and acceptance
- `RecruiterChat` — Question/answer interface
- `ArtifactComparison` — Resume variant selection

**State Pattern:**
- useState for local form state
- API calls fetch remote state
- No complex state library (keep it simple for v1)

### API Layer (Express Routes)

**Endpoints:**
```
GET  /health              Health status
POST /api/jobs            Create job
GET  /api/jobs            List jobs
GET  /api/jobs/:id        Get job detail
PUT  /api/jobs/:id        Update job
GET  /api/workspace/:id   Load workspace analysis
POST /api/workspace/:id/chat    Ask question
POST /api/workspace/:id/keyword-accept  Accept keyword
POST /api/workspace/:id/generate-artifact  Generate resume
```

**Responsibilities:**
- Route requests to appropriate service
- Validate request inputs
- Return JSON responses
- Handle HTTP errors
- Implement rate limiting (future)

### Business Logic (Service Layer)

#### JobService
```typescript
class JobService {
  create(jobData): Job                    // Add new job
  list(filters): Job[]                    // List with status filter
  get(id): Job                            // Fetch single job
  update(id, changes): Job                // Update metadata
  archive(id): void                       // Archive closed jobs
}
```

#### WorkspaceService
```typescript
class WorkspaceService {
  load(jobId, careerModel): WorkspaceState
  // Returns: resumeScore, keywords, jobFit, chatMessages
  
  acceptKeyword(jobId, keyword): void     // Add to ChangeGraph
  dismissKeyword(jobId, keyword): void    // Record dismissal
  saveChat(jobId, message): void          // Persist chat
}
```

#### AnalysisServices

**ResumeScorerService**
```typescript
class ResumeScorerService {
  scoreResume(careerModel, job): ResumeScore {
    // Returns score 0-100 with category breakdown
    // Categories: ATS, alignment, seniority, impact, readability, format
    confidence: 0-1
    recommendations: string[]
  }
}
```

**KeywordAnalyzerService**
```typescript
class KeywordAnalyzerService {
  analyzeMissing(careerModel, job): MissingKeyword[] {
    // Returns keywords in job not sufficiently in resume
    keyword: string
    importance: 'critical' | 'high' | 'medium' | 'low'
    frequency: { inJob, inResume }
    suggestedPlacement: string
  }
}
```

**JobFitAnalyzerService**
```typescript
class JobFitAnalyzerService {
  analyzeJobFit(careerModel, job): JobFitAnalysis {
    // Returns overall fit assessment
    overallFit: 0-100
    confidenceLevel: 'high' | 'medium' | 'low'
    strongMatches: string[]
    weakMatches: string[]
    rejectionRisks: string[]
    interviewTalkingPoints: string[]
  }
}
```

#### Claude Service (AI)

```typescript
class ClaudeService {
  // Recruiter Q&A powered by Claude
  answerRecruiterQuestion(
    questionId: string,
    careerModel: CareerModel,
    job: Job
  ): RecruiterAnswer {
    // Prompts Claude with career + job context
    // Returns analysis, risks, suggestions, confidence
  }
  
  // Resume artifact generation
  generateArtifact(
    careerModel: CareerModel,
    job: Job,
    style: 'aggressive' | 'balanced' | 'minimal'
  ): Artifact {
    // Generates optimized resume for job
    // Multiple styles → score each → return variants
  }
}
```

#### ChangeGraph Service

```typescript
class ChangeGraphService {
  recordChange(
    jobId: string,
    target: 'resume' | 'cover_letter',
    operation: 'add' | 'modify' | 'remove',
    field: string,
    value: string,
    reasoning: string
  ): ChangeNode {
    // Immutable audit trail
    // Enables rollback and decision history
  }
  
  getChanges(jobId: string): ChangeNode[] {
    // Returns all changes for job
  }
  
  rollback(jobId: string, toChangeId: string): void {
    // Revert to previous state
  }
}
```

#### Artifact Engine

```typescript
class ArtifactEngineService {
  generate(
    careerModel: CareerModel,
    job: Job,
    strategy: 'aggressive' | 'balanced' | 'minimal'
  ): string {
    // Generates resume HTML/content
    // Uses master career doc + accepted changes
    // Strategy determines emphasis levels
    // Output deterministic (same input = same output)
  }
  
  score(artifact: string, job: Job): number {
    // Scores generated artifact
    // Same algorithm as ResumeScorerService
    // Ensures variant comparability
  }
}
```

### Data Layer (SQLite)

**Schema:**
```sql
-- Jobs tracked by user
jobs (
  id, title, company, description,
  state, created_at, updated_at
)

-- Analysis snapshots per job
analyses (
  id, job_id, career_doc_version_hash,
  fit_score, skills_match, gaps,
  created_at
)

-- Chat history per job
chat_messages (
  id, job_id, role, content,
  created_at
)

-- Immutable change record
change_graph (
  id, job_id, target, operation, field,
  original_value, new_value, reasoning,
  created_at
)

-- Workspace state per job
workspace_state (
  job_id, accepted_changes, dismissed_keywords,
  selected_artifact, created_at, updated_at
)

-- Generated artifacts per job
artifacts (
  id, job_id, artifact_type, content,
  career_doc_version_hash, created_at
)
```

---

## Frontend Architecture

### Component Hierarchy

```
App
├── HealthStatus (footer)
├── JobsPage
│   ├── NewJobForm
│   ├── JobList
│   └── JobListFilters
└── WorkspacePage
    ├── WorkspaceLayout
    │   ├── SourcePanel
    │   │   ├── JobDetail
    │   │   └── JobMetadata
    │   ├── ChatPanel
    │   │   ├── RecruiterChat
    │   │   ├── RecruiterQuestion
    │   │   └── RecruiterAnswer
    │   └── StudioPanel
    │       ├── ResumeScore
    │       ├── MissingKeywords
    │       ├── JobFitAnalysis
    │       └── ArtifactComparison
    └── WorkspaceLoading
```

### State Management Pattern

**Local Component State** (`useState`)
- Form inputs
- UI toggles
- Current tab/selection
- Modal open/closed

**Remote State** (API)
- Jobs list
- Workspace analysis
- Chat history
- Generated artifacts

**Pattern:**
```typescript
function WorkspacePage({ jobId }) {
  const [job, setJob] = useState(null);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch on mount
    loadWorkspace(jobId).then(data => {
      setJob(data.job);
      setScore(data.score);
      setLoading(false);
    });
  }, [jobId]);
  
  // Render with loaded state
  if (loading) return <WorkspaceLoading />;
  return <WorkspaceLayout job={job} score={score} />;
}
```

### Accessibility Pattern

Every interactive component includes:
```typescript
<button
  aria-label="Accept keyword"
  onClick={onAccept}
  role="button"
/>

<div role="tab" aria-selected={isSelected}>
  Tab Name
</div>

<div aria-live="polite" role="status">
  Loading results...
</div>
```

---

## Backend Architecture

### Express Server Structure

```typescript
// Server entry point
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(errorHandler);

// Routes
app.get('/health', healthCheckHandler);
app.post('/api/jobs', jobsHandler);
app.get('/api/workspace/:id', workspaceHandler);

// Service initialization
const jobService = new JobService();
const workspaceService = new WorkspaceService();
const claudeService = new ClaudeService();

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status || 500).json({
    error: { message: err.message }
  });
});
```

### Service Initialization

```typescript
// Services are singletons (initialized once)
const careerModelService = new CareerModelService();
const resumeScorer = new ResumeScorerService();
const keywordAnalyzer = new KeywordAnalyzerService();
const jobFitAnalyzer = new JobFitAnalyzerService();
const artifactEngine = new ArtifactEngineService();
const changeGraph = new ChangeGraphService();
const claudeService = new ClaudeService();

// Dependencies injected or accessed from global
```

### Request Handling Pattern

```typescript
async function workspaceHandler(req, res) {
  try {
    const { jobId } = req.params;
    
    // Load job
    const job = await jobService.get(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    // Load career model
    const careerModel = await careerModelService.resolve();
    if (!careerModel) return res.status(503).json({ error: 'CV not available' });
    
    // Analyze
    const score = await resumeScorer.scoreResume(careerModel, job);
    const keywords = await keywordAnalyzer.analyzeMissing(careerModel, job);
    const fit = await jobFitAnalyzer.analyzeJobFit(careerModel, job);
    
    // Return workspace state
    res.json({
      job,
      score,
      keywords,
      fit,
      chatMessages: await workspaceService.getChat(jobId)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

---

## AI Integration (Claude API)

### Prompting Strategy

**System Prompt** (defines Claude's role)
```
You are a professional resume and job fit advisor. 
Your role is to help candidates understand how their 
experience aligns with job opportunities and suggest 
targeted improvements.

Focus on truthfulness and practical suggestions. 
Do not fabricate or exaggerate experience.
```

**User Prompts** (specific analysis)
```
Candidate Resume:
[Career model content]

Job Description:
[Full job text]

Question: What would worry a recruiter reviewing this resume?

Provide:
1. Specific concerns (risks)
2. Why they matter (impact)
3. How to address them (suggestions)
4. Confidence level (high/medium/low)
```

### Response Processing

```typescript
// Parse Claude response into structured data
function parseRecruiterAnswer(text: string): RecruiterAnswer {
  // Extract: risks, suggested changes, follow-ups, confidence
  // Use regex or simple heuristics
  // Return typed RecruiterAnswer object
  
  return {
    question: 'What would worry a recruiter?',
    answer: text,
    risks: extractRisks(text),
    suggestedChanges: extractSuggestions(text),
    followUpQuestions: generateFollowUps(text),
    confidence: estimateConfidence(text)
  };
}
```

### Error Handling

```typescript
// Claude API failures handled gracefully
async function answerQuestion(questionId, careerModel, job) {
  try {
    const response = await claudeService.complete(prompt);
    return parseRecruiterAnswer(response);
  } catch (err) {
    if (err.code === 'RATE_LIMIT_EXCEEDED') {
      return {
        answer: 'Claude API temporarily unavailable. Try again in 60 seconds.',
        risks: [],
        suggestedChanges: [],
        confidence: 0
      };
    }
    throw err;
  }
}
```

---

## ChangeGraph Model

**Immutable Audit Trail**

Every change to resume is recorded:

```typescript
interface ChangeNode {
  id: string;                    // Unique change ID
  target: 'resume' | 'cover_letter';
  field: string;                 // Path: "skills.0" or "experience"
  operation: 'add' | 'modify' | 'remove';
  originalValue?: string;        // Before
  newValue?: string;             // After
  reason: string;                // Why this change
  source: 'ai_suggestion' | 'user';
  confidence: number;            // 0-1, how confident
  accepted_at?: string;          // When user accepted
  conversationId?: string;       // Which chat led to this
  tags?: string[];               // Category, priority, etc.
  created_at: string;
}
```

**Workflow:**
1. AI suggests change → recorded as pending
2. User accepts → timestamp recorded in `accepted_at`
3. Score recalculates with change
4. User can review all changes → see reasoning
5. User can rollback → revert to pre-change state

**Benefits:**
- Transparent decision history
- Easy to understand "why"
- Enables rollback
- Audit trail for compliance
- Supports conversation-based reasoning

---

## Artifact Engine

**Resume Generation Strategy**

Input: Career model + job + style  
Output: Optimized resume content

```typescript
async function generateArtifact(
  careerModel: CareerModel,
  job: Job,
  style: 'aggressive' | 'balanced' | 'minimal'
): Promise<Artifact> {
  // 1. Extract job requirements
  const keywords = extractKeywords(job.description);
  
  // 2. Score current resume against job
  const baseline = await scoreResume(careerModel, job);
  
  // 3. Generate variants based on style
  const variants = {
    aggressive: generateVariant(careerModel, keywords, 'emphasize_all'),
    balanced: generateVariant(careerModel, keywords, 'emphasize_relevant'),
    minimal: generateVariant(careerModel, keywords, 'emphasize_critical')
  };
  
  // 4. Score each variant
  const scores = await Promise.all(
    Object.entries(variants).map(async ([style, content]) => {
      const score = await scoreResume(parseResume(content), job);
      return { style, content, score };
    })
  );
  
  // 5. Return all variants for comparison
  return {
    variants: scores,
    baseline,
    recommended: scores[0]  // Highest scoring variant
  };
}
```

**Key Property: Determinism**
- Same input (career model + job) → same output
- Enables caching and reproducibility
- Variants compared fairly
- User confidence in consistency

---

## Persistence Model

### Data Durability

**Immediate Persistence:**
- Jobs written to SQLite on create
- Chat messages saved after each message
- Keyword acceptance recorded in ChangeGraph

**State Retention:**
- Workspace state: workspace_state table
  - Accepted changes list
  - Dismissed keywords set
  - Selected artifact ID
- Chat history: chat_messages table
- Change log: change_graph table (immutable)

**Recovery:**
- User returns to job
- Load job from jobs table
- Load chat_messages for that job
- Load accepted changes from workspace_state
- Reconstruct UI with loaded state

### Cache Invalidation

**Master Career Document Change:**
- Computed hash of career model
- If hash changes → all analyses invalid
- Hash used as cache key
- Change triggers full re-analysis

```typescript
// Career model hash computed from content
const hash = hashCareerModel(careerModel);

// Used as cache key
const cachedScore = scoreCache.get(`${jobId}:${hash}`);
if (cachedScore) return cachedScore;

// On change, hash differs → new analysis
const newHash = hashCareerModel(updatedModel);
// newHash !== oldHash → cache miss → recompute
```

---

## Security

### API Security
- Input validation on all endpoints
- SQL parameterized queries
- CORS configured for allowed origins
- Rate limiting (future enhancement)

### Data Security
- Claude API key in environment variables only
- Never logged or exposed in errors
- HTTPS in production
- Database file not version controlled

### User Data
- No PII stored except job metadata
- Career document stored locally
- No analytics tracking user behavior (future)
- Error messages don't expose sensitive data

---

## Known Technical Debt

### CareerModel.hash Field
- Currently duplicated in both top-level and metadata
- Both synchronized but redundant
- Should consolidate to metadata.hash only
- Post-v1 migration plan documented

### Test File Type Suppression
- `@ts-nocheck` on test file due to 29 errors
- Test-only errors, production code safe
- Should replace with narrower `@ts-expect-error`
- Post-v1 refactoring: 1-2 hours

### Unused Variable Placeholders
- 5 unused variables marked for future implementation
- Safe to leave or implement
- Post-v1: implement or remove

### Error Logging
- Basic error logging in place
- Should enhance with structured logging
- Future: integrate with monitoring service

### Performance Optimization
- No query optimization yet
- SQLite adequate for v1 scale
- Future: add caching layer, query indexing
- Bundle size reasonable: 534 kB gzipped

---

## Deployment Considerations

### Prerequisites
- Node.js 20 LTS
- SQLite support (built-in)
- Claude API key
- 500+ MB disk for database growth

### Configuration
```bash
# Essential
CLAUDE_API_KEY=sk-ant-...
NODE_ENV=production

# Optional
SERVER_PORT=3001
DATABASE_PATH=/var/lib/jobops/data.db
```

### Scaling Notes
- SQLite suitable for single-user or small team
- For multi-tenant: migrate to PostgreSQL
- Claude API calls are rate-limited
- Consider caching layer for high traffic

### Monitoring
- Health check endpoint: `GET /health`
- Error logging to console (stdout)
- Future: structured logging, error tracking
- Future: performance monitoring, analytics

---

## Future Architecture Evolutions

### Phase 2 (Post-v1)
- Bulk operations optimization
- Export features
- More AI chat options
- Analytics dashboard

### Phase 3+
- Multi-user support
- Team collaboration
- Integration with job boards
- Outcome prediction models
- Advanced positioning strategies

---

---

## Common Integration Patterns

### Adding a New Analysis Service

1. Create service in `src/server/services/YourNewService.ts`
2. Export interface and implementation
3. Add route in `src/server/routes/workspace.ts` to call it
4. Add test file in `tests/integration/services/`
5. Return typed response to client

**Example:**
```typescript
// Service
export interface YourAnalysisService {
  analyze(careerModel: CareerModel, job: Job): Promise<YourAnalysisResult>;
}

// Route
app.post('/api/workspace/:jobId/your-analysis', async (req, res) => {
  const result = await yourService.analyze(careerModel, job);
  res.json(result);
});

// Client
const result = await fetch(`/api/workspace/${jobId}/your-analysis`);
```

### Adding a New UI Feature

1. Create feature folder: `src/client/features/your-feature/`
2. Structure: `pages/`, `components/`, `styles/`
3. Add component tests (same folder)
4. Import from services via hooks, not directly
5. Use CSS variables for all visual properties

**Pattern:**
```typescript
// Component calls hook
function YourComponent() {
  const data = useYourService();
  return <div>{data}</div>;
}

// Hook calls service API
function useYourService() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/your-data').then(r => r.json()).then(setData);
  }, []);
  return data;
}
```

### Working with Career Model

**Never mutate directly:**
```typescript
// ❌ WRONG
careerModel.sections.skills.push("New skill");

// ✅ RIGHT
const change = new ChangeNode({
  target: "resume",
  field: "skills",
  operation: "add",
  newValue: "New skill",
  reason: "Critical skill for this role",
});
changeGraph.record(change);
```

### Caching Analysis Results

Cache key includes Career Model hash:

```typescript
const cacheKey = `${jobId}:${careerModel.metadata.hash}:${analysisType}`;
const cached = cache.get(cacheKey);
if (cached) return cached;

const result = await expensiveAnalysis(careerModel, job);
cache.set(cacheKey, result);
return result;
```

---

## References

- **[PRODUCT_DECISIONS.md](PRODUCT_DECISIONS.md):** Why major decisions were made
- **[AI_CONTEXT.md](AI_CONTEXT.md):** Instructions for AI agents implementing features
- **[KNOWN_ISSUES.md](KNOWN_ISSUES.md):** P0-P3 issues, deferred features, workarounds
- **[docs/adr/](adr/):** Detailed analysis of specific decisions

---

**Document Version:** 1.0.0-rc1  
**Last Updated:** 2026-06-13  
**Maintainer:** Erik Taylor  
**Status:** Canonical reference—read this before implementing features or fixing bugs
