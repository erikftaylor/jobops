import { Database } from "better-sqlite3";
import { v4 as uuid } from "uuid";

export interface WorkspaceState {
  jobId: string;
  dismissedKeywords: string[];
  selectedArtifact: string;
  lastScoreCalculation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatHistoryEntry {
  id: string;
  jobId: string;
  questionId: string;
  question: string;
  answer: Record<string, any>;
  timestamp: string;
}

/**
 * Workspace Persistence Service
 * Handles persistence of workspace state including dismissed keywords, chat history, and artifact selections
 */
export class WorkspacePersistenceService {
  constructor(private db: Database) {}

  /**
   * Save dismissed keywords for a job
   */
  saveDismissedKeywords(jobId: string, keywords: string[]): void {
    const id = uuid();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO workspace_state (
        id, job_id, dismissed_keywords, updated_at
      ) VALUES (
        COALESCE((SELECT id FROM workspace_state WHERE job_id = ?), ?),
        ?,
        ?,
        ?
      )
    `);

    stmt.run(jobId, id, jobId, JSON.stringify(keywords), now);
  }

  /**
   * Save a chat answer to history
   */
  saveChatAnswer(
    jobId: string,
    data: {
      questionId: string;
      question: string;
      answer: Record<string, any>;
    }
  ): ChatHistoryEntry {
    const id = uuid();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO workspace_chat_history (
        id, job_id, question_id, question, answer, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, jobId, data.questionId, data.question, JSON.stringify(data.answer), now);

    return {
      id,
      jobId,
      questionId: data.questionId,
      question: data.question,
      answer: data.answer,
      timestamp: now,
    };
  }

  /**
   * Save selected artifact variant
   */
  saveSelectedArtifact(jobId: string, artifactType: string): void {
    const id = uuid();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO workspace_state (
        id, job_id, selected_artifact, updated_at
      ) VALUES (
        COALESCE((SELECT id FROM workspace_state WHERE job_id = ?), ?),
        ?,
        ?,
        ?
      )
    `);

    stmt.run(jobId, id, jobId, artifactType, now);
  }

  /**
   * Get workspace state for a job
   */
  getState(jobId: string): WorkspaceState | null {
    const stmt = this.db.prepare(`
      SELECT id, job_id, dismissed_keywords, selected_artifact, last_score_calculation, created_at, updated_at
      FROM workspace_state
      WHERE job_id = ?
    `);

    const row = stmt.get(jobId) as any;
    if (!row) {
      return null;
    }

    return {
      jobId: row.job_id,
      dismissedKeywords: row.dismissed_keywords ? JSON.parse(row.dismissed_keywords) : [],
      selectedArtifact: row.selected_artifact || 'original',
      lastScoreCalculation: row.last_score_calculation,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get chat history for a job
   */
  getChatHistory(jobId: string): ChatHistoryEntry[] {
    const stmt = this.db.prepare(`
      SELECT id, job_id, question_id, question, answer, timestamp
      FROM workspace_chat_history
      WHERE job_id = ?
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(jobId) as any[];
    return rows.map((row) => ({
      id: row.id,
      jobId: row.job_id,
      questionId: row.question_id,
      question: row.question,
      answer: JSON.parse(row.answer),
      timestamp: row.timestamp,
    }));
  }

  /**
   * Clear all workspace state and history for a job
   */
  clearState(jobId: string): void {
    const stmt1 = this.db.prepare('DELETE FROM workspace_state WHERE job_id = ?');
    const stmt2 = this.db.prepare('DELETE FROM workspace_chat_history WHERE job_id = ?');

    stmt1.run(jobId);
    stmt2.run(jobId);
  }

  /**
   * Add keyword to dismissed list (without replacing the entire list)
   */
  addDismissedKeyword(jobId: string, keyword: string): void {
    const state = this.getState(jobId);
    const dismissed = state?.dismissedKeywords || [];

    if (!dismissed.includes(keyword)) {
      dismissed.push(keyword);
    }

    this.saveDismissedKeywords(jobId, dismissed);
  }

  /**
   * Remove keyword from dismissed list
   */
  removeDismissedKeyword(jobId: string, keyword: string): void {
    const state = this.getState(jobId);
    const dismissed = state?.dismissedKeywords || [];

    const filtered = dismissed.filter((k) => k !== keyword);
    this.saveDismissedKeywords(jobId, filtered);
  }

  /**
   * Check if a keyword is dismissed
   */
  isKeywordDismissed(jobId: string, keyword: string): boolean {
    const state = this.getState(jobId);
    return state?.dismissedKeywords.includes(keyword) || false;
  }

  /**
   * Get all dismissed keywords for a job
   */
  getDismissedKeywords(jobId: string): string[] {
    const state = this.getState(jobId);
    return state?.dismissedKeywords || [];
  }

  /**
   * Update last score calculation timestamp
   */
  updateLastScoreCalculation(jobId: string): void {
    const id = uuid();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO workspace_state (
        id, job_id, last_score_calculation, updated_at
      ) VALUES (
        COALESCE((SELECT id FROM workspace_state WHERE job_id = ?), ?),
        ?,
        ?,
        ?
      )
    `);

    stmt.run(jobId, id, jobId, now, now);
  }
}

/**
 * Factory function to create a WorkspacePersistenceService instance
 */
export function createWorkspacePersistenceService(
  db: Database
): WorkspacePersistenceService {
  return new WorkspacePersistenceService(db);
}
