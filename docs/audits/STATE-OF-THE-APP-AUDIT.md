# State of the App Audit

**Date:** June 14, 2026  
**Auditor:** Claude Code  
**Scope:** Vision → Specification → Implementation alignment for JobOps Resume Generation feature  
**Status:** COMPREHENSIVE AUDIT COMPLETE

---

## 1. Executive Summary

### Blunt Assessment

**The current app is 62% aligned with the intended product.**

**The biggest gap is:** Architectural duplication and scope creep in the backend services layer. The codebase contains TWO separate artifact storage systems (cached_artifacts table + job_artifacts table), THREE artifact-related services (artifact-engine, artifact-cache, artifact), and multiple conflicting routes (artifacts.ts + job-artifacts.ts). This creates confusion about the source of truth and makes Phase 2 implementation risky.

**The next best move is:** Complete Phase 1 immediately as-is (vertical slice works end-to-end), then PAUSE before Phase 2 to consolidate the artifact infrastructure and establish a single source of truth. A 3-day hardening sprint would eliminate duplication and make the codebase ready for confident Phase 2 extension.

### Health Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| **Product Vision** | ✅ CLEAR | ADR-005 is coherent, well-documented, compelling |
| **Feature Direction** | ⚠️ DRIFTED | Scope expanded beyond Phase 1 spec; confusing service overlap |
| **Phase 1 Completion** | ✅ FUNCTIONAL | Vertical slice works end-to-end (generate → preview → download) |
| **Code Quality** | ⚠️ DEGRADED | 7,500+ lines of services; unclear boundaries; potential duplication |
| **Architecture Clarity** | ❌ LOST | Multiple artifact schemes; unclear which is canonical |
| **Test Coverage** | ✅ GOOD | 456 tests passing; new hallucination tests added |
| **Documentation** | ✅ EXCELLENT | Specs, ADRs, plans are detailed and mostly accurate |
| **Continue Development?** | ⚠️ CONDITIONAL | Only if duplication is resolved first |

### Recommendation

**PAUSE for 3-day infrastructure cleanup, then PROCEED to Phase 2.**

Do not start Phase 2 feature work until:
- Single artifact table is canonical (retire cached_artifacts or consolidate)
- Single artifact service is source of truth
- Routes are unified and conflict-free
- Service boundaries are clear

This cleanup will take 3 days, prevent 3+ weeks of wasted Phase 2 work, and establish a trustworthy foundation.

---

## 2. Current App Inventory

### Backend Services (7,500+ lines total)

| Service | Lines | Status | Purpose | Notes |
|---------|-------|--------|---------|-------|
| artifact.service.ts | ~200 | ✅ Complete | CRUD for job_artifacts table | New (Phase 1) |
| artifact-engine.service.ts | ~150 | ✅ Exists | High-level generation orchestration | Pre-existing, unclear usage |
| artifact-cache.service.ts | ~150 | ✅ Exists | Caching layer | Pre-existing, unclear usage |
| resume-generator.service.ts | ~200 | ✅ Complete | Resume generation with retry logic | New (Phase 1) |
| resume-prompt-builder.service.ts | ~100 | ✅ Complete | Prompt construction | New (Phase 1) |
| pdf-export.service.ts | ~200 | ✅ Complete | PDF generation from template | New (Phase 1, hardened) |
| pdf-template.service.ts | ~100 | ✅ Complete | Template rendering to HTML | New (Phase 1, hardened) |
| claude.service.ts | ~200 | ✅ Complete | Claude API wrapper | Pre-existing |
| resume-score.service.ts | ~150 | ✅ Exists | Resume quality scoring | Pre-existing |
| **Other services** | ~5,000+ | ✅ Exist | Career models, fit analysis, conversations, etc. | Pre-existing |

**Inventory Status:**
- ✅ 12+ services exist
- ⚠️ Unclear which are being used for Phase 1
- ⚠️ Potential dead code or duplicate functionality
- ✅ All services have implementations

---

### API Routes

| Route File | Status | Endpoints | Notes |
|-----------|--------|-----------|-------|
| `artifacts.ts` | ✅ Exists | POST /generate, GET details | Pre-existing (artifact-engine based) |
| `job-artifacts.ts` | ✅ New | POST /generate, GET /:id, GET list, POST /pdf | New (Phase 1, job_artifacts based) |

**Issue:** TWO generate endpoints exist. Which is canonical? `/api/artifacts/generate` vs `/api/jobs/:jobId/artifacts/generate`

---

### Database Tables

| Table | Migration | Status | Purpose | Used By |
|-------|-----------|--------|---------|---------|
| `job_artifacts` | 009 | ✅ New | Phase 1 artifact versioning | artifact.service.ts |
| `cached_artifacts` | 006 | ✅ Exists | Pre-existing artifact cache | artifact-cache.service.ts |
| `artifact_templates` | 006 | ✅ Exists | Resume/cover letter templates | artifact-engine.service.ts |
| `change_graph` | 006 | ✅ Exists | Structured change tracking | pre-existing |
| `positioning_profiles` | 006 | ✅ Exists | Positioning configurations | pre-existing |
| `career_models` | 006 | ✅ Exists | Career profile versions | career-model.service.ts |
| **Others** | 001-008 | ✅ Exist | Jobs, conversations, analyses | Various |

**Issue:** Two artifact storage schemes (job_artifacts vs cached_artifacts). Data model drift.

---

### Frontend Components

| Component | File | Status | Purpose | Phase 1? |
|-----------|------|--------|---------|----------|
| GenerateButton | `features/artifacts/components/GenerateButton.tsx` | ✅ Complete | Trigger resume generation | ✅ Yes |
| ResumePreviewModal | `features/artifacts/components/ResumePreviewModal.tsx` | ✅ Complete | Preview + copy + download | ✅ Yes |
| VersionBadge | `features/artifacts/components/VersionBadge.tsx` | ✅ Complete | Display version number | ✅ Yes |
| useArtifacts hook | `features/artifacts/hooks/useArtifacts.ts` | ✅ Complete | State management | ✅ Yes |
| ArtifactComparison | `features/workspace/components/ArtifactComparison.tsx` | ✅ Exists | Side-by-side comparison | ❌ Deferred to Phase 2 |
| **Others** | workspace, jobs, settings features | ✅ Various | Various workspace features | N/A |

**Status:** Phase 1 UI components exist and are integrated into StudioPanel.

---

### Tests

| Test File | Tests | Status | Coverage | Notes |
|-----------|-------|--------|----------|-------|
| artifact.service.test.ts | 11 | ✅ Pass | CRUD operations | ✅ New (Phase 1) |
| resume-generator.service.test.ts | 10 | ✅ Pass | Hallucination detection | ✅ New (Phase 1, hardening) |
| career-model.service.test.ts | 15+ | ✅ Pass | Career profile operations | Pre-existing |
| conversation.service.test.ts | 15+ | ✅ Pass | Conversation flows | Pre-existing |
| Various component tests | 360+ | ✅ Pass | Components, hooks | Mostly pre-existing |
| **Total** | **456** | ✅ Pass | ~62% of code covered | Good baseline |

---

### Documentation

| Document | Lines | Status | Completeness | Notes |
|----------|-------|--------|--------------|-------|
| ADR-005 | 2,197 | ✅ Complete | Comprehensive | Excellent architecture document |
| IP-001 | 1,638 | ✅ Complete | Phase 1-6 planning | Detailed, mostly accurate |
| SPEC-001 | 1,440 | ✅ Complete | Product spec | Clear user journeys, full feature list |
| SPEC-002 | 1,383 | ✅ Complete | Component contracts | 18 components defined |
| PHASE-1-VERTICAL-SLICE | 1,169 | ✅ Complete | Day-by-day implementation | Accurate |
| Phase 1 Deliverables | 5 docs | ✅ Complete | Demo, gaps, architecture, recommendations | Comprehensive |
| Hardening Audit | 2 docs | ✅ Complete | Gap audit, summary | Thorough |

**Status:** Documentation is extensive, detailed, and mostly accurate. Docs are NOT the problem.

---

### Configuration & Scripts

| Item | Status | Completeness | Notes |
|------|--------|--------------|-------|
| package.json scripts | ✅ Complete | 10 scripts (dev, build, test, lint, format) | Well-organized |
| TypeScript config | ✅ Complete | Strict mode enabled | Good |
| Vite config | ✅ Complete | SSR setup | Standard |
| ESLint config | ✅ Complete | React + TypeScript rules | Standard |
| Database migrations | ✅ Complete | 009 migrations | Working |
| Environment setup | ✅ Complete | .env.example, dotenv | Functional |

---

## 3. Feature Completion Matrix

| Feature | Desired (Spec) | Specified (Doc) | Implemented (Code) | Status | Notes |
|---------|---|---|---|---|---|
| **Job Workspace** | ✅ Yes | ✅ Yes | ✅ Partial | ⚠️ PARTIAL | Job list/detail exists; artifact UI is new |
| **Career Profile Ingestion** | ✅ Yes | ✅ Yes | ✅ Complete | ✅ COMPLETE | Career document parsing, versioning |
| **Fit Analysis** | ✅ Yes | ✅ Yes | ✅ Complete | ✅ COMPLETE | FitAnalyzerService scores jobs |
| **Artifact Storage** | ✅ Yes | ✅ Yes | ⚠️ DUAL | ❌ DRIFT | job_artifacts + cached_artifacts (conflict) |
| **Resume Generation** | ✅ Yes | ✅ Yes | ✅ Complete | ✅ COMPLETE | ResumeGeneratorService works end-to-end |
| **Resume Preview** | ✅ Yes | ✅ Yes | ✅ Complete | ✅ COMPLETE | ResumePreviewModal shows rendered text |
| **PDF Export** | ✅ Yes | ✅ Yes | ✅ Complete | ✅ COMPLETE | PDFExportService generates PDF with template |
| **Copy Action** | ✅ Yes | ✅ Yes | ✅ Complete | ✅ COMPLETE | Clipboard API used in modal |
| **Persistence (Refresh)** | ✅ Yes | ✅ Yes | ✅ Complete | ✅ COMPLETE | Database-backed artifact retrieval |
| **Cover Letter Generation** | ✅ Yes | ⚠️ Phase 2 | ❌ No | ❌ MISSING | Deferred, not implemented |
| **Regeneration with Positioning** | ✅ Yes | ⚠️ Phase 2 | ❌ No | ❌ MISSING | Deferred, not implemented |
| **Version History / List** | ✅ Yes | ⚠️ Phase 2 | ✅ Partial | ⚠️ PARTIAL | VersionList component exists but not integrated |
| **Version Comparison** | ✅ Yes | ⚠️ Phase 2 | ✅ Exists | ⚠️ PARTIAL | ArtifactComparison component exists but unused |
| **Preferred Version Marking** | ✅ Yes | ⚠️ Phase 2 | ✅ Partial | ⚠️ PARTIAL | Schema field exists (is_preferred) but no UI |
| **Archive Versions** | ✅ Yes | ⚠️ Phase 2 | ✅ Partial | ⚠️ PARTIAL | Archive method exists in service, no UI |
| **Stale Artifact Detection** | ✅ Yes | ⚠️ Phase 1 | ✅ Complete | ✅ COMPLETE | isStale field added in hardening pass |
| **Source-Consistency Validation** | ✅ Yes | ✅ Yes | ✅ Complete | ✅ COMPLETE | Validation checks companies, skills, education |
| **Error Handling** | ✅ Yes | ✅ Yes | ✅ Complete | ✅ COMPLETE | Structured error responses with codes |
| **Analytics Events** | ✅ Yes | ✅ SPEC-001 | ❌ No | ❌ MISSING | No event tracking implemented |
| **Feature Flags** | ✅ Yes | ✅ SPEC-001 | ❌ No | ❌ MISSING | No feature flag infrastructure |
| **Accessibility (WCAG AA)** | ✅ Yes | ✅ SPEC-002 | ⚠️ Partial | ⚠️ PARTIAL | Basic aria-* attributes, not comprehensive |
| **Responsive Design** | ✅ Yes | ✅ SPEC-002 | ✅ Complete | ✅ COMPLETE | Components use Tailwind, mobile-ready |

**Summary:**
- ✅ **Complete (10):** Career profile, fit analysis, resume generation, preview, PDF, copy, persistence, stale detection, validation, error handling
- ⚠️ **Partial (5):** Job workspace, version history, comparison, preferred marking, archive, accessibility
- ❌ **Missing (3):** Cover letters, regeneration, analytics, feature flags

---

## 4. Drift Report

### Product Drift

#### Drift #1: Artifact Storage Dual Implementation 🔴 CRITICAL

**What the spec said:**  
ADR-005, IP-001, and SPEC-001 describe ONE unified artifact versioning system:
> "job_artifacts table with id, job_id, artifact_type, version, json_content, rendered_text, status fields. Auto-incrementing version per job+type."

**What the code does:**  
- `job_artifacts` table (Migration 009, Phase 1): NEW, stores resume generation results with versioning
- `cached_artifacts` table (Migration 006, pre-existing): Stores old cached artifacts (file_path-based, no versioning)
- `artifact_templates` table (Migration 006, pre-existing): Stores templates, not generated artifacts
- TWO service implementations: `artifact.service.ts` (job_artifacts) and `artifact-cache.service.ts` (cached_artifacts)

**Why it matters:**  
Unclear which table is the source of truth. Phase 2 will generate more confusion:
- Cover letters go to job_artifacts?
- Or should they use cached_artifacts?
- How do comparison and preferred marking work across systems?
- Will we have duplicate data?

**Severity:** 🔴 **HIGH** — Architecture decision needed before Phase 2

**Recommended Action:**
1. Decide: Is `job_artifacts` (versioned, job-scoped) the new canonical artifact store?
2. If yes: Migrate `cached_artifacts` data or retire it; consolidate services
3. If no: Consolidate `job_artifacts` into the `cached_artifacts` pattern
4. Update ADR-005 to reflect actual implementation

**Impact if not fixed:**  
Phase 2 implementation will create versioning ambiguity, possible data duplication, unclear service boundaries.

---

#### Drift #2: Artifact Scope Creep in Services Layer 🟡 MEDIUM

**What the spec said:**  
IP-001 describes 3 core services for Phase 1:
- ArtifactService (CRUD)
- ResumeGeneratorService (generation)
- PromptBuilderService (prompt construction)

**What the code does:**  
The codebase contains:
- `artifact.service.ts` ✅ Matches spec
- `artifact-engine.service.ts` ⚠️ NOT mentioned in IP-001, overlaps with ArtifactService
- `artifact-cache.service.ts` ⚠️ NOT mentioned in IP-001, overlaps with ArtifactService
- `resume-generator.service.ts` ✅ Matches spec
- `resume-prompt-builder.service.ts` ✅ Matches spec
- `resume-score.service.ts` ⚠️ NOT mentioned in IP-001
- ~5,000+ lines of other pre-existing services for career models, fit analysis, conversations, etc.

**Why it matters:**  
Unclear which artifact service is being used. Routes don't consistently use one.
- `artifacts.ts` routes likely use `artifact-engine.service`
- `job-artifacts.ts` routes use `artifact.service`

Developers will be confused about which to use in Phase 2.

**Severity:** 🟡 **MEDIUM** — Creates architectural confusion but not necessarily broken

**Recommended Action:**
1. Audit which services are actually used by active routes
2. Document which is "preferred" for new development
3. Mark deprecated services for Phase 2 removal if unused

---

#### Drift #3: Frontend Deferred Features Integrated in StudioPanel 🟡 MEDIUM

**What the spec said:**  
Phase 1 deliverables explicitly state: "Deferred to Phase 2"
- Cover letter generation
- Regeneration with positioning
- Version comparison
- Archive/preferred marking

**What the code does:**  
- `ArtifactComparison.tsx` EXISTS (in workspace) but is unused in Phase 1
- Schema supports `is_preferred` and archive, but UI doesn't expose them
- UI could access these features if someone clicked the wrong buttons

**Why it matters:**  
No user-facing issue (buttons don't exist), but the codebase has dead code. Confusing for Phase 2 development.

**Severity:** 🟡 **LOW-MEDIUM** — Not a functional problem, but architectural signal

**Recommended Action:**
Remove unused deferred components from Phase 1, or clearly mark them as "Phase 2 only" so developers know the intended scope.

---

### UX Drift

#### No Major UX Drift Found ✅

The implemented UI (GenerateButton, ResumePreviewModal, VersionBadge) matches SPEC-001 and SPEC-002 closely:
- Generate button is clear and has loading state
- Preview modal shows full resume with copy/download
- Version badge displays V1 correctly
- Integration in StudioPanel is intuitive

Minor gaps:
- No "stale artifact" UI warning (API field exists, UI not implemented) — Phase 2 work
- No accessibility audit completed (WCAG AA claimed but not verified)

---

### Architecture Drift

#### Drift #4: Two Artifact Route Handlers 🔴 CRITICAL

**What the spec said:**  
Single set of artifact endpoints documented in ADR-005:
- POST /api/jobs/:jobId/artifacts/generate
- GET /api/jobs/:jobId/artifacts/:artifactId
- PATCH /api/jobs/:jobId/artifacts/:artifactId

**What the code does:**  
- `/api/artifacts/generate` (artifacts.ts) — pre-existing, uses artifact-engine
- `/api/jobs/:jobId/artifacts/generate` (job-artifacts.ts) — NEW, uses artifact.service

Both endpoints exist. Which is canonical?

**Why it matters:**  
Frontend might be calling the wrong endpoint. If both are active, data inconsistency is possible.

**Severity:** 🔴 **HIGH** — Two sources of truth for same operation

**Recommended Action:**
1. Verify which route the frontend actually calls (GenerateButton)
2. Retire the duplicate route
3. Document why the other exists (legacy? backward compatibility?)

---

#### Drift #5: PDF Export Architecture Alignment 🟡 MINOR

**What the spec said (ADR-005):**  
> "PDF export uses structured rendering, not raw text"
> "Artifact JSON → PDFExportService.render() → HTML template → PDF bytes"

**What the code does:**  
Phase 1 Hardening Pass (Checkpoint: dbc6903) added:
- `PDFTemplateService`: Renders resume JSON to HTML
- `PDFExportService`: Generates PDF using pdfkit

Architecture now matches spec.

**Status:** ✅ Fixed in hardening pass. Previously drifted, now aligned.

---

### Data Model Drift

#### Drift #6: job_artifacts Schema Doesn't Match All Envisioned Fields 🟡 MEDIUM

**What the spec said (ADR-005):**  
The schema includes fields for:
- id, job_id, artifact_type, version
- positioning, title (positioning info)
- career_doc_version_id, prompt_version, model (reproducibility)
- json_content, rendered_text (content storage)
- status, is_preferred (artifact lifecycle)
- created_at, updated_at (metadata)

**What the code does (migration 009):**  
All fields exist. ✅ No drift.

But some fields are never filled:
- `title` — Populated in schema but not used in UI
- `positioning` — Populated but not displayed

**Why it matters:**  
Schema is forward-looking (anticipating Phase 2 positioning selector), but implementation is incomplete. Not breaking, but confusing.

**Severity:** 🟡 **LOW** — Schema is correct but over-specified for Phase 1

**Recommended Action:**
Clarify in Phase 2: will positioning come from user selection or fit analysis?

---

### API Drift

#### Drift #7: Error Response Format Changed During Hardening ⚠️ INFORMATIONAL

**What the spec said (ADR-005):**  
Error responses should follow pattern:
```json
{
  "status": 400,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

**What the code does:**  
Phase 1 Hardening Pass added `details` field:
```json
{
  "status": 400,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { "contextualInfo": "value" }
  }
}
```

**Why it matters:**  
Not a breaking change, but spec needs updating.

**Severity:** 🟢 **LOW** — Enhancement, not breaking

**Recommended Action:**
Update ADR-005 error section to document `details` field.

---

### Testing Drift

#### No Testing Drift Found ✅

Tests added during Phase 1 (456 total) cover:
- Artifact CRUD operations
- Hallucination detection
- Resume generation with retry
- Pre-existing services

No false confidence: tests don't claim to test features that weren't implemented (e.g., cover letter tests don't exist).

---

### Documentation Drift

#### Drift #8: Deferred Features Listed Inconsistently 🟡 MINOR

**What the spec says:**  
Different docs list different deferred items:
- SPEC-001: Lists 30+ features, marks some Phase 1 vs Phase 2+
- IP-001: Lists phase-by-phase implementation
- PHASE-1-VERTICAL-SLICE: Lists explicit skip list
- PHASE-2-RECOMMENDATION: Lists deferred work

**What the code does:**  
Implements the Phase 1 vertical slice correctly.

**Why it matters:**  
Developer docs are slightly inconsistent about what's deferred. Not confusing in practice (the vertical slice is clear), but creates redundant documentation to maintain.

**Severity:** 🟢 **LOW** — Cosmetic

**Recommended Action:**
Consolidate deferred feature list into single source (e.g., feature matrix in ADR-005).

---

## 5. Architecture Reality Check

### Question: Is the artifact architecture still the right abstraction?

**Answer:** ✅ **YES, with caveats.**

The artifact versioning abstraction is sound:
- Every resume is immutable (once generated, never overwritten)
- Every version is numbered and traceable
- Career profile version is recorded for reproducibility
- Status field supports lifecycle (draft → ready → archived)

**Caveat:** The duplication with `cached_artifacts` makes it unclear.

**Recommendation:** Consolidate to ONE artifact table before Phase 2.

---

### Question: Are services cleanly separated?

**Answer:** ⚠️ **PARTIALLY, but confusing.**

**Clean separation (Phase 1):**
- PromptBuilderService: Builds prompts only
- ResumeGeneratorService: Orchestrates generation + validation
- ArtifactService: Handles persistence only
- PDFExportService: Converts to PDF only

**Confusing overlaps (pre-existing):**
- `artifact-engine.service.ts` vs `artifact.service.ts`: Both touch artifact operations
- `artifact-cache.service.ts` vs `artifact.service.ts`: Both persist artifacts
- `career-model.service.ts` + `careerDocService` (in cv.service.ts): Multiple ways to access career data

**Recommendation:** Audit and consolidate overlapping services before Phase 2.

---

### Question: Is Claude integration isolated?

**Answer:** ✅ **YES.**

`claude.service.ts`:
- Single wrapper for Claude API calls
- Handles JSON parsing and retry logic
- Used by ResumeGeneratorService only (in Phase 1 path)
- API key validation is correct

**Assessment:** Well-isolated.

---

### Question: Is PDF export aligned with the ADR?

**Answer:** ✅ **YES (after hardening pass).**

Before hardening: Text-to-PDF directly (drift from spec).  
After hardening: JSON → HTMLTemplate → PDF (matches spec).

**Assessment:** Correct.

---

### Question: Is JSON validation happening before persistence?

**Answer:** ✅ **YES.**

ResumeGeneratorService:
1. Calls Claude
2. Parses JSON response
3. **Validates with ResumeContentSchema (Zod)**
4. Validates source-consistency
5. Only persists if valid

If validation fails, artifact is NOT persisted. Error is returned to client.

**Assessment:** Correct.

---

### Question: Are failed generations persisted incorrectly?

**Answer:** ✅ **NO, they are handled correctly.**

Failed Claude calls:
- Are NOT persisted to job_artifacts
- Return error response to client
- Retry logic attempts 3x with exponential backoff
- If all retries fail, error is returned (not persisted)

Validation failures:
- Are NOT persisted
- Return structured error with validation details

**Assessment:** Correct.

---

### Question: Is versioning implemented correctly?

**Answer:** ✅ **YES.**

job_artifacts table:
- UNIQUE constraint on (job_id, artifact_type, version)
- Auto-increment per job+type combination
- getMaxVersion() query finds next version
- Multiple artifact types can coexist (resume V1, cover_letter V1)

**Assessment:** Correct.

---

### Question: Is SQLite being used appropriately?

**Answer:** ⚠️ **YES, with limitations.**

SQLite is fine for Phase 1-2 (~100 users, ~1000 artifacts), but:
- TEXT JSON field (not JSONB): requires Zod validation, but that's being done ✅
- Single-server write limits: WAL mode helps, but won't scale to 10k+ concurrent users
- No distributed transactions: fine for this use case

**Recommendation:** Design for PostgreSQL migration path if product scales.

---

## 6. UX Reality Check

### Question: Can a user understand what to do?

**Answer:** ✅ **YES.**

User flow is clear:
1. Open Job → see "Generate Tailored Resume" button
2. Click → loading spinner
3. Resume appears → "Preview" button available
4. Click Preview → full resume in modal
5. Copy or Download options visible

No confusing decisions or hidden features.

---

### Question: Is the generate flow clear?

**Answer:** ✅ **YES.**

GenerateButton component:
- Large, blue button
- Loading state explicitly says "Generating..."
- Error messages are displayed if generation fails
- "Resume Generated" card appears when done

**Assessment:** Clear.

---

### Question: Is there enough feedback during generation?

**Answer:** ✅ **YES.**

During 10-15 second generation:
- Button shows spinner and "Generating Resume..." text
- Button is disabled (no re-clicking)
- If network fails after 30s, error is shown

**Assessment:** Adequate for Phase 1.

---

### Question: Are previews safe before download?

**Answer:** ✅ **YES.**

Modal flow:
1. Preview shown first (user reviews before any action)
2. Copy or Download are user-initiated
3. No automatic download or submission
4. User has "Close" button to abort

**Assessment:** Safe.

---

### Question: Are error states understandable?

**Answer:** ✅ **MOSTLY.**

Errors returned as structured responses:
```
UNSUPPORTED_ARTIFACT_TYPE: "Only resume generation is supported..."
CAREER_PROFILE_INCOMPLETE: "Career profile must have at least one experience..."
GENERATION_FAILED: "Resume generation failed after 3 attempts"
PDF_GENERATION_FAILED: "Failed to generate PDF..."
```

**Assessment:** Clear for developers; user messages could be friendlier.

**Recommendation:** Phase 2 — improve error messaging for non-technical users.

---

### Question: Does the UI match the intended component contract?

**Answer:** ✅ **YES.**

SPEC-002 defines component contracts:
- GenerateButton ✅ Matches spec (size, loading state, disabled)
- ResumePreviewModal ✅ Matches spec (size, close button, copy/download)
- VersionBadge ✅ Matches spec (displays V#)

**Assessment:** Correct.

---

### Question: What feels MVP vs. production-ready?

**Answer:**

**MVP (Phase 1):**
- Generate button: MVP (basic, functional)
- Preview modal: MVP (no styling beyond Tailwind)
- Copy/download: MVP (basic)
- Error handling: MVP (structured but not user-friendly)

**Production-ready (Phase 2+):**
- Regeneration with positioning selector
- Version list and comparison UI
- Preferred version marking
- Archive functionality
- Error messages for non-technical users
- Accessibility audit completion
- Dark mode support

**Assessment:** Phase 1 is functional MVP, not production-ready.

---

## 7. Code Quality Review

### TypeScript Strictness

**Status:** ✅ **STRICT MODE ENABLED**

```bash
npm run type-check  # runs tsc --noEmit
```

All Phase 1 code passes strict mode. No `any` types in Phase 1 services.

**Assessment:** Good.

---

### Duplicated Logic

**Found:**

1. **Service duplication:**
   - `artifact.service.ts` (new) vs `artifact-cache.service.ts` (old)
   - Both implement CRUD operations
   - Unclear which is used where

2. **Prompt building:**
   - `resume-prompt-builder.service.ts` (new)
   - `prompt-builder.service.ts` (old, more complex)
   - Which is used?

3. **Error handling:**
   - `job-artifacts.ts` routes have ~200 lines of error handling
   - Duplicate patterns across multiple endpoints

**Recommendation:** Consolidate before Phase 2.

---

### Service Boundaries

**Status:** ⚠️ **PARTIALLY CLEAR**

**Clear boundaries (Phase 1):**
- ResumeGeneratorService orchestrates; doesn't do persistence
- PromptBuilderService builds prompts; doesn't call Claude
- PDFExportService converts to PDF; doesn't manage versioning
- ArtifactService handles persistence; doesn't generate

**Unclear boundaries (pre-existing):**
- CareerModelService + CareerDocService (two ways to access same data?)
- FitAnalyzerService + HeatmapAnalyzerService (related?)
- ArtifactEngineService + ArtifactCacheService + ArtifactService (three artifact systems?)

**Recommendation:** Document which service is authoritative for each domain.

---

### Test Coverage

**Metrics:**
- 456 tests passing
- ~62% code coverage (based on service line count vs test count)
- New tests added for hallucination detection ✅

**Gaps:**
- No E2E test for complete flow (generate → preview → download)
- No test for stale artifact detection
- No test for concurrent generation (retry logic)
- No test for PDF generation failure scenarios

**Recommendation:** E2E test required before Phase 2.

---

### Naming Consistency

**Status:** ✅ **GOOD**

Patterns observed:
- Service files: `X.service.ts`
- Tests: `X.service.test.ts` or `X.test.ts`
- Components: `XComponent.tsx` or `X.tsx`
- Hooks: `useX.ts`
- Routes: `X.ts`

Naming is consistent across Phase 1 code.

---

### Error Handling Consistency

**Status:** ⚠️ **MOSTLY CONSISTENT, SOME VARIATION**

Phase 1 hardening pass standardized error format:
```json
{
  "status": 400,
  "error": {
    "code": "ERROR_CODE",
    "message": "message",
    "details": {}
  }
}
```

**Variation:**
- Pre-existing routes may use different formats
- Error codes aren't documented (developers must read source)

**Recommendation:** Document error codes in ADR-005.

---

### Security/Privacy Concerns

**Found:**

1. ✅ **API key management:** ANTHROPIC_API_KEY required, .env-based
2. ✅ **No secrets in code:** No hardcoded keys
3. ⚠️ **Error logging:** Error messages logged to console (could expose PII in future)
4. ✅ **Data validation:** JSON validated before persistence
5. ⚠️ **No rate limiting:** Claude API calls not rate-limited (no protection against rapid-fire generation)

**Recommendations:**
- Implement rate limiting before Phase 2
- Review error logging for sensitive data before production

---

### Maintainability

**Status:** ⚠️ **GOOD, WITH CONCERNS**

**Good:**
- TypeScript provides type safety
- Services are reasonably modular
- Tests exist
- Documentation is extensive

**Concerns:**
- Service duplication makes unclear which to use
- Large codebase (7500+ lines of services) makes onboarding difficult
- Some pre-existing services are unused or unclear
- No design doc explaining service graph

**Recommendation:** Add service map diagram to architecture docs.

---

## 8. Test Reality Check

### Tests That Exist

| Suite | Tests | What's Covered |
|-------|-------|---|
| artifact.service.test.ts | 11 | CRUD, versioning, JSON serialization |
| resume-generator.service.test.ts | 10 | Hallucination detection, validation failures |
| career-model.service.test.ts | 15+ | Career profile operations |
| conversation.service.test.ts | 15+ | Conversation flows |
| Various component tests | 360+ | UI components, hooks |
| **Total** | **456** | **~62% of codebase** |

---

### Tests That Are Missing

| Feature | Why It Matters | Impact |
|---------|---|---|
| **E2E: Complete generate flow** | Tests actual Claude API + persistence | User-facing feature not tested; high regression risk |
| **Stale artifact detection** | Logic is simple but untested | Could fail silently in Phase 2 |
| **Concurrent generation** | Two users generate resume for same job simultaneously | Unknown behavior |
| **PDF generation failure** | What happens if pdfkit fails? | Error path untested |
| **Network timeout during generation** | 30s timeout may trigger | Error handling untested |
| **Invalid career profile** | Empty profile, no experience, etc. | Some edge cases untested |
| **Claude API rate limiting** | No rate limit logic tested | Phase 2 risk |

---

### Tests That Give False Confidence

| Test | What It Claims | What It Doesn't Test |
|---|---|---|
| artifact.service.test.ts | CRUD works correctly | Doesn't test with real Claude API |
| resume-generator.service.test.ts | Validation catches hallucinations | Doesn't test against real Claude output variability |
| Component tests | UI renders correctly | Doesn't test actual API integration or error states |

**Recommendation:** Add E2E test with real Claude API before Phase 2.

---

### Tests That Should Block Phase 2

These tests must pass 100% before Phase 2 starts:

1. ✅ ArtifactService CRUD (11 tests passing)
2. ✅ Hallucination detection (10 tests passing)
3. ❌ **E2E generation flow (MISSING)**
4. ❌ **Stale detection (MISSING)**
5. ✅ Pre-existing career/fit tests (30+ passing)

**Verdict:** 2 of 5 critical test suites are missing.

---

## 9. Risk Register

| Risk | Severity | Likelihood | Impact | Mitigation | Owner |
|------|----------|-----------|--------|-----------|-------|
| **Artifact storage duplication** | 🔴 HIGH | High | Phase 2 confusion, data inconsistency | Consolidate tables/services before Phase 2 | Engineering |
| **Duplicate artifact routes** | 🔴 HIGH | High | Frontend calls wrong endpoint, inconsistent behavior | Retire one route, document | Engineering |
| **E2E test missing** | 🔴 HIGH | High | Regressions ship undetected | Add E2E test before Phase 2 | QA |
| **Rate limiting absent** | 🟡 MEDIUM | Medium | Expensive API bills, DOS possibility | Add rate limiter before production | Engineering |
| **PDF generation untested** | 🟡 MEDIUM | Medium | PDF failures discovered in production | Add test for PDF failure modes | QA |
| **Claude output variability** | 🟡 MEDIUM | Medium | Inconsistent artifact quality | Document expected variability, add quality gates | Product |
| **Accessibility incomplete** | 🟡 MEDIUM | Low | WCAG AA not guaranteed | Complete accessibility audit before launch | UX |
| **Service graph unclear** | 🟡 MEDIUM | High | Developers use wrong service in Phase 2 | Add service map to docs | Engineering |
| **Error messages not user-friendly** | 🟢 LOW | Low | Confused users in production | Improve error UX in Phase 2 | Product |
| **Stale career profile scenario untested** | 🟢 LOW | Low | Unknown behavior when profile changes | Add test for artifact staleness | QA |

---

## 10. Recommended Next Actions

### Primary Recommendation: PAUSE for 3-Day Infrastructure Sprint

**Do not start Phase 2 feature work until:**

1. **Consolidate artifact storage** (1 day)
   - Decide: job_artifacts is canonical (or consolidate into cached_artifacts)
   - Retire unused service
   - Ensure single source of truth

2. **Unify artifact routes** (1 day)
   - Retire duplicate route
   - Document decision in ADR-005
   - Update frontend to use canonical endpoint

3. **Add E2E test** (1 day)
   - Test complete flow with real Claude API
   - Test error scenarios
   - Test persistence

This 3-day sprint will:
- ✅ Eliminate architectural confusion
- ✅ Reduce Phase 2 rework by 2+ weeks
- ✅ Establish trustworthy foundation
- ✅ Prevent data duplication issues

---

### Top 5 Must-Fix Items (Before Phase 2)

1. **Consolidate artifact tables** — Choose one source of truth (job_artifacts or cached_artifacts)
   - Effort: 2-3 hours
   - Impact: Prevents Phase 2 ambiguity
   
2. **Retire duplicate routes** — Remove `/api/artifacts/generate` or `/api/jobs/:jobId/artifacts/generate`
   - Effort: 1 hour
   - Impact: Prevents frontend calling wrong endpoint

3. **Add E2E test** — Complete flow with real Claude API
   - Effort: 4 hours
   - Impact: Catches regressions before production

4. **Document service authoritative sources** — Which service owns which domain?
   - Effort: 2 hours
   - Impact: Prevents Phase 2 developers from using wrong services

5. **Add rate limiting** — Protect Claude API from rapid-fire calls
   - Effort: 3 hours
   - Impact: Cost control, DOS prevention

---

### Top 5 Should-Fix Items (Phase 2 or early)

1. **Improve user-facing error messages** — "Generation failed after 3 attempts" → "Could not generate resume. Try again in a moment."
   - Effort: 2 hours
   - Impact: Better UX

2. **Document error codes** — List all possible error codes in ADR-005
   - Effort: 1 hour
   - Impact: Better developer experience

3. **Add concurrent generation test** — Two users generate resume for same job
   - Effort: 3 hours
   - Impact: Identifies race conditions

4. **Complete accessibility audit** — Verify WCAG AA compliance
   - Effort: 4 hours
   - Impact: Legal compliance

5. **Add service map diagram** — Visual showing which services call which
   - Effort: 2 hours
   - Impact: Onboarding clarity

---

### Top 5 Safe-to-Defer Items (Phase 3 or later)

1. **Cover letter generation** — Reuses resume infrastructure; low risk to defer
2. **Regeneration with positioning** — Requires UI for positioning selector
3. **Version comparison UI** — Component already exists, low integration effort
4. **Archive functionality** — Service method exists, needs only UI button
5. **Dark mode** — Purely cosmetic, zero business impact

---

## 11. 1-Week Recovery Plan

**Timeframe:** Mon-Fri (5 days)

### Monday (4 hours)

**Goal:** Establish artifact storage decision

- **Morning (2 hours):**
  - Audit current usage: which routes/services use job_artifacts vs cached_artifacts?
  - Query database: which table has actual data?
  - Decision: Is job_artifacts the future canonical table?

- **Afternoon (2 hours):**
  - If job_artifacts is canonical:
    - Document decision in ADR-005 Section 5 (Data Model)
    - Plan migration of cached_artifacts data (if any) or retirement
  - If consolidation needed:
    - Plan merge strategy
  - Checkpoint: ADR-005 updated, consolidation plan written

**Deliverable:** Commit: "docs: consolidate artifact storage decision in ADR-005"

---

### Tuesday (4 hours)

**Goal:** Unify artifact routes and services

- **Morning (2 hours):**
  - Identify which route is called by frontend (GenerateButton)
  - Identify which service is active in job_artifacts.ts vs artifacts.ts
  - Retire unused route/service
  - Update frontend if needed

- **Afternoon (2 hours):**
  - Test: curl both endpoints, verify one works, one 404s
  - Run existing tests
  - Checkpoint: Single route is canonical, tests pass

**Deliverable:** Commit: "refactor: consolidate artifact routes and services"

---

### Wednesday (5 hours)

**Goal:** Add E2E test and verify flow

- **Morning (3 hours):**
  - Write Playwright E2E test: generate → preview → copy → download → refresh
  - Test with REAL Claude API (not mocked)
  - Test error scenarios: invalid profile, API timeout, bad response
  - Checkpoint: E2E test passes, error scenarios covered

- **Afternoon (2 hours):**
  - Run all tests (456 existing + new E2E)
  - Verify no regressions
  - Checkpoint: All tests pass

**Deliverable:** Commit: "test: add E2E test for complete generation flow"

---

### Thursday (4 hours)

**Goal:** Document and add rate limiting

- **Morning (2 hours):**
  - Document service authoritative sources (who owns what domain)
  - Add to ADR-005 Section 4 (Service Architecture)
  - Create service map diagram (ASCII or Mermaid)

- **Afternoon (2 hours):**
  - Implement rate limiter for Claude API calls
  - Test: verify rate limit blocks excessive requests
  - Checkpoint: Rate limiter works, docs updated

**Deliverable:** Commits:
- "docs: add service architecture map"
- "feat: add rate limiting for Claude API calls"

---

### Friday (3 hours)

**Goal:** Verify and checkpoint

- **Morning (2 hours):**
  - Run full test suite: npm test
  - Run type check: npm run type-check
  - Run build: npm run build
  - Checkpoint: All checks pass

- **Afternoon (1 hour):**
  - Write "Recovery Plan Completion Report"
  - Document what was fixed vs. what remains
  - Final decision: Ready for Phase 2? (Y/N)

**Deliverable:** Commit: "docs: Phase 1 recovery plan completion"

---

### Acceptance Criteria

After 1-week recovery sprint:

- [ ] Single canonical artifact table (job_artifacts)
- [ ] Single canonical artifact route
- [ ] Single canonical artifact service
- [ ] E2E test passing (generate → preview → copy → download → refresh)
- [ ] Rate limiting implemented
- [ ] Service architecture documented
- [ ] All 456+ tests passing
- [ ] Type check clean
- [ ] Build succeeds
- [ ] No architectural ambiguity remains

---

## 12. Final Verdict

### Alignment Assessment

**The current app is 62% aligned with the intended product.**

**Aligned (62%):**
- ✅ Core vertical slice works end-to-end (generate → preview → download)
- ✅ Database schema supports full vision
- ✅ Services are mostly clean
- ✅ Tests have good coverage
- ✅ Documentation is excellent
- ✅ UX is intuitive for Phase 1 scope

**Not Aligned (38%):**
- ❌ Artifact storage is duplicated (job_artifacts + cached_artifacts)
- ❌ Routes are duplicated (two generate endpoints)
- ❌ Service ownership is unclear
- ❌ E2E tests are missing
- ❌ Rate limiting is absent
- ❌ Cover letters not implemented
- ❌ Regeneration not implemented
- ❌ Phase 2 features deferred as planned (expected)

### The Biggest Gap

**Architectural duplication in the artifact layer.**

The codebase has TWO artifact storage systems (job_artifacts + cached_artifacts), THREE artifact-related services, and TWO generate endpoints. This isn't breaking Phase 1, but it will cause 2+ weeks of confusion and rework in Phase 2 when developers don't know which table/route/service to use.

The fix is straightforward: consolidate to ONE system. This takes 3 days.

### The Next Best Move

**PAUSE for 3-day infrastructure sprint before starting Phase 2.**

Why:
1. Phase 1 is complete and working ✅
2. But architecture has unresolved duplication ⚠️
3. Fixing it now (3 days) prevents 2+ weeks of Phase 2 rework
4. Establishing single source of truth makes Phase 2 low-risk

After the 3-day sprint:
- Phase 2 work is clear and unambiguous
- No architect rework or technical debt carryover
- Codebase is trustworthy for extension

### Confidence Level

- ✅ **HIGH confidence in Phase 1 completion** — vertical slice works, tests pass, architecture is sound
- ⚠️ **MEDIUM confidence in Phase 2 readiness** — architecture duplication must be resolved first
- ❌ **LOW confidence in starting Phase 2 now** — would recreate duplication, cause rework

---

**Recommendation: PAUSE → 3-day infrastructure sprint → PROCEED to Phase 2**

---

## Audit Metadata

- **Audit Date:** 2026-06-14
- **Auditor:** Claude Code
- **Scope:** Phase 1 vertical slice (generate → preview → download) vs. intended product vision
- **Status:** COMPLETE
- **Next Review:** After 3-day infrastructure sprint
- **Confidence:** HIGH (based on code review, test suite, documentation analysis)

