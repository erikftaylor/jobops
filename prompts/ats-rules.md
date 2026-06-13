# ATS Analysis Rules

## Scoring Methodology

The estimated ATS fit is calculated as a **weighted combination** of:

### 1. Keyword Match (40%)
- Count exact skill matches from job requirements vs. career document
- Check for technology alignment (frameworks, languages, tools)
- Consider near-misses (similar but not exact matches)
- Score: (matched_keywords / required_keywords) × 100

### 2. Experience Coverage (35%)
- Years of relevant experience requirement
- Direct vs. transferable experience counts differently
- Seniority level alignment
- Score: (years_satisfied / years_required) × 100, capped at 100

### 3. Role Fit (15%)
- Title alignment (exact, similar, or adjacent)
- Scope alignment (team size, impact scale, complexity)
- Industry familiarity (direct, regulated, emerging tech)
- Score: 0 (no match), 50 (adjacent), 100 (direct match)

### 4. Soft Gaps (10%)
- Certification/education requirements (if optional)
- Preferred but not required technologies
- Nice-to-have skills present
- Score: (satisfied_preferences / total_preferences) × 100

## Confidence Levels

- **DIRECT**: Evidence exists in career document, explicit match
- **TRANSFERABLE**: Skills present but require adaptation/explanation
- **ADJACENT**: Related skills that could transfer with learning
- **GAP**: No evidence; skill/experience missing

## Red Flag Categories

1. **Hard Stops**: Deal-breaker gaps (e.g., required security clearance, specific license)
2. **Significant Gaps**: Major misalignments (e.g., required 10+ years, have 3)
3. **Learning Curve**: Required skills not in current toolkit
4. **Industry Mismatch**: Entering new regulatory/domain context
5. **Scope Mismatch**: Role significantly larger/smaller than current work

## Verdict Rules

- **APPLY**: ATS fit ≥ auto_proceed_threshold (default 75)
- **STRETCH**: ATS fit between minimum_floor_threshold (default 50) and auto_proceed_threshold
- **SKIP**: ATS fit < minimum_floor_threshold

These thresholds are configurable per user settings.
