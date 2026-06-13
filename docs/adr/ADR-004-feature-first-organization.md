# ADR-004: Feature-First Directory Organization

**Date:** 2026-06-12

**Status:** ACCEPTED

**Authors:** Principal Engineer

---

## Context

As JobOps grows, both frontend and backend will have multiple features:
- Jobs (add, view, list, filter)
- Analysis (analyze job, identify gaps)
- Documents (generate resume, cover letter)
- Tracking (outcomes, funnel metrics)

The codebase must organize these features clearly so that:
- Related code lives together
- Adding new features doesn't require touching 10 files
- New developers can find code quickly
- Features can be understood in isolation

Two organizational approaches were considered:

1. **Layer-first** — Group by technical layer (routes/, services/, components/)
2. **Feature-first** — Group by feature (features/jobs/, features/analysis/)

---

## Decision

**We choose Feature-First organization:**

```
src/
├── server/
│   ├── routes/jobs.ts         # All job routes
│   ├── routes/documents.ts    # All document routes
│   ├── services/
│   │   ├── job.service.ts
│   │   ├── ai.service.ts
│   │   └── generator.service.ts
│   └── db/
│       └── database.service.ts
├── client/
│   ├── features/
│   │   ├── jobs/
│   │   │   ├── components/JobList.tsx
│   │   │   ├── components/JobForm.tsx
│   │   │   ├── hooks/useJobs.ts
│   │   │   └── pages/JobsPage.tsx
│   │   ├── documents/
│   │   │   ├── components/DocumentEditor.tsx
│   │   │   ├── hooks/useDocumentGeneration.ts
│   │   │   └── pages/DocumentsPage.tsx
│   │   └── analysis/
│   │       ├── components/AnalysisPanel.tsx
│   │       └── pages/AnalysisPage.tsx
│   ├── components/
│   │   ├── layout/
│   │   └── common/
│   └── hooks/
│       └── useApi.ts
└── shared/
    └── types/
```

**Key principle:** Features are self-contained. One developer can work on a feature without understanding the whole codebase.

---

## Rationale

### Discoverability
When adding a job feature, all job-related code is in `features/jobs/`:
- Job component
- Job hooks
- Job business logic
- Job types

Developer doesn't need to search across `components/`, `hooks/`, `services/` directories.

### Independence
Features are loosely coupled. `features/jobs/` doesn't depend on `features/documents/`. They share types via `shared/types/`.

This makes it easy to:
- Add new features
- Remove old features
- Test features in isolation

### Collaboration
Multiple developers can work on different features without merge conflicts:
- Dev 1: works in `features/jobs/`
- Dev 2: works in `features/documents/`
- No file contention

### Clarity
Reading the directory structure tells the story of the app:
- What features exist?
- Where is the code for feature X?
- What's shared across features?

---

## Structure Details

### Client Side

```
src/client/features/jobs/
├── components/
│   ├── JobList.tsx          # Renders list of jobs
│   ├── JobDetail.tsx        # Renders single job detail
│   ├── JobForm.tsx          # Form to add/edit job
│   └── JobStatusBadge.tsx   # Status badge component
├── hooks/
│   ├── useJobs.ts           # Hook to fetch and cache jobs
│   ├── useJobDetail.ts      # Hook for single job
│   └── useJobMutation.ts    # Hook for create/update/delete
├── pages/
│   └── JobsPage.tsx         # Full-page view (routes here)
├── types.ts                 # Feature-specific types (extends shared)
└── index.ts                 # Public exports (useJobs, JobList, etc.)
```

Each feature is self-contained. Someone looking to use the Jobs feature:
1. Looks in `features/jobs/`
2. Imports from `features/jobs/index.ts`
3. Uses the components and hooks

### Server Side

```
src/server/routes/jobs.ts
├── POST /jobs              → jobService.createJob()
├── GET /jobs               → jobService.listJobs()
├── GET /jobs/:id           → jobService.getJob()
├── PATCH /jobs/:id         → jobService.updateJob()
└── DELETE /jobs/:id        → jobService.deleteJob()

src/server/services/job.service.ts
├── createJob()
├── listJobs()
├── getJob()
├── updateJob()
├── deleteJob()
└── updateStatus()
```

Service layer groups all job business logic. Routes are thin.

### Shared

```
src/shared/
├── types/
│   ├── job.ts              # Job domain types
│   ├── document.ts         # Document types
│   ├── analysis.ts         # Analysis types
│   └── api.ts              # API request/response types
├── constants/
│   ├── job-states.ts       # Valid job statuses
│   └── skill-tags.ts       # Available skill categories
└── utils/
    └── validation.ts       # Validators (reused client + server)
```

Shared code that both client and server use.

---

## Example: Adding a New Feature

Adding a "Recommendations" feature:

**Step 1:** Create directory structure
```
src/client/features/recommendations/
├── components/
│   ├── RecommendationCard.tsx
│   └── RecommendationList.tsx
├── hooks/
│   └── useRecommendations.ts
├── pages/
│   └── RecommendationsPage.tsx
└── index.ts
```

**Step 2:** Add types
```typescript
// src/shared/types/recommendation.ts
export interface Recommendation {
  id: string;
  jobId: string;
  reason: string;
  confidence: number;
}
```

**Step 3:** Add backend
```typescript
// src/server/routes/recommendations.ts
router.get("/recommendations", (req, res) => {
  const recs = recommendationService.getRecommendations();
  res.json(recs);
});

// src/server/services/recommendation.service.ts
class RecommendationService {
  getRecommendations(): Recommendation[] {
    // Analysis logic
  }
}
```

**Step 4:** Use in frontend
```typescript
import { RecommendationList } from "@/features/recommendations";

function Dashboard() {
  return <RecommendationList />;
}
```

All code for "Recommendations" is in one place. Easy to understand, test, and maintain.

---

## Exceptions and Shared Code

### Layout Components
Layout components (navigation, three-panel layout) are shared:
```
src/client/components/layout/
├── ThreePanel.tsx
├── SourcesPanel.tsx
├── ChatPanel.tsx
└── Navigation.tsx
```

Used by multiple features, so they're shared.

### API Client
The fetch wrapper is shared:
```
src/client/api/client.ts
```

All features use it to communicate with server.

### Types
Domain types are shared:
```
src/shared/types/job.ts
src/shared/types/document.ts
```

Both client and server use these.

---

## Import Patterns

### Good: Import from feature
```typescript
import { JobList, useJobs } from "@/features/jobs";
```

### Good: Import from shared
```typescript
import { Job } from "@/shared/types";
import { validateEmail } from "@/shared/utils";
```

### Avoid: Cross-feature dependencies
```typescript
// Don't do this:
import { useJobs } from "@/features/jobs";
function DocumentsPanel() {
  const { jobs } = useJobs();
  // ...
}
```

If Document feature needs Jobs, they should both import from shared store instead.

---

## Scalability

As features grow, can add sub-layers:

```
src/client/features/jobs/
├── api/               # Feature-specific API calls
│   └── jobsApi.ts
├── store/             # Feature-specific Zustand store
│   └── jobsStore.ts
├── components/
├── hooks/
├── pages/
├── types.ts
└── index.ts
```

Still self-contained, just more organized internally.

---

## Testing

Each feature can be tested in isolation:

```typescript
describe("features/jobs", () => {
  describe("useJobs hook", () => {
    it("should fetch jobs on mount", async () => {
      // ...
    });
  });
  
  describe("JobList component", () => {
    it("should render list of jobs", () => {
      // ...
    });
  });
});
```

Test files live alongside source files:
```
src/client/features/jobs/
├── components/
│   ├── JobList.tsx
│   └── JobList.test.tsx
├── hooks/
│   ├── useJobs.ts
│   └── useJobs.test.ts
```

---

## Alternatives Considered

### Alternative 1: Layer-First (Rejected)
```
src/client/
├── components/
│   ├── JobList.tsx
│   ├── DocumentEditor.tsx
│   ├── AnalysisPanel.tsx
├── hooks/
│   ├── useJobs.ts
│   ├── useDocuments.ts
│   ├── useAnalysis.ts
└── pages/
    ├── JobsPage.tsx
    ├── DocumentsPage.tsx
```

**Problem:** Related code is scattered across directories. Hard to find and understand a feature.

### Alternative 2: Hybrid (Deferred)
Could use feature-first for client, layer-first for server:
- **Server stays layer-first** for now (clear separation of concerns)
- **Client uses feature-first** for UI organization
- **Could migrate server later if it grows**

**Current Decision:** Feature-first for client, layer-first for server. Can evolve later.

---

## Related Decisions

- ADR-003: Thin Express server (service layer is feature-oriented too)

---

## Verification Checklist

Before closing:
- [ ] Directory structure created per spec
- [ ] Each feature has its own index.ts
- [ ] No cross-feature dependencies (except through shared)
- [ ] Shared types extracted and exported
- [ ] Import paths configured in tsconfig.json
- [ ] Documentation explains structure
- [ ] New features added follow the pattern
