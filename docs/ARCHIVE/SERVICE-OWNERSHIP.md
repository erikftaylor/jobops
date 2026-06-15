# Service Ownership Map

**Date:** June 14, 2026  
**Status:** Pre-Lean-Pivot Checkpoint  
**Purpose:** Preserve knowledge about service boundaries and domain ownership

---

## Core Services (Essential, Keep)

### Resume Generation Domain ⚠️ DUPLICATION ALERT
- **ResumeGeneratorService** (150 LOC) — Orchestrates Claude → validation → persistence
  - Status: **CANONICAL (Phase 1)**
  - Tests: ✅ 10 tests (hallucination detection)
  - Used by: `job-artifacts.ts`
  
- **artifact-engine.service.ts** (150 LOC) — Legacy artifact orchestration
  - Status: **DUPLICATE - MARKED FOR DELETION**
  - Used by: Deprecated `artifacts.ts` route

### Artifact Persistence Domain ⚠️ DUPLICATION ALERT
- **ArtifactService** (200 LOC) — CRUD for job_artifacts table
  - Status: **CANONICAL (Phase 1)**
  - Tests: ✅ 11 tests
  - Table: `job_artifacts` (migration 009)
  
- **artifact-cache.service.ts** (150 LOC) — Legacy caching layer
  - Status: **DUPLICATE - MARKED FOR DELETION**
  - Table: `cached_artifacts` (migration 006)

### Career Profile Domain ⚠️ DUPLICATION ALERT
- **CareerDocService** (200 LOC) — Career document parsing, versioning
  - Status: **AUTHORITATIVE**
  - Used by: Server startup, workspace routes
  
- **CareerModelService** (150 LOC) — Career model operations
  - Status: **SECONDARY - UNCLEAR BOUNDARY**
  - Tests: ✅ 15 tests
  - Action: Merge with CareerDocService

### AI Integration
- **ClaudeService** (150 LOC) — Wrapper for Claude API
  - Status: **AUTHORITATIVE**
  - Used by: ResumeGeneratorService, analysis services
  - Tests: ✅ Tests exist

### PDF Export
- **PDFExportService** (150 LOC) — Generates PDF from template
  - Status: **AUTHORITATIVE**
  - Used by: `job-artifacts.ts`
  - Tests: ✅ Tests exist

- **PDFTemplateService** (100 LOC) — Renders JSON to HTML
  - Status: **AUTHORITATIVE**
  - Used by: PDFExportService
  - Tests: ✅ Tests exist

---

## Analysis Services (Workspace Feature)

- **FitAnalyzerService** (200 LOC) — Job fit scoring (0-100)
- **HeatmapAnalyzerService** (200 LOC) — Keyword-to-job heatmap
- **KeywordAnalyzerService** (150 LOC) — Extracts keywords from jobs/CV
- **RecruiterChatService** (150 LOC) — AI-driven recruiter persona

All have tests. Status: Feature-complete but may not be needed in lean pivot.

---

## Business Logic Services (Job + Workspace)

- **JobService** (200 LOC) — Job CRUD, state tracking
  - Tests: ✅ 8 tests
  - Status: **ESSENTIAL**

- **ConversationService** (200 LOC) — Message history, chat flows
  - Tests: ✅ 15 tests
  - Status: **FEATURE** (May defer in lean pivot)

- **SettingsService** (100 LOC) — User preferences
  - Tests: ✅ Tests exist
  - Status: **FEATURE**

---

## Workspace Services (Dashboard Feature)

- **WorkspacePersistenceService** (150 LOC) — Saves workspace state
- **WorkspaceRecalculationService** (150 LOC) — Recomputes analytics

Status: Feature-complete but may be overkill for lean pivot (one job at a time).

---

## Prompt/Template Services

- **ResumePromptBuilderService** (100 LOC) — Constructs resume prompts
  - Status: **CANONICAL**
  - Used by: ResumeGeneratorService

- **prompt-builder.service.ts** (200 LOC) — Legacy prompt builder
  - Status: **DUPLICATE - MARKED FOR DELETION**

- **TemplateService** (100 LOC) — Template management
  - Status: **UNCLEAR** — Needs audit

---

## Support Services (Lower Priority)

- EventBusService — Event publishing (usage unclear)
- ChangeGraphService — Structured change tracking (usage unclear)
- ChangeSetService — Change aggregation (usage unclear)
- AnalyticsService — Telemetry (deferred)
- PositioningProfileService — Positioning data (deferred)
- OutputContractService — Output type contracts (utility)
- KeywordProposalService — Keyword suggestions (feature)

---

## Service Consolidation Opportunities

### Duplication to Resolve Before Lean Pivot

| Current State | Consolidation Target | Effort |
|---|---|---|
| artifact-engine + ArtifactService | Keep ArtifactService only | 2 hrs |
| artifact-cache + job_artifacts | Keep job_artifacts only | 3 hrs |
| CareerDoc + CareerModel | Merge into CareerDocService | 4 hrs |
| prompt-builder + ResumePromptBuilder | Keep ResumePromptBuilder | 2 hrs |

**Total cleanup effort:** ~11 hours  
**Expected lines removed:** -600 LOC

---

## Routes Using Each Service

| Service | Route File | Endpoint |
|---------|-----------|----------|
| ResumeGeneratorService | job-artifacts.ts | POST /:jobId/artifacts/generate |
| ArtifactService | job-artifacts.ts | GET/PATCH /:jobId/artifacts/* |
| PDFExportService | job-artifacts.ts | POST /:jobId/artifacts/:id/pdf |
| JobService | jobs.ts | GET/POST /:jobId, DELETE |
| FitAnalyzerService | analysis.ts | POST /:jobId/analyze |
| ConversationService | conversation.ts | POST/, GET/:jobId/* |
| All workspace services | workspace.ts | GET/, POST/* |

---

## Pre-Lean-Pivot Checklist

Before starting the lean pivot, resolve these service conflicts:

- [ ] Consolidate artifact storage (job_artifacts is canonical)
- [ ] Delete artifact-engine.service.ts
- [ ] Delete artifact-cache.service.ts
- [ ] Decide: Keep or merge CareerModelService
- [ ] Delete prompt-builder.service.ts (legacy)
- [ ] Audit EventBus, ChangeGraph usage
- [ ] Document which services are essential for lean pivot

---

## Recommended Service Retention for Lean Pivot

**Keep these (core to resume studio):**
- ResumeGeneratorService
- ArtifactService
- PDFExportService
- PDFTemplateService
- ClaudeService
- CareerDocService
- JobService
- SettingsService

**Consider deferring (workspace/dashboard features):**
- FitAnalyzerService (Can re-add later)
- HeatmapAnalyzerService (Dashboard only)
- KeywordAnalyzerService (Dashboard only)
- RecruiterChatService (Chat feature)
- ConversationService (Chat feature)
- WorkspacePersistenceService (Dashboard only)
- WorkspaceRecalculationService (Dashboard only)

**Delete (confirmed dead code):**
- artifact-engine.service.ts
- artifact-cache.service.ts
- prompt-builder.service.ts

---

## Migration Status

All 9 migrations should be preserved:
- 001-002: Initial schema + job state
- 005: Conversations
- 006: Artifacts + templates + career models
- 007: Keyword proposals
- 008: Workspace persistence
- 009: job_artifacts (Phase 1, essential for resume studio)

No migrations need to be deleted for the lean pivot.
