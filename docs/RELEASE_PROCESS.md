# JobOps Release Process

**Version:** 1.0.0-rc1  
**Updated:** 2026-06-13

---

## Overview

This document describes the process for creating and publishing releases of JobOps. It covers pre-release verification, version tagging, GitHub push, and post-release validation.

---

## Pre-Release Verification

### 1. Code Quality Check

Before creating any release tag, verify the codebase is production-ready.

```bash
# TypeScript compilation (must be 0 errors)
npm run type-check

# Test suite (must be 345/345 passing)
npm test -- --run

# Build for production
npm run build
```

**Expected Results:**
- TypeScript: 0 errors
- Tests: 345 passing
- Build: successful (no blocking warnings)

**If any fail:**
1. Do not create release tag
2. Fix the issue
3. Re-run verification
4. Only proceed when all pass

### 2. Manual QA Testing

Run the QA checklist from `docs/QA_CHECKLIST.md`:

```bash
# Key smoke tests (all 6 must pass)
[ ] Add Job → Appears in List
[ ] Open Workspace → Scores Load
[ ] Missing Keywords → Accept → Score Updates
[ ] Ask Question → Response Loads
[ ] Generate Artifacts → View Variants → Select
[ ] Browser Refresh → Data Persists

# Recruiter Workspace QA
[ ] Score display accurate
[ ] Categories show correctly
[ ] Recommendations present

# Missing Keywords
[ ] Keywords list loads
[ ] Filtering works (All/Critical/Missing)
[ ] Suggestion display helpful
[ ] Acceptance removes from list
[ ] Score updates

# Chat
[ ] All 4 questions load
[ ] Responses professional
[ ] Risks identified
[ ] Suggestions actionable

# Artifacts
[ ] Variants generated
[ ] Scores differ between variants
[ ] Content readable
[ ] Selection persists

# Error Recovery
[ ] Network timeout handled
[ ] Service unavailable handled
[ ] Job not found handled
[ ] Invalid input rejected

# Accessibility
[ ] Keyboard navigation works
[ ] Focus visible on all buttons
[ ] Screen reader compatible
[ ] Color contrast WCAG AA

# Performance
[ ] Workspace loads < 2s
[ ] Chat responds < 3s
[ ] Artifacts generate < 5s
[ ] No lag on interactions
```

**If any test fails:**
1. Create issue in KNOWN_ISSUES.md if it's a known limitation
2. Fix the bug if it's a release blocker
3. Re-test after fix
4. Only proceed when all critical tests pass

### 3. Documentation Review

Verify all documentation is current:

```bash
# Check these files exist and are up-to-date
ls -la README.md
ls -la CHANGELOG.md
ls -la RELEASE_NOTES_v1.0.0-rc1.md
ls -la docs/ARCHITECTURE.md
ls -la docs/QA_CHECKLIST.md
ls -la docs/RELEASE_PROCESS.md
ls -la docs/KNOWN_ISSUES.md
ls -la docs/MILESTONE_v1.0.0-rc1.md

# Verify README has correct status
grep -i "v1.0.0-rc1" README.md
grep -i "345/345" README.md
grep -i "0 errors" README.md

# Verify CHANGELOG has entry
grep -i "v1.0.0-rc1" CHANGELOG.md
```

**If any documentation is missing or outdated:**
1. Create or update the file
2. Verify status information is accurate
3. Commit changes: `git add . && git commit -m "docs: finalize v1.0.0-rc1 documentation"`
4. Re-verify QA tests still pass
5. Proceed to Version Tagging

### 4. Git Status Check

```bash
# Verify working directory is clean
git status

# Expected output:
# On branch main
# nothing to commit, working tree clean

# If files are uncommitted:
git add .
git commit -m "docs: prepare v1.0.0-rc1 release candidate milestone"
```

**Important:** Do not create tags on a dirty git working directory.

---

## Version Tagging

### Version Numbering

JobOps uses Semantic Versioning:
- **MAJOR.MINOR.PATCH-PRERELEASE**
- Example: `1.0.0-rc1` (major release, first release candidate)

**Current Series:**
- `v1.0.0-rc1` — Release Candidate 1
- `v1.0.0-rc2` (if issues found) — Release Candidate 2
- `v1.0.0` — General availability

### Create Annotated Tag

```bash
# Create tag (must be annotated, not lightweight)
git tag -a v1.0.0-rc1 -m "JobOps v1.0.0 Release Candidate 1"

# Verify tag was created
git tag -l v1.0.0-rc1
git show v1.0.0-rc1

# Expected output shows:
# object: commit hash
# type: commit
# tag: v1.0.0-rc1
# message: JobOps v1.0.0 Release Candidate 1
```

**Tag Naming Convention:**
- Prefix with `v` (e.g., `v1.0.0-rc1`)
- Use semantic versioning
- Use lowercase for pre-release identifiers
- No spaces or special characters

---

## GitHub Push

### Push Branch and Tag

```bash
# Push main branch to GitHub
git push

# Push the tag to GitHub
git push origin v1.0.0-rc1

# Verify both succeeded
# Should see output like:
# main -> main
# v1.0.0-rc1 -> v1.0.0-rc1
```

### Create GitHub Release (Optional but Recommended)

```bash
# Using GitHub CLI (if installed)
gh release create v1.0.0-rc1 \
  --title "JobOps v1.0.0 Release Candidate 1" \
  --body "$(cat RELEASE_NOTES_v1.0.0-rc1.md)" \
  --prerelease

# Or create manually via GitHub web UI:
# 1. Go to github.com/[org]/jobops/releases
# 2. Click "Create new release"
# 3. Select tag: v1.0.0-rc1
# 4. Title: "JobOps v1.0.0 Release Candidate 1"
# 5. Description: (paste RELEASE_NOTES_v1.0.0-rc1.md content)
# 6. Mark as pre-release: ✓
# 7. Click "Publish release"
```

### Verify GitHub Status

```bash
# Check tag appears on GitHub
git ls-remote --tags origin | grep v1.0.0-rc1

# Check release page
# Visit: https://github.com/[org]/jobops/releases/tag/v1.0.0-rc1

# Should see:
# - Correct tag name
# - Release notes content
# - Pre-release flag (if RC)
# - Commit hash linked
```

---

## Rollback Plan

### If Issue Found After Tag Created

```bash
# Option 1: Delete tag locally and remotely (if not announced)
git tag -d v1.0.0-rc1
git push origin :refs/tags/v1.0.0-rc1

# Option 2: Create new RC tag (if issue found)
# Fix the issue
# Test again
# Create v1.0.0-rc2 tag
# Push and announce RC2

# Option 3: If already deployed to production
# Mark release as deprecated on GitHub
# Announce regression with fix timeline
# Prepare hotfix branch
```

### Rollback to Previous Version

```bash
# If deployment is needed but v1.0.0-rc1 has critical issue
# Revert deployment to previous version (or earlier RC)

# To find previous tags:
git tag -l | sort -V

# Deploy from previous tag:
# Check out the tag
git checkout v1.0.0-beta.1
# Re-build and deploy
npm run build
```

---

## Post-Release Validation

### Immediately After Release

1. **Monitor GitHub Actions**
   - Check CI/CD pipeline (if configured)
   - Verify build succeeded
   - Verify tests passed

2. **Check Release Page**
   - Verify tag is visible on GitHub
   - Verify release notes display correctly
   - Verify all artifacts available (if any)

3. **Verify Deployment**
   - If auto-deployed: check deployment status
   - If manual deploy: execute deployment procedure
   - Test deployed version in staging

### Monitoring Checklist

```bash
# Health check endpoint
curl https://staging.jobops.dev/health

# Expected response:
# {
#   "status": "healthy",
#   "database": { "connected": true },
#   "master_career_document": { "found": true },
#   "claude_api": { "key_configured": true }
# }

# Check error logs
tail -f /var/log/jobops/error.log

# Check performance metrics
curl https://staging.jobops.dev/metrics

# Verify database integrity
# Run quick sanity checks on database
```

### User Acceptance Testing

After deployment to staging:

1. **Ask beta testers to validate**
   - Run through complete user journey
   - Verify all features work as described
   - Test on different browsers/devices
   - Report any issues

2. **Collect feedback**
   - Was the flow intuitive?
   - Any confusing parts?
   - Any bugs or crashes?
   - Performance acceptable?

3. **Document findings**
   - Add any issues to KNOWN_ISSUES.md
   - Plan fixes for post-release
   - Update documentation based on feedback

### Decision Point: Proceed to v1.0.0 GA?

After staging validation:

**If no critical issues found:**
- ✅ Proceed to v1.0.0 release
- Tag: `git tag -a v1.0.0 -m "JobOps v1.0.0 General Availability"`
- Push and announce

**If critical issues found:**
- ❌ Do not release to production
- Create RC2: `git tag -a v1.0.0-rc2 -m "..."`
- Fix issues
- Re-test
- Re-evaluate

---

## Release Announcement

When releasing v1.0.0 (after RC validation):

### Announcement Template

```
Subject: JobOps v1.0.0 Released 🚀

Hi [Recipients],

JobOps v1.0.0 is now available for production use.

What's Included:
- Complete Recruiter Workspace
- AI-powered resume analysis
- Missing keyword suggestions
- Job fit assessment
- Resume artifact generation
- Full WCAG AA accessibility

Verification Results:
- 345/345 tests passing ✅
- 0 TypeScript errors ✅
- WCAG AA compliant ✅
- Release Score: 87/100

Documentation:
- Release Notes: [link to RELEASE_NOTES]
- Architecture: [link to ARCHITECTURE.md]
- Getting Started: [link to README.md]

Installation:
```bash
git clone https://github.com/[org]/jobops.git
npm install
npm run build
```

Known Limitations:
- [List any P1 items not yet fixed]

Next Steps:
- Deploy to production
- Monitor error logs
- Gather user feedback
- Plan Phase 2 features

Thank you,
[Release Manager]
```

---

## Ongoing Maintenance

### Bug Fix Releases

For v1.0.1, v1.0.2, etc. (bug fixes only):

```bash
# Fix the bug
git checkout -b fix/issue-123

# Make changes
# Test locally
npm test -- --run

# Commit
git commit -m "fix: [issue description]"

# Create tag
git tag -a v1.0.1 -m "JobOps v1.0.1 - Bug fix release"

# Push
git push
git push origin v1.0.1
```

### Minor Feature Releases

For v1.1.0, v1.2.0, etc. (backward-compatible features):

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
# Test thoroughly
npm test -- --run

# Commit
git commit -m "feat: [feature description]"

# Create tag
git tag -a v1.1.0 -m "JobOps v1.1.0 - New features"

# Push
git push
git push origin v1.1.0
```

### Major Releases

For v2.0.0 (breaking changes):
- Plan breaking changes
- Update migration guide
- Update API documentation
- Consider LTS for v1.x
- Plan deprecation timeline

---

## Troubleshooting

### Tag Already Exists

```bash
# If tag already created with same name:
# Option 1: Use different tag name
git tag -a v1.0.0-rc1.1 -m "..."

# Option 2: Delete and recreate
git tag -d v1.0.0-rc1
git push origin :refs/tags/v1.0.0-rc1
git tag -a v1.0.0-rc1 -m "..."
git push origin v1.0.0-rc1
```

### Push Fails

```bash
# Check remote connection
git remote -v

# Verify authentication
git fetch origin

# If push still fails:
# Check GitHub push permissions
# Verify branch is up-to-date
git pull origin main
git push
```

### Tests Fail After Tag

```bash
# Don't push tag yet
# Fix failing tests
npm test -- --run

# Verify all pass
npm run type-check
npm run build

# Then create and push tag
git tag -a v1.0.0-rc1 -m "..."
git push origin v1.0.0-rc1
```

---

## Checklist for Release Manager

### Pre-Release (1 week before)
- [ ] Notify team of release date
- [ ] Freeze non-critical features
- [ ] Prepare documentation
- [ ] Assign QA testing

### Release Day (T-0)
- [ ] Run type-check, tests, build
- [ ] Run full QA checklist
- [ ] Get QA sign-off
- [ ] Review documentation
- [ ] Create git tag
- [ ] Push to GitHub
- [ ] Create GitHub release
- [ ] Verify GitHub shows tag/release

### Post-Release (Day 1)
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Monitor logs for errors
- [ ] Get team feedback
- [ ] Document any issues

### Post-Release (Days 2-7)
- [ ] Deploy to production (if approved)
- [ ] Monitor performance
- [ ] Collect user feedback
- [ ] Plan post-release fixes
- [ ] Announce v1.0.0 GA (if RC validated)

---

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0.0-rc1 | 2026-06-13 | Release Candidate | First RC, ready for testing |
| 1.0.0-rc2 | TBD | Release Candidate | If issues found in rc1 |
| 1.0.0 | TBD | General Availability | Production release |

---

**Last Updated:** 2026-06-13  
**Maintained By:** Erik Taylor
