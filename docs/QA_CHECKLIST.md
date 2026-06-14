# JobOps v1.0.0-rc1 QA Checklist

**Version:** 1.0.0-rc1  
**Updated:** 2026-06-13

This checklist is designed for manual and automated testing of JobOps. Use it to verify that all critical paths work correctly before deployment.

---

## Critical Path Smoke Test

These 6 tests verify the core user journey. **All must pass before release.**

### 1. Add Job → Appears in List
- [ ] Start fresh (clear database if needed)
- [ ] Open JobsPage
- [ ] Click "Add new job"
- [ ] Enter job description: "Senior UX Designer at TechCorp"
- [ ] Click "Add job"
- [ ] Verify job appears in list
- [ ] Verify status is "draft"

### 2. Open Workspace → Scores Load
- [ ] Click on job in list
- [ ] WorkspacePage opens
- [ ] Loading state shows: "Loading workspace..."
- [ ] Resume score appears (0-100)
- [ ] Score breakdown by category visible
- [ ] Confidence indicator shows

### 3. Missing Keywords → Accept Keyword → Score Updates
- [ ] Scroll to "Missing Keywords" section
- [ ] Verify keywords list loads
- [ ] Filter by "Critical" importance
- [ ] Click "See Suggestion" on first keyword
- [ ] Read suggested placement and language
- [ ] Click "Add This Keyword"
- [ ] Keyword removed from list
- [ ] Resume score has updated
- [ ] Verify score increased (keyword added value)

### 4. Ask Question → Response Loads
- [ ] Click on "What would worry a recruiter?" question
- [ ] Question selected visually
- [ ] Loading state shows in response area
- [ ] Claude response appears (2-3 sentences minimum)
- [ ] Risks section highlighted
- [ ] Suggested changes listed with reasoning
- [ ] Confidence level shown

### 5. Generate Artifacts → View Variants → Select One
- [ ] Scroll to "Resume Variants" section
- [ ] Click "Generate Variants"
- [ ] Loading state shows
- [ ] Multiple variants appear (2-3 options)
- [ ] Each variant has score
- [ ] Variant scores differ (not all identical)
- [ ] Click to view variant details
- [ ] Click "Use This Version" on one variant
- [ ] Selection persists (visual indicator)

### 6. Browser Refresh → Data Persists
- [ ] Note the current state (keywords added, variant selected)
- [ ] Refresh browser (Cmd-R or F5)
- [ ] App reloads and reconnects
- [ ] Same job still loaded in WorkspacePage
- [ ] Chat history intact (previous question/answer visible)
- [ ] Keyword still shows as added
- [ ] Variant selection still visible
- [ ] All previous analysis unchanged

---

## Recruiter Workspace QA

### Resume Score Display
- [ ] Score displayed as number (0-100)
- [ ] Max score shown (100)
- [ ] Confidence indicator present (0-1 scale or High/Medium/Low)
- [ ] Category breakdown shows all 6 categories:
  - [ ] ATS Keyword Match
  - [ ] Role Alignment
  - [ ] Seniority Alignment
  - [ ] Impact Metrics
  - [ ] Recruiter Readability
  - [ ] Formatting Quality
- [ ] Each category has:
  - [ ] Score value
  - [ ] Max score
  - [ ] Brief explanation
- [ ] Recommendations list is present
- [ ] At least 2 recommendations shown

### Score Accuracy
- [ ] Score changes when keyword accepted
- [ ] Score increases (or explains if minimal impact)
- [ ] Score calculation seems reasonable
- [ ] No negative scores
- [ ] No scores > 100

### UI/UX Quality
- [ ] Score layout is clear and scannable
- [ ] Colors and contrast WCAG AA compliant
- [ ] Typography hierarchy clear (h3 for categories, p for explanations)
- [ ] Spacing consistent (8px grid)
- [ ] No layout shifts during load
- [ ] Focus states visible on interactive elements
- [ ] Tooltip or hover info on acronyms

---

## Missing Keywords Workflow QA

### Keyword List Display
- [ ] Keywords load within 2 seconds
- [ ] List is scrollable if many keywords
- [ ] Each keyword shows:
  - [ ] Keyword name (bold)
  - [ ] Importance badge (Critical/High/Medium/Low)
  - [ ] Color-coded badge (red for critical, orange for high, etc.)
  - [ ] Frequency: "In job: X, In resume: Y"
  - [ ] "See Suggestion" button

### Filtering
- [ ] "All" tab shows all keywords
- [ ] "Critical" tab shows only critical keywords
- [ ] "Missing" tab shows keywords not in resume
- [ ] Tab switching is smooth
- [ ] Count updates correctly (e.g., "12 Critical Keywords")

### Keyword Suggestion
- [ ] Click "See Suggestion" expands details
- [ ] Shows suggested placement (Skills, Summary, Experience, Education)
- [ ] Shows suggested language/wording
- [ ] Shows example of how to add
- [ ] Collapse/expand works smoothly

### Acceptance Workflow
- [ ] Click "Add This Keyword" button
- [ ] Keyword removed from list immediately
- [ ] Score updates (displays new score)
- [ ] Dismissing keyword records it (won't re-suggest)
- [ ] Dismissed keywords stay dismissed on refresh

### Accessibility
- [ ] Tab navigation through keyword list
- [ ] Focus visible on all buttons
- [ ] aria-label on buttons explains action
- [ ] Screen reader announces keyword importance
- [ ] Keyboard can expand/collapse suggestions

---

## Recruiter Chat QA

### Question List
- [ ] All 4 pre-defined questions load:
  - [ ] "What would worry a recruiter?"
  - [ ] "Where is my resume weakest?"
  - [ ] "Would this likely get an interview?"
  - [ ] "What should I improve first?"
- [ ] Questions are clickable
- [ ] Only one question selected at a time
- [ ] Selected question highlighted visually

### Response Loading
- [ ] Click question → loading state shows
- [ ] Loading message: "Generating insights..."
- [ ] Response loads within 3 seconds
- [ ] AI response is professional in tone
- [ ] Response is 2-5 sentences (not too long)

### Response Content
- [ ] Response addresses the question asked
- [ ] Personalized to the resume and job
- [ ] Not generic or templated
- [ ] Specific suggestions, not vague advice
- [ ] Tone is constructive and professional

### Risk Identification
- [ ] Risks section clearly labeled
- [ ] Risks are specific to this resume+job
- [ ] At least one risk identified
- [ ] Risks are phrased constructively

### Suggested Changes
- [ ] Suggested changes list is present
- [ ] Changes include target (Skills, Experience, etc.)
- [ ] Changes include action (Add, Modify, Remove)
- [ ] Changes include proposed text
- [ ] Changes include reasoning
- [ ] At least one suggestion per response

### Confidence & Quality
- [ ] Confidence level shown (High/Medium/Low)
- [ ] Confidence is justified (high confidence → more detailed)
- [ ] No hallucinated or made-up claims
- [ ] No suggestions that contradict reality
- [ ] Suggestions are actionable

### Chat History
- [ ] Chat history visible
- [ ] Previously asked questions show responses
- [ ] Scrolling through history works
- [ ] Can ask same question multiple times
- [ ] History persists on refresh

---

## Job Fit Analysis QA

### Overall Assessment
- [ ] Overall fit percentage shown (0-100)
- [ ] Confidence level indicated
- [ ] Assessment phrased clearly

### Strong Matches
- [ ] Section labeled "Strong Matches"
- [ ] Lists 2-5 areas where resume aligns well
- [ ] Matches are specific (not generic)
- [ ] Matches reference actual resume content

### Weak Matches
- [ ] Section labeled "Weak Matches"
- [ ] Lists 1-3 areas where resume falls short
- [ ] Identifies specific gaps (e.g., "Leadership experience in teams >5")
- [ ] Phrased constructively

### Rejection Risks
- [ ] Section labeled "Rejection Risks"
- [ ] Identifies 1-3 factors that could lead to rejection
- [ ] Risks are specific and addressable
- [ ] Risks prioritized by severity

### Interview Talking Points
- [ ] Section labeled "Interview Talking Points"
- [ ] Lists 3-5 specific points to emphasize
- [ ] Points highlight strengths
- [ ] Points are derived from resume + job fit

---

## Artifact Generation QA

### Generation Process
- [ ] Click "Generate Resume Variants" button
- [ ] Loading state shows: "Generating artifacts..."
- [ ] Generation completes within 5 seconds
- [ ] No errors during generation

### Variant Display
- [ ] At least 2 variants generated
- [ ] Each variant has:
  - [ ] Name (Aggressive, Balanced, Minimal)
  - [ ] Score (0-100)
  - [ ] Preview of content
  - [ ] "Use This Version" button
- [ ] Variants have different scores (not all identical)
- [ ] Scores are reasonable (not 0 or 100, but spread)

### Variant Quality
- [ ] Each variant is readable
- [ ] Variants use formatting (sections, lists, etc.)
- [ ] Variants include:
  - [ ] Summary or objective
  - [ ] Experience with metrics
  - [ ] Skills section
  - [ ] Education
- [ ] No broken formatting
- [ ] No missing required sections

### Variant Comparison
- [ ] Can view details for each variant
- [ ] Scores explain why variant scored differently
- [ ] Can see keyword emphasis differences between variants
- [ ] Recommended variant is clear (highest score or highlighted)

### Selection & Persistence
- [ ] Click "Use This Version"
- [ ] Selection visually indicated
- [ ] Selection persists on refresh
- [ ] Selected variant shown in summary

---

## Persistence & State Management QA

### Chat History
- [ ] Ask a question → response loads
- [ ] Close workspace and return to job
- [ ] Chat history is intact
- [ ] Previous response still visible
- [ ] Can ask new questions and history grows

### Keyword State
- [ ] Accept keyword → marked as added
- [ ] Close workspace and return
- [ ] Keyword still shows as added
- [ ] Dismissed keywords still dismissed
- [ ] Can undo by dismissing previously added keywords

### Workspace State
- [ ] Selected artifact remembered
- [ ] Scrolled position maintained (or scroll to top)
- [ ] Current tab/filter remembered
- [ ] Form inputs cleared (not persisted)

### Database Integrity
- [ ] Browser DevTools → Application → IndexedDB (if used)
- [ ] Or check SQLite directly
- [ ] Job data correctly stored
- [ ] Chat messages properly associated with job
- [ ] Timestamps are accurate
- [ ] No duplicate records

---

## Accessibility QA (WCAG AA)

### Keyboard Navigation
- [ ] Tab navigates through all interactive elements
- [ ] Shift+Tab reverse navigates
- [ ] Tab order is logical (top-to-bottom, left-to-right)
- [ ] Focus never gets trapped
- [ ] Can submit forms with Enter key
- [ ] Can click buttons with Space or Enter
- [ ] Can dismiss modals with Escape

### Focus Visibility
- [ ] All buttons have visible focus state
- [ ] All form inputs have visible focus state
- [ ] Focus outline is 3px or more
- [ ] Focus color contrasts with background
- [ ] Focus state is not just outline (also has visual change)

### Screen Reader
- [ ] VoiceOver (Mac) can read entire UI
- [ ] NVDA (Windows) or JAWS can read entire UI
- [ ] All form labels announced
- [ ] Button purposes clear from labels
- [ ] Errors announced to user
- [ ] Loading states announced
- [ ] Success states announced

### Semantic HTML
- [ ] Page structure uses header, main, section, nav
- [ ] Form inputs have associated labels (htmlFor)
- [ ] Buttons are <button> tags, not <div>
- [ ] Links are <a> tags, not buttons
- [ ] Lists use <ul>/<ol>/<li>
- [ ] Tables use proper <th> headers (if any)

### Color & Contrast
- [ ] All text contrasts with background (WCAG AA or better)
- [ ] Color not the only indicator of meaning (icons also used)
- [ ] Error messages in red AND have icon
- [ ] Success messages in green AND have checkmark
- [ ] No text smaller than 12px (or justified for metadata)
- [ ] Line height adequate for readability (1.5+ recommended)

### Motion & Animation
- [ ] Animations respect prefers-reduced-motion setting
- [ ] No auto-playing videos or sounds
- [ ] No flashing elements (more than 3x/second)
- [ ] Transitions are smooth but not excessive
- [ ] Loading spinners don't distract from content

### ARIA Implementation
- [ ] aria-labels on icon-only buttons
- [ ] aria-live regions on dynamically updated content
- [ ] aria-selected on tabs
- [ ] aria-expanded on collapsible sections
- [ ] aria-hidden on decorative elements
- [ ] No unnecessary ARIA (let semantic HTML do work)

### Alternative Text
- [ ] All icons have aria-labels
- [ ] Emojis are hidden with aria-hidden="true"
- [ ] Images (if any) have alt text
- [ ] No "image" or "picture" as alt text (be specific)

---

## Performance QA

### Load Times
- [ ] App loads in < 1.5 seconds
- [ ] JobsPage renders in < 0.8 seconds
- [ ] Workspace loads in < 2 seconds
- [ ] Score calculation < 0.6 seconds
- [ ] Chat response < 3 seconds
- [ ] Artifacts generate < 5 seconds

### Responsiveness
- [ ] Form submission responds immediately (< 100ms UI feedback)
- [ ] Keyword acceptance visual feedback instant
- [ ] Scrolling smooth (no jank)
- [ ] Tab switching instant
- [ ] No loading delays for normal operations

### Resource Usage
- [ ] DevTools → Performance tab shows reasonable JS execution
- [ ] No excessive memory leaks
- [ ] Repeated operations don't degrade performance
- [ ] Database queries optimize correctly

### Bundle Size
- [ ] Client build < 1MB gzipped
- [ ] Server build < 3MB
- [ ] No unnecessary dependencies

---

## Error Recovery QA

### Network Timeouts
- [ ] Simulate network delay (DevTools throttle)
- [ ] Long loading state appears
- [ ] Timeout shows helpful error message
- [ ] Retry button available
- [ ] Retry successfully recovers
- [ ] User can dismiss error and continue

### Service Unavailable
- [ ] Simulate Claude API unavailable (block API calls)
- [ ] Chat questions fail gracefully
- [ ] Error message: "Claude API temporarily unavailable"
- [ ] Retry available
- [ ] User can use app without chat

### Job Not Found
- [ ] Delete job from database while workspace open
- [ ] Navigate back to jobs list
- [ ] Try to open deleted job
- [ ] Clear error message shown
- [ ] Back button works
- [ ] App doesn't crash

### Invalid Input
- [ ] Try submitting form with empty job description
- [ ] Validation prevents submission
- [ ] Error message points to required field
- [ ] User can correct and resubmit
- [ ] Form doesn't lose other data

### Edge Cases
- [ ] Very long job description (10,000+ characters) handled
- [ ] Very long resume (50+ years of experience) handled
- [ ] No keywords missing (all keywords present) shows success message
- [ ] Only critical keywords missing shows just critical
- [ ] Job with no requirements analyzed without crash
- [ ] Resume with no experience still generates score

---

## UI/UX Polish QA

### Visual Design
- [ ] Colors consistent throughout (primary blue, success green, etc.)
- [ ] Spacing consistent (8px grid, 16px padding standard)
- [ ] Typography hierarchy clear (h3 for sections, p for content)
- [ ] Icons sized consistently (24px standard)
- [ ] No "dead" white space (use background colors)
- [ ] Consistent border radius (4px or 8px, not mixed)

### Layout
- [ ] Three-panel layout clear on desktop (Sources | Chat | Studio)
- [ ] Scrollbars appear only when needed
- [ ] No horizontal scrolling on desktop
- [ ] Mobile responsive (if tested)
- [ ] Forms stack nicely on mobile

### Feedback & Confirmation
- [ ] Buttons change on hover (color shift or shadow)
- [ ] Buttons disabled state clear (grayed out)
- [ ] Success messages appear (green, positive tone)
- [ ] Error messages appear (red, constructive tone)
- [ ] Confirmation before destructive actions (delete job, etc.)

### Copy & Messaging
- [ ] No jargon without explanation
- [ ] Error messages are helpful, not technical
- [ ] Success messages are positive
- [ ] Form labels clear and concise
- [ ] Help text provided where needed
- [ ] No grammatical errors
- [ ] Tone is professional but friendly

### States
- [ ] Empty state: "No jobs found — Add new job"
- [ ] Loading state: skeleton or "Loading..."
- [ ] Error state: clear message + retry option
- [ ] Success state: confirmation message
- [ ] Final state: data displayed clearly

---

## Regression Testing

### Phase 2d Accessibility (Verify not broken)
- [ ] WCAG AA compliance maintained
- [ ] React.memo on components didn't break rendering
- [ ] Design system CSS variables still working
- [ ] Prefers-reduced-motion still respected
- [ ] Focus states still visible
- [ ] Skip link still functional

### Recent Polish Commits
- [ ] Visual consistency applied throughout
- [ ] Performance optimizations visible (fast rendering)
- [ ] Accessibility improvements intact (no regressions)
- [ ] New error states display correctly
- [ ] Loading states smooth
- [ ] Component organization makes sense

---

## Pre-Release Checklist

### Code Quality
- [ ] npm run type-check passes (0 errors)
- [ ] npm test -- --run passes (345/345 tests)
- [ ] npm run build succeeds
- [ ] No console errors or warnings in browser
- [ ] No linting errors (eslint)

### Documentation
- [ ] README.md updated with v1.0.0-rc1 status
- [ ] CHANGELOG.md entry complete
- [ ] RELEASE_NOTES.md comprehensive
- [ ] ARCHITECTURE.md describes current system
- [ ] QA_CHECKLIST.md matches actual app
- [ ] KNOWN_ISSUES.md accurate

### Environment
- [ ] .env.example has all required variables
- [ ] Database initialized correctly
- [ ] Master career document loaded
- [ ] Claude API key configured (if testing AI)
- [ ] No hardcoded secrets in code

### Git
- [ ] All changes committed
- [ ] No uncommitted files
- [ ] Branch is clean
- [ ] Ready to create git tag

---

## Sign-Off

**QA Lead:** _____________________  
**Date:** _____________________  
**Result:** ☐ PASS ☐ FAIL  

**Issues Found:** (list any failures)
```
1. 
2. 
3. 
```

**Critical Issues:** ☐ Yes ☐ No  

**Recommended Action:**
☐ Release v1.0.0-rc1  
☐ Fix issues and re-test  
☐ Defer to post-v1.0.0

---

**Version:** 1.0.0-rc1  
**Last Updated:** 2026-06-13
