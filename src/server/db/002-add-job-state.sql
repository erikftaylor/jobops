-- Add state field to jobs table for Phase 2 (if not exists)

BEGIN TRANSACTION;

-- Check if state column exists and add if not
PRAGMA table_info(jobs);

-- If the table doesn't have state, add it
ALTER TABLE jobs ADD COLUMN state TEXT DEFAULT 'draft' CHECK (state IN (
  'draft', 'analyzed', 'refining', 'approved', 'generated', 'applied', 'closed'
));

CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);

COMMIT;
