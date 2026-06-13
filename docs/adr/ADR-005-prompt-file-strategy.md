# ADR-005: Prompt File Strategy

**Date:** 2026-06-12

**Status:** ACCEPTED

**Authors:** Principal Engineer

---

## Context

JobOps uses Claude for:
- Job analysis against Master CV
- Resume generation
- Cover letter generation
- Gap identification
- Positioning refinement

Prompts are critical and need to be:
- Versioned (can revert if results degrade)
- Auditable (see what the AI was asked to do)
- Testable (can test prompt independently)
- Iterable (can refine without code changes)
- Documentable (explain why prompt is written a certain way)

Three prompt management strategies were considered:

1. **Prompts in files** — Stored in `.md` or `.txt`, loaded at runtime
2. **Prompts in code** — Stored as strings in TypeScript/JavaScript
3. **Prompts in database** — Stored in SQLite, updated via API

---

## Decision

**We choose Prompts as Files in /src/server/ai/prompts/:**

```
src/server/ai/prompts/
├── resume-generator.md
├── cover-letter-generator.md
├── job-analyzer.md
├── gap-identifier.md
└── positioning-refiner.md
```

Each prompt is a `.md` file that:
- Starts with metadata (version, author, last updated)
- Contains full prompt text with placeholders
- Includes usage notes and examples

---

## Rationale

### Auditability
Prompts are version-controlled in Git:
- Can see how prompts evolved
- Can revert if results degrade
- Can identify which prompt caused quality issues

Commit message clearly describes change:
```
feat: improve resume generator prompt to emphasize metrics

- Changed "describe your work" to "describe quantified achievements"
- Result: Generated resumes now include specific impact metrics
- Testing: Manually verified on 5 sample jobs
```

### Testability
Prompts can be tested independently:

```typescript
describe("resume-generator.md prompt", () => {
  it("should generate resume using only CV data", async () => {
    const prompt = loadPrompt("resume-generator");
    const context = buildContext(masterCV, job);
    const result = await claude(prompt, context);
    
    // Verify no hallucinated skills
    expect(result).not.toContain("Kubernetes");
    expect(result).toContain("React");  // From CV
  });
});
```

### Iterability
Refining prompts doesn't require code changes:
1. Edit `resume-generator.md`
2. Test with sample job
3. Commit if good
4. Deploy (just a file change)

No code review, build, or deployment needed for prompt tweaks.

### Documentation
Prompts can include explanations:

```markdown
# Resume Generator

**Version:** 2.0 (Updated 2026-06-01)
**Author:** Jane Smith
**Last Updated:** 2026-06-01
**Testing:** Verified on 20 sample jobs

## Purpose
Generate an ATS-optimized resume tailored to a specific job posting.

## Key Features
- Uses only information from the provided Master CV
- Emphasizes skills and experience relevant to the job
- Formats for ATS parsing (plain text friendly)

## Usage Example
See examples/ folder for sample inputs and outputs.

## Changelog
- 2.0: Changed format to emphasize quantified achievements
- 1.0: Initial version
```

### Separation of Concerns
Prompt iteration doesn't require developer expertise:
- Non-technical product manager can review prompts
- Can iterate without touching code
- Easy to spot issues (bad grammar, unclear instructions)

---

## Structure

### File Format

Each prompt file starts with YAML front matter, then markdown:

```markdown
---
version: "2.0"
author: "Jane Smith"
created: "2026-01-15"
last_updated: "2026-06-01"
description: "Generate ATS-optimized resume for a specific job"
testing: "Verified on 20 sample jobs; 0 hallucinations"
---

# Resume Generator Prompt

You are an expert resume writer who specializes in ATS-optimized resumes.

## Your Task
Generate a resume for {{CANDIDATE_NAME}} tailored to this job posting.

## Constraints
1. Use ONLY information from the provided Master CV
2. Do NOT invent skills, experiences, or metrics
3. Emphasize achievements with quantified impact
4. Format for ATS parsing (no fancy fonts, no graphics)

## Master CV
{{MASTER_CV}}

## Job Posting
{{JOB_DESCRIPTION}}

## Output Format
Return a resume in plaintext format...

---

## Instructions for Claude
- If any information is missing, mark with [UNKNOWN]
- If you're unsure about accuracy, include a confidence note
- Prioritize accuracy over completeness
```

### Loading Prompts

Prompts are loaded at server startup:

```typescript
// src/server/ai/loader.ts
async function loadPrompts(): Promise<Map<string, string>> {
  const prompts = new Map<string, string>();
  const promptDir = path.join(__dirname, "prompts");
  
  for (const file of await fs.readdir(promptDir)) {
    if (file.endsWith(".md")) {
      const content = await fs.readFile(path.join(promptDir, file), "utf-8");
      const { data, content: promptText } = matter(content);  // Parse YAML front matter
      
      prompts.set(file.replace(".md", ""), promptText);
    }
  }
  
  return prompts;
}

// Use in service
const prompts = await loadPrompts();
const resumePrompt = prompts.get("resume-generator");
```

### Using in Services

Services build context and call Claude:

```typescript
// src/server/services/ai.service.ts
async generateResume(masterCV: CV, job: Job): Promise<Resume> {
  // Load prompt
  const prompt = this.prompts.get("resume-generator");
  
  // Build context
  const context = `
Master CV:
${JSON.stringify(masterCV, null, 2)}

Job Description:
${job.description}
`;
  
  // Call Claude with structured output
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt.replace("{{MASTER_CV}}", context),
      },
    ],
  });
  
  // Parse and validate
  const resume = parseResume(response.content[0].text);
  await this.validateAgainstCV(resume, masterCV);
  
  return resume;
}
```

---

## Versioning Strategy

### Versioning in Filename (Simple)
```
resume-generator-v1.md
resume-generator-v2.md
resume-generator-v2-experimental.md
```

When experimenting, use `-experimental` suffix.

### Versioning in Metadata (Better)
```markdown
---
version: "2.0"
---
```

Single file, version tracked in front matter and Git history.

### Rolling Back
If prompt quality degrades:
1. `git log --oneline src/server/ai/prompts/`
2. Identify last good commit
3. `git show <hash>:src/server/ai/prompts/resume-generator.md > resume-generator.md`
4. Test and commit

---

## Testing Prompts

### Unit Testing
```typescript
describe("Prompts", () => {
  describe("resume-generator", () => {
    it("should use only CV data", async () => {
      const prompt = loadPrompt("resume-generator");
      const response = await testPrompt(prompt, {
        masterCV: { skills: ["React"] },
        job: { title: "Java Developer" },
      });
      
      expect(response).toContain("React");
      expect(response).not.toContain("Java");  // Not in CV
    });
  });
});
```

### Manual Testing
For each prompt, maintain a `tests/prompts/` folder:
```
tests/prompts/
├── resume-generator/
│   ├── input-cv.json
│   ├── input-job.md
│   ├── expected-output.md
│   └── notes.md
```

Run manually before committing prompt changes.

---

## Deployment

Prompts are deployed as part of code:
```bash
npm run build  # Bundles prompts into app
npm run deploy # Deploys with prompts
```

No separate prompt deployment needed.

### Rollback
If deployed prompt causes issues, rollback is Git-aware:
```bash
git revert <commit>  # Includes prompt changes
npm run build && npm run deploy
```

---

## Monitoring

Track prompt effectiveness in production:

```typescript
// Log in AiService
async generateResume(...) {
  const startTime = performance.now();
  const response = await anthropic.messages.create(...);
  const duration = performance.now() - startTime;
  
  logger.info("resume_generated", {
    prompt_version: "2.0",
    job_id: job.id,
    tokens_used: response.usage.output_tokens,
    duration_ms: duration,
    fabrication_check_passed: hasHallucinations ? "false" : "true",
  });
}
```

If quality degrades, can identify the prompt:
1. Check `fabrication_check_passed = "false"` logs
2. Find most recent prompt change
3. Compare old vs new prompt
4. Decide to fix or revert

---

## Alternatives Considered

### Alternative 1: Prompts in Code (Rejected)
```typescript
const RESUME_GENERATOR_PROMPT = `You are...`;
```

**Problems:**
- Not version-controlled cleanly
- Hard to review
- Requires code deployment for prompt changes
- Not readable

### Alternative 2: Prompts in Database (Rejected)
Store in SQLite and update via API:
```sql
INSERT INTO prompts (name, version, content)
VALUES ('resume-generator', '2.0', '...');
```

**Problems:**
- Database not version-controlled
- Hard to compare versions
- Can't use Git history
- Overkill for single-user app

---

## Related Decisions

- ADR-006: Anti-fabrication enforcement (uses these prompts)
- ADR-003: Thin Express server (AiService loads prompts)

---

## Verification Checklist

Before closing:
- [ ] Prompts directory created in `src/server/ai/prompts/`
- [ ] All 5 prompts created (resume, cover letter, analyzer, gap, positioning)
- [ ] Each prompt has YAML front matter
- [ ] Prompt loader implemented (reads `.md` files)
- [ ] Prompts loaded at server startup
- [ ] AiService uses loaded prompts
- [ ] Manual testing done on each prompt
- [ ] Git history tracks prompt changes
- [ ] Documentation explains structure
