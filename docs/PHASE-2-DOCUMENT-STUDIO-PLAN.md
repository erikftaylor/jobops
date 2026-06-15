# Phase 2: Document Studio Implementation Plan

**Date:** June 14, 2026  
**Status:** IMPLEMENTATION GUIDE  
**Scope:** Wire Document Studio right panel to real artifact generation and export

---

## Current Artifact Flow

### Backend

**Endpoint:** `POST /api/jobs/:jobId/artifacts/generate`
- Route: `/src/server/routes/job-artifacts.ts` (lines 75-173)
- Services: ResumeGeneratorService, ArtifactService, FitAnalyzerService
- Flow:
  1. Get job by ID
  2. Load career model for job
  3. Run fit analysis
  4. Generate resume with Claude (ResumeGeneratorService)
  5. Validate output (anti-fabrication checks)
  6. Save to `job_artifacts` table with auto-incremented version
  7. Return artifact ID, version, positioning, status

**Response (success):**
```json
{
  "status": 200,
  "data": {
    "artifactId": "uuid",
    "jobId": "uuid",
    "artifactType": "resume",
    "version": 1,
    "positioning": "Strong Candidate",
    "status": "ready",
    "createdAt": "2026-06-14T..."
  }
}
```

**Response (error):**
```json
{
  "status": 400|500,
  "error": {
    "code": "UNSUPPORTED_ARTIFACT_TYPE|CAREER_PROFILE_INCOMPLETE|GENERATION_FAILED|...",
    "message": "Human-readable error",
    "details": {...}
  }
}
```

**Other Endpoints:**
- `GET /api/jobs/:jobId/artifacts/:artifactId` — Get artifact with `isStale` flag
- `GET /api/jobs/:jobId/artifacts?type=resume` — List artifacts for job
- `POST /api/jobs/:jobId/artifacts/:artifactId/pdf` — Export to PDF (returns bytes)

### Frontend

**useArtifacts Hook** (`src/client/features/artifacts/hooks/useArtifacts.ts`):
- `generateResume(jobId)` — Calls POST /generate, sets artifact state
- `getArtifact(jobId, artifactId)` — Fetches single artifact
- `downloadPDF(jobId, artifactId)` — Calls POST /pdf, downloads blob
- `copyToClipboard(text)` — Uses navigator.clipboard
- State: `artifact`, `isGenerating`, `error`

**GenerateButton Component:**
- Props: `jobId`, `onArtifactCreated`
- Uses `useArtifacts()` internally
- Calls `generateResume(jobId)` on click
- Fires `onArtifactCreated(artifact)` when done
- Shows loading state, error message

**ResumePreviewModal Component:**
- Props: `isOpen`, `artifact`, `jobId`, `onClose`, `onCopy?`, `onDownload?`
- Displays `artifact.renderedText`
- Copy button calls `copyToClipboard(artifact.renderedText)`
- Download button calls `downloadPDF(jobId, artifact.id)`

---

## What Is Already Wired (Phase 1)

✅ **Resume generation endpoint** — complete, tested, working
✅ **Artifact storage** — job_artifacts table, ArtifactService CRUD
✅ **PDF export endpoint** — returns PDF bytes
✅ **GenerateButton** — basic button component
✅ **useArtifacts hook** — artifact generation, fetch, export, copy logic
✅ **ResumePreviewModal** — preview UI with copy/download
✅ **Anti-fabrication validation** — prevents hallucinated content
✅ **Stale artifact detection** — tracks career doc version mismatch

---

## What Is Missing (Phase 2)

❌ **DocumentStudioPanel wiring** — shell exists, not connected to artifacts
❌ **Resume preview modal integration** — modal exists but not shown
❌ **PDF export in UI** — endpoint exists, button not wired
❌ **Copy to clipboard in UI** — hook exists, button not wired
❌ **Cover letter generation** — endpoint rejects, UI disabled
❌ **Artifact retrieval on load** — don't load latest artifact on job select
❌ **Mark Applied persistence** — job state change not persisted
❌ **Generate feedback/errors** — not displayed in UI clearly
❌ **Cover letter support in backend** — schema supports it, endpoint blocks it

---

## Safest Implementation Path

### Step 1: Update DocumentStudioPanel (Safe Refactor)
- Import `useArtifacts` hook
- Import `ResumePreviewModal`
- Add local state: `artifact`, `showPreview`
- Wire GenerateButton: pass jobId, onArtifactCreated callback
- Show artifact data once generated
- Enable preview/export/copy buttons only when artifact exists

### Step 2: Wire Preview Modal
- Show ResumePreviewModal when `showPreview === true && artifact`
- Pass artifact and jobId
- Close on modal close
- Copy/Download functions already in modal

### Step 3: Wire Mark Applied (Deferred or Minimal)
- Check if job.state can be updated to "applied"
- If yes: call job update endpoint
- If no: show TODO note in comment

### Step 4: Minimal Cover Letter Support
- In job-artifacts.ts, remove artifact type restriction (lines 82-91)
- Accept `artifactType: "resume" | "cover_letter"`
- Backend already supports it (migration 009 supports both types)
- Frontend: show "Generate Cover Letter" button, similar to resume
- Reuse GenerateButton with artifactType parameter
- Reuse ResumePreviewModal for cover letter preview

### Step 5: Tests
- DocumentStudioPanel renders disabled until artifact
- GenerateButton click generates artifact
- Artifact enables preview/export/copy
- Cover letter works same as resume
- Error messages display
- All existing tests still pass

---

## Files Expected to Change

**Create/New:**
- None (reuse existing patterns)

**Modify:**
- `src/client/features/studio/components/DocumentStudioPanel.tsx` — Wire artifacts
- `src/client/features/studio/components/__tests__/DocumentStudioPanel.test.tsx` — Update tests
- `src/server/routes/job-artifacts.ts` — Remove cover letter restriction (optional, Phase 2)

**No Changes Needed:**
- useArtifacts hook (already complete)
- GenerateButton (already reusable)
- ResumePreviewModal (already complete)
- ArtifactService (already complete)
- job-artifacts backend routes (already wired)

---

## Wiring Strategy

### DocumentStudioPanel Props
```typescript
interface DocumentStudioPanelProps {
  selectedJob?: Job;
  onStateChange: (newState: JobState) => Promise<void>;
  onMarkApplied: () => Promise<void>;
  onOpenWorkspace?: () => void;
}
```

### DocumentStudioPanel State
```typescript
const [resumeArtifact, setResumeArtifact] = useState<JobArtifact | null>(null);
const [coverLetterArtifact, setCoverLetterArtifact] = useState<JobArtifact | null>(null);
const [showResumePreview, setShowResumePreview] = useState(false);
const [showCoverLetterPreview, setShowCoverLetterPreview] = useState(false);
const [exportingPDF, setExportingPDF] = useState(false);
```

### Resume Card Actions
1. GenerateButton(jobId, onArtifactCreated) → setResumeArtifact
2. Preview button → setShowResumePreview(true) [disabled until artifact]
3. Download PDF → downloadPDF(jobId, artifact.id)
4. Copy text → copyToClipboard(artifact.renderedText)

### Cover Letter Card Actions
1. GenerateButton(jobId, { artifactType: "cover_letter" }) → setCoverLetterArtifact
2. Same preview/export as resume

---

## Testing Strategy

**New Tests for DocumentStudioPanel:**
- Renders with disabled preview/export until artifact exists ✓
- GenerateButton generates resume artifact ✓
- Resume generation enables preview/export/copy ✓
- Preview modal shows when artifact exists ✓
- Generation error displays message ✓
- Cover letter generates same as resume ✓
- All existing 489 tests still pass ✓

**Do NOT change:**
- useArtifacts tests (separate module)
- GenerateButton tests (separate module)
- ResumePreviewModal tests (separate module)
- Backend tests (artifact service tests)

---

## Known Unknowns

**Mark Applied Persistence:**
- Check if `job.state = "applied"` is supported
- Check if `JobService.updateJobState()` exists
- If not: document required fields for Phase 3
  - applied_at: timestamp
  - application_status: enum
  - resume_artifact_id: UUID
  - cover_letter_artifact_id: UUID?

**Cover Letter Generation Backend:**
- Backend endpoint currently returns 400 for `artifactType: "cover_letter"`
- Line 82-91 in job-artifacts.ts: `if (artifactType !== "resume")`
- Option A: Remove check to enable (no backend changes needed, schema supports it)
- Option B: Leave disabled for Phase 2 MVP (safer, show "Coming soon")
- Recommendation: Option A (enable, same backend logic)

---

## Rollback Plan

If Phase 2 wiring fails:
1. `git reset HEAD~1` — undo Phase 2 commit
2. DocumentStudioPanel reverts to Phase 1 shell
3. Preview/export disabled again
4. Fallback: keep GenerateButton, phase in other features in Phase 3

---

## Success Criteria

After Phase 2:
- [ ] User can generate tailored resume
- [ ] Resume shows as preview in modal
- [ ] User can copy resume text
- [ ] User can download resume PDF
- [ ] Cover letter generation works (or shows "Coming soon")
- [ ] Mark Applied button visible (persisted or TODO)
- [ ] All 489 existing tests pass
- [ ] New tests cover artifact wiring
- [ ] TypeScript strict mode passes
- [ ] Zero regressions from Phase 1

---

## Timeline Estimate

- Step 1 (DocumentStudioPanel wiring): 30 min
- Step 2 (Preview modal): 15 min
- Step 3 (Mark Applied): 10 min (deferred if backend unclear)
- Step 4 (Cover letter): 20 min (enable backend, add UI)
- Step 5 (Tests): 30 min
- **Total: 1.5-2 hours**

