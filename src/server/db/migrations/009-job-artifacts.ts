import { Database } from "better-sqlite3";

export function migrate009(db: Database): void {
  // Job Artifacts table - versioned, JSON-based artifacts for resumes and cover letters
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_artifacts (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      artifact_type TEXT NOT NULL CHECK (artifact_type IN ('resume', 'cover_letter')),
      version INTEGER NOT NULL,
      positioning TEXT,
      title TEXT,
      career_doc_version_id TEXT NOT NULL,
      prompt_version INTEGER NOT NULL,
      model TEXT NOT NULL,
      json_content TEXT NOT NULL,
      rendered_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('draft', 'ready', 'error', 'archived')),
      is_preferred BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(job_id, artifact_type, version),
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_job_artifacts_job_id ON job_artifacts(job_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_job_artifacts_type_version
    ON job_artifacts(artifact_type, version)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_job_artifacts_created_at ON job_artifacts(created_at DESC)
  `);
}
