import { Database } from "better-sqlite3";

export function migrate008(db: Database): void {
  // Workspace state table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspace_state (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL UNIQUE,
      dismissed_keywords TEXT DEFAULT '[]',
      selected_artifact TEXT DEFAULT 'original',
      last_score_calculation TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workspace_state_job_id ON workspace_state(job_id);
  `);

  // Workspace chat history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspace_chat_history (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workspace_chat_history_job_id ON workspace_chat_history(job_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_chat_history_timestamp ON workspace_chat_history(timestamp);
  `);
}
