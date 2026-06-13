# JobOps Delivery Roadmap

## Phased Approach

JobOps is built in phases to ensure each phase produces working, testable software.

---

## Phase 0: Architecture Validation ✅

**Status:** In Progress

**Goal:** Validate the architecture before any code is written.

**Deliverables:**
- ✅ PROJECT_STRUCTURE.md — Repository layout and responsibilities
- ✅ ARCHITECTURE.md — System design and layers
- ✅ DATABASE.md — SQLite schema and data model
- ✅ API.md — Express API contract
- ✅ ROADMAP.md — This document
- ✅ RISKS.md — Technical and product risks
- ⏳ ADRs — Architecture Decision Records (ADR-001 through ADR-006)

**Exit Criteria:**
- [ ] Architecture reviewed and approved
- [ ] No unresolved questions about core design
- [ ] Risks identified and mitigation strategies defined
- [ ] Decision records complete

---

## Phase 1: Foundation Setup

**Estimated Duration:** 1 week

**Goal:** Scaffold the project with tooling, database, and basic API structure.

**Deliverables:**

### Repository Setup
- [ ] Initialize npm project with TypeScript
- [ ] Configure Vite (frontend) and build system
- [ ] Configure Vitest for unit tests
- [ ] Set up linting (ESLint) and formatting (Prettier)
- [ ] Configure git hooks (pre-commit)

### Database Foundation
- [ ] Initialize SQLite database schema (001-initial.sql)
- [ ] Create `better-sqlite3` wrapper
- [ ] Write prepared statement helpers
- [ ] Create migration system
- [ ] Write seed data for development

### Express Server Foundation
- [ ] Set up Express app with middleware
- [ ] Configure error handling middleware
- [ ] Create validation middleware
- [ ] Set up logging
- [ ] Create health check endpoint
- [ ] Write database service abstraction

### Frontend Foundation
- [ ] Set up React 18 + Vite
- [ ] Configure TypeScript strict mode
- [ ] Set up global styles and theme
- [ ] Create layout shell (ThreePanel component)
- [ ] Set up Zustand store structure
- [ ] Create API client wrapper

### Documentation
- [ ] Set up GitHub Actions for CI/CD
- [ ] Write development setup guide
- [ ] Write testing guide

**Exit Criteria:**
- [ ] Project builds and runs locally
- [ ] Database schema is created and migrations work
- [ ] Basic API endpoints are callable
- [ ] Frontend renders (empty three-panel layout)
- [ ] All tests pass
- [ ] Deployment pipeline is set up

---

## Phase 2: Job Management

**Estimated Duration:** 1.5 weeks

**Goal:** Implement complete job CRUD operations and tracking.

**Deliverables:**

### Backend
- [ ] Job creation endpoint
- [ ] Job listing with filtering and sorting
- [ ] Job detail retrieval
- [ ] Job update/status transitions
- [ ] Job soft-delete (archive)
- [ ] Database service for job operations
- [ ] Unit tests for job service

### Frontend
- [ ] Sources Panel (job list)
  - [ ] Display list of jobs with status badges
  - [ ] Filter by status, source, date range
  - [ ] Sort by various fields
  - [ ] Search by title/company
  - [ ] Import job from URL (basic)
  - [ ] Add new job form (modal)

- [ ] Job Detail Panel
  - [ ] Display job information
  - [ ] Show fit score and analysis summary
  - [ ] Quick actions (Apply, Archive, etc.)
  - [ ] Edit job details
  
- [ ] API client methods for jobs

### Testing
- [ ] Unit tests for job service (CRUD operations)
- [ ] Integration test for job creation workflow
- [ ] E2E test for adding and listing jobs
- [ ] Accessibility tests (keyboard nav, focus order)

**Exit Criteria:**
- [ ] Can add, view, list, and update jobs
- [ ] Job status transitions are validated
- [ ] Soft-delete works correctly
- [ ] Filtering and sorting work
- [ ] All CRUD tests pass
- [ ] Accessibility compliance verified

---

## Phase 3: Job Analysis

**Estimated Duration:** 1.5 weeks

**Goal:** Implement job analysis against Master CV, identifying gaps and fit.

**Deliverables:**

### Backend
- [ ] Load Master Career Document from file
- [ ] Create job analysis service
- [ ] Claude API integration for job analysis
- [ ] Skills matching logic
- [ ] Experience gap identification
- [ ] Fit score calculation
- [ ] Positioning suggestion generation
- [ ] Anti-fabrication validation
- [ ] Caching analyzed jobs
- [ ] Unit tests for analysis service

### Frontend
- [ ] Chat Panel infrastructure
  - [ ] Display job analysis results
  - [ ] Show skills match (matched/partial/missing)
  - [ ] Display experience gaps
  - [ ] Show positioning suggestions
  - [ ] Fit score visualization
  - [ ] Trigger analysis from UI
  - [ ] Show loading state while analyzing
  - [ ] Error handling and retry

### Testing
- [ ] Unit tests for gap identification
- [ ] Integration test for analysis pipeline
- [ ] Test anti-fabrication checks
- [ ] Test caching behavior
- [ ] E2E test for analyzing a job

**Exit Criteria:**
- [ ] Analysis runs successfully on jobs
- [ ] Fit scores are reasonable and reproducible
- [ ] Anti-fabrication checks catch violations
- [ ] Gaps identified are accurate
- [ ] Caching works correctly
- [ ] All tests pass

---

## Phase 4: Document Generation (Resume)

**Estimated Duration:** 1.5 weeks

**Goal:** Generate ATS-optimized resumes for job applications.

**Deliverables:**

### Backend
- [ ] Load resume generation prompt
- [ ] Resume generation service
- [ ] Resume validation against Master CV
- [ ] Resume versioning (multiple generations)
- [ ] Resume storage in database
- [ ] Resume editing with user modifications
- [ ] PDF generation via Puppeteer
- [ ] ATS optimization checks
- [ ] Unit tests for resume service

### Frontend
- [ ] Studio Panel
  - [ ] Display generated resume
  - [ ] Show source citations (which CV sections used)
  - [ ] In-line editing of resume content
  - [ ] Preview panel
  - [ ] Regenerate with different template
  - [ ] Mark as "approved by user"
  - [ ] Version history and rollback

### Testing
- [ ] Unit tests for resume validation
- [ ] Integration test for full generation pipeline
- [ ] Anti-fabrication tests for resume claims
- [ ] PDF generation tests
- [ ] E2E test for generating and editing resume

**Exit Criteria:**
- [ ] Resumes generate successfully
- [ ] Generated content is truthful and cites sources
- [ ] User can edit and regenerate
- [ ] PDF output is properly formatted
- [ ] ATS optimization is applied
- [ ] All tests pass

---

## Phase 5: Document Generation (Cover Letter)

**Estimated Duration:** 1 week

**Goal:** Generate human cover letters tailored to each job.

**Deliverables:**

### Backend
- [ ] Load cover letter generation prompt
- [ ] Cover letter generation service
- [ ] Cover letter validation
- [ ] Cover letter versioning
- [ ] Cover letter storage
- [ ] Integration with resume data

### Frontend
- [ ] Studio Panel (cover letter tab)
  - [ ] Display generated cover letter
  - [ ] In-line editing
  - [ ] Preview
  - [ ] Regenerate
  - [ ] Tone selection (professional, enthusiastic, etc.)

### Testing
- [ ] Unit tests for cover letter generation
- [ ] Integration tests
- [ ] Anti-fabrication tests
- [ ] E2E test for generating and editing

**Exit Criteria:**
- [ ] Cover letters generate and are human-readable
- [ ] Content is truthful
- [ ] User can customize and regenerate
- [ ] All tests pass

---

## Phase 6: PDF Generation and Export

**Estimated Duration:** 1 week

**Goal:** Generate polished PDFs for both resume and cover letter.

**Deliverables:**

### Backend
- [ ] Puppeteer PDF generation for resume
- [ ] Puppeteer PDF generation for cover letter
- [ ] PDF template system
- [ ] PDF artifact storage
- [ ] PDF cleanup/expiration

### Frontend
- [ ] PDF download buttons
  - [ ] Download resume as PDF
  - [ ] Download cover letter as PDF
  - [ ] Download both as single PDF
  - [ ] Show generation progress
  - [ ] Handle PDF generation errors

### Testing
- [ ] Test PDF generation quality
- [ ] Test artifact storage
- [ ] E2E test for PDF download

**Exit Criteria:**
- [ ] PDFs generate reliably
- [ ] PDFs are ATS-optimized
- [ ] Downloads work
- [ ] All tests pass

---

## Phase 7: Application Tracking and Funnel

**Estimated Duration:** 1 week

**Goal:** Track application outcomes and calibrate funnel metrics.

**Deliverables:**

### Backend
- [ ] Record application outcomes (applied, rejected, interview, offer, etc.)
- [ ] Track outcome timestamps
- [ ] Calculate time-to-outcome metrics
- [ ] Funnel statistics endpoint
- [ ] Conversion rate calculation

### Frontend
- [ ] Tracking Panel
  - [ ] Update job status (Applied, Interviewed, Offer, etc.)
  - [ ] Record outcome metadata
  - [ ] Funnel visualization
  - [ ] Conversion rate dashboard
  - [ ] Time-to-outcome analytics
  - [ ] Historical trends

### Testing
- [ ] Unit tests for funnel calculations
- [ ] Integration tests for outcome tracking
- [ ] E2E test for complete application flow

**Exit Criteria:**
- [ ] Outcomes are tracked correctly
- [ ] Funnel metrics are accurate
- [ ] Analytics dashboard displays properly
- [ ] All tests pass

---

## Phase 8: Settings and Configuration

**Estimated Duration:** 3 days

**Goal:** Allow users to configure thresholds and preferences.

**Deliverables:**

### Backend
- [ ] Settings endpoints (get/update)
- [ ] Editable thresholds (min fit score, salary, etc.)
- [ ] Preference storage

### Frontend
- [ ] Settings panel
  - [ ] Configure fit score threshold
  - [ ] Set salary range
  - [ ] Preferred locations
  - [ ] Required skills
  - [ ] Nice-to-have skills
  - [ ] Auto-generation preferences
  - [ ] Resume template selection

### Testing
- [ ] Unit tests for settings validation
- [ ] E2E test for updating settings

**Exit Criteria:**
- [ ] Settings are editable and persist
- [ ] Thresholds are respected in analysis
- [ ] All tests pass

---

## Phase 9: Accessibility and Polish

**Estimated Duration:** 1 week

**Goal:** Achieve WCAG AA compliance and polish UX.

**Deliverables:**

### Accessibility
- [ ] Color contrast verification (all text ≥ 4.5:1)
- [ ] Keyboard navigation testing
- [ ] Screen reader testing (VoiceOver/NVDA)
- [ ] Focus management in modals
- [ ] ARIA labels and roles
- [ ] Semantic HTML verification

### UI Polish
- [ ] Visual design refinement
- [ ] Animation and microinteractions
- [ ] Empty state designs
- [ ] Error state designs
- [ ] Loading state designs
- [ ] Responsive design verification

### Testing
- [ ] Accessibility audit tools (axe, Lighthouse)
- [ ] Manual keyboard navigation testing
- [ ] Screen reader testing
- [ ] Responsive design testing

**Exit Criteria:**
- [ ] WCAG AA compliance verified
- [ ] Keyboard navigation complete
- [ ] Screen reader compatible
- [ ] Design is polished and professional

---

## Phase 10: Testing and Optimization

**Estimated Duration:** 1 week

**Goal:** Comprehensive testing, performance optimization, and documentation.

**Deliverables:**

### Testing
- [ ] Unit test coverage ≥ 80%
- [ ] Integration test coverage
- [ ] E2E test coverage for critical paths
- [ ] Performance testing

### Optimization
- [ ] Bundle size analysis and optimization
- [ ] Database query optimization
- [ ] Lighthouse scores ≥ 90
- [ ] PDF generation latency optimization

### Documentation
- [ ] User guide
- [ ] Troubleshooting guide
- [ ] Developer guide
- [ ] API documentation

**Exit Criteria:**
- [ ] All tests passing
- [ ] Performance is acceptable
- [ ] Documentation is complete
- [ ] No known critical issues

---

## Phase 11: Deployment and Launch

**Estimated Duration:** 1 week

**Goal:** Package for distribution and launch.

**Deliverables:**

### Desktop App
- [ ] Electron packaging
- [ ] Code signing
- [ ] Auto-update mechanism
- [ ] Installer (macOS, Windows, Linux)

### Distribution
- [ ] GitHub releases
- [ ] Auto-update server setup
- [ ] Documentation site

### Launch
- [ ] Beta testing with small group
- [ ] Bug fixes from beta feedback
- [ ] Public launch

**Exit Criteria:**
- [ ] App builds and installs correctly
- [ ] Auto-updates work
- [ ] Beta feedback addressed
- [ ] Ready for public use

---

## Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| 0: Architecture | 2 weeks | 2 weeks |
| 1: Foundation | 1 week | 3 weeks |
| 2: Job Management | 1.5 weeks | 4.5 weeks |
| 3: Job Analysis | 1.5 weeks | 6 weeks |
| 4: Resume Generation | 1.5 weeks | 7.5 weeks |
| 5: Cover Letter | 1 week | 8.5 weeks |
| 6: PDF Export | 1 week | 9.5 weeks |
| 7: Tracking & Funnel | 1 week | 10.5 weeks |
| 8: Settings | 0.5 weeks | 11 weeks |
| 9: Accessibility & Polish | 1 week | 12 weeks |
| 10: Testing & Optimization | 1 week | 13 weeks |
| 11: Deployment & Launch | 1 week | 14 weeks |

**Estimated Total:** 14 weeks (3.5 months) from start of Phase 1 to launch.

---

## Success Criteria

The project is successful when:

1. ✅ **Truthfulness** — No fabricated experience appears in documents
2. ✅ **Completeness** — All major features from the mission are implemented
3. ✅ **Quality** — Code is maintainable, well-tested, and documented
4. ✅ **Accessibility** — WCAG AA compliance verified
5. ✅ **Usability** — Feels like a polished SaaS product
6. ✅ **Reliability** — No known critical bugs, edge cases handled gracefully
7. ✅ **Performance** — Responds quickly, PDFs generate in < 5 seconds
8. ✅ **Deployable** — Can be packaged and distributed to users

---

## Risk Mitigation During Development

- **Phase reviews:** After each phase, stop and review before continuing
- **Integration testing early:** Test component interactions, not just units
- **Anti-fabrication validation:** Build safety checks in early, expand later
- **Accessibility testing continuously:** Don't defer until Phase 9
- **Performance monitoring:** Profile early, optimize as needed

---

## Post-Launch Roadmap

Once Phase 11 is complete, consider:

1. **Job board integrations** — Auto-import from LinkedIn, Indeed, etc.
2. **Interview prep** — AI-powered interview question generation
3. **Network tracking** — Track connections and referral outcomes
4. **Historical analytics** — Analyze patterns from past applications
5. **Collaboration** — Share opportunities with peers
6. **Mobile apps** — Native iOS and Android clients
7. **Web version** — Multi-user server version for teams
