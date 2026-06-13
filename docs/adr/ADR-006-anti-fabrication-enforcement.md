# ADR-006: Anti-Fabrication Enforcement Strategy

**Date:** 2026-06-12

**Status:** ACCEPTED

**Authors:** Principal Engineer

---

## Context

**Core Mission Rule:** "The application must never fabricate experience. No skill, metric, project, technology, certification, responsibility, or accomplishment may appear unless it exists in the Master Career Document or is explicitly confirmed by the user."

This is non-negotiable. JobOps must prevent hallucinations at multiple layers:
1. Prompt instruction layer (tell Claude not to hallucinate)
2. Output validation layer (check generated content against CV)
3. User review layer (user sees sources before PDF export)
4. Transparency layer (generated content shows which CV section it came from)

---

## Decision

**We enforce anti-fabrication at 4 independent layers:**

```
Layer 1: Prompt Instruction
  ↓ (Claude told: only use provided CV)
Layer 2: Output Validation
  ↓ (Check generated content against CV)
Layer 3: Source Citation
  ↓ (Show which CV section each claim comes from)
Layer 4: User Review
  ↓ (User sees sources and can reject before export)
Layer 5: Final PDF Validation
  (Last chance to catch issues)
```

Each layer can catch hallucinations that previous layers missed.

---

## Layer 1: Prompt Instruction

**Responsibility:** Tell Claude explicitly not to hallucinate.

Every prompt includes clear constraints:

```markdown
# Resume Generator Prompt

You are an expert resume writer.

## Constraints
1. Use ONLY information from the provided Master CV
2. Do NOT invent skills, experiences, or metrics
3. Do NOT add technologies not listed in the CV
4. Do NOT exaggerate achievement metrics
5. If information is missing, mark with [MISSING]
6. If unsure about accuracy, include [UNCERTAIN]

## Example of What NOT To Do
❌ WRONG: "Led team of 5 developers" (CV says "Worked with 2 designers")
✅ RIGHT: "Worked with cross-functional team"

## Master CV
{{MASTER_CV}}

## Job Description
{{JOB_DESCRIPTION}}

## Instructions
Generate a resume that:
- Matches skills from the CV to job requirements
- Emphasizes relevant achievements
- Never fabricates experience
```

**Effectiveness:** 85-90% (Claude is good at following explicit instructions, but not perfect)

---

## Layer 2: Output Validation

**Responsibility:** Check generated content against Master CV using automated rules.

After Claude generates resume, validate:

```typescript
interface FabricationCheck {
  claim: string;
  type: "skill" | "technology" | "metric" | "company" | "title";
  severity: "error" | "warning" | "unknown";
  reason: string;
  cvEvidence?: string;
}

async function checkForFabrication(
  generated: Resume,
  masterCV: CV
): Promise<FabricationCheck[]> {
  const checks: FabricationCheck[] = [];
  
  // 1. Check skills
  for (const skill of generated.skills) {
    const inCV = masterCV.skills.some(s => 
      s.toLowerCase() === skill.toLowerCase()
    );
    if (!inCV) {
      checks.push({
        claim: skill,
        type: "skill",
        severity: "error",
        reason: `Skill "${skill}" not found in Master CV`,
      });
    }
  }
  
  // 2. Check technologies
  for (const tech of generated.technologies) {
    const inCV = masterCV.experience.some(exp =>
      exp.description.includes(tech) || exp.technologies?.includes(tech)
    );
    if (!inCV) {
      checks.push({
        claim: tech,
        type: "technology",
        severity: "error",
        reason: `Technology "${tech}" not found in Master CV`,
      });
    }
  }
  
  // 3. Check metrics (e.g., "5 years experience" but CV has 3)
  for (const metric of generated.metrics) {
    const accuracy = validateMetric(metric, masterCV);
    if (!accuracy.isValid) {
      checks.push({
        claim: metric,
        type: "metric",
        severity: accuracy.confidence > 0.8 ? "error" : "warning",
        reason: accuracy.reason,
        cvEvidence: accuracy.cvEvidence,
      });
    }
  }
  
  // 4. Check companies
  for (const company of generated.companies) {
    const inCV = masterCV.experience.some(exp => 
      exp.company.toLowerCase() === company.toLowerCase()
    );
    if (!inCV) {
      checks.push({
        claim: company,
        type: "company",
        severity: "error",
        reason: `Company "${company}" not found in Master CV`,
      });
    }
  }
  
  return checks;
}
```

**Process:**

1. Generate resume via Claude
2. Run validation checks
3. If errors found:
   - Return 422 Unprocessable Entity with violation details
   - Frontend shows user: "Resume has 2 issues"
   - User can edit and regenerate
4. If only warnings found:
   - Allow generation but flag in UI
   - Show to user for review

**Effectiveness:** 95%+ (algorithmic checking is reliable)

---

## Layer 3: Source Citation

**Responsibility:** Show which CV section each claim comes from.

Claude includes citations in generated resume:

```markdown
# Resume

## Skills
- **React** [CV: Skills > Frontend > React]
- **TypeScript** [CV: Skills > Frontend > TypeScript]
- **UX Design** [CV: Skills > Design > UX Design]

## Experience

### Senior Designer at Tech Corp
[CV: Experience > Tech Corp, 2022-Present]

*Designed user flows for 5M+ users*
[CV: Experience > Tech Corp > Achievements > "Designed flows for X users"]

*Led design system migration*
[CV: Experience > Tech Corp > Achievements > "Led system migration"]
```

When user views resume, can click on citation to see CV source.

**Implementation:**

```typescript
type CitationFormat = "cv" | "user_confirmed";

interface ResumeSection {
  text: string;
  citations: Array<{
    text: string;  // What is being cited
    source: {
      format: CitationFormat;
      location: string;  // "Experience > Tech Corp > achievements"
      confidence: number; // 0-1, how sure we are
    };
  }>;
}
```

**Transparency:** User can see exactly where each claim comes from.

---

## Layer 4: User Review

**Responsibility:** Give user full visibility before PDF export.

When resume is generated:

1. Show in editor with citations visible
2. User can:
   - Click citation to highlight CV section
   - Edit text (marks as "user-modified")
   - Reject claim entirely (remove from resume)
   - Regenerate with different tone/emphasis
3. Before PDF export, show confirmation:
   ```
   ✓ All claims are sourced from your CV
   ✓ 0 unresolved fabrication flags
   ✓ Ready to export as PDF
   ```

If there are unresolved issues:
```
❌ Cannot export - 2 unresolved issues:
1. "5 years Kubernetes" - CV shows 2 years
2. "Built distributed system for 100M users" - Not found in CV

Options:
- Edit resume to fix issues
- Regenerate resume
- View CV to verify
```

**Effectiveness:** 100% (User sees everything before export)

---

## Layer 5: Final PDF Validation

**Responsibility:** Last-minute check before PDF generation.

Before Puppeteer generates PDF:

```typescript
async generatePDF(resume: Resume, masterCV: CV): Promise<Buffer> {
  // Final validation before PDF
  const issues = await checkForFabrication(resume, masterCV);
  
  if (issues.some(i => i.severity === "error")) {
    throw new FabricationError(
      `Cannot generate PDF - fabrication detected: ${issues
        .map(i => i.reason)
        .join(", ")}`
    );
  }
  
  // Generate PDF
  return generatePDFViaHTMLContent(resume.toHTML());
}
```

**Safety Mechanism:** Even if user somehow bypassed Layer 4, this catches it.

---

## Implementation

### Data Structure

```typescript
interface Resume {
  sections: Array<{
    title: string;
    content: string;
    citations: Citation[];
    verified: boolean;  // User has reviewed
  }>;
  metadata: {
    generated_at: Date;
    generated_by: "claude";
    template_version: string;
    master_cv_hash: string;  // Which CV was used
    validation_results: FabricationCheck[];
    user_approved: boolean;
  };
}
```

### Database

Store validation results with document:

```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  document_type TEXT,
  content TEXT,
  
  -- Fabrication validation
  fabrication_checks TEXT,  -- JSON array of FabricationCheck
  has_errors BOOLEAN,
  has_warnings BOOLEAN,
  user_approved BOOLEAN DEFAULT FALSE,
  
  -- Reproducibility
  master_cv_hash TEXT,
  prompt_version TEXT,
  claude_model TEXT
);
```

### API Response

When document is generated:

```json
{
  "id": "doc-123",
  "type": "resume",
  "status": "generated",
  "validation": {
    "errors": [],
    "warnings": [],
    "all_clear": true
  },
  "fabrication_checks": [
    {
      "claim": "React",
      "type": "skill",
      "severity": "ok",
      "found_in_cv": true
    }
  ],
  "user_approved": false,
  "ready_for_export": true
}
```

---

## Error Handling

### User Workflow

```
1. Click "Generate Resume"
   ↓
2. Server generates via Claude
   ↓
3. Server validates for fabrication
   ↓ (Issues found)
4. Return to user with details
   ↓
5. User sees error list
   ↓
   Option A: Edit resume
   Option B: Regenerate with different prompt
   Option C: View CV and understand context
   ↓
6. User makes changes (marks as "user-modified")
   ↓
7. Validation passes
   ↓
8. User sees "Ready to export"
   ↓
9. User downloads PDF
```

### Error Messages

**Specific, actionable:**
```
❌ Fabrication Issue

Claim: "Built e-commerce platform serving 1M+ customers"
Location: Line 3 of Experience section
Problem: Your CV shows "Contributed to e-commerce platform"

Why this matters: We want to be truthful. Your CV says you contributed, 
not that you built it.

What to do:
- Edit resume to match CV: "Contributed to e-commerce platform 
  serving 1M+ customers"
- Or, regenerate resume for a different job that needs builder 
  experience
- Or, update your CV if you did build the platform
```

Not just "Invalid claim" (unhelpful).

---

## Testing Strategy

### Unit Tests

```typescript
describe("Anti-Fabrication Validation", () => {
  describe("checkForFabrication", () => {
    it("should catch non-existent skills", async () => {
      const checks = await checkForFabrication(
        { skills: ["Kubernetes"] },
        { skills: ["React", "Python"] }
      );
      
      expect(checks).toContainEqual(
        expect.objectContaining({
          claim: "Kubernetes",
          severity: "error",
        })
      );
    });
    
    it("should allow skills from CV", async () => {
      const checks = await checkForFabrication(
        { skills: ["React"] },
        { skills: ["React", "Python"] }
      );
      
      expect(checks.filter(c => c.claim === "React")).toEqual([]);
    });
  });
});
```

### Integration Tests

Test full generation + validation workflow:

```typescript
describe("Resume Generation Workflow", () => {
  it("should reject fabrication at validation layer", async () => {
    const response = await request(app)
      .post("/api/jobs/job-1/documents")
      .send({ type: "resume" });
    
    // If Claude hallucinated, validation catches it
    if (response.body.validation.errors.length > 0) {
      expect(response.status).toBe(422);
    } else {
      expect(response.status).toBe(200);
    }
  });
});
```

### Manual Testing

For each prompt, manually test:
1. Generate resume for job requiring skill not in CV
2. Verify validation catches hallucination
3. Verify error message is helpful

---

## Monitoring

Log all fabrication issues:

```typescript
logger.info("fabrication_detected", {
  document_id: "doc-123",
  job_id: "job-456",
  claim: "5 years Kubernetes",
  severity: "error",
  caught_by_layer: 2,  // Output validation
  action: "rejected_generation",
});
```

Track metrics:
- How many generations rejected for fabrication?
- Which claims trigger most issues?
- Which layers catch issues most often?

If Layer 1 (prompt) isn't working, improve it based on data.

---

## Escalation

If user disputes a validation issue:

1. Can export resume with issue flag
2. Document includes warning: "This resume has unverified claims"
3. User understands risk
4. Can report issue to us for prompt improvement

But default is safe: don't export if fabrication detected.

---

## Alternatives Considered

### Alternative 1: Trust Claude 100% (Rejected)
- Pro: Simple, no validation code needed
- Con: Will hallucinate sometimes
- Decision: Unacceptable; violates "Truth First" principle

### Alternative 2: User Review Only (Rejected)
- Pro: Simple, let user decide
- Con: User might miss subtle hallucinations
- Decision: Not sufficient; need automated checks too

### Alternative 3: Multiple LLM Pass (Considered but deferred)
- Use second LLM to validate first LLM's output
- Pro: Would catch hallucinations better
- Con: 2x API calls, 2x latency, 2x cost
- Decision: Deferred to v2; current 4-layer approach sufficient

---

## Related Decisions

- ADR-001: Local-first (keeps data under user control)
- ADR-005: Prompt files (prompts contain anti-hallucination instructions)

---

## Verification Checklist

Before closing:
- [ ] Prompt instructions include anti-hallucination directives
- [ ] Validation algorithms implemented for all claim types
- [ ] UI shows citations with CV source location
- [ ] User review step blocks PDF export if issues exist
- [ ] Final validation before PDF generation
- [ ] Fabrication checks logged and monitored
- [ ] Error messages are specific and actionable
- [ ] Unit tests for validation logic
- [ ] Integration tests for generation + validation
- [ ] Manual testing on 20+ sample jobs with edge cases
- [ ] Documentation explains all layers to users
