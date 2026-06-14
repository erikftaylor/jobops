# Phase 1 Kickoff: Vertical Slice Implementation Guide

**Objective:** Build one complete end-to-end path that exercises the entire artifact system architecture.

**Duration:** 1 week (5 working days)

**Team:** 1 Backend Engineer + 1 Frontend Engineer + QA (concurrent)

**Success Criterion:** User can generate → preview → copy → download resume, and see it persisted after page refresh.

---

## 1. Pre-Implementation Checklist

Before starting, verify:

- [ ] All documentation read (ADR-005, IP-001, SPEC-001, SPEC-002)
- [ ] Project environment set up (Node.js, npm, SQLite, TypeScript)
- [ ] Anthropic API key available and working
- [ ] Figma design tokens documented
- [ ] Playwright/E2E testing environment ready

---

## 2. Day 1: Database + Backend Foundation

### 2.1 Database Migration (30 min)

**File:** `src/server/db/migrations/001_create_job_artifacts.ts`

```typescript
import Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE job_artifacts (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      artifact_type TEXT NOT NULL,
      version INTEGER NOT NULL,
      positioning TEXT,
      title TEXT,
      career_doc_version_id TEXT NOT NULL,
      prompt_version INTEGER NOT NULL,
      model TEXT NOT NULL,
      json_content TEXT NOT NULL,
      rendered_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ready',
      is_preferred BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(job_id, artifact_type, version),
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_job_artifacts_job_id ON job_artifacts(job_id);
    CREATE INDEX idx_job_artifacts_type_version ON job_artifacts(artifact_type, version);
    CREATE INDEX idx_job_artifacts_created_at ON job_artifacts(created_at DESC);
  `);
}

export function down(db: Database.Database): void {
  db.exec(`DROP TABLE IF EXISTS job_artifacts;`);
}
```

**Verification:**
```bash
npm run migrate -- 001_create_job_artifacts
sqlite3 data/jobops.db ".schema job_artifacts"
```

---

### 2.2 Zod Schemas (45 min)

**File:** `src/server/validation/schemas/artifact.schema.ts`

```typescript
import { z } from 'zod';

export const ArtifactTypeSchema = z.enum(['resume', 'cover_letter', 'fit_analysis']);
export const ArtifactStatusSchema = z.enum(['draft', 'ready', 'error', 'archived']);

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

export const ArtifactSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string(),
  artifactType: ArtifactTypeSchema,
  version: z.number().int().positive(),
  positioning: z.string().optional(),
  title: z.string().optional(),
  careerDocVersionId: z.string(),
  promptVersion: z.number().int().positive(),
  model: z.string(),
  jsonContent: ResumeContentSchema,
  renderedText: z.string(),
  status: ArtifactStatusSchema,
  isPreferred: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Artifact = z.infer<typeof ArtifactSchema>;
export type ResumeContent = z.infer<typeof ResumeContentSchema>;
```

**Testing:**
```typescript
// src/server/validation/schemas/__tests__/artifact.schema.test.ts
describe('ArtifactSchema', () => {
  it('should validate a valid resume artifact', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      jobId: 'job-1',
      artifactType: 'resume',
      version: 1,
      careerDocVersionId: 'cv-1',
      promptVersion: 1,
      model: 'claude-sonnet-4-20250514',
      jsonContent: {
        analysis: { positioning: 'Senior Designer', /* ... */ },
        resume: { professionalSummary: '...', /* ... */ },
      },
      renderedText: 'John Doe...',
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(ArtifactSchema.parse(valid)).toBeDefined();
  });

  it('should reject invalid json_content', () => {
    expect(() => ArtifactSchema.parse({ /* invalid */ })).toThrow();
  });
});
```

---

### 2.3 ArtifactService (60 min)

**File:** `src/server/services/artifact.service.ts`

Key methods:
```typescript
export class ArtifactService {
  constructor(private db: Database) {}

  create(input: CreateArtifactInput): Artifact {
    // 1. Get next version for job + type
    // 2. Validate JSON with ResumeContentSchema
    // 3. Serialize JSON to TEXT
    // 4. Insert into DB
    // 5. Return artifact
  }

  getById(id: string): Artifact | null {
    // 1. Query DB
    // 2. Map DB row to Artifact type
    // 3. Return or null
  }

  listByJob(jobId: string, type?: string): Artifact[] {
    // 1. Query DB with optional type filter
    // 2. Order by created_at DESC
    // 3. Map to Artifact[]
  }
}
```

**Testing:** Unit tests for version auto-increment, JSON serialization, DB operations.

---

### 2.4 PromptBuilderService (45 min)

**File:** `src/server/services/prompt-builder.service.ts`

Simple version for vertical slice:
```typescript
export class PromptBuilderService {
  buildResumePrompt(
    careerProfile: CareerModel,
    jobDescription: string,
    fitAnalysis: FitAnalysisResult
  ): string {
    const careerText = careerModelToText(careerProfile, {
      includeEducation: true,
      useCompanyFormat: true,
    });

    return `You are a resume writer. Generate a resume for:

CANDIDATE: ${careerProfile.fullName}
CAREER PROFILE:
${careerText}

TARGET JOB: [Job Title]
${jobDescription}

POSITIONING: ${fitAnalysis.positioning}

RULES:
1. NEVER hallucinate. Use only information from the career profile.
2. Never invent: employers, titles, dates, metrics, certifications.
3. Output valid JSON matching this schema:
{
  "analysis": {
    "positioning": "string",
    "highPriorityKeywords": ["string"],
    "strengthsToHighlight": ["string"]
  },
  "resume": {
    "professionalSummary": "string",
    "coreSkills": ["string"],
    "experience": [...],
    "education": [...]
  }
}`;
  }
}
```

---

### 2.5 ResumeGeneratorService (60 min)

**File:** `src/server/services/resume-generator.service.ts`

```typescript
export class ResumeGeneratorService {
  constructor(
    private claudeService: ClaudeService,
    private promptBuilder: PromptBuilderService,
    private artifactService: ArtifactService
  ) {}

  async generateResume(
    jobId: string,
    careerProfile: CareerModel,
    jobDescription: string,
    fitAnalysis: FitAnalysisResult
  ): Promise<Artifact> {
    // 1. Build prompt
    const prompt = this.promptBuilder.buildResumePrompt(
      careerProfile,
      jobDescription,
      fitAnalysis
    );

    // 2. Call Claude with retry (3x)
    let lastError: Error;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await this.claudeService.generate(prompt, {
          timeout: 30000,
        });

        // 3. Validate JSON response
        const validated = ResumeContentSchema.parse(
          JSON.parse(response)
        );

        // 4. Source-consistency validation
        this.validateSourceConsistency(validated, careerProfile);

        // 5. Convert to rendered text
        const renderedText = this.toRenderedText(validated.resume);

        // 6. Persist artifact
        const artifact = this.artifactService.create({
          jobId,
          artifactType: 'resume',
          careerDocVersionId: careerProfile.metadata.hash,
          promptVersion: 1,
          model: 'claude-sonnet-4-20250514',
          jsonContent: validated,
          renderedText,
          status: 'ready',
          positioning: validated.analysis.positioning,
        });

        return artifact;
      } catch (error) {
        lastError = error as Error;
        if (attempt < 3) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  private validateSourceConsistency(
    content: ResumeContent,
    careerProfile: CareerModel
  ): void {
    const careerText = careerModelToText(careerProfile);

    // Check companies
    for (const role of content.resume.experience) {
      if (!careerText.includes(role.company)) {
        throw new Error(`Hallucinated company: ${role.company}`);
      }
    }

    // Check skills
    const profileSkills = new Set(
      careerProfile.sections.skills.map(s => s.toLowerCase())
    );
    for (const skill of content.resume.coreSkills) {
      if (!profileSkills.has(skill.toLowerCase())) {
        throw new Error(`Hallucinated skill: ${skill}`);
      }
    }
  }

  private toRenderedText(resume: ResumeContent['resume']): string {
    let text = '';
    text += resume.professionalSummary + '\n\n';
    text += 'SKILLS\n';
    resume.coreSkills.forEach(s => (text += `• ${s}\n`));
    text += '\nEXPERIENCE\n';
    resume.experience.forEach(e => {
      text += `${e.title} at ${e.company}\n`;
      if (e.description) text += e.description + '\n';
      e.bullets?.forEach(b => (text += `• ${b}\n`));
    });
    return text;
  }
}
```

---

### 2.6 Resume Generation Endpoint (45 min)

**File:** `src/server/routes/artifacts.ts`

```typescript
export function createArtifactRoutes(db: Database) {
  const router = Router();
  const artifactService = new ArtifactService(db);
  const resumeGenerator = new ResumeGeneratorService(
    claudeService,
    promptBuilder,
    artifactService
  );

  /**
   * POST /api/jobs/:jobId/artifacts/generate
   */
  router.post('/:jobId/artifacts/generate', async (req, res) => {
    try {
      const { jobId } = req.params;
      const { artifactType, positioning } = req.body;

      if (artifactType !== 'resume') {
        return res.status(400).json({
          status: 400,
          error: { code: 'UNSUPPORTED_TYPE', message: 'Only resume supported in Phase 1' },
        });
      }

      // Get job
      const job = jobService.getById(jobId);
      if (!job) return res.status(404).json({ status: 404, error: { code: 'JOB_NOT_FOUND' } });

      // Get career profile
      const careerProfile = careerDocService.getLatest();
      if (!careerProfile || !careerProfile.sections.experience?.length) {
        return res.status(400).json({
          status: 400,
          error: { code: 'INVALID_PROFILE', message: 'Career profile incomplete' },
        });
      }

      // Get fit analysis
      const fitAnalysis = fitAnalyzerService.analyze(careerProfile, job.description);

      // Generate resume
      const artifact = await resumeGenerator.generateResume(
        jobId,
        careerProfile,
        job.description,
        fitAnalysis
      );

      res.json({
        status: 200,
        data: {
          artifactId: artifact.id,
          jobId: artifact.jobId,
          artifactType: artifact.artifactType,
          version: artifact.version,
          preview: artifact.renderedText.substring(0, 200) + '...',
          status: artifact.status,
          createdAt: artifact.createdAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        status: 500,
        error: {
          code: 'GENERATION_FAILED',
          message: error.message,
        },
      });
    }
  });

  /**
   * GET /api/jobs/:jobId/artifacts/:artifactId
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
      res.status(500).json({ status: 500, error: { code: 'GET_FAILED' } });
    }
  });

  return router;
}
```

---

### 2.7 PDF Export Endpoint (30 min)

**File:** `src/server/routes/artifacts.ts` (add to existing)

```typescript
router.post('/:jobId/artifacts/:artifactId/pdf', async (req, res) => {
  try {
    const { artifactId } = req.params;
    const artifact = artifactService.getById(artifactId);
    if (!artifact) {
      return res.status(404).json({ status: 404, error: { code: 'NOT_FOUND' } });
    }

    // Simple PDF generation: rendered_text → PDF
    const pdfBytes = await generatePDF(artifact.renderedText, {
      title: `Resume_${artifact.version}.pdf`,
      author: 'JobOps',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resume_v${artifact.version}.pdf"`);
    res.send(pdfBytes);
  } catch (error: any) {
    res.status(500).json({
      status: 500,
      error: { code: 'PDF_GENERATION_FAILED', message: error.message },
    });
  }
});

async function generatePDF(text: string, options: any): Promise<Buffer> {
  // Use pdfkit or simple HTML-to-PDF library
  // For Phase 1, simplicity over perfection
  const pdf = new PDFDocument();
  const stream = pdf.pipe(new streams.PassThrough());

  pdf.fontSize(16).text('Resume');
  pdf.fontSize(11).text(text);
  pdf.end();

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
```

**Testing:** Unit test for PDF generation (verify non-empty Buffer returned).

---

## 3. Day 2: Frontend UI

### 3.1 Update TypeScript Types (30 min)

**File:** `src/shared/types.ts` (append)

```typescript
export type ArtifactType = 'resume' | 'cover_letter';
export type ArtifactStatus = 'draft' | 'ready' | 'error' | 'archived';

export interface Artifact {
  id: string;
  jobId: string;
  artifactType: ArtifactType;
  version: number;
  positioning?: string;
  careerDocVersionId: string;
  promptVersion: number;
  model: string;
  jsonContent: ResumeContent;
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
```

---

### 3.2 useArtifacts Hook (45 min)

**File:** `src/client/features/artifacts/useArtifacts.ts`

```typescript
export function useArtifacts(jobId: string) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<Artifact | null>(null);

  const generateResume = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/jobs/${jobId}/artifacts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactType: 'resume' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error.message);
      }

      const data = await response.json();
      setArtifact(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [jobId]);

  const getArtifact = useCallback(
    async (artifactId: string) => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/artifacts/${artifactId}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setArtifact(data.data);
        return data.data as Artifact;
      } catch (err: any) {
        setError(err.message);
        return null;
      }
    },
    [jobId]
  );

  const downloadPDF = useCallback(
    async (artifactId: string) => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/artifacts/${artifactId}/pdf`, {
          method: 'POST',
        });
        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resume_v${artifact?.version || 1}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [jobId, artifact?.version]
  );

  return { artifact, isGenerating, error, generateResume, getArtifact, downloadPDF };
}
```

---

### 3.3 Generate Button (30 min)

**File:** `src/client/features/artifacts/GenerateButton.tsx`

```typescript
interface GenerateButtonProps {
  jobId: string;
  onArtifactCreated: (artifact: Artifact) => void;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({
  jobId,
  onArtifactCreated,
}) => {
  const { isGenerating, error, generateResume, artifact } = useArtifacts(jobId);

  useEffect(() => {
    if (artifact) {
      onArtifactCreated(artifact);
    }
  }, [artifact, onArtifactCreated]);

  return (
    <div>
      <button
        onClick={generateResume}
        disabled={isGenerating}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {isGenerating ? 'Generating...' : 'Generate Tailored Resume'}
      </button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
};
```

---

### 3.4 Resume Preview Modal (45 min)

**File:** `src/client/features/artifacts/ResumePreviewModal.tsx`

```typescript
interface ResumePreviewModalProps {
  isOpen: boolean;
  artifact: Artifact;
  onClose: () => void;
  onCopy: (text: string) => void;
  onDownload: (artifactId: string) => void;
}

export const ResumePreviewModal: React.FC<ResumePreviewModalProps> = ({
  isOpen,
  artifact,
  onClose,
  onCopy,
  onDownload,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-semibold">Resume Preview</h2>
          <button onClick={onClose} className="text-gray-500 text-2xl">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="whitespace-pre-wrap text-sm font-mono">
            {artifact.renderedText}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={() => {
              navigator.clipboard.writeText(artifact.renderedText);
              onCopy(artifact.renderedText);
            }}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Copy
          </button>
          <button
            onClick={() => onDownload(artifact.id)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Download PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### 3.5 Version Badge (15 min)

**File:** `src/client/features/artifacts/VersionBadge.tsx`

```typescript
interface VersionBadgeProps {
  version: number;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({ version }) => {
  return (
    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
      V{version}
    </span>
  );
};
```

---

### 3.6 Job Detail Page Integration (60 min)

**File:** `src/client/pages/JobDetail.tsx` (update existing)

```typescript
export const JobDetail: React.FC<{ jobId: string }> = ({ jobId }) => {
  const job = useJob(jobId);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { downloadPDF } = useArtifacts(jobId);

  useEffect(() => {
    // On mount, try to fetch existing artifact
    const fetchExistingArtifact = async () => {
      // Try to get latest resume version
      const response = await fetch(`/api/jobs/${jobId}/artifacts?type=resume&limit=1`);
      const data = await response.json();
      if (data.data?.artifacts?.length > 0) {
        setArtifact(data.data.artifacts[0]);
      }
    };
    fetchExistingArtifact();
  }, [jobId]);

  if (!job) return <div>Loading job...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">{job.title}</h1>
      <p className="text-gray-600 mb-6">{job.company}</p>

      <GenerateButton jobId={jobId} onArtifactCreated={setArtifact} />

      {artifact && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold">Resume Generated</h3>
              <VersionBadge version={artifact.version} />
            </div>
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Preview
            </button>
          </div>
        </div>
      )}

      <ResumePreviewModal
        isOpen={showPreview}
        artifact={artifact!}
        onClose={() => setShowPreview(false)}
        onCopy={() => {
          // Show toast: "Copied!"
        }}
        onDownload={downloadPDF}
      />
    </div>
  );
};
```

---

## 4. Day 3: Testing

### 4.1 Backend Unit Tests (120 min)

**ArtifactService tests:**
```typescript
// Version auto-increment works
// JSON validation rejects invalid
// DB insert/select operations
```

**ResumeGeneratorService tests:**
```typescript
// Claude call with retry (mock Claude)
// Source-consistency validation catches hallucinations
// Rendered text generation
```

**PromptBuilderService tests:**
```typescript
// Prompt includes all required sections
// Never hallucinate instruction present
```

---

### 4.2 Frontend Unit Tests (60 min)

```typescript
// GenerateButton renders and handles click
// useArtifacts hook works
// ResumePreviewModal displays artifact
// Copy and download buttons wired correctly
```

---

### 4.3 Integration Test (90 min)

**File:** `e2e/vertical-slice.spec.ts`

```typescript
test('complete flow: generate -> preview -> copy -> download', async ({
  page,
}) => {
  // 1. Navigate to job detail
  await page.goto('/jobs/job-123');

  // 2. Click generate
  await page.click('button:has-text("Generate Tailored Resume")');

  // 3. Wait for generation
  await page.waitForText('Resume Generated');

  // 4. Click preview
  await page.click('button:has-text("Preview")');

  // 5. Verify modal shows resume
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();
  const resumeText = await modal.textContent();
  expect(resumeText).toContain('Professional Summary');

  // 6. Click copy
  await page.click('button:has-text("Copy")');

  // 7. Verify clipboard has content
  const clipboardText = await page.evaluate(() =>
    navigator.clipboard.readText()
  );
  expect(clipboardText).toContain('Professional Summary');

  // 8. Click download
  await page.click('button:has-text("Download PDF")');

  // 9. Verify PDF download triggered
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Download PDF")');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/resume_v\d+\.pdf/);

  // 10. Close modal
  await page.click('button:has-text("Close")');

  // 11. Refresh page
  await page.reload();

  // 12. Verify artifact still visible
  await expect(page.locator('text=Resume Generated')).toBeVisible();
});
```

---

## 5. Days 4-5: Polish & Validation

### 5.1 Day 4 (240 min)

- **Integration testing** (real Claude API, real database)
- **Error scenario testing** (invalid profile, API timeout, malformed response)
- **Code review** (follow SPEC-002 component contract)
- **TypeScript check** (strict mode, no `any`)
- **Build verification** (npm run build succeeds)

### 5.2 Day 5 (240 min)

- **Manual QA** (demo checklist below)
- **Architecture review** (identify assumptions)
- **Document learnings** (what changed?)
- **Prepare Phase 2 recommendation**

---

## 6. Vertical Slice Demo Checklist

Before declaring Phase 1 complete, verify every click:

### Setup
- [ ] Database migrated (sqlite job_artifacts table exists)
- [ ] Environment variables set (ANTHROPIC_API_KEY, DATABASE_PATH)
- [ ] npm run build succeeds (no TypeScript errors)
- [ ] All tests pass (npm test)

### User Flow
- [ ] Open job detail page for a job
- [ ] See "Generate Tailored Resume" button
- [ ] Click button → button shows "Generating..." spinner
- [ ] Wait 10-15 seconds for Claude response
- [ ] "Resume Generated" card appears
- [ ] Version badge shows "V1"
- [ ] "Preview" button appears

### Preview Modal
- [ ] Click "Preview" → modal opens
- [ ] Modal title: "Resume Preview"
- [ ] Resume text fully visible and scrollable
- [ ] All sections present (summary, skills, experience, education)
- [ ] Close button (✕) works

### Copy Action
- [ ] Click "Copy" button
- [ ] Toast notification shows "Copied to clipboard!"
- [ ] After 2 seconds, toast disappears
- [ ] Verify clipboard with Cmd+V in text editor

### Download Action
- [ ] Click "Download PDF" button
- [ ] PDF downloads to Downloads folder
- [ ] Filename: `resume_v1.pdf`
- [ ] PDF opens correctly in reader
- [ ] Content matches preview

### Persistence
- [ ] Refresh page (Cmd+R)
- [ ] "Resume Generated" card still visible
- [ ] V1 badge still shows
- [ ] Can click Preview again and see same content
- [ ] Can download again

### Error Handling
- [ ] Close env var ANTHROPIC_API_KEY, generate → see error "Claude API key not configured"
- [ ] Restore API key
- [ ] Run with invalid career profile → see error "Career profile incomplete"

---

## 7. Required Deliverables

After vertical slice completes, produce:

### 7.1 Architecture Review Document

**File:** `docs/phase-1-learnings/ARCHITECTURE-REVIEW.md`

Contents:
```markdown
# Phase 1 Architecture Review

## What Assumptions Proved Incorrect
- [ ] Any assumptions about Claude latency?
- [ ] Any assumptions about JSON schema validation?
- [ ] Any assumptions about database performance?
- [ ] Any assumptions about state management?

## What Changed
- [ ] Any design changes made during implementation?
- [ ] Any API changes from spec?
- [ ] Any component changes from SPEC-002?
- [ ] Any database schema changes?

## What Should Be Simplified
- [ ] Any components over-engineered?
- [ ] Any unnecessary indirection?
- [ ] Any dead code?
- [ ] Any overly complex error handling?

## Validation Summary
- [x] Complete end-to-end path works
- [x] All tests pass
- [x] Build succeeds
- [x] TypeScript strict mode passes
- [ ] Performance acceptable?
- [ ] Error messages clear to users?
```

---

### 7.2 Technical Debt List

**File:** `docs/phase-1-learnings/TECHNICAL-DEBT.md`

Categories:
```
## Intentionally Deferred

### Defer until Phase 2
- [ ] Cover letter generation
- [ ] Regeneration with different positioning
- [ ] Version comparison UI
- [ ] Artifact archiving
- [ ] Preferred version marking

### Defer until Phase 3
- [ ] Dark mode
- [ ] Animation polish
- [ ] Advanced PDF templating
- [ ] Analytics events
- [ ] Feature flags for gradual rollout

### Defer until Phase 4+
- [ ] Sharing artifacts with recruiters
- [ ] Interview preparation guides
- [ ] Multi-user collaboration
- [ ] Export to LinkedIn
```

---

### 7.3 ADR Updates

**List any architectural decisions that should change:**

```markdown
# ADR Updates from Phase 1

## ADR-005 Status: No changes needed
- Architecture validated
- Claude integration works as designed
- Zod validation effective

## Potential Future ADRs (for consideration before Phase 2)
- [ ] PDF rendering approach (simple vs. advanced templates)
- [ ] Caching strategy for artifact retrieval
- [ ] Real-time WebSocket updates for generation progress?
```

---

### 7.4 Phase 2 Recommendation

**File:** `docs/phase-1-learnings/PHASE-2-RECOMMENDATION.md`

```markdown
# Phase 2 Recommendation

## Status: [PROCEED / PAUSE / REDESIGN]

### Justification
- [x] Core architecture validated in Phase 1
- [x] Claude integration stable and performant
- [x] Database schema supports versioning requirements
- [x] Frontend component pattern works
- [ ] Any blockers found?

### Readiness for Phase 2
- Proceed with confidence to:
  - [ ] Cover letter generation (minimal new work)
  - [ ] Regeneration with positioning (new PromptBuilderService variant)
  - [ ] Version UI (VersionList, ComparisonView)

### Recommended Pace
- Phase 2: 3 weeks (resume + cover + regeneration)
- Phase 3+: Add features incrementally
```

---

## 8. Success Criteria

Phase 1 is complete when:

✅ User can generate → preview → copy → download resume  
✅ Artifact persisted in database  
✅ All tests pass (unit + integration + E2E)  
✅ npm run build succeeds  
✅ TypeScript strict mode passes  
✅ Demo checklist 100% complete  
✅ Architecture review written  
✅ Technical debt list comprehensive  
✅ Phase 2 recommendation clear  

**No Phase 2 work until Phase 1 deliverables complete.**

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Claude API timeout | 30s timeout, 3x retry with exponential backoff |
| Invalid JSON response | Zod validation, clear error to user |
| Database locked | Use transaction for atomic insert |
| PDF generation fails | Fallback to downloadable text file |
| Missing career profile | Validate before calling Claude |

---

## 10. Next Steps

1. **Day 1 morning:** Database + backend foundation ready
2. **Day 2 morning:** Frontend UI wired up
3. **Day 3 morning:** All tests written and passing
4. **Days 4-5:** Polish, manual QA, documentation
5. **EOD Friday:** Deliverables ready, Phase 2 recommendation finalized

**Phase 1 Kickoff: Ready to build.** 🚀

