# Product & UX Specification: Tailored Resume & Cover Letter Generator

**Document Version:** 1.0  
**Date:** 2026-06-14  
**Audience:** Product, Design, Engineering, QA  
**Revision Status:** Ready for Review

---

## 1. Executive Summary

**Feature:** Tailored Resume & Cover Letter Generator

**What It Does:**
With one click, users generate a customized resume and cover letter tailored to a specific job, then download, refine, and apply with confidence.

**User Value:**
- **Save Time:** 45-90 minutes of manual resume editing → 2 minutes
- **Improve Quality:** AI-powered positioning + ATS optimization increases interview callbacks
- **Preserve History:** Every version is saved; easily compare and regenerate with different approaches
- **Build Confidence:** AI explains why you're a good fit before you apply

**Success Metric:**
Users who use this feature apply to 3x more jobs per month while spending less time on resume customization.

**Timeline:** 11 weeks (6 phases), launching Phase 2 (Resume) in week 4.

---

## 2. Product Goals

### Primary Goals (Must Have)

1. **Generate tailored, ATS-optimized resumes** that position users competitively for specific jobs
2. **Generate personalized cover letters** that sound authentic and address the specific role
3. **Never require users to manually edit** the AI-generated content before previewing
4. **Preserve every generated version** so users can compare, iterate, and learn what works
5. **Make it safe to regenerate** — users can try different positioning without losing anything

### Secondary Goals (Should Have)

6. Explain why the positioning was chosen (show fit analysis first)
7. Allow users to browse their version history for past jobs
8. Help users understand what makes them stand out for this role
9. Build toward a "Career Operating System" (foundation for interviews, outreach, negotiation)

### Non-Goals (What We're NOT Doing)

❌ WYSIWYG editor (users edit resume as text, not visually)  
❌ LinkedIn integration (don't auto-post)  
❌ Automatic job applications (don't submit on user's behalf)  
❌ Parse existing resumes (only use career profile as source)  
❌ Interview scheduling (separate feature)  

---

## 3. User Personas

### Primary: Active Job Seeker (Maria)

**Background:** Senior Product Designer, 8 years experience, actively looking

**Motivations:**
- Apply to more jobs (currently applies 2-3x/week)
- Spend less time on resume customization
- Increase interview callbacks
- Find roles that align with her strengths

**Frustrations:**
- Writing "another version" of her resume for each job feels tedious
- Worried some resume versions are stronger than others but can't remember which
- Doesn't know if her positioning is actually appealing to recruiters
- Keeps losing old versions; hard to apply to similar roles

**Goals:**
- Generate resumes in under 5 minutes
- Understand her fit for each role before applying
- Try different positioning angles easily
- Track which resume versions led to interviews

**Technical Comfort:** High (uses Figma, Slack, design tools daily)

---

### Secondary: Power User (James)

**Background:** Senior Engineer, has been in job search 3+ months, very tactical

**Motivations:**
- Maximize every application
- A/B test positioning strategies
- Understand what makes him competitive
- Get feedback on resume quality

**Frustrations:**
- Has 50+ job applications open in tabs
- Can't remember which resume was sent to which company
- Wants data on which positioning gets callbacks
- Exhausted from customization

**Goals:**
- Generate 50+ customized resumes quickly
- Compare versions side-by-side
- See patterns in what positioning works
- Integrate with his recruiting CRM

**Technical Comfort:** Very high (engineer)

---

### Tertiary: Recruiter/Hiring Manager (Future)

**Note:** This persona is future scope (Phase 7+). Mentioned here for context on extensibility.

**Goal:** See what resume candidates actually sent; understand their positioning strategy.

---

## 4. End-to-End User Journey

### Happy Path: Generate → Download → Apply

```
┌─────────────────────────────────────────────────────────────┐
│ USER ACTIVITY                        SYSTEM STATE           │
└─────────────────────────────────────────────────────────────┘

1. Browse Jobs
   └─ User views job list
   └─ Finds interesting job: "Senior Designer, TechCorp"
   └─ Clicks job card → Job detail page
                        [No artifacts yet]
                        ↓
2. Review Fit Analysis
   └─ System shows fit score: 78% (High)
   └─ Shows positioning: "Senior Product Designer, SaaS Expert"
   └─ Shows strengths: "Design systems (10+ years)"
   └─ Shows gaps: "No stated healthcare domain"
   └─ User reads analysis
                        ↓
3. Click "Generate Resume"
   └─ Loading state: "Analyzing your profile..."
   └─ 8-12 seconds
   └─ Resume preview appears
                        [V1 Resume Created]
                        ↓
4. Preview Resume
   └─ User reads generated resume
   └─ Checks for accuracy
   └─ Sees positioning applied: "Senior Designer" + "SaaS expertise"
   └─ Thinks "looks good"
                        ↓
5. Generate Cover Letter
   └─ Click "Generate Cover Letter"
   └─ 8-12 seconds
   └─ Cover letter preview appears
                        [V1 Cover Letter Created]
                        ↓
6. Preview Cover Letter
   └─ User reads generated cover
   └─ Sees personalization: "Your expertise in design systems..."
   └─ Thinks "sounds like me"
                        ↓
7. Download PDF
   └─ Click "Download Resume" → resume.pdf
   └─ Click "Download Cover" → cover_letter.pdf
   └─ Both files saved to Downloads
                        ↓
8. Apply to Job
   └─ User goes to company website
   └─ Submits application with resume + cover letter
                        [Artifacts marked as "applied"]
                        (future: user reports outcome)
                        ↓
9. Move On
   └─ Next job in list
```

---

### Alternative Path: Try Different Positioning

```
1. Generated resume V1
   └─ User reads V1
   └─ Thinks "this is OK but maybe could emphasize design systems more"
                        ↓
2. Click "Regenerate"
   └─ Modal opens: "Try a different positioning angle"
   └─ Options:
      ○ "Design Systems Leader" (recommended)
      ○ "Enterprise SaaS Expert"
      ○ "Research-Driven UX"
      ○ "Cross-Functional Design Partner"
   └─ User selects "Design Systems Leader"
                        ↓
3. Loading...
   └─ 8-12 seconds
   └─ V2 Resume created with new positioning
                        ↓
4. Compare V1 vs V2
   └─ User clicks "Compare versions"
   └─ Side-by-side view shows:
      V1: Professional summary emphasizes SaaS
      V2: Professional summary emphasizes design systems
   └─ Sees which skills are highlighted differently
                        ↓
5. Choose Preferred
   └─ User thinks "V2 is stronger for this role"
   └─ Clicks "Mark as Preferred" on V2
   └─ V1 still in history for reference
                        ↓
6. Download V2
   └─ Downloads V2 resume (design systems focused)
   └─ Applies with V2
```

---

### Alternative Path: Return Later

```
1. User saved job earlier, now returning
   └─ Opens same job
   └─ System shows V1 and V2 in history
                        [Artifacts still visible]
                        ↓
2. See Version List
   └─ V2: "Design Systems Leader" (Preferred) - Generated 2 days ago
   └─ V1: "Enterprise SaaS Expert" - Generated 2 days ago
                        ↓
3. Regenerate if Career Changed
   └─ If career profile updated since V1/V2 were created:
   └─ Warning: "Your profile has been updated. Regenerate for fresh version?"
   └─ Click regenerate → V3 created with current profile
                        ↓
4. Or Just Re-download
   └─ V2 still perfect for this role
   └─ Re-download and apply
```

---

### Alternate Path: Stale Artifact Warning

```
Scenario: User updates career profile (adds new role)
         Then returns to old job with saved artifacts

Display:
┌──────────────────────────────────────────┐
│ ⚠️  Profile Updated                       │
│                                          │
│ Your career profile has been updated      │
│ since this resume was generated.          │
│                                          │
│ [Regenerate with Current Profile]        │
│ [Use Existing Resume]                    │
└──────────────────────────────────────────┘

User choice:
- Regenerate → V3 created with new experience
- Use Existing → Apply with V2 (still good)
```

---

## 5. Information Architecture

### Navigation Structure

```
JobOps
│
├─ Jobs (Main Nav)
│  ├─ Job List
│  │  └─ Job Card (Click) → Job Detail
│  │
│  └─ Job Detail Page
│     ├─ Job Header (Title, Company, Posted)
│     ├─ Fit Analysis Card
│     │  ├─ Score: 78%
│     │  ├─ Positioning Angle
│     │  ├─ Strengths
│     │  └─ Gaps
│     │
│     ├─ Resume Versions Section
│     │  ├─ "Generate Resume" Button
│     │  ├─ Version List
│     │  │  ├─ V2 (Preferred)
│     │  │  │  ├─ [Preview]
│     │  │  │  ├─ [Copy]
│     │  │  │  ├─ [Download PDF]
│     │  │  │  ├─ [Regenerate]
│     │  │  │  └─ [Archive]
│     │  │  │
│     │  │  └─ V1 (Previous)
│     │  │     └─ (Same actions as V2)
│     │  │
│     │  └─ [Compare V1 vs V2]
│     │
│     ├─ Cover Letter Versions Section
│     │  └─ (Same structure as Resume)
│     │
│     └─ Action Buttons
│        ├─ [Download All PDFs]
│        └─ [Share to...]

├─ Workspace (Secondary Nav)
│  └─ (Existing feature, not affected)
│
└─ Settings (Secondary Nav)
   └─ (Existing feature, not affected)
```

### Data Relationships

```
Job
├─ Artifact (Resume V1)
│  ├─ jsonContent (resume + positioning + analysis)
│  ├─ renderedText (for copy/paste)
│  ├─ careerDocVersionId (which career profile version?)
│  ├─ promptVersion (which prompt version?)
│  └─ isPreferred: false
│
├─ Artifact (Resume V2)
│  └─ isPreferred: true
│
└─ Artifact (Cover Letter V1)
   └─ isPreferred: true

Career Profile
└─ Version 5 (referenced by Resume V1 & V2)
   └─ (If user updates career, future regenerations use Version 6)
```

---

## 6. Screen Inventory

### Screen 1: Job Detail Page (Main Canvas)

**Purpose:** User views a job, sees fit analysis, generates artifacts, and downloads.

**Key Components:**

| Component | Purpose |
|-----------|---------|
| Job Header | Title, company, posted date, save/unsave |
| Fit Analysis Card | Score, positioning, strengths, gaps |
| Resume Versions Section | List of resume versions + actions |
| Cover Letter Section | List of cover letter versions + actions |
| Action Buttons | Generate resume, generate cover, download all |

**States:**

1. **No Artifacts Yet**
   - Resume section shows "No resume generated yet"
   - Cover letter section shows "No cover letter generated yet"
   - "Generate Resume" button is prominent
   - Fit analysis shows (always available)

2. **Loading (During Generation)**
   - Spinner overlays canvas
   - "Analyzing your profile..."
   - "Crafting tailored content..."
   - Cancel button available
   - Page partially grayed out

3. **Has Artifacts (V1, V2)**
   - Version list shows all versions
   - V2 marked as "Preferred" (badge)
   - Each version has: preview, copy, download, regenerate, archive buttons
   - "Compare Versions" button visible if 2+ versions

4. **Stale Artifact Warning**
   - Yellow banner at top
   - "Your profile has been updated. Regenerate?"
   - [Regenerate] and [Dismiss] buttons

5. **Error State**
   - Red banner: "Generation failed"
   - Error message specific to failure
   - [Retry] and [Report Issue] buttons

---

### Screen 2: Resume Preview Modal

**Purpose:** User previews generated resume before downloading.

**Layout:**
```
┌─────────────────────────────────┐
│ Resume Preview          [✕]     │
├─────────────────────────────────┤
│                                 │
│ John Doe                        │
│ Senior Product Designer         │
│ San Francisco, CA               │
│                                 │
│ PROFESSIONAL SUMMARY            │
│ [Resume content rendered]       │
│                                 │
│ CORE SKILLS                     │
│ • Product Design                │
│ • Design Systems                │
│ • Figma                         │
│                                 │
│ [... rest of resume ...]        │
│                                 │
├─────────────────────────────────┤
│ [Copy to Clipboard] [Download PDF] │
└─────────────────────────────────┘
```

**Actions:**
- Copy: Copies rendered_text to clipboard (notification: "Copied!")
- Download: Generates PDF and downloads
- Close: Closes modal, returns to job detail

**States:**
- Loading (while fetching artifact)
- Loaded (resume displayed)
- Copying (button shows "Copied!" then reverts)
- Downloading (button shows "Downloading...")

---

### Screen 3: Regenerate Modal

**Purpose:** User chooses a new positioning angle for regeneration.

**Layout:**
```
┌───────────────────────────────────┐
│ Regenerate Resume           [✕]   │
├───────────────────────────────────┤
│                                   │
│ Current positioning was:          │
│ "Enterprise SaaS Expert"          │
│                                   │
│ Try a different angle:            │
│                                   │
│ ○ Design Systems Leader          │
│   (recommended)                   │
│                                   │
│ ○ Research-Driven UX             │
│                                   │
│ ○ Cross-Functional Partner       │
│                                   │
│ ○ Custom                         │
│   [Text input]                   │
│                                   │
│ [Regenerate] [Cancel]            │
│                                   │
└───────────────────────────────────┘
```

**Actions:**
- Select positioning
- Click Regenerate → loading state → V2 created in background
- Preview appears below loading state

**Validation:**
- Positioning must be < 100 characters
- No special characters

---

### Screen 4: Version Comparison View

**Purpose:** User compares V1 vs V2 side-by-side.

**Layout:**
```
┌──────────────────┬──────────────────┐
│ V2 (Preferred)   │ V1               │
│ Design Systems   │ Enterprise SaaS  │
│                  │                  │
│ PROFESSIONAL     │ PROFESSIONAL     │
│ SUMMARY          │ SUMMARY          │
│ Senior designer  │ Senior designer  │
│ focused on...    │ with expertise   │
│                  │ in...            │
│                  │                  │
│ [Preview V2]     │ [Preview V1]     │
└──────────────────┴──────────────────┘
```

**Actions:**
- Click either side to expand full preview
- Mark V2 as preferred
- Download either version

---

### Screen 5: Version List Component

**Purpose:** Shows all versions for a job + artifact.

**Layout:**
```
Resume Versions

V2: Design Systems Leader
    Generated: Today, 2:15 PM
    Preferred ✓
    [Preview] [Copy] [Download] [Archive]

V1: Enterprise SaaS Expert
    Generated: Today, 1:30 PM
    [Preview] [Copy] [Download] [Regenerate] [Archive]
```

**States:**
- Normal (shown above)
- Preferred (checkmark badge)
- Archived (grayed out, in collapsible "Archived" section)
- Selected (highlight on hover)

---

## 7. Component Inventory

### Buttons

| Button | Location | Action | State |
|--------|----------|--------|-------|
| Generate Resume | Job Detail (main) | Opens loading, generates V1 | Enabled/Disabled if no profile |
| Generate Cover Letter | Job Detail (main) | Opens loading, generates V1 | Enabled/Disabled if no profile |
| Preview | Version item | Opens Preview Modal | Always enabled |
| Copy to Clipboard | Preview Modal | Copies rendered_text | Shows "Copied!" feedback |
| Download PDF | Preview Modal + Version item | Generates PDF + downloads | Disabled if generation failed |
| Regenerate | Version item | Opens Regenerate Modal | Enabled if 1+ version exists |
| Mark as Preferred | Version item | Sets isPreferred=true, unsets others | Shows confirmation |
| Archive | Version item | Soft-deletes artifact | Shows confirmation |
| Compare Versions | Job Detail | Opens comparison view | Enabled if 2+ versions |
| Retry | Error state | Retries failed generation | Shows on error |
| Cancel | Loading state | Cancels in-flight generation | Shows during loading |

### Cards

| Card | Contents | Interaction |
|------|----------|-------------|
| Job Card (list) | Title, company, match %, saved icon | Click → Job Detail |
| Fit Analysis Card | Score, positioning, strengths, gaps | Informational (no click) |
| Artifact Version Card | Version #, positioning, date, badge | Hover → actions revealed |

### Badges & Indicators

| Badge | Meaning | Color |
|-------|---------|-------|
| "Preferred" | This version is marked as preferred | Blue |
| "Loading" | Generation in progress | Blue spinner |
| "Error" | Generation failed | Red |
| "V1", "V2", "V3" | Version number | Gray |
| "Today" | Generated today | Gray timestamp |

### Notifications/Toasts

| Message | Type | Duration |
|---------|------|----------|
| "Copied to clipboard!" | Success | 2 seconds |
| "Downloading..." | Info | Until download starts |
| "Generation failed. Retry?" | Error | 5 seconds + action |
| "Marked as preferred" | Success | 2 seconds |
| "Artifact archived" | Success | 2 seconds |

### Modals

| Modal | Purpose | Size |
|-------|---------|------|
| Resume Preview | Full resume text + actions | 600px wide |
| Cover Letter Preview | Full cover text + actions | 600px wide |
| Regenerate | Positioning selector | 400px wide |
| Comparison | V1 vs V2 side-by-side | Full width |

---

## 8. UX Principles

### 1. Never Lose Work
- Every generated version is preserved
- Archived artifacts stay in database (soft delete)
- User can retrieve old versions for reference

### 2. Always Preserve History
- Full version history visible (V1, V2, V3...)
- Versions never overwritten
- User can compare any two versions

### 3. Show Before Downloading
- Preview is mandatory before download
- User must explicitly confirm content before PDF export
- Prevents accidental application of incorrect version

### 4. Explain AI Decisions
- Fit analysis shown before generation
- Positioning strategy explained upfront
- User understands WHY the resume was generated this way

### 5. Make Regeneration Safe
- Regenerate doesn't replace old versions
- New version created as V2, V1 preserved
- User can compare before choosing preferred

### 6. Minimize Cognitive Load
- Generation happens in background (no waiting for results page)
- Preview appears on same page
- Version list organized chronologically
- One action per button

### 7. Respect User Authority
- All AI suggestions are previewed before use
- User reviews before every action (preview modal required)
- User marks their own preferred version
- No automatic downloads or submissions

### 8. Acknowledge AI Limitations
- Disclaimer shown in preview: "Please review for accuracy before using"
- Error messages are honest (not "something went wrong", but "AI couldn't format properly")
- Hallucination validation disclaimer shown on error

---

## 9. Interaction Design

### Hover States

```
Button:
  Default: Subtle background, text color
  Hover: Darker background, cursor pointer
  Active/Pressed: Darker + subtle shadow

Card:
  Default: Visible, no highlight
  Hover: Slight background highlight, shadow, actions revealed

Link:
  Default: Blue, underline
  Hover: Darker blue, underline maintained
```

### Focus States

```
All interactive elements:
  Focus: Visible outline ring (2px, brand color)
  Keyboard navigation follows document order
  Focus visible on all inputs
```

### Loading Transitions

```
Generation starts:
  1. Button shows loading spinner
  2. Page slightly grays (opacity 0.5)
  3. "Generating..." text + progress messages rotate
  4. Cancel button visible

Generation completes:
  1. Fade out spinner
  2. Fade in preview modal
  3. Success toast: "Resume generated!"
```

### Optimistic Updates

```
"Mark as Preferred":
  1. User clicks button
  2. UI immediately updates: "Preferred" badge appears
  3. Server request sent in background
  4. If error: revert UI + show error toast

"Archive":
  1. User clicks archive
  2. Confirmation dialog shown
  3. If confirmed: artifact grayed out immediately
  4. Move to "Archived" section
  5. Server request sent
  6. If error: undo + show error toast
```

### Keyboard Navigation

```
Tab:          Move through interactive elements
Shift+Tab:    Move backward
Enter:        Activate button/link
Space:        Toggle checkbox/radio
Escape:       Close modal
```

### Confirmation Dialogs

```
When archiving or destructive action:

┌───────────────────────────┐
│ Archive Resume V1?        │
│                           │
│ You can always unarchive  │
│ this version later.       │
│                           │
│ [Archive] [Cancel]        │
└───────────────────────────┘
```

---

## 10. Copy Strategy

### Button Labels

| Button | Label |
|--------|-------|
| Generate resume | "Generate Tailored Resume" |
| Generate cover | "Generate Cover Letter" |
| Preview | "Preview" |
| Copy | "Copy to Clipboard" |
| Download | "Download PDF" |
| Regenerate | "Try Different Positioning" |
| Prefer | "Mark as Preferred" |
| Archive | "Archive" |
| Compare | "Compare Versions" |

### Headings & Descriptions

| Element | Copy |
|---------|------|
| Section heading | "Resume Versions" |
| Empty state | "No resume generated yet" |
| Empty subtext | "Generate one in seconds using your career profile" |
| Modal title | "Resume Preview" |
| Fit score | "Overall Fit: 78% (High Confidence)" |

### Error Messages

| Error | Message |
|-------|---------|
| Generation failed | "Failed to generate resume. This may be due to a temporary service issue. [Retry]" |
| Invalid profile | "Career profile incomplete. Add experience and skills to generate." |
| API timeout | "Generation took longer than expected. [Retry]" |
| Hallucination detected | "Output contains unsupported content. Try regenerating with different positioning." |

### Success Messages

| Action | Message |
|--------|---------|
| Resume copied | "Copied to clipboard!" |
| Marked preferred | "Marked as preferred" |
| Archived | "Version archived" |

### Disclaimers

| Location | Copy |
|----------|------|
| Preview modal footer | "Please review for accuracy before using. You're responsible for all content sent to employers." |
| Stale artifact banner | "Your career profile has been updated since this was generated. [Regenerate]" |
| Empty state | "AI generates customized resumes based on your career profile. Each version is saved for comparison." |

### Positioning Options (Regenerate Modal)

```
○ Design Systems Leader
  Build on your design systems experience

○ Enterprise SaaS Expert
  Emphasize your deep SaaS product knowledge

○ Research-Driven UX
  Lead with your user research background

○ Cross-Functional Design Partner
  Highlight your collaboration skills
```

---

## 11. Visual Design

### Spacing System

```
xs: 4px    (icon spacing, tight groups)
sm: 8px    (internal component spacing)
md: 16px   (component-to-component spacing)
lg: 24px   (section spacing)
xl: 32px   (major section spacing)
xxl: 48px  (page-level spacing)
```

### Typography Hierarchy

```
Page title (h1):        32px bold, 1.2 line height
Section heading (h2):   24px semi-bold, 1.25 line height
Card heading (h3):      18px semi-bold, 1.3 line height
Body text:              16px regular, 1.5 line height
Button text:            16px semi-bold, 1.4 line height
Small text (captions):  14px regular, 1.4 line height
Input placeholder:      14px regular, opacity 60%
```

### Cards

```
Resume Version Card:
  ├─ Padding: 16px
  ├─ Border: 1px solid #e5e7eb
  ├─ Border-radius: 8px
  ├─ Background: white
  ├─ Box-shadow: 0 1px 3px rgba(0,0,0,0.1)
  ├─ Hover: shadow 0 4px 6px rgba(0,0,0,0.1)
  └─ Gap between items: 8px
```

### Version Badges

```
"Preferred" badge:
  ├─ Background: #dbeafe (blue-100)
  ├─ Text: #1e40af (blue-700)
  ├─ Padding: 4px 8px
  ├─ Border-radius: 4px
  ├─ Font-size: 12px
  └─ Font-weight: semi-bold

"V1", "V2" label:
  ├─ Background: transparent
  ├─ Text: #6b7280 (gray-500)
  ├─ Font-size: 14px
  └─ Font-weight: semi-bold
```

### Status Colors

```
Success (Generation complete):  #10b981 (green-500)
Loading (In progress):           #3b82f6 (blue-500)
Error (Failed):                  #ef4444 (red-500)
Warning (Stale artifact):        #f59e0b (amber-500)
Default (Not started):           #6b7280 (gray-500)
```

### Modals

```
Modal container:
  ├─ Width: 600px (preview), 400px (regenerate), full (comparison)
  ├─ Max-height: 90vh
  ├─ Border-radius: 8px
  ├─ Background: white
  ├─ Box-shadow: 0 20px 25px rgba(0,0,0,0.15)
  └─ Padding: 24px

Modal header:
  ├─ Display: flex
  ├─ Justify: space-between
  ├─ Align: center
  ├─ Padding-bottom: 16px
  ├─ Border-bottom: 1px solid #e5e7eb
  └─ Gap: 16px

Modal body:
  ├─ Padding: 24px 0
  ├─ Overflow-y: auto
  └─ Max-height: calc(90vh - 160px)

Modal footer:
  ├─ Padding-top: 16px
  ├─ Border-top: 1px solid #e5e7eb
  ├─ Display: flex
  ├─ Gap: 8px
  └─ Justify: flex-end
```

### Loading Skeleton

```
Resume card while loading:
  ├─ 16px gray placeholder, 8px border-radius
  ├─ Animate pulse (opacity 0.5 → 1 → 0.5, 2s loop)
  ├─ Layout matches loaded state
  └─ Multiple skeleton lines for multi-line content
```

### Responsive Behavior

```
Desktop (≥1024px):
  ├─ Job detail: Side panel (30%) + main content (70%)
  ├─ Version cards: Grid of 1
  ├─ Comparison view: Side-by-side 50/50
  └─ Modal: 600px centered

Tablet (768px - 1023px):
  ├─ Job detail: Stacked (panel on top, content below)
  ├─ Version cards: Grid of 1
  ├─ Comparison view: Scrollable, side-by-side
  └─ Modal: 90vw, max 600px

Mobile (< 768px):
  ├─ Job detail: Full stacked
  ├─ Version cards: Full width
  ├─ Comparison view: Scrollable with tabs (V1 | V2)
  ├─ Modal: Full screen with safe area
  └─ Buttons: Full width, larger touch targets (48px min)
```

### Dark Mode

```
Backgrounds:
  Canvas: #1f2937 (instead of white)
  Cards: #111827
  Text: #f3f4f6

Borders:
  Cards: #374151 (instead of #e5e7eb)

Shadows:
  Reduced opacity 0.05 (instead of 0.1)
```

---

## 12. Accessibility

### Keyboard Navigation

```
All interactive elements accessible via keyboard:
✓ Buttons activatable with Enter/Space
✓ Modals closeable with Escape
✓ Tab order follows visual order
✓ Focus visible at all times (outline ring)
✓ Skip-to-content link at top of page
✓ Form inputs labeled and associated
```

### ARIA Labels

```
<button aria-label="Download resume as PDF">
<button aria-label="Copy resume to clipboard">
<div role="alert" aria-live="polite">Success message</div>
<div aria-hidden="true">Decorative icon</div>
<img alt="Resume preview (formatted document)" src="...">
```

### Color Contrast

```
Text on background: 4.5:1 (WCAG AA standard)
Large text (18px+): 3:1
Interactive elements: 4.5:1

Avoid relying on color alone:
✓ Status icons + text
✓ Badges with text labels
✓ Errors with icons + messages
```

### Screen Reader Support

```
Modal title announced on open
Form labels associated with inputs
Error messages linked to form fields
Loading status announced via aria-live
Status updates announced as alerts
List structure maintained for version list
```

### Focus Management

```
Modal opens:
  └─ Focus moved to close button or first input

Modal closes:
  └─ Focus returned to triggering button

Loading completes:
  └─ Focus moved to new content area
  └─ Announcement: "Resume generated"
```

### Reduced Motion

```
Respects prefers-reduced-motion media query:
✓ Disable animations if user prefers
✓ Instant state changes instead of transitions
✓ No auto-playing animations
```

### PDF Accessibility

```
Generated PDFs include:
✓ Logical heading structure (h1, h2, h3)
✓ Meaningful link text (not "click here")
✓ Alt text for any images
✓ Tagged content (if using advanced PDF library)
```

---

## 13. Mobile Experience

### What Changes on Mobile

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Job detail layout | Side panel + main | Stacked, single column |
| Version comparison | Side-by-side 50/50 | Tabs (V1 \| V2) with scrolling |
| Modal width | 600px | 100vw (full screen) |
| Button size | 44px min height | 48px min height (touch target) |
| Font size | 16px body | 16px body (no zoom) |
| Spacing | 16px margins | 12px margins |
| Preview modal | Overlay | Full screen |

### What Remains Identical

- All functionality (generate, regenerate, download, etc.)
- All copy and messaging
- All validations and error states
- Preferred version behavior
- Version history preservation

### What Is Hidden/Collapsed

- Fit analysis gaps (show summary, details in collapsible)
- Long version lists (show recent, "show older" link)
- Side-by-side comparison (use tabs instead)

### What Becomes Full-Screen

- Preview modals (full screen on mobile)
- Comparison view (full screen with tabs)
- Regenerate modal (full screen)

---

## 14. User Feedback

### In-App Feedback Mechanisms

**Rate a Generation**
```
After download:
[How was this resume?] ★★★★☆ [Submit]
- Affects future positioning recommendations
- Stored as artifact metadata
```

**Report Incorrect Information**
```
In preview modal:
[Found an error?] [Report] → Form:
- What's wrong?
- Where did you see it?
- Contact email (optional)
```

**Mark as Preferred**
```
Explicit user action:
[★ Mark as Preferred]
- Single preferred version per type
- User is in control
```

**Delete/Archive**
```
Version-level action:
[Archive] → Soft delete → Move to "Archived" section
- User can unarchive if needed
```

### Future: Interview Outcome Tracking
```
After user reports they got interview/offer:
[Interview Result] → "Did you get an interview?" → Yes/No
- Tracked for analytics
- User sees "This positioning led to 3 interviews"
```

---

## 15. Analytics Events

### User Actions to Track

| Event | Properties | Purpose |
|-------|-----------|---------|
| `generate_clicked` | artifact_type (resume/cover) | Gauge interest in feature |
| `generation_started` | artifact_type, positioning | Track positioning choices |
| `generation_completed` | artifact_type, latency_ms, version | Measure performance |
| `generation_failed` | artifact_type, error_code | Debug issues |
| `preview_opened` | artifact_type, version | Measure preview rate |
| `pdf_downloaded` | artifact_type, version | Measure download rate |
| `artifact_copied` | artifact_type, version | Measure copy-to-clipboard usage |
| `regenerate_clicked` | current_positioning → new_positioning | Understand A/B testing patterns |
| `preferred_selected` | artifact_type, version | Track version adoption |
| `artifact_archived` | artifact_type, version | Track deletion behavior |
| `interview_reported` | artifact_type, version, outcome (yes/no) | Measure feature value |
| `accuracy_reported` | artifact_type, error_description | Track quality issues |

### Metrics Dashboard (Admin)

```
Real-time:
  ├─ % of users generating ≥1 artifact (daily)
  ├─ Avg latency (ms)
  ├─ Success rate (%)
  └─ Error breakdown by type

Weekly:
  ├─ Artifact generation count
  ├─ Version count per job
  ├─ Preferred version % (vs abandoned)
  └─ Regeneration rate

Monthly:
  ├─ Interview callback rate (if reported)
  ├─ Most common error codes
  ├─ Positioning angle popularity
  └─ User satisfaction score
```

---

## 16. Feature Flags

### Internal Testing
```
ARTIFACT_GENERATION_INTERNAL=true
  Enables: Full feature for internal team + stakeholders
  Disables: Not visible to general users
  Rollback: Set to false
```

### Beta Rollout
```
ARTIFACT_GENERATION_BETA=true
  Enables: 10% of users see feature
  Metrics: Separate analytics bucket
  Rollback: Set to false, hides from 10%
```

### General Availability (GA)
```
ARTIFACT_GENERATION_GA=true
  Enables: 100% of users
  Rollback: Set to false
```

### Feature-Specific Flags (Killswitches)

```
RESUME_GENERATION_ENABLED=true
  If false: Resume generation endpoint returns error
  Fallback: UI shows "Resume generation temporarily unavailable"

COVER_LETTER_GENERATION_ENABLED=true
  If false: Cover letter generation unavailable

PDF_EXPORT_ENABLED=true
  If false: Download buttons hidden, offer text export instead

ARTIFACT_REGENERATION_ENABLED=true
  If false: Regenerate buttons hidden (only generate once)

ARTIFACT_COMPARISON_ENABLED=true
  If false: Compare button hidden
```

---

## 17. Open Questions

**Product-Level Questions** (Unresolved, pending decision)

1. **Positioning Options:** Should we provide pre-defined options (Design Systems Leader, Enterprise SaaS Expert, etc.) or allow user-provided text or both?
   - Current plan: Pre-defined options for Phase 2, custom text in Phase 3+

2. **Interview Outcome Tracking:** Will we ask users "Did this lead to an interview?" and use that to improve recommendations?
   - Current plan: Deferred to Phase 7 (Career Operating System)

3. **Sharing Generated Artifacts:** Should users be able to share a resume version with a recruiter via link, or just download?
   - Current plan: Download only in Phase 2; sharing in Phase 7

4. **Version Limits:** Should we limit users to N versions per job to avoid clutter?
   - Current plan: No limit initially; revisit if storage becomes issue

5. **Resume Editing:** After generation, should users be able to manually edit the generated text, or is it read-only?
   - Current plan: Read-only; manual editing out of scope

6. **Integration with Career Profile Updates:** When a user updates their career profile, should old artifacts auto-regenerate, or just show a warning?
   - Current plan: Show warning, user chooses to regenerate

**Design-Level Questions** (Unresolved, pending design review)

7. **Card vs. List:** Should versions display as cards or rows in a table?
   - Need design review

8. **Modal Size for Comparison:** 600px or full-width split-screen?
   - Need design review

9. **Positioning Selection UI:** Dropdown, radio buttons, or accordion?
   - Need design review

10. **Empty State Imagery:** Should empty state have an illustration?
    - Pending design direction

---

## 18. Appendix

### A. User Flows (Detailed)

#### Flow 1: Generate Resume (Happy Path)

```
User on Job Detail
  ↓
Sees Fit Analysis (78%, "Senior Designer, SaaS")
  ↓
Clicks "Generate Tailored Resume"
  ↓
Loading state (8-12 seconds)
  ├─ "Analyzing your profile..."
  ├─ "Crafting tailored content..."
  └─ Cancel button available
  ↓
Resume V1 created in database
  ↓
Preview modal opens (rendered_text shown)
  ↓
User reviews resume
  ├─ Looks good → Click "Download PDF" or "Copy"
  ├─ Not quite → Click "Close" then "Regenerate"
  └─ Error → Click "Retry"
```

#### Flow 2: Regenerate with Different Positioning

```
User has V1 resume
  ↓
Clicks "Try Different Positioning" button
  ↓
Modal opens with options:
  ○ Design Systems Leader (recommended)
  ○ Enterprise SaaS Expert
  ○ Research-Driven UX
  ○ Custom
  ↓
User selects "Design Systems Leader"
  ↓
Clicks "Regenerate"
  ↓
Loading state
  ↓
V2 created in database
  ↓
Preview modal opens showing V2
  ↓
User can now:
  ├─ Download V2
  ├─ Compare V1 vs V2
  ├─ Mark V2 as Preferred
  └─ Regenerate again with different angle
```

#### Flow 3: Stale Artifact (Career Updated)

```
User previously generated V1 resume
  ↓
Later updates career profile (adds new role)
  ↓
Returns to job detail page with V1 visible
  ↓
Yellow warning banner shows:
  "Your profile has been updated. Regenerate?"
  ↓
User choice:
  A) Clicks "Regenerate" → Creates V2 with new career data
  B) Clicks "Dismiss" → Uses V1 anyway
  C) Takes no action → V1 remains usable
```

### B. State Diagram (Artifact Lifecycle)

```
                    ┌─────────┐
                    │  Draft  │
                    └────┬────┘
                         │
                    (Validation)
                         │
          ┌──────────────┴──────────────┐
          │                             │
      ┌───▼────┐                   ┌───▼─────┐
      │ Ready  │                   │  Error  │
      └───┬────┘                   └─────────┘
          │                             │
          ├─ Download PDF               └─ [Retry]
          ├─ Copy to clipboard              │
          ├─ Regenerate                     │
          ├─ Mark Preferred                 │
          └─ Archive                        │
                 │                          │
                 └──────────────────────────┘
                        │
                   ┌────▼────────┐
                   │  Archived   │
                   │ (soft-del)  │
                   └─────────────┘
```

### C. Information Architecture Diagram

```
Job
├─ Fit Analysis (calculated, not persisted)
│
├─ Artifacts
│  ├─ Resume V1 (persisted, versioned)
│  │  ├─ jsonContent (resume data)
│  │  ├─ renderedText (for copy/paste)
│  │  ├─ careerDocVersionId (ref)
│  │  ├─ promptVersion
│  │  ├─ model
│  │  └─ status (ready)
│  │
│  ├─ Resume V2 (same structure, isPreferred=true)
│  │
│  ├─ CoverLetter V1
│  │  └─ (same structure as resume)
│  │
│  └─ CoverLetter V2 (isPreferred=true)
│
└─ Archived
   ├─ Resume V0 (archived, soft-deleted, hidden by default)
   └─ (shown in "Archived" collapsible section)

Career Profile
└─ Version 5 (referenced by artifacts)
   └─ If updated to Version 6, stale warning appears
```

### D. Component Dependencies

```
JobDetail
├─ FitAnalysisCard (read-only)
├─ ResumeSection
│  ├─ ArtifactVersionList
│  │  ├─ VersionCard (multiple)
│  │  │  ├─ [Preview] → ResumePreviewModal
│  │  │  ├─ [Copy] → Toast notification
│  │  │  ├─ [Download] → POST /pdf → download
│  │  │  ├─ [Regenerate] → RegenerateModal
│  │  │  └─ [Archive] → ConfirmDialog
│  │  └─ [Compare] → ComparisonView
│  │
│  ├─ ResumePreviewModal
│  │  ├─ Preview text (rendered_text)
│  │  ├─ [Copy] button
│  │  └─ [Download] button
│  │
│  ├─ RegenerateModal
│  │  ├─ Positioning selector (radio buttons)
│  │  └─ [Regenerate] button
│  │
│  └─ ComparisonView
│     ├─ V1 preview
│     └─ V2 preview
│
└─ CoverLetterSection (same structure as Resume)
```

### E. Decision Rationale

**Q: Why must preview happen before download?**
A: Users must review AI-generated content for accuracy. Previews ensure they don't unknowingly send a resume with hallucinations or formatting issues.

**Q: Why preserve all versions instead of limiting to 3?**
A: Users may want to compare 5+ positioning angles for the same job. History helps them understand what worked. No storage constraints yet.

**Q: Why no resume editor after generation?**
A: Out of scope for V1. Users can manually edit downloaded PDFs if needed. In V2+, we can add text editing UI if requested.

**Q: Why require career profile fill-in?**
A: Career profile is the single source of truth. It prevents hallucination and ensures consistency. If incomplete, generation fails with clear error message.

**Q: Why not auto-regenerate when career updates?**
A: Respect user autonomy. Maybe old version is fine for pending applications. Show warning, let user decide.

### F. Future Opportunities (Out of Scope)

- **Interview Prep Guide** (Phase 7): AI generates interview talking points from resume
- **Recruiter Outreach Email** (Phase 7): AI drafts outreach to recruiter based on role
- **LinkedIn Profile Optimization** (Phase 7): Suggest LinkedIn copy based on positioning
- **Salary Negotiation** (Phase 7): Suggest negotiation strategy based on role + experience
- **Resume Editor** (Phase 3+): Allow in-app text editing after generation
- **Sharing** (Phase 5+): Share resume version with recruiter via unique link
- **Feedback Loop** (Phase 6+): Track interview outcomes tied to resume versions
- **Bulk Export** (Phase 4+): Generate + download 10 resumes at once for batch applications
- **ATS Validator** (Phase 4+): Check generated resume against ATS parser
- **Mobile App** (Phase 7+): Native iOS/Android app

---

## Final Approval Gate

**This specification is ready for Design & Engineering when:**

1. ✅ Product Manager approves scope and open questions resolved
2. ✅ Design team confirms screens and component inventory
3. ✅ Engineering team confirms technical feasibility (API contracts, DB schema)
4. ✅ QA confirms test coverage plan
5. ✅ All stakeholders aligned on success metrics

**Sign-off:**
- Product: ___________________ Date: _______
- Design: ____________________ Date: _______
- Engineering: _______________ Date: _______
- QA: _______________________ Date: _______

