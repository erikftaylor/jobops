# UI Component Contract & Design System Specification

**Document Version:** 1.0  
**Date:** 2026-06-14  
**Audience:** Design, Frontend Engineering, Design Ops  
**Scope:** Tailored Resume & Cover Letter Generator (Artifact System)

---

## Principles

1. **Single Responsibility:** Every component has one clear purpose
2. **State Documentation:** Every state is documented with visuals and behavior
3. **Prop Contract:** Every prop is defined with type, default, and constraints
4. **Deterministic Interaction:** Every interaction produces predictable, documented outcomes
5. **Accessibility First:** ARIA, keyboard nav, contrast, and screen readers are part of the contract
6. **Design System Alignment:** All components use global tokens (no hardcoded values)

---

## 1. Global Design Tokens

### 1.1 Typography System

#### Font Family
```
Primary Font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell
Fallback: sans-serif
Monospace: "Monaco", "Courier New", monospace (for code snippets in resume)

Token Name: $font-family-primary
Token Name: $font-family-monospace
```

#### Font Sizes
```
h1: 32px    $text-size-h1
h2: 24px    $text-size-h2
h3: 18px    $text-size-h3
body: 16px  $text-size-body
small: 14px $text-size-small
xs: 12px    $text-size-xs
```

#### Font Weights
```
Regular: 400   $font-weight-regular
Medium: 500    $font-weight-medium
Semi-Bold: 600 $font-weight-semibold
Bold: 700      $font-weight-bold
```

#### Line Heights
```
Tight: 1.2    (headings)     $line-height-tight
Normal: 1.5   (body text)    $line-height-normal
Relaxed: 1.75 (captions)     $line-height-relaxed
```

#### Letter Spacing
```
Normal: 0      $letter-spacing-normal
Wide: 0.5px    $letter-spacing-wide
```

#### Usage Hierarchy
```
Page Title (h1)
  Font: $font-family-primary, $text-size-h1, $font-weight-bold
  Line Height: $line-height-tight
  Letter Spacing: $letter-spacing-normal
  Usage: Job detail page title, major section headers

Section Header (h2)
  Font: $font-family-primary, $text-size-h2, $font-weight-semibold
  Line Height: $line-height-tight
  Letter Spacing: $letter-spacing-normal
  Usage: "Resume Versions", "Cover Letter Versions", modal titles

Card Header (h3)
  Font: $font-family-primary, $text-size-h3, $font-weight-semibold
  Line Height: $line-height-tight
  Letter Spacing: $letter-spacing-normal
  Usage: Artifact card titles, modal headers

Body Text
  Font: $font-family-primary, $text-size-body, $font-weight-regular
  Line Height: $line-height-normal
  Letter Spacing: $letter-spacing-normal
  Usage: Descriptions, content, instructions

Small Text
  Font: $font-family-primary, $text-size-small, $font-weight-regular
  Line Height: $line-height-relaxed
  Letter Spacing: $letter-spacing-normal
  Usage: Captions, metadata (created date), helper text

Caption Text (xs)
  Font: $font-family-primary, $text-size-xs, $font-weight-regular
  Line Height: $line-height-relaxed
  Letter Spacing: $letter-spacing-normal
  Usage: Badge text, tiny labels, timestamps
```

---

### 1.2 Color Tokens

#### Backgrounds
```
$bg-canvas:      #ffffff (light mode) / #111827 (dark mode)
$bg-surface:     #f9fafb (light mode) / #1f2937 (dark mode)
$bg-hover:       #f3f4f6 (light mode) / #374151 (dark mode)
```

#### Surfaces (Cards, Modals)
```
$surface-primary:    #ffffff (light) / #1f2937 (dark)
$surface-secondary:  #f9fafb (light) / #111827 (dark)
$surface-tertiary:   #f3f4f6 (light) / #374151 (dark)
```

#### Borders
```
$border-default:   #e5e7eb (light) / #374151 (dark)
$border-light:     #f3f4f6 (light) / #4b5563 (dark)
$border-dark:      #d1d5db (light) / #1f2937 (dark)
```

#### Text
```
$text-primary:     #111827 (light) / #f3f4f6 (dark)
$text-secondary:   #6b7280 (light) / #9ca3af (dark)
$text-tertiary:    #9ca3af (light) / #6b7280 (dark)
$text-inverted:    #f9fafb (light) / #111827 (dark)
```

#### Semantic Colors
```
Success:
  $color-success:        #10b981 (green-500)
  $color-success-light:  #dbeafe (green-100 for backgrounds)
  $text-success:         #047857 (green-700)

Warning:
  $color-warning:        #f59e0b (amber-500)
  $color-warning-light:  #fef3c7 (amber-100 for backgrounds)
  $text-warning:         #b45309 (amber-700)

Error:
  $color-error:          #ef4444 (red-500)
  $color-error-light:    #fee2e2 (red-100 for backgrounds)
  $text-error:           #991b1b (red-700)

Info:
  $color-info:           #3b82f6 (blue-500)
  $color-info-light:     #dbeafe (blue-100 for backgrounds)
  $text-info:            #1e40af (blue-700)

Interactive:
  $color-primary:        #3b82f6 (blue-500)
  $color-primary-hover:  #2563eb (blue-600)
  $color-primary-active: #1d4ed8 (blue-700)

Disabled:
  $bg-disabled:          $bg-hover
  $text-disabled:        $text-tertiary
  $border-disabled:      $border-light
```

---

### 1.3 Spacing System (4px / 8px Grid)

```
xs:    4px   $spacing-xs
sm:    8px   $spacing-sm
md:    16px  $spacing-md
lg:    24px  $spacing-lg
xl:    32px  $spacing-xl
xxl:   48px  $spacing-xxl

Component Padding:
  Tight (buttons, badges):     $spacing-sm ($spacing-xs vertical)
  Normal (cards, inputs):      $spacing-md
  Relaxed (modals, sections):  $spacing-lg

Gap Between Items:
  Compact (list items):        $spacing-sm
  Normal (card items):         $spacing-md
  Spacious (sections):         $spacing-lg

Grid Spacing:
  Column gap:   $spacing-md
  Row gap:      $spacing-md
  Section gap:  $spacing-lg
```

---

### 1.4 Radius

```
Small:   4px   $radius-sm   (buttons, small cards, badges)
Medium:  8px   $radius-md   (cards, modals, inputs)
Large:   12px  $radius-lg   (large modals, prominent cards)
Full:    9999px $radius-full (circular badges, avatars)
```

---

### 1.5 Shadows

```
Elevation 1 (cards, small components):
  Box Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
  Token: $shadow-sm

Elevation 2 (hovered cards, popovers):
  Box Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
  Token: $shadow-md

Elevation 3 (focused elements):
  Box Shadow: 0 10px 15px rgba(0, 0, 0, 0.1)
  Token: $shadow-lg

Modal (overlays):
  Box Shadow: 0 20px 25px rgba(0, 0, 0, 0.15)
  Token: $shadow-modal

Popover (above content):
  Box Shadow: 0 10px 20px rgba(0, 0, 0, 0.12)
  Token: $shadow-popover

Dark Mode Adjustment:
  All shadows use rgba(0, 0, 0, opacity * 0.8) in dark mode
```

---

## 2. Component Contracts

### Component 2.1: ArtifactCard

**Purpose:** Display a single artifact (resume or cover letter version) with metadata and actions.

**Props:**
```typescript
interface ArtifactCardProps {
  // Identity
  artifactId: string;                    // unique identifier
  artifactType: 'resume' | 'cover_letter';
  version: number;                       // V1, V2, V3
  
  // Content
  positioning?: string;                  // "Design Systems Leader"
  createdAt: string;                     // ISO 8601 timestamp
  
  // State
  status: 'ready' | 'loading' | 'error' | 'archived';
  isPreferred?: boolean;                 // only true for one artifact per type
  
  // Callbacks
  onPreview: (artifactId: string) => void;
  onCopy: (artifactId: string) => void;
  onDownload: (artifactId: string) => void;
  onRegenerate: (artifactId: string) => void;
  onMarkPreferred: (artifactId: string) => void;
  onArchive: (artifactId: string) => void;
  
  // Options
  className?: string;                    // for custom styling
  isCompact?: boolean;                   // hide action buttons if true
}
```

**Events:**
```
onPreview(artifactId)        → opens PreviewModal
onCopy(artifactId)           → copy to clipboard, show toast
onDownload(artifactId)       → POST /pdf, download
onRegenerate(artifactId)     → open RegenerateModal
onMarkPreferred(artifactId)  → PATCH /preferred, update UI
onArchive(artifactId)        → show confirmation, then PATCH /archive
```

**States:**

1. **Default**
   - All buttons visible and enabled
   - Version badge shows "V1", "V2", etc. ($text-secondary)
   - Positioning shows in subtitle
   - Created date shows in small text

2. **Preferred**
   - Blue "Preferred ✓" badge shown ($color-success)
   - Mark as Preferred button hidden
   - Other visual indicator (optional: subtle highlight)

3. **Loading**
   - Spinner shows in center
   - Action buttons disabled
   - Text grayed out (opacity 0.5)

4. **Error**
   - Red error icon
   - Error message shown instead of actions
   - Retry button visible

5. **Archived**
   - Opacity 0.5 (grayed out)
   - Moved to "Archived" collapsible section
   - Unarchive button visible instead of other actions

6. **Hover**
   - Background color changes to $bg-hover
   - Box shadow increases to $shadow-md
   - Action buttons appear (if hidden)
   - Cursor pointer

7. **Focused (Keyboard)**
   - Focus ring around entire card
   - Tab order: preview → copy → download → regenerate → archive

**Accessibility:**
```
<div role="article" aria-label="Resume V2, Design Systems Leader">
  <h4>Resume <span aria-label="Version 2">V2</span></h4>
  <p aria-label="Positioning">Design Systems Leader</p>
  <time dateTime={createdAt}>Generated today</time>
  <div role="toolbar" aria-label="Actions">
    <button aria-label="Preview resume V2">Preview</button>
    <button aria-label="Copy resume V2 to clipboard">Copy</button>
    <button aria-label="Download resume V2 as PDF">Download</button>
    ...
  </div>
</div>
```

**Responsive Behavior:**
```
Desktop (≥1024px):
  Layout: Flex row, actions on right
  Width: Auto, max 600px
  Spacing: $spacing-md

Tablet (768px - 1023px):
  Layout: Flex row, actions on right
  Width: 100%
  Spacing: $spacing-md

Mobile (< 768px):
  Layout: Flex column
  Width: 100%
  Spacing: $spacing-sm
  Actions wrap to new row
```

**Animation:**
```
Hover: Background fade-in 150ms ease-out
Archive: Fade out 200ms ease-out, remove from DOM
Preferred badge: Pulse animation on first appearance 300ms
```

**Composition Rules:**
```
Parent: VersionList
Siblings: Other ArtifactCards
Children: None (text content only)
Max per page: Unlimited (with virtualization if > 20)
```

---

### Component 2.2: VersionList

**Purpose:** Display all artifact versions for a job + artifact type, organized chronologically.

**Props:**
```typescript
interface VersionListProps {
  jobId: string;
  artifactType: 'resume' | 'cover_letter';
  versions: Artifact[];                  // ordered newest first
  
  isLoading?: boolean;
  error?: string;
  
  onGenerateNew: () => void;
  onCompare: (versions: Artifact[]) => void;
  
  // Individual artifact handlers
  onPreview: (artifactId: string) => void;
  onCopy: (artifactId: string) => void;
  onDownload: (artifactId: string) => void;
  onRegenerate: (artifactId: string) => void;
  onMarkPreferred: (artifactId: string) => void;
  onArchive: (artifactId: string) => void;
}
```

**States:**

1. **Empty (No Artifacts)**
   - Shows EmptyState component
   - "No resume generated yet" heading
   - "Generate one in seconds" subtext
   - [Generate] button prominent

2. **Has Artifacts (1+)**
   - ArtifactCard list shown (newest first)
   - V1, V2, V3... in order
   - Preferred badge on one card

3. **Has Archived**
   - Recent versions shown expanded
   - "Archived" section collapsible
   - Grouped separately

4. **Loading**
   - SkeletonLoader shown
   - 3 placeholder cards

5. **Error**
   - ErrorState component shown
   - Error message + retry button

**Accessibility:**
```
<section aria-label="Resume versions">
  <h2>Resume Versions</h2>
  <ul role="list">
    {versions.map(v => (
      <li key={v.id} role="listitem">
        <ArtifactCard {...} />
      </li>
    ))}
  </ul>
</section>
```

**Responsive Behavior:**
```
Desktop: Full-width list, each card takes 100% width
Tablet: Full-width list
Mobile: Full-width list, cards stack vertically
```

---

### Component 2.3: VersionBadge

**Purpose:** Display version number and optional status indicator.

**Props:**
```typescript
interface VersionBadgeProps {
  version: number;                       // 1, 2, 3...
  isPreferred?: boolean;
  status?: 'ready' | 'loading' | 'error';
  size?: 'sm' | 'md';                    // default: md
  className?: string;
}
```

**Visual:**
```
Default:
  "V1"
  Font: $text-size-small, $font-weight-semibold
  Color: $text-secondary
  Background: transparent
  Padding: 0 (inline text)

Preferred:
  "V2 ✓" with blue dot
  Font: $text-size-small, $font-weight-semibold
  Color: $text-success
  Background: $color-success-light
  Padding: $spacing-xs $spacing-sm
  Border-radius: $radius-sm
```

**States:**
```
Default: Gray text, no background
Preferred: Blue background + checkmark
Loading: Spinner icon instead of text
Error: Red background
```

---

### Component 2.4: FitAnalysisCard

**Purpose:** Display job fit score, positioning angle, strengths, and gaps.

**Props:**
```typescript
interface FitAnalysisCardProps {
  score: number;                         // 0-100
  confidenceLevel: 'low' | 'medium' | 'high';
  positioning: string;                   // "Senior Designer, SaaS Expert"
  strengths: string[];                   // ["Design systems", "SaaS"]
  gaps: string[];                        // ["No healthcare domain"]
  
  className?: string;
}
```

**Anatomy:**
```
┌─────────────────────────────────┐
│ Overall Fit: 78% (High)         │  ← Score + confidence
│                                 │
│ Positioning Angle:              │  ← Label
│ "Senior Product Designer..."    │  ← Positioning text
│                                 │
│ Strongest Matches:              │  ← Heading
│ • UX/product design (10+)       │  ← Bullet list
│ • SaaS/B2B experience          │
│ • Design systems leadership     │  ← max 3 items
│                                 │
│ Key Gaps:                       │  ← Heading
│ • No stated healthcare domain   │  ← Bullet list
│ • Limited e-commerce exp.       │  ← max 2 items
│                                 │
│ [Generate Resume] [Gen. Cover]  │  ← Action buttons
└─────────────────────────────────┘
```

**Spacing:**
```
Card padding: $spacing-lg
Section gap: $spacing-md
Bullet margin: $spacing-sm left
Item gap: $spacing-xs
Button gap: $spacing-sm
```

**Responsive:**
```
Desktop: Full width, max 500px
Tablet: Full width
Mobile: Full width, padding reduced to $spacing-md
```

---

### Component 2.5: ResumePreviewModal

**Purpose:** Display full resume preview for review before download.

**Props:**
```typescript
interface ResumePreviewModalProps {
  isOpen: boolean;
  artifact: Artifact;
  isLoading?: boolean;
  error?: string;
  
  onClose: () => void;
  onCopy: () => void;
  onDownload: () => void;
  
  className?: string;
}
```

**Layout:**
```
┌─────────────────────────────────┐
│ Resume Preview         [X]      │  ← Header + close button
├─────────────────────────────────┤
│                                 │
│ [Resume content from artifact]  │  ← Rendered text
│ [Scrollable]                    │
│                                 │
├─────────────────────────────────┤
│ [Copy] [Download PDF] [Close]   │  ← Footer actions
└─────────────────────────────────┘
```

**Width:**
```
Desktop: 600px
Tablet: 90vw, max 600px
Mobile: Full screen (100vh)
```

**States:**
```
Loading: Spinner + "Loading resume..."
Error: Error message + [Retry] button
Success: Full resume displayed
```

**Accessibility:**
```
role="dialog"
aria-labelledby="modal-title"
aria-modal="true"
Focus trap: Tab cycles through buttons only
Escape closes modal
```

---

### Component 2.6: PositioningSelector

**Purpose:** Allow user to select positioning angle for regeneration.

**Props:**
```typescript
interface PositioningSelectorProps {
  currentPositioning?: string;
  options: Array<{
    value: string;
    label: string;
    description?: string;
    recommended?: boolean;
  }>;
  onSelect: (positioning: string) => void;
  allowCustom?: boolean;                 // allow free-form text input
}
```

**Layout:**
```
┌──────────────────────────────────┐
│ Regenerate Resume          [X]   │
├──────────────────────────────────┤
│ Current positioning was:         │
│ "Enterprise SaaS Expert"        │
│                                 │
│ Try a different angle:          │
│                                 │
│ ○ Design Systems Leader        │  ← Radio button
│   Build on your design...      │  ← Description
│   (recommended)                │
│                                 │
│ ○ Research-Driven UX           │
│   Lead with your research...   │
│                                 │
│ ○ Custom                       │
│   [Text input field]           │
│                                 │
│ [Regenerate] [Cancel]          │
└──────────────────────────────────┘
```

**States:**
```
Default: First radio selected
Hover: Background highlight on option
Focused: Focus ring on radio button
Recommended: Visual indicator (badge)
Custom: Text input becomes visible
Generating: [Regenerate] button shows spinner
```

---

### Component 2.7: GenerateButton

**Purpose:** Trigger artifact generation (resume or cover letter).

**Props:**
```typescript
interface GenerateButtonProps {
  artifactType: 'resume' | 'cover_letter';
  isLoading?: boolean;
  isDisabled?: boolean;
  error?: string;
  
  onClick: () => void;
  
  size?: 'sm' | 'md' | 'lg';            // default: md
  variant?: 'primary' | 'secondary';    // default: primary
}
```

**Visual:**
```
Default (Primary):
  Background: $color-primary
  Text: white
  Padding: $spacing-sm $spacing-md (height 44px)
  Border-radius: $radius-md
  Font-weight: $font-weight-semibold
  Label: "Generate Tailored Resume"

Secondary:
  Background: $bg-surface
  Text: $text-primary
  Border: 1px solid $border-default
  
Hover:
  Background: $color-primary-hover
  Box-shadow: $shadow-md
  
Active/Pressed:
  Background: $color-primary-active
  
Disabled:
  Background: $bg-disabled
  Text: $text-disabled
  Cursor: not-allowed
  Opacity: 0.5
  
Loading:
  Spinner icon + "Generating..."
  Button disabled
  Width: same as normal
```

**Accessibility:**
```
<button
  type="button"
  aria-label="Generate tailored resume"
  aria-busy={isLoading}
  aria-disabled={isDisabled}
  disabled={isDisabled || isLoading}
>
  {isLoading && <Spinner aria-hidden="true" />}
  {isLoading ? 'Generating...' : 'Generate Tailored Resume'}
</button>
```

---

### Component 2.8: DownloadButton

**Purpose:** Trigger PDF export of artifact.

**Props:**
```typescript
interface DownloadButtonProps {
  artifactId: string;
  artifactType: 'resume' | 'cover_letter';
  isLoading?: boolean;
  isDisabled?: boolean;
  
  onClick: () => void;
}
```

**Visual:**
```
Default:
  Text button with icon (↓ download icon)
  Color: $color-primary
  Background: transparent
  Padding: $spacing-xs $spacing-sm
  Font-size: $text-size-body
  
Hover:
  Text-decoration: underline
  Color: $color-primary-hover
  Background: $bg-hover
  
Loading:
  Icon becomes spinner
  Text: "Downloading..."
  Disabled
  
Disabled:
  Opacity: 0.5
  Cursor: not-allowed
```

---

### Component 2.9: CopyButton

**Purpose:** Copy artifact text to clipboard.

**Props:**
```typescript
interface CopyButtonProps {
  text: string;                          // rendered_text to copy
  artifactId: string;
  
  onClick: () => void;
  onSuccess?: () => void;                // callback after copy
  onError?: (error: Error) => void;
}
```

**Visual:**
```
Default:
  Text button with icon (copy icon)
  Color: $color-primary
  Background: transparent
  
After Click:
  Text changes: "Copied!"
  Color changes: $color-success
  Icon changes: checkmark
  After 2 seconds, reverts to original
  
Error:
  Text: "Failed to copy"
  Color: $color-error
```

---

### Component 2.10: Toast

**Purpose:** Display temporary notification (success, error, info).

**Props:**
```typescript
interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;                     // milliseconds, default 3000
  action?: {
    label: string;
    onClick: () => void;
  };
  
  onDismiss: (id: string) => void;
}
```

**Anatomy:**
```
┌────────────────────────────────┐
│ ✓ Copied to clipboard!  [×]    │  ← Icon + message + close
└────────────────────────────────┘
```

**Positioning:**
```
Desktop: Bottom-right, 16px from edges
Tablet: Bottom-right, 12px from edges
Mobile: Bottom-center, 12px from edges, full width - 24px
```

**Type Colors:**
```
Success: bg=$color-success-light, text=$text-success
Error:   bg=$color-error-light, text=$text-error
Info:    bg=$color-info-light, text=$text-info
Warning: bg=$color-warning-light, text=$text-warning
```

**Animation:**
```
Enter: Slide up + fade in, 200ms ease-out
Exit: Slide down + fade out, 200ms ease-in
```

---

### Component 2.11: Modal

**Purpose:** Generic modal container for all overlay dialogs.

**Props:**
```typescript
interface ModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';             // default: md
  onClose: () => void;
  
  footer?: ReactNode;
  closeOnEscape?: boolean;               // default: true
  closeOnBackdropClick?: boolean;        // default: true
}
```

**Sizes:**
```
sm: 400px
md: 600px
lg: 800px (only for comparison view)
```

**Anatomy:**
```
┌───────────────────────────┐
│ Title                [×]  │  ← Header
├───────────────────────────┤
│                           │
│ Content (scrollable)      │
│                           │
├───────────────────────────┤
│ [Cancel] [Action]         │  ← Footer (optional)
└───────────────────────────┘
```

**Backdrop:**
```
Color: rgba(0, 0, 0, 0.5)
Blur: none
Click outside: closes modal (if closeOnBackdropClick=true)
```

**Accessibility:**
```
role="dialog"
aria-modal="true"
aria-labelledby="modal-title"
Focus trap: Tab cycles only within modal
Escape key: closes modal (if closeOnEscape=true)
```

**Animation:**
```
Enter: Fade-in 150ms + scale from center
Exit: Fade-out 100ms
```

---

### Component 2.12: SkeletonLoader

**Purpose:** Placeholder while content loads.

**Props:**
```typescript
interface SkeletonLoaderProps {
  count?: number;                        // number of placeholder lines
  height?: string;                       // default: 20px
  width?: string;                        // default: 100%
  className?: string;
}
```

**Visual:**
```
Placeholder bar:
  Background: $bg-hover
  Height: 20px (or custom)
  Border-radius: $radius-sm
  Animation: pulse (opacity 0.5 → 1 → 0.5, 2s loop)
  
Multiple placeholders:
  Gap: $spacing-sm
  Stack vertically
```

---

### Component 2.13: StatusBadge

**Purpose:** Display artifact status (ready, loading, error, archived).

**Props:**
```typescript
interface StatusBadgeProps {
  status: 'ready' | 'loading' | 'error' | 'archived' | 'preferred';
  size?: 'sm' | 'md';                    // default: sm
}
```

**Styles:**
```
ready:     bg=$color-success-light, text=$text-success, checkmark icon
loading:   bg=$color-info-light, spinner icon
error:     bg=$color-error-light, text=$text-error, error icon
archived:  bg=$bg-hover, text=$text-secondary
preferred: bg=$color-success-light, text=$text-success, star icon
```

---

### Component 2.14: EmptyState

**Purpose:** Display when no artifacts generated yet.

**Props:**
```typescript
interface EmptyStateProps {
  icon?: ReactNode;
  heading: string;
  description?: string;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}
```

**Layout:**
```
[Icon]
Heading Text
Description text (optional)
[Primary Action] [Secondary Action]
```

**Spacing:**
```
Icon to heading: $spacing-lg
Heading to description: $spacing-md
Description to buttons: $spacing-lg
Button gap: $spacing-sm
```

---

### Component 2.15: ErrorState

**Purpose:** Display when generation fails.

**Props:**
```typescript
interface ErrorStateProps {
  title: string;
  message: string;
  errorCode?: string;                    // e.g., "GENERATION_FAILED"
  actions: Array<{
    label: string;
    onClick: () => void;
  }>;
}
```

**Visual:**
```
[Red Error Icon]
Title (bold)
Error message
Error code (small, gray, technical)
[Retry] [Report Issue]
```

---

### Component 2.16: Tabs

**Purpose:** Switch between views (used on mobile for comparison: V1 tab | V2 tab).

**Props:**
```typescript
interface TabsProps {
  tabs: Array<{
    id: string;
    label: string;
    content: ReactNode;
  }>;
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}
```

**Visual:**
```
Tab Headers:
  Underline style (underline grows under selected tab)
  Border-bottom: 2px solid $color-primary
  Text: $text-primary
  Padding: $spacing-sm (vertical) $spacing-md (horizontal)
  
Inactive Tab:
  Text: $text-secondary
  Border-bottom: 1px solid $border-light
  Hover: bg-color changes to $bg-hover
  
Active Tab:
  Text: $text-primary
  Font-weight: $font-weight-semibold
  Border-bottom: 2px solid $color-primary
```

---

### Component 2.17: ComparisonView

**Purpose:** Display two artifact versions side-by-side.

**Props:**
```typescript
interface ComparisonViewProps {
  artifactType: 'resume' | 'cover_letter';
  versionA: Artifact;
  versionB: Artifact;
  
  onSelectPreferred: (artifactId: string) => void;
  onDownload: (artifactId: string) => void;
}
```

**Layout (Desktop):**
```
┌────────────────────────────────┬────────────────────────────────┐
│ V1: Positioning A              │ V2: Positioning B              │
│ [Preview] [Copy] [Mark Pref]   │ [Preview] [Copy] [Mark Pref]   │
├────────────────────────────────┼────────────────────────────────┤
│ Content side A                 │ Content side B                 │
│ (scrollable)                   │ (scrollable)                   │
│                                │                                │
└────────────────────────────────┴────────────────────────────────┘
```

**Layout (Mobile with Tabs):**
```
V1 | V2
─────────────────────────────
Content (full width)
(scrollable)
```

---

## 3. Component State Matrix

Every component tracks these states:

| State | Visual | Behavior |
|-------|--------|----------|
| **Default** | Normal appearance | Fully interactive |
| **Hover** | Background highlight, shadow | cursor: pointer |
| **Pressed** | Darker shade, slight shrink | onClick fires |
| **Focused** | Focus ring visible | Keyboard accessible |
| **Loading** | Spinner, disabled | onClick disabled |
| **Disabled** | Grayed out, opacity 0.5 | cursor: not-allowed, onClick no-op |
| **Error** | Red background/border | Error message shown |
| **Empty** | Large icon + text | Call-to-action button |
| **Success** | Green checkmark + message | Auto-dismiss after 2s |
| **Archived** | Grayed out, low opacity | Read-only |
| **Preferred** | Blue badge + checkmark | Highlighted |

---

## 4. Motion & Animation

All animations respect `prefers-reduced-motion` media query.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Standard Durations:**
```
Fast (micro interactions): 150ms cubic-bezier(0.4, 0, 0.2, 1)
Normal (button click): 200ms cubic-bezier(0.4, 0, 0.2, 1)
Slow (modal open): 300ms cubic-bezier(0.4, 0, 0.2, 1)
```

**Animation Types:**

```
Fade: opacity 0 → 1
Slide-up: translateY(10px) → translateY(0px)
Slide-down: translateY(-10px) → translateY(0px)
Scale: scale(0.95) → scale(1)
Pulse: opacity 0.5 → 1 → 0.5 (2s infinite)
Spin: rotate(0deg) → rotate(360deg) (1s infinite linear)
```

---

## 5. Responsive Breakpoints

```
Mobile:  < 768px
Tablet:  768px - 1023px
Desktop: ≥ 1024px

Max widths:
  Container max-width: 1280px
  Modal max-width: 600px
  Card max-width: 600px
```

---

## 6. Accessibility Checklist (Per Component)

Every component must include:

- ✓ ARIA labels and roles
- ✓ Semantic HTML (button, nav, etc.)
- ✓ Focus visible ring
- ✓ Keyboard navigation (Tab, Shift+Tab, Enter, Escape)
- ✓ Color contrast 4.5:1 (WCAG AA)
- ✓ Screen reader announcements for state changes
- ✓ Alt text for images/icons
- ✓ Focus trap in modals
- ✓ Live region for async updates

---

## 7. Figma Mapping

Every component in Figma must have:

```
Component Name:
  [Category]/[ComponentName]
  
  Example: Artifact/ArtifactCard, Artifact/VersionBadge

Variants:
  Status: default, hover, active, focused, loading, disabled, error
  Size: sm, md, lg (if applicable)
  Modifier: preferred, archived (if applicable)

Properties:
  Color: Uses color variables
  Typography: Uses text styles
  Spacing: Uses spacing tokens
  Radius: Uses radius tokens
  Shadow: Uses shadow tokens

Auto Layout:
  Gap: Uses spacing tokens
  Padding: Uses spacing tokens
  Direction: Column or Row (explicit)

Variables:
  Color fills: Linked to design system colors
  Border colors: Linked to design system borders
  Text colors: Linked to design system text
```

---

## 8. Frontend Mapping

Every component has:

```typescript
// File: src/client/features/artifacts/components/[ComponentName].tsx

import { FC, ReactNode, useCallback } from 'react';

interface [ComponentName]Props {
  // All props documented above
}

export const [ComponentName]: FC<[ComponentName]Props> = ({
  // Props
}) => {
  // Implementation
};

export default [ComponentName];
```

**Memoization:**
```
Memoize if:
  - Component receives objects/arrays as props
  - Component is used in lists (re-renders siblings)
  - Expensive computation in render
  
Do NOT memoize if:
  - All props are primitives
  - Component rarely re-renders
  - Memoization cost > re-render cost
```

---

## 9. Component Integration Checklist

Before considering a component done:

### Visual ✓
- [ ] Matches design mockup pixel-perfectly
- [ ] All states documented in Storybook
- [ ] Dark mode verified
- [ ] Responsive behavior tested (mobile, tablet, desktop)
- [ ] Visual regression test added

### Interaction ✓
- [ ] All props work correctly
- [ ] All events fire
- [ ] Loading states work
- [ ] Error states display
- [ ] Disabled states prevent interaction

### Accessibility ✓
- [ ] Keyboard navigation works (Tab, Shift+Tab, Enter, Escape)
- [ ] Focus visible on all interactive elements
- [ ] ARIA labels present
- [ ] Screen reader tested
- [ ] Color contrast 4.5:1 verified
- [ ] prefers-reduced-motion respected

### Code Quality ✓
- [ ] TypeScript types complete
- [ ] No console errors or warnings
- [ ] No accessibility violations (axe audit)
- [ ] Prop documentation complete
- [ ] Story added to Storybook

### Testing ✓
- [ ] Unit tests cover all states
- [ ] Integration tests cover interactions
- [ ] E2E test covers user flow
- [ ] Visual regression test added
- [ ] Accessibility test (axe) passes

---

## 10. Documentation Template

Every component has:

```
## [ComponentName]

### Purpose
One-sentence description of what this component does.

### When to use
- Bullet list of use cases
- When NOT to use it
- Alternative components

### Props
[Documented above in Props section]

### States
[Documented above in States section]

### Anatomy
```
[ASCII diagram of component parts]
```

### Accessibility
[ARIA, keyboard nav, screen reader requirements]

### Example Usage
```typescript
<ComponentName prop1="value" onEvent={handler} />
```

### Figma Mapping
- Component: [Figma path]
- Variants: [list]
- Properties: [list]

### Related Components
- [Link to related]
- [Link to related]
```

---

## Final Sign-Off Checklist

This design system is ready when:

- ✅ All 18 components documented
- ✅ All tokens defined (typography, colors, spacing, shadows)
- ✅ All state matrices complete
- ✅ Figma components match specification
- ✅ React components implemented per spec
- ✅ Storybook stories created
- ✅ Visual regression tests added
- ✅ Accessibility audit passed (axe, WCAG AA)
- ✅ Responsive behavior tested
- ✅ Dark mode implemented
- ✅ Animation performance verified
- ✅ Documentation complete

**Sign-off:**
- Design: _________________ Date: _______
- Frontend Lead: __________ Date: _______
- QA: ____________________ Date: _______

