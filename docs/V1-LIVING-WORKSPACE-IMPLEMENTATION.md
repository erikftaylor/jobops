# v1.0 Living Workspace Implementation Plan

**Date:** 2026-06-14  
**Status:** IMPLEMENTATION PLAN  
**Goal:** Redesign from 3-panel dashboard to single intelligent workspace

---

## Current State Summary

### Current Architecture
- **Layout:** 3-panel grid (left, center, right)
- **Components:**
  - `ApplicationStudioPage` (orchestrator)
  - `CareerMemoryPanel` (left panel)
  - `JobInputPanel` (left panel)
  - `StrategyCoachPanel` (center panel)
  - `DocumentStudioPanel` (right panel)
  - `RecentApplicationsPanel` (left panel)
- **Styling:** CSS Grid, card-based, multiple borders
- **State:** Zustand (useJobs, useMessages, useArtifacts)
- **Backend:** Fully implemented, working

### Current Issues
- Visual clutter (too many panels, cards, buttons)
- Technical metadata visible (artifact IDs, versions, hashes)
- Chat-first analysis UX (requires scrolling, asking questions)
- Career Memory as primary focus (should be secondary)
- Recent Applications as separate section (should be at bottom)
- No single primary input flow

---

## New Architecture

### New Layout (Single Scrollable Page)

```
┌─────────────────────────────────────────┐
│ Application Studio                      │  ← Header
│ Career Memory Ready ✓                   │  ← Status
│ Updated today | Manage →                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Job Description                         │  ← Section 1
│                                         │
│ [ Large textarea ]                      │  ← Primary input
│                                         │
│ Company: [ __ ]  Title: [ __ ]          │  ← Optional fields
│                                         │
│ [ Analyze Job ]                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Analysis                                │  ← Section 2
│                                         │
│ Fit: Excellent                          │
│ You're a strong match...                │
│ Lead with...                            │
│ Potential gap: ...                      │
│ Positioning: ...                        │
│                                         │
│ [ Ask Strategy Coach ]                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Documents                               │  ← Section 3
│ [ Resume ] [ Cover Letter ]             │  ← Tab switcher
│                                         │
│ Resume                                  │
│ Ready | Updated 2 minutes ago           │
│                                         │
│ [ preview area ]                        │
│                                         │
│ [ Copy ] [ Download PDF ] [ Regenerate ]│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Application                             │  ← Section 4
│                                         │
│ Ready once submitted.                   │
│                                         │
│ Resume ✓                                │
│ Cover Letter ✓                          │
│                                         │
│ [ Record Application ]                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Recent Applications                     │  ← Section 5
│                                         │
│ TechCorp — Senior Engineer              │
│ Applied Jun 15                          │
│                                         │
│ StartupInc — Product Manager            │
│ Applied Jun 14                          │
│                                         │
│ [more items...]                         │
└─────────────────────────────────────────┘
```

### Component Structure

**From (Old):**
```
ApplicationStudioPage
  ├── CareerMemoryPanel
  ├── JobInputPanel
  ├── StrategyCoachPanel
  ├── DocumentStudioPanel
  └── RecentApplicationsPanel
```

**To (New):**
```
ApplicationStudioPage (single column, scrollable)
  ├── ApplicationStudioHeader (Career Memory status)
  ├── JobDescriptionSection (large textarea)
  ├── AnalysisSummary (decision-first display)
  ├── DocumentsSection (tabs: Resume | Cover Letter)
  ├── ApplicationRecorder (quiet completion)
  └── RecentApplicationsList (bottom, minimal)
```

**Strategy:** New components wrap existing logic, don't duplicate

---

## Implementation Plan

### Phase 1: Structure & Layout (Day 1)

**Changes to ApplicationStudioPage:**
1. Remove grid layout (3 columns)
2. Change to single column, vertical scroll
3. Remove panel headers (use section headers instead)
4. Consolidate state management (no changes to logic)

**New CSS:**
- Single column layout (max-width 900px, centered)
- Vertical spacing (32px between major sections)
- Whitespace-based hierarchy (no borders)

**No backend changes. No state changes. Structure only.**

### Phase 2: Component Simplification (Day 2)

**CareerMemoryPanel → ApplicationStudioHeader**
- Shrink from large card to tiny status line
- Show: "Career Memory Ready ✓ | Updated today | Manage →"
- Keep modal functionality for "Manage" button
- Hide all metadata (versions, sections, hashes)

**JobInputPanel → JobDescriptionSection**
- Remove "Saved Jobs" list (distraction)
- Make textarea primary (large, 400px height)
- Keep optional company/title/URL fields (compact)
- One clear "Analyze Job" button

**StrategyCoachPanel → AnalysisSummary**
- Remove chat interface from main view
- Show analysis as summary (fit, why, what, gaps, positioning)
- Make chat collapsible ("Ask Strategy Coach" link)
- Copy should be warm and human (not technical)

**DocumentStudioPanel → DocumentsSection**
- Replace 2 cards with 1 tabbed interface
- Tab switcher: "Resume | Cover Letter"
- Show: Document name, status, timestamp, actions
- Hide: artifact IDs, versions, hashes, internal state

**RecentApplicationsPanel → RecentApplicationsList**
- Move from left panel to bottom of page
- Minimal: company, role, date (no cards, no borders)
- Max 10 items
- Empty state only if truly empty

### Phase 3: Styling & Polish (Days 2-3)

**Typography:**
- 4 sizes only: Hero (32px), Section (20px), Body (16px), Caption (12px)
- Consistent line-height (1.6 for body, 1.3 for headings)

**Colors:**
- Use only 6: Background, Surface, Primary, Success, Warning, Danger
- No custom color names, no rainbow UI

**Spacing:**
- Sections: 32px vertical gap
- Cards/groups: 16px padding, 16px gap
- Elements: 8px gap
- Whitespace creates hierarchy (not borders)

**Buttons:**
- 3 types: Primary (blue, large), Secondary (bordered), Text (link-style)
- Consistent 12px padding, 12px radius
- No variant proliferation

### Phase 4: Copy & Microcopy (Day 3)

**Replace:**
- "Version 3" → "Ready"
- "Hash: a2f8c9d1" → "Updated 2 minutes ago"
- "Artifact: resume_v4" → "Resume"
- "Status: generated" → "Updated just now"

**Tone:**
- Warm, not corporate
- "Paste a job description to get started"
- "You're a strong match"
- "Everything is ready to send"
- No technical jargon, no internal state

### Phase 5: Testing & Verification (Day 3-4)

**Unit Tests:**
- Workspace renders as single column
- Career Memory shows status bar
- Job textarea accepts paste
- Analysis summary appears after analysis
- Documents show both Resume and Cover Letter
- Application recorder shows completion
- Recent applications displays list

**Integration Tests:**
- Full workflow: paste → analyze → generate → export → record
- No technical metadata visible
- No artifact IDs or versions shown
- Keyboard navigation works

**User Acceptance:**
- New user completes workflow in < 5 minutes
- User never asks "What do I do now?"
- User feels app is finished, not in progress

---

## Files to Create

```
docs/V1-LIVING-WORKSPACE-IMPLEMENTATION.md  ← (this file)
```

## Files to Modify

**Frontend Components:**
```
src/client/features/studio/pages/ApplicationStudioPage.tsx
src/client/features/studio/components/CareerMemoryPanel.tsx
src/client/features/studio/components/JobInputPanel.tsx
src/client/features/studio/components/StrategyCoachPanel.tsx
src/client/features/studio/components/DocumentStudioPanel.tsx
src/client/features/studio/components/RecentApplicationsPanel.tsx

src/client/features/studio/styles/application-studio.css
src/client/features/studio/styles/career-memory-panel.css
src/client/features/studio/styles/job-input-panel.css
src/client/features/studio/styles/strategy-coach-panel.css
src/client/features/studio/styles/document-studio-panel.css
src/client/features/studio/styles/recent-applications-panel.css
```

**Tests:**
```
src/client/features/studio/components/__tests__/ApplicationStudioPage.test.tsx
src/client/features/studio/components/__tests__/DocumentStudioPanel.test.tsx
[others as needed]
```

## Files to PRESERVE (No Changes)

**Backend Services:**
```
src/server/services/career-model.service.ts
src/server/services/resume-generator.service.ts
src/server/services/cover-letter-generator.service.ts
src/server/services/artifact.service.ts
src/server/services/pdf-export.service.ts
src/server/services/job.service.ts
src/server/services/fit-analyzer.service.ts
```

**API Routes:**
```
src/server/routes/jobs.ts
src/server/routes/job-artifacts.ts
src/server/routes/artifacts.ts
[all other routes]
```

**Database:**
```
All migrations, schemas, connections
```

**Tests (Backend):**
```
All existing backend tests
```

---

## State Management (No Changes)

**What Stays:**
- `useJobs` hook (job CRUD, state transitions)
- `useMessages` hook (chat/strategy coach)
- `useArtifacts` hook (resume/cover letter generation)
- Zustand stores (unchanged)
- API calls (unchanged)

**What Changes:**
- No new state needed
- Component props may simplify (less "optional" states)
- Event handlers consolidate (fewer callbacks)
- No central dashboard state (progressive disclosure instead)

---

## Data Flow (Preserved)

```
User pastes job
  ↓ (same)
POST /api/jobs/
  ↓ (same)
Job created, state = "draft"
  ↓ (same)
User clicks "Analyze Job"
  ↓ (same)
POST /api/jobs/{id}/analyze
  ↓ (same)
FitAnalyzerService + Strategy generation
  ↓ (same)
Analysis stored in state
  ↓ (new: shown in summary, not chat)
User clicks "Generate Resume"
  ↓ (same)
POST /api/jobs/{id}/artifacts/generate?type=resume
  ↓ (same)
ResumeGeneratorService creates artifact
  ↓ (same)
Artifact stored, returned to frontend
  ↓ (new: shown as "Ready", not "Version 3")
User clicks "Record Application"
  ↓ (same)
POST /api/jobs/{id}/mark-applied
  ↓ (same)
Job state = "applied", timestamp saved
  ↓ (new: shown as quiet completion, not modal)
Application appears in Recent Applications
  ↓ (same)
GET /api/jobs/applications/recent fetches list
```

---

## Visual Changes Summary

| Element | Before | After |
|---------|--------|-------|
| Layout | 3-panel grid | 1 column, scroll |
| Career Memory | Large card | Tiny status line |
| Job Input | Form + saved jobs list | Large textarea |
| Strategy | Chat-first, scrollable | Summary display |
| Documents | 2 separate cards | 1 tabbed interface |
| Application | Small button | Quiet completion |
| Recent Apps | Separate panel | Bottom list |
| Metadata | Visible (versions, hashes) | Hidden |
| Buttons | Multiple styles | 3 types only |
| Colors | 8+ colors | 6 colors only |
| Spacing | Inconsistent (32px everywhere) | Semantic (8/16/32/64px) |

---

## Success Criteria (Per Section)

### Job Description
- ✅ Large textarea is primary focus
- ✅ Paste works smoothly
- ✅ Optional fields are compact
- ✅ "Analyze Job" button is clear

### Analysis
- ✅ Fit score/label visible immediately
- ✅ Human-readable summary (not chat)
- ✅ No technical language
- ✅ Chat is optional collapse

### Documents
- ✅ Resume and Cover Letter tabs
- ✅ No artifact IDs or versions
- ✅ Status is human language ("Ready")
- ✅ Timestamp is relative ("2 minutes ago")
- ✅ Actions are copy/download/regenerate

### Application
- ✅ Quiet completion, no celebration
- ✅ Shows what was used
- ✅ "Record Application" button is clear

### Recent Applications
- ✅ Bottom of page, scrollable
- ✅ Company — Role format
- ✅ Applied date in relative format
- ✅ Max 10 items

---

## Testing Strategy

### Unit Tests (Existing)
- Keep all backend tests (no changes)
- Update frontend tests for new component structure
- Add tests for workspace layout

### New Tests
```
✅ ApplicationStudioPage renders as single column
✅ Career Memory shows status ("Ready ✓")
✅ Job textarea appears with placeholder
✅ Analysis summary appears after analysis (not chat)
✅ Documents show Resume and Cover Letter tabs
✅ Document status shows "Ready" (not "version 3")
✅ Application section shows completion (not button)
✅ Recent Applications list appears at bottom
✅ No artifact IDs visible
✅ No technical metadata visible
✅ Keyboard navigation works
✅ Full workflow runs in < 5 minutes
```

### User Acceptance
- New user can complete job → analysis → documents → record in < 5 minutes
- User never sees "Version 3", "Hash", "Artifact ID"
- User never asks "What do I do now?"

---

## Rollback Plan (If Needed)

If new layout breaks functionality:
1. Revert ApplicationStudioPage to grid layout
2. Restore individual panels
3. Keep backend changes (they're solid)
4. Plan v2.0 redesign

---

## Estimated Timeline

- **Day 1:** Layout restructure (grid → column)
- **Day 2:** Component simplification + styling
- **Day 3:** Copy tone + polish + tests
- **Day 4:** User testing + fixes

---

## Key Principles (Throughout)

1. **One primary input** → Job description textarea
2. **Progressive disclosure** → Hide optional complexity
3. **Human language only** → No artifact/version/hash terminology
4. **Quiet confidence** → Calm completion, not celebration
5. **Single scroll** → No hidden navigation
6. **Calm premium UI** → Whitespace > borders, fewer colors

---

## Next Steps

1. ✅ Approve this plan
2. Implement Phase 1 (layout)
3. Implement Phase 2 (components)
4. Implement Phase 3 (styling)
5. Implement Phase 4 (copy)
6. Run tests
7. User acceptance testing
8. Launch v1.0

---

**Ready to implement.** Proceeding to phase 1.
