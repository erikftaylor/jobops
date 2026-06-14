# JobOps Known Issues & Technical Debt

**Version:** 1.0.0-rc1  
**Updated:** 2026-06-13

This document tracks known issues, limitations, and technical debt for JobOps. Issues are categorized by priority and planned remediation.

---

## P1 Issues (Should Fix Before or Shortly After GA)

### 1. Settings Modal Not Fully Implemented

**Status:** Known limitation  
**Priority:** P1 — Affects user experience  
**Severity:** Medium — Buttons present but non-functional

#### Description
The Settings button is present in the UI but the modal content is not fully implemented. Users clicking the button see an empty or incomplete modal.

#### Impact
- Users cannot access settings
- Confusing user experience
- Users may think features are broken

#### Workaround
- Disable settings button with tooltip "Settings coming soon"
- Or hide settings button entirely until implementation complete

#### Root Cause
Settings UI started but not completed in this release cycle.

#### Fix Plan
- Create settings modal component with basic options
- Implement theme toggle (light/dark if applicable)
- Add data export option
- Add help/documentation link
- Estimated effort: 1-2 hours

#### Post-v1.0.0 Action
- [ ] Complete settings modal implementation
- [ ] Add unit tests for settings
- [ ] Update documentation
- [ ] Push as v1.0.1 or v1.1.0 depending on feature scope

---

### 2. Career Document Import Flow Could Be Clearer

**Status:** Known limitation  
**Priority:** P1 — Affects onboarding  
**Severity:** Medium — Users may be confused on first use

#### Description
The initial setup doesn't clearly guide users to import their career document. The NewJobForm asks for a job description but doesn't explain that a career document is the primary input.

#### Impact
- First-time users may be confused
- Users may not understand the system architecture
- Reduced clarity on what "Master Career Document" means

#### Current Behavior
1. User opens app
2. Sees "Add new job" button
3. Not told to provide career document first
4. Form says "Job description is required"
5. User confused about the flow

#### Expected Behavior
1. User opens app for first time
2. Sees welcome screen or onboarding
3. Guided to provide/verify career document
4. Then shown job analysis flow

#### Workaround
- Add inline help text: "Your Master Career Document is used to analyze jobs against your background"
- Add onboarding banner on first visit
- Update README with clearer flow explanation

#### Root Cause
Feature was built assuming career document pre-loaded. First-time user flow not optimized.

#### Fix Plan
- Add onboarding screen on first visit
- Show 3-step flow: Load CV → Add job → Analyze
- Add help text to NewJobForm
- Add "About JobOps" explanation
- Estimated effort: 1-2 hours

#### Post-v1.0.0 Action
- [ ] Implement onboarding screen
- [ ] Test with first-time users
- [ ] Gather feedback
- [ ] Refine flow based on usage
- [ ] Push as v1.0.1 or v1.1.0

---

## P2 Issues (Safe Post-v1.0.0)

### 1. Health Status Display Could Include Timestamps

**Status:** Enhancement  
**Priority:** P2 — Nice to have  
**Severity:** Low — Currently shows status OK

#### Description
The health status indicator shows current state but doesn't show when last checked or allow manual refresh.

#### Improvement
```
Current:  ✅ Database: Connected
Improved: ✅ Database: Connected (checked 2 min ago)
          [Recheck] button to refresh status
```

#### Effort
- 30 minutes
- Add timestamp display
- Add "Recheck" button
- Call health endpoint on demand

#### Post-Release
- [ ] Add timestamps to health status
- [ ] Add refresh button
- [ ] Show last check time

---

### 2. Artifact Variants Could Highlight Recommended Option

**Status:** Enhancement  
**Priority:** P2 — Nice to have  
**Severity:** Low — All variants visible

#### Description
Multiple resume variants are generated, but no clear indication which is "recommended."

#### Improvement
```
Current:  Aggressive - Score: 82
          Balanced - Score: 85
          Minimal - Score: 78
          
Improved: Aggressive - Score: 82
          ⭐ Balanced - Score: 85 [RECOMMENDED]
          Minimal - Score: 78
```

#### Effort
- 30 minutes
- Identify highest-scoring variant
- Add visual badge/star
- Add explanation: "Recommended for highest fit score"

#### Post-Release
- [ ] Add "Recommended" badge
- [ ] Explain recommendation criteria
- [ ] Test with users

---

### 3. Chat Questions Could Be Organized by Category

**Status:** Enhancement  
**Priority:** P2 — Nice to have  
**Severity:** Low — All questions visible

#### Description
Current 4 questions are all in a flat list. Could be organized by category for better scanning.

#### Improvement
```
Current:  - What would worry a recruiter?
          - Where is my resume weakest?
          - Would this likely get an interview?
          - What should I improve first?

Improved: Resume Assessment
          - Where is my resume weakest?
          - What would worry a recruiter?
          
          Interview Prep
          - Would this likely get an interview?
          - What should I improve first?
```

#### Effort
- 1 hour
- Add category metadata to questions
- Render categories with grouped questions
- Test grouping

#### Post-Release
- [ ] Categorize questions
- [ ] Update RECRUITER_QUESTIONS constant
- [ ] Test UI rendering

---

### 4. Copy & Messaging Could Be Refined

**Status:** Enhancement  
**Priority:** P2 — Polish  
**Severity:** Low — Current messaging adequate

#### Current Issues
- "See Suggestion" button could be "View Details"
- "Not Relevant" could be "Dismiss This Keyword"
- Some form placeholders could be more descriptive
- Error messages could be more encouraging

#### Changes
```
Current → Improved
"See Suggestion" → "View Details"
"Not Relevant" → "Dismiss This Keyword"
"Add This Keyword" → "Add Keyword"
"Job not found" → "Job not found. Return to jobs list and try again."
```

#### Effort
- 30 minutes
- Find and replace in components
- Review error messages
- Test all paths

#### Post-Release
- [ ] Update button labels throughout
- [ ] Improve error messages
- [ ] User test for clarity

---

### 5. Analytics Could Track Feature Usage

**Status:** Enhancement  
**Priority:** P2 — Insights  
**Severity:** Low — Not critical for MVP

#### Description
No current tracking of which features are used most or which chat questions are popular.

#### Proposed Tracking
- Chat questions asked (which questions, how often)
- Artifact variants generated (which strategy chosen)
- Keywords accepted vs. dismissed
- Score improvements after changes
- Time spent per job

#### Privacy Notes
- User should opt-in
- No personal data tracked
- No resume content sent to analytics
- Aggregate data only

#### Effort
- Infrastructure already in place (AnalyticsEvent service)
- 2-3 hours to wire up event tracking
- 1 hour for privacy controls

#### Post-Release
- [ ] Plan analytics strategy
- [ ] Add privacy policy section
- [ ] Implement event tracking
- [ ] Create dashboard to view metrics

---

## P3 Items (Nice to Have Post-v1.0.0)

### 1. Bulk Keyword Operations

**Status:** Enhancement  
**Priority:** P3 — Nice to have  
**Severity:** Low — One-by-one works

#### Description
Accept or dismiss multiple keywords at once instead of one at a time.

#### Proposed UX
```
[ ] Critical Keyword 1
[ ] Critical Keyword 2
[ ] Critical Keyword 3

[Accept All] [Dismiss All] buttons
```

#### Benefit
- Faster workflow for recruiters with many missing keywords
- Bulk operations more efficient

#### Effort
- 1-2 hours
- Add checkboxes to keyword list
- Implement bulk accept/dismiss
- Update score calculation for bulk operations

---

### 2. PDF Export of Final Resume

**Status:** Enhancement  
**Priority:** P3 — Nice to have  
**Severity:** Low — Generated artifacts already useful

#### Description
Export final resume as PDF file instead of viewing in browser.

#### Proposed Feature
```
[Download PDF] button on selected artifact
→ resume_[job_name]_[date].pdf
```

#### Benefit
- Easy to apply to jobs
- Can email directly
- Portable format

#### Technical Notes
- Use puppeteer or similar for PDF generation
- Keep server-side (no client-side PDF)
- Could use Claude to format as proper PDF

#### Effort
- 2-3 hours including testing

---

### 3. Chat Transcript Export

**Status:** Enhancement  
**Priority:** P3 — Nice to have  
**Severity:** Low — History visible in app

#### Description
Export chat history and AI responses as document.

#### Proposed Formats
- PDF (formatted transcript)
- Markdown (GitHub-friendly)
- CSV (analysis results)

#### Benefit
- Keep records of analysis
- Share with team
- Offline reference

#### Effort
- 1-2 hours per format

---

### 4. Batch Job Analysis

**Status:** Enhancement  
**Priority:** P3 — Nice to have  
**Severity:** Low — Current one-at-a-time works

#### Description
Analyze multiple jobs at once to identify patterns.

#### Proposed Feature
```
Select 3+ jobs → "Analyze Batch"
↓
Results showing:
- Common keywords across jobs
- Most important skills
- Experience patterns
- Recommended positioning strategy
```

#### Benefit
- Identify trends across multiple opportunities
- Better positioning strategy
- Time savings for bulk analysis

#### Effort
- 3-4 hours for analysis engine
- 2 hours for UI

---

### 5. Side-by-Side Artifact Comparison

**Status:** Enhancement  
**Priority:** P3 — Nice to have  
**Severity:** Low — Tab switching works

#### Description
View two artifact variants side-by-side instead of switching tabs.

#### Proposed UI
```
┌─────────────────────────────────────┐
│ Balanced (85) │ Aggressive (82)     │
├─────────────────────────────────────┤
│ Summary...    │ Summary...          │
│ Experience    │ Experience          │
│ ...           │ ...                 │
└─────────────────────────────────────┘
```

#### Benefit
- Easy to compare differences
- Visual side-by-side evaluation
- Better decision making

#### Effort
- 1-2 hours for layout changes

---

## Technical Debt

### 1. CareerModel.hash Field Duplication

**Status:** Documented for cleanup  
**Priority:** Medium — Post-v1.0.0  
**Severity:** Low — Safe, synchronized

#### Description
The `CareerModel` interface has `hash` in both top-level and `metadata.hash`. Both fields are always synchronized but it's redundant.

#### Current Implementation
```typescript
interface CareerModel {
  fullName: string;
  sections: {...};
  metadata: {
    hash: string;    // Primary location
    source: string;
  };
  hash?: string;     // Legacy field (same value as metadata.hash)
}
```

#### Impact
- Minor code duplication
- Potential for divergence (currently prevented)
- Slightly confusing for new developers

#### Migration Plan
1. **Phase 1** (current v1.0.0-rc1): Keep both, use fallback pattern
   ```typescript
   model.hash || model.metadata.hash
   ```

2. **Phase 2** (v1.0.1 or v1.1.0): Migrate all callers to `metadata.hash`
   - Update PreviewRenderer.tsx
   - Update ArtifactEngineService
   - Update PromptComposerService
   - Verify tests pass

3. **Phase 3** (v1.2.0+): Remove `hash` field from interface

#### Effort
- 30 minutes to migrate callers
- 15 minutes to verify tests
- Total: ~45 minutes

#### Post-v1.0.0 Action
- [ ] Create PR to migrate to metadata.hash
- [ ] Update all callers
- [ ] Remove hash field from interface
- [ ] Update documentation

---

### 2. Test File Type Suppression

**Status:** Documented for cleanup  
**Priority:** Medium — Post-v1.0.0  
**Severity:** Low — Tests passing, production code safe

#### Description
One test file uses `@ts-nocheck` to suppress 29 test-only type errors.

#### Location
```typescript
// src/server/services/__tests__/career-model.service.test.ts
// @ts-nocheck on line 1
```

#### Impact
- 29 type errors suppressed
- Test type checking reduced
- But: All 345 tests passing, production code safe

#### Why Not Fixed Now
- Errors are test-setup only, not assertion logic
- Converting to 29 separate `@ts-expect-error` comments would reduce readability
- Better to refactor test structure in separate PR

#### Root Cause
CareerModel structure changed, test mocks not updated to match new structure.

#### Cleanup Plan
1. **Refactor test mocks** to match CareerModel structure
2. **Replace @ts-nocheck** with targeted `@ts-expect-error` on specific test helpers
3. **Verify all tests still pass**

#### Effort
- 1-2 hours to identify problematic test helpers
- 1-2 hours to refactor mocks
- 30 minutes to test and verify

#### Post-v1.0.0 Action
- [ ] Review test file structure
- [ ] Refactor mocks to match CareerModel
- [ ] Replace @ts-nocheck with narrower suppressions
- [ ] Verify 345/345 tests still pass

---

### 3. Unused Variable Placeholders

**Status:** Documented for cleanup  
**Priority:** Low — Safe, intentional placeholders  
**Severity:** Low — Not affecting production

#### Locations

| File | Variable | Reason | Post-v1 Action |
|------|----------|--------|---|
| `src/client/lib/analytics.ts:18` | `_eventLog` | Placeholder for event logging | Implement or remove |
| `src/server/services/claude.service.ts:130` | `_schema` param | Not yet used in implementation | Use or remove parameter |
| `src/server/services/fit-analyzer.service.ts:71` | `_requiredCount` | Placeholder for future analysis | Implement or remove |
| `src/server/services/keyword-analyzer.service.ts:9` | `_resumeKeywords` | Placeholder for keyword matching | Implement or remove |
| `src/server/services/keyword-analyzer.service.ts:94` | `determineStatus()` | Unused private method | Use or remove method |

#### Impact
- 5 variables/methods marked with `@ts-expect-error`
- Production code unaffected
- Could be cleaned up for maintainability

#### Cleanup Strategy
For each placeholder:
1. Decide: implement now, defer, or remove?
2. If implementing: create separate task
3. If removing: delete the variable
4. Update comments

#### Post-v1.0.0 Action
- [ ] Review each placeholder
- [ ] Either implement the intended feature or delete
- [ ] Remove @ts-expect-error comments when resolved

---

### 4. Error Logging and Monitoring

**Status:** Basic implementation  
**Priority:** Medium — Post-v1.0.0  
**Severity:** Medium — Affects production visibility

#### Current State
- Basic error logging to console
- No structured logging
- No error aggregation
- No performance monitoring
- No alerting

#### Recommended Improvements
1. **Structured Logging**
   - Use winston or pino for structured logs
   - JSON format for easy parsing
   - Log levels: debug, info, warn, error

2. **Error Tracking**
   - Integrate Sentry or similar
   - Automatic error reporting
   - Stack traces and context

3. **Performance Monitoring**
   - Track response times
   - Monitor database queries
   - Track API usage

4. **Alerting**
   - Alert on errors
   - Alert on performance degradation
   - Threshold-based alerts

#### Effort
- Structured logging: 2-3 hours
- Error tracking integration: 1-2 hours
- Performance monitoring: 2-3 hours
- Alerting setup: 1-2 hours

#### Post-v1.0.0 Action
- [ ] Plan monitoring strategy
- [ ] Implement structured logging
- [ ] Integrate error tracking
- [ ] Set up dashboards and alerts

---

### 5. Performance Optimization Opportunities

**Status:** MVP-acceptable, room for improvement  
**Priority:** Low — Not blocking v1.0.0  
**Severity:** Low — Current performance adequate

#### Identified Opportunities

1. **Database Query Optimization**
   - Add indexes on frequently queried columns
   - Optimize JOIN queries
   - Cache frequently accessed data

2. **API Caching**
   - Cache resume scores by career model hash
   - Cache keyword analysis results
   - Cache job fit scores

3. **Frontend Bundle Optimization**
   - Code split components
   - Lazy load workspace panels
   - Tree-shake unused dependencies

4. **Claude API Optimization**
   - Cache responses for identical prompts
   - Batch multiple questions
   - Use shorter prompts where possible

#### Effort
- Database: 2-3 hours
- API caching: 2-3 hours
- Frontend optimization: 3-4 hours
- Claude optimization: 1-2 hours

#### Current Performance (Acceptable)
- App load: ~1.5s
- Workspace: ~1.2s
- Chat response: ~2s
- Artifacts: ~3s
- Bundle: 534 kB gzipped

#### Post-v1.0.0 Action
- [ ] Profile production performance
- [ ] Identify bottlenecks
- [ ] Implement optimizations
- [ ] Measure improvement

---

## Summary by Category

### P1 (Release Blocker or Should Fix Before GA)
- [ ] Settings modal implementation
- [ ] Career document import flow

### P2 (Safe to defer, high value)
- [ ] Health status timestamps
- [ ] Artifact "recommended" badge
- [ ] Chat question categories
- [ ] Copy/messaging improvements
- [ ] Analytics tracking

### P3 (Nice to have, lower priority)
- [ ] Bulk keyword operations
- [ ] PDF export
- [ ] Chat transcript export
- [ ] Batch job analysis
- [ ] Side-by-side comparison

### Technical Debt (Post-v1.0.0)
- [ ] CareerModel.hash cleanup (45 min)
- [ ] Test file type suppression (2-3 hours)
- [ ] Unused variable cleanup (2-3 hours)
- [ ] Error logging/monitoring (6-8 hours)
- [ ] Performance optimization (8-12 hours)

---

## Contributing

When addressing these issues:

1. **P1 Issues**: Create separate branch, high priority testing
2. **P2 Issues**: Batch multiple improvements together
3. **P3 Issues**: Consider for next minor release
4. **Tech Debt**: Allocate 20% of sprint capacity

Update this file when:
- New issues discovered
- Issues resolved (move to closed section)
- Priority changes
- Estimated effort changes

---

**Document Version:** 1.0.0-rc1  
**Last Updated:** 2026-06-13  
**Maintained By:** Erik Taylor
