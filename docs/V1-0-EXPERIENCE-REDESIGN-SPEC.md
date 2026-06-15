# v1.0 Experience Redesign Specification

**Mission:** Transform pasted job description → submitted application in < 5 minutes

**Approach:** Single-page workflow (not dashboard). Conversational (not technical). Progressive disclosure.

---

## Core Principle

Stop thinking in **panels**.  
Start thinking in **workflow**.

```
Paste Job
    ↓
Understand Fit
    ↓
Generate Documents
    ↓
Complete Application
    ↓
View History
```

This is a **conversation**, not a dashboard.

---

## Page Structure (Single Column)

```
┌──────────────────────────────┐
│  Application Studio          │  ← Header (always visible)
│  Career Memory Ready ✓       │  ← Status (tiny, quiet)
│  Updated today | Manage →    │
└──────────────────────────────┘

┌──────────────────────────────┐
│  STEP 1: Paste Job           │
│                              │
│  [ Large textarea]           │
│                              │
│  [ Analyze Job ]             │  ← Primary action
└──────────────────────────────┘
   ↓ scroll ↓

┌──────────────────────────────┐
│  STEP 2: Understanding       │
│                              │
│  Fit: Excellent ✓            │
│  Your Strengths: [list]      │
│  Gaps to Address: [list]     │
│  Positioning: [text]         │
│                              │
│  Need help?                  │
│  [ Ask Strategy Coach ]      │  ← Optional
│                              │
│  [ Continue ]                │
└──────────────────────────────┘
   ↓ scroll ↓

┌──────────────────────────────┐
│  STEP 3: Documents           │
│                              │
│  Resume                      │
│  Ready                       │
│  [ Preview ] [ Copy ] [ PDF ]│
│                              │
│  Cover Letter                │
│  Ready                       │
│  [ Preview ] [ Copy ] [ PDF ]│
│                              │
│  [ Continue ]                │
└──────────────────────────────┘
   ↓ scroll ↓

┌──────────────────────────────┐
│  STEP 4: Complete            │
│                              │
│  Everything is ready.        │
│                              │
│  Resume ✓                    │
│  Cover Letter ✓              │
│                              │
│  Submit your application.    │
│  Then click Record.          │
│                              │
│  [ Record Application ]      │
└──────────────────────────────┘
   ↓ scroll ↓

┌──────────────────────────────┐
│  ✓ Application Recorded      │
│                              │
│  Jun 15, 2026                │
│  Senior Engineer @ TechCorp  │
│                              │
│  Resume attached ✓           │
│  Cover Letter attached ✓     │
│                              │
│  [ View Similar Jobs ]       │
│  [ New Application ]         │
└──────────────────────────────┘
   ↓ scroll ↓

┌──────────────────────────────┐
│  History                     │
│                              │
│  Recent Applications         │
│                              │
│  TechCorp - Senior Eng       │
│  Applied 2 days ago          │
│                              │
│  StartupInc - Product Mgr    │
│  Applied 5 days ago          │
│                              │
│  [more items...]             │
└──────────────────────────────┘
```

**Key:** Single scroll. No navigation. No panels. No hidden complexity.

---

## Component Redesign

### 1. HEADER

**Current:** Multi-line panel header with subtitle

**New:**
```
Application Studio
```

Minimal. That's it.

**Hidden but available:**
```
Career Memory Ready ✓
Updated today
Manage →
```

Position: Top right, 12px font, gray text, click opens modal

---

### 2. STEP 1: JOB PASTE

**Current:** Multiple form fields, optional job details, list of saved jobs

**New:**
```
STEP 1

Paste Job Description

[_____________________________________]
[_____________________________________]
[_____________________________________]
[_____________________________________]

Typical job posting: 300-500 words

or

Drop Job Posting

[ Analyze Job ]
```

**Design:**
- `textarea`: 400px height, large font (16px)
- Placeholder: "Paste the full job description from the posting..."
- No other form fields visible
- "Analyze Job" is the primary action (blue, large)
- No "Saved Jobs" list below (distraction)

**On Click "Analyze":**
- Disabled (prevent double-click)
- Show: "Analyzing..."
- Fetch strategy from `/api/jobs/{id}/analyses`

---

### 3. STEP 2: FIT UNDERSTANDING

**Current:** Chat interface, analysis hidden below, requires scrolling/asking AI

**New:**
```
STEP 2

Understanding the Opportunity

Fit: Excellent

Your Strongest Areas:

• Enterprise UX
• Design Systems  
• User Research

Potential Gaps:

• Healthcare domain experience
• Mobile-specific work

Recommended Positioning:

Lead with your platform modernization and design system experience. 
The role emphasizes modernizing their design practice, which directly 
aligns with your 8 years in enterprise UX.

─────────────────────────────

Need help refining this?

[ Ask Strategy Coach ]

[ Continue ]
```

**Design:**
- "Fit" with color badge (green for Excellent, yellow for Good, orange for Stretch)
- Bullet lists for strengths/gaps (not prose)
- Positioning is 2-3 sentences (human language)
- Chat link is gray, secondary, collapsed by default
- "Continue" is primary action

**Strategy Coach Modal** (if clicked):
```
Let's refine your strategy

Current positioning: "Lead with your design system work..."

What would you like to adjust?

[ Message input field ]

Coach will respond with suggestions.
```

---

### 4. STEP 3: DOCUMENTS

**Current:** Multiple cards with version numbers, metadata, confusing actions

**New:**
```
STEP 3

Documents

────────────────

Resume

Ready

Updated 2 minutes ago

[ Preview ] [ Copy to clipboard ] [ Download PDF ]

────────────────

Cover Letter

Ready

Updated 1 minute ago

[ Preview ] [ Copy to clipboard ] [ Download PDF ]

────────────────

[ Continue ]
```

**Design:**
- No card borders (just spacing)
- "Ready" status in green
- Time shown in human language ("2 minutes ago", not "Version 3, Hash: a2f8c9d1...")
- Three actions per document (Preview, Copy, PDF)
- No version numbers, artifact IDs, hashes
- If not generated: "Ready to generate" (lighter style, no button yet)

**Preview Modal:**
```
Resume Preview

[Full document in modal]

[ Close ]
```

---

### 5. STEP 4: APPLICATION COMPLETE

**Current:** Small "Mark Applied" button, unclear feedback, no celebration

**New:**
```
STEP 4

Application Complete

Everything is ready to send.

Resume ✓
Cover Letter ✓

Submit your application through the company website or email.

Once submitted, click below to record it.

[ Record Application ]
```

**Design:**
- Large green checkmarks (✓) for both documents
- Instruction text is warm, encouraging
- "Record Application" is blue, large, primary action
- No confusing field mappings or extra steps

**After Click:**
```
✓ Application Recorded

Jun 15, 2026, 3:42 PM
Senior Engineer @ TechCorp

Resume attached ✓
Cover Letter attached ✓

────────────────────────────

[ View similar job postings ]

[ Start new application ]
```

**Design:**
- Celebratory green checkmark (large)
- Date and role clearly visible
- Two next actions (not five)
- This moment should feel **satisfying**

---

### 6. HISTORY

**Current:** Separate panel, requires scrolling, may show "empty" state

**New:**
```
────────────────────────────

History

Recent Applications (last 10)

TechCorp
Senior Engineer
Applied Jun 15, 2 days ago

StartupInc
Product Manager
Applied Jun 13, 5 days ago

Acme Inc
Designer
Applied Jun 10, 8 days ago

[more items...]
```

**Design:**
- No cards, just spacing
- Company + role + date on three lines
- Click to view details / re-select
- Max 10 items
- Relative dates ("2 days ago")
- Empty state only if truly empty: "No applications recorded yet. Complete an application above to see history."

---

## Design System

### Typography (4 Sizes ONLY)

```
Hero:      32px, 700 weight, 1.2 line-height
           "Application Studio"
           "✓ Application Recorded"

Section:   20px, 600 weight, 1.3 line-height
           "STEP 1", "STEP 2"
           "Understanding the Opportunity"

Body:      16px, 400 weight, 1.6 line-height
           All form fields, descriptions, chat
           "Your Strongest Areas:"

Caption:   12px, 400 weight, 1.4 line-height
           Timestamps, secondary info
           "Updated 2 minutes ago"
```

**No other sizes.** Ever.

---

### Colors (6 ONLY)

```
Background:   var(--color-bg)        #F3F4F6    [light gray]
Surface:      var(--color-surface)   #FFFFFF    [white]
Primary:      var(--color-primary)   #3B82F6    [blue]
Success:      var(--color-success)   #22C55E    [green]
Warning:      var(--color-warning)   #F59E0B    [amber]
Danger:       var(--color-danger)    #EF4444    [red]

Text:         rgba(0,0,0,0.9)        [almost black]
Secondary:    rgba(0,0,0,0.6)        [gray]
```

**No other colors.** No custom shades.

---

### Spacing

```
xs:  4px    (gap between inline elements)
sm:  8px    (gap between button + button)
md:  16px   (gap between sections)
lg:  32px   (gap between major sections)
xl:  64px   (top/bottom padding on page)
```

**No arbitrary spacing.**

---

### Buttons (3 Types ONLY)

**Primary**
```
background: var(--color-primary)
text: white
padding: 12px 24px
border-radius: 12px
font-size: 16px
font-weight: 600
border: none
cursor: pointer

:hover    → darken background 10%
:active   → darken background 20%
:disabled → opacity 50%
:focus    → outline 3px solid primary, offset 2px
```

**Secondary**
```
background: transparent
border: 2px solid var(--color-primary)
text: var(--color-primary)
padding: 10px 20px
border-radius: 12px
font-size: 16px
font-weight: 600
cursor: pointer

:hover    → background: rgba(59, 130, 246, 0.1)
:focus    → outline 3px solid primary, offset 2px
:disabled → opacity 50%
```

**Text Link**
```
background: transparent
border: none
text: var(--color-primary)
padding: 0
text-decoration: underline on hover
cursor: pointer
font-size: inherit
font-weight: 400

:hover    → color: darken primary 10%
:focus    → outline 2px solid primary, offset 2px
```

**No other button variants.**

---

### Cards & Spacing

**Card elevation:** 4px shadow (subtle)

**Card radius:** 12px (not sharp, not rounded)

**Card padding:** 16px (consistent)

**Between sections:** 32px whitespace (not borders)

**No double borders.** Whitespace creates hierarchy.

---

### Accessibility

**Keyboard Navigation**
- Tab through: Primary button → Secondary button → Text link → Form input
- Enter/Space activates all buttons
- Tab order matches visual order
- No skip links needed (only one page)

**Focus States**
- 3px solid outline, color-primary
- 2px offset from element
- Visible on all interactive elements
- High contrast (3:1 minimum)

**Screen Reader**
- Button labels: clear and descriptive
- Form labels: aria-label on textarea
- Live regions: aria-live="polite" for status updates
- Semantic HTML: `<button>`, `<input>`, `<label>`

**WCAG AA Compliance**
- 4.5:1 contrast on all text
- 3:1 contrast on UI components
- Font size: 16px minimum (no tiny text)
- Large click targets: 44x44px minimum

---

### Motion & Feedback

**Every action must provide feedback:**

**Analyze Job:**
```
User clicks "Analyze Job"
  ↓ (0.1s)
Button disables, shows "Analyzing..."
  ↓ (fetch time: typically 3-5 seconds)
Progress: "Fetching career profile..."
Progress: "Analyzing job requirements..."
Progress: "Building strategy..."
  ↓ (fetch complete)
STEP 2 appears below with fade-in animation
Scroll prompts: "↓ Scroll to see results"
```

**Generate Resume:**
```
User clicks "Generate" (if not generated)
  ↓ (0.1s)
Button disables, shows "Generating..."
  ↓ (typically 10-15 seconds)
Progress bar or spinner with message: "Creating your resume..."
  ↓ (generation complete)
Status changes to "Ready"
Timestamp shows: "Just now"
Actions appear: [ Preview ] [ Copy ] [ Download ]
Subtle celebrate animation (green checkmark appears for 2s)
```

**Copy to Clipboard:**
```
User clicks "Copy"
  ↓ (0.05s)
Button text changes: "Copied!" (green background)
  ↓ (2 seconds)
Button reverts to normal
Tooltip or toast: "Ready to paste into application"
```

**Record Application:**
```
User clicks "Record Application"
  ↓ (0.1s)
Button disables, shows "Recording..."
  ↓ (fetch complete: < 1 second)
Success screen appears with celebration animation
Large green checkmark
Confetti or subtle animation (not distracting)
Text: "✓ Application Recorded"
Next actions: [ View similar ] [ Start new ]
```

---

## Data Flow

### URLs & Routes

**Note:** Still uses 3-panel layout internally for state management, but UX is single-page

```
GET  /api/jobs
     Returns list of all jobs

POST /api/jobs
     Create new job from pasted description

GET  /api/jobs/:id
     Get single job details

POST /api/jobs/:id/analyze
     Run fit analysis

GET  /api/jobs/:id/analyses
     Fetch existing analysis

POST /api/jobs/:id/artifacts/generate?type=resume|cover_letter
     Generate artifact

GET  /api/jobs/:id/artifacts
     List all artifacts for job

POST /api/jobs/:id/mark-applied
     Record application with timestamp

GET  /api/jobs/applications/recent
     List recent applications
```

---

## Component Hierarchy

### New (Single Component)

```
ApplicationStudio (Main Page)
  ├── Header
  │   ├── Title
  │   └── CareerMemoryBadge
  │       └── Manage Modal (if clicked)
  │
  ├── Section: PasteJob
  │   ├── Textarea
  │   └── AnalyzeButton
  │
  ├── Section: FitUnderstanding (conditional)
  │   ├── FitBadge
  │   ├── StrengthsList
  │   ├── GapsList
  │   ├── PositioningText
  │   ├── StrategyCoachToggle
  │   │   └── ChatInterface (if open)
  │   └── ContinueButton
  │
  ├── Section: Documents (conditional)
  │   ├── DocumentCard (Resume)
  │   │   ├── Status
  │   │   ├── Timestamp
  │   │   └── Actions: [Preview] [Copy] [PDF]
  │   ├── DocumentCard (Cover Letter)
  │   │   └── (same structure)
  │   └── ContinueButton
  │
  ├── Section: ApplicationComplete (conditional)
  │   ├── Checklist: [✓ Resume] [✓ Cover Letter]
  │   ├── InstructionText
  │   └── RecordApplicationButton
  │
  ├── Section: SuccessState (conditional)
  │   ├── Celebration (large ✓)
  │   ├── JobDetails
  │   ├── AttachmentList
  │   └── NextActions: [View Similar] [Start New]
  │
  └── Section: History (always)
      ├── RecentApplicationsList
      └── EmptyState (if needed)
```

**Old panels completely removed.**

---

## Implementation Roadmap

### Phase 1: Layout Restructure (Day 1)

- [ ] Create new `ApplicationStudioV2.tsx` (single column)
- [ ] Move current panels into steps
- [ ] Convert 3-column grid to vertical scroll
- [ ] Style with new color system

### Phase 2: Component Simplification (Days 2-3)

- [ ] Career Memory → header badge
- [ ] Strategy Coach → Step 2 display + optional chat
- [ ] Document Studio → Step 3 simplified cards
- [ ] Mark Applied → Step 4 celebration
- [ ] Recent Applications → Step 5 history

### Phase 3: Polish (Days 3-4)

- [ ] Improve empty states (instructional, not generic)
- [ ] Add motion/feedback (progress indicators, celebratory moments)
- [ ] Verify accessibility (keyboard, focus, contrast, labels)
- [ ] Test performance (memoization, caching)

### Phase 4: Verification (Day 4)

- [ ] Watch new user complete workflow (target: < 5 minutes)
- [ ] Check: Do they ask "What do I do now?"
- [ ] If yes → fix that friction point
- [ ] If no → v1.0 is complete

---

## Copy Tone

### NOT Technical
❌ "Artifact version 3"
❌ "Resume hash: a2f8c9d1"
❌ "Status: generation_complete"

### YES Human
✅ "Resume"
✅ "Ready"
✅ "Updated 2 minutes ago"

### NOT Robotic
❌ "Please provide input to continue"
❌ "Processing your request"
❌ "Operation successful"

### YES Warm
✅ "Paste your job description to get started"
✅ "Building your tailored materials..."
✅ "Everything is ready to send"

---

## Success Criteria

### User Should:
- ✅ Never ask "What do I do now?"
- ✅ Never scroll back up
- ✅ Never click the same button twice
- ✅ Never see technical metadata
- ✅ Complete workflow in < 5 minutes
- ✅ Feel the application is finished, not "in progress"

### Experience Should Feel:
- ✅ Conversational (like a coach, not a tool)
- ✅ Focused (one task visible at a time)
- ✅ Fast (immediate feedback on every action)
- ✅ Confident (know what happened)
- ✅ Complete (celebrate the moment)

### Technical Requirements:
- ✅ Keyboard accessible (WCAG AA)
- ✅ Screen reader friendly
- ✅ Fast (no unnecessary renders)
- ✅ Responsive (works on different screen sizes)

---

## Comparison: Before → After

| Aspect | Before | After |
|--------|--------|-------|
| Layout | 3 panels, grid | 1 column, scroll |
| Strategy | Chat-first | Decision-first |
| Documents | Metadata visible | Human language only |
| Application | Mark applied button | Celebration moment |
| History | Separate panel | At bottom, scrollable |
| Copy | Technical | Conversational |
| Success Criteria | Incomplete | v1.0 launch-ready |

---

## Final Notes

### What Changes
- Visual layout (3 panels → 1 column)
- Component structure (more specialized)
- Copy tone (human, not technical)
- Feedback patterns (every action celebrated)

### What Stays
- Backend infrastructure (unchanged)
- Data models (unchanged)
- APIs (unchanged)
- Business logic (unchanged)

**This is a UI/UX redesign only.** The backend is still the same three-panel architecture internally. The user just sees a single-page workflow.

---

## Next Steps

1. **Implement** v1.0 layout (Phase 1)
2. **Test** with real users (can they complete workflow?)
3. **Iterate** based on feedback
4. **Launch** when users don't hesitate

---

**Status:** READY FOR IMPLEMENTATION  
**Estimated Time:** 4-6 days  
**Launch Goal:** v1.0 (no more features, just polish & UX)
