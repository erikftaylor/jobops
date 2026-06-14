# Implementation Plan IP-001: Tailored Resume & Cover Letter Generator

**Based on:** ADR-005-tailored-resume-cover-letter-generator.md  
**Date:** 2026-06-14  
**Duration:** ~11 weeks (6 phases)  
**Team:** Backend (1 senior), Frontend (1 senior), QA (0.5 FTE)  

---

## 1. Overview

This implementation plan breaks ADR-005 into 6 sequential phases, each with concrete deliverables, file changes, database migrations, tests, and acceptance criteria.

**Goal:** Build a production-ready artifact system that generates tailored, versioned resumes and cover letters from a user's career profile and job requirements.

**Core Constraints:**
- SQLite TEXT for JSON storage (not JSONB)
- Zod validation before persistence
- Failed generations NOT persisted
- User preview REQUIRED before download
- Source-consistency validation (catches obvious hallucinations, not perfect)
- Every artifact tied to: career_doc_version, prompt_version, model, positioning
- Version numbers auto-increment per (job_id, artifact_type)

---

## 2. Assumptions

### Technical Assumptions
- TypeScript + Express backend already in place
- React + Vite frontend already in place
- SQLite database accessible via better-sqlite3
- Claude API (claude-sonnet-4-20250514) available and working
- Zod library available for validation
- pdfkit library available for PDF generation

### Process Assumptions
- Code review required before merge
- All tests must pass before deploy
- Feature flags available for gradual rollout
- Monitoring/logging infrastructure in place
- Git branching strategy: feature branches → main

### User Assumptions
- Users have career profiles filled in
- Users can review content before sending
- Users understand preview is their responsibility

---

## 3. Phased Roadmap

```
PHASE 1: Artifact Infrastructure (2 weeks)
├─ Database schema
├─ ArtifactService + CRUD
├─ Zod schemas
└─ Basic routes (no Claude)

PHASE 2: Resume Generation (3 weeks)
├─ PromptBuilderService
├─ ResumeGeneratorService
├─ Claude integration
├─ Validation layer
├─ Generation endpoint
└─ Preview UI

PHASE 3: Cover Letter Generation (2 weeks)
├─ CoverLetterGeneratorService
├─ Cover letter prompt
├─ Cover letter schema
├─ Preview UI

PHASE 4: PDF Export & Templates (2 weeks)
├─ Template-based rendering
├─ ATS-safe templates (resume, cover)
├─ PDF export endpoint
├─ Download buttons

PHASE 5: Regeneration & Versioning (2 weeks)
├─ Positioning selector
├─ Regenerate flow
├─ Version list + comparison
├─ Artifact management UI

PHASE 6: Polish & E2E Tests (2 weeks)
├─ Loading/error/empty states
├─ Telemetry
├─ E2E tests
├─ Rollout preparation
```

---

## 4. Detailed Task Breakdown

### PHASE 1: Artifact Infrastructure (2 weeks)

**Backend Tasks:**

#### Task 1.1: Database Migration - job_artifacts Table
**File:** `src/server/db/migrations/001_create_job_artifacts.ts`

```sql
CREATE TABLE job_artifacts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,     -- 'resume' | 'cover_letter' | 'fit_analysis'
  version INTEGER NOT NULL,
  positioning TEXT,
  title TEXT,
  career_doc_version_id TEXT NOT NULL,
  prompt_version INTEGER NOT NULL,
  model TEXT NOT NULL,
  json_content TEXT NOT NULL,      -- Serialized JSON
  rendered_text TEXT NOT NULL,
  status TEXT NOT NULL,            -- 'draft' | 'ready' | 'error' | 'archived'
  is_preferred BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(job_id, artifact_type, version),
  FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_job_artifacts_job_id ON job_artifacts(job_id);
CREATE INDEX idx_job_artifacts_type_version ON job_artifacts(artifact_type, version);
CREATE INDEX idx_job_artifacts_created_at ON job_artifacts(created_at DESC);
```

**Acceptance:** Migration runs without errors; table created with correct schema; indexes present.

---

#### Task 1.2: Zod Schemas for Artifacts
**File:** `src/server/validation/schemas/artifact.schema.ts`

```typescript
// Artifact types
export const ArtifactTypeSchema = z.enum(['resume', 'cover_letter', 'fit_analysis']);
export const ArtifactStatusSchema = z.enum(['draft', 'ready', 'error', 'archived']);

// Resume content
export const ResumeSectionSchema = z.object({
  title: z.string(),
  company: z.string(),
  dates: z.string().optional(),
  description: z.string().optional(),
  bullets: z.array(z.string()).optional(),
});

export const ResumeContentSchema = z.object({
  analysis: z.object({
    positioning: z.string(),
    highPriorityKeywords: z.array(z.string()),
    strengthsToHighlight: z.array(z.string()),
  }),
  resume: z.object({
    professionalSummary: z.string(),
    coreSkills: z.array(z.string()),
    experience: z.array(ResumeSectionSchema),
    education: z.array(
      z.object({
        school: z.string(),
        degree: z.string(),
        year: z.string().optional(),
      })
    ),
  }),
});

// Cover letter content
export const CoverLetterContentSchema = z.object({
  title: z.string(),
  body: z.string(),
});

// Artifact database record
export const ArtifactSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  artifactType: ArtifactTypeSchema,
  version: z.number().int().positive(),
  positioning: z.string().optional(),
  title: z.string().optional(),
  careerDocVersionId: z.string(),
  promptVersion: z.number().int().positive(),
  model: z.string(),
  jsonContent: z.union([ResumeContentSchema, CoverLetterContentSchema]),
  renderedText: z.string(),
  status: ArtifactStatusSchema,
  isPreferred: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Artifact = z.infer<typeof ArtifactSchema>;
export type ResumeContent = z.infer<typeof ResumeContentSchema>;
export type CoverLetterContent = z.infer<typeof CoverLetterContentSchema>;
```

**Acceptance:** All schemas compile; validation works for valid/invalid inputs.

---

#### Task 1.3: ArtifactService (CRUD + Versioning)
**File:** `src/server/services/artifact.service.ts`

```typescript
export class ArtifactService {
  constructor(private db: Database) {}

  /**
   * Create a new artifact. Automatically increments version.
   */
  create(input: {
    jobId: string;
    artifactType: 'resume' | 'cover_letter' | 'fit_analysis';
    positioning?: string;
    title?: string;
    careerDocVersionId: string;
    promptVersion: number;
    model: string;
    jsonContent: object;
    renderedText: string;
    status: 'ready' | 'error' | 'draft';
  }): Artifact {
    // 1. Get next version number for this job + type
    const maxVersion = this.db
      .prepare('SELECT MAX(version) as v FROM job_artifacts WHERE job_id = ? AND artifact_type = ?')
      .get(input.jobId, input.artifactType) as { v: number | null };
    
    const nextVersion = (maxVersion?.v ?? 0) + 1;
    
    // 2. Validate JSON content
    const schema = input.artifactType === 'resume' 
      ? ResumeContentSchema 
      : CoverLetterContentSchema;
    const validated = schema.parse(input.jsonContent);
    
    // 3. Serialize JSON to TEXT
    const jsonText = JSON.stringify(validated);
    
    // 4. Create artifact record
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO job_artifacts (
        id, job_id, artifact_type, version, positioning, title,
        career_doc_version_id, prompt_version, model,
        json_content, rendered_text, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, input.jobId, input.artifactType, nextVersion, input.positioning ?? null, 
      input.title ?? null, input.careerDocVersionId, input.promptVersion, input.model,
      jsonText, input.renderedText, input.status, now, now
    );
    
    return this.getById(id)!;
  }

  /**
   * Get artifact by ID
   */
  getById(id: string): Artifact | null {
    const row = this.db
      .prepare('SELECT * FROM job_artifacts WHERE id = ?')
      .get(id) as any;
    
    return row ? this.mapToArtifact(row) : null;
  }

  /**
   * List all artifacts for a job (with optional type filter)
   */
  listByJob(
    jobId: string,
    options?: { type?: string; limit?: number; sort?: string }
  ): Artifact[] {
    let query = 'SELECT * FROM job_artifacts WHERE job_id = ?';
    const params: any[] = [jobId];
    
    if (options?.type) {
      query += ' AND artifact_type = ?';
      params.push(options.type);
    }
    
    query += ` ORDER BY ${options?.sort || 'created_at DESC'}`;
    
    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => this.mapToArtifact(row));
  }

  /**
   * Mark an artifact as preferred (unmark others)
   */
  setPreferred(artifactId: string, jobId: string, artifactType: string): void {
    this.db.prepare('BEGIN TRANSACTION');
    try {
      const artifact = this.getById(artifactId);
      if (!artifact) throw new Error(`Artifact ${artifactId} not found`);
      
      // Unmark other artifacts of same type for this job
      this.db
        .prepare(
          'UPDATE job_artifacts SET is_preferred = 0 WHERE job_id = ? AND artifact_type = ?'
        )
        .run(jobId, artifactType);
      
      // Mark this one as preferred
      this.db
        .prepare('UPDATE job_artifacts SET is_preferred = 1, updated_at = ? WHERE id = ?')
        .run(new Date().toISOString(), artifactId);
      
      this.db.prepare('COMMIT');
    } catch (error) {
      this.db.prepare('ROLLBACK');
      throw error;
    }
  }

  /**
   * Archive an artifact (soft delete)
   */
  archive(artifactId: string): void {
    this.db
      .prepare('UPDATE job_artifacts SET status = ?, updated_at = ? WHERE id = ?')
      .run('archived', new Date().toISOString(), artifactId);
  }

  // Helper: map DB row to Artifact type
  private mapToArtifact(row: any): Artifact {
    return {
      id: row.id,
      jobId: row.job_id,
      artifactType: row.artifact_type,
      version: row.version,
      positioning: row.positioning,
      title: row.title,
      careerDocVersionId: row.career_doc_version_id,
      promptVersion: row.prompt_version,
      model: row.model,
      jsonContent: JSON.parse(row.json_content),
      renderedText: row.rendered_text,
      status: row.status,
      isPreferred: Boolean(row.is_preferred),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

**Acceptance:** All methods work; version auto-increment correct; JSON serialization/deserialization works.

---

#### Task 1.4: Artifact Routes (Basic CRUD)
**File:** `src/server/routes/artifacts.ts`

```typescript
export const createArtifactRoutes = (db: Database) => {
  const router = Router();
  const artifactService = new ArtifactService(db);

  /**
   * GET /api/jobs/:jobId/artifacts
   * List all artifacts for a job
   */
  router.get('/:jobId/artifacts', (req, res) => {
    try {
      const { jobId } = req.params;
      const { type, limit, sort } = req.query;
      
      const artifacts = artifactService.listByJob(jobId, {
        type: type as string | undefined,
        limit: limit ? parseInt(limit as string) : 50,
        sort: (sort as string) || 'created_at:desc',
      });
      
      res.json({ status: 200, data: { jobId, artifacts } });
    } catch (error: any) {
      res.status(500).json({ status: 500, error: { code: 'LIST_FAILED', message: error.message } });
    }
  });

  /**
   * GET /api/jobs/:jobId/artifacts/:artifactId
   * Get single artifact
   */
  router.get('/:jobId/artifacts/:artifactId', (req, res) => {
    try {
      const { artifactId } = req.params;
      const artifact = artifactService.getById(artifactId);
      
      if (!artifact) {
        return res.status(404).json({ status: 404, error: { code: 'NOT_FOUND' } });
      }
      
      res.json({ status: 200, data: artifact });
    } catch (error: any) {
      res.status(500).json({ status: 500, error: { code: 'GET_FAILED', message: error.message } });
    }
  });

  /**
   * PATCH /api/jobs/:jobId/artifacts/:artifactId
   * Update artifact (mark preferred, archive, etc.)
   */
  router.patch('/:jobId/artifacts/:artifactId', (req, res) => {
    try {
      const { artifactId, jobId } = req.params;
      const { isPreferred, status } = req.body;
      
      const artifact = artifactService.getById(artifactId);
      if (!artifact) {
        return res.status(404).json({ status: 404, error: { code: 'NOT_FOUND' } });
      }
      
      if (isPreferred === true) {
        artifactService.setPreferred(artifactId, jobId, artifact.artifactType);
      }
      
      if (status === 'archived') {
        artifactService.archive(artifactId);
      }
      
      const updated = artifactService.getById(artifactId);
      res.json({ status: 200, data: updated });
    } catch (error: any) {
      res.status(500).json({ status: 500, error: { code: 'UPDATE_FAILED', message: error.message } });
    }
  });

  return router;
};

// Register in main app
app.use('/api/jobs', createArtifactRoutes(db));
```

**Acceptance:** All routes work; list returns correct artifacts; update correctly marks preferred.

---

#### Task 1.5: Unit Tests for ArtifactService
**File:** `src/server/services/__tests__/artifact.service.test.ts`

```typescript
describe('ArtifactService', () => {
  let service: ArtifactService;
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    // Create table
    db.exec(`CREATE TABLE job_artifacts (...)`);
    service = new ArtifactService(db);
  });

  it('should auto-increment version for same job + type', () => {
    const v1 = service.create({
      jobId: 'job-1',
      artifactType: 'resume',
      careerDocVersionId: 'cv-1',
      promptVersion: 1,
      model: 'claude-sonnet',
      jsonContent: mockResumeContent(),
      renderedText: 'John Doe...',
      status: 'ready',
    });
    
    const v2 = service.create({
      jobId: 'job-1',
      artifactType: 'resume',
      careerDocVersionId: 'cv-1',
      promptVersion: 1,
      model: 'claude-sonnet',
      jsonContent: mockResumeContent(),
      renderedText: 'John Doe...',
      status: 'ready',
    });
    
    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
  });

  it('should allow separate version counters for different types', () => {
    const resume = service.create({
      jobId: 'job-1',
      artifactType: 'resume',
      careerDocVersionId: 'cv-1',
      promptVersion: 1,
      model: 'claude-sonnet',
      jsonContent: mockResumeContent(),
      renderedText: 'Resume text',
      status: 'ready',
    });
    
    const cover = service.create({
      jobId: 'job-1',
      artifactType: 'cover_letter',
      careerDocVersionId: 'cv-1',
      promptVersion: 1,
      model: 'claude-sonnet',
      jsonContent: mockCoverLetterContent(),
      renderedText: 'Cover text',
      status: 'ready',
    });
    
    expect(resume.version).toBe(1);
    expect(cover.version).toBe(1); // Different type, separate counter
  });

  it('should mark single artifact as preferred per type', () => {
    const v1 = service.create({...});
    const v2 = service.create({...});
    
    service.setPreferred(v1.id, 'job-1', 'resume');
    const updated = service.getById(v1.id);
    
    expect(updated?.isPreferred).toBe(true);
    
    service.setPreferred(v2.id, 'job-1', 'resume');
    const v1After = service.getById(v1.id);
    
    expect(v1After?.isPreferred).toBe(false);
    expect(service.getById(v2.id)?.isPreferred).toBe(true);
  });

  it('should reject invalid JSON on create', () => {
    expect(() => {
      service.create({
        jobId: 'job-1',
        artifactType: 'resume',
        careerDocVersionId: 'cv-1',
        promptVersion: 1,
        model: 'claude-sonnet',
        jsonContent: { invalid: 'schema' },
        renderedText: 'text',
        status: 'ready',
      });
    }).toThrow();
  });
});
```

**Acceptance:** All tests pass; versioning logic correct; validation working.

---

**Frontend Tasks:**

#### Task 1.6: TypeScript Types
**File:** `src/shared/types.ts` (append to existing file)

```typescript
export type ArtifactType = 'resume' | 'cover_letter' | 'fit_analysis';
export type ArtifactStatus = 'draft' | 'ready' | 'error' | 'archived';

export interface Artifact {
  id: string;
  jobId: string;
  artifactType: ArtifactType;
  version: number;
  positioning?: string;
  title?: string;
  careerDocVersionId: string;
  promptVersion: number;
  model: string;
  jsonContent: ResumeContent | CoverLetterContent;
  renderedText: string;
  status: ArtifactStatus;
  isPreferred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeContent {
  analysis: {
    positioning: string;
    highPriorityKeywords: string[];
    strengthsToHighlight: string[];
  };
  resume: {
    professionalSummary: string;
    coreSkills: string[];
    experience: Array<{
      title: string;
      company: string;
      dates?: string;
      description?: string;
      bullets?: string[];
    }>;
    education: Array<{
      school: string;
      degree: string;
      year?: string;
    }>;
  };
}

export interface CoverLetterContent {
  title: string;
  body: string;
}

export interface ArtifactListResponse {
  jobId: string;
  artifacts: Artifact[];
}
```

**Acceptance:** Types compile; match backend schemas.

---

#### Task 1.7: React Artifact Context/Hooks
**File:** `src/client/features/artifacts/useArtifacts.ts`

```typescript
export function useArtifacts(jobId: string) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArtifacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/jobs/${jobId}/artifacts`);
      if (!response.ok) throw new Error('Failed to fetch artifacts');
      const data = await response.json();
      setArtifacts(data.data.artifacts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  const getArtifact = useCallback(async (artifactId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/artifacts/${artifactId}`);
      if (!response.ok) throw new Error('Failed to fetch artifact');
      const data = await response.json();
      return data.data as Artifact;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [jobId]);

  const setPreferred = useCallback(async (artifactId: string, type: ArtifactType) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/artifacts/${artifactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPreferred: true }),
      });
      if (!response.ok) throw new Error('Failed to set preferred');
      await fetchArtifacts();
    } catch (err: any) {
      setError(err.message);
    }
  }, [jobId, fetchArtifacts]);

  const archiveArtifact = useCallback(async (artifactId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/artifacts/${artifactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (!response.ok) throw new Error('Failed to archive');
      await fetchArtifacts();
    } catch (err: any) {
      setError(err.message);
    }
  }, [jobId, fetchArtifacts]);

  return {
    artifacts,
    isLoading,
    error,
    fetchArtifacts,
    getArtifact,
    setPreferred,
    archiveArtifact,
  };
}
```

**Acceptance:** Hook works; fetches, sets preferred, archives correctly.

---

### PHASE 2: Resume Generation (3 weeks)

#### Task 2.1: PromptBuilderService
**File:** `src/server/services/prompt-builder.service.ts`

Builds Claude prompts with career profile, job analysis, and fit analysis. Include:
- Career profile text extraction (use existing careerModelToText utility)
- Job requirement parsing
- Prompt templating with positioning
- Never-hallucinate instructions

**Acceptance:** Prompts compile; include all required sections; no hallucinations in instruction.

---

#### Task 2.2: ResumeGeneratorService
**File:** `src/server/services/resume-generator.service.ts`

Orchestrates:
1. Call PromptBuilderService.buildResumePrompt()
2. Call ClaudeService.generate(prompt)
3. Validate response with ResumeContentSchema
4. Call ArtifactService.create() with validated content
5. Return artifact or error

**Error handling:**
- Failed Claude call: return 500 error, don't persist
- Invalid JSON: return 400 error, don't persist
- Validation failure: return 400 error, don't persist

**Acceptance:** Generates valid resume JSON; doesn't persist on error; latency < 15s.

---

#### Task 2.3: Source-Consistency Validation
**File:** `src/server/services/validation/source-consistency.validator.ts`

Checks:
- All companies in resume exist in career profile
- All skills in resume exist in career profile
- No obviously invented content

Returns: `{ isValid: boolean; issues: string[] }`

**Acceptance:** Catches obvious hallucinations; doesn't break on edge cases.

---

#### Task 2.4: Resume Generation Endpoint
**File:** `src/server/routes/artifacts.ts` (add to existing)

```
POST /api/jobs/:jobId/artifacts/generate
Body: { artifactType: 'resume', positioning?: string }
Response: { artifactId, preview, status }
Error: { code, message }
```

**Acceptance:** Endpoint works; returns artifact on success; error on failure.

---

#### Task 2.5: Resume Preview Modal (React)
**File:** `src/client/features/artifacts/ResumePreviewModal.tsx`

Component shows:
- Resume preview (rendered_text)
- Positioning angle
- Copy button
- Download button (disabled until user reviews)

**Acceptance:** Displays correctly; copy works; download triggers export.

---

#### Task 2.6: Integration Tests
**File:** `src/server/services/__tests__/resume-generator.integration.test.ts`

Test full flow:
1. Create career profile + job
2. Call POST /artifacts/generate with resume
3. Verify artifact created
4. Verify artifact retrievable
5. Verify no hallucinations persisted

**Acceptance:** E2E flow works; artifact persisted correctly.

---

### PHASE 3: Cover Letter Generation (2 weeks)

#### Task 3.1: CoverLetterGeneratorService
**File:** `src/server/services/cover-letter-generator.service.ts`

Similar to ResumeGeneratorService but for cover letters.

**Acceptance:** Generates valid cover letter JSON; < 15s latency.

---

#### Task 3.2: Cover Letter Preview Modal
**File:** `src/client/features/artifacts/CoverLetterPreviewModal.tsx`

Display cover letter text with copy/download.

**Acceptance:** Displays correctly; matches resume flow.

---

### PHASE 4: PDF Export & Templates (2 weeks)

#### Task 4.1: Resume HTML Template
**File:** `src/server/templates/resume.html.ts`

Function that takes ResumeContent → HTML string.

Requirements:
- Single column layout
- Standard typography (11-12pt)
- No graphics, colors, images
- Readable spacing
- ATS-safe structure

**Acceptance:** Generated HTML is valid; renders correctly; no special formatting.

---

#### Task 4.2: Cover Letter HTML Template
**File:** `src/server/templates/cover-letter.html.ts`

Similar requirements.

**Acceptance:** Generated HTML is valid; renders correctly.

---

#### Task 4.3: PDFExportService
**File:** `src/server/services/pdf-export.service.ts`

```typescript
async exportToPDF(
  artifact: Artifact,
  template: 'resume' | 'cover_letter'
): Promise<Buffer> {
  // 1. Select template
  const htmlTemplate = template === 'resume' 
    ? generateResumeHTML(artifact.jsonContent as ResumeContent)
    : generateCoverLetterHTML(artifact.jsonContent as CoverLetterContent);
  
  // 2. Convert HTML → PDF using pdfkit or headless browser
  // 3. Return PDF bytes
  
  // Fallback: if fails, return artifact.renderedText as error
}
```

**Acceptance:** Generates valid PDF; falls back on error; no corrupted files.

---

#### Task 4.4: PDF Export Endpoint
**File:** `src/server/routes/artifacts.ts` (add to existing)

```
POST /api/jobs/:jobId/artifacts/:artifactId/pdf
Response: application/pdf (binary)
Error: { code, message }
```

**Acceptance:** Endpoint works; returns PDF bytes; error on failure.

---

#### Task 4.5: Download Buttons (React)
**File:** `src/client/features/artifacts/ArtifactPreview.tsx`

Button triggers:
1. Fetch artifact via GET /artifacts/:id
2. POST to /pdf endpoint
3. Receive PDF bytes
4. Download via blob

**Acceptance:** Download works; file has correct name; opens in reader.

---

### PHASE 5: Regeneration & Version Management (2 weeks)

#### Task 5.1: Regenerate Flow
**File:** `src/client/features/artifacts/RegenerateModal.tsx`

UI shows:
- Current positioning
- Positioning options to select from
- "Regenerate" button

On regenerate:
1. Show loading state
2. POST /artifacts/generate with new positioning
3. Create V2 in database
4. Display V2 preview

**Acceptance:** Regeneration works; creates new version; V1 preserved.

---

#### Task 5.2: Version List Component
**File:** `src/client/features/artifacts/VersionList.tsx`

Displays:
- All versions (V1, V2, V3)
- Creation date
- Positioning angle
- "Preferred" badge
- Mark as preferred action
- Archive action

**Acceptance:** Lists all versions; can mark preferred; can archive.

---

#### Task 5.3: Stale Artifact Warning
**File:** `src/client/features/artifacts/StaleArtifactWarning.tsx`

If career document updated after artifact created:
- Show: "Your profile has been updated since this was generated. Regenerate?"

Logic:
- Compare artifact.careerDocVersionId with current career version
- Show warning if different

**Acceptance:** Warning shows when stale; doesn't show when current.

---

### PHASE 6: Polish & E2E Tests (2 weeks)

#### Task 6.1: Loading States
**File:** `src/client/features/artifacts/GeneratingState.tsx`

Show during generation:
- Spinner
- "Analyzing your profile..."
- "Crafting tailored content..."
- Cancel button

**Acceptance:** Shows during generate; hides on complete.

---

#### Task 6.2: Empty State
**File:** `src/client/features/artifacts/EmptyArtifactState.tsx`

When no artifacts yet:
- Icon
- "No resume generated yet"
- "Generate one in seconds"
- Benefits list

**Acceptance:** Shows when list is empty; gone when artifacts exist.

---

#### Task 6.3: Error States
**File:** `src/client/features/artifacts/ArtifactError.tsx`

When generation fails:
- Error icon
- Error message
- "Retry" button
- Error code (for debugging)

**Acceptance:** Shows on error; retry works.

---

#### Task 6.4: E2E Tests
**File:** `e2e/artifacts.spec.ts`

Test:
1. User opens job detail
2. Clicks "Generate Resume"
3. Sees preview modal
4. Downloads PDF
5. Regenerates with different positioning
6. Sees V1 and V2 in list
7. Marks V2 as preferred
8. Generates cover letter
9. Compares versions

**Acceptance:** All flows work end-to-end.

---

## 5. File Map

### Backend Files (New)

```
src/server/
├── db/
│   ├── migrations/
│   │   └── 001_create_job_artifacts.ts
│
├── services/
│   ├── artifact.service.ts
│   ├── resume-generator.service.ts
│   ├── cover-letter-generator.service.ts
│   ├── prompt-builder.service.ts
│   ├── pdf-export.service.ts
│   └── validation/
│       └── source-consistency.validator.ts
│   └── __tests__/
│       ├── artifact.service.test.ts
│       └── resume-generator.integration.test.ts
│
├── routes/
│   └── artifacts.ts (new file, or add to existing routes)
│
├── templates/
│   ├── resume.html.ts
│   └── cover-letter.html.ts
│
├── validation/
│   └── schemas/
│       └── artifact.schema.ts
```

### Frontend Files (New)

```
src/client/
├── features/
│   └── artifacts/
│       ├── useArtifacts.ts
│       ├── ResumePreviewModal.tsx
│       ├── CoverLetterPreviewModal.tsx
│       ├── RegenerateModal.tsx
│       ├── VersionList.tsx
│       ├── ArtifactPreview.tsx
│       ├── GeneratingState.tsx
│       ├── EmptyArtifactState.tsx
│       ├── ArtifactError.tsx
│       ├── StaleArtifactWarning.tsx
│       └── __tests__/
│           └── artifacts.integration.test.ts
│
├── shared/
│   └── types.ts (append artifact types)
```

### E2E Tests

```
e2e/
└── artifacts.spec.ts
```

---

## 6. Database Migration Plan

**Migration 1: Create job_artifacts Table**

```bash
npm run migrate -- 001_create_job_artifacts
```

Script:
1. Create table (SQL above)
2. Create indexes
3. Verify table structure

**Rollback:**
```sql
DROP TABLE IF EXISTS job_artifacts;
```

**Verification:**
- `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='job_artifacts'` → 1
- Check indexes exist

---

## 7. API Contract Summary

### Resume Generation
```
POST /api/jobs/:jobId/artifacts/generate
Content-Type: application/json

{
  "artifactType": "resume",
  "positioning": "Senior Product Designer, SaaS Expert"  // optional
}

Success (200):
{
  "status": 200,
  "data": {
    "artifactId": "artifact-123",
    "jobId": "job-001",
    "artifactType": "resume",
    "version": 1,
    "positioning": "Senior Product Designer, SaaS Expert",
    "status": "ready",
    "preview": "John Doe\n\nProfessional Summary...",
    "createdAt": "2026-06-14T18:00:00Z"
  }
}

Error (400 - Validation):
{
  "status": 400,
  "error": {
    "code": "INVALID_CAREER_PROFILE",
    "message": "Career profile missing: experience, skills"
  }
}

Error (500 - Generation Failed):
{
  "status": 500,
  "error": {
    "code": "GENERATION_FAILED",
    "message": "Failed to generate resume after retries"
  }
}
```

### List Artifacts
```
GET /api/jobs/:jobId/artifacts?type=resume&limit=50&sort=created_at:desc

Success (200):
{
  "status": 200,
  "data": {
    "jobId": "job-001",
    "artifacts": [
      {
        "artifactId": "artifact-002",
        "artifactType": "resume",
        "version": 2,
        "positioning": "Design Systems Leader",
        "status": "ready",
        "isPreferred": true,
        "createdAt": "2026-06-14T18:15:00Z"
      },
      {
        "artifactId": "artifact-001",
        "artifactType": "resume",
        "version": 1,
        "positioning": "Senior Designer",
        "status": "ready",
        "isPreferred": false,
        "createdAt": "2026-06-14T18:00:00Z"
      }
    ]
  }
}
```

### Get Single Artifact
```
GET /api/jobs/:jobId/artifacts/:artifactId

Success (200):
{
  "status": 200,
  "data": {
    "artifactId": "artifact-001",
    "jobId": "job-001",
    "artifactType": "resume",
    "version": 1,
    "positioning": "Senior Designer",
    "status": "ready",
    "renderedText": "John Doe\n\nSummary...",
    "jsonContent": { ... },
    "careerDocVersionId": "career-v5",
    "promptVersion": 1,
    "model": "claude-sonnet-4-20250514",
    "createdAt": "2026-06-14T18:00:00Z"
  }
}
```

### Update Artifact (Preferred/Archive)
```
PATCH /api/jobs/:jobId/artifacts/:artifactId
Content-Type: application/json

{
  "isPreferred": true
}
or
{
  "status": "archived"
}

Success (200):
{
  "status": 200,
  "data": { ...updated artifact... }
}
```

### Export PDF
```
POST /api/jobs/:jobId/artifacts/:artifactId/pdf
Content-Type: application/json

{
  "filename": "John_Doe_Resume.pdf"  // optional
}

Success (200):
Content-Type: application/pdf
Content-Disposition: attachment; filename="John_Doe_Resume.pdf"

[PDF bytes]

Error (500):
{
  "status": 500,
  "error": {
    "code": "PDF_GENERATION_FAILED",
    "message": "Failed to generate PDF. Please try again."
  }
}
```

---

## 8. Test Strategy

### Unit Tests (Per Phase)

**Phase 1:**
- ArtifactService: create, getById, listByJob, setPreferred, archive
- Schema validation: valid/invalid resume/cover letter JSON
- Version auto-increment logic

**Phase 2:**
- PromptBuilderService: prompt templating, no hallucination instructions
- ResumeGeneratorService: full flow (prompt → Claude → validate → persist)
- Source-consistency validation: catches hallucinations

**Phase 3:**
- CoverLetterGeneratorService: full flow

**Phase 4:**
- HTML template generation: valid HTML, ATS-safe layout
- PDFExportService: HTML → PDF conversion

**Phase 5:**
- Regeneration flow: new version created, old preserved
- Preferred marking: only one preferred per type

### Integration Tests

**Phase 2:**
- Full generation flow: POST generate → artifact created → retrievable
- Error handling: invalid prompt doesn't persist
- Validation catches hallucination: regenerate on error

**Phase 4:**
- Full export flow: POST pdf → PDF bytes returned
- Fallback on failure: returns rendered_text alternative

### E2E Tests

**Phase 6:**
- User flow: generate resume → preview → download
- Regenerate flow: generate V1 → regenerate → V2 created → compare
- Full workflow: generate resume + cover letter → prefer V2 → mark preferred → archive V1

### Regression Tests

**Prompt stability:**
- Same career + job → similar output structure (not identical, but valid)
- No suddenly missing fields in response

**Hallucination patterns:**
- Companies in resume exist in profile
- Skills in resume exist in profile
- No obviously invented metrics

---

## 9. Error Handling Plan

### Generation Errors

| Error | Cause | Handling | User Message |
|-------|-------|----------|--------------|
| INVALID_CAREER_PROFILE | Missing experience/skills | Return 400 | "Career profile incomplete. Fill in experience, skills." |
| CLAUDE_TIMEOUT | API timeout | Retry 3x with backoff | "Generation took too long. Retry?" |
| CLAUDE_ERROR | API error (non-timeout) | Return 500 | "Failed to generate. Try again." |
| JSON_SCHEMA_MISMATCH | Claude response doesn't match schema | Retry once, then error | "Generation output invalid. Retry?" |
| HALLUCINATION_DETECTED | Hallucination validation failed | Return 400 | "Output contains unsupported content. Try again with different positioning." |
| PDF_GENERATION_FAILED | PDF generation failed | Return 500 | "PDF export failed. Download text instead?" |

### Retry Strategy

```typescript
async generateWithRetry(
  prompt: string,
  maxRetries: number = 3
): Promise<ValidatedContent> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await callClaude(prompt, { timeout: 30000 });
      const validated = validate(response);
      return validated;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await sleep(delay);
    }
  }
}
```

### Logging

**What to log:**
- Generation started (job_id, artifact_type)
- Generation completed (job_id, artifact_type, latency_ms, version)
- Generation failed (job_id, error_code, error_type, attempt_number)

**What NOT to log:**
- Full artifact content
- Claude API response
- Career profile content

---

## 10. Rollback Plan

### Per-Phase Rollback

**Phase 1 (Data Model):**
- Rollback: Drop job_artifacts table
- No data loss (no data yet)
- Command: `npm run migrate -- rollback 001`

**Phase 2 (Resume Generation):**
- Rollback: Disable artifact generation endpoint (feature flag)
- Keep existing artifacts (read-only)
- Command: Feature flag `RESUME_GENERATION_ENABLED=false`

**Phase 3 (Cover Letter Generation):**
- Rollback: Disable cover letter endpoint
- Resume generation still works
- Command: Feature flag `COVER_LETTER_GENERATION_ENABLED=false`

**Phase 4 (PDF Export):**
- Rollback: Disable PDF export endpoint
- Fallback: Download as text
- Command: Feature flag `PDF_EXPORT_ENABLED=false`

**Phase 5 (Regeneration):**
- Rollback: Hide regenerate button in UI
- Existing artifacts still viewable
- Command: Feature flag `ARTIFACT_REGENERATION_ENABLED=false`

**Phase 6 (Polish):**
- Rollback: Hide comparison UI
- All artifacts still functional
- Command: Feature flag `ARTIFACT_COMPARISON_ENABLED=false`

### Full Rollback (Production Emergency)

If critical bug discovered:
1. Disable all artifact endpoints (set all feature flags to false)
2. Hide UI (remove artifact components)
3. Investigate root cause
4. Deploy fix in new version
5. Re-enable with testing

---

## 11. Risk Checklist

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Claude API rate limit | Medium | Queue requests (max 5 concurrent); return 429 if over |
| Hallucination in resume | High | Source-consistency validation + user preview required |
| JSON parsing failure | Medium | Zod validation before persistence; never persist invalid |
| PDF generation slow | Low | Template-based approach; test on real data |
| User loses old version | Low | Never overwrite; keep full version history |
| Career profile changes after artifact created | Low | Stale artifact warning; user can regenerate |
| Concurrent regenerations | Low | Artifact service handles: each creates new version |
| Database grows huge | Low | Archive → soft delete; permanent delete after 1 year |
| Prompt improvements needed | Medium | Prompt versioning; can regenerate with new prompt |
| Feature flag misconfiguration | Medium | Gradual rollout; 10% first, measure, then 100% |

---

## 12. Acceptance Criteria by Phase

### Phase 1: Artifact Infrastructure

**Must Have:**
- ✅ job_artifacts table created with correct schema
- ✅ Version auto-increment works correctly
- ✅ Zod validation works for valid/invalid JSON
- ✅ ArtifactService CRUD operations work
- ✅ Unit tests pass (90%+ coverage)
- ✅ Basic routes functional (list, get, update)

**Must NOT Have:**
- ❌ Claude integration
- ❌ Resume generation
- ❌ UI changes

**Success Metrics:**
- 100% tests passing
- 0 runtime errors on artifact operations
- Version auto-increment correct for 100 test insertions

---

### Phase 2: Resume Generation

**Must Have:**
- ✅ PromptBuilderService generates valid prompts
- ✅ ResumeGeneratorService full pipeline works
- ✅ Claude integration working (retry logic, timeout)
- ✅ Source-consistency validation catches obvious hallucinations
- ✅ POST /artifacts/generate endpoint works
- ✅ Resume preview modal displays correctly
- ✅ Integration tests pass
- ✅ Median latency < 15 seconds
- ✅ 95%+ generation success rate

**Must NOT Have:**
- ❌ Broken artifacts persisted
- ❌ Failed generations in database

**Success Metrics:**
- 100 test generations → 95+ succeed
- 0 hallucinations persisted
- Avg latency < 12 seconds
- Preview modal loads artifact correctly

---

### Phase 3: Cover Letter Generation

**Must Have:**
- ✅ CoverLetterGeneratorService works
- ✅ Cover letter schema validation
- ✅ POST /artifacts/generate with cover_letter type
- ✅ Cover letter preview modal
- ✅ Tests pass

**Must NOT Have:**
- ❌ Resume generation affected

**Success Metrics:**
- Cover letters generate successfully
- 95%+ success rate
- < 15s latency

---

### Phase 4: PDF Export

**Must Have:**
- ✅ HTML templates generate valid markup
- ✅ PDFExportService creates PDF from HTML
- ✅ POST /pdf endpoint returns PDF bytes
- ✅ Download buttons work
- ✅ Fallback to text on PDF failure
- ✅ ATS validation (run through ATS validator service)

**Must NOT Have:**
- ❌ Graphics, colors, special fonts in PDF
- ❌ Broken PDFs

**Success Metrics:**
- 100 generated PDFs open in reader
- ATS parser can read 99% of PDFs
- Avg PDF size < 100KB

---

### Phase 5: Regeneration & Versions

**Must Have:**
- ✅ Regenerate button works
- ✅ V2 created, V1 preserved
- ✅ Mark as preferred works
- ✅ Version list shows all versions
- ✅ Stale artifact warning works
- ✅ Archive works

**Must NOT Have:**
- ❌ Overwritten old versions
- ❌ Lost artifacts

**Success Metrics:**
- 5 regenerations → 5 versions in database
- Mark preferred → only one marked per type
- Archive → artifact hidden from list

---

### Phase 6: Polish & E2E

**Must Have:**
- ✅ Loading states show
- ✅ Error states show with retry
- ✅ Empty state shows when no artifacts
- ✅ E2E tests pass
- ✅ Feature flags working
- ✅ Rollout plan documented

**Must NOT Have:**
- ❌ UI crashes
- ❌ Broken flows

**Success Metrics:**
- 100 E2E test runs → 100 pass
- User can complete full flow: generate + preview + download + regenerate + compare
- Feature flag disables features cleanly

---

## 13. Team Allocation

| Role | Tasks | Duration | Notes |
|------|-------|----------|-------|
| Backend Senior | 1.1, 1.3, 2.1, 2.2, 2.3, 3.1, 4.3, all services | Weeks 1-7 | Leads architecture |
| Frontend Senior | 1.6, 1.7, 2.5, 3.2, 4.5, 5.1-5.3, 6.1-6.3 | Weeks 2-9 | Leads UI |
| QA/Testing | 1.5, 1.8, 2.6, 3.3, 4.4, 6.4 | Weeks 1-11 | Continuous testing |

---

## 14. Success Definition

**Feature is production-ready when:**

✅ Phase 1: Artifact infrastructure stable (0 data loss, correct versioning)  
✅ Phase 2: Resume generation 95%+ success, < 15s latency  
✅ Phase 3: Cover letter generation same metrics  
✅ Phase 4: PDF export 99% success  
✅ Phase 5: Version management solid (no overwrites, all old versions intact)  
✅ Phase 6: E2E tests 100% passing, feature flags working  

**Users can:**
- Generate resume in < 15 seconds
- Preview before download (required)
- Regenerate with different positioning
- See full version history
- Download PDF
- Copy to clipboard

**System ensures:**
- No hallucinations persisted (validation + user review)
- No data loss (versioning, soft deletes)
- Auditability (every artifact tied to career version, prompt version, model)
- Gradual rollout (feature flags, 10% → 100%)

---

## 15. Implementation Checklist

### Pre-Implementation
- [ ] All tasks estimated and scheduled
- [ ] Team aligned on API contracts
- [ ] Database migration script reviewed
- [ ] Feature flags created in config
- [ ] Logging infrastructure ready

### Phase 1
- [ ] Migration runs successfully
- [ ] ArtifactService fully tested
- [ ] Routes return correct responses
- [ ] Types match frontend expectations

### Phase 2
- [ ] PromptBuilderService generates valid prompts
- [ ] ResumeGeneratorService end-to-end works
- [ ] 100 test generations → 95+ success
- [ ] 0 hallucinations in 100 samples
- [ ] Latency < 15s avg
- [ ] Preview modal displays correctly

### Phase 3
- [ ] CoverLetterGeneratorService works
- [ ] Same success metrics as resume

### Phase 4
- [ ] HTML templates valid and ATS-safe
- [ ] PDF generation 99%+ success
- [ ] Download buttons work

### Phase 5
- [ ] Regeneration creates new versions
- [ ] Version list complete
- [ ] Preferred marking works
- [ ] Stale warning works

### Phase 6
- [ ] All UI states working (loading, error, empty)
- [ ] E2E tests 100% pass
- [ ] Feature flags control features
- [ ] Rollback documented

### Pre-Launch
- [ ] Code review completed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Feature flags ready
- [ ] Monitoring set up
- [ ] Rollback procedure tested

---

## Final Approval Gate

**This plan is ready for implementation when:**

1. ✅ Product Manager approves scope
2. ✅ Backend lead approves technical approach
3. ✅ Frontend lead approves component architecture
4. ✅ QA approves test strategy
5. ✅ All team members confirm capacity

---

**Shall we proceed with implementation?** (Requires approval from all stakeholders)
