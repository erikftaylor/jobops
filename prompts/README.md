# JobOps Prompts

This directory contains versioned prompts for Claude AI operations in JobOps.

## Current Prompts (Coming in Phase 3+)

- `job-analyzer.md` — Analyze job posting against Master Career Document
- `gap-identifier.md` — Identify skills and experience gaps
- `positioning-refiner.md` — Suggest positioning angles for applications
- `resume-generator.md` — Generate ATS-optimized resume for a job
- `cover-letter-generator.md` — Generate human cover letter for a job

## Prompt Format

Each prompt file:
- Starts with YAML front matter (version, author, updated date)
- Contains the full prompt with placeholders (e.g., `{{MASTER_CV}}`)
- Is a `.md` file for readability and version control
- Is loaded at server startup
- Can be updated without code changes

## Example Structure

```markdown
---
version: "1.0"
author: "Engineer Name"
created: "2026-06-12"
last_updated: "2026-06-12"
description: "What this prompt does"
testing: "Verification notes"
---

# Prompt Title

Your prompt content here...
```

## Loading Prompts

Prompts are loaded by `src/server/ai/loader.ts` at server startup. Changes to prompt files are picked up on server restart.

## Anti-Fabrication in Prompts

All prompts must:
1. Explicitly instruct Claude to use ONLY information from the provided data
2. Include examples of what NOT to do
3. Ask Claude to flag uncertain information

Example:
```markdown
## Constraints
1. Use ONLY information from the provided Master CV
2. Do NOT invent skills, experiences, or metrics
3. Do NOT exaggerate achievement metrics
4. If unsure about accuracy, mark with [UNCERTAIN]
```
