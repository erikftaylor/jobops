# Phase 1 Gap Audit Against Specifications

**Date:** June 14, 2026  
**Status:** Audit complete → 3 gaps identified → Fixes in progress  

---

## Summary

| Category | Status | Count |
|----------|--------|-------|
| Implemented as Specified | ✅ | 18/21 |
| Intentionally Deferred | ✅ | 3/21 |
| Accidental Drift | ⚠️ | **1 major, 2 minor** |
| Must-Fix Before Phase 2 | 🔧 | **3 items** |

---

## Audit Results

### ✅ Implemented as Specified (18 items)

**ADR-005 Compliance:**

| Item | Spec | Implementation | Status |
|------|------|-----------------|--------|
| Database schema | job_artifacts table | ✅ Created with all fields | ✅ |
| Versioning | Auto-increment per job+type | ✅ Implemented | ✅ |
| Artifact lifecycle | draft → ready/error → archived | ✅ Implemented | ✅ |
| JSON validation | Zod schema enforcement | ✅ ResumeContentSchema | ✅ |
| Claude integration | 3-attempt retry, exponential backoff | ✅ Implemented | ✅ |
| Source-consistency | Validate companies, skills, education | ✅ Basic checks | ✅ |
| Hallucination disclaimer | "User review required" | ✅ Documented | ✅ |
| Rendered text | Plain text fallback | ✅ Implemented | ✅ |
| Career doc versioning | Store career_doc_version_id | ✅ In schema | ✅ |
| Metadata tracking | prompt_version, model | ✅ Stored | ✅ |
| POST /generate endpoint | Generate resume | ✅ Implemented | ✅ |
| GET /artifact endpoint | Retrieve single artifact | ✅ Implemented | ✅ |
| GET /artifacts endpoint | List by job | ✅ Implemented | ✅ |
| Error responses | Structured error format | ⚠️ Partial (see below) | ⚠️ |
| Copy to clipboard | Frontend capability | ✅ Implemented | ✅ |
| Download button | Trigger PDF export | ✅ Implemented | ✅ |
| Version badge | Display V1, V2, etc. | ✅ Implemented | ✅ |
| Modal preview | Full resume preview | ✅ Implemented | ✅ |
| Persistence | Artifacts survive refresh | ✅ Database-backed | ✅ |

---

### ⚠️ Accidental Drift (3 items)

#### 1. **MAJOR: PDF Rendering Architecture** 🔴

**ADR-005 Spec:**
```
Artifact JSON
  ↓
PDFExportService.render()
  ├─ Select template (resume)
  ├─ Render to HTML using template
  │  └─ Template enforces: single column, standard headings,
  │     readable typography, no graphics, no icons
  ├─ Convert HTML → PDF
  └─ Return PDF bytes
```

**Current Implementation:**
- Takes `rendered_text` (plain text)
- Creates PDF directly from text with pdfkit
- **Skips HTML templating layer**
- No template control over layout
- No HTML → PDF structured conversion

**Why This is Drift:**
- ADR-005 explicitly requires "structured rendering, not raw text"
- Template layer ensures ATS-safe layout, consistency
- Missing template means no debuggable HTML intermediate
- Can't inspect what will render before PDF generation
- Harder to add cover letter templates later

**Impact:** Moderate
- PDF still works and is ATS-safe (text-based)
- But architecture doesn't match spec
- Will cause rework when adding cover letters

**Fix Required:** ✅ YES

---

#### 2. **MINOR: Error Response Consistency** 🟡

**ADR-005 & SPEC-001 Spec:**
```json
{
  "status": 200,
  "data": { ... }
}
```

**Current State:**
- Some endpoints use `{ status, error }` pattern
- Some use `{ status, data }` pattern
- Mix of both in job-artifacts routes
- Not fully consistent across all error codes

**Impact:** Low
- API is functional
- But inconsistent response format

**Fix Required:** ✅ YES (minor)

---

#### 3. **MINOR: Missing Stale Artifact Check** 🟡

**ADR-005 Spec:**
> "Track career_doc_version_id for reproducibility"

**Current Implementation:**
- Stores `career_doc_version_id` in schema ✅
- But API doesn't return `isStale: true` when versions differ

**Impact:** Low
- No UI requirement in Phase 1
- But API should surface the information
- Frontend can't warn user about stale artifacts

**Fix Required:** ✅ YES (simple addition)

---

### ✅ Intentionally Deferred (3 items)

| Item | Phase | Reason |
|------|-------|--------|
| Cover letters | 2 | Out of scope for vertical slice |
| Regeneration with positioning | 2 | Requires additional UX |
| Version comparison UI | 2 | Requires additional UI components |

---

## Detailed Findings

### Finding 1: PDF Architecture (MUST FIX)

**Current Flow:**
```
Artifact.renderedText (plain text)
  ↓
PDFDocument.text()  ← Directly add text
  ↓
PDF bytes
```

**Required Flow:**
```
Artifact.jsonContent (structured)
  ↓
PDFTemplate.render()  ← Select template
  ↓
HTML string  ← Template applies layout rules
  ↓
html-to-pdf converter
  ↓
PDF bytes
```

**Action Items:**
1. Create `PDFTemplate` class that renders JSON → HTML
2. Implement template with ATS-safe structure
3. Update PDFExportService to use template
4. Verify PDF output matches HTML layout
5. Test with various resume structures

**Effort:** 2-3 hours
**Risk:** Low (existing PDF still works as fallback)
**Blocking:** Yes for Phase 2 (cover letters need same approach)

---

### Finding 2: Error Response Format (MUST FIX)

**Current Issues:**
- `POST /generate`: `{ status, data, error }`
- `GET /artifact`: `{ status, data, error }`
- `POST /pdf`: `{ status, error }` (missing data field structure)

**Required Format:**
```json
{
  "status": 200,
  "data": { ... }   // or null on error
}

// Error case:
{
  "status": 400,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable message",
    "details": {}
  }
}
```

**Action Items:**
1. Audit all routes for consistent format
2. Fix job-artifacts.ts routes
3. Add `details` field for error context
4. Test all error paths

**Effort:** 1-2 hours
**Risk:** Low (backward compatible)
**Blocking:** No for Phase 2 (but good to have)

---

### Finding 3: Stale Artifact Detection (MUST FIX)

**Current State:**
- Schema stores `career_doc_version_id`
- API doesn't check if it matches current version
- Frontend can't warn about stale artifacts

**Required Implementation:**
```json
{
  "id": "artifact-1",
  "isStale": false,  // ← Add this field
  "careerDocVersionId": "hash-v1",
  ...
}
```

**Action Items:**
1. Compare artifact's `career_doc_version_id` with current
2. Add `isStale` to API response
3. Simple boolean (no complex logic in Phase 1)

**Effort:** 30 minutes
**Risk:** Low (purely additive)
**Blocking:** No, but useful signal

---

## Test Coverage Gaps

### Source-Consistency Validation

**Current Tests:**
- None! (validation happens in service but not explicitly tested)

**Required Tests:**
- ✅ Reject artifact with hallucinated company
- ✅ Reject artifact with unsupported skill
- ✅ Reject artifact with invalid education
- ✅ Accept artifact with all valid data
- ✅ Error message clarity

**Action Items:**
1. Create test fixtures with hallucinated data
2. Add tests to ResumeGeneratorService tests
3. Document what validation catches vs doesn't catch

**Effort:** 1-2 hours
**Risk:** Low (tests only, no production changes)
**Blocking:** No, but improves confidence

---

## Phase 2 Readiness

### Blocking Issues (Fix Before Phase 2)

1. ✅ PDF Architecture — Needed for cover letter templates
2. ✅ Error Response Format — Needed for consistency
3. ✅ Stale Artifact Check — Needed for artifact lifecycle

### Non-Blocking (Can Fix in Phase 2)

- Advanced error details
- Analytics/metrics
- Performance optimization

---

## Recommendations

### Priority 1: Fix PDF Architecture (Critical)
- Most important for Phase 2 (cover letters need this)
- Aligns with spec
- Low risk (backward compatible)

### Priority 2: Fix Error Response Format (High)
- Improves API consistency
- Low effort
- No risk

### Priority 3: Add Stale Artifact Check (Medium)
- Quick addition
- No UI needed yet (just API field)
- Enables future UI warnings

### Priority 4: Add Source-Consistency Tests (Medium)
- Improves testing confidence
- Documents validation behavior
- Doesn't affect production

---

## Sign-Off

**Gaps Found:** 3 (1 major, 2 minor)  
**Fixes Required:** 3  
**Effort Estimate:** 4-6 hours  
**Risk Level:** LOW  
**Phase 2 Readiness:** CONDITIONAL (after fixes)  

---
