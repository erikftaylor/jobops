import { Database } from "better-sqlite3";

export function migrate006(db: Database): void {
  // Change Graph table - structured changes with tags and source tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS change_graph (
      id TEXT PRIMARY KEY,
      target TEXT NOT NULL CHECK (target IN ('resume', 'cover_letter', 'both')),
      field TEXT NOT NULL,
      operation TEXT NOT NULL CHECK (operation IN ('add', 'remove', 'modify', 'rewrite')),
      original_value TEXT,
      new_value TEXT,
      reason TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('analysis', 'user', 'ai_suggestion', 'system')),
      confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
      accepted_at DATETIME,
      conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
      analysis_id TEXT REFERENCES analyses(id) ON DELETE SET NULL,
      tags TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_change_graph_target ON change_graph(target);
    CREATE INDEX IF NOT EXISTS idx_change_graph_operation ON change_graph(operation);
    CREATE INDEX IF NOT EXISTS idx_change_graph_source ON change_graph(source);
    CREATE INDEX IF NOT EXISTS idx_change_graph_confidence ON change_graph(confidence);
    CREATE INDEX IF NOT EXISTS idx_change_graph_conversation_id ON change_graph(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_change_graph_analysis_id ON change_graph(analysis_id);
    CREATE INDEX IF NOT EXISTS idx_change_graph_created_at ON change_graph(created_at);
  `);

  // Positioning Profiles table - reusable positioning configurations
  db.exec(`
    CREATE TABLE IF NOT EXISTS positioning_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      tone TEXT NOT NULL CHECK (tone IN ('formal', 'casual', 'balanced')),
      emphasis TEXT NOT NULL,
      ats_keywords TEXT,
      industry_focus TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_positioning_profiles_name ON positioning_profiles(name);
    CREATE INDEX IF NOT EXISTS idx_positioning_profiles_tone ON positioning_profiles(tone);
    CREATE INDEX IF NOT EXISTS idx_positioning_profiles_created_at ON positioning_profiles(created_at);
  `);

  // Career Models table - versioned snapshots of career documents
  db.exec(`
    CREATE TABLE IF NOT EXISTS career_models (
      id TEXT PRIMARY KEY,
      hash TEXT NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      based_on TEXT,
      content TEXT NOT NULL,
      metadata TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_career_models_hash ON career_models(hash);
    CREATE INDEX IF NOT EXISTS idx_career_models_based_on ON career_models(based_on);
    CREATE INDEX IF NOT EXISTS idx_career_models_created_at ON career_models(created_at);
  `);

  // Cached Artifacts table - generated output artifacts
  db.exec(`
    CREATE TABLE IF NOT EXISTS cached_artifacts (
      id TEXT PRIMARY KEY,
      artifact_type TEXT NOT NULL CHECK (artifact_type IN (
        'resume_pdf', 'resume_source', 'cover_letter_pdf', 'cover_letter_source', 'both_pdf'
      )),
      career_model_id TEXT NOT NULL REFERENCES career_models(id) ON DELETE CASCADE,
      positioning_profile_id TEXT REFERENCES positioning_profiles(id) ON DELETE SET NULL,
      template_id TEXT REFERENCES artifact_templates(id) ON DELETE SET NULL,
      content_hash TEXT NOT NULL,
      file_path TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      metadata TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cached_artifacts_artifact_type ON cached_artifacts(artifact_type);
    CREATE INDEX IF NOT EXISTS idx_cached_artifacts_career_model_id ON cached_artifacts(career_model_id);
    CREATE INDEX IF NOT EXISTS idx_cached_artifacts_positioning_profile_id ON cached_artifacts(positioning_profile_id);
    CREATE INDEX IF NOT EXISTS idx_cached_artifacts_template_id ON cached_artifacts(template_id);
    CREATE INDEX IF NOT EXISTS idx_cached_artifacts_content_hash ON cached_artifacts(content_hash);
    CREATE INDEX IF NOT EXISTS idx_cached_artifacts_created_at ON cached_artifacts(created_at);
  `);

  // Artifact Templates table - template storage
  db.exec(`
    CREATE TABLE IF NOT EXISTS artifact_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('resume', 'cover_letter')),
      variant TEXT,
      content TEXT NOT NULL,
      schema TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artifact_templates_name ON artifact_templates(name);
    CREATE INDEX IF NOT EXISTS idx_artifact_templates_type ON artifact_templates(type);
    CREATE INDEX IF NOT EXISTS idx_artifact_templates_created_at ON artifact_templates(created_at);
  `);
}
