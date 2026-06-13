# Phase 4: Analysis Engine — Triage + Gap Table — COMPLETE ✅

**Date:** June 13, 2026  
**Status:** COMPLETE — Real Claude integration ready for first job analysis

---

## Overview

Phase 4 introduces the **first real Claude integration**. The app can now analyze a job description against the parsed Master Career Document and generate:

1. Triage verdict (APPLY, STRETCH, SKIP)
2. Estimated ATS fit score with explanation
3. Gap table with confidence levels
4. Red flags and remaining gaps
5. Recommended positioning angle
6. Terminology mapping for reframing

**The analysis runs server-side only.** Claude API key never reaches the client.

---

## Backend Implementation

### 1. Claude Client Service (`src/server/services/claude.service.ts`)

**Server-only Claude API client:**

```typescript
class ClaudeService {
  private client: Anthropic | null = null;
  private model: string = "claude-sonnet-4-6";

  async analyzeJobWithJSON<T>(prompt: string): Promise<T>
}
```

**Features:**
- ✅ Initializes with ANTHROPIC_API_KEY from .env (never exposed to client)
- ✅ Uses configured model from settings (default: claude-sonnet-4-6)
- ✅ Structured JSON response support with retry logic
- ✅ Graceful error handling:
  - Invalid API key → 401 error
  - Rate limiting → 429 error
  - JSON parse failures → Retry with hint
- ✅ Useful error messages (e.g., "Check ANTHROPIC_API_KEY in .env")

**Error Handling:**
- Missing API key: "Claude API key not configured. Set ANTHROPIC_API_KEY in .env"
- Invalid key: "Invalid Claude API key. Check ANTHROPIC_API_KEY in .env"
- Rate limit: "Claude API rate limited. Please try again in a moment."
- Timeout: Wrapped and re-thrown with context

### 2. Prompt Loading

**Prompt files loaded from `/prompts` directory:**

1. **ats-rules.md** — Scoring methodology (keyword match 40%, experience 35%, role fit 15%, soft gaps 10%)
2. **matching-rubric.md** — Job-to-CV matching framework (required/preferred analysis, gaps, red flags, terminology)

**Loading behavior:**
- ✅ Fails with clear error if prompt files missing
- ✅ Files bundled into prompt sent to Claude
- ✅ Graceful handling if directory doesn't exist

**Error message:**
```
"Failed to load prompt file: ats-rules.md. 
 Ensure ./prompts/ats-rules.md exists."
```

### 3. Analysis Schema (`src/server/schemas/analysis.schema.ts`)

**Zod validation for Claude response:**

```typescript
AnalysisResult {
  company: string
  roleTitle: string
  seniority: "junior|mid|senior|lead|executive"
  verdict: "APPLY|STRETCH|SKIP"
  
  estimatedATSFit: {
    score: 0-100
    label: "Poor|Fair|Good|Excellent"
    explanation: string
    formulaNote: "Estimated ATS fit — internal heuristic, not a platform score."
  }
  
  requiredRequirements: string[]
  preferredRequirements: string[]
  
  gapTable: {
    requirement: string
    type: "required|preferred"
    confidence: "DIRECT|TRANSFERABLE|ADJACENT|GAP"
    evidence: string
    evidenceSource?: string
    recommendedFraming: string
    risk?: string
  }[]
  
  redFlags: string[]
  terminologyMap: Record<string, string>
  recommendedAngle: string
  topStrengths: string[]
  remainingGaps: string[]
  followUpQuestions: string[]
}
```

**Validation:**
- ✅ Enforces all required fields
- ✅ Type-safe enum validation (verdict, seniority, confidence levels)
- ✅ Score range validation (0-100)
- ✅ Rejects malformed Claude responses

### 4. Analysis Service (`src/server/services/analysis.service.ts`)

**Orchestrates the analysis pipeline:**

**Methods:**

1. **`analyzeJob(jobId, jobDescription)`**
   - Validates job exists
   - Loads career document (fails if not parsed)
   - Loads settings (thresholds, model name)
   - Loads all prompts (fails if missing)
   - Composes prompt with context
   - Calls Claude API
   - Validates response with Zod
   - Returns AnalysisResult

2. **`persistAnalysis(jobId, analysis, careerDocHash)`**
   - Saves full analysis JSON to `analyses` table
   - Stores fit score and confidence
   - Records career doc version used
   - Records model name used
   - Returns analysisId

3. **`formatFindingsMessage(analysis)`**
   - Converts AnalysisResult to human-readable markdown
   - Shows verdict, ATS fit, strengths, gaps, questions
   - Ready to post to chat_messages

**Prompt Composition:**
- Career document (parsed JSON)
- Job description (full text)
- ATS rules + matching rubric
- User settings (thresholds)
- Positioning angles
- Clear instructions with examples
- Validation rules:
  - Never invent skills
  - Use DIRECT only with evidence
  - Use TRANSFERABLE/ADJACENT for weak evidence
  - Use GAP if no evidence
  - Always include formula note for ATS fit

### 5. Analysis Routes (`src/server/routes/analysis.ts`)

**Endpoint:**

```
POST /api/jobs/:id/analyze
```

**Behavior:**

1. Validate job exists
2. Validate job description exists
3. Load career document (fail if missing)
4. Call analysis service
5. Persist analysis to `analyses` table
6. Update job state to `analyzed`
7. Write findings message to `chat_messages`
8. Return analysis JSON

**Error Responses:**

| Scenario | Code | Status | Message |
|----------|------|--------|---------|
| Job not found | NOT_FOUND | 404 | Job {id} not found |
| Missing JD | VALIDATION_ERROR | 400 | Job description is required |
| Career doc missing | MISSING_CAREER_DOCUMENT | 400 | Master Career Document not found |
| Claude fails | ANALYSIS_FAILED | 503 | Claude analysis failed: {reason} |
| Server error | SERVER_ERROR | 500 | Internal server error |

---

## Frontend Implementation

### 1. Updated Studio Panel

**Replaced mock controls with real analysis:**

**State: draft**
- Button: "Analyze Job" (not "Mock Analyze")
- Loading state: "Analyzing..."
- Error display: Red error box with message

**After analysis:**
- Shows verdict badge (APPLY/STRETCH/SKIP in color-coded box)
- Shows estimated ATS fit with score, label, explanation
- Shows formula note: "Estimated ATS fit — internal heuristic, not a platform score."
- Shows top 3 strengths
- Shows top 3 red flags (in red)
- Shows remaining gaps
- Shows recommended positioning angle
- Link to chat for full details

**Styling:**
- Verdict colors: Green (APPLY), Yellow (STRETCH), Red (SKIP)
- Score displayed prominently (24px, blue)
- Each section in light gray box
- Clear typography hierarchy

### 2. Chat Panel Updates

**Displays analysis findings message:**
- System message auto-posted after analysis
- Contains verdict, ATS fit, strengths, gaps, questions
- Formatted as markdown
- Persists after reload

### 3. Sources Panel Updates

(Prepared for Phase 5 - triage score display)

---

## Database Changes

### analyses Table

**New records created after analysis:**

```sql
INSERT INTO analyses (
  id, job_id, analyzed_at, career_doc_version_hash, model,
  fit_score, skills_match, experience_gaps, positioning_suggestions,
  fit_justification, confidence_score
)
```

**Stored data:**
- Full AnalysisResult JSON in `fit_justification`
- Fit score extracted for quick access
- Career doc hash for audit trail
- Model name for reproducibility

### chat_messages Table

**New message created:**

```sql
INSERT INTO chat_messages (
  id, job_id, role, content, message_type, created_at
)
VALUES (
  '{id}', '{jobId}', 'assistant',
  '{formatted findings}', 'chat', '{now}'
)
```

**Message content:**
- Verdict, ATS fit, strengths, gaps, questions
- Markdown formatted
- Human-readable, not code

---

## Error Handling

**Graceful degradation:**

✅ Missing API key → App still works, analysis returns clear error
✅ Missing prompt files → Clear file path in error message
✅ Invalid career document → Fails with helpful message
✅ Claude timeout → Wrapped error with context
✅ Malformed JSON → Retry with hint, then fail with details
✅ Missing job description → Validation error, clear message

**Error messages are:**
- Specific (naming the file/key/problem)
- Actionable (what to do next)
- Not silent failures

---

## Anti-Fabrication Safeguards

✅ **Every evidence must cite career document**
- DIRECT: Exact match in career doc
- TRANSFERABLE: Similar skill, requires adaptation
- ADJACENT: Related skill, learning curve needed
- GAP: No evidence in career doc

✅ **ATS fit always labeled as estimate**
- Formula note: "Estimated ATS fit — internal heuristic, not a platform score."
- Included in every analysis response

✅ **No invented metrics**
- Gap table shows only what exists or what's missing
- Red flags are specific and evidence-based
- Terminology map maps JD terms to actual background

✅ **Server-side validation**
- Zod schema enforces structure
- Claude prompted with clear rules
- Error handling catches malformed responses

---

## Files Created/Modified

### New Files
- `src/server/services/claude.service.ts` — Claude API client
- `src/server/services/analysis.service.ts` — Analysis orchestration
- `src/server/routes/analysis.ts` — Analysis endpoints
- `src/server/schemas/analysis.schema.ts` — Zod validation
- `prompts/ats-rules.md` — Scoring methodology
- `prompts/matching-rubric.md` — Matching framework

### Modified Files
- `src/server/index.ts` — Initialize Claude, register analysis routes
- `src/client/features/jobs/components/StudioPanel.tsx` — Real analysis UI
- `src/client/features/jobs/pages/JobsPage.tsx` — Handle analysis refresh
- `src/client/features/jobs/styles/studio-panel.css` — New analysis styles
- `package.json` — Added @anthropic-ai/sdk dependency

---

## Test Results

### API Tests

```
✅ POST /api/jobs/:id/analyze → Returns analysis JSON + message
✅ Job state updated to "analyzed"
✅ Chat message persisted with findings
✅ Verdict assigned correctly (APPLY/STRETCH/SKIP)
✅ ATS fit score 0-100 with explanation
✅ Gap table populated with confidence levels
✅ Error handling works (invalid key, missing career doc)
```

### Error Handling Tests

```
✅ Missing ANTHROPIC_API_KEY → Returns 503 ANALYSIS_FAILED
✅ Missing job description → Returns 400 VALIDATION_ERROR
✅ Missing career document → Returns 400 MISSING_CAREER_DOCUMENT
✅ Malformed Claude JSON → Retries and fails with clear message
```

### Database Verification

```
✅ analyses table updated with new record
✅ chat_messages table has findings message
✅ Job state changed from draft to analyzed
✅ Career doc hash stored with analysis
✅ Model name recorded
```

---

## Build & Deployment Verification

| Check | Result | Command |
|-------|--------|---------|
| Type checking | ✅ | npm run type-check (0 errors) |
| Build client | ✅ | npm run build:client (dist/client built) |
| Build server | ✅ | npm run build:server (dist/server.js built) |
| Dev server start | ✅ | npm run dev (both servers start) |
| Health endpoint | ✅ | Claude API status returned |
| Routes registered | ✅ | /api/jobs/:id/analyze available |
| Settings loaded | ✅ | Model name from settings used |

---

## Prompt Engineering Notes

**Prompt strategy:**
1. Context setting (role, task, rules)
2. Career document (full parsed JSON)
3. Job description (full text)
4. Scoring rules (40-35-15-10 breakdown)
5. Matching rubric (framework for analysis)
6. Positioning angles (for recommendation)
7. User thresholds (for verdict)
8. Clear JSON structure with examples
9. Validation rules (don't invent, use proper confidence levels)
10. Output format specification

**Retry strategy:**
- First attempt: Extract JSON from code blocks or raw text
- If parse fails: Ask Claude to retry without markdown formatting
- If still fails: Return error with details

---

## Known Limitations & Design Decisions

1. **Prompt Files Not Cached**
   - Reloaded on every analysis
   - Could optimize by caching at startup
   - Currently simple and flexible

2. **No Streaming**
   - Analysis waits for full Claude response
   - UI shows loading spinner, then full results
   - Future phase could stream to chat

3. **No Refinement Loop**
   - Single pass analysis
   - User must create new jobs to retry
   - Phase 5+ could add conversational refinement

4. **Career Doc Placeholder Warning Only**
   - App works with template document
   - Shows warning in UI
   - Doesn't block analysis (would be helpful for testing)

5. **Model Hardcoded in Composer**
   - Doesn't handle vision models
   - Assumes text-only Claude API
   - Sufficient for current requirements

---

## What's Ready for Phase 5

✅ Analysis engine solid and tested
✅ Prompt files load from disk and compose correctly
✅ Claude API integration working
✅ Error handling comprehensive
✅ Results persist to database
✅ Chat integration working (messages posted)
✅ UI displays analysis with formatting
✅ ATS fit labeled as estimate everywhere

**Safe to proceed with:**
- Conversational refinement (follow-up questions in chat)
- Confirmation cards (user validates gaps)
- Resume generation (using analysis results)

---

## Phase 4 Summary

**Status:** ✅ COMPLETE

Real Claude integration implemented end-to-end. Analysis endpoint working. Error handling comprehensive. All data persists. UI displays results. API key safely server-only.

**What was built:**
- Server-only Claude client (validates API key, handles errors)
- Prompt loading and composition (ATS rules + matching rubric)
- Analysis service orchestrating pipeline
- Zod schema validating Claude response
- Analysis API endpoint with error handling
- Studio panel showing analysis results
- Chat integration for findings messages

**What was verified:**
- Claude service initializes with configured model
- Analysis endpoint returns proper JSON structure
- Error handling for missing key/prompts/career doc
- Job state updated after analysis
- Findings message persisted to chat
- UI displays verdict, ATS fit, strengths, gaps
- All TypeScript strict mode (0 errors)
- Builds successfully

**Risk level:** Low ✅
**Conversational refinement safe to begin:** Yes ✅
**Resume generation safe to begin:** Yes ✅
