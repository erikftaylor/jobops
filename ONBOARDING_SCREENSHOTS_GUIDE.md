# JobOps Onboarding Experience — Screenshots Guide

**This document describes the visual experience of the new onboarding flow.**

---

## Scenario: First-Time User (No Jobs Yet)

### Screen 1: Welcome Panel (Full View)

**Triggered:** User opens JobOps app with zero jobs in the database

**Visual Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│  JobOps Workspace                                        ⚙️  │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│                   Welcome to JobOps                             │
│          AI-powered job opportunity analysis                    │
│          against your career profile.                           │
│                                                                  │
│    JobOps analyzes job descriptions against your               │
│    professional background, identifies skill gaps, and          │
│    helps you optimize your resume for each opportunity.        │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                     Your Career Profile                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  Career Profile                                    Loaded  │  │
│  │  ─────────────────────────────────────────────────────────│  │
│  │  Source:        Master_Career_Document.md                 │  │
│  │  Last Updated:  Today                                     │  │
│  │  Version:       abc123de...                               │  │
│  │                                                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐          │  │
│  │  │     5      │  │     20     │  │     3      │          │  │
│  │  │ Experience │  │   Skills   │  │ Education  │          │  │
│  │  └────────────┘  └────────────┘  └────────────┘          │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                       How It Works                              │
│                                                                  │
│   1️⃣ Career Profile        2️⃣ Add Job        3️⃣ Analyze       │
│   Your professional    →  Paste a job    →  & Optimize        │
│   background stored      description from    Get AI insights   │
│   in Career Profile      any source          and suggestions   │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│              [ Add Your First Job → ]                           │
│                                                                  │
│   Start analyzing opportunities to optimize your               │
│   career strategy.                                              │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                      What You Can Do                            │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │      📊         │  │       🔍        │                     │
│  │ Resume Scoring  │  │ Keyword Analysis│                     │
│  │ Get scored across  │ Discover missing  │                   │
│  │ 6 categories...    │ keywords...       │                   │
│  └─────────────────┘  └─────────────────┘                     │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │      💬         │  │       ✨        │                     │
│  │   AI Chat       │  │Resume Variants  │                     │
│  │ Ask questions...   │ Generate multiple… │                  │
│  └─────────────────┘  └─────────────────┘                     │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

**Color Scheme:**
- Hero section: Black text on white background
- Status badge: Green background, darker green text ("Loaded")
- Stats: Blue numbers (primary color) on light gray background
- CTA button: Blue background (#3b82f6), white text
- Feature cards: White cards with subtle border, hover lifts up

**Interactive Elements:**
- **CTA Button:** "Add Your First Job" has arrow icon, hover shows darker blue + slight shadow
- **Feature Cards:** Hover effect lifts card up with subtle shadow
- **Status Badge:** Visual indicator of CV status

---

## Scenario: Career Profile Not Found

### Screen: Welcome Panel (Missing CV)

**Triggered:** User opens app but Career Profile/Master_Career_Document.md is missing

**Career Profile Card Changes:**
```
  Career Profile                          Not Found  (orange badge)
  ────────────────────────────────────────
  Career Profile not found at
  data/Master_Career_Document.md

  Add your professional history to get started.
```

**Result:**
- Card shows warning state (orange badge)
- No statistics displayed (they're hidden)
- Helper text guides user to create CV
- Everything else (welcome text, CTA, features) remains visible

---

## Scenario: Server Unavailable

### Screen: Welcome Panel (Server Down)

**Triggered:** Health check endpoint returns error

**Career Profile Card Changes:**
```
  Career Profile                          Unavailable (red badge)
  ────────────────────────────────────────
  Server unavailable. Please check your connection.
```

**Result:**
- Red error badge
- Single-line error message
- User can still see welcome text and features
- CTA button still visible (they can try adding job, might trigger reconnection)

---

## Scenario: User Clicks "Add Your First Job"

### Screen: Welcome Panel → Scrolls to Add Job Form

**Triggered:** User clicks "Add Your First Job" button

**Behavior:**
1. Button has visual press feedback (brief color change + scale)
2. Page smoothly scrolls down (scroll-behavior: smooth)
3. Page reaches the "Sources Panel" section
4. Focus moves to the expanded form (accessibility)
5. Cursor is ready in the job description field

**Result:**
- User's attention is drawn to the form
- Clear indication of where to type
- Reduces cognitive load (no wondering what to do next)

---

## Scenario: User Adds First Job

### Screen: Transition from Welcome to Normal View

**Triggered:** User successfully creates first job

**Behavior:**
1. Form submits
2. New job appears in list
3. JobsPage re-renders
4. Welcome panel disappears (no longer `jobs.length === 0`)
5. Normal three-panel layout appears:
   - Left: Job list with new job selected
   - Middle: Empty chat panel (no job analyzed yet)
   - Right: Studio panel (resume score, etc.)

**Result:**
- Seamless transition to normal workspace
- New user instantly understands: "I added a job, now I can analyze it"
- Multi-panel layout becomes visible
- User continues their workflow

---

## Responsive Design

### Desktop (> 1024px)
- Three-step flow shows arrows between steps: `→`
- Feature cards in 4-column grid
- Full-width centered welcome content
- Comfortable spacing on all sides

### Tablet (768px - 1024px)
- Three-step flow still shows arrows (might wrap)
- Feature cards in 2-column grid
- Slightly reduced padding
- Title text still large and readable

### Mobile (< 768px)
- Three-step flow **no arrows** (saves space)
- Feature cards in 1-column grid
- Padding reduced to 16px
- Headline reduced from 48px to 32px
- Button text and icon stack nicely
- All content still scrollable

**Mobile Example:**
```
┌─────────────────────────┐
│ Welcome to JobOps       │
│ AI-powered analysis...  │
│                         │
│ Your Career Profile     │
│ ┌─────────────────────┐ │
│ │ [Career Profile]    │ │
│ │ Loaded              │ │
│ │ [stats below...]    │ │
│ └─────────────────────┘ │
│                         │
│ How It Works            │
│                         │
│ 1️⃣ Career Profile      │
│ Your professional...    │
│                         │
│ 2️⃣ Add Job             │
│ Paste a job...          │
│                         │
│ 3️⃣ Analyze             │
│ Get AI insights...      │
│                         │
│ [Add Your First Job →]  │
│                         │
│ What You Can Do         │
│ [📊 Resume Scoring]     │
│ [🔍 Keyword Analysis]   │
│ [💬 AI Chat]            │
│ [✨ Resume Variants]    │
│                         │
└─────────────────────────┘
```

---

## Interaction Details

### Button States

**Normal:**
```
[ Add Your First Job → ]
blue background, white text
```

**Hover:**
```
[ Add Your First Job → ]
darker blue background, slight shadow effect
arrow icon shifts right by 4px
```

**Active (Clicked):**
```
[ Add Your First Job → ]
Even darker blue, shadow reduced
arrow icon returns to normal position
```

**Disabled (Loading):**
```
[ Adding Job... → ]
Gray background, slightly reduced opacity
cursor: not-allowed
arrow hidden, spinner shown
```

---

## Focus States (Accessibility)

**All buttons have visible focus outline:**
```
 ┌─────────────────────────┐
 │ [ Add Your First Job → ]│  ← 3px blue outline
 └─────────────────────────┘
```

**Feature cards highlight on focus:**
```
 ┌──────────────────────┐
 │ 📊 Resume Scoring    │  ← Border highlights on tab
 │ Get scored across... │
 │                      │
 └──────────────────────┘
```

---

## Animations

### Page Load
```
Welcome Panel fades in over 300ms
opacity: 0 → 1
transform: translateY(8px) → translateY(0)
```

### CTA Button Hover
```
Arrow icon slides right over 200ms
transform: translateX(0) → translateX(4px)
```

### Feature Card Hover
```
Card lifts up over 200ms
transform: translateY(0) → translateY(-8px)
box-shadow: subtle → more prominent
```

### Reduced Motion
All animations respect `prefers-reduced-motion` setting:
- If enabled: animations skip, instant state change
- If disabled: smooth 200-300ms transitions

---

## Color Scheme

**Status Badges:**
- Loaded: Green (#10b981) background, dark green text
- Not Found: Orange (#f59e0b) background, dark orange text
- Unavailable: Red (#ef4444) background, dark red text

**Text:**
- Primary (headings): #1a1a1a (dark gray/black)
- Secondary (descriptions): #666666 (medium gray)
- Tertiary (meta info): #999999 (light gray)

**Interactive:**
- Primary CTA: #3b82f6 (blue)
- Hover: #2563eb (darker blue)
- Text on blue: #ffffff (white)

**Backgrounds:**
- Page: #ffffff (white)
- Card: #ffffff (white) with 1px #e0e0e0 border
- Secondary bg: #f8f9fa (light gray)

---

## User Experience Flow

1. **First Time:** Welcome → Understands workflow → Adds job → Sees analysis
2. **Returning:** Jobs list → Selects job → Analyzes → Optimizes
3. **Lost User:** Takes screenshot of welcome → Shares with team → Team understands

**Success Metric:** First-time users understand the three-step workflow without needing to read documentation.

---

## Testing the Experience

### Manual QA Steps:

1. **Fresh Install**
   - Delete database: `rm data/jobops.db`
   - Start app: `npm run dev`
   - Verify welcome panel shows

2. **Career Profile Status**
   - Verify CV loaded badge (green)
   - Check stats display correctly
   - Verify dates format correctly ("Today", "Yesterday", etc.)

3. **Mobile Responsive**
   - Resize to 375px wide (iPhone)
   - Verify no horizontal scroll
   - Verify buttons clickable
   - Verify text readable

4. **First Job Creation**
   - Click "Add Your First Job" button
   - Page scrolls to form
   - Type job description
   - Submit
   - Verify welcome panel disappears
   - Verify normal three-panel view appears

5. **Accessibility**
   - Tab through all interactive elements
   - Verify focus visible on every button
   - Disable JavaScript and verify page loads
   - Test with screen reader (VoiceOver/NVDA)

---

**Note:** These are the expected visuals. Actual screenshots would be captured from the running application and added to this guide during QA phase.
