# PDR-001: Lean Application Studio Pivot

**Date:** June 14, 2026  
**Status:** APPROVED (Branch: feature/lean-application-studio)  
**Decision Maker:** Erik Taylor  
**Stakeholders:** Product, Engineering  
**Review Date:** June 21, 2026

---

## Executive Summary

The JobOps application currently spans job analysis, workspace dashboards, recruiter chat, keyword analytics, and artifact versioning. The product direction is being narrowed into a **lean, one-job-at-a-time application studio** that focuses on the core user workflow: Career Memory → Job Description → Analysis → Resume + Cover Letter → Export → Mark Applied.

This decision preserves existing backend services and infrastructure while simplifying the user-facing experience to reduce cognitive load and ship faster.

---

## Current State Problem

**What we built:** A broad job workspace with:
- Multi-job dashboard
- Recruiter chatbot simulation
- Keyword heatmap analytics
- Conversation history tracking
- Version comparison and archiving UI
- Positioning selector
- Full workspace persistence

**What users want:** A focused tool to:
1. Remember their career history
2. Analyze one job at a time
3. Generate truthful, tailored resumes
4. Generate thoughtful cover letters
5. Save and mark jobs as applied

**The gap:** The current UI presents too many options, analytics, and interaction modes. Users need guidance, not complexity.

---

## Decision

**Pivot the application to a lean, single-job-focused studio.**

### Core Workflow (New UX)

```
┌─────────────────────────────────────────────────────────────┐
│ Career Memory                                               │
│ (Upload, edit, version)                                     │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ ONE Job at a Time                                           │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Paste job description, or select from saved list         ││
│ └──────────────────────────────────────────────────────────┘│
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Fit & Strategy                                              │
│ (Analyze fit, get strategic guidance)                       │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Resume Studio                                               │
│ ┌──────────────────┐  ┌──────────────────┐                 │
│ │ Preview          │  │ Download PDF     │                 │
│ │ Copy to Clipboard│  │ Save Version     │                 │
│ └──────────────────┘  └──────────────────┘                 │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Cover Letter Studio                                         │
│ (Generate, preview, refine)                                 │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Export & Mark Applied                                       │
│ (Save, mark this job as applied, move to next)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Product Principles for Lean Studio

### Core Principles (DO)

1. **One job at a time**  
   → User focuses on a single job, not a pipeline of 30 jobs.  
   → No multi-job dashboard as primary experience.

2. **Career Memory is the source of truth**  
   → All artifacts are derived from the career memory.  
   → User updates memory once; resumes stay consistent.

3. **Strategy before generation**  
   → Before creating resume, user sees fit analysis and gaps.  
   → Intentional positioning, not generic output.

4. **Resume + cover letter are the primary outputs**  
   → Everything in the UI serves these two artifacts.  
   → No side features distract from the core.

5. **Mark Applied closes the workflow**  
   → User explicitly marks job as applied to move to the next.  
   → Job saved for reference, tracking, follow-up.

6. **Preserve useful backend work**  
   → Keep all services, migrations, tests that support above.  
   → Don't rewrite what's already working.

7. **Hide complexity before deleting it**  
   → Move workspace dashboard, recruiter chat, heatmaps to Phase 2.  
   → Don't delete; de-emphasize.

### Non-Goals (DON'T)

1. **Full CRM**  
   → No contact tracking, email history, application notes.  
   → Focus: 30 minutes per job, then mark applied.

2. **Broad analytics dashboard**  
   → No heatmaps, success rates, funnel metrics.  
   → User doesn't need this to use the tool.

3. **Multi-job pipeline management as primary UX**  
   → Workspace dashboard is secondary.  
   → No "apply to 100 jobs" workflows.

4. **Recruiter simulation as primary experience**  
   → Chat with recruiter bot is secondary.  
   → User is talking to themselves, not a real recruiter.

5. **Large rewrite**  
   → Don't rebuild services or migration infrastructure.  
   → Reuse what works; simplify UI only.

6. **Destructive cleanup without usage audit**  
   → Don't delete services without verifying they're unused.  
   → Archive, de-emphasize, then delete if safe.

---

## Implementation Strategy

### Phase A: UI Simplification (Week 1-2)

1. **Create lean 3-panel layout**
   - Left: Career Memory editor + job list
   - Center: Job description + fit analysis
   - Right: Resume studio (generate → preview → export)

2. **Hide complexity**
   - Move workspace dashboard to `/workspace` (secondary route)
   - Move recruiter chat to Phase 2
   - Move heatmap analytics to Phase 2
   - Hide version history UI (keep backend)

3. **Keep it simple**
   - No conversation threads in main view
   - No keyword proposals or selection
   - No positioning selector (use default)
   - No version comparison UI

4. **Test the flow**
   - Career Memory → Job Input → Resume Generation → Export
   - Verify Copy/Download work
   - Verify Persistence (refresh doesn't lose data)

### Phase B: Consolidate Backend (Week 1, parallel)

1. **Resolve service duplication**
   - Delete artifact-engine.service.ts (dead)
   - Delete artifact-cache.service.ts (dead)
   - Keep artifact.service.ts (canonical)
   - Delete artifacts.ts route (deprecated)

2. **Clarify service boundaries**
   - Merge CareerModelService into CareerDocService
   - Delete prompt-builder.service.ts (legacy)
   - Keep ResumePromptBuilderService (active)

3. **Add missing safety**
   - Add rate limiting for Claude API calls
   - Add E2E test for complete generation flow
   - Document error codes and service map

### Phase C: Ship Lean Studio (Week 2)

1. **Deploy with minimal artifact**
   - Core features only
   - No analytics or recruiter chat in main UI
   - Link to Phase 2 features clearly

2. **Monitor usage**
   - Which features do users actually use?
   - Where do they get stuck?
   - What's missing?

3. **Plan Phase 2 based on telemetry**
   - Cover letters
   - Regeneration with positioning
   - Version comparison (if users want it)
   - Dashboard/analytics (if users ask)

---

## Architectural Implications

### What Stays (Unchanged)

- ✅ All database migrations (1-9)
- ✅ All services (33 services)
- ✅ All API routes (6 route files)
- ✅ All tests (456 tests)
- ✅ All business logic
- ✅ All Claude integration

### What Moves (To Phase 2 Routes)

- ⏭️ Workspace dashboard → `/workspace` (secondary route)
- ⏭️ Recruiter chat → Phase 2 implementation
- ⏭️ Keyword heatmap → Phase 2 implementation
- ⏭️ Conversation history UI → Hidden, persisted
- ⏭️ Version comparison → Phase 2 UI

### What Changes (UI Only)

- 🎨 Main layout → 3-panel studio (left: memory + jobs, center: analysis, right: artifacts)
- 🎨 Job page → Simplified (one job at a time)
- 🎨 Navigation → Hide complex features
- 🎨 Onboarding → Focus on career memory import

### What Gets Cleaned (After Audit)

- 🗑️ artifact-engine.service.ts (unused)
- 🗑️ artifact-cache.service.ts (unused)
- 🗑️ artifacts.ts route (deprecated)
- 🗑️ prompt-builder.service.ts (legacy)
- 🗑️ ConversationPanel component (if unused)
- 🗑️ DiffViewer component (if unused)

---

## Risk Assessment

### Low Risk

- ✅ **No database changes** — All migrations preserved
- ✅ **No API changes** — Route contract stays same
- ✅ **No service rewrites** — Keep all business logic
- ✅ **No test deletion** — Preserve 456 tests

### Medium Risk

- ⚠️ **UI simplification** — New layout must be tested
- ⚠️ **Feature hiding** — Ensure hidden features don't break
- ⚠️ **Phase 2 decisions** — What features actually launch?

### Mitigations

1. **Preserve on a branch** — feature/lean-application-studio
2. **Keep restoration tag** — pre-lean-pivot (restore any time)
3. **Archive old docs** — docs/ARCHIVE preserves pre-pivot state
4. **Stage UI changes** — Don't merge all at once
5. **Test before merging** — E2E tests must pass

---

## Success Criteria

### By End of Week 2 (Phase A + B Complete)

- [ ] Main layout is 3-panel (memory, analysis, studio)
- [ ] User can complete full workflow: Memory → Job → Resume → Export
- [ ] Workspace dashboard moved to secondary route
- [ ] Recruiter chat hidden (Phase 2)
- [ ] artifact-engine and artifact-cache deleted
- [ ] E2E test passes
- [ ] All 456 tests still passing
- [ ] Rate limiting implemented
- [ ] Build succeeds
- [ ] Type check clean

### By End of Week 3 (Phase C + Ship)

- [ ] Lean studio deployed to production
- [ ] Users can upload career memory
- [ ] Users can paste job descriptions
- [ ] Users can generate and export resumes
- [ ] "Mark Applied" closes the workflow
- [ ] Analytics tracking which features are used

---

## Rollback Plan

If the pivot fails or reveals critical issues:

1. **Restore to pre-lean-pivot tag**
   ```bash
   git checkout pre-lean-pivot
   ```

2. **Current state preserved in:**
   - `/docs/ARCHIVE/STATE-OF-THE-APP-AUDIT.md` — Full inventory
   - `/docs/ARCHIVE/SERVICE-OWNERSHIP.md` — Service map
   - `/docs/ARCHIVE/FEATURE-MATRIX.md` — Feature status
   - `/docs/PDR-001-*.md` — Decision record

3. **Time to rollback:** < 5 minutes
4. **Data loss risk:** NONE (database untouched)

---

## Approval & Sign-Off

| Role | Name | Date | Sign-Off |
|------|------|------|----------|
| Product Owner | Erik Taylor | 2026-06-14 | ✅ APPROVED |
| Engineering Lead | Erik Taylor | 2026-06-14 | ✅ APPROVED |
| QA Lead | — | — | ⏳ PENDING |
| Stakeholders | — | — | ⏳ ASYNC |

---

## Next Steps

1. ✅ **Create branch & checkpoint** (DONE: feature/lean-application-studio)
2. ⏳ **Design 3-panel layout** (Week 1, Day 1)
3. ⏳ **Implement lean UI** (Week 1, Days 2-5)
4. ⏳ **Consolidate backend** (Week 1, parallel)
5. ⏳ **Add E2E tests** (Week 1, Day 5)
6. ⏳ **Ship to staging** (Week 2, Day 1)
7. ⏳ **Internal test** (Week 2, Days 2-3)
8. ⏳ **Ship to production** (Week 2, Day 5)

---

## Related Documents

- **STATE-OF-THE-APP-AUDIT.md** — Current inventory (62% aligned)
- **SERVICE-OWNERSHIP.md** — Service map and consolidation needs
- **FEATURE-MATRIX.md** — Feature completion status
- **ADR-005** — Original architecture decision record
- **ARCHITECTURE.md** — System overview

---

## Questions & Decisions Log

### Q: What about the recruiter chat feature?
**A:** Move to Phase 2. It's a nice-to-have, not essential for the lean studio. Users may find it distracting when they're focused on a single job.

### Q: Do we keep the workspace dashboard?
**A:** Yes, but move it to a secondary route (`/workspace`). It becomes optional for power users, not the primary experience.

### Q: What about cover letters?
**A:** Phase 2. Implement after lean studio ships and we get user feedback. Resume alone may be sufficient for some users.

### Q: How do we handle conversation history?
**A:** Keep backend persistence (database), but hide chat UI. If users ask for it in Phase 2, we can re-enable with minimal work.

### Q: What if users want the old dashboard?
**A:** It'll still be accessible at `/workspace`. We'll monitor usage and decide in Phase 2 if it's worth polishing or if the lean UI is preferred.

---

**End of PDR-001**
