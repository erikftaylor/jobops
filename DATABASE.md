# JobOps Database Schema (Revised)

## Core Design Principle

JobOps uses **event-based tracking with versioned artifacts**:
- **Jobs** are opportunities (immutable facts)
- **Chat messages** are job-scoped conversations (persisted for context)
- **Analyses** are assessments (recomputable, cached)
- **Tracker events** are actions taken ("did you apply?", "got interview", etc.)
- **Artifacts** are generated resumes/letters (with source preservation)
- **Career doc versions** are immutable snapshots (content-addressed by hash)
- **Outreach** tracks how/when job was applied to
- **Settings** stores user thresholds and preferences

---

## Schema Overview

```
jobs                   — Opportunities discovered or added
├─ analyses            — AI assessments of job fit
├─ chat_messages       — Job-scoped conversation history
├─ artifacts           — Generated resume/cover letter PDFs
├─ outreach            — Application actions and outcomes
└─ tracker_events      — Event log ("applied", "interview", "offer", etc.)

career_doc_versions    — Immutable snapshots of career document
settings               — User configuration (thresholds, preferences)
```

---

## Table Definitions

### jobs

Job opportunities discovered or manually added.

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  
  -- Basic info
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  url TEXT,
  description TEXT,
  
  -- Job metadata
  location TEXT,
  salary_min REAL,
  salary_max REAL,
  currency TEXT DEFAULT 'USD',
  job_type TEXT CHECK (job_type IN ('full-time', 'contract', 'part-time', 'other')),
  
  -- Source tracking
  source TEXT NOT NULL CHECK (source IN (
    'manual', 'linkedin', 'indeed', 'glassdoor', 'company_website', 'other'
  )),
  source_url TEXT,
  source_id TEXT,
  
  -- Timing
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  discovered_at DATETIME,
  archived_at DATETIME,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Notes
  notes TEXT,
  
  -- Triage thresholds (can be overridden per-job)
  min_fit_score_override INTEGER,  -- If set, use this instead of global setting
  positioning_angle TEXT,         -- "emphasize this angle" for this job
  
  UNIQUE(source, source_id),
  INDEX idx_status_added (added_at DESC),
  INDEX idx_source (source),
  INDEX idx_archived (archived_at)
);
```

### analyses

Cached job-to-CV analysis results. Recomputable but cached for performance.

```sql
CREATE TABLE analyses (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Analysis metadata
  analyzed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  career_doc_version_hash TEXT,  -- Which CV version was used
  model TEXT,                     -- Which Claude model
  tokens_used INTEGER,
  
  -- Analysis results (all JSON)
  skills_match TEXT NOT NULL,     -- { matched: [], partial: [], missing: [] }
  experience_gaps TEXT NOT NULL,  -- { gaps: [], mitigations: [] }
  positioning_suggestions TEXT,   -- { angles: [], strengths: [] }
  
  -- Overall fit
  fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
  confidence_score REAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Rationale
  fit_justification TEXT,
  
  INDEX idx_job_id (job_id),
  INDEX idx_fit_score (fit_score),
  INDEX idx_analyzed_at (analyzed_at)
);
```

### chat_messages

Job-scoped persistent conversation history. Each message is a turn in the analysis conversation.

```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Message metadata
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Content
  content TEXT NOT NULL,
  
  -- Message type
  message_type TEXT CHECK (message_type IN (
    'chat',                    -- Regular conversation
    'estimate_confirmation',   -- "Does this gap look right?"
    'positioning_suggestion',  -- "Try emphasizing X"
    'system'                   -- System messages
  )),
  
  -- For estimate/confirmation messages
  estimate TEXT,              -- What we're asking confirmation on
  user_confirmed BOOLEAN,     -- Did user confirm or reject?
  confirmed_at DATETIME,
  
  INDEX idx_job_id (job_id),
  INDEX idx_created_at (created_at),
  INDEX idx_confirmed (user_confirmed)
);
```

### artifacts

Generated resumes, cover letters, and other output artifacts. Tracks what was generated, when, and where it's stored.

```sql
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- What was generated
  artifact_type TEXT NOT NULL CHECK (artifact_type IN (
    'resume_pdf',
    'resume_source',           -- HTML source before PDF
    'cover_letter_pdf',
    'cover_letter_source',
    'both_pdf'
  )),
  
  -- File storage
  file_path TEXT NOT NULL,     -- Path relative to output/ directory
  file_size_bytes INTEGER,
  
  -- Generation metadata
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  career_doc_version_hash TEXT,  -- Which CV version was used
  analysis_id TEXT REFERENCES analyses(id),  -- Which analysis was it based on?
  
  -- Content and quality
  content_hash TEXT,           -- SHA-256 of generated content
  template_used TEXT,          -- Which resume template
  
  -- Regeneration tracking
  previous_artifact_id TEXT REFERENCES artifacts(id),  -- If regenerated, what was before
  regeneration_reason TEXT,    -- "user_edited", "positioning_changed", etc.
  
  INDEX idx_job_id (job_id),
  INDEX idx_created_at (created_at),
  INDEX idx_artifact_type (artifact_type)
);
```

### tracker_events

Event log of application lifecycle. Each event represents an action taken or outcome received.

```sql
CREATE TABLE tracker_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Event metadata
  event_type TEXT NOT NULL CHECK (event_type IN (
    'job_added',
    'job_analyzed',
    'estimate_confirmed',      -- User confirmed a gap/estimate
    'estimate_rejected',       -- User rejected our estimate
    'resume_generated',
    'cover_letter_generated',
    'applied',                 -- Application submitted
    'application_status_changed',
    'interview_scheduled',
    'interview_completed',
    'offer_received',
    'offer_accepted',
    'offer_rejected',
    'rejected',                -- Rejection after application
    'withdrawn',               -- User withdrew application
    'no_response_30_days',     -- Automatic event after 30 days
    'no_response_90_days',     -- Automatic event after 90 days
    'archived'
  )),
  
  -- Event timing
  event_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Event details
  details TEXT,               -- JSON with event-specific data
  notes TEXT,                 -- User notes about this event
  
  -- For linking to artifacts/analysis
  artifact_id TEXT REFERENCES artifacts(id),
  analysis_id TEXT REFERENCES analyses(id),
  
  -- For funnel calibration
  score_band TEXT,            -- "0-30", "31-60", "61-100" for grouping by fit
  positioning_angle TEXT,     -- Which angle was used
  outcome_received BOOLEAN DEFAULT FALSE,  -- Did we get an outcome?
  time_to_outcome_days INTEGER,            -- If yes, how many days?
  
  INDEX idx_job_id (job_id),
  INDEX idx_event_type (event_type),
  INDEX idx_event_at (event_at),
  INDEX idx_score_band (score_band)
);
```

### career_doc_versions

Immutable snapshots of the Master Career Document, content-addressed by hash.

```sql
CREATE TABLE career_doc_versions (
  content_hash TEXT PRIMARY KEY,  -- SHA-256 of content
  
  -- Content storage
  content TEXT NOT NULL,          -- Full JSON of career document
  
  -- Metadata
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_file_path TEXT,          -- Where was it loaded from
  
  -- Summary for tracking changes
  summary TEXT,                   -- { skills: 50, experience_items: 12, ... }
  
  -- Is this the active version?
  is_active BOOLEAN DEFAULT FALSE
);
```

### outreach

Tracks how and when a job application was submitted, including follow-ups.

```sql
CREATE TABLE outreach (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Application method
  method TEXT NOT NULL CHECK (method IN (
    'online_form',
    'email',
    'linkedin',
    'referral',
    'networking_call',
    'other'
  )),
  
  -- Application details
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_via TEXT,              -- Specific platform or email
  applied_by TEXT,               -- "resume_pdf", "linkedin_profile", "email_body"
  
  -- Follow-ups
  follow_up_1_at DATETIME,
  follow_up_1_method TEXT,
  follow_up_2_at DATETIME,
  follow_up_2_method TEXT,
  
  -- Response tracking
  first_response_at DATETIME,
  first_response_from TEXT,      -- Who responded (recruiter, hiring manager, etc.)
  first_response_type TEXT,      -- "phone_screen", "rejection", "offer", etc.
  
  -- Outcome
  final_outcome TEXT CHECK (final_outcome IN (
    'rejected',
    'offer_made',
    'no_response',
    'withdrawn',
    'pending'
  )),
  final_outcome_at DATETIME,
  
  -- Notes
  notes TEXT,
  contact_person TEXT,           -- Name of contact
  contact_email TEXT,            -- Contact email
  contact_phone TEXT,            -- Contact phone
  
  INDEX idx_job_id (job_id),
  INDEX idx_applied_at (applied_at),
  INDEX idx_final_outcome (final_outcome)
);
```

### settings

User configuration: triage thresholds, preferences, display options.

```sql
CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  
  -- Setting key (unique)
  key TEXT NOT NULL UNIQUE,
  
  -- Value (flexible: JSON for complex values)
  value TEXT NOT NULL,
  
  -- Metadata
  data_type TEXT,              -- "integer", "boolean", "json", "string"
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  
  INDEX idx_key (key)
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value, data_type, description) VALUES
  ('min_fit_score_to_apply', '70', 'integer', 'Minimum fit score before recommending application'),
  ('fit_score_bands', '[{"min": 0, "max": 30, "label": "Poor"}, {"min": 31, "max": 60, "label": "Fair"}, {"min": 61, "max": 100, "label": "Good"}]', 'json', 'Fit score bands for grouping'),
  ('min_salary', '120000', 'integer', 'Minimum acceptable salary'),
  ('max_salary', '300000', 'integer', 'Maximum expected salary'),
  ('preferred_locations', '[]', 'json', 'Preferred job locations'),
  ('preferred_job_types', '["full-time"]', 'json', 'Preferred employment types'),
  ('required_skills', '[]', 'json', 'Must-have skills'),
  ('nice_to_have_skills', '[]', 'json', 'Nice-to-have skills'),
  ('ats_resume_template', 'clean', 'string', 'Resume template for ATS optimization'),
  ('cover_letter_tone', 'professional', 'string', 'Tone for generated cover letters');
```

---

## Relationships and Flow

### New Job Discovery
```
jobs
├─ chat_messages          (empty initially)
├─ analyses               (empty until user requests analysis)
├─ tracker_events         [job_added event]
└─ outreach              (empty until application)
```

### Analysis and Chat Workflow
```
1. User requests analysis for job
   ↓
2. Analyses row created with fit_score, skills_match, gaps
   ↓
3. Chat message created (assistant): "Here's my analysis..."
   ↓
4. System creates estimate_confirmation messages: "Does this gap look right?"
   ↓
5. User responds in chat
   ↓
6. If confirmed: tracker_event created [estimate_confirmed]
   ↓
7. If rejected: tracker_event created [estimate_rejected]
```

### Document Generation and Application
```
1. User generates resume for job
   ↓
2. Artifacts created (resume_source, resume_pdf)
   ↓
3. tracker_event created [resume_generated]
   ↓
4. User applies to job
   ↓
5. Outreach row created with application details
   ↓
6. tracker_event created [applied] with score_band, positioning_angle
```

### Funnel Calibration
```
tracker_events with event_type = 'applied' have:
├─ score_band              (which fit score range?)
├─ positioning_angle       (which angle was used?)
└─ (When outcome received) time_to_outcome_days

Allows analysis like:
"Of jobs in 61-100 range with 'leadership' angle, 40% resulted in interview"
```

---

## Key Differences from Previous Design

| Previous | New | Why |
|----------|-----|-----|
| `documents` (resumes/letters) | `artifacts` (generated PDFs + sources) | Emphasizes output, tracks regeneration |
| `master_cv` (cached) | `career_doc_versions` (immutable snapshots) | Content-addressed versioning, no mutation |
| `funnel_outcomes` (state-based) | `tracker_events` (event-based) + `outreach` | More granular, tracks actions and timing |
| `job_analyses` only | `analyses` + `chat_messages` | Chat is persistent and per-job |
| Job `status` field | `tracker_events` with score_band | Event history supports funnel calibration |

---

## Anti-Fabrication at Storage Layer

**Before artifact creation:**
1. Artifact row is NOT created until validation passes
2. `career_doc_version_hash` is stored with artifact (immutable proof of which CV was used)
3. `content_hash` of generated content stored (can verify later if user edits)
4. If validation fails, no artifact row exists (implicit rejection)

**Querying for fabrication:**
```sql
-- Find all artifacts generated from a career doc version
SELECT a.* FROM artifacts a
WHERE a.career_doc_version_hash = ?

-- Find artifacts that haven't been validated
SELECT a.* FROM artifacts a
LEFT JOIN tracker_events te ON a.id = te.artifact_id
WHERE a.created_at < NOW() - INTERVAL 1 HOUR
AND te.id IS NULL
```

---

## Indexes

```sql
-- Job lookups
CREATE INDEX idx_jobs_added_at ON jobs(added_at DESC);
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_archived ON jobs(archived_at);

-- Analysis lookups
CREATE INDEX idx_analyses_job_id ON analyses(job_id);
CREATE INDEX idx_analyses_fit_score ON analyses(fit_score);
CREATE INDEX idx_analyses_analyzed_at ON analyses(analyzed_at DESC);

-- Chat lookups
CREATE INDEX idx_chat_job_id ON chat_messages(job_id);
CREATE INDEX idx_chat_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_confirmed ON chat_messages(user_confirmed);

-- Artifact lookups
CREATE INDEX idx_artifacts_job_id ON artifacts(job_id);
CREATE INDEX idx_artifacts_created_at ON artifacts(created_at DESC);
CREATE INDEX idx_artifacts_type ON artifacts(artifact_type);

-- Tracker event lookups
CREATE INDEX idx_events_job_id ON tracker_events(job_id);
CREATE INDEX idx_events_type ON tracker_events(event_type);
CREATE INDEX idx_events_score_band ON tracker_events(score_band);
CREATE INDEX idx_events_at ON tracker_events(event_at DESC);

-- Outreach lookups
CREATE INDEX idx_outreach_job_id ON outreach(job_id);
CREATE INDEX idx_outreach_applied_at ON outreach(applied_at DESC);
CREATE INDEX idx_outreach_outcome ON outreach(final_outcome);

-- Settings lookups
CREATE INDEX idx_settings_key ON settings(key);
```

---

## Constraints and Integrity

### Cascading Deletes
- When job deleted, all chat_messages, analyses, tracker_events, artifacts, outreach deleted
- Ensures no orphaned data

### Unique Constraints
- `jobs(source, source_id)` — prevent duplicate imports
- `career_doc_versions(content_hash)` — each content version appears once
- `settings(key)` — one value per setting

### Check Constraints
- Fit scores: 0-100
- Confidence scores: 0-1
- Event types, artifact types, methods are enumerated

---

## Migrations

Migrations in `/src/server/db/migrations/`:

```
001-initial-schema.sql
├─ Create jobs
├─ Create analyses
├─ Create chat_messages
├─ Create artifacts
├─ Create tracker_events
├─ Create career_doc_versions
├─ Create outreach
├─ Create settings
└─ Create all indexes and constraints
```

Each migration is idempotent and tested.

---

## Summary

This schema supports:
✅ Three-panel NotebookLM layout (Sources → Chat → Studio)
✅ Job-scoped persistent chat
✅ Estimate-confirmation cards in chat_messages
✅ Editable triage thresholds in settings
✅ Career document version hashing (content_hash)
✅ Funnel calibration by score_band and positioning_angle
✅ Anti-fabrication validation before artifacts
✅ "Did you apply?" tracker event flow
✅ Artifact generation with source preservation
✅ Output directory tracking for PDFs and sources
