import { Database } from "better-sqlite3";

export function migrate010(db: Database): void {
  // Add application tracking fields to jobs table
  db.exec(`
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS applied_at TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'pending' CHECK (application_status IN ('pending', 'applied', 'rejected', 'accepted', 'withdrawn'));
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_source_url TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_notes TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS resume_artifact_id TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cover_letter_artifact_id TEXT;
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_applied_at ON jobs(applied_at DESC)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_application_status ON jobs(application_status)
  `);
}
