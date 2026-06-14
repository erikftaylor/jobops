# JobOps Product Decisions

**Version:** 1.0.0-rc1  
**Last Updated:** 2026-06-13  
**Status:** Canonical Reference for v1.0.0+ Development

This document captures major architectural and product decisions with their rationale, alternatives considered, and tradeoffs. These decisions form the foundation of JobOps and should inform all future development.

---

## Anti-Fabrication: Truth First

**Decision:** Never fabricate or invent experience. Only information in the Master Career Document can appear in generated materials.

**Rationale:**
- Ethical: Recruiters cannot misrepresent candidates
- Legal: Prevents fraud in job applications
- Trust: Builds recruiter confidence in AI recommendations
- Reputational: Protects both recruiter and candidate

**Implementation:**
- Career Model is immutable (no direct mutations)
- All suggestions reference source material
- ArtifactEngine only uses documented experience
- ChangeGraph tracks all modifications for audit

**Tradeoff:** 
- Cannot suggest improvements beyond what's documented
- Feature set limited to analysis and enhancement, not invention
- Requires explicit user action to add new experience

**Status:** ✅ Core principle, non-negotiable for production

---

## Career Model: Immutable, Versioned, Hashed

**Decision:** Career Profile data is immutable. All modifications tracked in ChangeGraph, never in-place mutations.

**Rationale:**
- Auditability: Every change is recorded with reasoning
- Determinism: Same input always produces same analysis
- Reproducibility: Can replay decisions and understand decision history
- Safety: Prevents accidental data corruption
- Concurrency: No race conditions from simultaneous mutations

**Structure:**
```
CareerModel {
  fullName: string
  sections: { summary, experience, skills, education }
  metadata: { hash, source, created_at }
  // Legacy: hash field (for backward compatibility)
}
```

**ChangeGraph Model:**
```
ChangeNode {
  id, target, field, operation, originalValue, newValue
  reason, source, confidence, accepted_at
  conversation_id, tags, created_at
}
```

**Tradeoff:**
- More records to maintain (immutability + change tracking)
- Requires API pattern: request → validate → create ChangeNode → accept/reject
- Cannot use traditional ORM patterns

**Status:** ✅ Enforced at service layer, non-negotiable

**Future Consideration:** If performance becomes bottleneck, implement snapshot compression (store full Career Model at intervals, ChangeNodes between snapshots).

---

## Artifact Engine: Single Source of Truth for Artifacts

**Decision:** All resume/cover letter generation flows through ArtifactEngine. No direct template rendering elsewhere.

**Rationale:**
- Consistency: All variants generated with same algorithm
- Maintainability: Single place to update generation logic
- Determinism: Same resume + changes always produces same output
- Cacheability: Generation can be cached by (careerModel.hash, job.id, strategy)

**Generation Strategies:**
- `aggressive`: Emphasize all matching keywords
- `balanced`: Emphasize relevant keywords
- `minimal`: Emphasize only critical keywords

**Integration Points:**
- RecruiterWorkspace: consumes variants from ArtifactEngine
- Artifacts database: stores generated output
- Workspace state: tracks selected variant

**Tradeoff:**
- Cannot quickly inline resume generation elsewhere
- Limits rapid experimentation with new formats
- Requires service infrastructure (slower than direct template)

**Status:** ✅ Centralized, enforced through service layer

---

## Recruiter Workspace: Service Consumer, Not Data Owner

**Decision:** Recruiter Workspace is a consumer/presentation layer. Data owned by services (JobService, AnalysisServices, ArtifactEngine, ChangeGraph).

**Rationale:**
- Separation of concerns: UI doesn't manage data
- Reusability: Services can be consumed by other UIs
- Testability: Services tested independently
- Scalability: Easy to add new analysis services

**Workspace Responsibilities:**
- Load analysis results from services
- Display scores, recommendations, artifacts
- Handle user interactions (accept keyword, ask question)
- Show status and metadata

**Service Responsibilities:**
- Execute analysis
- Store results
- Validate changes
- Generate artifacts

**Tradeoff:**
- More network calls (vs. monolithic calculation)
- Services must be available for workspace to function
- Requires careful API contracts between workspace and services

**Status:** ✅ Enforced through service-oriented architecture

---

## Career Profile Terminology: User-Facing Clarity

**Decision:** Rename "Master Career Document" to "Career Profile" in user-facing UI only.

**Rationale:**
- Clearer meaning: "Career Profile" more intuitive than "Master Career Document"
- Consistency: Aligns with modern app terminology
- Onboarding: Reduces confusion for first-time users
- Professional: More appropriate for recruiter audience

**Implementation:**
- UI labels: "Master CV" → "Career Profile"
- SettingsModal tab: "Career Document" → "Career Profile"
- Health status footer: same change
- Internal code: No changes to API fields, type names, or functions
- File path: Remains `data/Master_Career_Document.md` (internal detail)

**Tradeoff:**
- Terminology mismatch between UI and code (acceptable for MVP)
- Post-v1.0.0: Can refactor internals to match new naming

**Status:** ✅ Implemented in v1.0.0-rc1, backward compatible

---

## Onboarding: Conditional Welcome Panel

**Decision:** First-time users see Welcome panel (conditional render on empty job list), not dedicated route.

**Rationale:**
- Simplicity: No new routing complexity
- Persistence: Transition automatic when first job added
- Existing users: Unaffected (only see panel when jobs.length === 0)
- Clear CTA: "Add Your First Job" flows directly to existing form

**Implementation:**
- `JobsPage.tsx`: Conditional render (no jobs → WelcomePanel)
- WelcomePanel: Shows 3-step workflow + Career Profile status
- CTA: Scrolls to NewJobForm and focuses input
- Auto-transition: Normal multi-panel view on first job creation

**Alternative Considered:**
- Dedicated `/onboarding` route with wizard
- Rationale for rejection: Adds routing complexity, harder to skip, less natural transition

**Tradeoff:**
- Cannot show onboarding mid-session
- Career document upload UI deferred (v1.0.1+)

**Status:** ✅ Implemented in v1.0.0-rc1

---

## Accessibility: WCAG AA Required, Not Optional

**Decision:** All UI must meet WCAG AA compliance. Accessibility is built-in, not bolted-on.

**Requirements:**
- Semantic HTML (`<header>`, `<main>`, `<section>`, `<nav>`)
- ARIA labels on interactive elements
- Focus states visible on all buttons (3px outline)
- Keyboard navigation fully functional
- Color contrast WCAG AA or higher
- `prefers-reduced-motion` respected
- Screen reader compatible

**Implementation:**
- Tests verify accessibility (component tests, manual QA)
- CSS design system includes focus/motion rules
- Code review checklist includes accessibility
- No components ship without ARIA labels

**Tradeoff:**
- Development slower (require accessible markup)
- Design system constraints (spacing, colors, motion)
- Testing more thorough

**Status:** ✅ Verified in v1.0.0-rc1, ongoing requirement

---

## Performance: React.memo + CSS Variables + Service Caching

**Decision:** Optimize performance through component memoization, CSS variable usage, and intelligent caching—not premature optimization.

**Strategy:**
- React.memo: Applied to components that receive stable props
- CSS Variables: Design system uses CSS custom properties (no JS recompute)
- Service Caching: Analysis results cached by Career Model hash
- Lazy Loading: Not implemented yet (not needed for MVP)

**Implementation:**
- WelcomePanel: React.memo (receives stable health object)
- CareerProfileCard: React.memo (receives stable data)
- Workspace panels: React.memo where appropriate
- CSS: All values use `var(--color-primary)` pattern

**Tradeoff:**
- Minimal bundle size increase from memoization
- CSS variables require fallbacks for older browsers (not an issue for MVP)

**Status:** ✅ Implemented, measured, not over-optimized

---

## Deferred Features: Explicit, Documented Post-v1.0.0

**Decision:** Features identified as valuable but out-of-scope for v1.0.0 are explicitly documented with post-release effort estimates.

**Deferred Features (v1.0.1+):**

### Settings Modal
- **Status:** Modal template exists, functionality incomplete
- **Effort:** 2-3 hours
- **What's needed:** Theme toggle, data export, help link
- **Current:** Button disabled or shows "Coming Soon" tooltip

### Career Document Upload UI
- **Status:** Manual file editing required; onboarding explains workflow
- **Effort:** 3-4 hours
- **What's needed:** File upload form, validation, progress feedback
- **Current:** `data/Master_Career_Document.md` must be created manually

### Export Features
- **Status:** Not started
- **Effort:** 3-5 hours
- **What's needed:** PDF export, transcript export, ChangeGraph export
- **Current:** Data persists in database and memory

### Analytics
- **Status:** Event bus infrastructure exists (Phase 2d)
- **Effort:** 2-3 hours
- **What's needed:** Wire up events, track usage, create dashboard
- **Current:** Events logged to console, not persisted

### Bulk Operations
- **Status:** Not started
- **Effort:** 1-2 hours
- **What's needed:** Accept all keywords, dismiss all, batch operations
- **Current:** One-by-one acceptance only

**Rationale for Deferral:**
- MVP focuses on core analysis and workspace
- Deferred features are enhancements, not critical paths
- Team wanted quality over feature quantity for launch

**Status:** ✅ Documented, clear post-release path

---

## Design System: Single Source of Truth

**Decision:** All visual properties flow from design system CSS variables. No magic numbers, no hardcoded colors.

**Variables:**
- Colors: primary, success, warning, error, text, background
- Spacing: xs (4px), sm (8px), md (16px), lg (24px), xl (32px)
- Typography: h1-h5, body, small (sizes, weights, line-height)
- Borders: radius (4px, 8px), colors
- Motion: durations, easing (respects prefers-reduced-motion)

**Implementation:**
- `src/client/styles/variables.css`: Central definition
- `src/client/features/workspace/styles/workspace.css`: Component-specific overrides
- Build system: CSS variables compile to static values
- Fallbacks: All variables have sensible defaults

**Tradeoff:**
- Requires discipline (team must use variables, not inline styles)
- Slightly larger CSS payload (worth it for consistency)

**Status:** ✅ Implemented, enforced in code review

---

## Testing: Coverage, Not Metrics

**Decision:** Tests must verify behavior, not just increase coverage percentage. Target: 100% of critical paths, not 100% of lines.

**Test Pyramid:**
- **Unit Tests:** Service functions, pure logic (~60% of tests)
- **Integration Tests:** Service APIs, database operations (~30% of tests)
- **Component Tests:** React component rendering and interaction (~8% of tests)
- **Accessibility Tests:** Manual verification, component assertions (~2% of tests)

**Current State (v1.0.0-rc1):**
- 365 tests passing
- 36 test files
- Coverage: Core business logic 100%, views ~70%, utilities ~80%
- Critical paths: 100% covered

**Requirement:**
- New features must include tests
- Tests must pass before merge
- Pre-commit hook runs tests

**Tradeoff:**
- Takes longer to implement features
- Prevents regressions
- Team confidence in production code

**Status:** ✅ Enforced, working well

---

## TypeScript: Strict Mode, Always

**Decision:** All production code must compile in TypeScript strict mode with zero errors. Test code allowed `@ts-expect-error` only for intentional exceptions.

**Configuration:**
- `strict: true` in tsconfig.json
- `noImplicitAny`, `strictNullChecks`, all checks enabled
- Production code: zero suppressions
- Test code: `@ts-expect-error` only for known exceptions

**Exceptions Allowed:**
- Tests that verify type mismatches (intentional)
- Backward compatibility shims (documented with TODO)
- External library type issues (documented, isolated)

**Tradeoff:**
- Development slower (more type annotations)
- Fewer runtime errors
- Better IDE support and refactoring

**Status:** ✅ Enforced, v1.0.0-rc1 at 0 errors

---

## Summary: Principles Over Features

JobOps prioritizes:
1. **Truthfulness** over feature quantity (never fabricate)
2. **Auditability** over mutation (ChangeGraph everything)
3. **Accessibility** over visual cleverness (WCAG AA non-negotiable)
4. **Clarity** over cleverness (explain scores, show reasoning)
5. **Quality** over speed (tests, types, focus on critical paths)

These decisions form the foundation. Future features should reinforce these principles, not compromise them.

---

**For future decisions:** See ADR folder (`docs/adr/`) for detailed analysis of specific decisions. This document is the executive summary; ADRs provide the rationale.
