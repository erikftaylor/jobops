-- JobOps Initial Schema Migration

BEGIN TRANSACTION;

-- Jobs: Opportunities discovered or manually added
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'analyzed', 'refining', 'approved', 'generated', 'applied', 'closed')),
  url TEXT,
  location TEXT,
  salary_min REAL,
  salary_max REAL,
  currency TEXT DEFAULT 'USD',
  job_type TEXT CHECK (job_type IN ('full-time', 'contract', 'part-time', 'other')),
  source TEXT NOT NULL CHECK (source IN ('manual', 'linkedin', 'indeed', 'glassdoor', 'company_website', 'other')),
  source_url TEXT,
  source_id TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  discovered_at DATETIME,
  archived_at DATETIME,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  min_fit_score_override INTEGER,
  positioning_angle TEXT,
  UNIQUE(source, source_id),
  CHECK (min_fit_score_override IS NULL OR (min_fit_score_override >= 0 AND min_fit_score_override <= 100))
);

CREATE INDEX IF NOT EXISTS idx_jobs_added_at ON jobs(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_archived ON jobs(archived_at);

-- Analyses: Cached job-to-CV assessment results
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  analyzed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  career_doc_version_hash TEXT,
  model TEXT,
  tokens_used INTEGER,
  skills_match TEXT NOT NULL,
  experience_gaps TEXT NOT NULL,
  positioning_suggestions TEXT,
  fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
  confidence_score REAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  fit_justification TEXT
);

CREATE INDEX IF NOT EXISTS idx_analyses_job_id ON analyses(job_id);
CREATE INDEX IF NOT EXISTS idx_analyses_fit_score ON analyses(fit_score);
CREATE INDEX IF NOT EXISTS idx_analyses_analyzed_at ON analyses(analyzed_at DESC);

-- Chat Messages: Job-scoped conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('chat', 'estimate_confirmation', 'positioning_suggestion', 'system')),
  estimate TEXT,
  user_confirmed BOOLEAN,
  confirmed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_job_id ON chat_messages(job_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_confirmed ON chat_messages(user_confirmed);

-- Artifacts: Generated resumes, cover letters, PDFs
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('resume_pdf', 'resume_source', 'cover_letter_pdf', 'cover_letter_source', 'both_pdf')),
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  career_doc_version_hash TEXT,
  analysis_id TEXT REFERENCES analyses(id),
  content_hash TEXT,
  template_used TEXT,
  previous_artifact_id TEXT REFERENCES artifacts(id),
  regeneration_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_artifacts_job_id ON artifacts(job_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON artifacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifacts_artifact_type ON artifacts(artifact_type);

-- Tracker Events: Immutable event log
CREATE TABLE IF NOT EXISTS tracker_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'job_added', 'job_analyzed', 'estimate_confirmed', 'estimate_rejected',
    'resume_generated', 'cover_letter_generated', 'applied', 'application_status_changed',
    'interview_scheduled', 'interview_completed', 'offer_received', 'offer_accepted',
    'offer_rejected', 'rejected', 'withdrawn', 'no_response_30_days', 'no_response_90_days', 'archived'
  )),
  event_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details TEXT,
  notes TEXT,
  artifact_id TEXT REFERENCES artifacts(id),
  analysis_id TEXT REFERENCES analyses(id),
  score_band TEXT,
  positioning_angle TEXT,
  outcome_received BOOLEAN DEFAULT FALSE,
  time_to_outcome_days INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tracker_events_job_id ON tracker_events(job_id);
CREATE INDEX IF NOT EXISTS idx_tracker_events_event_type ON tracker_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracker_events_event_at ON tracker_events(event_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracker_events_score_band ON tracker_events(score_band);

-- Career Document Versions: Immutable snapshots
CREATE TABLE IF NOT EXISTS career_doc_versions (
  content_hash TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_file_path TEXT,
  summary TEXT,
  is_active BOOLEAN DEFAULT FALSE
);

-- Outreach: Application submission and follow-up tracking
CREATE TABLE IF NOT EXISTS outreach (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('online_form', 'email', 'linkedin', 'referral', 'networking_call', 'other')),
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_via TEXT,
  applied_by TEXT,
  follow_up_1_at DATETIME,
  follow_up_1_method TEXT,
  follow_up_2_at DATETIME,
  follow_up_2_method TEXT,
  first_response_at DATETIME,
  first_response_from TEXT,
  first_response_type TEXT,
  final_outcome TEXT CHECK (final_outcome IN ('rejected', 'offer_made', 'no_response', 'withdrawn', 'pending')),
  final_outcome_at DATETIME,
  notes TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT
);

CREATE INDEX IF NOT EXISTS idx_outreach_job_id ON outreach(job_id);
CREATE INDEX IF NOT EXISTS idx_outreach_applied_at ON outreach(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_final_outcome ON outreach(final_outcome);

-- Settings: User configuration
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  data_type TEXT,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, data_type, description) VALUES
  ('min_fit_score_to_apply', '70', 'integer', 'Minimum fit score before recommending application'),
  ('fit_score_bands', '[{"min": 0, "max": 30, "label": "Poor"}, {"min": 31, "max": 60, "label": "Fair"}, {"min": 61, "max": 100, "label": "Good"}]', 'json', 'Fit score bands for grouping'),
  ('min_salary', '0', 'integer', 'Minimum acceptable salary'),
  ('max_salary', '999999999', 'integer', 'Maximum expected salary'),
  ('preferred_locations', '[]', 'json', 'Preferred job locations'),
  ('preferred_job_types', '["full-time"]', 'json', 'Preferred employment types'),
  ('required_skills', '[]', 'json', 'Must-have skills'),
  ('nice_to_have_skills', '[]', 'json', 'Nice-to-have skills'),
  ('ats_resume_template', 'clean', 'string', 'Resume template for ATS optimization'),
  ('cover_letter_tone', 'professional', 'string', 'Tone for generated cover letters');

COMMIT;
