import { Database } from "better-sqlite3";

export function migrate007(db: Database): void {
  // Keyword Proposals table - tracks proposed keywords and their acceptance status
  db.exec(`
    CREATE TABLE IF NOT EXISTS keyword_proposals (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      keyword TEXT NOT NULL,
      suggested_language TEXT NOT NULL,
      target TEXT NOT NULL CHECK (target IN ('resume', 'cover_letter', 'both')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'ignored')) DEFAULT 'pending',
      change_node_id TEXT REFERENCES change_graph(id) ON DELETE SET NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      accepted_at DATETIME,
      ignored_at DATETIME
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_keyword_proposals_job_id ON keyword_proposals(job_id);
    CREATE INDEX IF NOT EXISTS idx_keyword_proposals_status ON keyword_proposals(status);
    CREATE INDEX IF NOT EXISTS idx_keyword_proposals_change_node_id ON keyword_proposals(change_node_id);
    CREATE INDEX IF NOT EXISTS idx_keyword_proposals_created_at ON keyword_proposals(created_at);
  `);
}
