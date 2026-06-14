# JobOps: AI Development Context

**Version:** 1.0.0-rc1  
**For:** AI agents implementing features or fixes  
**Read this first:** Yes. Every session.

---

## What is JobOps?

**Purpose:** AI-powered command center for recruiters analyzing job opportunities against their professional background.

**User:** Senior-level recruiter (not candidate)

**Core Workflow:**
1. Recruiter loads their Master Career Document
2. Recruiter adds job opportunity descriptions
3. AI analyzes job against their background
4. AI provides gap analysis and optimization suggestions
5. AI generates multiple resume variants
6. Recruiter selects best variant or requests analysis refinement
7. Recruiter returns later and analysis persists

**Not:** A job search engine, career development app, or ATS replacement.

---

## Non-Negotiable Principles

### 1. Never Fabricate or Invent

**Rule:** Information not in the Master Career Document cannot appear in generated materials.

**Enforcement:**
- ArtifactEngine uses only documented experience
- ChangeGraph validates changes against source material
- Tests verify no invented claims
- Code review checks for hallucinations

**Why:** Ethics, law, recruiter trust, reputation.

**Example violations:**
- ❌ "Added 5 years of Python experience" (not in document)
- ❌ "Worked at Google" (not true)
- ❌ "10x engineer certified" (made-up)

**Example OK:**
- ✅ "Emphasize React experience more prominently"
- ✅ "Reorder achievements to highlight leadership"
- ✅ "Add metric: 'Led team of 8'"

---

### 2. Never Mutate Career Model Directly

**Rule:** Career Profile data is immutable. All changes flow through ChangeGraph.

**Pattern:**
```
Service receives change request
  ↓
Validates change against Career Model
  ↓
Creates ChangeNode with reason
  ↓
Recruiter accepts/rejects change
  ↓
If accepted: ChangeNode persisted, score recalculates
  ↓
Career Model hash updates (invalidates cache)
```

**Enforcement:**
- Career Model interface is readonly after initialization
- Services accept ChangeNode, not raw mutations
- TypeScript prevents direct mutations
- Tests verify immutability

**Why:** Auditability, determinism, reproducibility, safety.

**Code pattern to AVOID:**
```typescript
// ❌ WRONG
careerModel.sections.skills.push("Rust");
```

**Code pattern to USE:**
```typescript
// ✅ RIGHT
const change = new ChangeNode({
  target: "resume",
  field: "skills",
  operation: "add",
  originalValue: undefined,
  newValue: "Rust",
  reason: "Critical skill for this role",
});
changeGraph.record(change);
if (recruiter.accepts(change)) {
  careerModel = careerModel.applyChange(change);
}
```

---

### 3. ArtifactEngine is Source of Truth

**Rule:** All resume/cover letter generation goes through ArtifactEngine.

**Enforcement:**
- No direct template rendering elsewhere
- All variants generated consistently
- Caching leverages determinism
- Tests verify consistency

**Why:** Consistency, maintainability, auditability.

**Valid patterns:**
- ✅ `artifactEngine.generate(careerModel, job, strategy)`
- ✅ Service calls ArtifactEngine, returns variants
- ✅ Cache keyed by (careerModel.hash, job.id, strategy)

**Invalid patterns:**
- ❌ Direct template rendering in components
- ❌ Bypassing ArtifactEngine to save time

---

### 4. Recruiter Workspace Consumes Services

**Rule:** Workspace is presentation/orchestration layer. Data owned by services.

**Services:**
- JobService: Manages job opportunities
- AnalysisServices: ResumeScorer, KeywordAnalyzer, JobFitAnalyzer
- ClaudeService: AI interactions
- ArtifactEngine: Resume generation
- ChangeGraph: Change tracking
- WorkspaceService: Workspace state + persistence

**Workspace Responsibilities:**
- Load and display results
- Handle user interactions
- Route to services
- Show UI state (loading, error, success)

**Why:** Reusability, testability, separation of concerns.

**Invalid patterns:**
- ❌ Workspace calculates scores directly
- ❌ Workspace manages ChangeGraph directly
- ❌ Business logic in React components

---

### 5. Preserve Accessibility (WCAG AA)

**Rule:** All UI changes must maintain WCAG AA compliance.

**Checklist:**
- [ ] Semantic HTML: `<header>`, `<main>`, `<section>`, `<nav>`, `<button>`
- [ ] ARIA labels: All buttons, inputs, regions have labels
- [ ] Focus states: 3px outline on `:focus`
- [ ] Keyboard nav: All functions work via keyboard
- [ ] Color contrast: Text meets AA standards
- [ ] Motion: `prefers-reduced-motion` respected
- [ ] Form labels: `htmlFor` connected to inputs

**Testing:**
- Tab through UI: every interactive element reachable
- Check focus outline visible
- Test with screen reader (VoiceOver/NVDA)
- Verify color contrast (WebAIM contrast checker)

**Why:** Legal requirement, recruiter inclusion, ethics.

---

### 6. Preserve React.memo Optimizations

**Rule:** Components receiving stable props should use React.memo.

**When to use:**
- Component receives objects that don't change frequently
- Component is expensive to render
- Component will re-render when parent updates but props don't

**When NOT to use:**
- Primitive props that change every render
- Components with no props
- Components doing filtering/calculations that differ each render

**Current implementation:**
- WelcomePanel: Memoized (stable health object)
- CareerProfileCard: Memoized (stable props)
- Workspace panels: Memoized where appropriate

**Why:** Performance without premature optimization.

---

### 7. Preserve Design System

**Rule:** All visual properties come from CSS variables.

**Variables to use:**
- Colors: `var(--color-primary)`, `var(--color-success)`, etc.
- Spacing: `var(--space-sm)`, `var(--space-md)`, etc.
- Typography: `var(--font-size-lg)`, `var(--font-weight-semibold)`, etc.

**Never hardcode:**
- ❌ Colors: `color: #3b82f6;`
- ❌ Spacing: `margin: 16px;`
- ❌ Font sizes: `font-size: 14px;`

**Why:** Consistency, theme-ability, maintainability.

---

### 8. Preserve Tests

**Rule:** All code changes must:
- Pass existing tests
- Include tests for new behavior
- Maintain test count (or increase it)

**Test pyramid:**
- Unit tests (services, logic): ~60%
- Integration tests (APIs, DB): ~30%
- Component tests (UI): ~8%
- Accessibility tests: ~2%

**Current state:** 365 passing tests

**Requirement:** No reduction in passing tests.

---

## Coding Rules

### TypeScript
- **Strict mode required:** `strict: true` in tsconfig
- **Zero errors in production code**
- **Tests:** `@ts-expect-error` only for intentional exceptions
- **Imports:** Named imports where possible, avoid any-casts
- **Interfaces:** Prefer composition over inheritance

### API Design
- **Stateless functions:** Services should be pure where possible
- **Immutable returns:** Don't mutate input parameters
- **Explicit contracts:** Type signatures show intent
- **Error handling:** Throw or return error, don't silently fail

### File Organization
- **Features first:** Group by feature, not by type
- **Colocation:** Component + styles + tests in same folder
- **Services isolated:** Business logic in services, not components
- **Shared types:** `/shared/types.ts` for cross-layer types

### Naming
- **Classes:** PascalCase (CareerModelService)
- **Functions:** camelCase (resolveCareerModel)
- **Constants:** UPPER_SNAKE_CASE (MAX_KEYWORDS)
- **Types:** PascalCase (CareerModel)
- **CSS variables:** lowercase-kebab-case (--color-primary)

---

## UX Rules

### Recruiter-First Thinking
- **Explainability:** Every score must explain why
- **Actionability:** Every recommendation must be actionable
- **Transparency:** Show what data was used
- **Confidence:** Indicate confidence level of recommendations
- **Safety:** Never over-promise

### Language & Tone
- **Professional:** Language suitable for senior recruiters
- **Clear:** Avoid jargon, explain AI concepts simply
- **Honest:** "I'm not sure" is better than a guess
- **Encouraging:** Positive tone without false confidence

### Information Hierarchy
- **Most important first:** Fit score before categories
- **Progressive disclosure:** Expand for details
- **Visual clarity:** Color coding, icons, typography hierarchy
- **Whitespace:** Breathing room between elements

---

## Documentation Rules

### When to Update Docs
- **Architecture changes:** Update `docs/ARCHITECTURE.md`
- **Major decisions:** Add to `docs/PRODUCT_DECISIONS.md`
- **Process changes:** Update relevant process docs
- **Feature additions:** Add to appropriate guide

### What to Document
- **Why, not what:** Code shows what; docs explain why
- **Decisions:** Tradeoffs, alternatives considered, rationale
- **Integration:** How new feature connects to existing systems
- **Gotchas:** Non-obvious behaviors, edge cases

### What NOT to Document
- **Self-obvious code:** If code is clear, don't add comments
- **Implementation details:** That's what code is for
- **Future possibilities:** Stick to actual decisions

---

## Testing Requirements

### Before Merge
```bash
npm test -- --run      # All tests pass
npm run type-check     # Zero TypeScript errors
npm run build          # Production build succeeds
```

### New Features Must Include
- Unit tests for business logic
- Integration tests for API endpoints
- Component tests for UI rendering
- Accessibility spot-checks

### Edge Cases to Consider
- Empty states
- Loading states
- Error states
- Boundary conditions
- Concurrent requests

---

## Performance Guidelines

### Do
- ✅ Use React.memo for stable props
- ✅ Leverage CSS variables (no JS recompute)
- ✅ Cache by Career Model hash
- ✅ Load only what's needed
- ✅ Use skeleton screens during load

### Don't
- ❌ Premature optimization
- ❌ Assume all components need memoization
- ❌ Fetch data you don't need
- ❌ Render huge lists without virtualization
- ❌ Overuse context (use services instead)

---

## Security & Privacy

### Never
- ❌ Log sensitive data (Career Profile, email, phone)
- ❌ Store Claude responses unencrypted
- ❌ Expose API keys in code
- ❌ Send user data to external services without consent
- ❌ Cache sensitive data in localStorage

### Always
- ✅ Validate user input
- ✅ Parameterize SQL queries
- ✅ Use environment variables for secrets
- ✅ Respect user privacy settings
- ✅ Document data retention policies

---

## Common Anti-Patterns

### ❌ Hardcoding Values
```typescript
// Bad
const COLOR = "#3b82f6";

// Good
const COLOR = var(--color-primary);
```

### ❌ Mutable Services
```typescript
// Bad
class JobService {
  updateJob(job) {
    job.title = newTitle;  // Mutation
    return job;
  }
}

// Good
class JobService {
  updateJob(job, newTitle) {
    return { ...job, title: newTitle };  // Immutable
  }
}
```

### ❌ Business Logic in Components
```typescript
// Bad
function Workspace() {
  const score = calculateScore(resume, job);  // Calculation in component
  return <div>{score}</div>;
}

// Good
function Workspace() {
  const score = useWorkspaceScore();  // Hook calls service
  return <div>{score}</div>;
}
```

### ❌ Skip Testing Edge Cases
```typescript
// Bad
test('loads workspace', () => {
  // Only tests happy path
});

// Good
describe('workspace loading', () => {
  test('loads workspace', () => { /* happy path */ });
  test('shows error on network failure', () => { /* error */ });
  test('shows loading state', () => { /* loading */ });
});
```

---

## When You're Stuck

### Debug Checklist
1. **Run tests:** `npm test -- --run` (did you break something?)
2. **Type-check:** `npm run type-check` (type errors?)
3. **Build:** `npm run build` (does it compile?)
4. **Read PRODUCT_DECISIONS.md:** Are you violating a principle?
5. **Check Architecture.md:** Is your approach aligned with system design?
6. **Look at similar code:** How did others solve this?

### Getting Help
- Architecture questions: See `docs/ARCHITECTURE.md`
- Design decisions: See `docs/PRODUCT_DECISIONS.md`
- Specific ADRs: See `docs/adr/`
- Code examples: Search codebase for similar patterns

---

## Quick Reference: Key Files

| File | Purpose |
|------|---------|
| `src/shared/types.ts` | Type definitions (shared across layers) |
| `src/server/services/` | Business logic (services are source of truth) |
| `src/client/features/workspace/` | Workspace UI and hooks |
| `src/client/styles/variables.css` | Design system variables |
| `docs/ARCHITECTURE.md` | System design |
| `docs/PRODUCT_DECISIONS.md` | Design decisions |
| `docs/adr/` | Detailed decision rationale |

---

## Success Criteria for Your Work

Every change should satisfy:
- ✅ All tests pass
- ✅ TypeScript strict mode clean
- ✅ Builds successfully
- ✅ Maintains accessibility
- ✅ Honors immutability (Career Model)
- ✅ Uses services (not UI logic)
- ✅ Follows design system
- ✅ No fabrication
- ✅ Documented if architectural change

---

**Remember:** JobOps is about *explaining* AI recommendations to recruiters so they understand *why* the AI suggests something. It's not about making the smartest resume possible—it's about helping the recruiter make smart decisions with transparency and confidence.

Build with that in mind.
