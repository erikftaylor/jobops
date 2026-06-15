# Phase 1 Vertical Slice - Demo Checklist

**Status:** ✅ READY FOR DEMONSTRATION  
**Date:** June 14, 2026  
**Test Environment:** Development Server (localhost:5173 + localhost:3001)  

---

## Pre-Demo Setup

- [ ] Database initialized with job_artifacts table
- [ ] Environment variables set:
  - [ ] `ANTHROPIC_API_KEY` configured
  - [ ] `DATABASE_PATH` pointing to data/jobops.db
  - [ ] `SERVER_PORT=3001` (or configured port)
- [ ] Dev server running: `npm run dev`
- [ ] Career document loaded (Master CV populated)
- [ ] No console errors on page load

---

## User Flow: Complete End-to-End

### 1. Open Job in Studio

- [ ] Navigate to Jobs page (/jobs or /)
- [ ] Job list visible
- [ ] Can select a job from the list
- [ ] Studio panel shows on right side
- [ ] Studio header reads "Studio Controls" with "Job analysis & actions" subtitle
- [ ] Current state badge visible and shows correct state

---

### 2. Generate Resume Button

- [ ] "Generate Tailored Resume" button visible in artifact generation section
- [ ] Button is blue with white text
- [ ] Button is clickable and enabled
- [ ] Hovering shows color change to darker blue

---

### 3. Click Generate Resume

- [ ] Click button → loading spinner appears
- [ ] Button text changes to "Generating Resume..."
- [ ] Button becomes disabled (grayed out)
- [ ] No error messages visible

---

### 4. Generation Completes (10-20 seconds)

- [ ] Spinner stops
- [ ] Button returns to normal state
- [ ] "Resume Generated" card appears below the button
- [ ] Card has light gray background
- [ ] "Resume Generated" text visible
- [ ] Version badge "V1" visible next to text
- [ ] "Preview" button appears in the card
- [ ] No error messages displayed

---

### 5. Click Preview Button

- [ ] Modal opens (dark overlay + white box)
- [ ] Modal is centered on screen
- [ ] Modal title: "Resume Preview"
- [ ] Version number shown: "Version 1"
- [ ] Close button (✕) visible in top right
- [ ] Modal is scrollable (content larger than viewport)

---

### 6. Verify Preview Content

Resume preview shows:

- [ ] "PROFESSIONAL SUMMARY" section with text
- [ ] "CORE SKILLS" section with bullet points
- [ ] "EXPERIENCE" section with:
  - [ ] Job title
  - [ ] Company name
  - [ ] Dates
  - [ ] Description
  - [ ] Bullet points
- [ ] "EDUCATION" section with:
  - [ ] School name
  - [ ] Degree
  - [ ] Graduation year (if available)
- [ ] Content is readable and properly formatted
- [ ] Text wraps correctly
- [ ] No garbled or malformed text

---

### 7. Copy to Clipboard

- [ ] "Copy" button visible in modal footer
- [ ] Click "Copy" button
- [ ] Button text changes to "✓ Copied!" with green background
- [ ] Feedback lasts for 2 seconds
- [ ] Button returns to normal state
- [ ] Can paste into text editor with Cmd+V:
  - [ ] Paste works
  - [ ] Contains "PROFESSIONAL SUMMARY"
  - [ ] Contains core skills
  - [ ] Contains work experience
  - [ ] Plain text format (no special characters)

---

### 8. Download PDF

- [ ] "Download PDF" button visible in modal footer
- [ ] Click "Download PDF"
- [ ] Browser shows download indicator
- [ ] File downloaded with pattern: `resume_v1.pdf`
- [ ] File size > 10 KB (actual PDF, not empty)
- [ ] Open PDF in reader:
  - [ ] PDF opens without errors
  - [ ] PDF displays resume content
  - [ ] Text is readable
  - [ ] Layout is single column
  - [ ] No graphics or images (ATS-safe)

---

### 9. Close Modal

- [ ] Click close button (✕) in top right
- [ ] Modal fades out and closes
- [ ] User is back at Studio panel
- [ ] "Resume Generated" card still visible

---

### 10. Persist After Refresh

- [ ] Press Cmd+R to refresh page
- [ ] Page reloads completely
- [ ] No console errors after reload
- [ ] Job is still selected
- [ ] "Resume Generated" card still visible
- [ ] Version badge "V1" still shows
- [ ] "Preview" button still works
- [ ] Can click preview again:
  - [ ] Modal opens
  - [ ] Content is identical to before refresh
  - [ ] No missing sections

---

### 11. Additional Artifacts (Optional - if testing multiple generations)

- [ ] Create a second version:
  - [ ] Click "Generate Tailored Resume" again
  - [ ] Generation completes
  - [ ] New artifact appears with "V2" badge
  - [ ] Previous artifact (V1) is preserved or replaced based on feature
  - [ ] Both can be previewed if preserved

---

### 12. Error Handling (Optional)

- [ ] Disconnect from internet:
  - [ ] Click generate
  - [ ] Error message appears: "Failed to generate resume" or similar
  - [ ] Button returns to enabled state
  - [ ] Can try again
- [ ] Kill API server:
  - [ ] Click generate
  - [ ] Error after 30 seconds: "timeout" or "connection refused"
  - [ ] Graceful error message
  - [ ] Can retry after server restarts

---

## Success Criteria (All Must Pass)

✅ **Functionality:**
- Resume generates without errors
- Preview shows all sections (summary, skills, experience, education)
- Copy functionality works (verified with paste)
- Download creates valid PDF file
- Data persists after page refresh

✅ **User Experience:**
- Loading state is clear (spinner + text change)
- Feedback is immediate (no hanging)
- Error messages are clear and actionable
- Modal is easy to close
- No UI breaks or layout issues

✅ **Performance:**
- Generation completes in 10-20 seconds (Claude latency)
- Download response is instant
- Page refresh loads in <2 seconds
- No lag when clicking buttons
- Modal opens instantly

✅ **Quality:**
- Resume content is accurate (matches career profile)
- No hallucinated information
- No formatting errors
- PDF is ATS-compliant (text-based, single column)
- No console errors

---

## Demo Script

**Opening (2 minutes):**

> "This is the Phase 1 vertical slice for resume generation. We're demonstrating one complete end-to-end path: opening a job, generating a tailored resume, previewing it, copying it, downloading it as a PDF, and verifying persistence after a page refresh."

**Generation (1 minute):**

> "I'll click the 'Generate Tailored Resume' button. This will use Claude to analyze the job description against the user's career profile, identify relevant skills and experience, and generate a tailored resume in about 15 seconds."

**Preview (1 minute):**

> "The resume is now generated. You can see the 'V1' badge indicating this is version 1. When I click 'Preview', a modal opens showing the full resume. Notice it's organized into sections: professional summary, core skills, experience, and education."

**Copy & Download (1 minute):**

> "I can copy the resume text to my clipboard using the 'Copy' button. I can also download it as a PDF, which will be ATS-safe—no graphics, no special formatting, just clean text that any applicant tracking system can parse."

**Persistence (1 minute):**

> "Finally, when I refresh the page, the resume is still there. The database persisted it, so the user won't lose any generated artifacts even if they close the browser and come back later."

**Closing (30 seconds):**

> "This validates the core architecture: artifact versioning, Claude integration with retry logic, source-consistency validation to prevent hallucinations, and a clean user experience. We're ready to move into Phase 2 where we'll add cover letters, regeneration with different positioning, version comparison, and more."

---

## Troubleshooting

**Resume doesn't generate (stays loading >30s):**
- Check ANTHROPIC_API_KEY is set
- Check server logs for Claude API errors
- Verify internet connection
- Restart dev server

**Preview button doesn't work:**
- Check browser console for errors
- Verify artifact was created in database
- Reload page and try again

**PDF download fails:**
- Check browser console for network errors
- Verify server is returning PDF data
- Try different browser if one fails

**Data doesn't persist after refresh:**
- Check database file exists at DATABASE_PATH
- Verify migration ran successfully: `sqlite3 data/jobops.db ".schema job_artifacts"`
- Check server logs for database errors

---

## Sign-Off

**Demonstrator:** _____________  
**Date:** _____________  
**Outcome:** ☐ PASS ☐ ISSUES FOUND  

**Notes:**

---

