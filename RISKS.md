# JobOps Risks and Mitigation

## Risk Framework

Each risk is assessed by:
- **Likelihood** — How probable is this?
- **Impact** — How bad would it be?
- **Severity** — Likelihood × Impact
- **Mitigation** — What can we do about it?

---

## Critical Risks (Stop-the-line if unmitigated)

### R1: LLM Fabrication

**Risk:** Claude generates false claims about experience not in Master CV.

**Likelihood:** High (LLMs are prone to hallucination)

**Impact:** Critical (Violates core mission: "Truth First")

**Mitigation:**
- ✅ Explicit prompt instruction: "Only use information from the provided CV"
- ✅ Structured output with citations (each claim includes source location)
- ✅ Post-generation validation against Master CV
- ✅ User review before PDF export
- ✅ Edit history to track modifications
- ✅ Manual spot-checking of generated content

**Verification:**
- Test with CV that has gaps; verify resume doesn't fill them
- Test with unusual claims; verify they're rejected if not in CV
- Manual review of generated documents before launch

---

### R2: Data Loss

**Risk:** User's job tracking data or generated documents are lost.

**Likelihood:** Low (SQLite is reliable, but user could delete file)

**Impact:** Critical (Loss of application tracking data)

**Mitigation:**
- ✅ Automatic daily backups to user's Documents folder
- ✅ Version control of Master CV
- ✅ Artifact storage (PDFs) separate from database
- ✅ Data export feature (JSON export of all jobs)
- ✅ Recovery guide in documentation

**Verification:**
- Test backup creation and restoration
- Test data export completeness
- Verify backup happens automatically

---

### R3: Claude API Unavailable

**Risk:** Claude API is down; user can't generate documents or analyze jobs.

**Likelihood:** Low (Anthropic has good uptime)

**Impact:** High (Core features blocked)

**Mitigation:**
- ✅ Graceful degradation: show cached analysis if fresh unavailable
- ✅ Clear error messages: "Claude API is temporarily unavailable, retrying in 30s"
- ✅ Retry logic with exponential backoff
- ✅ Offline mode indicator in UI
- ✅ Allow manual document editing without generation
- ✅ Funnel tracking works offline

**Verification:**
- Simulate API failure and verify graceful handling
- Test retry logic and backoff timing
- Verify cached analysis is used appropriately

---

## High Risks (Likely to occur; major impact)

### R4: PDF Generation Latency

**Risk:** Puppeteer PDF generation takes > 10 seconds, frustrating user.

**Likelihood:** Medium (PDF generation is inherently slow)

**Impact:** Medium (Poor UX but not functionality breaking)

**Mitigation:**
- ✅ Async PDF generation (generate in background)
- ✅ Show progress/loading state to user
- ✅ Cache generated PDFs (only regenerate if content changed)
- ✅ Pre-generate PDFs on background for applied jobs
- ✅ Optimize HTML/CSS for rendering performance

**Verification:**
- Benchmark PDF generation on target hardware
- Measure and optimize rendering time
- Test with multiple PDF generations in sequence

---

### R5: SQLite Performance at Scale

**Risk:** As job count grows, queries become slow.

**Likelihood:** Low (Desktop app, 100s of jobs is small)

**Impact:** Medium (App becomes sluggish)

**Mitigation:**
- ✅ Indexes on common query fields (status, date, source)
- ✅ Pagination in list views (don't load all jobs at once)
- ✅ Connection pooling via better-sqlite3
- ✅ Query optimization and EXPLAIN QUERY PLAN reviews
- ✅ Archive old jobs to separate table if needed

**Verification:**
- Load test with 1,000 jobs; measure query times
- Verify indexes are used correctly
- Profile slow queries

---

### R6: State Machine Violations

**Risk:** Job status transitions are incorrect (e.g., rejected job marked as interviewed).

**Likelihood:** Medium (UI allows any transition)

**Impact:** Medium (Corrupted funnel tracking)

**Mitigation:**
- ✅ Enforce valid transitions at API level
- ✅ Audit log of all status changes
- ✅ Admin function to correct invalid states
- ✅ Unit tests for all transition rules
- ✅ Clear visual affordances (disable invalid actions)

**Verification:**
- Test all valid transitions
- Verify invalid transitions are rejected
- Test audit log accuracy

---

## Medium Risks (Moderate likelihood and impact)

### R7: Accessibility Compliance

**Risk:** App fails WCAG AA compliance; inaccessible to users with disabilities.

**Likelihood:** Medium (Frontend accessibility is subtle and easy to miss)

**Impact:** Medium (Excludes users; potential legal issues)

**Mitigation:**
- ✅ Accessibility-first design from start (not afterthought)
- ✅ Keyboard navigation testing for every feature
- ✅ Screen reader testing (VoiceOver, NVDA)
- ✅ Color contrast verification (all text ≥ 4.5:1)
- ✅ Automated testing (axe, Lighthouse)
- ✅ Manual accessibility audit before launch

**Verification:**
- Run axe accessibility scanner on every page
- Manual keyboard-only navigation test
- Screen reader testing on Windows/Mac
- Lighthouse accessibility score ≥ 95

---

### R8: Master CV Not Found

**Risk:** User hasn't created Master CV file; app can't start or analyze jobs.

**Likelihood:** Medium (User might not create file first)

**Impact:** Medium (Feature broken until CV created)

**Mitigation:**
- ✅ Clear onboarding to guide CV creation
- ✅ Helpful error message if CV not found
- ✅ Sample CV template provided
- ✅ "Create CV" button in settings
- ✅ Can add job before CV exists; analysis blocked until created

**Verification:**
- Test app startup without CV
- Verify error message is helpful
- Test sample CV template loading

---

### R9: Resume Customization Complexity

**Risk:** User struggles to customize generated resume; gives up.

**Likelihood:** Medium (Editing complex documents is hard)

**Impact:** Low (User can still export and edit in Word)

**Mitigation:**
- ✅ In-line editing (click to edit any section)
- ✅ Live preview of changes
- ✅ Undo/redo for edits
- ✅ Revert to generated version button
- ✅ Export to plaintext/HTML for external editing
- ✅ Tooltips showing which CV section is used

**Verification:**
- User testing of editing workflow
- Verify undo/redo works
- Test export formats

---

### R10: Job Board Integration Complexity

**Risk:** Parsing job postings from different sources is error-prone.

**Likelihood:** Medium (Job posting formats vary widely)

**Impact:** Low (Manual entry is fallback)

**Mitigation:**
- ✅ Start with manual job entry only (simple)
- ✅ Browser extension for one-click import (later phase)
- ✅ URL-based import with manual verification
- ✅ Parsing templates for known job boards
- ✅ User can edit imported data

**Verification:**
- Test manual entry
- Test URL import accuracy
- Test parsing of different job board formats

---

## Low Risks (Unlikely or low impact)

### R11: TypeScript Type Errors at Runtime

**Risk:** TypeScript compilation passes but runtime type is wrong.

**Likelihood:** Low (TypeScript is effective)

**Impact:** Low (Easy to debug and fix)

**Mitigation:**
- ✅ Zod schemas for runtime validation (especially API boundaries)
- ✅ Never use `any` type
- ✅ Strict mode TypeScript
- ✅ Tests catch type mismatches

**Verification:**
- Run TypeScript in strict mode
- Check for any `any` types (should be zero)
- Unit tests for type-critical code

---

### R12: PDF Template Breaks with Content

**Risk:** Long resume text breaks PDF layout; content is cut off or poorly formatted.

**Likelihood:** Low (Puppeteer handles most content well)

**Impact:** Low (User can adjust in PDF editor)

**Mitigation:**
- ✅ CSS pagination rules (page breaks before sections)
- ✅ Length validation for sections
- ✅ Warning if resume > 2 pages
- ✅ Template variants (condensed for long content)
- ✅ User can adjust font size

**Verification:**
- Test with very long resume
- Test with special characters
- Verify PDF pagination

---

### R13: Vite Build Performance

**Risk:** Vite builds are slow; development loop is frustrating.

**Likelihood:** Low (Vite is fast)

**Impact:** Low (Affects dev experience, not user experience)

**Mitigation:**
- ✅ Monitor bundle size in CI
- ✅ Code splitting for features
- ✅ Lazy loading of heavy components
- ✅ Caching in build pipeline

**Verification:**
- Measure development build time (should be < 5s)
- Measure production build time (should be < 30s)

---

### R14: Database Migration Failures

**Risk:** Schema migration fails; database is corrupted.

**Likelihood:** Low (Better-sqlite3 is reliable)

**Impact:** Low (Restore from backup)

**Mitigation:**
- ✅ Test migrations on sample data
- ✅ Backup before migration
- ✅ Rollback capability
- ✅ Clear error messages
- ✅ Migration verification script

**Verification:**
- Test each migration in isolation
- Test rollback mechanism
- Verify data integrity after migration

---

## Monitoring and Tracking

### During Development

- [ ] After each phase, review phase-specific risks
- [ ] Update risk status as mitigations are implemented
- [ ] Add new risks as they're discovered
- [ ] Track time spent on risk mitigation

### Post-Launch

- [ ] User feedback survey for unknown risks
- [ ] Error logging to catch unexpected issues
- [ ] Funnel metrics to detect data integrity problems
- [ ] Claude API error tracking
- [ ] PDF generation failure tracking

---

## Risk Ownership

| Risk | Owner | Review Frequency |
|------|-------|------------------|
| Fabrication (R1) | Engineering Lead | Continuous |
| Data Loss (R2) | Engineering Lead | Weekly |
| API Unavailable (R3) | Engineering Lead | On failure |
| PDF Latency (R4) | Frontend Lead | After Phase 6 |
| DB Performance (R5) | Backend Lead | After Phase 7 |
| State Machine (R6) | Engineering Lead | Before Phase 7 |
| Accessibility (R7) | UX Lead | Continuous |
| Master CV (R8) | UX Lead | Before Phase 3 |
| Customization (R9) | Frontend Lead | After Phase 4 |
| Job Board Import (R10) | Backend Lead | If implemented |
| Type Errors (R11) | Engineering Lead | Per commit |
| PDF Template (R12) | Frontend Lead | After Phase 6 |
| Build Perf (R13) | DevOps Lead | Weekly |
| Migration Failures (R14) | Backend Lead | Per migration |

---

## Review Checklist

Before launch, verify:

- [ ] All critical risks have documented mitigations
- [ ] Mitigation code is tested and merged
- [ ] No new unmitigated critical risks
- [ ] Accessibility audit passed
- [ ] Data loss prevention verified
- [ ] Anti-fabrication checks tested
- [ ] Error handling graceful for all failure modes
- [ ] Performance benchmarks met
- [ ] Monitoring and alerting in place

---

## Decision: Risk Tolerance

**The project prioritizes:**

1. **Truth** (R1 is highest priority)
2. **Reliability** (Data loss is unacceptable)
3. **Usability** (Can recover from latency/complexity issues)
4. **Performance** (Can optimize if needed)

This means we will implement mitigations for R1-R6 before launch, and defer optimizations for R7-R14 if needed.
