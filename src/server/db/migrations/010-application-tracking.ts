import { Database } from "better-sqlite3";

export function migrate010(db: Database): void {
  // Add application tracking fields to jobs table
  // Note: SQLite doesn't support IF NOT EXISTS in ALTER TABLE, so we handle errors gracefully
  const columns = [
    "applied_at TEXT",
    "application_status TEXT DEFAULT 'pending' CHECK (application_status IN ('pending', 'applied', 'rejected', 'accepted', 'withdrawn'))",
    "application_source_url TEXT",
    "application_notes TEXT",
    "resume_artifact_id TEXT",
    "cover_letter_artifact_id TEXT",
  ];

  for (const column of columns) {
    try {
      db.exec(`ALTER TABLE jobs ADD COLUMN ${column}`);
    } catch (err: any) {
      // Column already exists - ignore
      if (!err.message.includes("duplicate column name")) {
        throw err;
      }
    }
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_applied_at ON jobs(applied_at DESC)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_application_status ON jobs(application_status)
  `);
}
