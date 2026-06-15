# Phase 1 Technical Debt & Deferred Features

**Status:** Captured and prioritized  
**Updated:** June 14, 2026  

---

## Intentionally Deferred Work

### Phase 2 (Resume + Cover Letter + Regeneration) — 3 weeks

- [ ] **Cover Letter Generation**
  - CoverLetterGeneratorService (parallel to ResumeGeneratorService)
  - CoverLetterPromptBuilderService
  - Cover letter Zod schema with different structure
  - API endpoint: POST /api/jobs/:jobId/artifacts/generate (add type=cover_letter)
  - Frontend: CoverLetterPreviewModal component

- [ ] **Regeneration with Different Positioning**
  - PositioningSelector component (radio buttons for positioning options)
  - Prompt variants for different angles (e.g., "Technical Leadership" vs "Full-Stack Impact")
  - Regenerate button on ResumePreviewModal
  - Pre-defined positioning options (move to future: custom positioning)

- [ ] **Version Comparison UI**
  - VersionList component (show all versions chronologically)
  - ComparisonView component (side-by-side or tabs for mobile)
  - Compare button on artifact card
  - Diff highlighting (optional enhancement)

- [ ] **Version Management**
  - Archive button to hide old versions
  - Mark as preferred (show badge on artifact)
  - Delete version (soft delete with status='archived')
  - Max 10 versions per job (add cleanup logic)

- [ ] **Resume Styling Templates**
  - ATS-safe templates (Chronological, Functional, Hybrid)
  - Template selection before generation
  - Template variant property in schema
  - Updated PDF rendering with template styling

---

### Phase 3 (Polish & Advanced Features) — 2+ weeks

- [ ] **Advanced Positioning Options**
  - Custom positioning input (free text)
  - Positioning suggestions from fit analysis
  - Save positioning to profile for reuse

- [ ] **Artifact Editing**
  - Allow user to edit resume text before download
  - Track edits vs. AI generation
  - Support editing specific sections (summary, skills, bullets)

- [ ] **Interview Preparation**
  - Interview questions generated from resume + job
  - Talking points exported with resume
  - Interview status tracking

- [ ] **PDF Export Enhancements**
  - Custom header/footer
  - Include cover letter with resume
  - Combine multiple documents (resume + cover + guidance)
  - Different export formats (DOCX, rich text)

- [ ] **Analytics & Tracking**
  - Track generation success rate
  - Monitor Claude latency per user
  - Cost tracking (tokens used)
  - User engagement (which features are used)
  - A/B testing preparation

- [ ] **Feature Flags**
  - FEATURE_RESUME_GENERATION (full rollout)
  - FEATURE_COVER_LETTERS (beta testing)
  - FEATURE_REGENERATION (gradual rollout)
  - FEATURE_VERSION_COMPARISON (internal testing)
  - Gradual rollout to 10% → 25% → 50% → 100% users

---

### Phase 4+ (Long-term Features)

- [ ] **Real-time Generation Progress**
  - WebSocket updates during Claude streaming
  - Show generation step (analyzing, writing, validating)
  - Estimated time remaining

- [ ] **Recruiter Feedback Loop**
  - Share resume with mock recruiter
  - Get feedback on fit
  - Rating system for generated artifacts
  - Track which versions led to interviews

- [ ] **Multi-artifact Orchestration**
  - Generate resume + cover letter in one action
  - Batch generation for multiple jobs
  - Generate with different positioning options at once
  - Parallel generation (if Claude supports)

- [ ] **Career Document Auto-Update**
  - Suggest career profile updates based on LinkedIn
  - Extract new skills from job descriptions
  - Detect out-of-date information
  - Version career documents separately

- [ ] **Job Application Tracking Integration**
  - Link resume version to job application
  - Track: applied → interview → offer
  - Associate specific resume with outcomes
  - Use feedback to improve generation

- [ ] **Dark Mode**
  - Global dark mode toggle
  - Modal styling for dark background
  - Component color adjustments
  - Respect prefers-color-scheme

- [ ] **Animation Polish**
  - Modal entrance animation (fade + slide)
  - Loading spinner refinement
  - Button click feedback (ripple or scale)
  - Smooth transitions between states
  - Respect prefers-reduced-motion

- [ ] **Advanced Caching**
  - Cache fit analysis results (don't re-analyze same job)
  - Cache Claude responses by hash of inputs
  - Invalidate cache when career doc changes
  - Cache control headers for PDFs

- [ ] **Accessibility Enhancements**
  - Full WCAG AA compliance for all components
  - Screen reader testing with NVDA/JAWS
  - Keyboard navigation for modal
  - High contrast mode support
  - Focus management improvements

---

## Known Limitations (Not Bugs)

### Hallucination Validation

**Current Approach:** Source-consistency checks for obvious issues
- Validates companies exist in career profile
- Checks skills are in career profile
- Validates education entries

**Limitations:** Cannot guarantee 100% accuracy
- May miss subtle hallucinations (e.g., inflated metrics)
- Cannot verify if dates are correct
- Cannot check if bullets are truthful
- **User review is required before submission**

### PDF Generation

**Current:** Simple text-based PDF
- No styling or formatting
- Single column layout
- Basic typography
- ATS-safe but not visually polished

**Future:** Advanced templates with styling
- Proper spacing and margins
- Multiple layout options
- Icons and visual hierarchy
- Still ATS-safe (text-based)

### Claude Integration

**Current:** 3-attempt retry with exponential backoff
- Handles network timeouts
- Handles rate limiting (429 errors)
- Handles invalid API key

**Limitations:**
- May fail on very long job descriptions (token limit)
- May have variance in output quality
- May fail during Claude API outages

### Version Management

**Current:** Auto-increment versions, no pruning
- Versions stored forever
- No limit on version count
- All versions retrievable

**Future:** Implement retention policies
- Archive old versions automatically
- Limit to recent N versions
- Allow manual cleanup

---

## Cleanup Tasks (After Phase 2)

- [ ] Remove inline styles from StudioPanel
- [ ] Create shared CSS module for artifact components
- [ ] Extract magic numbers (30s timeout, 1s/2s/4s delays)
- [ ] Add JSDoc comments to complex functions
- [ ] Consolidate error message strings
- [ ] Add logging/telemetry for debugging
- [ ] Create shared utility for API response parsing
- [ ] Add integration tests for API error scenarios

---

## Performance Considerations

### Current Bottlenecks (Acceptable for Phase 1)

1. **Claude API Latency** (10-20 seconds)
   - No optimization possible (Claude inherent latency)
   - Mitigated by timeout + retry logic
   - Future: Use streaming API for progress updates

2. **PDF Generation** (<1 second)
   - Current: Simple text-to-PDF
   - No performance issue currently
   - Future: May need optimization for bulk exports

3. **Database** (<100ms for artifact CRUD)
   - No observed slowdowns
   - Indexes on job_id, artifact_type+version, created_at
   - SQLite is sufficient for Phase 1 scale

### Caching Opportunities (Defer to Phase 3)

1. Fit analysis caching (same job = same analysis)
2. Claude response caching (same input = same output)
3. PDF generation caching (same artifact = same PDF)
4. Artifact list pagination (only load visible artifacts)

---

## Dependencies

### New Dependencies Added (Phase 1)

- `pdfkit` (v0.14.0) - PDF generation
  - License: MIT
  - Size: ~300KB
  - Alternative: pdf-lib, PDFKit (different API)

### Upgrade Opportunities (Deferred)

- TypeScript: Upgrade minor versions for new features
- Vite: Next major version has faster builds
- React: Next major version may have improvements
- Node: Ensure LTS compatibility

---

## Testing Gaps

### Phase 1 Coverage

✅ Unit tests for:
- ArtifactService CRUD + versioning
- Resume schema validation
- Prompt building

❌ Not yet tested:
- Claude integration (mocked in tests)
- Source-consistency validation edge cases
- PDF generation with various resume sizes
- Concurrent artifact generation
- Edge case: generate when database is unavailable
- Edge case: resume without education/skills
- Edge case: very long job description (token limits)

### Phase 2+ Testing

- Cover letter generation
- Regeneration workflows
- Version comparison logic
- API error handling (rate limits, timeouts)
- Large dataset performance
- Concurrent user scenarios

---

## Documentation Debt

- [ ] Add inline code comments for complex logic
- [ ] Create API documentation (OpenAPI/Swagger)
- [ ] Document Zod schemas with examples
- [ ] Create database schema documentation
- [ ] Add troubleshooting guide for common issues
- [ ] Document error codes and meanings
- [ ] Create deployment guide (beyond dev setup)

---

## Architectural Decisions to Revisit

### Zod vs. Other Validation

**Current:** Zod for schema validation
**Alternatives:** Joi, TypeBox, Valibot
**Decision:** Keep Zod (already in use, TypeScript native)

### SQLite vs. PostgreSQL

**Current:** SQLite with TEXT JSON (not JSONB)
**When to Upgrade:** 
- Need horizontal scaling (multiple servers)
- Need concurrent writes to same artifact
- Need advanced JSON queries
**Not needed:** Single-server deployment, sequential writes OK

### Retry Strategy

**Current:** 3 attempts, 1s/2s/4s backoff
**Alternatives:** Exponential jitter, circuit breaker
**Decision:** Keep simple strategy (sufficient for Phase 1)
**Future:** Add metrics to optimize backoff

### PDF Library

**Current:** pdfkit (simple, no dependencies)
**Alternatives:** puppeteer (headless browser), node-pdf (native bindings)
**Decision:** Keep pdfkit (small, no system dependencies)
**Future:** Consider advanced templates if styling needed

---

## Security Considerations

### Validated

✅ No SQL injection (parameterized queries)  
✅ No XSS (React escaping)  
✅ API key protected (environment variable)  
✅ User-generated content validated with Zod  
✅ File downloads safe (PDF generated, not user input)  

### To Verify

- [ ] Rate limiting on Claude API calls
- [ ] Audit logging for artifact access
- [ ] Permission check: user can only access their artifacts
- [ ] Career document privacy (not exposed in API)

---

## Next Steps

**Before Phase 2:**
1. Run E2E test suite against staging
2. Collect performance metrics (Claude latency, DB latency, PDF size)
3. Get user feedback on UX
4. Plan cover letter feature (similar to resume)

**Start of Phase 2:**
1. Create CoverLetterGeneratorService
2. Add PositioningSelector UI component
3. Implement regeneration logic
4. Add version comparison view

---

