# Phase 3: Complete the Application Loop

**Date:** June 14, 2026  
**Status:** IMPLEMENTATION PLAN  
**Scope:** Cover letter generation, application persistence, application history, Career Memory improvements

---

## Current Resume Flow (From Phase 2 Audit)

```
User selects job
    ↓
GenerateButton(jobId) triggered
    ↓
useArtifacts.generateResume(jobId)
    ↓
POST /api/jobs/:jobId/artifacts/generate { artifactType: "resume" }
    ↓
Backend: ResumeGeneratorService + ArtifactService
    ↓
INSERT job_artifacts { artifact_type: "resume", version: 1, ... }
    ↓
Frontend: artifact stored in component state
    ↓
Show preview/copy/download buttons
```

---

## Existing Cover Letter Support (Already Wired)

**Database:**
- ✅ `job_artifacts` table supports `artifact_type: "resume" | "cover_letter"`
- ✅ Migration 009 includes cover_letter type

**Backend Schema:**
- ✅ `ArtifactTypeSchema` = `z.enum(["resume", "cover_letter"])`
- ✅ `ResumeContentSchema` — slightly misnamed, used for all artifact types

**Backend Services:**
- ✅ `ArtifactService` — CRUD works for any artifact_type
- ✅ `PDFExportService` — works with any artifact JSON

**API Endpoints:**
- ✅ `POST /api/jobs/:jobId/artifacts/generate` — currently blocks cover_letter (lines 82-91)
- ✅ `GET /api/jobs/:jobId/artifacts` — lists all types, can filter by type
- ✅ `POST /api/jobs/:jobId/artifacts/:artifactId/pdf` — generates PDF for any artifact

**What's Blocking:**
```typescript
// job-artifacts.ts line 82-91
if (artifactType !== "resume") {
  return res.status(400).json({
    error: "Only resume generation is supported in Phase 1..."
  });
}
```

**Solution:** Remove the check, pass artifactType through to ResumeGeneratorService

---

## Existing Application Status Support

**Job Schema:**
```typescript
// shared/types.ts
interface Job {
  state: "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed"
  // Other fields...
}
```

**Missing Fields:**
- ❌ `applied_at` — timestamp of application
- ❌ `resume_artifact_id` — which resume was used
- ❌ `cover_letter_artifact_id` — which cover letter was used
- ❌ `application_source_url` — where it was applied (email, LinkedIn, etc.)
- ❌ `application_notes` — any notes about application

**Option A (Recommended for Phase 3):** Reuse existing `job.state = "applied"` without new fields
- Simpler, no migration needed
- Can add tracking in Phase 4 if needed
- Timestamp can be added to job_state history table later

**Option B:** Add tracking fields to jobs table
- Requires migration
- Better for audit trail
- Overkill for MVP

**Recommendation:** Option A for Phase 3

---

## Existing Artifact Support (Summary)

**Storage:**
- ✅ job_artifacts table fully supports resume + cover_letter
- ✅ ArtifactService queries and creates both types
- ✅ PDF export works with any artifact

**Frontend:**
- ✅ useArtifacts hook can generate (just need to accept artifactType parameter)
- ✅ ResumePreviewModal can preview any artifact (just rename it)
- ✅ Copy/download work with any artifact

**What Needs to Change:**

### Backend Changes (Minimal)
1. Remove artifactType check in job-artifacts.ts (1 change, 10 lines)
2. Create cover letter prompt if needed (reuse resume logic or create new)
3. Update artifact response validation schema

### Frontend Changes (Minimal)
1. Update useArtifacts to support generateCoverLetter() (add variant, reuse logic)
2. Update DocumentStudioPanel to call it (add button, add state)
3. Create ReusableArtifactPreviewModal (or extend existing)
4. Add "Mark Applied" persistence logic (call job update endpoint)
5. Add application history section to JobInputPanel
6. Improve CareerMemoryPanel display

---

## Required Minimal Backend Changes

### 1. Remove cover letter block (job-artifacts.ts)

**Current (lines 82-91):**
```typescript
if (artifactType !== "resume") {
  return res.status(400).json({
    status: 400,
    error: {
      code: "UNSUPPORTED_ARTIFACT_TYPE",
      message: "Only resume generation is supported in Phase 1...",
    },
  });
}
```

**Change To:**
```typescript
if (!["resume", "cover_letter"].includes(artifactType)) {
  return res.status(400).json({
    status: 400,
    error: {
      code: "UNSUPPORTED_ARTIFACT_TYPE",
      message: `Unsupported artifact type: ${artifactType}`,
    },
  });
}
```

### 2. Handle cover letter generation flow

**Current Code (lines 119-133):**
```typescript
const fitAnalysis = svc.fitAnalyzerService.analyze(careerModel, job.description);

const result = await svc.resumeGeneratorService.generateResume(
  jobId,
  careerModel,
  job.description,
  { positioning: fitAnalysis.recommendedPositioningAngle, ... }
);
```

**Change To:**
```typescript
const fitAnalysis = svc.fitAnalyzerService.analyze(careerModel, job.description);

const result = artifactType === "cover_letter"
  ? await svc.coverLetterGeneratorService.generateCoverLetter(
      jobId, careerModel, job.description, fitAnalysis
    )
  : await svc.resumeGeneratorService.generateResume(
      jobId, careerModel, job.description, { ... }
    );
```

### 3. Create CoverLetterGeneratorService (if needed)

**Option A (Simpler):** Reuse ResumeGeneratorService logic
- Same Claude API integration
- Same validation logic
- Just different prompt

**Option B (Better separation):** Create CoverLetterGeneratorService
- Clear separation of concerns
- But adds more code

**Recommendation:** Option A — extend ResumeGeneratorService or create minimal new service

---

## Required Minimal Frontend Changes

### 1. Update useArtifacts hook

**Add state:**
```typescript
const [resumeArtifact, setResumeArtifact] = useState<JobArtifact | null>(null);
const [coverLetterArtifact, setCoverLetterArtifact] = useState<JobArtifact | null>(null);
const [isGenerating, setIsGenerating] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Add methods:**
```typescript
const generateCoverLetter = useCallback(async (jobId: string) => {
  setIsGenerating(true);
  setError(null);
  try {
    const response = await fetch(`/api/jobs/${jobId}/artifacts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artifactType: "cover_letter" }),
    });
    if (!response.ok) throw new Error("Failed to generate cover letter");
    const data = await response.json();
    setCoverLetterArtifact(data.data);
  } catch (err) {
    setError((err as Error).message);
  } finally {
    setIsGenerating(false);
  }
}, []);
```

**Return:**
```typescript
return {
  resumeArtifact,
  coverLetterArtifact,
  isGenerating,
  error,
  generateResume,
  generateCoverLetter,
  copyToClipboard,
  downloadPDF,
  // ...
};
```

### 2. Update DocumentStudioPanel

**Add cover letter generation:**
```typescript
const {
  resumeArtifact,
  coverLetterArtifact,
  isGenerating,
  error,
  generateCoverLetter,
  // ...
} = useArtifacts();

// In cover letter card:
{canGenerate && (
  <GenerateButton
    jobId={selectedJob.id}
    artifactType="cover_letter"
    onArtifactCreated={() => {
      // handle it
    }}
  />
)}

// Show cover letter preview/copy/download same as resume
```

### 3. Update GenerateButton (if needed)

**Current:** Only supports resume
**Change:** Add optional `artifactType` parameter

```typescript
interface GenerateButtonProps {
  jobId: string;
  artifactType?: "resume" | "cover_letter";
  onArtifactCreated: (artifact: JobArtifact) => void;
}
```

### 4. Add "Mark Applied" persistence

**In DocumentStudioPanel:**
```typescript
const handleMarkApplied = async () => {
  if (!selectedJob) return;
  try {
    await fetch(`/api/jobs/${selectedJob.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state: "applied",
        applied_at: new Date().toISOString(),
        resume_artifact_id: resumeArtifact?.id,
        cover_letter_artifact_id: coverLetterArtifact?.id,
      }),
    });
    await onMarkApplied();
  } catch (err) {
    console.error("Failed to mark applied:", err);
  }
};
```

### 5. Add application history

**In JobInputPanel:**
```typescript
<div className="recent-applications-section">
  <h3>Recent Applications</h3>
  {recentApplications.map(job => (
    <div key={job.id} className="application-item">
      <div className="app-role">{job.title}</div>
      <div className="app-company">{job.company}</div>
      <div className="app-date">{formatDate(job.applied_at)}</div>
    </div>
  ))}
</div>
```

---

## Files Expected to Change

**Backend (Minimal):**
- `src/server/routes/job-artifacts.ts` — Remove cover letter block, route to correct generator
- `src/server/services/resume-generator.service.ts` — Extend to handle cover letters OR create new service

**Frontend (Moderate):**
- `src/client/features/artifacts/hooks/useArtifacts.ts` — Add generateCoverLetter
- `src/client/features/studio/components/DocumentStudioPanel.tsx` — Wire cover letter + mark applied
- `src/client/features/studio/components/CareerMemoryPanel.tsx` — Improve display
- `src/client/features/studio/components/JobInputPanel.tsx` — Add recent applications
- `src/client/features/artifacts/components/GenerateButton.tsx` — Add artifactType param (optional)

**Tests:**
- `src/client/features/studio/components/__tests__/DocumentStudioPanel.test.tsx` — Update/add tests

**No Changes Needed:**
- Database (already supports it)
- Migrations (already complete)
- ArtifactService (already handles both)
- PDFExportService (already handles both)

---

## Rollback Plan

If Phase 3 fails:
```bash
git reset HEAD~1           # Undo Phase 3 commit
git checkout HEAD -- src/  # Restore files
```

App reverts to Phase 2:
- Resume generation works
- Cover letter disabled
- Mark Applied not persisted
- No recent applications history

---

## Success Criteria

✅ User can:
1. Open app
2. Confirm Career Memory loaded
3. Paste job description
4. Click "Analyze Job"
5. Generate tailored resume
6. **Generate tailored cover letter** ← Phase 3
7. Preview both
8. Copy or export both
9. Click "Mark Job as Applied" ← Phase 3
10. See application in Recent Applications ← Phase 3

---

## Timeline Estimate

- Remove cover letter block: 5 min
- Update useArtifacts hook: 15 min
- Update DocumentStudioPanel: 20 min
- Add mark applied: 15 min
- Add recent applications: 15 min
- Improve Career Memory: 10 min
- Update tests: 20 min
- Polish & verify: 10 min
- **Total: 1.5-2 hours**

---

## Known Unknowns

**JobService.updateJobState():**
- Does it exist? Does it support PATCH /api/jobs/:id?
- Check src/server/routes/jobs.ts for implementation

**ApplicationHistory:**
- Filter to last 10 applied jobs
- Order by applied_at DESC
- Only show if applied_at exists

**Cover Letter Prompt:**
- Reuse resume generator with different prompt
- Or create new service
- Keep it simple and evidence-based

