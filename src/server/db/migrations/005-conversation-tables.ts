import { Database } from "better-sqlite3";

export function migrate005(db: Database): void {
  // Conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL CHECK (status IN ('active', 'closed')) DEFAULT 'active',
      memory TEXT NOT NULL DEFAULT '{}',

      UNIQUE(job_id),
      INDEX idx_job_id (job_id),
      INDEX idx_analysis_id (analysis_id),
      INDEX idx_status (status)
    );
  `);

  // Conversation messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      message_type TEXT NOT NULL CHECK (message_type IN ('chat', 'question', 'suggestion', 'confirmation')) DEFAULT 'chat',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_conversation_id (conversation_id),
      INDEX idx_created_at (created_at)
    );
  `);

  // Change sets (proposed changes) table
  db.exec(`
    CREATE TABLE IF NOT EXISTS change_sets (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
      section_type TEXT NOT NULL CHECK (section_type IN ('bullet', 'paragraph', 'sentence', 'section')),
      location TEXT NOT NULL,
      original_text TEXT NOT NULL,
      proposed_text TEXT NOT NULL,
      reasoning TEXT NOT NULL,
      business_impact TEXT NOT NULL,
      confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'modified')) DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      decided_at DATETIME,
      decision_note TEXT,

      INDEX idx_conversation_id (conversation_id),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at)
    );
  `);

  // Accepted changes tracking (audit trail)
  db.exec(`
    CREATE TABLE IF NOT EXISTS accepted_changes (
      id TEXT PRIMARY KEY,
      change_set_id TEXT NOT NULL UNIQUE REFERENCES change_sets(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_job_id (job_id),
      INDEX idx_change_set_id (change_set_id)
    );
  `);

  // Analytics events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL CHECK (event_type IN (
        'analysis_started', 'analysis_completed', 'follow_up_asked',
        'recommendation_accepted', 'recommendation_rejected', 'conversation_modified',
        'resume_updated', 'memory_recorded'
      )),
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      details TEXT,

      INDEX idx_job_id (job_id),
      INDEX idx_event_type (event_type),
      INDEX idx_timestamp (timestamp)
    );
  `);
}
