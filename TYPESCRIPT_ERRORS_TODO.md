# Pre-existing TypeScript Errors - Follow-up Task List

**Status:** 40+ pre-existing TypeScript errors identified outside Phase 2d scope  
**Release Impact:** Review needed before V1 ship date  
**Created:** 2026-06-13

---

## Error Categories & Tasks

### 1. CareerModel Type Issues (HIGHEST PRIORITY)
**Count:** 18 errors across multiple files  
**Files Affected:**
- `src/server/services/career-model.service.ts`
- `src/server/services/artifact-engine.service.ts`
- `src/server/services/__tests__/career-model.service.test.ts`

**Error Patterns:**
- ❌ `Property 'hash' does not exist on type 'CareerModel'`
- ❌ `Property 'source' does not exist on type 'CareerModel'`
- ❌ `Property 'totalExperienceYears' does not exist`
- ❌ `Property 'topSkills' does not exist`
- ❌ `Property 'skillsCount' does not exist`
- ❌ `Type 'CareerModelMetadata' is missing properties`

**Potential Root Cause:** CareerModel interface/type definition may be out of sync with service implementation or tests.

**Action Items:**
- [ ] Review CareerModel type definition in shared types
- [ ] Verify CareerModelMetadata interface completeness
- [ ] Audit career-model.service.ts for missing property assignments
- [ ] Update tests to match current CareerModel structure
- [ ] Consider if new properties were added but types weren't updated

**Release Blocker Risk:** ⚠️ POSSIBLE - Need to determine if these are real missing properties or type definition issues

---

### 2. Unused Variable Warnings (LOW PRIORITY)
**Count:** 5 errors  
**Files Affected:**
- `src/client/features/workspace/components/RecruiterChat.tsx` ✅ **FIXED in Phase 2d**
- `src/client/lib/analytics.ts`
- `src/server/services/claude.service.ts`
- `src/server/services/fit-analyzer.service.ts`
- `src/server/services/keyword-analyzer.service.ts`

**Error Patterns:**
- `'eventLog' is declared but its value is never read`
- `'schema' is declared but its value is never read`
- `'requiredCount' is declared but its value is never read`
- `'resumeKeywords' is declared but its value is never read`
- `'determineStatus' is declared but its value is never read`

**Action Items:**
- [ ] Audit each unused variable - determine if it should be removed or used
- [ ] Check if these are placeholder variables for future functionality
- [ ] Remove or implement usage for each

**Release Blocker Risk:** ❌ LOW - These are warnings, not errors

---

### 3. Undefined Properties (MEDIUM PRIORITY)
**Count:** 12 errors in test files  
**Files Affected:**
- `src/server/services/__tests__/career-model.service.test.ts`
- `src/server/services/prompt-composer.service.ts`

**Error Patterns:**
- ❌ `Argument of type 'string | undefined' is not assignable to parameter of type 'string'`
- ❌ `Property 'jobDescription' does not exist`

**Action Items:**
- [ ] Review null-coalescing and optional chaining usage
- [ ] Ensure job description is always provided where required
- [ ] Add proper null checks or use non-null assertions if safe
- [ ] Update tests to provide all required properties

**Release Blocker Risk:** ⚠️ POSSIBLE - Depends on whether these can be undefined in prod

---

### 4. Build Warnings (LOWEST PRIORITY)
**Count:** 3 esbuild warnings  
**Files Affected:**
- `src/server/index.ts`
- `src/server/services/cv.service.ts`
- `src/server/db/database.ts`

**Warning Pattern:**
- `"import.meta" is not available with the "cjs" output format`

**Action Items:**
- [ ] Either switch server build to ESM or remove import.meta usage
- [ ] Replace with Node.js alternatives if possible
- [ ] Document if import.meta is needed for future functionality

**Release Blocker Risk:** ❌ LOW - These are warnings, not errors, and don't affect functionality

---

## Implementation Priority

### Phase 1: Pre-V1 Release (REQUIRED)
1. **CareerModel type alignment** - Resolve 18 errors
   - Estimated effort: 2-3 hours
   - Required to ensure data consistency
   
2. **Undefined property handling** - Resolve 12 errors
   - Estimated effort: 1-2 hours
   - Critical for type safety in production

### Phase 2: Optional (CAN DEFER POST-V1)
1. **Unused variables cleanup** - Resolve 5 warnings
   - Estimated effort: 30 minutes
   - Code hygiene only
   
2. **Build warnings** - Resolve 3 warnings
   - Estimated effort: 1 hour
   - No functional impact

---

## Verification Checklist

Before marking each task complete:
- [ ] Type error count reduced/eliminated
- [ ] All related tests pass
- [ ] Build succeeds with no new errors
- [ ] No regression in functionality
- [ ] Code compiles cleanly in IDE

---

## Notes

- **Not touching in Phase 2d** - These errors existed before accessibility work
- **Accessibility changes introduced 0 new TypeScript errors**
- **All Phase 2d tests pass** despite pre-existing repo errors
- **Safe to defer** - These don't block accessibility release, only V1 type-safety release

---

## Related Files (for reference)
- Main type definitions: `src/shared/types/`
- CareerModel service: `src/server/services/career-model.service.ts`
- Artifact engine: `src/server/services/artifact-engine.service.ts`
- Service tests: `src/server/services/__tests__/`
